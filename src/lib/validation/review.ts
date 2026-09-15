import { z } from 'zod';

export const reviewSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(3000),
}).strict();

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
