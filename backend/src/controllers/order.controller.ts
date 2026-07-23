import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toOrderDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { generateOrderNumber } from '../utils/orderNumber';
import { CreateOrderInput, ListOrdersQuery, UpdateOrderStatusInput } from '../validators/order.validator';

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

// POST /api/orders — public
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateOrderInput;

  const estimatedTotal = input.items.reduce((sum, item) => sum + item.price * item.boxes, 0);

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const order = await prisma.orderLedger.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerName: input.customerName,
          deliveryAddress: input.deliveryAddress,
          phone: input.phone,
          preferredDate: input.preferredDate,
          items: input.items as unknown as Prisma.InputJsonValue,
          estimatedTotal,
        },
      });
      return sendSuccess(res, { orderNumber: order.orderNumber, id: order.id, estimatedTotal }, 201);
    } catch (error) {
      const isOrderNumberCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isOrderNumberCollision) {
        throw error;
      }
    }
  }
  throw ApiError.internal('Failed to generate a unique order number, please retry');
});

// GET /api/admin/orders — sortable by date and filterable by status
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;

  const where: Prisma.OrderLedgerWhereInput = query.status ? { status: query.status } : {};
  const pagination = { page: query.page, limit: query.limit };

  const [orders, totalItems] = await Promise.all([
    prisma.orderLedger.findMany({
      where,
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

  const order = await prisma.orderLedger.update({ where: { id: req.params.id }, data: { status } });
  return sendSuccess(res, toOrderDTO(order));
});
