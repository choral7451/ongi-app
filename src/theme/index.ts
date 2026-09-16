import { Platform } from 'react-native';

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
  /** 로고 전용 — 굵고 넓게 */
  logo: 'Fredoka_700Bold',
  headingRegular: 'NotoSerifKR_400Regular',
} as const;

export const iconStroke = 1.75;

/**
 * 원·버튼 안 글자 세로 가운데 정렬 — 안드로이드는 Text 에 폰트 상하 여백(Noto Serif KR 은 특히 큼)이 붙어
 * 글자가 아래로 밀리고 버튼이 커진다. 두 속성 모두 안드로이드 전용이라 iOS 에는 영향이 없다.
 */
export const textCenterFix = {
  includeFontPadding: false,
  textAlignVertical: 'center',
} as const;

/**
 * 원 안 이니셜(세리프) 정확한 세로 가운데 — textCenterFix 만으로는 Noto Serif KR 한글이 글자 크기의 약 6% 아래에 그려진다
 * (hhea ascent 1151 / descent 286 대비 한글 글리프 중심이 0.04~0.07em 아래 — 폰트 파일 실측).
 * iOS 모양은 기존 그대로 두고 안드로이드만 보정한다.
 */
export function initialCenterFix(fontSize: number) {
  return Platform.OS === 'android' ? { ...textCenterFix, transform: [{ translateY: -0.06 * fontSize }] } : null;
}
