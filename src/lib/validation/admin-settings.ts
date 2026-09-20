import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max);
const optionalHttpUrl = z.string().trim().url().refine((value) => /^https?:$/i.test(new URL(value).protocol), 'URL must use HTTP or HTTPS');

export const adminSettingsSchema = z
  .object({
    whatsappNumber: z.string().trim().max(32).refine((value) => value === '' || /^[+\d\s().-]{7,32}$/.test(value), 'Invalid WhatsApp number'),
    instagramUrl: optionalHttpUrl.nullable().optional(),
    facebookUrl: optionalHttpUrl.nullable().optional(),
    storeNameAr: z.string().trim().min(1).max(120),
    storeNameEn: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).nullable().optional(),
    addressAr: optionalText(500).nullable().optional(),
    addressEn: optionalText(500).nullable().optional(),
    currency: z.literal('EGP'),
    announcementAr: z.string().max(2000).optional(),
    announcementEn: z.string().max(2000).optional(),
  });
