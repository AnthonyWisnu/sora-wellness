import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { hashPassword } from '../src/shared/security';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const existing = await pool.query('SELECT 1 FROM app_users WHERE role=$1 LIMIT 1', ['admin']);
    if (existing.rowCount) { process.stdout.write('Seed sudah ada; tidak diubah.\n'); return; }
    const adminPassword = randomBytes(18).toString('base64url');
    const coachPassword = randomBytes(18).toString('base64url');
    const adminHash = await hashPassword(adminPassword);
    const coachHash = await hashPassword(coachPassword);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO studio (id,name,slug,description,address,hero_title,hero_subtitle) VALUES (1,'Sora Wellness','sora-wellness','Ruang gerak dan pemulihan untuk setiap langkah.','Denpasar, Bali','Temukan ritmemu','Kelas yang terasa dekat dengan kebutuhanmu.')`);
      await client.query('INSERT INTO studio_policy (studio_id) VALUES (1)');
      await client.query(`INSERT INTO app_users (email,full_name,role,password_hash,password_change_required) VALUES ($1,'Admin Studio','admin',$2,true)`, [process.env.SEED_ADMIN_EMAIL ?? 'admin@sora.test', adminHash]);
      const coach = await client.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash,password_change_required) VALUES ($1,'Nadia Putri','coach',$2,true) RETURNING id`, ['nadia@sora.test', coachHash]);
      await client.query(`INSERT INTO package_options (duration_months,price_idr) VALUES (1,450000),(3,1200000),(6,2250000)`);
      const types = await client.query<{ id: string }>(`INSERT INTO class_types (title,category,level,description,duration_minutes,default_capacity,default_price_idr) VALUES ('Gentle Flow','Yoga','beginner','Gerak perlahan dan napas sadar.',60,12,75000),('Pilates Foundation','Pilates','beginner','Bangun kekuatan inti.',60,10,90000),('Power Flow','Yoga','intermediate_1','Rangkaian gerak dinamis.',60,10,100000),('Deep Practice','Yoga','intermediate_2','Latihan mendalam.',75,8,120000),('Open Studio','Komunitas','beginner','Kelas pengenalan gratis.',45,15,0) RETURNING id`);
      const prices = [75000, 90000, 100000, 120000, 0];
      for (let day = 1; day <= 25; day++) {
        for (let index = 0; index < types.rows.length; index++) {
          if (index > 1 && day % 2 === 0) continue;
          const hour = 7 + index * 2;
          await client.query(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT $1,$2,x.d,(x.d + make_time($3,0,0)) AT TIME ZONE st.timezone,((x.d + make_time($3,0,0)) AT TIME ZONE st.timezone) + interval '60 minutes',10,$4 FROM studio st CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE st.timezone)::date + $5::int AS d) x WHERE st.id=1`, [types.rows[index].id, coach.rows[0].id, hour, prices[index], day]);
        }
      }
      await client.query('COMMIT');
      process.stdout.write(`Admin: ${process.env.SEED_ADMIN_EMAIL ?? 'admin@sora.test'} / ${adminPassword}\nPelatih: nadia@sora.test / ${coachPassword}\nSimpan kredensial demo ini; hanya ditampilkan saat seed pertama.\n`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
