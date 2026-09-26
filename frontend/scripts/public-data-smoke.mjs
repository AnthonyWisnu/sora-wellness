import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const dateAt = (offset) => {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
const sessions = Array.from({ length: 205 }, (_, index) => {
  const localDate = dateAt(1 + (index % 29))
  return {
    id: `session-${index}`,
    classTypeId: 'fixture',
    localDate,
    startsAt: `${localDate}T00:00:00.000Z`,
    endsAt: `${localDate}T01:00:00.000Z`,
    capacity: 12,
    singlePriceIdr: 75000,
    status: 'scheduled',
    title: `Kelas ${index}`,
    category: index % 2 ? 'Pilates' : 'Yoga',
    level: 'beginner',
    coachName: 'Pelatih Uji',
    seatsLeft: 10,
  }
})
const requestedPages = []
let failSessions = false
await page.route('**/api/v1/public/sessions?*', async (route) => {
  if (failSessions)
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Jadwal sementara gagal' }),
    })
  const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? '1')
  requestedPages.push(pageNumber)
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(sessions.slice((pageNumber - 1) * 100, pageNumber * 100)),
  })
})
await page.route(/\/api\/v1\/me(?:\/|$)/, async (route) => {
  const path = new URL(route.request().url()).pathname
  const value = path.endsWith('/membership')
    ? { ranges: [{ starts_on: dateAt(-1), ends_on: dateAt(40) }], quota: [] }
    : path.endsWith('/wallet')
      ? { balanceIdr: 0 }
      : path.endsWith('/me')
        ? {
            id: 'customer-fixture',
            email: 'member@example.test',
            fullName: 'Member Uji',
            role: 'customer',
            passwordChangeRequired: false,
          }
        : []
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
})
await page.route('**/api/v1/bookings?*', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
)

try {
  await page.goto('http://127.0.0.1:5173/jadwal')
  await page.getByText('Pekan 1 dari 5').waitFor()
  assert.deepEqual([...new Set(requestedPages)].sort(), [1, 2, 3], 'Semua 205 sesi diambil')
  assert.equal(
    await page.locator('.zeira-date-options button').count(),
    7,
    'Satu pekan tampil sekaligus',
  )
  await page.locator('.zeira-date-options button').first().click()
  assert.match(
    await page.locator('.zeira-empty').last().innerText(),
    /Tidak ada kelas pada tanggal ini/,
    'Hari kosong tetap tersedia',
  )
  let total = 0
  for (let week = 0; week < 5; week++) {
    const labels = await page.locator('.zeira-date-options button small').allInnerTexts()
    total += labels.reduce((sum, label) => sum + Number(label.split(' ')[0]), 0)
    if (week < 4) await page.getByRole('button', { name: 'Pekan berikutnya' }).click()
  }
  assert.equal(total, 205, 'Jumlah per tanggal mencakup seluruh halaman API')
  await page.getByRole('button', { name: 'Pekan sebelumnya' }).click()
  await page.getByRole('button', { name: 'Yoga', exact: true }).click()
  const filtered = (await page.locator('.zeira-date-options button small').allInnerTexts()).reduce(
    (sum, label) => sum + Number(label.split(' ')[0]),
    0,
  )
  assert.ok(filtered > 0 && filtered < 50, 'Jumlah pada pekan ini berubah sesuai kategori')
  failSessions = true
  await page.reload()
  await page.getByRole('heading', { name: 'Jadwal belum dapat dimuat' }).waitFor()
  failSessions = false
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await page.locator('.zeira-schedule-list .zeira-session-card').first().waitFor()
  const site = await (await page.request.get('http://127.0.0.1:5173/api/v1/public/site')).json()
  site.contact.mapEmbedUrl = ''
  await page.route('**/api/v1/public/site', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(site) }),
  )
  let packageCount = 1
  await page.route('**/api/v1/public/packages', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        monthlyClassQuota: 8,
        accessLevels: ['beginner', 'intermediate_1', 'intermediate_2'],
        options: Array.from({ length: packageCount }, (_, index) => ({
          id: `package-${index}`,
          durationMonths: index + 1,
          priceIdr: 450000,
        })),
      }),
    }),
  )
  await page.goto('http://127.0.0.1:5173/membership')
  await page.locator('.zeira-plan-grid-1 article').waitFor()
  assert.equal(
    await page
      .locator('.zeira-plan-grid')
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length),
    1,
  )
  packageCount = 2
  await page.reload()
  await page.locator('.zeira-plan-grid-2 article').first().waitFor()
  assert.equal(
    await page
      .locator('.zeira-plan-grid')
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length),
    2,
  )
  await page.goto('http://127.0.0.1:5173/kontak')
  await page.locator('.zeira-contact-no-map').waitFor()
  assert.equal(await page.locator('.zeira-contact iframe').count(), 0)
  console.log(
    'Public data OK: 205 sesi, 30 tanggal, hari kosong, kategori, gagal/muat ulang, paket 1/2 kolom, dan kontak tanpa peta.',
  )
} finally {
  await browser.close()
}
