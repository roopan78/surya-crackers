import { z } from 'zod';
import { PaymentProviderType } from '@prisma/client';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  boxQuantity: z.string().optional().default(''),
  boxes: z.coerce.number().int().positive('boxes must be at least 1'),
});

// guestName/guestMobile are optional at the schema level because a logged-in
// customer's identity instead comes from req.user (their JWT) — whether they're
// actually required is a decision order.controller.ts makes once it knows if
// the request is authenticated, which a Zod schema can't see.
// No paymentProvider: checkout takes no payment and offers no choice of method.
// The order is stored on hold and staff decide how it is paid (see
// confirmPaymentSchema) when they call the customer to confirm it.
export const createOrderSchema = z.object({
  guestName: z.string().min(1).optional(),
  guestMobile: z.string().min(10).optional(),
  pickupDate: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const orderNumberParamsSchema = z.object({
  orderNumber: z.string().min(1),
});

// How staff took the money, recorded at the same moment they mark it received.
// PHONEPE is not offered: it was never live, and no staff-arranged payment
// settles through it.
export const confirmPaymentSchema = z.object({
  paymentProvider: z.enum([PaymentProviderType.CASH_ON_PICKUP, PaymentProviderType.UPI_DIRECT]),
  paymentReference: z.string().max(64).optional(),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(['PENDING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED']),
});

// What staff may change on an order that has already been placed: which
// products, and how many boxes of each. Deliberately not the name, the packing
// or above all the price — the controller reads all three out of the catalog,
// so an order cannot be repriced by whatever happens to be calling this.
export const restructureOrderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  boxes: z.coerce.number().int().positive('boxes must be at least 1'),
});

export const updateOrderItemsSchema = z.object({
  // An order with nothing left in it is a cancellation, and that is a different
  // route with different consequences for the customer.
  items: z.array(restructureOrderItemSchema).min(1, 'An order must keep at least one item'),
  notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;
