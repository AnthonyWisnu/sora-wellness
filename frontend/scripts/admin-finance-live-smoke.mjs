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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const suffix = randomBytes(5).toString('hex')
const adminEmail = `finance-admin-ui-${suffix}@example.test`
const customerEmail = `finance-customer-ui-${suffix}@example.test`
const coachEmail = `finance-coach-ui-${suffix}@example.test`
const password = 'FinanceDashboard123!'
let adminId
let customerId
let coachId
let sessionId
let bookingId
let paymentId
const orderId = `ui-finance-${suffix}`
try {
  async function user(email,role,name) {
    return (await pool.query('INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [email,name,role,await hashPassword(password)])).rows[0].id
  }
  adminId = await user(adminEmail,'admin','Admin Finansial')
  customerId = await user(customerEmail,'customer','Ayu Finansial')
  coachId = await user(coachEmail,'coach','Pelatih Finansial')
  await pool.query('INSERT INTO wallet_accounts (customer_id,balance_idr) VALUES ($1,75000)', [customerId])
  const classType = (await pool.query("SELECT id FROM class_types WHERE level='beginner' LIMIT 1")).rows[0].id
  sessionId = (await pool.query(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
    SELECT $1,$2,(now() AT TIME ZONE timezone)::date,now()+interval '1 day',now()+interval '1 day 1 hour',10,75000 FROM studio WHERE id=1 RETURNING id`, [classType,coachId])).rows[0].id
  bookingId = (await pool.query(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at)
    VALUES ($1,$2,'confirmed','single',75000,$3,now()) RETURNING id`, [customerId,sessionId,`ui-finance-${suffix}`])).rows[0].id
  paymentId = (await pool.query(`INSERT INTO payment_transactions (booking_id,order_id,gross_amount_idr,status,provider_status,snap_token,redirect_url)
    VALUES ($1,$2,75000,'success','settlement','hidden-token','https://sandbox.example/secret') RETURNING id`, [bookingId,orderId])).rows[0].id
  await pool.query(`INSERT INTO wallet_entries (customer_id,booking_id,amount_idr,balance_after_idr,kind,reference)
    VALUES ($1,$2,75000,75000,'class_refund',$3)`, [customerId,bookingId,`ui-finance-ref-${suffix}`])
  await page.goto('http://127.0.0.1:5173/masuk')
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Kata sandi').fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  await page.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Transaksi', exact: true }).click()
  await page.getByRole('heading', { name: 'Booking & transaksi' }).waitFor()
  await page.getByLabel('Cari nama atau email pelanggan').fill(customerEmail)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
  await page.locator('.admin-finance-record').filter({ hasText: customerEmail }).getByText('Terkonfirmasi').waitFor()
  await page.getByLabel('Status').selectOption('cancelled')
  await page.getByText('Tidak ada catatan untuk filter ini.').waitFor()
  await page.getByLabel('Status').selectOption('confirmed')
  await page.locator('.admin-finance-record').filter({ hasText: customerEmail }).waitFor()
  await page.getByRole('button', { name: 'Pembayaran', exact: true }).click()
  await page.getByLabel('Cari pelanggan atau order ID').fill(orderId)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
  await page.getByLabel('Jenis pembayaran').selectOption('class')
  await page.locator('.admin-finance-record').filter({ hasText: orderId }).getByText('Rp75.000').waitFor()
  if (await page.getByText('hidden-token').count()) throw new Error('Token Snap bocor pada dashboard admin')
  await page.getByRole('button', { name: 'Saldo pelanggan' }).click()
  await page.getByLabel('Cari nama atau email pelanggan').fill(customerEmail)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
  await page.locator('.admin-finance-wallet').filter({ hasText: customerEmail }).getByRole('button', { name: 'Buku transaksi' }).click()
  await page.locator('.admin-finance-entry').getByText('Pengembalian kelas').waitFor()
  await page.screenshot({ path: '.qa/live-admin-finance-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.admin-finance-ledger').scrollIntoViewIfNeeded()
  await page.screenshot({ path: '.qa/live-admin-finance-mobile.png' })
  console.log('Live admin finance UI OK: booking, filter, pembayaran, saldo, dan buku transaksi.')
} finally {
  await browser.close()
  if (customerId) await pool.query('DELETE FROM wallet_entries WHERE customer_id=$1', [customerId])
  if (paymentId) await pool.query('DELETE FROM payment_transactions WHERE id=$1', [paymentId])
  if (bookingId) await pool.query('DELETE FROM bookings WHERE id=$1', [bookingId])
  if (sessionId) await pool.query('DELETE FROM class_sessions WHERE id=$1', [sessionId])
  if (customerId) await pool.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [customerId])
  for (const id of [adminId,customerId,coachId].filter(Boolean)) { await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id]); await pool.query('DELETE FROM app_users WHERE id=$1', [id]) }
  await pool.end()
}
