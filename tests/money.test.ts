import assert from 'node:assert/strict';
import test from 'node:test';
import { addMoney, clampMoney, multiplyMoney, percentageMoney, roundMoney, subtractMoney } from '../src/lib/money.ts';

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
