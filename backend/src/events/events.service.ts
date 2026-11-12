import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { Db } from '../shared/db'
import type { CreateEventDto, RegisterEventDto } from './events.dto'
import { saveEventActivities, validateEventSchedule } from './event-activities'
import { EventCheckoutService } from './event-checkout.service'

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
  constructor(private readonly db: Db, private readonly checkout: EventCheckoutService) {}

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
              e.location_address AS "locationAddress", e.location_maps_url AS "locationMapsUrl",
              e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl",
              (SELECT count(*)::int FROM event_activities a WHERE a.event_id=e.id) AS "activityCount",
              (SELECT count(*)::int FROM event_registrations r WHERE r.event_id=e.id AND (r.status IN ('registered','attended') OR r.status='pending_payment' AND r.hold_expires_at>now())) AS "totalRegistered"
       FROM community_events e
       WHERE e.status = 'published' AND e.end_date >= (now() AT TIME ZONE (SELECT timezone FROM studio WHERE id=1))::date
       ORDER BY e.start_date ASC`,
    )
    return res.rows
  }

  async getPublic(slug: string, includeDraft = false) {
    const eventRes = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.location_maps_url AS "locationMapsUrl",
              e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl"
       FROM community_events e
       WHERE e.slug = $1 AND ($2::boolean OR e.status='published')`,
      [slug, includeDraft],
    )
    if (!eventRes.rows[0]) throw new NotFoundException('Event komunitas tidak ditemukan')
    const event = eventRes.rows[0]

    const activitiesRes = await this.db.query(
      `SELECT a.id, a.title, a.category, a.coach_name AS "coachName",
              a.class_type_id AS "classTypeId", a.coach_id AS "coachId",
              a.is_guest_coach AS "isGuestCoach", a.guest_coach_name AS "guestCoachName",
              a.local_date::text AS "localDate", a.start_time AS "startTime", a.end_time AS "endTime", a.capacity,
              a.price_idr AS "priceIdr",
              a.capacity - (SELECT count(*)::int FROM event_registrations r WHERE r.activity_id=a.id AND (r.status IN ('registered','attended') OR r.status='pending_payment' AND r.hold_expires_at>now())) AS "seatsLeft"
       FROM event_activities a
       WHERE a.event_id = $1
       ORDER BY a.local_date ASC,a.start_time ASC`,
      [event.id],
    )

    return { ...event, activities: activitiesRes.rows }
  }

  async register(slug: string, dto: RegisterEventDto, customerId?: string) {
    return this.db.transaction(async (client) => {
      const eventRes = await client.query<{ id: string; status: string; ended: boolean }>(
        `SELECT e.id,e.status,e.end_date<(now() AT TIME ZONE s.timezone)::date AS ended
         FROM community_events e CROSS JOIN studio s WHERE e.slug=$1 AND s.id=1 FOR SHARE OF e`,
        [slug],
      )
      if (!eventRes.rows[0] || eventRes.rows[0].status !== 'published' || eventRes.rows[0].ended) {
        throw new NotFoundException('Event tidak aktif atau tidak ditemukan')
      }
      const eventId = eventRes.rows[0].id

      const actRes = await client.query<{ id: string; capacity: number; title: string; price_idr: number; open: boolean }>(
        `SELECT a.id,a.capacity,a.title,a.price_idr, ((a.local_date+a.start_time::time) AT TIME ZONE s.timezone)>now() AS open FROM event_activities a CROSS JOIN studio s WHERE a.id=$1 AND a.event_id=$2 AND s.id=1 FOR UPDATE OF a`,
        [dto.activityId, eventId],
      )
      if (!actRes.rows[0]) throw new NotFoundException('Sesi kegiatan event tidak ditemukan')
      const activity = actRes.rows[0]
      if (!activity.open) throw new ConflictException('Pendaftaran kegiatan telah ditutup')
      if (activity.price_idr > 0) throw new BadRequestException('Masuk ke akun pelanggan untuk membayar kegiatan ini')

      const regCountRes = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM event_registrations WHERE activity_id=$1 AND (status IN ('registered','attended') OR status='pending_payment' AND hold_expires_at>now())",
        [activity.id],
      )
      if (regCountRes.rows[0].count >= activity.capacity) {
        throw new BadRequestException('Kapasitas untuk kegiatan ini sudah penuh')
      }

      const dupCheck = await client.query(
        "SELECT 1 FROM event_registrations WHERE activity_id=$1 AND guest_email=$2 AND (status IN ('registered','attended') OR status='pending_payment' AND hold_expires_at>now())",
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

      const inserted = await client.query<{ id: string; access_token: string }>(
        `INSERT INTO event_registrations
         (event_id, activity_id, customer_id, guest_name, guest_email, guest_phone, ticket_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'registered')
         RETURNING id,access_token`,
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
        ticketAccessToken: inserted.rows[0].access_token,
        guestName: dto.guestName.trim(),
        guestEmail: dto.guestEmail.trim().toLowerCase(),
        activityTitle: activity.title,
        status: 'registered',
      }
    })
  }

  async getTicket(accessToken: string) {
    if (!/^[a-f0-9]{64}$/.test(accessToken)) throw new NotFoundException('Tiket event tidak ditemukan')
    const res = await this.db.query(
      `SELECT r.id, r.ticket_code AS "ticketCode", r.guest_name AS "guestName",
              r.status, r.created_at AS "createdAt",
              e.title AS "eventTitle", e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.location_maps_url AS "locationMapsUrl",
              e.start_date::text AS "startDate", a.local_date::text AS "localDate",
              a.title AS "activityTitle", a.start_time AS "startTime", a.end_time AS "endTime"
       FROM event_registrations r
       JOIN community_events e ON e.id = r.event_id
       JOIN event_activities a ON a.id = r.activity_id
       WHERE r.access_token=$1 AND r.status IN ('registered','attended')`,
      [accessToken],
    )
    if (!res.rows[0]) throw new NotFoundException('Tiket event tidak ditemukan')
    return res.rows[0]
  }

  async listAdmin() {
    const res = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.location_maps_url AS "locationMapsUrl",
              e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              e.created_at AS "createdAt",
              (SELECT count(*)::int FROM event_activities a WHERE a.event_id=e.id) AS "activityCount",
              (SELECT count(*)::int FROM event_registrations r WHERE r.event_id=e.id AND (r.status IN ('registered','attended') OR r.status='pending_payment' AND r.hold_expires_at>now())) AS "totalRegistered"
       FROM community_events e
       ORDER BY e.start_date DESC`,
    )
    return res.rows
  }

  async createEvent(dto: CreateEventDto) {
    validateEventSchedule(dto)
    const slugBase = dto.slug ? slugify(dto.slug) : slugify(dto.title)
    const slug = slugBase || `event-${Date.now()}`

    return this.db.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO community_events
         (slug, title, description, location_name, location_address, location_maps_url, start_date, end_date, status, banner_media_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          slug,
          dto.title.trim(),
          dto.description?.trim() ?? '',
          dto.locationName.trim(),
          dto.locationAddress?.trim() ?? '',
          dto.locationMapsUrl?.trim() ?? '',
          dto.startDate,
          dto.endDate,
          dto.status ?? 'published',
          dto.bannerMediaId ?? null,
        ],
      )
      const eventId = inserted.rows[0].id

      await saveEventActivities(client, eventId, dto.activities, dto.startDate === dto.endDate ? dto.startDate : undefined)

      return { id: eventId, slug }
    })
  }

  async updateEvent(id: string, dto: CreateEventDto) {
    validateEventSchedule(dto)
    return this.db.transaction(async (client) => {
      const probe = await client.query<{ id: string; start_date: string; end_date: string }>('SELECT id,start_date::text,end_date::text FROM community_events WHERE id=$1 FOR UPDATE', [id])
      if (!probe.rows[0]) throw new NotFoundException('Event tidak ditemukan')

      const registered = await client.query('SELECT 1 FROM event_registrations WHERE event_id=$1 LIMIT 1', [id])
      if (registered.rowCount && (probe.rows[0].start_date !== dto.startDate || probe.rows[0].end_date !== dto.endDate)) {
        throw new ConflictException('Tanggal event yang memiliki peserta tidak dapat diubah')
      }

      await client.query(
        `UPDATE community_events
         SET title=$1, description=$2, location_name=$3, location_address=$4, location_maps_url=$5,
             start_date=$6, end_date=$7, status=$8, banner_media_id=$9, updated_at=now()
         WHERE id=$10`,
        [
          dto.title.trim(),
          dto.description?.trim() ?? '',
          dto.locationName.trim(),
          dto.locationAddress?.trim() ?? '',
          dto.locationMapsUrl?.trim() ?? '',
          dto.startDate,
          dto.endDate,
          dto.status ?? 'published',
          dto.bannerMediaId ?? null,
          id,
        ],
      )

      await saveEventActivities(client, id, dto.activities, dto.startDate === dto.endDate ? dto.startDate : undefined)

      if (dto.status === 'cancelled') await this.checkout.refundCancelled(client,id)

      return { id }
    })
  }

  async deleteEvent(id: string) {
    return this.db.transaction(async client => {
      const event = await client.query('SELECT id FROM community_events WHERE id=$1 FOR UPDATE', [id])
      if (!event.rowCount) throw new NotFoundException('Event tidak ditemukan')
      const registered = await client.query('SELECT 1 FROM event_registrations WHERE event_id=$1 LIMIT 1', [id])
      if (registered.rowCount) throw new ConflictException('Event dengan riwayat peserta tidak dapat dihapus')
      await client.query('DELETE FROM community_events WHERE id=$1', [id])
      return { ok: true }
    })
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
       SET status='attended', attended_at=COALESCE(attended_at,now())
       WHERE (id::text=$1 OR upper(ticket_code)=upper($1::text)) AND status IN ('registered','attended')
       RETURNING id, ticket_code AS "ticketCode", guest_name AS "guestName", status`,
      [regId.trim()],
    )
    if (!res.rows[0]) throw new NotFoundException('Registrasi peserta tidak ditemukan')
    return res.rows[0]
  }

  async listCoach(coachId: string) {
    const res = await this.db.query(
      `SELECT e.id, e.slug, e.title, e.description, e.location_name AS "locationName",
              e.location_address AS "locationAddress", e.location_maps_url AS "locationMapsUrl",
              e.start_date::text AS "startDate",
              e.end_date::text AS "endDate", e.status, e.banner_media_id AS "bannerMediaId",
              CASE WHEN e.banner_media_id IS NOT NULL THEN '/api/v1/public/media/' || e.banner_media_id ELSE NULL END AS "bannerUrl",
              a.id AS "activityId", a.title AS "activityTitle", a.category AS "activityCategory",
              a.local_date::text AS "localDate", a.start_time AS "startTime", a.end_time AS "endTime", a.capacity,
              (SELECT count(*)::int FROM event_registrations r WHERE r.activity_id=a.id AND (r.status IN ('registered','attended') OR r.status='pending_payment' AND r.hold_expires_at>now())) AS "registeredCount"
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
