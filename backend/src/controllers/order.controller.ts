import { Request, Response } from 'express';
import { Prisma, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toOrderDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { generateOrderNumber } from '../utils/orderNumber';
import { queueOrderNotification } from '../services/notification.service';
import { ConfirmPaymentInput, CreateOrderInput, ListOrdersQuery, UpdateOrderStatusInput } from '../validators/order.validator';

const MAX_ORDER_NUMBER_ATTEMPTS = 5;
const includeCustomer = { customer: true } satisfies Prisma.OrderLedgerInclude;

/**
 * POST /api/orders — public (guest) or authenticated (registered customer).
 *
 * Takes no payment: the 2018 Supreme Court ruling bars selling firecrackers over
 * e-commerce, so this only records the request on hold. Staff confirm the order
 * by phone and decide there how it is paid — hence no payment provider, no
 * payment initiation and no redirect URL.
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateOrderInput;
  const customerId = req.user?.sub ?? null;

  if (!customerId && !(input.guestName && input.guestMobile)) {
    throw ApiError.badRequest('guestName and guestMobile are required for guest checkout');
  }

  const estimatedTotal = input.items.reduce((sum, item) => sum + item.price * item.boxes, 0);
  // A registered customer's contact details live on their account; guests
  // supply them at checkout. Resolved once, used for the WhatsApp notification
  // on both the success and failure paths.
  const customer = customerId
    ? await prisma.user.findUnique({ where: { id: customerId }, select: { name: true, mobile: true } })
    : null;
  const contact = {
    customerName: customerId ? customer?.name : input.guestName,
    customerMobile: customerId ? customer?.mobile : input.guestMobile,
  };

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    const orderNumber = generateOrderNumber();

    try {
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
          // Both left for staff: the method is undecided and nothing is paid.
          paymentProvider: null,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      // Fire-and-forget: the customer's confirmation must never delay or fail
      // the response. Delivery is tracked in NotificationLog instead.
      queueOrderNotification('ORDER_CREATED', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ...contact,
        estimatedTotal,
        paymentProvider: order.paymentProvider,
        paymentStatus: order.paymentStatus,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        createdAt: order.createdAt,
      });

      return sendSuccess(
        res,
        {
          orderNumber: order.orderNumber,
          id: order.id,
          estimatedTotal,
          paymentStatus: order.paymentStatus,
        },
        201,
      );
    } catch (error) {
      const isOrderNumberCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isOrderNumberCollision) {
        // Genuine failure (database unavailable…): tell the customer their order
        // did not go through, then let the error middleware produce the HTTP
        // response as before.
        queueOrderNotification('ORDER_FAILED', {
          orderNumber,
          ...contact,
          estimatedTotal,
          reason: error instanceof ApiError ? error.message : 'We could not process your order.',
        });
        throw error;
      }
    }
  }
  throw ApiError.internal('Failed to generate a unique order number, please retry');
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

/**
 * PATCH /api/admin/orders/:id/payment — staff record a payment they collected.
 *
 * The method comes in with the request rather than off the order: nothing is
 * decided at checkout, so this call is where an order first learns whether it
 * was settled in cash at the counter or by an online transfer staff arranged.
 */
export const confirmPaymentManually = asyncHandler(async (req: Request, res: Response) => {
  const { paymentProvider, paymentReference } = req.body as ConfirmPaymentInput;

  const existing = await prisma.orderLedger.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Order not found');
  }
  if (existing.paymentStatus === PaymentStatus.PAID) {
    throw ApiError.conflict('Payment for this order is already recorded');
  }

  const order = await prisma.orderLedger.update({
    where: { id: req.params.id },
    data: {
      paymentProvider,
      paymentStatus: PaymentStatus.PAID,
      paymentReference: paymentReference?.trim() || `MANUAL-${req.user?.sub ?? 'admin'}`,
    },
    include: includeCustomer,
  });
  return sendSuccess(res, toOrderDTO(order));
});
