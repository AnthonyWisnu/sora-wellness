import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await mkdir('.qa', { recursive: true })

const routes = [
  { path: '/', name: 'home', ready: '.zeira-hero h1' },
  { path: '/jadwal', name: 'schedule', ready: '.zeira-schedule-section' },
  { path: '/membership', name: 'membership', ready: '.zeira-membership-packages' },
  { path: '/kontak', name: 'contact', ready: '.zeira-contact' },
]

try {
  for (const viewport of [{ width: 1440, height: 900, label: 'desktop' }, { width: 390, height: 844, label: 'mobile' }]) {
    await page.setViewportSize(viewport)
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route.path}`)
      await page.locator(route.ready).waitFor()
      await page.locator('.zeira-footer').waitFor()
      if (route.name === 'home') {
        await page.locator('.zeira-gallery-grid').scrollIntoViewIfNeeded()
        await page.locator('.zeira-gallery-grid img').first().evaluate(async (img) => { if (!img.complete) await new Promise((resolve) => img.addEventListener('load', resolve, { once: true })) })
      }
      if (route.name === 'contact') {
        await page.locator('.zeira-contact iframe').scrollIntoViewIfNeeded()
        await page.waitForTimeout(1200)
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${route.name} melebar pada ${viewport.label}`)
      await page.screenshot({ path: `.qa/site-${route.name}-${viewport.label}.png`, fullPage: true })
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:5173/')
  await page.locator('.zeira-hero h1').waitFor()
  assert.ok(await page.locator('.zeira-hero-image').count(), 'Gambar hero tersedia')
  assert.ok(await page.locator('.zeira-session-card').count(), 'Kelas API tampil')
  assert.ok(await page.locator('.zeira-duration-pills button').count(), 'Pilihan paket API tampil')
  const pills = page.locator('.zeira-duration-pills button')
  if (await pills.count() > 1) {
    const before = await page.locator('.zeira-package-price strong').innerText()
    await pills.nth(1).click()
    const after = await page.locator('.zeira-package-price strong').innerText()
    assert.notEqual(after, before, 'Pilihan durasi mengubah harga total')
  }
  assert.ok((await page.locator('.zeira-hero-dots button').count()) >= 5, 'Hero memakai beberapa gambar CMS')
  assert.ok((await page.locator('.zeira-gallery-grid img').count()) >= 4, 'Galeri studio terisi')
  assert.match(await page.locator('.zeira-testimonial-list').innerText(), /TESTIMONI CONTOH/, 'Testimoni fiktif diberi keterangan')

  await page.goto('http://localhost:5173/kontak')
  const map = await page.locator('.zeira-contact iframe').getAttribute('src')
  assert.match(map ?? '', /maps\.google\.com\/maps\?q=.*Udayana/, 'Peta demo mengarah ke lokasi yang diminta')

  await page.goto('http://localhost:5173/jadwal')
  await page.locator('.zeira-schedule-list .zeira-session-card').first().waitFor()
  await page.locator('.zeira-date-options button').nth(1).click()
  assert.ok(await page.locator('.zeira-date-options button.active').count(), 'Filter tanggal aktif')
  await page.locator('.zeira-date-options button').first().click()
  const bookable = page.locator('.zeira-schedule-list .zeira-session-action button:not([disabled])')
  assert.ok(await bookable.count(), 'Ada sesi yang dapat dipesan')
  await bookable.first().click()
  assert.equal(new URL(page.url()).pathname, '/masuk', 'Pengunjung diarahkan masuk sebelum booking')
  assert.deepEqual(errors, [], 'Tidak boleh ada kesalahan JavaScript di halaman publik')
  console.log('Visual public OK: empat halaman desktop/ponsel, filter tanggal, pilihan paket, tanpa overflow atau error JavaScript.')
} finally {
  await browser.close()
}
