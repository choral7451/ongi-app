import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { signInWithProvider, type SocialProvider } from '../../api/auth';
import { AppleSignInCancelled, isAppleSignInAvailable } from '../../api/apple';
import { GoogleSignInCancelled } from '../../api/google';
import { useSession } from '../../store/session';
import { colors, fonts } from '../../theme';

/** 구글 'G' 로고 (공식 4색) */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** Apple 로고 (단색) */
function AppleLogo({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.37 12.7c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.83-.81-3-.79-1.54.02-2.97.9-3.76 2.28-1.61 2.79-.41 6.91 1.15 9.17.77 1.11 1.67 2.35 2.86 2.3 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.12 2.78-2.24.88-1.28 1.24-2.53 1.26-2.59-.03-.01-2.41-.92-2.44-3.69zM14.09 5.96c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.58.68-1.1 1.77-.96 2.81 1.02.08 2.05-.52 2.69-1.28z"
      />
    </Svg>
  );
}

interface SocialButtonSpec {
  provider: SocialProvider;
  label: string;
  bg: string;
  fg: string;
  border?: string;
  icon: React.ReactNode;
}

const APPLE_BUTTON: SocialButtonSpec = {
  provider: 'apple',
  label: 'Apple로 시작하기',
  bg: '#000000',
  fg: '#ffffff',
  icon: <AppleLogo />,
};

const SOCIAL_BUTTONS: SocialButtonSpec[] = [
  {
    provider: 'google',
    label: 'Google로 시작하기',
    bg: '#ffffff',
    fg: '#1f1f1f',
    border: colors.divider,
    icon: <GoogleLogo />,
  },
];

/** 로그인 / 회원가입 — 소셜 전용 (구글 + iOS 에서는 Apple, 카카오·네이버는 추후 추가) */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setUser = useSession((s) => s.setUser);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable().then((ok) => mounted && setAppleAvailable(ok));
    return () => {
      mounted = false;
    };
  }, []);

  // App Store 심사 규정: 다른 소셜 로그인을 제공하면 iOS 에선 Apple 로그인을 함께(맨 위) 제공
  const buttons = appleAvailable ? [APPLE_BUTTON, ...SOCIAL_BUTTONS] : SOCIAL_BUTTONS;

  const startWith = async (provider: SocialProvider) => {
    if (pendingProvider) return;
    setPendingProvider(provider);
    try {
      const user = await signInWithProvider(provider);
      setUser(user); // 인증 가드가 자동으로 홈으로 보냅니다
    } catch (e) {
      // 사용자가 로그인 창을 닫은 경우는 조용히 무시
      if (!(e instanceof GoogleSignInCancelled) && !(e instanceof AppleSignInCancelled)) {
        Alert.alert('로그인 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) },
      ]}
    >
      <View style={styles.brand}>
        <Text style={styles.kicker}>우리 가족의 오늘을 담는 곳</Text>
        <Text style={styles.logo}>ONGI</Text>
        <View style={styles.logoRule} />
        <Text style={styles.tagline}>
          흩어져 있는 가족의 하루를{'\n'}한 곳에 모아 함께 봐요
        </Text>
      </View>

      <View style={styles.actions}>
        {buttons.map((spec) => (
          <Pressable
            key={spec.provider}
            accessibilityRole="button"
            accessibilityLabel={spec.label}
            disabled={pendingProvider !== null}
            onPress={() => startWith(spec.provider)}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: spec.bg,
                borderColor: spec.border ?? spec.bg,
                opacity: pressed || pendingProvider === spec.provider ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.socialIcon}>{spec.icon}</View>
            <Text style={[styles.socialLabel, { color: spec.fg }]}>
              {pendingProvider === spec.provider ? '연결 중…' : spec.label}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.legalNotice}>
          시작하면 온기의{' '}
          <Text
            style={styles.legalLink}
            onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })}
          >
            이용약관
          </Text>
          {' '}및{' '}
          <Text
            style={styles.legalLink}
            onPress={() =>
              router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })
            }
          >
            개인정보 처리방침
          </Text>
          에 동의하게 됩니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.accent,
    marginBottom: 10,
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 64,
    lineHeight: 76,
    letterSpacing: 6,
    color: colors.text,
  },
  logoRule: {
    width: 56,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginVertical: 16,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    color: colors.textMuted,
  },
  actions: {
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
  },
  socialIcon: {
    position: 'absolute',
    left: 18,
    width: 22,
    alignItems: 'center',
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  legalNotice: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 12,
  },
  legalLink: {
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
});
