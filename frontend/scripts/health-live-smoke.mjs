import { chromium } from 'playwright-core'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const customerPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
const baseURL = 'http://127.0.0.1:5173'
const email = `health-ui-${randomBytes(6).toString('hex')}@example.test`
const coachEmail = `coach-ui-${randomBytes(6).toString('hex')}@example.test`
const adminEmail = `admin-health-ui-${randomBytes(6).toString('hex')}@example.test`
const password = 'KataSandiKesehatan123!'
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url))
backendRequire('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true })
backendRequire('ts-node/register/transpile-only')
const { hashPassword } = backendRequire('./src/shared/security.ts')
const { Pool } = backendRequire('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
let coachId
let adminId
let sessionId
let customerId

try {
  await customerPage.goto(`${baseURL}/masuk`)
  await customerPage.getByRole('button', { name: 'Belum punya akun? Daftar di sini' }).click()
  await customerPage.getByLabel('Nama lengkap').fill('Pelanggan Awal')
  await customerPage.getByLabel('Email').fill(email)
  await customerPage.getByLabel('Kata sandi').fill(password)
  await customerPage.getByRole('button', { name: /Daftar dan masuk/ }).click()
  await customerPage.getByRole('button', { name: 'Buka menu dashboard' }).click()
  await customerPage.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Profil & kesehatan' }).click()
  await customerPage.getByRole('heading', { name: 'Profil & kesehatan', level: 1 }).waitFor()
  const customer = await pool.query('SELECT id FROM app_users WHERE email=$1', [email])
  customerId = customer.rows[0].id
  await customerPage.getByLabel('Nama lengkap').fill('Pelanggan Sehat')
  await customerPage.getByRole('button', { name: /Simpan profil/ }).click()
  await customerPage.getByText('Nama profil diperbarui.').waitFor()
  await customerPage.getByLabel('Catatan untuk pelatih').fill('Riwayat patah tulang kaki')
  await customerPage.getByRole('checkbox', { name: /Saya setuju catatan/ }).check()
  await customerPage.getByRole('button', { name: 'Simpan catatan' }).click()
  await customerPage.getByRole('button', { name: /Hapus semua data kesehatan/ }).waitFor()
  await pool.query("UPDATE health_profile_revisions SET recorded_at=now()-interval '2 hours' WHERE customer_id=$1", [customerId])
  const coach = await pool.query(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Pelatih UI','coach',$2) RETURNING id`, [coachEmail,await hashPassword(password)])
  coachId = coach.rows[0].id
  const created = await pool.query(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT t.id,$1,((now()-interval '1 hour') AT TIME ZONE st.timezone)::date,now()-interval '1 hour',now()-interval '30 minutes',5,0 FROM class_types t JOIN studio st ON st.id=1 WHERE t.level='beginner' LIMIT 1 RETURNING id,local_date::text AS local_date`, [coachId])
  sessionId = created.rows[0].id
  const localDate = created.rows[0].local_date
  await pool.query(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at) VALUES ($1,$2,'confirmed','free',0,$3,now())`, [customerId,sessionId,`health-ui-${randomBytes(8).toString('hex')}`])
  const coachPage = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  await coachPage.goto(`${baseURL}/masuk`)
  await coachPage.getByLabel('Email').fill(coachEmail)
  await coachPage.getByLabel('Kata sandi').fill(password)
  await coachPage.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await coachPage.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Peserta & absensi' }).click()
  await coachPage.getByRole('heading', { name: 'Kelas yang Anda ajar' }).waitFor()
  await coachPage.getByLabel('Cari kelas pada tanggal tertentu').fill(localDate)
  await coachPage.locator('.live-coach-session').first().click()
  await coachPage.getByText('Riwayat patah tulang kaki').waitFor()
  await coachPage.getByRole('button', { name: 'Hadir', exact: true }).click()
  await coachPage.locator('.live-attendance-actions span').getByText('Hadir', { exact: true }).waitFor()
  await coachPage.screenshot({ path: '.qa/live-coach-desktop.png', fullPage: true })
  const admin = await pool.query(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Admin UI','admin',$2) RETURNING id`, [adminEmail,await hashPassword(password)])
  adminId = admin.rows[0].id
  const adminPage = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  await adminPage.goto(`${baseURL}/masuk`)
  await adminPage.getByLabel('Email').fill(adminEmail)
  await adminPage.getByLabel('Kata sandi').fill(password)
  await adminPage.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await adminPage.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Absensi' }).click()
  await adminPage.getByLabel('Tanggal kelas').fill(localDate)
  await adminPage.getByLabel('Sesi kelas').selectOption(sessionId)
  await adminPage.getByRole('button', { name: 'Koreksi', exact: true }).click()
  await adminPage.getByRole('radio', { name: 'Tidak hadir' }).check()
  await adminPage.getByLabel('Alasan koreksi').fill('Daftar hadir kertas diverifikasi ulang')
  await adminPage.getByRole('button', { name: 'Simpan koreksi' }).click()
  await adminPage.getByRole('heading', { name: 'Riwayat koreksi' }).waitFor()
  if (await adminPage.getByText('Riwayat patah tulang kaki').count()) throw new Error('Admin melihat catatan kesehatan')
  await adminPage.screenshot({ path: '.qa/live-admin-attendance-desktop.png', fullPage: true })
  customerPage.on('dialog', dialog => void dialog.accept())
  await customerPage.getByRole('button', { name: /Hapus semua data kesehatan/ }).click()
  await customerPage.waitForFunction(() => document.querySelector('textarea')?.value === '')
  await coachPage.locator('.live-coach-session').first().click()
  if (await coachPage.getByText('Riwayat patah tulang kaki').count()) throw new Error('Pelatih masih melihat catatan yang dihapus')
  await customerPage.screenshot({ path: '.qa/live-health-mobile.png', fullPage: true })
  await coachPage.close()
  await adminPage.close()
  console.log('Live health UI OK: profil, persetujuan kesehatan, akses pelatih, absensi, koreksi admin, dan penghapusan.')
} finally {
  await browser.close()
  if (!customerId) {
    const found = await pool.query('SELECT id FROM app_users WHERE email=$1', [email])
    customerId = found.rows[0]?.id
  }
  if (sessionId) {
    await pool.query('DELETE FROM attendance_corrections WHERE session_id=$1', [sessionId])
    await pool.query('DELETE FROM attendance WHERE session_id=$1', [sessionId])
    await pool.query('DELETE FROM health_snapshots WHERE booking_id IN (SELECT id FROM bookings WHERE session_id=$1)', [sessionId])
    await pool.query('DELETE FROM bookings WHERE session_id=$1', [sessionId])
    await pool.query('DELETE FROM class_sessions WHERE id=$1', [sessionId])
  }
  if (customerId) {
    await pool.query('DELETE FROM health_profile_revisions WHERE customer_id=$1', [customerId])
    await pool.query('DELETE FROM health_profiles WHERE customer_id=$1', [customerId])
    await pool.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [customerId])
  }
  for (const id of [coachId,adminId,customerId].filter(Boolean)) {
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id])
    await pool.query('DELETE FROM app_users WHERE id=$1', [id])
  }
  await pool.end()
}
