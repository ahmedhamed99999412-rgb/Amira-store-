import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStockAllocation } from '../src/lib/order-stock.ts';

test('stock allocation parser accepts valid positive integer allocations', () => {
  assert.deepEqual(parseStockAllocation(JSON.stringify([
    { variantId: 'v1', quantity: 2 },
    { variantId: 'v2', quantity: 3 },
  ])), [
    { variantId: 'v1', quantity: 2 },
    { variantId: 'v2', quantity: 3 },
  ]);
});

test('stock allocation parser rejects malformed or non-positive entries', () => {
  assert.equal(parseStockAllocation('not-json'), null);
  assert.equal(parseStockAllocation(JSON.stringify([{ variantId: 'v1', quantity: 0 }])), null);
  assert.equal(parseStockAllocation(JSON.stringify([{ variantId: '', quantity: 1 }])), null);
  assert.equal(parseStockAllocation(JSON.stringify([{ variantId: 'v1', quantity: 1.5 }])), null);
});
