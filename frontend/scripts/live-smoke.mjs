import { chromium } from 'playwright-core'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', dialog => void dialog.accept())
const baseURL = 'http://127.0.0.1:5173'
const email = `live-smoke-${randomBytes(6).toString('hex')}@example.test`
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url))
backendRequire('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true })
const { Pool } = backendRequire('pg')
backendRequire('ts-node/register/transpile-only')
const { hashPassword } = backendRequire('./src/shared/security.ts')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
let adminId

try {
  await page.goto(`${baseURL}/?demo=1`)
  await page.locator('.zeira-hero h1').waitFor()
  if (await page.getByText('PEMBAYARAN SIMULASI').count()) throw new Error('Jalur demo lama masih aktif')
  await page.goto(baseURL)
  await page.locator('.zeira-hero h1').waitFor()
  await page.screenshot({ path: '.qa/live-home-mobile.png', fullPage: true })
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  if (metrics.scrollWidth > metrics.viewport) throw new Error(`Halaman utama melebar pada ponsel: ${JSON.stringify(metrics)}`)

  await page.locator('.zeira-hero-center .zeira-btn').click()
  await page.locator('.zeira-schedule-list .zeira-session-card').first().waitFor()
  await page.locator('.zeira-schedule-list .zeira-session-action button:not([disabled])').first().click()
  if (!page.url().endsWith('/masuk')) throw new Error('Pengunjung tidak diarahkan ke login')
  await page.getByRole('button', { name: 'Belum punya akun? Daftar di sini' }).click()
  await page.getByLabel('Nama lengkap').fill('Pelanggan Integrasi')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill('KataSandiIntegrasi123!')
  await page.getByRole('button', { name: /Daftar dan masuk/ }).click()
  await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  await page.screenshot({ path: '.qa/live-customer-mobile.png', fullPage: true })

  await page.goto(`${baseURL}/jadwal`)
  await page.locator('.zeira-schedule-list .zeira-session-card').first().waitFor()
  await page.locator('.zeira-schedule-list .zeira-session-card')
    .filter({ hasText: 'Pemula' })
    .filter({ hasNotText: 'Gratis' })
    .locator('.zeira-session-action button:not([disabled])')
    .first()
    .click()
  await page.getByRole('button', { name: /Konfirmasi reservasi/ }).waitFor()
  await page.getByRole('button', { name: /Konfirmasi reservasi/ }).click()
  try {
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor({ timeout: 10000 })
  } catch (error) {
    await page.screenshot({ path: '.qa/live-booking-failed.png', fullPage: true })
    throw new Error(`Booking tidak kembali ke dashboard: ${page.url()} ${await page.locator('body').innerText()}`, { cause: error })
  }
  await page.getByText('Menunggu pembayaran').first().waitFor()
  const snapUrl = await page.getByRole('link', { name: /Buka halaman pembayaran/ }).getAttribute('href')
  if (new URL(snapUrl).hostname !== 'app.sandbox.midtrans.com') throw new Error('Tautan Snap Sandbox tidak valid')
  await page.getByRole('button', { name: 'Tutup', exact: true }).first().click()
  await page.getByRole('button', { name: 'Batalkan' }).first().click()
  await page.getByText('Dibatalkan').first().waitFor()
  await page.screenshot({ path: '.qa/live-cancelled-mobile.png', fullPage: true })
  await page.goto(`${baseURL}/membership`)
  await page.getByRole('button', { name: 'Pilih paket' }).first().click()
  await page.getByText('Menunggu pembayaran').first().waitFor()
  const packageSnap = await page.getByRole('link', { name: /Buka halaman pembayaran/ }).getAttribute('href')
  if (new URL(packageSnap).hostname !== 'app.sandbox.midtrans.com') throw new Error('Tautan Snap paket tidak valid')
  const packageWindow = await pool.query(`SELECT extract(epoch FROM (pp.expires_at-pp.created_at))::int AS seconds FROM package_purchases pp JOIN app_users u ON u.id=pp.customer_id WHERE u.email=$1 AND pp.status='pending_payment' ORDER BY pp.created_at DESC LIMIT 1`, [email])
  if (packageWindow.rows[0]?.seconds !== 900) throw new Error(`Batas checkout paket bukan 15 menit: ${JSON.stringify(packageWindow.rows[0])}`)
  await page.getByRole('button', { name: 'Tutup', exact: true }).first().click()
  await page.getByRole('button', { name: 'Buka menu dashboard' }).click()
  await page.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Paket & pembayaran' }).click()
  await page.getByRole('heading', { name: 'Paket Anda' }).waitFor()
  await page.screenshot({ path: '.qa/live-package-mobile.png', fullPage: true })
  const adminEmail = `live-admin-${randomBytes(6).toString('hex')}@example.test`
  const adminPassword = 'TestAdminIntegrasi123!'
  const created = await pool.query(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Admin Integrasi','admin',$2) RETURNING id`, [adminEmail, await hashPassword(adminPassword)])
  adminId = created.rows[0].id
  const adminPage = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  adminPage.on('pageerror', error => errors.push(error.message))
  await adminPage.goto(`${baseURL}/masuk`)
  await adminPage.getByLabel('Email').fill(adminEmail)
  await adminPage.getByLabel('Kata sandi').fill(adminPassword)
  await adminPage.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await adminPage.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  await adminPage.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Midtrans' }).click()
  await adminPage.getByRole('heading', { name: 'Terhubung' }).waitFor()
  await adminPage.screenshot({ path: '.qa/live-admin-desktop.png', fullPage: true })
  await adminPage.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Aturan studio' }).click()
  await adminPage.getByRole('heading', { name: 'Aturan booking dan jadwal' }).waitFor()
  await adminPage.close()
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Live UI OK: halaman publik, registrasi, booking dan paket Snap pending, pembatalan, serta dashboard admin.')
} finally {
  await browser.close()
  const customer = await pool.query('SELECT id FROM app_users WHERE email=$1', [email])
  if (customer.rows[0]) {
    const id = customer.rows[0].id
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id])
    await pool.query('DELETE FROM wallet_entries WHERE customer_id=$1', [id])
    await pool.query('DELETE FROM payment_transactions WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id=$1) OR package_purchase_id IN (SELECT id FROM package_purchases WHERE customer_id=$1)', [id])
    await pool.query('DELETE FROM bookings WHERE customer_id=$1', [id])
    await pool.query('DELETE FROM memberships WHERE customer_id=$1', [id])
    await pool.query('DELETE FROM package_purchases WHERE customer_id=$1', [id])
    await pool.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [id])
    await pool.query('DELETE FROM app_users WHERE id=$1', [id])
  }
  if (adminId) {
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [adminId])
    await pool.query('DELETE FROM app_users WHERE id=$1', [adminId])
  }
  await pool.end()
}
