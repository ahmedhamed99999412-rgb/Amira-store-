import { z } from 'zod';

const boundedText = (max: number) => z.string().trim().min(1).max(max);

export const smartSearchSchema = z.object({
  query: boundedText(500),
}).strict();

export const chatSchema = z.object({
  message: boundedText(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: boundedText(4000),
  }).strict()).max(20).default([]),
}).strict();

export const generateDescriptionSchema = z.object({
  productName: boundedText(200),
  category: z.string().trim().max(200).default(''),
  features: z.string().trim().max(3000).default(''),
  locale: z.enum(['ar', 'en']).default('ar'),
}).strict();

export const generateSkuSchema = z.object({
  nameAr: z.string().trim().max(200).default(''),
  nameEn: z.string().trim().max(200).default(''),
  excludeId: z.string().trim().max(100).optional(),
}).strict();

export const suggestVariantsSchema = z.object({
  productName: boundedText(200),
  category: z.string().trim().max(200).default(''),
  locale: z.enum(['ar', 'en']).default('ar'),
}).strict();

export const translateSchema = z.object({
  text: boundedText(5000),
  sourceLocale: z.enum(['ar', 'en']),
  targetLocale: z.enum(['ar', 'en']),
}).strict().refine((data) => data.sourceLocale !== data.targetLocale, {
  message: 'Source and target locales must differ',
  path: ['targetLocale'],
});
