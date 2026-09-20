import { z } from 'zod';

export const wishlistActionSchema = z.object({
  action: z.enum(['add', 'remove']),
  productId: z.string().min(1),
}).strict();

export type WishlistAction = z.infer<typeof wishlistActionSchema>;
