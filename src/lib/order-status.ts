export const ORDER_STATUSES = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Conservative state machine for the order lifecycle already exposed by the UI.
 * Same-status updates remain allowed. Cancellation is allowed before delivery;
 * delivered and cancelled orders are terminal.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_CONFIRMATION: ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CONFIRMED', 'SHIPPING', 'CANCELLED'],
  SHIPPING: ['SHIPPING', 'DELIVERED', 'CANCELLED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
};

export function canTransitionOrderStatus(from: string, to: OrderStatus): boolean {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, from)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[from as OrderStatus].includes(to);
}
