export type BookingPaymentRow = {
  booking_id: string;
  customer_id: string;
  session_id: string;
  booking_status: string;
  hold_expires_at: Date | null;
  wallet_reserved_idr: number;
  payment_id: string;
  order_id: string;
  amount_idr: number;
  payment_status: string;
};

export function amountIdr(value: string | undefined): number | null {
  if (!value || !/^\d+(?:\.00)?$/.test(value)) return null;
  const amount = Number(value.split('.')[0]);
  return Number.isSafeInteger(amount) ? amount : null;
}
