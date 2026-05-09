// Barrel re-export. 기존 import 경로(`@/lib/crawler`)를 보존하기 위한 진입점.
// 실제 구현은 lib/crawler/ 하위 모듈로 분리되어 있다.

export type { CrawlData } from './crawler/parse'
export { crawlUrl } from './crawler/parse'
export { buildSeoChecklist, buildSmartStoreSeoChecklist } from './crawler/checklist'
