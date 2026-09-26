import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import supertest from 'supertest';
import { Pool } from 'pg';
import { hashPassword } from '../src/shared/security';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
  const password = 'SmokeKontenLoker123!';
  const userIds: string[] = [];
  const lockerIds: string[] = [];
  const mediaIds: string[] = [];
  let membershipId: string | null = null;
  let nextMembershipId: string | null = null;
  let otherMembershipId: string | null = null;
  await supertest(base).get('/api/v1/public/site').expect(200);
  const originalSite = (await pool.query('SELECT * FROM site_content WHERE studio_id=1')).rows[0];
  const originalSiteMedia = (await pool.query('SELECT kind,media_id FROM site_content_media WHERE studio_id=1')).rows;
  const originalContent = (await pool.query('SELECT name,description,address,hero_title,hero_subtitle,logo_media_id,hero_media_id FROM studio WHERE id=1')).rows[0];
  const originalGallery = (await pool.query<{ media_id: string }>('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position')).rows.map(row => row.media_id);
  const originalPolicy = (await pool.query<{ locker_enabled: boolean }>('SELECT locker_enabled FROM studio_policy WHERE studio_id=1')).rows[0].locker_enabled;
  try {
    async function actor(role: 'admin' | 'customer') {
      const email = `${role}-${randomUUID()}@example.test`;
      const found = await pool.query<{ id: string }>('INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [email,role==='admin' ? 'Admin Konten' : 'Member Loker',role,await hashPassword(password)]);
      const id = found.rows[0].id; userIds.push(id);
      if (role==='customer') await pool.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [id]);
      const agent = supertest.agent(base);
      const first = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
      await agent.post('/api/v1/auth/login').set('x-csrf-token',first).send({ email,password }).expect(200);
      const token = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
      return { id,agent,token };
    }
    const admin = await actor('admin');
    const member = await actor('customer');
    const other = await actor('customer');
    const nonmember = await actor('customer');
    membershipId = (await pool.query<{ id: string }>(`INSERT INTO memberships (customer_id,starts_on,ends_on)
      SELECT $1,(now() AT TIME ZONE timezone)::date-1,(now() AT TIME ZONE timezone)::date FROM studio WHERE id=1 RETURNING id`, [member.id])).rows[0].id;
    otherMembershipId = (await pool.query<{ id: string }>(`INSERT INTO memberships (customer_id,starts_on,ends_on)
      SELECT $1,(now() AT TIME ZONE timezone)::date-1,(now() AT TIME ZONE timezone)::date+2 FROM studio WHERE id=1 RETURNING id`, [other.id])).rows[0].id;

    const mediaList = await admin.agent.get('/api/v1/admin/media').expect(200);
    assert.ok(Array.isArray(mediaList.body));
    await nonmember.agent.get('/api/v1/admin/media').expect(403);
    await nonmember.agent.post('/api/v1/admin/media').set('x-csrf-token',nonmember.token).attach('file',Buffer.from('not an image'),{ filename:'fake.png', contentType:'image/png' }).expect(403);
    await admin.agent.post('/api/v1/admin/media').set('x-csrf-token',admin.token).attach('file',Buffer.from('not an image'),{ filename:'fake.png', contentType:'image/png' }).expect(400);
    const huge = await admin.agent.post('/api/v1/admin/media').set('x-csrf-token',admin.token).attach('file',Buffer.alloc(5*1024*1024+1),{ filename:'large.png', contentType:'image/png' });
    assert.ok(huge.status >= 400);
    const png = resolve('../frontend/public/images/hero-pilates.png');
    const uploaded = await admin.agent.post('/api/v1/admin/media').set('x-csrf-token',admin.token).attach('file',png).expect(201);
    const mediaId = uploaded.body.id as string; mediaIds.push(mediaId);
    assert.equal(uploaded.body.mimeType,'image/png');
    await admin.agent.get(`/api/v1/public/media/${mediaId}`).expect(200).expect('Content-Type',/image\/png/);
    const content = (await admin.agent.get('/api/v1/admin/content').expect(200)).body;
    const updated = { ...content, name: 'Studio Konten Uji', heroTitle: 'Judul baru untuk uji', logoMediaId: mediaId, heroMediaId: mediaId, galleryMediaIds: [mediaId] };
    await admin.agent.put('/api/v1/admin/content').set('x-csrf-token',admin.token).send(updated).expect(200);
    const publicStudio = (await nonmember.agent.get('/api/v1/public/studio').expect(200)).body;
    assert.equal(publicStudio.name,updated.name);
    assert.equal(publicStudio.logoUrl,`/api/v1/public/media/${mediaId}`);
    assert.equal(publicStudio.heroImageUrl,`/api/v1/public/media/${mediaId}`);
    assert.equal(publicStudio.gallery[0].id,mediaId);
    await admin.agent.delete(`/api/v1/admin/media/${mediaId}`).set('x-csrf-token',admin.token).expect(409);
    await admin.agent.put('/api/v1/admin/content').set('x-csrf-token',admin.token).send({ ...updated, logoMediaId: null, heroMediaId: null, galleryMediaIds: [] }).expect(200);
    await admin.agent.delete(`/api/v1/admin/media/${mediaId}`).set('x-csrf-token',admin.token).expect(200);
    mediaIds.pop();
    await nonmember.agent.get(`/api/v1/public/media/${mediaId}`).expect(404);

    await pool.query('UPDATE studio_policy SET locker_enabled=true WHERE studio_id=1');
    const firstLocker = (await admin.agent.post('/api/v1/admin/lockers').set('x-csrf-token',admin.token).send({ code: `T-${randomUUID().slice(0,8)}` }).expect(201)).body;
    lockerIds.push(firstLocker.id);
    await admin.agent.post('/api/v1/admin/lockers').set('x-csrf-token',admin.token).send({ code: firstLocker.code.toLowerCase() }).expect(409);
    const secondLocker = (await admin.agent.post('/api/v1/admin/lockers').set('x-csrf-token',admin.token).send({ code: `U-${randomUUID().slice(0,8)}` }).expect(201)).body;
    lockerIds.push(secondLocker.id);
    await nonmember.agent.get('/api/v1/me/locker').expect(200);
    await nonmember.agent.get('/api/v1/admin/lockers').expect(403);
    await admin.agent.put(`/api/v1/admin/lockers/${firstLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: nonmember.id }).expect(409);
    await admin.agent.put(`/api/v1/admin/lockers/${firstLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: member.id }).expect(200);
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,firstLocker.code);
    await admin.agent.put(`/api/v1/admin/lockers/${firstLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: other.id }).expect(409);
    await admin.agent.put(`/api/v1/admin/lockers/${secondLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: member.id }).expect(409);
    const eligible = (await admin.agent.get('/api/v1/admin/lockers/eligible-customers').expect(200)).body;
    assert.ok(eligible.some((row: { id: string }) => row.id===other.id));
    assert.ok(!eligible.some((row: { id: string }) => row.id===member.id));
    await pool.query('UPDATE studio_policy SET locker_enabled=false WHERE studio_id=1');
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,null);
    await admin.agent.put(`/api/v1/admin/lockers/${secondLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: other.id }).expect(409);
    await pool.query('UPDATE studio_policy SET locker_enabled=true WHERE studio_id=1');
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,firstLocker.code);

    await pool.query(`UPDATE memberships m SET ends_on=(now() AT TIME ZONE s.timezone)::date-1 FROM studio s WHERE m.id=$1 AND s.id=1`, [membershipId]);
    nextMembershipId = (await pool.query<{ id: string }>(`INSERT INTO memberships (customer_id,starts_on,ends_on)
      SELECT $1,(now() AT TIME ZONE timezone)::date,(now() AT TIME ZONE timezone)::date+7 FROM studio WHERE id=1 RETURNING id`, [member.id])).rows[0].id;
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,null);
    const old = await pool.query<{ released_at: Date | null }>('SELECT released_at FROM locker_assignments WHERE locker_id=$1 ORDER BY assigned_at DESC LIMIT 1', [firstLocker.id]);
    assert.ok(old.rows[0].released_at);
    await admin.agent.put(`/api/v1/admin/lockers/${firstLocker.id}/assignment`).set('x-csrf-token',admin.token).send({ customerId: member.id }).expect(200);
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,firstLocker.code);
    await admin.agent.delete(`/api/v1/admin/lockers/${firstLocker.id}/assignment`).set('x-csrf-token',admin.token).expect(200);
    assert.equal((await member.agent.get('/api/v1/me/locker').expect(200)).body.code,null);
    process.stdout.write('Content/lockers OK: akses admin, validasi media, galeri, hapus media, keanggotaan, eksklusivitas, dan pelepasan paket.\n');
  } finally {
    await pool.query('UPDATE site_content SET draft=$1,published=$2,draft_version=$3,published_version=$4,updated_at=$5,published_at=$6 WHERE studio_id=1', [originalSite.draft,originalSite.published,originalSite.draft_version,originalSite.published_version,originalSite.updated_at,originalSite.published_at]);
    await pool.query('DELETE FROM site_content_media WHERE studio_id=1');
    for (const item of originalSiteMedia) await pool.query('INSERT INTO site_content_media (studio_id,kind,media_id) VALUES (1,$1,$2)', [item.kind,item.media_id]);
    await pool.query('DELETE FROM site_publications WHERE published_by=ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM studio_gallery WHERE studio_id=1');
    await pool.query('UPDATE studio SET name=$1,description=$2,address=$3,hero_title=$4,hero_subtitle=$5,logo_media_id=$6,hero_media_id=$7 WHERE id=1', [originalContent.name,originalContent.description,originalContent.address,originalContent.hero_title,originalContent.hero_subtitle,originalContent.logo_media_id,originalContent.hero_media_id]);
    for (let index=0; index<originalGallery.length; index++) await pool.query('INSERT INTO studio_gallery (studio_id,media_id,position) VALUES (1,$1,$2)', [originalGallery[index],index]);
    await pool.query('UPDATE studio_policy SET locker_enabled=$1 WHERE studio_id=1', [originalPolicy]);
    await pool.query('DELETE FROM locker_assignments WHERE locker_id=ANY($1::uuid[])', [lockerIds]);
    await pool.query('DELETE FROM lockers WHERE id=ANY($1::uuid[])', [lockerIds]);
    for (const id of [nextMembershipId,membershipId,otherMembershipId].filter(Boolean)) await pool.query('DELETE FROM memberships WHERE id=$1', [id]);
    for (const id of mediaIds) {
      const file = (await pool.query<{ storage_path: string }>('DELETE FROM media_assets WHERE id=$1 RETURNING storage_path', [id])).rows[0];
      if (file) {
        const { unlink } = await import('node:fs/promises');
        await unlink(resolve('uploads',file.storage_path)).catch(() => undefined);
      }
    }
    await pool.query('DELETE FROM wallet_accounts WHERE customer_id=ANY($1::uuid[])', [userIds]);
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=ANY($1::text[])`, [userIds]);
    await pool.query('DELETE FROM app_users WHERE id=ANY($1::uuid[])', [userIds]);
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
