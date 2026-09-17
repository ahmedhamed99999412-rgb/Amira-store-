import { z } from 'zod';
import { monetaryNumber } from './money';

export const orderStatusSchema = z.enum([
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema.optional(),
  shippingCost: monetaryNumber.refine((value) => value <= 1_000_000, 'Shipping cost is too large').nullable().optional(),
}).refine((value) => value.status !== undefined || value.shippingCost !== undefined, {
  message: 'At least one field is required',
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
