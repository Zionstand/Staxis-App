/**
 * STAXIS design system — React Native theme.
 *
 * Every token here is extracted from the canonical design reference
 * (design-reference/staxis-app.css :root + component styles).
 * Hex values and rgba opacities are authoritative — do not adjust.
 *
 * RN has no cascade, clamp(), pseudo-elements or variable-font axes, so:
 *  - fluid clamp() sizes become fixed sizes (scale with useWindowDimensions
 *    at the call site if a screen needs to respond),
 *  - the Fraunces opsz axis is baked into the shipped static cut
 *    (assets/fonts/Fraunces-Display*.ttf = the 144pt display cut),
 *  - font weight is selected by picking the right fontFamily, NOT by
 *    fontWeight — custom fonts on Android ignore numeric weights.
 */

import { TextStyle, ViewStyle } from 'react-native';

// ── Colour ──────────────────────────────────────────────────────────────────
export const Palette = {
  ink: '#0A0A0F',
  ink2: '#14141B',
  slate: '#22222C',

  bone: '#F5F2EC',
  bone2: '#EFEBE3',
  ash: '#E2DDD3',

  signal: '#B01E28',
  signal2: '#8B1720',
  signalTint: '#FBEEEF',
  signalGlow: 'rgba(176,30,40,0.14)',
  ember: '#E8B547',
  emberTint: '#FBF3DD',

  success: '#1F7A4A',
  successTint: '#E4F3EA',
  warn: '#B87A00',
  warnTint: '#FBF0D8',
  info: '#1E5FB0',
  infoTint: '#E4EEF9',

  positiveLive: '#7ADB8F',
  dangerIcon: '#E56370',
} as const;

export const Colors = {
  bgApp: '#FAF7F1',
  bgCard: '#FFFFFF',
  bgSidebar: Palette.bone,

  text: Palette.ink,
  text2: 'rgba(10,10,15,0.65)',
  text3: 'rgba(10,10,15,0.48)',

  textOnDark: Palette.bone,
  textMuteOnDark: 'rgba(245,242,236,0.62)',

  line: 'rgba(10,10,15,0.08)',
  lineStrong: 'rgba(10,10,15,0.14)',
  lineOnDark: 'rgba(255,255,255,0.08)',

  hover: 'rgba(10,10,15,0.05)',
} as const;

// ── Typography ─────────────────────────────────────────────────────────────
export const FontFamily = {
  display: 'Fraunces-Display',
  displayItalic: 'Fraunces-DisplayItalic',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

/** Display scale — fixed equivalents of the web clamp() range. */
export const Type = {
  // Display headings
  displayXl: { fontFamily: FontFamily.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2 } as TextStyle,
  displayLg: { fontFamily: FontFamily.display, fontSize: 36, lineHeight: 38, letterSpacing: -0.9 } as TextStyle,
  displayMd: { fontFamily: FontFamily.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.6 } as TextStyle,
  displaySm: { fontFamily: FontFamily.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 } as TextStyle,

  // Italic accent word inside a heading
  accent: { fontFamily: FontFamily.displayItalic, color: Palette.signal } as TextStyle,
  accentOnDark: { fontFamily: FontFamily.displayItalic, color: Palette.ember } as TextStyle,

  // Body text
  bodyLg: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 26, color: Colors.text2 } as TextStyle,
  bodyMd: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 24, color: Colors.text2 } as TextStyle,
  bodySm: { fontFamily: FontFamily.body, fontSize: 13, lineHeight: 20, color: Colors.text2 } as TextStyle,
  bodyBase: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 21, color: Colors.text } as TextStyle,

  // Page chrome
  pageTitle: { fontFamily: FontFamily.bodyBold, fontSize: 28, letterSpacing: -0.56, color: Colors.text } as TextStyle,
  pageSub: { fontFamily: FontFamily.body, fontSize: 14, color: Colors.text2 } as TextStyle,

  // Card typography
  cardTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 15, letterSpacing: -0.075, color: Colors.text } as TextStyle,
  cardSub: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text2 } as TextStyle,
  cardLink: { fontFamily: FontFamily.bodyMedium, fontSize: 12.5, color: Colors.text2 } as TextStyle,

  // Section label — mono uppercase (CSS: .section-label)
  sectionLabel: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.47, // 0.14em × 10.5px
    textTransform: 'uppercase' as const,
    color: Colors.text2,
  } as TextStyle,

  // Metric cards (CSS: .metric-*)
  metricValue: { fontFamily: FontFamily.bodyBold, fontSize: 26, letterSpacing: -0.52, lineHeight: 27.3, color: Colors.text } as TextStyle,
  metricValueLg: { fontFamily: FontFamily.bodyBold, fontSize: 32, letterSpacing: -0.64, color: Colors.text } as TextStyle,
  metricLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Colors.text2 } as TextStyle,
  metricFoot: { fontFamily: FontFamily.body, fontSize: 11.5, color: Colors.text2 } as TextStyle,

  // Table (CSS: th, td)
  tableHeader: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10.5,
    letterSpacing: 0.84, // 0.08em × 10.5px
    textTransform: 'uppercase' as const,
    color: Colors.text2,
  } as TextStyle,
  tableCell: { fontFamily: FontFamily.body, fontSize: 13.5, color: Colors.text } as TextStyle,
  tableCellSub: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.text2 } as TextStyle,
  tableCellMono: { fontFamily: FontFamily.mono, fontSize: 12.5, color: Colors.text } as TextStyle,

  // Buttons (CSS: .btn)
  btn: { fontFamily: FontFamily.bodyMedium, fontSize: 13.5 } as TextStyle,
  btnSm: { fontFamily: FontFamily.bodyMedium, fontSize: 12.5 } as TextStyle,
  btnLg: { fontFamily: FontFamily.bodyMedium, fontSize: 14.5 } as TextStyle,

  // Tags / pills (CSS: .tag)
  tag: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    letterSpacing: 0.6, // 0.06em × 10px
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // Forms (CSS: .form-*)
  formLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 12.5, color: Colors.text } as TextStyle,
  formInput: { fontFamily: FontFamily.body, fontSize: 14, color: Colors.text } as TextStyle,
  formHint: { fontFamily: FontFamily.body, fontSize: 11.5, color: Colors.text2 } as TextStyle,

  // Banner (CSS: .banner-*)
  bannerTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 14, color: Colors.text } as TextStyle,
  bannerBody: { fontFamily: FontFamily.body, fontSize: 13.5, color: Colors.text2 } as TextStyle,
  bannerAction: { fontFamily: FontFamily.bodyMedium, fontSize: 13 } as TextStyle,

  // Modal (CSS: .modal-*)
  modalTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 16, color: Colors.text } as TextStyle,

  // Lists (CSS: .list-*)
  listTitle: { fontFamily: FontFamily.bodyMedium, fontSize: 13, lineHeight: 16.9, color: Colors.text } as TextStyle,
  listSub: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.text2 } as TextStyle,
  listTime: { fontFamily: FontFamily.mono, fontSize: 11.5, color: Colors.text3 } as TextStyle,

  // Navigation (CSS: .nav-link)
  navLink: { fontFamily: FontFamily.body, fontSize: 14, color: Colors.text } as TextStyle,
  navBadge: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    letterSpacing: 0.5, // 0.05em × 10px
    textTransform: 'uppercase' as const,
    color: Colors.text2,
  } as TextStyle,

  // Profile (CSS: .profile-*)
  profileName: { fontFamily: FontFamily.bodyMedium, fontSize: 13, color: Colors.text } as TextStyle,
  profileEmail: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.text2 } as TextStyle,

  // Brand (CSS: .brand-*)
  brandName: { fontFamily: FontFamily.bodyBold, fontSize: 15, letterSpacing: -0.15, color: Colors.text } as TextStyle,
  brandRole: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.text2 } as TextStyle,

  // SLA (CSS: .sla-*)
  slaTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 13.5, color: Colors.text } as TextStyle,
  slaSub: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text2 } as TextStyle,
  slaProgress: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text } as TextStyle,
  slaProgressBold: { fontFamily: FontFamily.monoMedium, fontSize: 12.5, color: Colors.text } as TextStyle,

  // Breakdown / analytics rows
  breakdownTitle: { fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Colors.text2 } as TextStyle,
  breakdownRow: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.text } as TextStyle,
  breakdownLabel: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text } as TextStyle,
  breakdownValue: { fontFamily: FontFamily.mono, fontSize: 11, color: Colors.text2 } as TextStyle,

  // Search (CSS: .search-input)
  searchInput: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.text } as TextStyle,
  filterSelect: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text } as TextStyle,

  // Donut chart labels
  donutTotal: { fontFamily: FontFamily.bodyBold, fontSize: 24, letterSpacing: -0.48, color: Colors.text } as TextStyle,
  donutLabel: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.text2 } as TextStyle,
  legendItem: { fontFamily: FontFamily.body, fontSize: 12.5, color: Colors.text } as TextStyle,

  // Conversion hero
  conversionValue: { fontFamily: FontFamily.body, fontSize: 56, letterSpacing: -1.68, color: Colors.text3 } as TextStyle,
  conversionUnit: { fontFamily: FontFamily.body, fontSize: 32, color: Colors.text3 } as TextStyle,
  conversionLabel: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.text2 } as TextStyle,

  // Plan status
  planStatusValue: { fontFamily: FontFamily.bodyBold, fontSize: 26, letterSpacing: -0.52, color: Colors.text } as TextStyle,
  planStatusSub: { fontFamily: FontFamily.body, fontSize: 12.5, color: Palette.warn } as TextStyle,

  // Empty state
  emptyTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 15, color: Colors.text } as TextStyle,
  emptySub: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.text2 } as TextStyle,

  // Refresh / action links
  refreshBtn: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.text2 } as TextStyle,
  cardAction: { fontFamily: FontFamily.bodyMedium, fontSize: 12.5, color: Palette.signal } as TextStyle,
  infoLine: { fontFamily: FontFamily.body, fontSize: 12.5, color: Palette.success } as TextStyle,

  // Eyebrow — JetBrains Mono uppercase wide-tracked signal red
  eyebrow: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: Palette.signal,
  } as TextStyle,

  // Inline mono (codes, timestamps, prices, units)
  mono: { fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 0.2 } as TextStyle,
  label: { fontFamily: FontFamily.bodyMedium, fontSize: 13, color: Colors.text } as TextStyle,

  // Chart axis labels (CSS: .bar-y-labels, .bar-col .bar-label)
  chartAxis: { fontFamily: FontFamily.mono, fontSize: 10, color: Colors.text3 } as TextStyle,
  chartTooltip: { fontFamily: FontFamily.mono, fontSize: 11, color: Palette.bone } as TextStyle,
} as const;

// ── Shape ──────────────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Elevation ──────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
    elevation: 8,
  } as ViewStyle,
} as const;

// ── Motion ─────────────────────────────────────────────────────────────────
export const Motion = { fast: 200, base: 250, panel: 380 } as const;

// ── Layout constants ───────────────────────────────────────────────────────
export const Layout = {
  sidebarWidth: 248,
  sidebarCollapsedWidth: 72,
  topbarHeight: 60,
  contentPadding: 32,
  contentPaddingMobile: 16,
  topbarPadding: 32,
  topbarPaddingMobile: 16,
} as const;

// ── Component tokens ───────────────────────────────────────────────────────
/** Button padding presets matching the design reference. */
export const ButtonSize = {
  default: { paddingVertical: 9, paddingHorizontal: 16 },
  sm: { paddingVertical: 6, paddingHorizontal: 12 },
  lg: { paddingVertical: 12, paddingHorizontal: 20 },
  icon: { padding: 8 },
} as const;

/** Card padding presets. */
export const CardSize = {
  default: { padding: 20 },
  lg: { padding: 24 },
} as const;

/** Form input padding. */
export const FormSize = {
  input: { paddingVertical: 10, paddingHorizontal: 12 },
  label: { marginBottom: 6 },
  group: { marginBottom: 16 },
  hint: { marginTop: 4 },
  textarea: { minHeight: 120 },
} as const;

/** Banner padding. */
export const BannerSize = {
  padding: { paddingVertical: 14, paddingHorizontal: 20 },
  gap: 14,
  marginBottom: 20,
} as const;

/** Modal dimensions. */
export const ModalSize = {
  maxWidth: 540,
  headerPadding: { paddingVertical: 20, paddingHorizontal: 24 },
  bodyPadding: 24,
  footerPadding: { paddingVertical: 16, paddingHorizontal: 24 },
  footerGap: 8,
} as const;

/** Metric card dimensions. */
export const MetricSize = {
  padding: 16,
  paddingLg: 20,
  gap: 12,
  headMarginBottom: 12,
  valueMarginBottom: 6,
  iconSize: 14,
  iconSizeLg: 16,
  iconRoundSize: 36,
} as const;

/** Table dimensions. */
export const TableSize = {
  headerPadding: { paddingVertical: 12, paddingHorizontal: 20 },
  cellPadding: { paddingVertical: 14, paddingHorizontal: 20 },
  toolbarPadding: { paddingVertical: 14, paddingHorizontal: 20 },
  searchMaxWidth: 340,
} as const;

/** Navigation dimensions. */
export const NavSize = {
  linkPadding: { paddingVertical: 10, paddingHorizontal: 12 },
  linkGap: 12,
  iconSize: 18,
  sidebarBrandPadding: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16 },
  brandMarkSize: 36,
  brandMarkFontSize: 15,
  profileAvatarSize: 34,
  dividerMargin: 12,
} as const;

/** Icon button dimensions (CSS: .icon-btn). */
export const IconButtonSize = {
  size: 38,
  borderRadius: Radius.sm,
} as const;

/** Tag / pill padding. */
export const TagSize = {
  paddingVertical: 3,
  paddingHorizontal: 8,
} as const;

/** Empty state dimensions. */
export const EmptyStateSize = {
  paddingVertical: 60,
  paddingHorizontal: 24,
  iconSize: 48,
  iconMarginBottom: 16,
  titleMarginBottom: 6,
  subMaxWidth: 320,
  subMarginBottom: 16,
} as const;

/** SLA row dimensions. */
export const SlaSize = {
  rowPadding: 14,
  rowGap: 12,
  iconSize: 32,
  iconInner: 16,
  progressBarHeight: 6,
  noteMarginTop: 14,
  notePadding: { paddingVertical: 12, paddingHorizontal: 14 },
} as const;

/** Donut chart dimensions. */
export const DonutSize = {
  size: 180,
  legendGap: 16,
  legendMarginTop: 20,
  legendDotSize: 10,
} as const;

/** Bar chart dimensions. */
export const BarChartSize = {
  height: 260,
  barGap: 8,
  barRadius: 3,
} as const;

/** Chat widget dimensions. */
export const ChatWidgetSize = {
  fabSize: 52,
  fabRight: 24,
  fabBottom: 24,
  bubblePadding: { paddingVertical: 10, paddingHorizontal: 14 },
} as const;

// ── Aggregate export ───────────────────────────────────────────────────────
export const StaxisTheme = {
  Palette,
  Colors,
  FontFamily,
  Type,
  Radius,
  Spacing,
  Shadow,
  Motion,
  Layout,
  ButtonSize,
  CardSize,
  FormSize,
  BannerSize,
  ModalSize,
  MetricSize,
  TableSize,
  NavSize,
  IconButtonSize,
  TagSize,
  EmptyStateSize,
  SlaSize,
  DonutSize,
  BarChartSize,
  ChatWidgetSize,
} as const;

export type StaxisThemeType = typeof StaxisTheme;
