import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import supertest from 'supertest';
import { hashPassword } from '../src/shared/security';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
  const agent = supertest.agent(base);
  const password = 'SiteCmsSmoke123!';
  const email = `site-cms-${randomUUID()}@example.test`;
  let adminId = '';
  let uploadedMediaId = '';
  await agent.get('/api/v1/public/site').expect(200);
  const before = (await pool.query('SELECT * FROM site_content WHERE studio_id=1')).rows[0];
  const studio = (await pool.query('SELECT name,description,address,hero_title,hero_subtitle,logo_media_id,hero_media_id FROM studio WHERE id=1')).rows[0];
  const gallery = (await pool.query('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position')).rows.map(row => row.media_id);
  const media = (await pool.query('SELECT kind,media_id FROM site_content_media WHERE studio_id=1')).rows;
  try {
    adminId = (await pool.query<{ id: string }>('INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [email,'Admin CMS Smoke','admin',await hashPassword(password)])).rows[0].id;
    const loginToken = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
    await agent.post('/api/v1/auth/login').set('x-csrf-token',loginToken).send({ email,password }).expect(200);
    const csrf = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
    const state = (await agent.get('/api/v1/admin/site').expect(200)).body;
    const originalHero = state.document.pages.home.find((section: {type:string}) => section.type==='hero').title;
    const document = structuredClone(state.document);
    uploadedMediaId = (await agent.post('/api/v1/admin/media').set('x-csrf-token',csrf).attach('file',resolve('../frontend/public/images/hero-pilates.png')).expect(201)).body.id;
    document.profile.logoMediaId = uploadedMediaId;
    const changedTitle = `CMS smoke ${randomUUID().slice(0,8)}`;
    document.pages.home.find((section: {type:string}) => section.type==='hero').title = changedTitle;
    document.contact.phone = '+620000000000';
    document.contact.email = 'studio@example.test';
    document.contact.mapEmbedUrl = 'https://www.google.com/maps/embed?pb=test';
    document.contact.socialLinks = [{ label: 'Instagram', url: 'https://www.instagram.com/studio-uji' }];
    document.footer.tagline = 'Footer dari CMS';
    document.pages.home.find((section: {type:string}) => section.type==='testimonials').items.push({ title: 'Pelanggan Uji', body: 'Kelas terasa nyaman.', caption: 'Peserta', mediaId: null });
    document.pages.home.find((section: {type:string}) => section.type==='faq').items.push({ title: 'Kapan kelas dimulai?', body: 'Lihat halaman jadwal.', caption: '', mediaId: null });
    const saved = (await agent.put('/api/v1/admin/site').set('x-csrf-token',csrf).send({ expectedVersion: state.draftVersion, document }).expect(200)).body;
    assert.equal(saved.draftVersion,state.draftVersion+1);
    await agent.delete(`/api/v1/admin/media/${uploadedMediaId}`).set('x-csrf-token',csrf).expect(409);
    assert.equal((await agent.get('/api/v1/public/site').expect(200)).body.pages.home.find((section: {type:string}) => section.type==='hero').title,originalHero);
    assert.equal((await agent.get('/api/v1/admin/site/preview').expect(200)).body.pages.home.find((section: {type:string}) => section.type==='hero').title,changedTitle);
    await agent.put('/api/v1/admin/site').set('x-csrf-token',csrf).send({ expectedVersion: state.draftVersion, document }).expect(409);
    const invalid = structuredClone(document); invalid.contact.mapEmbedUrl='https://example.com/fake';
    await agent.put('/api/v1/admin/site').set('x-csrf-token',csrf).send({ expectedVersion: saved.draftVersion, document: invalid }).expect(400);
    await agent.post('/api/v1/admin/site/publish').set('x-csrf-token',csrf).send({ expectedVersion: saved.draftVersion }).expect(201);
    await agent.delete(`/api/v1/admin/media/${uploadedMediaId}`).set('x-csrf-token',csrf).expect(409);
    const publicSite = (await agent.get('/api/v1/public/site').expect(200)).body;
    assert.equal(publicSite.pages.home.find((section: {type:string}) => section.type==='hero').title,changedTitle);
    assert.equal(publicSite.pages.home.find((section: {type:string}) => section.type==='testimonials').items[0].body,'Kelas terasa nyaman.');
    assert.equal(publicSite.pages.home.find((section: {type:string}) => section.type==='faq').items[0].title,'Kapan kelas dimulai?');
    assert.equal(publicSite.contact.mapEmbedUrl,document.contact.mapEmbedUrl);
    assert.equal(publicSite.footer.tagline,'Footer dari CMS');
    assert.equal((await agent.get('/api/v1/public/studio').expect(200)).body.heroTitle,changedTitle);
    process.stdout.write('Site CMS OK: draf privat, pratinjau, konflik versi, URL peta, proteksi gambar, dan publikasi.\n');
  } finally {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (adminId) await client.query('DELETE FROM site_publications WHERE studio_id=1 AND published_by=$1', [adminId]);
      await client.query('UPDATE site_content SET draft=$1,published=$2,draft_version=$3,published_version=$4,updated_at=$5,published_at=$6 WHERE studio_id=1', [before.draft,before.published,before.draft_version,before.published_version,before.updated_at,before.published_at]);
      await client.query('DELETE FROM site_content_media WHERE studio_id=1');
      for (const item of media) await client.query('INSERT INTO site_content_media (studio_id,kind,media_id) VALUES (1,$1,$2)', [item.kind,item.media_id]);
      await client.query('DELETE FROM studio_gallery WHERE studio_id=1');
      await client.query('UPDATE studio SET name=$1,description=$2,address=$3,hero_title=$4,hero_subtitle=$5,logo_media_id=$6,hero_media_id=$7 WHERE id=1', [studio.name,studio.description,studio.address,studio.hero_title,studio.hero_subtitle,studio.logo_media_id,studio.hero_media_id]);
      for (let position=0; position<gallery.length; position++) await client.query('INSERT INTO studio_gallery (studio_id,media_id,position) VALUES (1,$1,$2)', [gallery[position],position]);
      let mediaPath = '';
      if (uploadedMediaId) mediaPath = (await client.query<{ storage_path: string }>('DELETE FROM media_assets WHERE id=$1 RETURNING storage_path', [uploadedMediaId])).rows[0]?.storage_path ?? '';
      if (adminId) {
        await client.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [adminId]);
        await client.query('DELETE FROM app_users WHERE id=$1', [adminId]);
      }
      await client.query('COMMIT');
      if (mediaPath) await unlink(resolve('uploads',mediaPath)).catch(() => undefined);
    } catch (error) { await client.query('ROLLBACK'); console.error('Gagal memulihkan fixture CMS:', error); process.exitCode = 1; }
    finally { client.release(); await pool.end(); }
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
