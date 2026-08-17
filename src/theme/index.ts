/**
 * 온기 디자인 토큰 — Classical 디자인 시스템(세리프 헤딩·헤어라인 구분선·외곽선 버튼)
 * 기반. 색상 값은 디자인 시안(온기.dc.html)의 :root 토큰과 1:1 대응.
 */
export const colors = {
  bg: '#ffffff',
  surface: '#f1f2f4',
  text: '#101114',
  accent: '#0164ff',
  divider: 'rgba(16, 17, 20, 0.14)',

  neutral100: '#f7f8fa',
  neutral200: '#eceef1',
  neutral300: '#d9dce1',
  neutral400: '#b9bdc4',
  neutral500: '#999ea6',
  neutral600: '#7b8087',
  neutral700: '#5e6269',
  neutral800: '#42454b',
  neutral900: '#2a2c30',

  accent100: '#e9f0ff',
  accent200: '#d0e0ff',
  accent300: '#a7c5ff',
  accent400: '#6f9eff',
  accent500: '#2e7aff',
  accent600: '#0164ff',
  accent700: '#0150cd',
  accent800: '#023c99',
  accent900: '#062a63',

  textMuted: 'rgba(16, 17, 20, 0.55)',
  white: '#ffffff',
  danger: '#d92d20',
} as const;

export const spacing = {
  s1: 4,
  s2: 9,
  s3: 14,
  s4: 18,
  s6: 28,
  s8: 37,
} as const;

export const radius = {
  sm: 2,
  md: 4,
  lg: 7,
} as const;

/** 세리프 헤딩 폰트 패밀리 (NotoSerifKR — 앱 로드시 등록) */
export const fonts = {
  heading: 'NotoSerifKR_600SemiBold',
  headingRegular: 'NotoSerifKR_400Regular',
} as const;

export const iconStroke = 1.75;
