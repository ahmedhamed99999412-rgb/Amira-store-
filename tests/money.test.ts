import assert from 'node:assert/strict';
import test from 'node:test';
import { addMoney, clampMoney, multiplyMoney, percentageMoney, roundMoney, subtractMoney } from '../src/lib/money.ts';
import { getLowestVariantCardPricing } from '../src/lib/product-variants.ts';

test('money helpers avoid common floating-point addition errors', () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
  assert.equal(subtractMoney(10, 0.1, 0.2), 9.7);
  assert.equal(roundMoney(12.345), 12.35);
});

test('money multiplication and percentage use minor-unit rounding', () => {
  assert.equal(multiplyMoney(19.99, 3), 59.97);
  assert.equal(percentageMoney(199.99, 10), 20);
});

test('money clamp keeps discounts inside the subtotal range', () => {
  assert.equal(clampMoney(140, 0, 100), 100);
  assert.equal(clampMoney(-5, 0, 100), 0);
});

test('money helpers reject unsafe inputs', () => {
  assert.throws(() => roundMoney(Number.NaN), /Invalid monetary amount/);
  assert.throws(() => multiplyMoney(10, 1.5), /quantity must be an integer/);
});

test('lowest variant pricing uses the lowest sale price and its regular price', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: 1100, salePrice: 900, priceAdjustment: 0 },
      { regularPrice: 1050, salePrice: 950, priceAdjustment: 0 },
    ]),
    { displayPrice: 900, displayComparePrice: 1100 },
  );
});

test('lowest variant pricing includes price adjustments', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: 1100, salePrice: 900, priceAdjustment: 50 },
      { regularPrice: 1000, salePrice: 925, priceAdjustment: 0 },
    ]),
    { displayPrice: 925, displayComparePrice: 1000 },
  );
});

test('lowest variant pricing falls back to product compare price', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: 1000, salePrice: 900, priceAdjustment: 0 },
      { regularPrice: 800, salePrice: null, priceAdjustment: 0 },
    ]),
    { displayPrice: 800, displayComparePrice: 1200 },
  );
});

test('lowest variant pricing falls back to product pricing', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: null, salePrice: null, priceAdjustment: 0 },
    ]),
    { displayPrice: 1000, displayComparePrice: 1200 },
  );
});

test('lowest variant pricing with sale-only variant falls back to product compare price', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: null, salePrice: 800, priceAdjustment: 0 },
      { regularPrice: 1100, salePrice: 900, priceAdjustment: 0 },
    ]),
    { displayPrice: 800, displayComparePrice: 1200 },
  );
});

test('lowest variant pricing with sale-only variant and no product compare price shows no discount', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, null, [
      { regularPrice: null, salePrice: 800, priceAdjustment: 0 },
    ]),
    { displayPrice: 800, displayComparePrice: null },
  );
});

test('lowest variant pricing with sale-only variant and price adjustment falls back to product compare price', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: null, salePrice: 800, priceAdjustment: 50 },
      { regularPrice: 1100, salePrice: 950, priceAdjustment: 0 },
    ]),
    { displayPrice: 850, displayComparePrice: 1200 },
  );
});

test('lowest variant pricing picks cheapest sale price across multiple variants', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: 1000, salePrice: 900, priceAdjustment: 0 },
      { regularPrice: 1100, salePrice: 850, priceAdjustment: 10 },
      { regularPrice: 950, salePrice: 800, priceAdjustment: 0 },
    ]),
    { displayPrice: 800, displayComparePrice: 950 },
  );
});

test('product-level discount on variant with no sale falls back to product compare price', () => {
  assert.deepEqual(
    getLowestVariantCardPricing(1000, 1200, [
      { regularPrice: 1000, salePrice: null, priceAdjustment: 0 },
    ]),
    { displayPrice: 1000, displayComparePrice: 1200 },
  );
});
