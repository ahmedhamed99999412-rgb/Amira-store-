import { z } from 'zod';

const imageFields = {
  base64Data: z.string().trim().min(1).max(12_000_000),
  mimeType: z.string().trim().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/i),
  fileSize: z.union([
    z.number().int().nonnegative().max(10_000_000),
    z.string().trim().min(1).refine((value) => {
      const n = Number(value);
      return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000;
    }).transform(Number),
  ]).default(0),
};

const optionalImageFileSize = imageFields.fileSize.removeDefault().optional();

const text = (max: number) => z.string().trim().max(max).nullable().optional();

export const createAdminBannerSchema = z.object({
  type: z.string().trim().min(1).max(40),
  ...imageFields,
  titleAr: text(300),
  titleEn: text(300),
  subtitleAr: text(1000),
  subtitleEn: text(1000),
  ctaTextAr: text(150),
  ctaTextEn: text(150),
  ctaLink: text(1000),
  ctaLinkAr: text(1000),
  ctaLinkEn: text(1000),
  order: z.union([
    z.number().int().min(0).max(1_000_000),
    z.string().trim().refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1_000_000).transform(Number),
  ]).optional(),
  isActive: z.boolean().default(true),
});

export const updateAdminBannerSchema = z.object({
  type: z.string().trim().min(1).max(40).optional(),
  base64Data: imageFields.base64Data.optional(),
  mimeType: imageFields.mimeType.optional(),
  fileSize: optionalImageFileSize,
  titleAr: text(300),
  titleEn: text(300),
  subtitleAr: text(1000),
  subtitleEn: text(1000),
  ctaTextAr: text(150),
  ctaTextEn: text(150),
  ctaLink: text(1000),
  ctaLinkAr: text(1000),
  ctaLinkEn: text(1000),
  order: z.union([
    z.number().int().min(0).max(1_000_000),
    z.string().trim().refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1_000_000).transform(Number),
  ]).optional(),
  isActive: z.boolean().optional(),
}).superRefine((value, ctx) => {
  const imageProvided = value.base64Data !== undefined || value.mimeType !== undefined || value.fileSize !== undefined;
  const imageComplete = value.base64Data !== undefined && value.mimeType !== undefined && value.fileSize !== undefined;
  if (imageProvided && !imageComplete) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base64Data'], message: 'Image fields must be provided together' });
  }
});
