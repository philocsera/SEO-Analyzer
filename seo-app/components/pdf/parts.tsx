import { Text, View } from '@react-pdf/renderer'
import { s, C, CONTENT_W } from './styles'

export function PageHeader({ section, url }: { section: string; url: string }) {
  const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
  return (
    <View fixed style={s.pageHeader}>
      <Text style={s.pageHeaderBrand}>SEO REPORT · {hostname}</Text>
      <Text style={s.pageHeaderSection}>{section}</Text>
    </View>
  )
}

export function PageFooter({ url }: { url: string }) {
  const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
  return (
    <View fixed style={s.pageFooter}>
      <Text style={s.pageFooterUrl}>{hostname}</Text>
      <Text
        style={s.pageFooterPage}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

// minPresenceAhead: 섹션 제목이 외톨이로 페이지 끝에 남지 않도록, 다음 콘텐츠가 들어갈
// 최소 공간을 예약한다. 기본 120pt = 헤더 + 첫 콘텐츠 한 덩어리(개선 카드·문단 등)가
// 들어갈 정도. 더 큰 첫 콘텐츠가 따라오는 섹션은 호출부에서 override.
export function SectionHeader({
  title,
  minPresenceAhead = 120,
}: {
  title: string
  minPresenceAhead?: number
}) {
  return (
    <View style={s.sectionHeader} minPresenceAhead={minPresenceAhead}>
      <View style={s.sectionAccentBar} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

export function TechStatsBar({ items }: { items: { status: string }[] }) {
  const total = items.length
  if (total === 0) return null
  const passCount = items.filter(i => i.status === 'pass').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const failCount = items.filter(i => i.status === 'fail').length

  return (
    <View style={s.statsBarContainer} wrap={false}>
      <View style={s.statsBarTrack}>
        {passCount > 0 && (
          <View style={{ width: (passCount / total) * CONTENT_W, backgroundColor: C.green }} />
        )}
        {warnCount > 0 && (
          <View style={{ width: (warnCount / total) * CONTENT_W, backgroundColor: C.amber }} />
        )}
        {failCount > 0 && (
          <View style={{ width: (failCount / total) * CONTENT_W, backgroundColor: C.red }} />
        )}
      </View>
      <View style={s.statsLabelRow}>
        <View style={s.statsLabelItem}>
          <View style={[s.statsLabelDot, { backgroundColor: C.green }]} />
          <Text style={s.statsLabelText}>통과 {passCount}개 ({Math.round(passCount / total * 100)}%)</Text>
        </View>
        <View style={s.statsLabelItem}>
          <View style={[s.statsLabelDot, { backgroundColor: C.amber }]} />
          <Text style={s.statsLabelText}>주의 {warnCount}개 ({Math.round(warnCount / total * 100)}%)</Text>
        </View>
        <View style={s.statsLabelItem}>
          <View style={[s.statsLabelDot, { backgroundColor: C.red }]} />
          <Text style={s.statsLabelText}>실패 {failCount}개 ({Math.round(failCount / total * 100)}%)</Text>
        </View>
      </View>
    </View>
  )
}
