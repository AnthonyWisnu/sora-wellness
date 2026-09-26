import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const svgUrl = new URL('../public/images/sora-mark.svg', import.meta.url)
const pngUrl = new URL('../public/images/sora-mark.png', import.meta.url)
const svg = await readFile(svgUrl, 'utf8')
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
try {
  const page = await browser.newPage()
  const data = await page.evaluate(async (source) => {
    const img = new Image()
    img.src = `data:image/svg+xml;base64,${btoa(source)}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }, svg)
  await writeFile(pngUrl, Buffer.from(data, 'base64'))
  console.log(fileURLToPath(pngUrl))
} finally {
  await browser.close()
}
