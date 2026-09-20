import { z } from 'zod';

const addressText = (max: number) => z.string().trim().min(1).max(max);

export const createAddressSchema = z.object({
  fullName: addressText(120),
  phone: z.string().trim().min(7).max(32),
  street: addressText(240),
  city: addressText(100),
  governorate: addressText(100),
  landmarks: z.string().trim().max(240).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
}).strict();

export const updateAddressSchema = z.object({
  fullName: addressText(120).optional(),
  phone: z.string().trim().min(7).max(32).optional(),
  street: addressText(240).optional(),
  city: addressText(100).optional(),
  governorate: addressText(100).optional(),
  landmarks: z.string().trim().max(240).optional().nullable(),
  isDefault: z.boolean().optional(),
}).strict();
