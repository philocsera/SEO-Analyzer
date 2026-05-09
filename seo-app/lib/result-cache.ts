import { AnalysisResult } from '@/types/analysis'

const KEY_PREFIX   = 'seo_result:'
const INDEX_KEY    = 'seo_result_index'
const MAX_ITEMS    = 10
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24시간

function indexKey(url: string) {
  return KEY_PREFIX + encodeURIComponent(url)
}

function readIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeIndex(urls: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(urls))
}

export function saveResult(result: AnalysisResult) {
  try {
    const key = indexKey(result.url)
    localStorage.setItem(key, JSON.stringify(result))

    const index = readIndex().filter(u => u !== result.url)
    index.unshift(result.url)
    if (index.length > MAX_ITEMS) {
      const removed = index.splice(MAX_ITEMS)
      removed.forEach(u => localStorage.removeItem(indexKey(u)))
    }
    writeIndex(index)
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

export function loadResult(url: string): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(indexKey(url))
    return raw ? (JSON.parse(raw) as AnalysisResult) : null
  } catch {
    return null
  }
}

export function loadResultIfFresh(url: string): AnalysisResult | null {
  const result = loadResult(url)
  if (!result) return null
  const age = Date.now() - new Date(result.analyzedAt).getTime()
  return age < CACHE_TTL_MS ? result : null
}

export interface HistoryEntry {
  url: string
  overallScore: number
  analyzedAt: string
}

export function loadHistory(): HistoryEntry[] {
  const index = readIndex()
  return index.flatMap(url => {
    const result = loadResult(url)
    if (!result) return []
    return [{ url: result.url, overallScore: result.overallScore, analyzedAt: result.analyzedAt }]
  })
}

export function deleteResult(url: string) {
  try {
    localStorage.removeItem(indexKey(url))
    writeIndex(readIndex().filter(u => u !== url))
  } catch {}
}

export function clearHistory() {
  try {
    readIndex().forEach(u => localStorage.removeItem(indexKey(u)))
    localStorage.removeItem(INDEX_KEY)
  } catch {}
}
