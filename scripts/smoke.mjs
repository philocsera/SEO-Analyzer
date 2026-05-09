// 단일 URL로 batch-pdf.mjs와 동일 흐름 검증
import puppeteer from 'puppeteer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PDFS_DIR = path.join(ROOT, 'pdfs')
await fs.mkdir(PDFS_DIR, { recursive: true })

const BASE_URL = 'http://localhost:3000'
const NAME = '토스'
const URL = 'https://toss.im'

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
page.setDefaultTimeout(180_000)

// 콘솔 에러 표시
page.on('pageerror', e => console.log('[pageerror]', e.message))
page.on('console', msg => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text())
})

const start = Date.now()
console.log(`navigate ${BASE_URL}`)
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

console.log('analyze...')
const analyze = await page.evaluate(async (targetUrl) => {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl }),
  })
  return { ok: res.ok, status: res.status, text: await res.text() }
}, URL)

if (!analyze.ok) {
  console.log('analyze failed:', analyze.status, analyze.text.slice(0, 300))
  await browser.close()
  process.exit(1)
}

const result = JSON.parse(analyze.text)
console.log(`analyze ok: score=${result.overallScore}, ${((Date.now()-start)/1000).toFixed(1)}s`)

await page.evaluate((json) => sessionStorage.setItem('seo_result', json), analyze.text)
await page.goto(`${BASE_URL}/result/${encodeURIComponent(URL)}`, { waitUntil: 'networkidle2' })
console.log('result page loaded')

// blob href 대기
const handle = await page.waitForFunction(
  () => {
    const links = Array.from(document.querySelectorAll('a[href^="blob:"]'))
    const pdf = links.find(a => a.getAttribute('download')?.endsWith('.pdf'))
    return pdf ? pdf.href : null
  },
  { timeout: 60_000, polling: 500 }
)
const blobUrl = await handle.jsonValue()
console.log('blob url:', blobUrl)

const base64 = await page.evaluate(async (url) => {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}, blobUrl)

const pdfBuf = Buffer.from(base64, 'base64')
const filePath = path.join(PDFS_DIR, `${NAME}.pdf`)
await fs.writeFile(filePath, pdfBuf)
console.log(`saved ${filePath} (${(pdfBuf.length/1024).toFixed(0)}KB) in ${((Date.now()-start)/1000).toFixed(1)}s`)

await browser.close()
