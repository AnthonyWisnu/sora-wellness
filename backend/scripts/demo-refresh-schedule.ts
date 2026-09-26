import { Pool } from 'pg';

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL belum diatur');
  const url = new URL(raw);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port !== '55432' || process.env.NODE_ENV === 'production') throw new Error('Jadwal demo hanya boleh diperbarui pada database lokal');
  const pool = new Pool({ connectionString: raw });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const marker = await client.query("SELECT 1 FROM app_users WHERE email='admin@sora.example.test' AND role='admin'");
    if (!marker.rowCount) throw new Error('Dataset Sora demo tidak ditemukan');
    const updated = await client.query(`UPDATE schedule_rules r SET ends_on=(now() AT TIME ZONE st.timezone)::date+45
      FROM studio st WHERE st.id=1 AND r.ends_on<(now() AT TIME ZONE st.timezone)::date+45`);
    const added = await client.query(`INSERT INTO class_sessions (class_type_id,schedule_rule_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
      SELECT r.class_type_id,r.id,r.coach_id,d::date,
        (d::date+r.local_start_time) AT TIME ZONE st.timezone,
        ((d::date+r.local_start_time) AT TIME ZONE st.timezone)+t.duration_minutes*interval '1 minute',
        r.capacity,r.price_idr
      FROM schedule_rules r JOIN class_types t ON t.id=r.class_type_id CROSS JOIN studio st
      CROSS JOIN LATERAL generate_series((now() AT TIME ZONE st.timezone)::date,(now() AT TIME ZONE st.timezone)::date+45,interval '1 day') d
      WHERE st.id=1 AND r.active AND d::date>=r.starts_on AND d::date<=r.ends_on AND extract(isodow FROM d)=r.iso_weekday
      ON CONFLICT (schedule_rule_id,local_date) DO NOTHING`);
    await client.query('COMMIT');
    process.stdout.write(`Aturan diperpanjang: ${updated.rowCount}; sesi baru: ${added.rowCount}.\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
