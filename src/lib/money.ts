/**
 * Small server-side money helpers.
 *
 * The database currently stores monetary values as JavaScript numbers/SQLite
 * REAL values. Until the planned Decimal migration, keep all arithmetic on
 * integer minor units (piasters/cents) and return normal numbers at the API
 * boundary.
 */

const CURRENCY_DECIMALS = 2;
const SCALE = 10 ** CURRENCY_DECIMALS;

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error('Invalid monetary amount');
  }

  const cents = Math.round((amount + Number.EPSILON) * SCALE);
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Monetary amount is outside the supported range');
  }

  return cents;
}

function fromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Invalid monetary cents');
  }
  return cents / SCALE;
}

export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

export function addMoney(...amounts: number[]): number {
  let cents = 0;
  for (const amount of amounts) {
    cents += toCents(amount);
  }
  return fromCents(cents);
}

export function subtractMoney(amount: number, ...subtrahends: number[]): number {
  let cents = toCents(amount);
  for (const subtrahend of subtrahends) {
    cents -= toCents(subtrahend);
  }
  return fromCents(cents);
}

export function multiplyMoney(amount: number, quantity: number): number {
  if (!Number.isSafeInteger(quantity)) {
    throw new Error('Money quantity must be an integer');
  }
  return fromCents(toCents(amount) * quantity);
}

export function percentageMoney(amount: number, percentage: number): number {
  if (!Number.isFinite(percentage)) {
    throw new Error('Invalid percentage');
  }
  return roundMoney((toCents(amount) * percentage) / 100);
}

export function clampMoney(amount: number, min: number, max: number): number {
  const normalizedMin = roundMoney(min);
  const normalizedMax = roundMoney(max);
  if (normalizedMin > normalizedMax) {
    throw new Error('Invalid money range');
  }

  const normalizedAmount = roundMoney(amount);
  return Math.min(Math.max(normalizedAmount, normalizedMin), normalizedMax);
}
