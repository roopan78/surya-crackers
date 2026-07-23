import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  boxQuantity: z.string().optional().default(''),
  boxes: z.coerce.number().int().positive('boxes must be at least 1'),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1, 'customerName is required'),
  deliveryAddress: z.string().min(1, 'deliveryAddress is required'),
  phone: z.string().min(6, 'A valid phone number is required'),
  preferredDate: z.coerce.date({ errorMap: () => ({ message: 'preferredDate must be a valid date' }) }),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(['PENDING_WHATSAPP', 'DISPATCHED', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING_WHATSAPP', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
