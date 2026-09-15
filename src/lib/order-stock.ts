export type StockAllocation = {
  variantId: string;
  quantity: number;
};

export function parseStockAllocation(value: string | null): StockAllocation[] | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const allocation: StockAllocation[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) return null;
      const candidate = entry as { variantId?: unknown; quantity?: unknown };
      if (typeof candidate.variantId !== 'string' || candidate.variantId.length === 0) return null;
      if (typeof candidate.quantity !== 'number' || !Number.isSafeInteger(candidate.quantity) || candidate.quantity <= 0) return null;
      allocation.push({ variantId: candidate.variantId, quantity: candidate.quantity });
    }

    return allocation;
  } catch {
    return null;
  }
}
