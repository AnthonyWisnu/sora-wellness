import { ConflictException, NotFoundException } from '@nestjs/common';
import { Db } from '../shared/db';

export function checkInAtLobby(db: Db, staffId: string, code: string) {
  return db.transaction(async client => {
    const booking = await client.query<{
      id: string; bookingCode: string | null; sessionId: string; customerId: string;
      status: string; sessionStatus: string; customerName: string; avatarUrl: string | null;
      classTitle: string; startsAt: Date; endsAt: Date;
    }>(`SELECT b.id,b.booking_code AS "bookingCode",b.session_id AS "sessionId",b.customer_id AS "customerId",b.status,
      s.status AS "sessionStatus",u.full_name AS "customerName",
      CASE WHEN u.avatar_media_id IS NOT NULL THEN '/api/v1/public/media/'||u.avatar_media_id ELSE NULL END AS "avatarUrl",
      t.title AS "classTitle",s.starts_at AS "startsAt",s.ends_at AS "endsAt"
      FROM bookings b JOIN class_sessions s ON s.id=b.session_id JOIN class_types t ON t.id=s.class_type_id
      JOIN app_users u ON u.id=b.customer_id WHERE b.id::text=$1 OR upper(b.booking_code)=upper($1::text)
      FOR UPDATE OF b`, [code]);
    const row = booking.rows[0];
    if (!row) throw new NotFoundException('Tiket booking tidak ditemukan');
    if (row.status !== 'confirmed' || row.sessionStatus === 'cancelled') throw new ConflictException('Tiket belum aktif atau kelas dibatalkan');
    const inserted = await client.query(`INSERT INTO lobby_check_ins(booking_id,checked_by) VALUES($1,$2)
      ON CONFLICT(booking_id) DO NOTHING RETURNING checked_at`, [row.id,staffId]);
    const arrival = await client.query<{ checked_at: Date }>('SELECT checked_at FROM lobby_check_ins WHERE booking_id=$1', [row.id]);
    const locker = await client.query<{ code: string }>(`SELECT l.code FROM locker_assignments a JOIN lockers l ON l.id=a.locker_id
      WHERE a.customer_id=$1 AND a.released_at IS NULL LIMIT 1`, [row.customerId]);
    return {
      success: true, alreadyCheckedIn: inserted.rowCount === 0,
      bookingId: row.id, bookingCode: row.bookingCode, sessionId: row.sessionId,
      customerId: row.customerId, customerName: row.customerName, avatarUrl: row.avatarUrl,
      classTitle: row.classTitle, startsAt: row.startsAt, endsAt: row.endsAt,
      recordedAt: arrival.rows[0].checked_at, lockerCode: locker.rows[0]?.code ?? null,
    };
  });
}
