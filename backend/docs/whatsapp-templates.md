# WhatsApp Message Templates (Meta Business Manager)

Meta only delivers **pre-approved templates** for business-initiated messages,
so these two must exist and be approved before any notification is sent.

Create them in **Meta Business Manager → WhatsApp Manager → Message templates**.

> The code sends **positional** body variables. The `{{1}}, {{2}}, …` numbering
> below must match exactly — reordering the template without reordering
> `EVENT_REGISTRY` in `src/services/notification.service.ts` sends the right
> values into the wrong slots.

---

## 1. Order confirmation

- **Name:** `order_confirmation` (must equal `WHATSAPP_TEMPLATE_ORDER_SUCCESS`)
- **Category:** Utility
- **Language:** English (`en`, must equal `WHATSAPP_TEMPLATE_LANGUAGE`)

**Body:**

```
Hello {{1}},

Thank you for shopping with {{9}}.

Your order has been placed successfully.

Order Number: {{2}}
Order Date: {{3}}
Total: ₹{{4}}
Payment Method: {{5}}
Payment Status: {{6}}

Pickup Date: {{7}}
Pickup Time: {{8}}

We will notify you once your order is ready.
For any help, call {{10}}.

Thank you.
{{9}}
```

| Slot | Value | Example |
| --- | --- | --- |
| `{{1}}` | customer_name | Roopan |
| `{{2}}` | order_number | SC-20260802-4F2A9C |
| `{{3}}` | order_date | 02 Aug 2026 |
| `{{4}}` | amount | 1250.00 |
| `{{5}}` | payment_method | Cash on Pickup |
| `{{6}}` | payment_status | Pending |
| `{{7}}` | pickup_date | 05 Aug 2026 |
| `{{8}}` | pickup_time | 5:00 PM |
| `{{9}}` | store_name | Surya Crackers |
| `{{10}}` | store_phone | +91 9842121720 |

Sample values are required at submission time — use the examples above.

---

## 2. Order failure

- **Name:** `order_failed` (must equal `WHATSAPP_TEMPLATE_ORDER_FAILED`)
- **Category:** Utility
- **Language:** English (`en`)

**Body:**

```
Hello {{1}},

Unfortunately we couldn't process your order.

Order Number: {{2}}
Reason: {{3}}

Please contact us on {{4}} if the issue continues.

Thank you.
Surya Crackers
```

| Slot | Value | Example |
| --- | --- | --- |
| `{{1}}` | customer_name | Roopan |
| `{{2}}` | order_number | SC-20260802-4F2A9C |
| `{{3}}` | reason | UPI payment is not available yet. |
| `{{4}}` | support_phone | +91 9842121720 |

---

## Adding a future notification (e.g. Ready for Pickup)

1. Create + get approval for the template in Meta Business Manager.
2. Add its name to `.env` and `src/config/env.ts`.
3. Add one entry to `EVENT_REGISTRY` in `notification.service.ts` mapping the
   event to that template name and its positional params.
4. Call `queueOrderNotification('READY_FOR_PICKUP', {...})` at the trigger point
   (for this example: `updateOrderStatus` when status becomes READY_FOR_PICKUP).

No changes to the channel, log schema, or duplicate-guard are needed.

## Webhook (delivery receipts)

In **WhatsApp Manager → Configuration → Webhooks**, set:

- **Callback URL:** `https://api.suryacrackers.shop/api/webhooks/whatsapp`
- **Verify token:** the value of `WHATSAPP_VERIFY_TOKEN`
- **Subscribe to:** the `messages` field

Delivery receipts then move each `NotificationLog` row through
SENT → DELIVERED → READ (or FAILED with the reason).

### Security

`POST /api/webhooks/whatsapp` verifies Meta's **X-Hub-Signature-256** header —
an HMAC-SHA256 of the raw request body keyed with `WHATSAPP_APP_SECRET`
(App Dashboard → Settings → Basic → App Secret). Set it alongside the other
WhatsApp variables; while it is empty the check is skipped with a logged
warning so the endpoint can be registered before the secret is deployed, and
once it is set an absent or wrong signature is rejected with 403 before any
database work happens.

### Idempotency

Meta retries webhook batches and does not guarantee ordering. Statuses are
ranked (SENT < DELIVERED < READ < FAILED) and only applied when they move a row
forward, so a replayed batch or a late `delivered` arriving after `read` is a
silent no-op rather than a status downgrade. Unknown message ids and malformed
payloads are logged and answered with 200 — returning an error would make Meta
retry the same batch indefinitely.
