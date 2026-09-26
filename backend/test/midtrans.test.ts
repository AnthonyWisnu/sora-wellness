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

test('Snap menerima email pelanggan dan rincian yang sama dengan tagihan gateway', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ token: 'sandbox-token', redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/sandbox-token' }), { status: 201 });
  };
  try {
    const client = new MidtransClient('Mid-server-test-only');
    await client.createSnapTransaction('CLS-booking', 25000, 15, { email: 'pelanggan@example.test', name: 'Ayu Lestari', itemName: 'Pembayaran kelas Pilates' });
    await client.createSnapTransaction('PKG-package', 450000, 15, { email: 'member@example.test', name: 'Dimas Saputra', itemName: 'Membership 1 bulan' });
    for (const request of requests) {
      const total = request.transaction_details as { gross_amount: number };
      const items = request.item_details as { price: number; quantity: number }[];
      assert.equal(items.reduce((sum, item) => sum + item.price * item.quantity, 0), total.gross_amount);
      assert.match((request.customer_details as { email: string }).email, /@example\.test$/);
      assert.equal((request.expiry as { duration: number }).duration, 15);
    }
    assert.equal((requests[0].customer_details as { email: string }).email, 'pelanggan@example.test');
    assert.equal((requests[1].customer_details as { email: string }).email, 'member@example.test');
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('pembatalan provider hanya memakai endpoint Sandbox dan menolak respons gagal', async () => {
  const originalFetch = globalThis.fetch;
  let requested = '';
  globalThis.fetch = async (input, init) => {
    requested = String(input);
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({ transaction_status: 'cancel', status_code: '200' }), { status: 200 });
  };
  try {
    const midtrans = new MidtransClient('Mid-server-test-only');
    assert.equal((await midtrans.cancelPendingTransaction('PKG-valid')).transaction_status, 'cancel');
    assert.equal(requested, 'https://api.sandbox.midtrans.com/v2/PKG-valid/cancel');
    globalThis.fetch = async () => new Response(null, { status: 409 });
    await assert.rejects(() => midtrans.cancelPendingTransaction('PKG-valid'), /HTTP 409/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
