import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { WellnessApi } from './api';

const uuid = z.uuid();
const api = new WellnessApi();
const output = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });
const run = async (work: () => Promise<unknown>) => {
  try { return output(await work()); }
  catch (error) { return { ...output({ error: error instanceof Error ? error.message : 'Kesalahan tidak diketahui' }), isError: true }; }
};

void serveStdio(() => {
  const server = new McpServer({ name: 'wellness-midtrans-sandbox', version: '1.0.0' });
  server.registerTool('wellness_list_sessions', {
    description: 'Daftar sesi kelas yang terlihat oleh akun pelanggan demo.',
    inputSchema: z.object({ page: z.number().int().positive().default(1) }), annotations: { readOnlyHint: true },
  }, ({ page }) => run(() => api.request('GET', `public/sessions?page=${page}&limit=20`)));
  server.registerTool('wellness_list_packages', {
    description: 'Daftar pilihan paket aktif untuk pembelian uji.',
    inputSchema: z.object({}), annotations: { readOnlyHint: true },
  }, () => run(() => api.request('GET', 'public/packages')));
  server.registerTool('wellness_create_booking', {
    description: 'Buat booking uji melalui aturan backend. Jika berbayar, hasil berisi URL checkout Midtrans Sandbox.',
    inputSchema: z.object({ sessionId: uuid, paymentChoice: z.enum(['quota', 'single']), useBalance: z.boolean().default(false), idempotencyKey: z.string().min(8).max(128) }),
  }, ({ sessionId, paymentChoice, useBalance, idempotencyKey }) => run(() => api.request('POST', 'bookings', { sessionId, paymentChoice, useBalance }, idempotencyKey)));
  server.registerTool('wellness_create_package_purchase', {
    description: 'Buat pembelian paket uji melalui backend; checkout berbayar berlaku 15 menit.',
    inputSchema: z.object({ packageOptionId: uuid, idempotencyKey: z.string().min(8).max(128) }),
  }, ({ packageOptionId, idempotencyKey }) => run(() => api.request('POST', 'me/membership-purchases', { packageOptionId }, idempotencyKey)));
  server.registerTool('wellness_get_booking', {
    description: 'Baca booking pelanggan demo dari backend.', inputSchema: z.object({ bookingId: uuid }), annotations: { readOnlyHint: true },
  }, ({ bookingId }) => run(() => api.request('GET', `bookings/${bookingId}`)));
  server.registerTool('wellness_get_package_purchase', {
    description: 'Baca pembelian paket pelanggan demo dari backend.', inputSchema: z.object({ purchaseId: uuid }), annotations: { readOnlyHint: true },
  }, ({ purchaseId }) => run(() => api.request('GET', `me/membership-purchases/${purchaseId}`)));
  server.registerTool('wellness_refresh_booking_payment', {
    description: 'Minta backend mencocokkan pembayaran booking dengan Status API Midtrans Sandbox.', inputSchema: z.object({ bookingId: uuid }),
  }, ({ bookingId }) => run(() => api.request('POST', `bookings/${bookingId}/refresh-payment`)));
  server.registerTool('wellness_refresh_package_payment', {
    description: 'Minta backend mencocokkan pembayaran paket dengan Status API Midtrans Sandbox.', inputSchema: z.object({ purchaseId: uuid }),
  }, ({ purchaseId }) => run(() => api.request('POST', `me/membership-purchases/${purchaseId}/refresh-payment`)));
  server.registerTool('wellness_cancel_pending_booking', {
    description: 'Batalkan hanya booking yang masih pending melalui backend; kursi dan saldo tertahan dilepas.', inputSchema: z.object({ bookingId: uuid }),
  }, ({ bookingId }) => run(async () => {
    const booking = await api.request('GET', `bookings/${bookingId}`) as { status: string };
    if (booking.status !== 'pending_payment') throw new Error('MCP hanya membatalkan booking pending');
    return api.request('POST', `bookings/${bookingId}/cancel`);
  }));
  server.registerTool('wellness_cancel_pending_package', {
    description: 'Batalkan transaksi paket pending di Midtrans Sandbox melalui backend, lalu cocokkan status lokal.', inputSchema: z.object({ purchaseId: uuid }),
  }, ({ purchaseId }) => run(() => api.request('POST', `me/membership-purchases/${purchaseId}/cancel-pending`)));
  return server;
});
