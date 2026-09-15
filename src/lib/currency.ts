export const STORE_CURRENCY = 'EGP' as const;

export function formatCurrency(amount: number, locale: string): string {
  if (!Number.isFinite(amount)) {
    throw new Error('Invalid monetary amount');
  }

  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return locale === 'ar' ? `${formatted} ج.م` : `${STORE_CURRENCY} ${formatted}`;
}
