import { z } from 'zod';
import { nonNegativeMoneyNumber, monetaryNumber, optionalMoneyNumber } from './money';

const finiteNumber = z.union([
  z.number().finite(),
  z.string().trim().min(1).refine((value) => Number.isFinite(Number(value)), 'Invalid number').transform(Number),
]);

const nonNegativeNumber = finiteNumber.refine((value) => value >= 0, 'Value must be non-negative');

function validateImagePayload(
  value: { base64Data: string; mimeType: string; fileSize: number },
  ctx: z.RefinementCtx,
) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value.base64Data) || value.base64Data.length % 4 !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base64Data'], message: 'Invalid image data' });
    return;
  }

  const bytes = Buffer.from(value.base64Data, 'base64');

  if (bytes.length !== value.fileSize) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fileSize'], message: 'Image size does not match image data' });
    return;
  }

  const mime = value.mimeType.toLowerCase();
  const signatureMatches =
    (mime === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mime === 'image/png' && bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mime === 'image/gif' && bytes.length >= 6 && (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a')) ||
    (mime === 'image/webp' && bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') ||
    (mime === 'image/svg+xml' && bytes.toString('utf8').trimStart().startsWith('<'));

  if (!signatureMatches) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mimeType'], message: 'Image data does not match MIME type' });
  }
}

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
}).superRefine(validateImagePayload);

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
  regularPrice: optionalMoneyNumber,
  salePrice: optionalMoneyNumber,
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
  differentPriceBySize: z.boolean().default(false),
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
  differentPriceBySize: z.boolean().optional(),
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
