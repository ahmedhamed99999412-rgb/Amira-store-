import { z } from 'zod';
import { nonNegativeMoneyNumber, monetaryNumber, optionalMoneyNumber } from './money';

const finiteNumber = z.union([
  z.number().finite(),
  z.string().trim().min(1).refine((value) => Number.isFinite(Number(value)), 'Invalid number').transform(Number),
]);

const nonNegativeNumber = finiteNumber.refine((value) => value >= 0, 'Value must be non-negative');

const imageSchema = z.object({
  base64Data: z.string().trim().min(1).max(12_000_000),
  mimeType: z.string().trim().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/i, 'Invalid image type'),
  fileSize: z.union([
    z.number().int().nonnegative().max(10_000_000),
    z.string().trim().min(1).refine((value) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 10_000_000;
    }, 'Invalid image size').transform(Number),
  ]).default(0),
});

const variantSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  size: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
  colorHex: z.string().trim().max(32).nullable().optional(),
  stock: z.union([
    z.number().int().nonnegative().max(1_000_000),
    z.string().trim().min(1).refine((value) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 1_000_000;
    }, 'Invalid stock').transform(Number),
  ]).default(0),
  sku: z.string().trim().max(100).nullable().optional(),
  priceAdjustment: monetaryNumber.default(0),
});

const tagsSchema = z.array(z.string().trim().min(1).max(100)).max(100).default([]);

export const createAdminProductSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(160).optional(),
  categoryId: z.string().trim().min(1).max(100),
  price: nonNegativeMoneyNumber,
  comparePrice: optionalMoneyNumber,
  costPrice: optionalMoneyNumber,
  hasVariants: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  shortDescriptionAr: z.string().max(2000).nullable().optional(),
  shortDescriptionEn: z.string().max(2000).nullable().optional(),
  descriptionAr: z.string().max(20_000).nullable().optional(),
  descriptionEn: z.string().max(20_000).nullable().optional(),
  tagsAr: tagsSchema,
  tagsEn: tagsSchema,
  images: z.array(imageSchema).max(8).default([]),
  variants: z.array(variantSchema).max(100).default([]),
});

export const updateAdminProductSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(160).optional(),
  categoryId: z.string().trim().min(1).max(100).optional(),
  price: nonNegativeNumber.optional(),
  comparePrice: optionalMoneyNumber,
  costPrice: optionalMoneyNumber,
  hasVariants: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  nameAr: z.string().trim().min(1).max(200).optional(),
  nameEn: z.string().trim().min(1).max(200).optional(),
  shortDescriptionAr: z.string().max(2000).nullable().optional(),
  shortDescriptionEn: z.string().max(2000).nullable().optional(),
  descriptionAr: z.string().max(20_000).nullable().optional(),
  descriptionEn: z.string().max(20_000).nullable().optional(),
  tagsAr: tagsSchema.optional(),
  tagsEn: tagsSchema.optional(),
  variants: z.array(variantSchema).max(100).optional(),
  newImages: z.array(imageSchema).max(8).optional(),
  deletedImageIds: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
});

export type CreateAdminProductInput = z.infer<typeof createAdminProductSchema>;
export type UpdateAdminProductInput = z.infer<typeof updateAdminProductSchema>;
