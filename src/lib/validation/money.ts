import { z } from 'zod';

/** Numeric money input normalized to at most two decimal places. */
export const monetaryNumber = z.union([
  z.number().finite(),
  z.string().trim().min(1).refine((value) => Number.isFinite(Number(value)), 'Invalid monetary amount').transform(Number),
]).refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-8, 'Monetary amount must have at most 2 decimal places');

export const nonNegativeMoneyNumber = monetaryNumber.refine((value) => value >= 0, 'Value must be non-negative');
export const optionalMoneyNumber = nonNegativeMoneyNumber.nullable().optional();
