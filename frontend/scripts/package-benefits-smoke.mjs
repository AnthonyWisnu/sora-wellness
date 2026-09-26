import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const source = await context.request.get('http://127.0.0.1:5173/api/v1/public/site')
assert.equal(source.status(), 200)
let published = await source.json()
let draft = structuredClone(published)
let draftVersion = 1
let publishedVersion = 1
const reply = (route, value, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })

await context.route(/\/api\/v1\/me$/, (route) =>
  reply(route, {
    id: 'admin-fixture',
    email: 'admin@example.test',
    fullName: 'Admin Uji',
    role: 'admin',
    passwordChangeRequired: false,
  }),
)
await context.route(/\/api\/v1\/admin\/site\/preview$/, (route) => reply(route, draft))
await context.route(/\/api\/v1\/admin\/site\/publish$/, (route) => {
  const body = route.request().postDataJSON()
  if (body.expectedVersion !== draftVersion)
    return reply(route, { message: 'Draf telah berubah' }, 409)
  published = structuredClone(draft)
  publishedVersion = draftVersion
  return reply(route, { document: draft, draftVersion, publishedVersion })
})
await context.route(/\/api\/v1\/admin\/site$/, (route) => {
  if (route.request().method() === 'GET')
    return reply(route, { document: draft, draftVersion, publishedVersion })
  const body = route.request().postDataJSON()
  if (body.expectedVersion !== draftVersion)
    return reply(route, { message: 'Draf telah berubah' }, 409)
  draft = body.document
  draftVersion++
  return reply(route, { document: draft, draftVersion, publishedVersion })
})
await context.route(/\/api\/v1\/public\/site$/, (route) => reply(route, published))
await context.route(/\/api\/v1\/admin\/package-options$/, (route) => reply(route, []))
for (const path of ['policies', 'dashboard-summary', 'payment-settings'])
  await context.route(new RegExp(`/api/v1/admin/${path}$`), (route) => reply(route, {}))
const page = await context.newPage()
page.on('dialog', (dialog) => void dialog.accept())

try {
  await page.goto('http://127.0.0.1:5173/dashboard/packages')
  await page.getByRole('heading', { name: 'Manfaat membership' }).waitFor()
  const benefit = 'Manfaat uji dari editor paket'
  await page.getByRole('button', { name: 'Tambah manfaat' }).click()
  await page.getByLabel('Judul manfaat').last().fill(benefit)
  await page.getByLabel('Penjelasan').last().fill('Berlaku untuk seluruh pilihan durasi.')
  await page.getByRole('button', { name: 'Simpan draf' }).click()
  await page.getByText('Draf belum terbit', { exact: true }).waitFor()
  assert.equal(
    published.pages.membership
      .find((section) => section.type === 'features')
      .items.some((item) => item.title === benefit),
    false,
  )
  const previewPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Pratinjau draf' }).click()
  const preview = await previewPromise
  await preview.getByRole('heading', { name: benefit }).waitFor()
  await preview.close()
  await page.getByRole('button', { name: 'Terbitkan seluruh draf situs' }).click()
  await page.getByText('Sudah terbit', { exact: true }).waitFor()
  assert.equal(
    published.pages.membership
      .find((section) => section.type === 'features')
      .items.some((item) => item.title === benefit),
    true,
  )
  await page.getByRole('button', { name: 'Tambah manfaat' }).click()
  await page.getByLabel('Judul manfaat').last().fill('Edit yang bertabrakan')
  draftVersion++
  await page.getByRole('button', { name: 'Simpan draf' }).click()
  await page.getByRole('button', { name: 'Muat ulang draf' }).waitFor()
  await page.getByRole('button', { name: 'Muat ulang draf' }).click()
  assert.equal(
    await page
      .locator('input')
      .evaluateAll((inputs) => inputs.some((input) => input.value === 'Edit yang bertabrakan')),
    false,
  )
  console.log('Package benefits OK: draf, pratinjau privat, publikasi, dan konflik versi.')
} finally {
  await browser.close()
}
