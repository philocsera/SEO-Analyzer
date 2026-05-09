'use client'

import {
  Document,
  Page,
  Text,
  View,
  PDFDownloadLink,
} from '@react-pdf/renderer'
import { AnalysisResult } from '@/types/analysis'
import { Download } from 'lucide-react'
import { s, C, CONTENT_W } from './pdf/styles'
import { scoreColor, scoreGrade, checkColors, impColors, priorityLabel, searchVolumeColor, competitionColor } from './pdf/utils'
import { PageHeader, PageFooter, SectionHeader, TechStatsBar } from './pdf/parts'

interface DocProps { result: AnalysisResult }

const ReportDocument = ({ result }: DocProps) => {
  const sc = scoreColor(result.overallScore)
  const grade = scoreGrade(result.overallScore)
  const progWidth = Math.round((result.overallScore / 100) * CONTENT_W)
  const insights = result.ai.differentiators.slice(0, 3)

  return (
    <Document title={`SEO 분석 보고서 - ${result.url}`}>

      {/* ════ 표지 ════ */}
      <Page size="A4" style={s.coverPage}>
        {/* 상단 히어로 */}
        <View style={s.coverHero}>
          <Text style={s.coverBadge}>SEO ANALYSIS REPORT</Text>
          <Text style={s.coverTitle}>SEO 분석 보고서</Text>
          <Text style={s.coverUrl}>{result.url}</Text>
          <Text style={s.coverDate}>
            {new Date(result.analyzedAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        </View>

        {/* 점수 섹션 */}
        <View style={s.coverScoreWrap}>
          <Text style={s.coverScoreLabel}>종합 SEO 점수</Text>
          <Text style={[s.coverScoreNum, { color: sc }]}>{result.overallScore}</Text>
          <Text style={s.coverScoreSub}>/ 100</Text>

          {/* 등급 배지 */}
          <Text style={[s.coverGradeBadge, { color: grade.color, borderColor: grade.color }]}>
            {grade.label}
          </Text>

          {/* 점수 프로그레스 바 */}
          <View style={s.coverProgressTrack}>
            <View style={{
              height: 8,
              width: progWidth,
              backgroundColor: sc,
              borderRadius: 4,
            }} />
          </View>
        </View>

        <View style={s.coverDivider} />

        {/* 요약 카드 그리드 */}
        <View style={s.coverGrid}>
          <View style={s.coverCard}>
            <Text style={s.coverCardLabel}>기술 SEO 점수</Text>
            <Text style={[s.coverCardValue, { color: scoreColor(result.technical.score) }]}>
              {result.technical.score} / 100
            </Text>
          </View>
          <View style={s.coverCard}>
            <Text style={s.coverCardLabel}>추정 업종</Text>
            <Text style={[s.coverCardValue, { fontSize: 10, fontWeight: 400, color: '#c9d1d9' }]}>{result.ai.industry}</Text>
          </View>
          <View style={s.coverCard}>
            <Text style={s.coverCardLabel}>기업 규모</Text>
            <Text style={[s.coverCardValue, { fontSize: 10, fontWeight: 400, color: '#c9d1d9' }]}>{result.ai.businessSize}</Text>
          </View>
        </View>

        {/* 체크 통계 */}
        <View style={[s.coverGrid, { paddingBottom: 20 }]}>
          {[
            { label: '통과', count: result.technical.items.filter(i => i.status === 'pass').length, color: C.green },
            { label: '주의', count: result.technical.items.filter(i => i.status === 'warn').length, color: C.amber },
            { label: '실패', count: result.technical.items.filter(i => i.status === 'fail').length, color: C.red },
            { label: '전체', count: result.technical.items.length, color: C.textSecondary },
          ].map((stat) => (
            <View key={stat.label} style={[s.coverCard, { alignItems: 'center' }]}>
              <Text style={[s.coverCardValue, { fontSize: 20, color: stat.color }]}>{stat.count}</Text>
              <Text style={s.coverCardLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* AI 핵심 인사이트 프리뷰 */}
        {insights.length > 0 && (
          <View style={s.coverInsightSection}>
            <Text style={s.coverInsightTitle}>AI 핵심 차별화 포인트</Text>
            {insights.map((insight, i) => (
              <View key={i} style={s.coverInsightItem}>
                <View style={s.coverInsightDot} />
                <Text style={s.coverInsightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* ════ 기술 SEO ~ 경쟁사 분석 (하나의 흐름) ════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="SEO 분석 보고서" url={result.url} />
        <PageFooter url={result.url} />

        {/* 기술 SEO 체크리스트 */}
        <SectionHeader title="기술 SEO 체크리스트" />
        <TechStatsBar items={result.technical.items} />
        {result.technical.items.map((item, i) => {
          const clr = checkColors(item.status)
          const icon = item.status === 'pass' ? '✓' : item.status === 'warn' ? '⚠' : '✗'
          return (
            <View key={i} style={[s.checkRow, { backgroundColor: clr.bg }]} wrap={false}>
              <Text style={[s.checkIcon, { color: clr.icon }]}>{icon}</Text>
              <Text style={[s.checkLabel, { color: clr.text }]}>{item.label}</Text>
              <Text style={s.checkValue}>{item.value}</Text>
            </View>
          )
        })}

        {/* 기술 개선 필요 항목 — 헤더 + 첫 N개 항목을 같이 묶어서 페이지 분리 방지.
            나머지 항목(많은 경우)은 자연 흐름으로 다음 페이지에 이어진다. 항목 수가 많을 때
            전체를 wrap={false}로 묶으면 페이지 높이를 초과할 수 있어 청크로 분할. */}
        {(() => {
          const failedItems = result.technical.items.filter(i => i.status !== 'pass' && i.suggestion)
          if (!failedItems.length) return null
          const renderItem = (item: typeof failedItems[number], k: number) => (
            <View key={k} style={{ marginBottom: 7, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: item.status === 'fail' ? C.red : C.amber }} wrap={false}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: item.status === 'fail' ? '#fca5a5' : '#fcd34d', marginBottom: 2 }}>
                {item.label}
              </Text>
              <Text style={s.paragraph}>{item.suggestion}</Text>
            </View>
          )
          const HEAD = 3
          const head = failedItems.slice(0, HEAD)
          const tail = failedItems.slice(HEAD)
          return (
            <>
              <View wrap={false}>
                <View style={{ marginTop: 12 }}>
                  <SectionHeader title="기술 개선 필요 항목" />
                </View>
                {head.map((item, i) => renderItem(item, i))}
              </View>
              {tail.map((item, i) => renderItem(item, HEAD + i))}
            </>
          )
        })()}

        {/* AI 브랜드 분석 */}
        <View style={{ marginTop: 12 }}>
          <SectionHeader title="브랜드 개요" />
        </View>
        <View style={s.infoGrid} wrap={false}>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>추정 업종</Text>
            <Text style={s.infoValue}>{result.ai.industry}</Text>
          </View>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>기업 규모</Text>
            <Text style={s.infoValue}>{result.ai.businessSize}</Text>
          </View>
        </View>

        <SectionHeader title="핵심 타깃 고객" />
        <Text style={s.paragraph}>{result.ai.targetAudience}</Text>

        <SectionHeader title="브랜드 스토리" />
        <View style={s.storyBox}>
          <Text style={[s.paragraph, { marginBottom: 0, lineHeight: 1.8 }]}>{result.ai.brandStory}</Text>
        </View>

        {result.ai.differentiators.length > 0 && (
          <>
            <SectionHeader title="차별화 포인트" />
            {result.ai.differentiators.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }} wrap={false}>
                <View style={s.numCircle}><Text style={s.numCircleText}>{i + 1}</Text></View>
                <Text style={[s.paragraph, { marginBottom: 0, flex: 1 }]}>{d}</Text>
              </View>
            ))}
          </>
        )}

        {/* 마케팅 전략 */}
        <View style={{ marginTop: 10 }}>
          <SectionHeader title="마케팅 전략 제안" />
        </View>
        <Text style={s.paragraph}>{result.ai.marketingStrategy}</Text>

        {/* 우선순위별 개선 항목 — AI 응답이 5개 고정. 헤더 + 첫 2개를 묶고, 나머지는 자연 흐름.
            5개 카드 전체(약 500pt+)는 페이지 한 장에 못 들어갈 수 있어 청크로 분할. */}
        {(() => {
          if (!result.ai.improvements.length) return null
          const renderCard = (imp: typeof result.ai.improvements[number], k: number) => {
            const clr = impColors(imp.priority)
            return (
              <View key={k} style={[s.impCard, { borderColor: clr.border }]} wrap={false}>
                <View style={[s.impCardHead, { backgroundColor: clr.headBg }]}>
                  <Text style={s.impNum}>{String(k + 1).padStart(2, '0')}</Text>
                  <Text style={[s.impPriorityBadge, { backgroundColor: clr.badgeBg, color: clr.badgeText }]}>{priorityLabel(imp.priority)}</Text>
                  <Text style={s.impCategoryBadge}>{imp.category}</Text>
                  <Text style={[s.impTitle, { color: clr.titleColor }]}>{imp.title}</Text>
                </View>
                <View style={[s.impBody, { backgroundColor: C.surface }]}>
                  <Text style={s.impDetail}>{imp.detail}</Text>
                </View>
              </View>
            )
          }
          const HEAD = 2
          const head = result.ai.improvements.slice(0, HEAD)
          const tail = result.ai.improvements.slice(HEAD)
          return (
            <>
              <View wrap={false}>
                <View style={{ marginTop: 8 }}>
                  <SectionHeader title="우선순위별 개선 항목" />
                </View>
                {head.map((imp, i) => renderCard(imp, i))}
              </View>
              {tail.map((imp, i) => renderCard(imp, HEAD + i))}
            </>
          )
        })()}

        {result.keywords.length > 0 && (
          <>
            <View style={{ marginTop: 8 }}>
              <SectionHeader title="추천 SEO 키워드" />
            </View>
            <View style={s.tableHead} wrap={false}>
              <Text style={[s.tableHeadCell, { flex: 0.5 }]}>#</Text>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>키워드</Text>
              <Text style={[s.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>검색량</Text>
              <Text style={[s.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>경쟁도</Text>
            </View>
            {result.keywords.map((kw, i) => (
              <View key={i} style={s.tableRow} wrap={false}>
                <Text style={[s.tableCell, { flex: 0.5, color: C.textMuted }]}>{i + 1}</Text>
                <Text style={[s.tableCell, { flex: 3, color: C.accentLight }]}>{kw.keyword}</Text>
                <Text style={[s.tableCell, { flex: 1.2, textAlign: 'right', color: searchVolumeColor(kw.searchVolume), fontWeight: 700 }]}>
                  {kw.searchVolume}
                </Text>
                <Text style={[s.tableCell, { flex: 1.2, textAlign: 'right', color: competitionColor(kw.competition), fontWeight: 700 }]}>
                  {kw.competition}
                </Text>
              </View>
            ))}
          </>
        )}

      </Page>

      {/* ════ 스마트스토어 분석 ════ */}
      {result.smartstore && result.smartstore.products.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader section="스마트스토어 분석" url={result.url} />
          <PageFooter url={result.url} />

          <SectionHeader title="스마트스토어 개요" />
          <View style={s.infoGrid} wrap={false}>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>스토어명</Text>
              <Text style={s.infoValue}>{result.smartstore.storeName}</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>상품 수</Text>
              <Text style={s.infoValue}>{result.smartstore.products.length}개</Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <SectionHeader title="상품 목록 (상위 10개)" />
          </View>
          <View style={s.tableHead} wrap={false}>
            <Text style={[s.tableHeadCell, { flex: 3 }]}>상품명</Text>
            <Text style={[s.tableHeadCell, { flex: 1, textAlign: 'right' }]}>가격</Text>
            <Text style={[s.tableHeadCell, { flex: 1, textAlign: 'right' }]}>키워드 수</Text>
          </View>
          {result.smartstore.products.slice(0, 10).map((p, i) => (
            <View key={i} style={s.tableRow} wrap={false}>
              <Text style={[s.tableCell, { flex: 3 }]}>{p.name}</Text>
              <Text style={[s.tableCell, { flex: 1, textAlign: 'right', color: C.accentLight }]}>{p.price}</Text>
              <Text style={[s.tableCell, { flex: 1, textAlign: 'right', color: C.textSecondary }]}>{p.keywords.length}개</Text>
            </View>
          ))}
        </Page>
      )}
    </Document>
  )
}

interface Props { result: AnalysisResult }

export default function PdfReport({ result }: Props) {
  const filename = `SEO분석_${(() => { try { return new URL(result.url).hostname } catch { return 'report' } })()}_${new Date(result.analyzedAt).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.pdf`

  return (
    <PDFDownloadLink document={<ReportDocument result={result} />} fileName={filename}>
      {({ loading }) => (
        <button
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          {loading ? 'PDF 생성 중...' : 'PDF 보고서 다운로드'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
