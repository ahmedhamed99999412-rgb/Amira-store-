import { z } from 'zod';

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
  mimeType: z.string().trim().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/i),
  fileSize: z.union([
    z.number().int().nonnegative().max(10_000_000),
    z.string().trim().min(1).refine((value) => {
      const n = Number(value);
      return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000;
    }).transform(Number),
  ]).default(0),
}).superRefine(validateImagePayload);

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
  parentId: z.string().trim().min(1).max(100).nullable().optional(),
  slug: slug.optional(),
  nameAr: z.string().trim().min(1).max(200).optional(),
  nameEn: z.string().trim().min(1).max(200).optional(),
  descriptionAr: z.string().max(5000).nullable().optional(),
  descriptionEn: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
  image: imageSchema.optional(),
});
