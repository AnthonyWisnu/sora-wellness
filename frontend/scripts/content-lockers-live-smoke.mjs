import { chromium } from 'playwright-core'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url))
backendRequire('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true })
backendRequire('ts-node/register/transpile-only')
const { hashPassword } = backendRequire('./src/shared/security.ts')
const { Pool } = backendRequire('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const suffix = randomBytes(5).toString('hex')
const adminEmail = `content-ui-${suffix}@example.test`
const memberEmail = `locker-ui-${suffix}@example.test`
const password = 'KontenLokerUI123!'
await backendRequire('supertest')('http://127.0.0.1:3000').get('/api/v1/public/site').expect(200)
const originalSite = (await pool.query('SELECT * FROM site_content WHERE studio_id=1')).rows[0]
const originalSiteMedia = (await pool.query('SELECT kind,media_id FROM site_content_media WHERE studio_id=1')).rows
const original = (await pool.query('SELECT name,description,address,hero_title,hero_subtitle,logo_media_id,hero_media_id FROM studio WHERE id=1')).rows[0]
const gallery = (await pool.query('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position')).rows.map(row => row.media_id)
const enabled = (await pool.query('SELECT locker_enabled FROM studio_policy WHERE studio_id=1')).rows[0].locker_enabled
let adminId
let memberId
let membershipId
let lockerId
let mediaId
try {
  adminId = (await pool.query(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Admin Konten UI','admin',$2) RETURNING id`, [adminEmail,await hashPassword(password)])).rows[0].id
  memberId = (await pool.query(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Member Loker UI','customer',$2) RETURNING id`, [memberEmail,await hashPassword(password)])).rows[0].id
  await pool.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [memberId])
  membershipId = (await pool.query(`INSERT INTO memberships (customer_id,starts_on,ends_on) SELECT $1,(now() AT TIME ZONE timezone)::date,(now() AT TIME ZONE timezone)::date+7 FROM studio WHERE id=1 RETURNING id`, [memberId])).rows[0].id
  await pool.query('UPDATE studio_policy SET locker_enabled=true WHERE studio_id=1')

  const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  admin.on('dialog', dialog => void dialog.accept())
  await admin.goto('http://127.0.0.1:5173/masuk')
  await admin.getByLabel('Email').fill(adminEmail)
  await admin.getByLabel('Kata sandi').fill(password)
  await admin.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await admin.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  await admin.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Konten publik' }).click()
  await admin.getByRole('heading', { name: 'Kelola konten situs' }).waitFor()
  await admin.getByRole('button', { name: 'Pustaka gambar' }).click()
  await admin.locator('input[type=file]').setInputFiles(fileURLToPath(new URL('../public/images/hero-pilates.png', import.meta.url)))
  await admin.getByText('Gambar diunggah. Pilih pemakaiannya dalam draf.').waitFor()
  mediaId = (await pool.query('SELECT id FROM media_assets WHERE uploaded_by=$1 ORDER BY created_at DESC LIMIT 1', [adminId])).rows[0].id
  await admin.getByRole('button', { name: 'Profil & galeri' }).click()
  await admin.getByLabel('Nama studio').fill(`Studio UI ${suffix}`)
  await admin.getByLabel('Alamat').fill('Jalan Uji No. 10, Denpasar')
  await admin.getByLabel('Logo').selectOption(mediaId)
  await admin.getByLabel('Foto utama').selectOption(mediaId)
  await admin.locator('fieldset').getByRole('checkbox').last().check()
  await admin.getByRole('button', { name: 'Halaman', exact: true }).click()
  await admin.locator('.site-section-panel').first().locator('summary').click()
  await admin.locator('.site-section-panel').first().getByLabel('Judul bagian').fill('Ruang gerak baru')
  await admin.getByRole('button', { name: 'Simpan draf' }).click()
  await admin.getByText('Draf belum terbit').waitFor()
  const previewPromise = admin.context().waitForEvent('page')
  await admin.getByRole('button', { name: 'Pratinjau draf' }).click()
  const preview = await previewPromise
  await preview.getByText('PRATINJAU DRAF — hanya admin yang dapat melihat halaman ini').waitFor()
  await preview.getByRole('heading', { name: 'Ruang gerak baru' }).waitFor()
  await preview.close()
  await admin.getByRole('button', { name: 'Terbitkan situs' }).click()
  await admin.getByText('Semua perubahan sudah terbit').waitFor()
  await admin.screenshot({ path: '.qa/site-cms-admin-desktop.png' })
  await admin.setViewportSize({ width: 390, height: 844 })
  await admin.screenshot({ path: '.qa/site-cms-admin-mobile.png' })
  await admin.setViewportSize({ width: 1440, height: 900 })
  await admin.getByRole('link', { name: 'Lihat situs publik' }).click()
  await admin.getByRole('heading', { name: 'Ruang gerak baru' }).waitFor()
  await admin.locator('.wordmark-logo').waitFor()
  await admin.locator('.zeira-gallery-grid img').first().waitFor()
  const heroSrc = await admin.locator('.zeira-hero-image').getAttribute('src')
  if (!heroSrc?.includes(mediaId)) throw new Error('Foto utama tidak tampil di beranda')
  await admin.evaluate(() => window.scrollTo(0,0))
  await admin.screenshot({ path: '.qa/live-content-public-desktop.png' })
  await admin.locator('.zeira-gallery').scrollIntoViewIfNeeded()
  await admin.screenshot({ path: '.qa/live-content-gallery-desktop.png' })

  await admin.getByRole('button', { name: 'Dashboard' }).first().click()
  await admin.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Loker', exact: true }).click()
  await admin.getByLabel('Nomor atau kode').fill(`Z-${suffix}`)
  await admin.getByRole('button', { name: 'Tambah loker' }).click()
  await admin.locator('.admin-record').filter({ hasText: `Z-${suffix}` }).waitFor()
  lockerId = (await pool.query('SELECT id FROM lockers WHERE code=$1', [`Z-${suffix}`.toUpperCase()])).rows[0].id
  await admin.locator('.admin-record').filter({ hasText: `Z-${suffix}` }).getByRole('button', { name: 'Tetapkan' }).click()
  await admin.getByLabel('Cari member aktif').fill(memberEmail)
  await admin.getByRole('button', { name: 'Cari member' }).click()
  await admin.getByLabel('Pelanggan').selectOption(memberId)
  await admin.locator('form').filter({ hasText: 'Tetapkan loker' }).getByRole('button', { name: 'Tetapkan', exact: true }).click()
  await admin.locator('.admin-record').filter({ hasText: `Z-${suffix}` }).getByText('Member Loker UI').waitFor()
  await admin.screenshot({ path: '.qa/live-lockers-admin-desktop.png' })
  await admin.setViewportSize({ width: 390, height: 844 })
  await admin.screenshot({ path: '.qa/live-lockers-admin-mobile.png' })

  const member = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await member.goto('http://127.0.0.1:5173/masuk')
  await member.getByLabel('Email').fill(memberEmail)
  await member.getByLabel('Kata sandi').fill(password)
  await member.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await member.getByRole('button', { name: 'Buka menu dashboard' }).click()
  await member.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Saldo & loker' }).click()
  await member.locator('.studio-my-locker').getByRole('heading', { name: `Z-${suffix}`.toUpperCase() }).waitFor()
  await member.locator('.studio-my-locker').scrollIntoViewIfNeeded()
  await member.screenshot({ path: '.qa/live-locker-member-mobile.png' })
  console.log('Live content/locker UI OK: upload, editor, beranda, penetapan, dan tampilan member.')
} finally {
  await browser.close()
  await pool.query('UPDATE site_content SET draft=$1,published=$2,draft_version=$3,published_version=$4,updated_at=$5,published_at=$6 WHERE studio_id=1', [originalSite.draft,originalSite.published,originalSite.draft_version,originalSite.published_version,originalSite.updated_at,originalSite.published_at])
  await pool.query('DELETE FROM site_content_media WHERE studio_id=1')
  for (const item of originalSiteMedia) await pool.query('INSERT INTO site_content_media (studio_id,kind,media_id) VALUES (1,$1,$2)', [item.kind,item.media_id])
  if (adminId) await pool.query('DELETE FROM site_publications WHERE published_by=$1', [adminId])
  await pool.query('DELETE FROM studio_gallery WHERE studio_id=1')
  await pool.query('UPDATE studio SET name=$1,description=$2,address=$3,hero_title=$4,hero_subtitle=$5,logo_media_id=$6,hero_media_id=$7 WHERE id=1', [original.name,original.description,original.address,original.hero_title,original.hero_subtitle,original.logo_media_id,original.hero_media_id])
  for (let index=0; index<gallery.length; index++) await pool.query('INSERT INTO studio_gallery (studio_id,media_id,position) VALUES (1,$1,$2)', [gallery[index],index])
  await pool.query('UPDATE studio_policy SET locker_enabled=$1 WHERE studio_id=1', [enabled])
  if (lockerId) { await pool.query('DELETE FROM locker_assignments WHERE locker_id=$1', [lockerId]); await pool.query('DELETE FROM lockers WHERE id=$1', [lockerId]) }
  if (membershipId) await pool.query('DELETE FROM memberships WHERE id=$1', [membershipId])
  if (mediaId) {
    const file = (await pool.query('DELETE FROM media_assets WHERE id=$1 RETURNING storage_path', [mediaId])).rows[0]
    if (file) { const { unlink } = await import('node:fs/promises'); const { resolve } = await import('node:path'); await unlink(resolve(fileURLToPath(new URL('../../backend/uploads', import.meta.url)),file.storage_path)).catch(() => undefined) }
  }
  if (memberId) await pool.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [memberId])
  for (const id of [memberId,adminId].filter(Boolean)) { await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id]); await pool.query('DELETE FROM app_users WHERE id=$1', [id]) }
  await pool.end()
}
