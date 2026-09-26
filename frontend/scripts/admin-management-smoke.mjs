import { chromium } from 'playwright-core'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url))
backendRequire('dotenv').config({
  path: fileURLToPath(new URL('../../backend/.env', import.meta.url)),
  quiet: true,
})
backendRequire('ts-node/register/transpile-only')
const { hashPassword } = backendRequire('./src/shared/security.ts')
const { Pool } = backendRequire('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('dialog', (dialog) => void dialog.accept())
const suffix = randomBytes(5).toString('hex')
const adminEmail = `admin-manage-${suffix}@example.test`
const coachEmail = `coach-manage-${suffix}@example.test`
const classTitle = `Kelas Admin ${suffix}`
const password = 'AdminManagement123!'
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
function addDays(date, count) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + count)
  return value.toISOString().slice(0, 10)
}
const sessionDate = addDays(today, 3)
const ruleStart = addDays(today, 4)
const ruleEnd = addDays(today, 11)
const weekday = ((new Date(`${ruleStart}T00:00:00Z`).getUTCDay() + 6) % 7) + 1
let adminId
let coachId
let classId
let packageId
let ruleId
let fixtureDuration

try {
  const existingDurations = (
    await pool.query('SELECT duration_months FROM package_options')
  ).rows.map((row) => row.duration_months)
  fixtureDuration = Array.from({ length: 36 }, (_, index) => 36 - index).find(
    (value) => !existingDurations.includes(value),
  )
  if (!fixtureDuration) throw new Error('Tidak ada durasi paket kosong untuk fixture uji')
  adminId = (
    await pool.query(
      `INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Admin Uji','admin',$2) RETURNING id`,
      [adminEmail, await hashPassword(password)],
    )
  ).rows[0].id
  await page.goto('http://127.0.0.1:5173/masuk')
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Kata sandi').fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()

  await page
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Akun', exact: true })
    .click()
  await page.getByRole('button', { name: 'Buat akun staf' }).click()
  await page.getByLabel('Nama lengkap').fill(`Pelatih Admin ${suffix}`)
  await page.getByLabel('Email').last().fill(coachEmail)
  await page.getByRole('button', { name: 'Buat staf' }).click()
  await page.locator('.admin-secret code').waitFor()
  if ((await page.locator('.admin-secret code').innerText()).length < 12)
    throw new Error('Sandi sementara staf tidak ditampilkan')
  coachId = (await pool.query('SELECT id FROM app_users WHERE email=$1', [coachEmail])).rows[0].id
  await page.getByRole('button', { name: /Sudah disampaikan/ }).click()
  if (await page.locator('.admin-secret').count()) throw new Error('Sandi sementara belum tertutup')
  await page.getByLabel('Nama atau email').fill(coachEmail)
  await page.getByRole('button', { name: 'Cari akun', exact: true }).click()
  await page.locator('.admin-account-table tr').filter({ hasText: coachEmail }).waitFor()
  await page
    .locator('.admin-account-table tr')
    .filter({ hasText: coachEmail })
    .getByRole('button', { name: 'Reset sandi' })
    .click()
  await page.getByLabel('Catatan verifikasi').fill('Staf dikenali langsung oleh admin studio')
  await page.getByRole('button', { name: 'Reset dan cabut sesi' }).click()
  await page.locator('.admin-secret code').waitFor()
  await page.getByRole('button', { name: /Sudah disampaikan/ }).click()

  await page
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Jenis kelas' })
    .click()
  await page.getByRole('button', { name: 'Tambah jenis kelas' }).click()
  await page.getByLabel('Nama kelas').fill(classTitle)
  await page.getByLabel('Kategori').fill('Pilates')
  await page.getByLabel('Deskripsi').fill('Kelas sementara untuk pengujian admin.')
  await page.getByLabel('Harga satuan bawaan (Rp)').fill('52000')
  await page.getByRole('button', { name: 'Simpan kelas' }).click()
  await page.getByRole('heading', { name: classTitle }).waitFor()
  classId = (await pool.query('SELECT id FROM class_types WHERE title=$1', [classTitle])).rows[0].id
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByRole('button', { name: 'Ubah' })
    .click()
  await page.getByLabel('Harga satuan bawaan (Rp)').fill('53000')
  await page.getByRole('button', { name: 'Simpan kelas' }).click()
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByText('Rp53.000')
    .waitFor()

  await page
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Paket', exact: true })
    .click()
  await page.getByRole('button', { name: 'Tambah pilihan paket' }).click()
  await page.getByLabel('Durasi (bulan)').fill(String(fixtureDuration))
  await page.getByLabel('Harga paket (Rp)').fill('400000')
  await page.getByRole('button', { name: 'Simpan paket' }).click()
  await page.getByRole('heading', { name: `${fixtureDuration} bulan` }).waitFor()
  packageId = (
    await pool.query('SELECT id FROM package_options WHERE duration_months=$1', [fixtureDuration])
  ).rows[0].id
  await page
    .locator('.admin-record')
    .filter({ hasText: `${fixtureDuration} bulan` })
    .getByRole('button', { name: 'Ubah' })
    .click()
  await page.getByLabel('Harga paket (Rp)').fill('410000')
  await page.getByLabel('Tampilkan kepada pelanggan').uncheck()
  await page.getByRole('button', { name: 'Simpan paket' }).click()
  await page
    .locator('.admin-record')
    .filter({ hasText: `${fixtureDuration} bulan` })
    .getByText('DISEMBUNYIKAN')
    .waitFor()

  await page
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Kelola sesi' })
    .click()
  await page.getByRole('button', { name: 'Buat sesi' }).click()
  await page.getByLabel('Jenis kelas').selectOption(classId)
  await page.getByLabel('Pelatih').selectOption(coachId)
  await page.getByLabel('Tanggal kelas').fill(sessionDate)
  await page.getByLabel('Jam mulai').fill('10:00')
  await page.getByRole('button', { name: 'Simpan sesi' }).click()
  await page.locator('.admin-record').filter({ hasText: classTitle }).waitFor()
  const sessionId = (
    await pool.query(
      'SELECT id FROM class_sessions WHERE class_type_id=$1 AND schedule_rule_id IS NULL',
      [classId],
    )
  ).rows[0].id
  if (!sessionId) throw new Error('Sesi manual tidak tersimpan')
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByRole('button', { name: 'Ubah' })
    .click()
  await page.getByLabel('Harga satuan (Rp)').fill('54000')
  await page.getByRole('button', { name: 'Simpan sesi' }).click()
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByText('Rp54.000')
    .waitFor()
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByRole('button', { name: 'Batalkan' })
    .click()
  await page
    .locator('.admin-record')
    .filter({ hasText: classTitle })
    .getByText('DIBATALKAN')
    .waitFor()

  await page
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Jadwal berulang' })
    .click()
  await page.getByRole('button', { name: 'Tambah aturan' }).click()
  await page.getByLabel('Jenis kelas').selectOption(classId)
  await page.getByLabel('Pelatih').selectOption(coachId)
  await page.getByLabel('Hari').selectOption(String(weekday))
  await page.getByLabel('Mulai berlaku').fill(ruleStart)
  await page.getByLabel('Sampai tanggal').fill(ruleEnd)
  await page.getByRole('button', { name: 'Buat aturan' }).click()
  await page.locator('.admin-record').filter({ hasText: classTitle }).waitFor()
  ruleId = (await pool.query('SELECT id FROM schedule_rules WHERE class_type_id=$1', [classId]))
    .rows[0].id
  const generated = await pool.query(
    'SELECT count(*)::int AS count FROM class_sessions WHERE schedule_rule_id=$1',
    [ruleId],
  )
  if (generated.rows[0].count !== 2) throw new Error('Jadwal berulang tidak membuat dua sesi')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '.qa/live-admin-management-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '.qa/live-admin-management-mobile.png' })
  console.log('Admin UI OK: akun staf, reset, kelas, paket, sesi, aturan mingguan.')
} finally {
  await browser.close()
  if (!classId)
    classId = (await pool.query('SELECT id FROM class_types WHERE title=$1', [classTitle])).rows[0]
      ?.id
  if (!coachId)
    coachId = (await pool.query('SELECT id FROM app_users WHERE email=$1', [coachEmail])).rows[0]
      ?.id
  if (!adminId)
    adminId = (await pool.query('SELECT id FROM app_users WHERE email=$1', [adminEmail])).rows[0]
      ?.id
  if (classId) {
    await pool.query('DELETE FROM class_sessions WHERE class_type_id=$1', [classId])
    await pool.query('DELETE FROM schedule_rules WHERE class_type_id=$1', [classId])
    await pool.query('DELETE FROM class_types WHERE id=$1', [classId])
  }
  if (!packageId && fixtureDuration)
    packageId = (
      await pool.query('SELECT id FROM package_options WHERE duration_months=$1', [fixtureDuration])
    ).rows[0]?.id
  if (packageId) await pool.query('DELETE FROM package_options WHERE id=$1', [packageId])
  for (const id of [coachId, adminId].filter(Boolean)) {
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id])
    await pool.query('DELETE FROM audit_logs WHERE actor_id=$1 OR target_user_id=$1', [id])
    await pool.query('DELETE FROM app_users WHERE id=$1', [id])
  }
  await pool.end()
}
