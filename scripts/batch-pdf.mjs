// 배치로 URL을 분석하고 PDF로 저장하는 스크립트.
// 사용법:
//   node scripts/batch-pdf.mjs <preset>
//
// preset: presets.json의 키 (main | small | niche | smartstore)
//
// 동작: dev server(localhost:3000)가 떠있어야 함. (rate-limiter는 localhost 우회됨)
//
// 흐름 (URL 1개 기준):
//   1. localhost:3000으로 이동 (origin 확보)
//   2. /api/analyze 호출 → AnalysisResult JSON 획득 (smartstore URL도 단일 엔드포인트가 처리)
//   3. sessionStorage.setItem('seo_result', json) 후 /result/{encoded URL}로 이동
//   4. PdfReport의 PDFDownloadLink가 blob URL을 만들 때까지 폴링
//   5. blob을 fetch → arrayBuffer → base64 → 파일 저장

import puppeteer from 'puppeteer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const BASE_URL = 'http://localhost:3000'
const PER_URL_TIMEOUT_MS = 240_000   // 분석 + PDF 렌더링 합쳐서 4분 한도 (외부 API 캐시 미스 대비)
const PDF_RENDER_TIMEOUT_MS = 90_000

// ──────────────────────────────────────────────────────────────────
// 프리셋 로드
// ──────────────────────────────────────────────────────────────────
const presetName = process.argv[2]
if (!presetName) {
  console.error('사용법: node scripts/batch-pdf.mjs <preset>')
  console.error('       presets.json의 키 중 하나를 지정하세요.')
  process.exit(1)
}

const presets = JSON.parse(await fs.readFile(path.join(__dirname, 'presets.json'), 'utf8'))
if (!presets[presetName]) {
  console.error(`프리셋 "${presetName}"을(를) 찾을 수 없습니다. 사용 가능: ${Object.keys(presets).join(', ')}`)
  process.exit(1)
}

const PDFS_DIR = path.join(ROOT, presets[presetName].outDir)
const TARGETS  = presets[presetName].targets

await fs.mkdir(PDFS_DIR, { recursive: true })

// ──────────────────────────────────────────────────────────────────
// PDF blob 다운로드: PDFDownloadLink의 <a href="blob:..."> 를 잡아서 base64로 변환
// ──────────────────────────────────────────────────────────────────
async function downloadPdfBlob(page) {
  const blobHref = await page.waitForFunction(
    () => {
      const links = Array.from(document.querySelectorAll('a[href^="blob:"]'))
      const pdfLink = links.find(a => a.getAttribute('download')?.endsWith('.pdf'))
      return pdfLink ? pdfLink.href : null
    },
    { timeout: PDF_RENDER_TIMEOUT_MS, polling: 500 }
  )
  const blobUrl = await blobHref.jsonValue()

  const base64 = await page.evaluate(async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }, blobUrl)

  return Buffer.from(base64, 'base64')
}

// ──────────────────────────────────────────────────────────────────
// URL 1개 처리: 분석 → sessionStorage → /result → PDF 다운로드 → 저장
// ──────────────────────────────────────────────────────────────────
async function processOne(browser, name, url) {
  const page = await browser.newPage()
  page.setDefaultTimeout(PER_URL_TIMEOUT_MS)

  const consoleErrors = []
  page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`)
  })

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    const analyze = await page.evaluate(async (targetUrl) => {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const text = await res.text()
      return { ok: res.ok, status: res.status, text }
    }, url)

    if (!analyze.ok) {
      throw new Error(`/api/analyze ${analyze.status}: ${analyze.text.slice(0, 300)}`)
    }

    let result
    try {
      result = JSON.parse(analyze.text)
    } catch (err) {
      throw new Error(`JSON 파싱 실패: ${err.message} — body=${analyze.text.slice(0, 200)}`)
    }

    await page.evaluate((json) => {
      sessionStorage.setItem('seo_result', json)
    }, analyze.text)

    await page.goto(`${BASE_URL}/result/${encodeURIComponent(url)}`, {
      waitUntil: 'networkidle2',
    })

    const pdfBuf = await downloadPdfBlob(page)
    const filePath = path.join(PDFS_DIR, `${name}.pdf`)
    await fs.writeFile(filePath, pdfBuf)

    return {
      name, url,
      score: result.overallScore,
      bytes: pdfBuf.length,
      filePath,
      consoleErrors: consoleErrors.slice(0, 5),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

// ──────────────────────────────────────────────────────────────────
// main
// ──────────────────────────────────────────────────────────────────
console.log(`프리셋: ${presetName} → 출력: ${PDFS_DIR}`)
console.log(`대상 ${TARGETS.length}개`)

const browser = await puppeteer.launch({ headless: 'new' })
const summary = []

for (const [name, url] of TARGETS) {
  const startedAt = Date.now()
  process.stdout.write(`[${String(summary.length + 1).padStart(2, '0')}/${TARGETS.length}] ${name.padEnd(12)} ${url} ... `)
  try {
    const r = await processOne(browser, name, url)
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`OK  점수=${r.score}, ${(r.bytes / 1024).toFixed(0)}KB, ${elapsed}s`)
    summary.push({ status: 'ok', ...r, elapsedSec: Number(elapsed) })
  } catch (err) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`FAIL ${err.message} (${elapsed}s)`)
    summary.push({ status: 'fail', name, url, error: err.message, elapsedSec: Number(elapsed) })
  }
}

await browser.close()

console.log('\n──── 요약 ────')
const ok = summary.filter(s => s.status === 'ok')
const fail = summary.filter(s => s.status === 'fail')
console.log(`성공: ${ok.length} / ${TARGETS.length}`)
console.log(`실패: ${fail.length}`)
if (fail.length) {
  console.log('\n실패 목록:')
  for (const f of fail) console.log(`  - ${f.name}: ${f.error}`)
}

await fs.writeFile(
  path.join(PDFS_DIR, '_summary.json'),
  JSON.stringify(summary, null, 2)
)
console.log(`\n요약 저장: ${path.join(PDFS_DIR, '_summary.json')}`)
