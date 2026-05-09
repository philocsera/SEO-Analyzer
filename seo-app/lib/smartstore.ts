import { SmartStoreProduct } from '@/types/analysis'
import { fetchStoreProducts } from './naver-shopping'

export function isSmartStore(url: string): boolean {
  return url.includes('smartstore.naver.com') || url.includes('brand.naver.com')
}

export function isBrandStore(url: string): boolean {
  return url.includes('brand.naver.com')
}

export function extractStoreSlug(url: string): string {
  const match = url.match(/(?:smartstore|brand)\.naver\.com\/([^/?#]+)/)
  return match?.[1] || ''
}

export async function parseSmartStore(url: string): Promise<{
  storeName: string
  products: SmartStoreProduct[]
  categories: string[]
}> {
  const slug = extractStoreSlug(url)
  if (!slug) return { storeName: '알 수 없음', products: [], categories: [] }

  return fetchStoreProducts(slug, isBrandStore(url))
}
