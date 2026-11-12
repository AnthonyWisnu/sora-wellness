import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Db } from '../shared/db';
import { MidtransClient } from './midtrans';
import { PaymentSettings } from './payment-settings';

type Intent = {
  id: string; status: string; gross_amount_idr: number;
  snap_token: string | null; redirect_url: string | null;
  expires_at: Date | null; email: string; name: string; item_name: string;
  event_slug: string | null; event_registration_id: string | null;
};

// Intent wajib committed sebelum fungsi ini dipanggil. Lock hanya mengoordinasi order,
// tidak menahan transaksi/row lock kursi dan wallet ketika provider sedang dihubungi.
export async function prepareSnapIntent(db: Db, settings: PaymentSettings, orderId: string) {
  const client = await db.pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1,0))', [orderId]);
    const result = await client.query<Intent>(`SELECT p.id,p.status,p.gross_amount_idr,p.snap_token,p.redirect_url,
      COALESCE(b.hold_expires_at,pp.expires_at,r.hold_expires_at) AS expires_at,u.email,u.full_name AS name,
      COALESCE(t.title,'Membership '||pp.duration_months||' bulan',e.title||' - '||a.title) AS item_name,
      e.slug AS event_slug,r.id AS event_registration_id
      FROM payment_transactions p LEFT JOIN bookings b ON b.id=p.booking_id
      LEFT JOIN class_sessions s ON s.id=b.session_id LEFT JOIN class_types t ON t.id=s.class_type_id
      LEFT JOIN package_purchases pp ON pp.id=p.package_purchase_id
      LEFT JOIN event_registrations r ON r.id=p.event_registration_id LEFT JOIN community_events e ON e.id=r.event_id
      LEFT JOIN event_activities a ON a.id=r.activity_id
      JOIN app_users u ON u.id=COALESCE(b.customer_id,pp.customer_id,r.customer_id) WHERE p.order_id=$1`, [orderId]);
    const intent = result.rows[0];
    if (!intent) throw new NotFoundException('Order pembayaran tidak ditemukan');
    if (intent.status !== 'pending' || !intent.expires_at || intent.expires_at.getTime() <= Date.now()) {
      throw new ConflictException('Pesanan tidak lagi menunggu pembayaran. Periksa riwayat transaksi.');
    }
    if (intent.snap_token && intent.redirect_url) return { orderId, snapToken: intent.snap_token, redirectUrl: intent.redirect_url };
    const provider = new MidtransClient((await settings.credentials()).serverKey);
    const status = await provider.getTransactionStatus(orderId);
    if (status.status_code !== '404') {
      throw new ServiceUnavailableException('Order telah diproses penyedia pembayaran. Periksa status transaksi sebelum melanjutkan.');
    }
    const returnPath = intent.event_slug && intent.event_registration_id
      ? `/events/${encodeURIComponent(intent.event_slug)}?registration=${encodeURIComponent(intent.event_registration_id)}` : undefined;
    const snap = await provider.createSnapTransaction(orderId,intent.gross_amount_idr,15,{
      email: intent.email, name: intent.name, itemName: intent.item_name,
    },returnPath);
    const saved = await client.query(`UPDATE payment_transactions SET snap_token=$1,redirect_url=$2,updated_at=now()
      WHERE id=$3 AND status='pending' RETURNING id`, [snap.token,snap.redirect_url,intent.id]);
    if (!saved.rowCount) throw new ConflictException('Status pesanan berubah. Periksa riwayat transaksi.');
    return { orderId, snapToken: snap.token, redirectUrl: snap.redirect_url };
  } finally {
    let discardConnection = false;
    try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [orderId]); }
    catch { discardConnection = true; }
    // Destroying the connection releases its session lock without replacing
    // the original operation's result or exception with a cleanup error.
    client.release(discardConnection);
  }
}
