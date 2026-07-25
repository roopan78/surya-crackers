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
export const createOrderSchema = z.object({
  guestName: z.string().min(1).optional(),
  guestMobile: z.string().min(10).optional(),
  pickupDate: z.coerce.date().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
  paymentProvider: z.nativeEnum(PaymentProviderType),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
