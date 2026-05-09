import { StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: '/fonts/NanumGothic-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NanumGothic-Bold.ttf', fontWeight: 700 },
  ],
})

// A4 595pt - 좌우 패딩 48*2 = 499pt
export const CONTENT_W = 499

export const C = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#21262d',
  border: '#30363d',
  accent: '#6366f1',
  accentLight: '#818cf8',
  green: '#10b981',
  greenBg: '#052e16',
  amber: '#f59e0b',
  amberBg: '#1c1400',
  red: '#ef4444',
  redBg: '#1c0000',
  blue: '#3b82f6',
  blueBg: '#0c1a2e',
  textPrimary: '#f0f6fc',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  coverBg: '#010409',
  headerBar: '#161b22',
}

export const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    fontFamily: 'NanumGothic',
    paddingHorizontal: 48,
    paddingTop: 72,
    paddingBottom: 56,
  },

  // ── 고정 헤더 ──────────────────────────────────────────────────
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: C.headerBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageHeaderBrand: {
    fontSize: 9,
    color: C.accent,
    fontWeight: 700,
    letterSpacing: 1,
  },
  pageHeaderSection: {
    fontSize: 9,
    color: C.textSecondary,
  },

  // ── 고정 푸터 ──────────────────────────────────────────────────
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  pageFooterUrl: { fontSize: 8, color: C.textMuted },
  pageFooterPage: { fontSize: 8, color: C.textMuted },

  // ── 표지 ──────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: C.coverBg,
    fontFamily: 'NanumGothic',
    padding: 0,
  },
  coverHero: {
    backgroundColor: '#0d1117',
    borderBottomWidth: 3,
    borderBottomColor: C.accent,
    paddingHorizontal: 48,
    paddingTop: 56,
    paddingBottom: 40,
    alignItems: 'center',
  },
  coverBadge: {
    fontSize: 9,
    color: C.accent,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    letterSpacing: 1.5,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverUrl: {
    fontSize: 12,
    color: C.accentLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  coverDate: {
    fontSize: 10,
    color: C.textSecondary,
    textAlign: 'center',
  },
  coverScoreWrap: {
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
  },
  coverScoreLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  coverScoreNum: {
    fontSize: 76,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1,
  },
  coverScoreSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  coverGradeBadge: {
    fontSize: 11,
    fontWeight: 700,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    alignSelf: 'center',
    marginTop: 10,
  },
  coverProgressTrack: {
    height: 8,
    backgroundColor: C.surface2,
    borderRadius: 4,
    marginTop: 18,
    width: CONTENT_W,
  },
  coverGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 48,
    paddingBottom: 12,
  },
  coverCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  coverCardLabel: {
    fontSize: 9,
    color: C.textSecondary,
    marginBottom: 5,
  },
  coverCardValue: {
    fontSize: 13,
    fontWeight: 700,
    color: C.textPrimary,
  },
  coverDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 48,
    marginBottom: 24,
    marginTop: 8,
  },

  coverInsightSection: {
    paddingHorizontal: 48,
    paddingBottom: 28,
  },
  coverInsightTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  coverInsightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  coverInsightDot: {
    width: 5,
    height: 5,
    backgroundColor: C.accent,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 4,
  },
  coverInsightText: {
    flex: 1,
    fontSize: 10,
    color: '#c9d1d9',
    lineHeight: 1.5,
  },

  // ── 섹션 ──────────────────────────────────────────────────────
  // marginTop을 24pt로 두어 섹션 간 시각적 호흡 공간 확보. 첫 섹션은 page paddingTop(72pt)
  // 위에 추가로 24pt가 더해져 ~96pt 아래에 시작 — 페이지 헤더(44pt) 밑으로 충분히 떨어진다.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 24,
  },
  sectionAccentBar: {
    width: 3,
    height: 18,
    backgroundColor: C.accent,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: C.textPrimary,
  },

  // 기술 SEO 통계 바
  statsBarContainer: {
    marginBottom: 16,
  },
  statsBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 7,
    backgroundColor: C.surface2,
  },
  statsLabelRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statsLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsLabelText: {
    fontSize: 9,
    color: C.textSecondary,
  },

  // ── SEO 체크리스트 ────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  checkIcon: {
    width: 20,
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center',
  },
  checkLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    paddingLeft: 6,
  },
  checkValue: {
    flex: 2,
    fontSize: 10,
    paddingLeft: 8,
    color: C.textSecondary,
  },

  // ── 카드 / 인포 박스 ──────────────────────────────────────────
  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  infoCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoLabel: { fontSize: 9, color: C.textSecondary, marginBottom: 4 },
  // 본문(s.paragraph)과 동일한 폰트 사이즈·색상으로 통일. 카드 안에서의 강조는 infoLabel과의 대비로만 표현.
  infoValue: { fontSize: 10, color: '#c9d1d9' },

  paragraph: {
    fontSize: 10,
    color: '#c9d1d9',
    lineHeight: 1.7,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 10,
    color: '#c9d1d9',
    marginBottom: 5,
    paddingLeft: 10,
  },

  storyBox: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    marginBottom: 10,
  },

  numCircle: {
    width: 20,
    height: 20,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  numCircleText: {
    fontSize: 9,
    fontWeight: 700,
    color: C.accentLight,
    textAlign: 'center',
    paddingTop: 4,
  },

  // ── 개선 제안 카드 ────────────────────────────────────────────
  impCard: {
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  impCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  impNum: {
    fontSize: 9,
    fontWeight: 700,
    color: C.textMuted,
    minWidth: 18,
  },
  impPriorityBadge: {
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
  },
  impCategoryBadge: {
    fontSize: 8,
    color: C.textSecondary,
    backgroundColor: C.surface2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
  },
  impTitle: {
    fontSize: 11,
    fontWeight: 700,
    flex: 1,
  },
  impBody: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  impDetail: {
    fontSize: 10,
    color: '#c9d1d9',
    lineHeight: 1.6,
  },

  // ── 키워드 칩 ─────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    fontSize: 10,
    color: C.accentLight,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#312e81',
  },

  // ── 스마트스토어 상품 테이블 ──────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.surface2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeadCell: {
    fontSize: 9,
    fontWeight: 700,
    color: C.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
  },
  tableCell: { fontSize: 10, color: '#c9d1d9' },
})
