import { createHash, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

const snapUrl = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const statusBaseUrl = 'https://api.sandbox.midtrans.com/v2';

export type SnapTransaction = { token: string; redirect_url: string };
export type MidtransStatus = {
  order_id?: string;
  merchant_id?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
};
export type MidtransNotification = MidtransStatus & {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
};

export class MidtransClient {
  constructor(private readonly serverKey: string) {
    if (!serverKey || !serverKey.startsWith('Mid-server-')) throw new Error('Server Key Midtrans Sandbox tidak tersedia');
  }

  private authorization() { return `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`; }

  async createSnapTransaction(orderId: string, grossAmountIdr: number, expiryMinutes?: number): Promise<SnapTransaction> {
    if (!/^[a-zA-Z0-9._~-]{1,50}$/.test(orderId)) throw new Error('order_id Midtrans tidak valid');
    if (!Number.isSafeInteger(grossAmountIdr) || grossAmountIdr <= 0) throw new Error('Nominal Midtrans tidak valid');
    if (expiryMinutes !== undefined && (!Number.isInteger(expiryMinutes) || expiryMinutes < 1 || expiryMinutes > 10080)) throw new Error('Durasi pembayaran tidak valid');
    const notificationUrl = process.env.MIDTRANS_NOTIFICATION_URL;
    if (notificationUrl) {
      const url = new URL(notificationUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('URL notifikasi Midtrans harus HTTPS tanpa kredensial atau fragmen');
    }
    const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' +0700';
    const response = await fetch(snapUrl, {
      method: 'POST',
      headers: { Authorization: this.authorization(), Accept: 'application/json', 'Content-Type': 'application/json', ...(notificationUrl ? { 'X-Override-Notification': notificationUrl } : {}) },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: grossAmountIdr },
        ...(expiryMinutes === undefined ? {} : {
          expiry: { start_time: jakartaNow, duration: Math.max(expiryMinutes, 15), unit: 'minutes' },
          page_expiry: { duration: Math.max(expiryMinutes, 15), unit: 'minutes' },
        }),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 201) throw new ServiceUnavailableException(`Midtrans Snap menolak pembuatan transaksi (HTTP ${response.status})`);
    const data = await response.json() as Partial<SnapTransaction>;
    if (!data.token || !data.redirect_url || new URL(data.redirect_url).hostname !== 'app.sandbox.midtrans.com') throw new Error('Respons Midtrans Snap tidak valid');
    return { token: data.token, redirect_url: data.redirect_url };
  }

  async getTransactionStatus(orderId: string): Promise<MidtransStatus> {
    if (!/^[a-zA-Z0-9._~-]{1,50}$/.test(orderId)) throw new Error('order_id Midtrans tidak valid');
    const response = await fetch(`${statusBaseUrl}/${encodeURIComponent(orderId)}/status`, {
      headers: { Authorization: this.authorization(), Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    // Snap dapat membuat token sebelum pelanggan memilih metode pembayaran.
    // Pada fase itu Status API mengembalikan HTTP 404 untuk order yang sama.
    if (response.status === 404) return { status_code: '404' };
    if (!response.ok) throw new ServiceUnavailableException(`Pemeriksaan status Midtrans gagal (HTTP ${response.status})`);
    return await response.json() as MidtransStatus;
  }

  verifyNotificationSignature(notification: MidtransNotification): boolean {
    if (!/^[a-fA-F0-9]{128}$/.test(notification.signature_key ?? '')) return false;
    const expected = createHash('sha512').update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${this.serverKey}`).digest();
    const actual = Buffer.from(notification.signature_key, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
