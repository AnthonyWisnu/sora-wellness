import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'

const base = 'http://127.0.0.1:5173'
const accountsUrl = new URL('../../backend/.qa/demo-accounts.json', import.meta.url)
const stateUrl = new URL('../../backend/.qa/demo-sandbox-state.json', import.meta.url)
const accounts = JSON.parse(await readFile(accountsUrl, 'utf8')).accounts
const state = await readFile(stateUrl, 'utf8').then(JSON.parse).catch(() => ({}))
const mode = process.argv[2]
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })

async function login(name) {
  const account = accounts.find((item) => item.name === name)
  if (!account) throw new Error(`Akun ${name} tidak ditemukan`)
  await page.goto(`${base}/masuk`)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Kata sandi').fill(account.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  try {
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor({ timeout: 10000 })
  } catch (error) {
    await page.screenshot({ path: '../backend/.qa/demo-login-failed.png', fullPage: true })
    throw new Error(`Login demo gagal: ${page.url()} ${(await page.locator('body').innerText()).slice(0, 500)}`, { cause: error })
  }
}

async function api(path, method = 'GET', body, headers = {}) {
  return page.evaluate(async ({ path, method, body, headers }) => {
    const token = method === 'GET' ? null : (await (await fetch('/api/v1/auth/csrf')).json()).token
    const response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: { ...(token ? { 'x-csrf-token': token } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(data)}`)
    return data
  }, { path, method, body, headers })
}

async function pay(url, label) {
  if (new URL(url).hostname !== 'app.sandbox.midtrans.com') throw new Error('URL bukan Snap Sandbox')
  const payment = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  try {
    await payment.goto(url)
    await payment.getByText('Card Payment', { exact: true }).click()
    await payment.getByPlaceholder('1234 1234 1234 1234').fill('4811111111111114')
    await payment.getByPlaceholder('MM/YY').fill('12/30')
    await payment.locator('#card-cvv').fill('123')
    await payment.getByText('Pay now', { exact: true }).click()
    await payment.waitForTimeout(1800)
    const pages = browser.contexts()[0].pages()
    console.log(`${label} setelah bayar:`, JSON.stringify(await Promise.all(pages.map(async (p) => ({ host: new URL(p.url()).hostname, text: (await p.locator('body').innerText()).slice(0, 450) })))))
    await payment.screenshot({ path: `../backend/.qa/demo-${label}-checkout.png`, fullPage: true })
    for (const candidate of pages) {
      const otp = candidate.getByPlaceholder(/OTP|password|kode/i)
      if (await otp.count()) {
        await otp.first().fill('112233')
        const submit = candidate.getByRole('button', { name: /ok|submit|confirm|bayar|pay/i })
        if (await submit.count()) await submit.last().click()
        break
      }
    }
    await payment.waitForTimeout(1800)
  } finally {
    await payment.close()
  }
}

try {
  if (mode === 'package') {
    await login('Ayu Lestari')
    const packages = await api('/public/packages')
    const option = packages.options.find((item) => item.durationMonths === 1)
    const purchase = await api('/me/membership-purchases', 'POST', { packageOptionId: option.id }, { 'Idempotency-Key': `demo-pkg-${randomUUID()}` })
    state.packageId = purchase.id
    await writeFile(stateUrl, JSON.stringify(state, null, 2))
    await pay(purchase.payment.redirectUrl, 'package')
    await page.goto(`${base}/dashboard`)
    await api(`/me/membership-purchases/${purchase.id}/refresh-payment`, 'POST')
    console.log('Paket:', (await api(`/me/membership-purchases/${purchase.id}`)).status)
  } else if (mode === 'class') {
    await login('Dimas Saputra')
    const sessions = await api('/public/sessions?limit=100')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
    const future = sessions.find((item) => item.title === 'Gentle Flow' && item.localDate > today && item.seatsLeft > 0)
    if (!future) throw new Error('Tidak ada kelas Gentle Flow mendatang')
    const booking = await api('/bookings', 'POST', { sessionId: future.id, paymentChoice: 'single', useBalance: false }, { 'Idempotency-Key': `demo-class-${randomUUID()}` })
    state.bookingId = booking.id
    await writeFile(stateUrl, JSON.stringify(state, null, 2))
    await pay(booking.payment.redirectUrl, 'class')
    await page.goto(`${base}/dashboard`)
    await api(`/bookings/${booking.id}/refresh-payment`, 'POST')
    console.log('Kelas:', (await api(`/bookings/${booking.id}`)).status)
  } else if (mode === 'wallet') {
    await login('Dimas Saputra')
    if (!state.bookingId) throw new Error('Booking berbayar belum ada')
    const cancelled = await api(`/bookings/${state.bookingId}/cancel`, 'POST')
    if (!cancelled.creditedBalanceIdr) throw new Error('Saldo pembatalan belum dikreditkan')
    const sessions = await api('/public/sessions?limit=100')
    const next = sessions.find((item) => item.title === 'Morning Mobility' && item.seatsLeft > 0)
    if (!next) throw new Error('Sesi untuk saldo belum ada')
    const booking = await api('/bookings', 'POST', { sessionId: next.id, paymentChoice: 'single', useBalance: true }, { 'Idempotency-Key': `demo-wallet-${randomUUID()}` })
    console.log('Saldo:', cancelled.creditedBalanceIdr, 'booking:', booking.status, 'tagihan gateway:', booking.gatewayDueIdr)
  } else if (mode === 'member') {
    await login('Ayu Lestari')
    const actor = await api('/me')
    await api('/me/health', 'PUT', { note: 'Pernah mengalami ketegangan bahu; memilih penyesuaian gerak saat diperlukan.', consent: true })
    const sessions = await api('/public/sessions?limit=100')
    const next = sessions.find((item) => item.title === 'Power Flow' && item.seatsLeft > 0)
    if (!next) throw new Error('Sesi tingkat lanjutan tidak tersedia')
    const booking = await api('/bookings', 'POST', { sessionId: next.id, paymentChoice: 'quota' }, { 'Idempotency-Key': `demo-quota-${randomUUID()}` })
    if (booking.status !== 'confirmed' || booking.source !== 'quota') throw new Error('Booking jatah tidak terkonfirmasi')
    await api('/auth/logout', 'POST')
    await login('Admin Sora')
    const lockers = await api('/admin/lockers')
    const first = lockers.lockers.find((item) => item.code === 'A-01')
    await api(`/admin/lockers/${first.id}/assignment`, 'PUT', { customerId: actor.id })
    console.log('Member:', (await api('/admin/lockers')).lockers.find((item) => item.code === 'A-01').customerName, 'booking jatah:', booking.status)
  } else throw new Error('Gunakan mode package, class, wallet, atau member')
} finally {
  await page.close()
  await browser.close()
}
