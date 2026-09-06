import { z } from 'zod';

const imageSchema = z.object({
  base64Data: z.string().trim().min(1).max(12_000_000),
  mimeType: z.string().trim().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/i),
  fileSize: z.union([
    z.number().int().nonnegative().max(10_000_000),
    z.string().trim().min(1).refine((value) => {
      const n = Number(value);
      return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000;
    }).transform(Number),
  ]).default(0),
});

const slug = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Invalid slug');

export const createAdminCategorySchema = z.object({
  parentId: z.string().trim().min(1).max(100).nullable().optional(),
  slug,
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  descriptionAr: z.string().max(5000).nullable().optional(),
  descriptionEn: z.string().max(5000).nullable().optional(),
  image: imageSchema.optional(),
});

export const updateAdminCategorySchema = z.object({
  slug: slug.optional(),
  nameAr: z.string().trim().min(1).max(200).optional(),
  nameEn: z.string().trim().min(1).max(200).optional(),
  descriptionAr: z.string().max(5000).nullable().optional(),
  descriptionEn: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
  image: imageSchema.optional(),
});
