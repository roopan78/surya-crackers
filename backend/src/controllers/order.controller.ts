import { Request, Response } from 'express';
import { Prisma, PaymentProviderType, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toOrderDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { generateOrderNumber } from '../utils/orderNumber';
import { initiatePayment } from '../services/payment.service';
import { generateUpiPaymentDetails } from '../services/upi.service';
import { CreateOrderInput, ListOrdersQuery, SubmitUtrInput, UpdateOrderStatusInput } from '../validators/order.validator';

const MAX_ORDER_NUMBER_ATTEMPTS = 5;
const includeCustomer = { customer: true } satisfies Prisma.OrderLedgerInclude;

// POST /api/orders — public (guest) or authenticated (registered customer)
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateOrderInput;
  const customerId = req.user?.sub ?? null;

  if (!customerId && !(input.guestName && input.guestMobile)) {
    throw ApiError.badRequest('guestName and guestMobile are required for guest checkout');
  }

  const estimatedTotal = input.items.reduce((sum, item) => sum + item.price * item.boxes, 0);

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const orderNumber = generateOrderNumber();

      const payment = await initiatePayment(input.paymentProvider, {
        orderId: orderNumber,
        orderNumber,
        amount: estimatedTotal,
      });

      const order = await prisma.orderLedger.create({
        data: {
          orderNumber,
          customerId,
          guestName: customerId ? null : input.guestName,
          guestMobile: customerId ? null : input.guestMobile,
          pickupDate: input.pickupDate,
          pickupTime: input.pickupTime,
          notes: input.notes,
          items: input.items as unknown as Prisma.InputJsonValue,
          estimatedTotal,
          paymentProvider: input.paymentProvider,
          paymentStatus: payment.status,
          paymentReference: payment.reference,
        },
      });

      return sendSuccess(
        res,
        {
          orderNumber: order.orderNumber,
          id: order.id,
          estimatedTotal,
          paymentStatus: payment.status,
          redirectUrl: payment.redirectUrl,
        },
        201,
      );
    } catch (error) {
      const isOrderNumberCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isOrderNumberCollision) {
        throw error;
      }
    }
  }
  throw ApiError.internal('Failed to generate a unique order number, please retry');
});

// GET /api/orders/:orderNumber/upi-details — public (guests pay too); serves the
// dynamic QR / upi:// intent link for the order-confirmation page.
export const getUpiDetails = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.orderLedger.findUnique({ where: { orderNumber: req.params.orderNumber } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.paymentProvider !== PaymentProviderType.UPI_DIRECT) {
    throw ApiError.badRequest('This order does not use UPI payment');
  }

  const amount = Number(order.estimatedTotal);
  const { upiUrl, qrDataUrl, vpa, businessName } = await generateUpiPaymentDetails(order.orderNumber, amount);

  return sendSuccess(res, {
    upiUrl,
    qrDataUrl,
    vpa,
    businessName,
    orderNumber: order.orderNumber,
    amount,
    // Lets the confirmation page restore its state after a hard refresh
    // (already-submitted UTR, already-verified payment).
    paymentStatus: order.paymentStatus,
    utrNumber: order.utrNumber,
  });
});

// POST /api/orders/:orderNumber/submit-utr — customer reports their UPI
// transaction reference; staff verify it against the bank credit before
// marking the order PAID.
export const submitUtr = asyncHandler(async (req: Request, res: Response) => {
  const { utrNumber } = req.body as SubmitUtrInput;

  const order = await prisma.orderLedger.findUnique({ where: { orderNumber: req.params.orderNumber } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.paymentProvider !== PaymentProviderType.UPI_DIRECT) {
    throw ApiError.badRequest('This order does not use UPI payment');
  }
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw ApiError.conflict('Payment for this order is already confirmed');
  }

  // Re-submission while AWAITING_VERIFICATION is allowed on purpose — it lets
  // the customer correct a mistyped UTR before staff verify it.
  const updated = await prisma.orderLedger.update({
    where: { orderNumber: order.orderNumber },
    data: { utrNumber, paymentStatus: PaymentStatus.AWAITING_VERIFICATION },
    include: includeCustomer,
  });

  return sendSuccess(res, toOrderDTO(updated));
});

// GET /api/orders/mine — registered customers only
export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Please log in to view your orders');
  }

  const orders = await prisma.orderLedger.findMany({
    where: { customerId: req.user.sub },
    include: includeCustomer,
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, orders.map(toOrderDTO));
});

// GET /api/admin/orders — sortable by date and filterable by status
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;

  const where: Prisma.OrderLedgerWhereInput = query.status ? { status: query.status } : {};
  const pagination = { page: query.page, limit: query.limit };

  const [orders, totalItems] = await Promise.all([
    prisma.orderLedger.findMany({
      where,
      include: includeCustomer,
      orderBy: { createdAt: query.sort },
      ...toSkipTake(pagination),
    }),
    prisma.orderLedger.count({ where }),
  ]);

  return sendSuccess(res, orders.map(toOrderDTO), 200, toPaginationMeta(pagination, totalItems));
});

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as UpdateOrderStatusInput;

  const existing = await prisma.orderLedger.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Order not found');
  }

  const order = await prisma.orderLedger.update({
    where: { id: req.params.id },
    data: { status },
    include: includeCustomer,
  });
  return sendSuccess(res, toOrderDTO(order));
});

// PATCH /api/admin/orders/:id/payment — manual "Mark as Paid" (Cash on Pickup settlement)
export const confirmPaymentManually = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.orderLedger.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Order not found');
  }

  const order = await prisma.orderLedger.update({
    where: { id: req.params.id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paymentReference: `MANUAL-${req.user?.sub ?? 'admin'}`,
    },
    include: includeCustomer,
  });
  return sendSuccess(res, toOrderDTO(order));
});
