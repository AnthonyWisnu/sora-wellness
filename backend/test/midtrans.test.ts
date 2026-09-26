import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { MidtransClient } from '../src/payments/midtrans';

test('signature notifikasi Midtrans memakai SHA512 dan Server Key', () => {
  const key = 'Mid-server-test-only';
  const midtrans = new MidtransClient(key);
  const message = { order_id: 'WELLNESS-1', status_code: '200', gross_amount: '75000.00' };
  const signature_key = createHash('sha512').update(`${message.order_id}${message.status_code}${message.gross_amount}${key}`).digest('hex');
  assert.equal(midtrans.verifyNotificationSignature({ ...message, signature_key }), true);
  assert.equal(midtrans.verifyNotificationSignature({ ...message, gross_amount: '75001.00', signature_key }), false);
});

test('order ID dan rupiah harus valid sebelum memanggil provider', async () => {
  const midtrans = new MidtransClient('Mid-server-test-only');
  await assert.rejects(() => midtrans.createSnapTransaction('invalid id', 10000), /order_id/);
  await assert.rejects(() => midtrans.createSnapTransaction('valid-id', 0), /Nominal/);
});

test('status 404 sebelum metode pembayaran dipilih tetap dapat dibaca', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 404 });
  try {
    const status = await new MidtransClient('Mid-server-test-only').getTransactionStatus('valid-id');
    assert.equal(status.status_code, '404');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
