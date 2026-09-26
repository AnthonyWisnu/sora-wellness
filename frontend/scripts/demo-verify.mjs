import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const accounts = JSON.parse(await readFile(new URL('../../backend/.qa/demo-accounts.json', import.meta.url), 'utf8')).accounts
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })

async function actor(name, screenshot) {
  const account = accounts.find((item) => item.name === name)
  assert.ok(account, `Akun ${name} tersedia`)
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  await page.goto('http://127.0.0.1:5173/masuk')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Kata sandi').fill(account.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  if (screenshot) await page.screenshot({ path: `../backend/.qa/demo-${screenshot}-dashboard.png`, fullPage: true })
  const get = (path) => page.evaluate(async (path) => {
    const response = await fetch(`/api/v1${path}`)
    return { status: response.status, body: await response.json().catch(() => null) }
  }, path)
  return { page, get }
}

try {
  const admin = await actor('Admin Sora', 'admin')
  assert.ok((await admin.get('/admin/accounts')).body.length >= 9, 'Daftar akun admin terisi')
  assert.ok((await admin.get('/admin/sessions')).body.length > 0, 'Jadwal admin terisi')
  const payments = await admin.get('/admin/payments')
  assert.ok(payments.body.items.length >= 2, 'Pembayaran Sandbox tampil pada admin')
  const lockers = await admin.get('/admin/lockers')
  assert.equal(lockers.body.lockers.length, 12)
  assert.ok(lockers.body.lockers.some((item) => item.customerName === 'Ayu Lestari'))
  assert.equal((await admin.get('/admin/payment-settings')).body.configured, true, 'Midtrans tetap terkonfigurasi')
  await admin.page.close()

  const coach = await actor('Made Arya', 'coach')
  const coachSessions = await coach.get('/coach/sessions')
  assert.ok(coachSessions.body.length > 0, 'Jadwal pelatih terisi')
  const pastDate = new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
  const pastSessions = await coach.get(`/coach/sessions?date=${pastDate}`)
  const attended = pastSessions.body.find((item) => item.participantCount >= 2)
  assert.ok(attended, 'Kelas dengan peserta tersedia')
  const participants = await coach.get(`/coach/sessions/${attended.id}/participants`)
  assert.equal(participants.body.participants.length, 2)
  assert.ok(participants.body.participants.some((item) => item.healthNote), 'Catatan kesehatan peserta tampil pada pelatih kelasnya')
  await coach.page.close()

  const member = await actor('Ayu Lestari', 'member')
  assert.ok((await member.get('/me/membership')).body.ranges.length >= 1, 'Paket member aktif')
  assert.equal((await member.get('/me/locker')).body.code, 'A-01')
  assert.ok((await member.get('/bookings')).body.some((item) => item.source === 'quota'))
  await member.page.close()

  const customer = await actor('Dimas Saputra', 'customer')
  const wallet = await customer.get('/me/wallet/entries')
  assert.ok(wallet.body.length >= 2, 'Buku saldo memiliki kredit dan debit')
  assert.ok((await customer.get('/bookings')).body.some((item) => item.source === 'single'))
  await customer.page.close()
  console.log('Data demo OK: admin, pelatih, member, pelanggan, pembayaran Sandbox, loker, kesehatan, dan saldo.')
} finally {
  await browser.close()
}
