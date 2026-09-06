import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  variantId: z.string().trim().min(1).max(100).nullable().optional(),
  quantity: z.number().int().min(1).max(100),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
  guestName: z.string().trim().min(1).max(120),
  guestPhone: z.string().trim().regex(/^01[0125][0-9]{8}$/),
  guestAddress: z.string().trim().min(1).max(500),
  governorate: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  landmarks: z.string().trim().max(500).nullable().optional(),
  guestNotes: z.string().trim().max(1000).nullable().optional(),
  couponCode: z.string().trim().min(1).max(100).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
