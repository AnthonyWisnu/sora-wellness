import { BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { CreateActivityDto, CreateEventDto } from './events.dto';

export function validateEventSchedule(dto: CreateEventDto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dto.endDate) || dto.endDate < dto.startDate) {
    throw new BadRequestException('Tanggal selesai harus sama atau setelah tanggal mulai');
  }
  for (const activity of dto.activities) {
    const date = activity.localDate ?? (dto.startDate === dto.endDate ? dto.startDate : null);
    if ((!date && dto.status !== 'draft') || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < dto.startDate || date > dto.endDate))) {
      throw new BadRequestException('Pilih tanggal tiap kegiatan di dalam rentang event');
    }
    if (![activity.startTime, activity.endTime].every(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) || activity.endTime <= activity.startTime) {
      throw new BadRequestException('Jam kegiatan harus valid dan selesai setelah jam mulai');
    }
  }
}

export async function saveEventActivities(client: PoolClient, eventId: string, activities: CreateActivityDto[], defaultDate?: string) {
  const existing = await client.query<{ id: string; start_time: string; end_time: string; local_date: string | null }>('SELECT id,start_time,end_time,local_date::text FROM event_activities WHERE event_id=$1 FOR UPDATE', [eventId]);
  const known = new Set(existing.rows.map(row => row.id));
  const kept = activities.flatMap(activity => activity.id ? [activity.id] : []);
  if (new Set(kept).size !== kept.length || kept.some(id => !known.has(id))) {
    throw new BadRequestException('Identitas kegiatan tidak sesuai dengan event');
  }
  const registrations = await client.query<{ activity_id: string; total: number; active: number }>(`
    SELECT activity_id,count(*)::int AS total,count(*) FILTER (WHERE status IN ('registered','attended') OR status='pending_payment' AND hold_expires_at>now())::int AS active
    FROM event_registrations WHERE event_id=$1 GROUP BY activity_id`, [eventId]);
  const removed = [...known].filter(id => !kept.includes(id));
  if (registrations.rows.some(row => removed.includes(row.activity_id))) {
    throw new ConflictException('Kegiatan yang memiliki riwayat peserta tidak dapat dihapus');
  }
  for (const activity of activities) {
    const registration = registrations.rows.find(row => row.activity_id === activity.id);
    const count = registration?.active ?? 0;
    const prior = existing.rows.find(row => row.id === activity.id);
    if (registration && prior && (prior.start_time !== activity.startTime || prior.end_time !== activity.endTime || prior.local_date !== (activity.localDate ?? defaultDate ?? null))) {
      throw new ConflictException('Jadwal kegiatan yang memiliki peserta tidak dapat diubah');
    }
    if (activity.capacity < count) throw new ConflictException('Kapasitas tidak dapat lebih kecil dari jumlah peserta');
  }
  if (removed.length) await client.query('DELETE FROM event_activities WHERE event_id=$1 AND id=ANY($2::uuid[])', [eventId, removed]);
  for (const activity of activities) {
    const coachName = activity.isGuestCoach ? activity.guestCoachName?.trim() : activity.coachName?.trim();
    await client.query(`INSERT INTO event_activities
      (id,event_id,title,category,coach_name,class_type_id,coach_id,is_guest_coach,guest_coach_name,start_time,end_time,capacity,price_idr,local_date)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,coach_name=EXCLUDED.coach_name,
        class_type_id=EXCLUDED.class_type_id,coach_id=EXCLUDED.coach_id,is_guest_coach=EXCLUDED.is_guest_coach,
        guest_coach_name=EXCLUDED.guest_coach_name,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,
        capacity=EXCLUDED.capacity,price_idr=EXCLUDED.price_idr,local_date=EXCLUDED.local_date`, [
      activity.id ?? randomUUID(),eventId,activity.title.trim(),activity.category?.trim() ?? 'Komunitas',
      coachName || 'Instruktur Studio',activity.classTypeId || null,activity.isGuestCoach ? null : activity.coachId || null,
      Boolean(activity.isGuestCoach),activity.isGuestCoach ? activity.guestCoachName?.trim() || null : null,
      activity.startTime,activity.endTime,activity.capacity,activity.priceIdr ?? 0,activity.localDate ?? defaultDate ?? null,
    ]);
  }
}
