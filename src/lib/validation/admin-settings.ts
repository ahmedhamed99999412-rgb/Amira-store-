import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max);

export const adminSettingsSchema = z
  .object({
    whatsappNumber: z.string().trim().min(7).max(32),
    storeNameAr: z.string().trim().min(1).max(120),
    storeNameEn: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).nullable().optional(),
    addressAr: optionalText(500).nullable().optional(),
    addressEn: optionalText(500).nullable().optional(),
    currency: z.string().trim().min(1).max(10),
    freeShippingEnabled: z.boolean().optional(),
    freeShippingMinOrder: z.number().finite().min(0).nullable().optional(),
    freeShippingStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').nullable().optional(),
    freeShippingEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').nullable().optional(),
    announcementAr: z.string().max(2000).optional(),
    announcementEn: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.freeShippingStart && data.freeShippingEnd) {
      if (new Date(data.freeShippingEnd) < new Date(data.freeShippingStart)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['freeShippingEnd'],
          message: 'freeShippingEnd must be after freeShippingStart',
        });
      }
    }
  });
