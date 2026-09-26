import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const accounts = JSON.parse(
  await readFile(new URL('../../backend/.qa/demo-accounts.json', import.meta.url), 'utf8'),
).accounts
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
await mkdir('.qa', { recursive: true })

async function login(name, viewport) {
  const account = accounts.find((entry) => entry.name === name)
  assert.ok(account, `Akun ${name} tersedia`)
  const page = await browser.newPage({ viewport })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/masuk')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Kata sandi').fill(account.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).last().click()
  await page.waitForURL(/\/dashboard\/\w+/)
  await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
  assert.equal(
    await page.locator('.site-header').count(),
    0,
    'Header situs publik tidak tampil di dashboard',
  )
  return { page, errors }
}

async function checkOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }))
  assert.ok(size.width <= size.viewport, `Dashboard melebar: ${JSON.stringify(size)}`)
}

try {
  const desktop = { width: 1440, height: 900 }
  for (const [name, target, screenshot] of [
    ['Admin Sora', 'manage', 'admin'],
    ['Made Arya', 'attendance', 'coach'],
    ['Ayu Lestari', 'wallet', 'customer'],
  ]) {
    const { page, errors } = await login(name, desktop)
    await page.screenshot({ path: `.qa/dashboard-${screenshot}-desktop.png` })
    const nav = page.getByRole('navigation', { name: 'Navigasi dashboard' })
    await nav
      .getByRole('link', {
        name:
          target === 'manage'
            ? 'Kelola sesi'
            : target === 'attendance'
              ? 'Peserta & absensi'
              : 'Saldo & loker',
      })
      .click()
    await page.waitForURL(`**/dashboard/${target}`)
    if (name === 'Made Arya') await page.locator('.live-coach-participants h2').waitFor()
    if (name === 'Ayu Lestari') await page.locator('.studio-my-locker').waitFor()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `.qa/dashboard-${screenshot}-${target}.png` })
    assert.equal(await nav.locator('a[aria-current="page"]').count(), 1)
    await page.reload()
    await page.getByRole('heading', { level: 1 }).waitFor()
    assert.ok(page.url().endsWith(`/dashboard/${target}`), 'Refresh mempertahankan bagian aktif')
    await page.goBack()
    await page.getByRole('heading', { name: 'Ringkasan', level: 1 }).waitFor()
    if (name === 'Admin Sora') {
      await nav.getByRole('link', { name: 'Akun', exact: true }).click()
      await page.waitForURL('**/dashboard/accounts')
      await page.locator('.admin-account-table').waitFor()
      await page.screenshot({ path: '.qa/dashboard-admin-accounts.png' })
      await page.getByRole('button', { name: 'Buat akun staf' }).click()
      const createDialog = page.getByRole('dialog', { name: 'Buat akun staf' })
      await createDialog.waitFor({ state: 'visible' })
      await page.screenshot({ path: '.qa/dashboard-admin-create-dialog.png' })
      await checkOverflow(page)
      await page.keyboard.press('Escape')
      await createDialog.waitFor({ state: 'hidden' })
      await nav.getByRole('link', { name: 'Jenis kelas', exact: true }).click()
      await page.waitForURL('**/dashboard/classes')
      await page.getByRole('button', { name: 'Tambah jenis kelas' }).click()
      const classDialog = page.getByRole('dialog', { name: 'Tambah jenis kelas' })
      await classDialog.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await classDialog.waitFor({ state: 'hidden' })
      await nav.getByRole('link', { name: 'Kelola sesi', exact: true }).click()
      await page.waitForURL('**/dashboard/manage')
      await page.getByRole('button', { name: 'Buat sesi' }).click()
      const sessionDialog = page.getByRole('dialog', { name: 'Buat satu sesi' })
      await sessionDialog.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await sessionDialog.waitFor({ state: 'hidden' })
      await nav.getByRole('link', { name: 'Jadwal berulang', exact: true }).click()
      await page.waitForURL('**/dashboard/rules')
      await page.getByRole('button', { name: 'Tambah aturan' }).click()
      const ruleDialog = page.getByRole('dialog', { name: 'Tambah aturan mingguan' })
      await ruleDialog.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await ruleDialog.waitFor({ state: 'hidden' })
      await nav.getByRole('link', { name: 'Paket', exact: true }).click()
      await page.waitForURL('**/dashboard/packages')
      await page.getByRole('button', { name: 'Tambah pilihan paket' }).click()
      const packageDialog = page.getByRole('dialog', { name: 'Tambah pilihan paket' })
      await packageDialog.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await packageDialog.waitFor({ state: 'hidden' })
      await nav.getByRole('link', { name: 'Loker', exact: true }).click()
      await page.waitForURL('**/dashboard/lockers')
      await page.getByRole('button', { name: 'Tambah loker' }).click()
      const lockerDialog = page.getByRole('dialog', { name: 'Tambah nomor loker' })
      await lockerDialog.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await lockerDialog.waitFor({ state: 'hidden' })
    }
    await checkOverflow(page)
    assert.deepEqual(errors, [], 'Tidak ada kesalahan JavaScript')
    await page.close()
  }

  const { page: mobile, errors } = await login('Admin Sora', { width: 390, height: 844 })
  await mobile.screenshot({ path: '.qa/dashboard-admin-mobile.png' })
  await mobile.getByRole('button', { name: 'Buka menu dashboard' }).click()
  await mobile.waitForTimeout(250)
  await mobile.screenshot({ path: '.qa/dashboard-admin-mobile-menu.png' })
  await mobile
    .getByRole('navigation', { name: 'Navigasi dashboard' })
    .getByRole('link', { name: 'Akun', exact: true })
    .click()
  await mobile.waitForURL('**/dashboard/accounts')
  assert.equal(
    await mobile.getByRole('button', { name: 'Buka menu dashboard' }).getAttribute('aria-expanded'),
    'false',
  )
  await mobile.getByRole('button', { name: 'Buat akun staf' }).click()
  const mobileStaffDialog = mobile.getByRole('dialog', { name: 'Buat akun staf' })
  await mobileStaffDialog.waitFor({ state: 'visible' })
  await checkOverflow(mobile)
  await mobile.keyboard.press('Escape')
  await mobileStaffDialog.waitFor({ state: 'hidden' })
  await checkOverflow(mobile)
  assert.deepEqual(errors, [], 'Tidak ada kesalahan JavaScript pada ponsel')
  await mobile.close()
  console.log(
    'Dashboard OK: 3 peran desktop, navigasi/refresh/back, drawer ponsel, tanpa overflow atau error JavaScript.',
  )
} finally {
  await browser.close()
}
