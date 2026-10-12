import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { Db } from '../shared/db'
import type { CreateEventDto, RegisterEventDto } from './events.dto'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 100)
}

const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
function randomCode(length = 4): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS[bytes[i] % CHARS.length]
  }
  return code
}

@Injectable()
export class EventsService {
  constructor(private readonly db: Db) {}

  private async getPrefix(): Promise<string> {
    const res = await this.db.query<{ prefix: string }>(
      'SELECT coalesce(booking_code_prefix, $1) AS prefix FROM studio WHERE id=1',
      ['SORA'],
    )
    return res.rows[0]?.prefix || 'SORA'
  }

  async listPublic() {
    const res = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl",
              (SELECT count(*)::int FROM event_activities a WHERE a.event_id=e.id) AS "activityCount",
              (SELECT count(*)::int FROM event_registrations r WHERE r.event_id=e.id AND r.status<>'cancelled') AS "totalRegistered"
       FROM community_events e
       WHERE e.status = 'published' AND e.end_date >= (now() AT TIME ZONE 'Asia/Makassar')::date
       ORDER BY e.start_date ASC`,
    )
    return res.rows
  }

  async getPublic(slug: string) {
    const eventRes = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl"
       FROM community_events e
       WHERE e.slug = $1`,
      [slug],
    )
    if (!eventRes.rows[0]) throw new NotFoundException('Event komunitas tidak ditemukan')
    const event = eventRes.rows[0]

    const activitiesRes = await this.db.query(
      `SELECT a.id, a.title, a.category, a.coach_name AS "coachName",
              a.class_type_id AS "classTypeId", a.coach_id AS "coachId",
              a.is_guest_coach AS "isGuestCoach", a.guest_coach_name AS "guestCoachName",
              a.start_time AS "startTime", a.end_time AS "endTime", a.capacity,
              a.price_idr AS "priceIdr",
              a.capacity - (SELECT count(*)::int FROM event_registrations r WHERE r.activity_id=a.id AND r.status<>'cancelled') AS "seatsLeft"
       FROM event_activities a
       WHERE a.event_id = $1
       ORDER BY a.start_time ASC`,
      [event.id],
    )

    return { ...event, activities: activitiesRes.rows }
  }

  async register(slug: string, dto: RegisterEventDto, customerId?: string) {
    return this.db.transaction(async (client) => {
      const eventRes = await client.query<{ id: string; status: string }>(
        'SELECT id, status FROM community_events WHERE slug=$1 FOR SHARE',
        [slug],
      )
      if (!eventRes.rows[0] || eventRes.rows[0].status !== 'published') {
        throw new NotFoundException('Event tidak aktif atau tidak ditemukan')
      }
      const eventId = eventRes.rows[0].id

      const actRes = await client.query<{ id: string; capacity: number; title: string; price_idr: number }>(
        'SELECT id, capacity, title, price_idr FROM event_activities WHERE id=$1 AND event_id=$2 FOR UPDATE',
        [dto.activityId, eventId],
      )
      if (!actRes.rows[0]) throw new NotFoundException('Sesi kegiatan event tidak ditemukan')
      const activity = actRes.rows[0]

      const regCountRes = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM event_registrations WHERE activity_id=$1 AND status<>'cancelled'",
        [activity.id],
      )
      if (regCountRes.rows[0].count >= activity.capacity) {
        throw new BadRequestException('Kapasitas untuk kegiatan ini sudah penuh')
      }

      const dupCheck = await client.query(
        "SELECT 1 FROM event_registrations WHERE activity_id=$1 AND guest_email=$2 AND status<>'cancelled'",
        [activity.id, dto.guestEmail.trim().toLowerCase()],
      )
      if (dupCheck.rowCount && dupCheck.rowCount > 0) {
        throw new ConflictException('Email ini sudah terdaftar pada kegiatan yang sama')
      }

      const prefix = await this.getPrefix()
      const now = new Date()
      const yy = String(now.getFullYear()).slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const ticketCode = `${prefix}-EVT-${yy}${mm}${dd}-${randomCode(4)}`

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_registrations
         (event_id, activity_id, customer_id, guest_name, guest_email, guest_phone, ticket_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'registered')
         RETURNING id`,
        [
          eventId,
          activity.id,
          customerId ?? null,
          dto.guestName.trim(),
          dto.guestEmail.trim().toLowerCase(),
          dto.guestPhone?.trim() ?? '',
          ticketCode,
        ],
      )

      return {
        id: inserted.rows[0].id,
        ticketCode,
        guestName: dto.guestName.trim(),
        guestEmail: dto.guestEmail.trim().toLowerCase(),
        activityTitle: activity.title,
        status: 'registered',
      }
    })
  }

  async getTicket(ticketCode: string) {
    const res = await this.db.query(
      `SELECT r.id, r.ticket_code AS "ticketCode", r.guest_name AS "guestName",
              r.guest_email AS "guestEmail", r.status, r.created_at AS "createdAt",
              e.title AS "eventTitle", e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.start_date::text AS "startDate",
              a.title AS "activityTitle", a.start_time AS "startTime", a.end_time AS "endTime"
       FROM event_registrations r
       JOIN community_events e ON e.id = r.event_id
       JOIN event_activities a ON a.id = r.activity_id
       WHERE upper(r.ticket_code) = upper($1)`,
      [ticketCode.trim()],
    )
    if (!res.rows[0]) throw new NotFoundException('Tiket event tidak ditemukan')
    return res.rows[0]
  }

  async listAdmin() {
    const res = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              e.created_at AS "createdAt",
              (SELECT count(*)::int FROM event_activities a WHERE a.event_id=e.id) AS "activityCount",
              (SELECT count(*)::int FROM event_registrations r WHERE r.event_id=e.id AND r.status<>'cancelled') AS "totalRegistered"
       FROM community_events e
       ORDER BY e.start_date DESC`,
    )
    return res.rows
  }

  async createEvent(dto: CreateEventDto) {
    const slugBase = dto.slug ? slugify(dto.slug) : slugify(dto.title)
    const slug = slugBase || `event-${Date.now()}`

    return this.db.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO community_events
         (slug, title, description, location_name, location_address, start_date, end_date, status, banner_media_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          slug,
          dto.title.trim(),
          dto.description?.trim() ?? '',
          dto.locationName.trim(),
          dto.locationAddress?.trim() ?? '',
          dto.startDate,
          dto.endDate,
          dto.status ?? 'published',
          dto.bannerMediaId ?? null,
        ],
      )
      const eventId = inserted.rows[0].id

      for (const act of dto.activities) {
        const coachName = act.isGuestCoach && act.guestCoachName
          ? act.guestCoachName.trim()
          : (act.coachName?.trim() || 'Instruktur Studio')
        await client.query(
          `INSERT INTO event_activities
           (event_id, title, category, coach_name, class_type_id, coach_id, is_guest_coach, guest_coach_name, start_time, end_time, capacity, price_idr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            eventId,
            act.title.trim(),
            act.category?.trim() ?? 'Komunitas',
            coachName,
            act.classTypeId || null,
            act.isGuestCoach ? null : (act.coachId || null),
            Boolean(act.isGuestCoach),
            act.isGuestCoach ? (act.guestCoachName?.trim() || null) : null,
            act.startTime.trim(),
            act.endTime.trim(),
            act.capacity,
            act.priceIdr ?? 0,
          ],
        )
      }

      return { id: eventId, slug }
    })
  }

  async updateEvent(id: string, dto: CreateEventDto) {
    return this.db.transaction(async (client) => {
      const probe = await client.query('SELECT id FROM community_events WHERE id=$1 FOR UPDATE', [id])
      if (!probe.rows[0]) throw new NotFoundException('Event tidak ditemukan')

      await client.query(
        `UPDATE community_events
         SET title=$1, description=$2, location_name=$3, location_address=$4,
             start_date=$5, end_date=$6, status=$7, banner_media_id=$8, updated_at=now()
         WHERE id=$9`,
        [
          dto.title.trim(),
          dto.description?.trim() ?? '',
          dto.locationName.trim(),
          dto.locationAddress?.trim() ?? '',
          dto.startDate,
          dto.endDate,
          dto.status ?? 'published',
          dto.bannerMediaId ?? null,
          id,
        ],
      )

      await client.query('DELETE FROM event_activities WHERE event_id=$1', [id])
      for (const act of dto.activities) {
        const coachName = act.isGuestCoach && act.guestCoachName
          ? act.guestCoachName.trim()
          : (act.coachName?.trim() || 'Instruktur Studio')
        await client.query(
          `INSERT INTO event_activities
           (event_id, title, category, coach_name, class_type_id, coach_id, is_guest_coach, guest_coach_name, start_time, end_time, capacity, price_idr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id,
            act.title.trim(),
            act.category?.trim() ?? 'Komunitas',
            coachName,
            act.classTypeId || null,
            act.isGuestCoach ? null : (act.coachId || null),
            Boolean(act.isGuestCoach),
            act.isGuestCoach ? (act.guestCoachName?.trim() || null) : null,
            act.startTime.trim(),
            act.endTime.trim(),
            act.capacity,
            act.priceIdr ?? 0,
          ],
        )
      }

      return { id }
    })
  }

  async deleteEvent(id: string) {
    const res = await this.db.query('DELETE FROM community_events WHERE id=$1', [id])
    if (!res.rowCount) throw new NotFoundException('Event tidak ditemukan')
    return { ok: true }
  }

  async listRegistrations(eventId: string) {
    const res = await this.db.query(
      `SELECT r.id, r.ticket_code AS "ticketCode", r.guest_name AS "guestName",
              r.guest_email AS "guestEmail", r.guest_phone AS "guestPhone",
              r.status, r.attended_at AS "attendedAt", r.created_at AS "createdAt",
              a.title AS "activityTitle", a.start_time AS "startTime", a.end_time AS "endTime"
       FROM event_registrations r
       JOIN event_activities a ON a.id = r.activity_id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId],
    )
    return res.rows
  }

  async checkIn(regId: string) {
    const res = await this.db.query(
      `UPDATE event_registrations
       SET status='attended', attended_at=now()
       WHERE id=$1 OR upper(ticket_code)=upper($1)
       RETURNING id, ticket_code AS "ticketCode", guest_name AS "guestName", status`,
      [regId.trim()],
    )
    if (!res.rows[0]) throw new NotFoundException('Registrasi peserta tidak ditemukan')
    return res.rows[0]
  }

  async listCoach(coachId: string) {
    const res = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl",
              a.id AS "activityId", a.title AS "activityTitle", a.category AS "activityCategory",
              a.start_time AS "startTime", a.end_time AS "endTime", a.capacity,
              (SELECT count(*)::int FROM event_registrations r WHERE r.activity_id=a.id AND r.status<>'cancelled') AS "registeredCount"
       FROM event_activities a
       JOIN community_events e ON e.id = a.event_id
       WHERE (a.coach_id = $1 OR lower(a.coach_name) = (SELECT lower(full_name) FROM app_users WHERE id = $1))
         AND e.status IN ('published', 'completed')
       ORDER BY e.start_date ASC, a.start_time ASC`,
      [coachId],
    )
    return res.rows
  }
}
