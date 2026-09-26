import { chromium } from 'playwright-core'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const stateUrl = new URL('../.qa/sandbox-checkout.json', import.meta.url)
const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url))
requireBackend('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true })
const { Pool } = requireBackend('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const password = 'SandboxCheckout123!'
const baseUrl = 'http://127.0.0.1:5173'
const mode = process.argv[2]
const state = mode === 'booking' ? { email: `sandbox-${randomBytes(6).toString('hex')}@example.test` } : JSON.parse(await readFile(stateUrl, 'utf8'))
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })

try {
  if (mode === 'cleanup') {
    if (!/^sandbox-[a-f0-9]{12}@example\.test$/.test(state.email)) throw new Error('Bukan akun uji Sandbox')
    const customer = await pool.query('SELECT id FROM app_users WHERE email=$1', [state.email])
    if (customer.rows[0]) {
      const id = customer.rows[0].id
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [id])
        await client.query('DELETE FROM wallet_entries WHERE customer_id=$1', [id])
        await client.query('DELETE FROM payment_transactions WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id=$1) OR package_purchase_id IN (SELECT id FROM package_purchases WHERE customer_id=$1)', [id])
        await client.query('DELETE FROM bookings WHERE customer_id=$1', [id])
        await client.query('DELETE FROM memberships WHERE customer_id=$1', [id])
        await client.query('DELETE FROM package_purchases WHERE customer_id=$1', [id])
        await client.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [id])
        await client.query('DELETE FROM app_users WHERE id=$1', [id])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally { client.release() }
    }
    console.log('Akun dan transaksi uji lokal dibersihkan; riwayat Sandbox di Midtrans tetap ada.')
  } else if (mode === 'booking') {
    await page.goto(`${baseUrl}/masuk`)
    await page.getByRole('button', { name: 'Belum punya akun? Daftar di sini' }).click()
    await page.getByLabel('Nama lengkap').fill('Pelanggan Uji Sandbox')
    await page.getByLabel('Email').fill(state.email)
    await page.getByLabel('Kata sandi').fill(password)
    await page.getByRole('button', { name: /Daftar dan masuk/ }).click()
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
    await page.goto(`${baseUrl}/jadwal`)
    await page.locator('.schedule-card').first().waitFor()
    await page.getByRole('button', { name: /Pesan kelas/ }).first().click()
    await page.getByRole('button', { name: /Konfirmasi reservasi/ }).click()
    await page.getByText('Menunggu pembayaran').first().waitFor()
    state.bookingSnapUrl = await page.getByRole('link', { name: /Buka halaman pembayaran/ }).getAttribute('href')
    if (new URL(state.bookingSnapUrl).hostname !== 'app.sandbox.midtrans.com') throw new Error('URL Snap booking tidak valid')
    const result = await pool.query(`SELECT b.id,p.order_id,p.status,b.hold_expires_at FROM app_users u JOIN bookings b ON b.customer_id=u.id JOIN payment_transactions p ON p.booking_id=b.id WHERE u.email=$1 ORDER BY b.created_at DESC LIMIT 1`, [state.email])
    if (!result.rows[0]) throw new Error('Booking berbayar tidak tercatat')
    state.bookingId = result.rows[0].id
    state.bookingOrderId = result.rows[0].order_id
    await page.screenshot({ path: '.qa/sandbox-booking-pending.png', fullPage: true })
    console.log(JSON.stringify({ phase: 'booking', orderId: state.bookingOrderId, paymentStatus: result.rows[0].status, holdExpiresAt: result.rows[0].hold_expires_at }))
  } else if (mode === 'package') {
    await page.goto(`${baseUrl}/masuk`)
    await page.getByLabel('Email').fill(state.email)
    await page.getByLabel('Kata sandi').fill(password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
    await page.goto(`${baseUrl}/membership`)
    await page.getByRole('button', { name: 'Pilih paket' }).first().click()
    await page.getByText('Menunggu pembayaran').first().waitFor()
    state.packageSnapUrl = await page.getByRole('link', { name: /Buka halaman pembayaran/ }).getAttribute('href')
    if (new URL(state.packageSnapUrl).hostname !== 'app.sandbox.midtrans.com') throw new Error('URL Snap paket tidak valid')
    const result = await pool.query(`SELECT pp.id,p.order_id,p.status,pp.expires_at FROM app_users u JOIN package_purchases pp ON pp.customer_id=u.id JOIN payment_transactions p ON p.package_purchase_id=pp.id WHERE u.email=$1 ORDER BY pp.created_at DESC LIMIT 1`, [state.email])
    if (!result.rows[0]) throw new Error('Pembelian paket tidak tercatat')
    state.purchaseId = result.rows[0].id
    state.packageOrderId = result.rows[0].order_id
    await page.screenshot({ path: '.qa/sandbox-package-pending.png', fullPage: true })
    console.log(JSON.stringify({ phase: 'package', orderId: state.packageOrderId, paymentStatus: result.rows[0].status, expiresAt: result.rows[0].expires_at }))
  } else if (mode === 'verify-booking' || mode === 'verify-package' || mode === 'refresh-package') {
    await page.goto(`${baseUrl}/masuk`)
    await page.getByLabel('Email').fill(state.email)
    await page.getByLabel('Kata sandi').fill(password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
    if (mode === 'refresh-package') {
      await page.getByRole('navigation', { name: 'Navigasi dashboard' }).getByRole('link', { name: 'Paket & pembayaran' }).click()
      await page.getByRole('button', { name: 'Periksa status' }).click()
      await page.getByText('Status paket diperbarui dari Midtrans.').waitFor()
    }
    const endpoint = mode === 'verify-booking' ? `/api/v1/bookings/${state.bookingId}` : `/api/v1/me/membership-purchases/${state.purchaseId}`
    const detail = await page.evaluate(async (url) => (await fetch(url)).json(), endpoint)
    await page.screenshot({ path: `.qa/sandbox-${mode}.png`, fullPage: true })
    console.log(JSON.stringify({ phase: mode, status: detail.status, paymentStatus: detail.paymentStatus, membership: mode !== 'verify-booking' ? detail.membership : undefined }))
  } else if (mode === 'inspect-booking' || mode === 'inspect-package' || mode === 'inspect-card' || mode === 'pay-booking' || mode === 'pay-package') {
    await page.goto(mode === 'inspect-package' || mode === 'pay-package' ? state.packageSnapUrl : state.bookingSnapUrl)
    if (mode === 'inspect-card' || mode.startsWith('pay-')) await page.getByText('Card Payment', { exact: true }).click()
    if (mode.startsWith('pay-')) {
      await page.getByPlaceholder('1234 1234 1234 1234').fill('4811111111111114')
      await page.getByPlaceholder('MM/YY').fill('12/30')
      await page.locator('#card-cvv').fill('123')
      await page.getByText('Pay now', { exact: true }).click()
      await page.waitForTimeout(2500)
      console.log(JSON.stringify({ pages: await Promise.all(browser.contexts()[0].pages().map(async (item) => ({ host: new URL(item.url()).hostname, text: (await item.locator('body').innerText()).slice(0, 1200) }))) }))
    }
    await page.screenshot({ path: `.qa/sandbox-snap-${mode}.png`, fullPage: true })
    console.log((await page.locator('body').innerText()).slice(0, 2500))
  } else throw new Error('Gunakan booking, package, verify-booking, verify-package, inspect-booking, inspect-package, inspect-card, pay-booking, pay-package, atau cleanup')
  if (mode === 'cleanup') await unlink(stateUrl)
  else await writeFile(stateUrl, JSON.stringify(state, null, 2))
} finally {
  await page.close()
  await browser.close()
  await pool.end()
}
