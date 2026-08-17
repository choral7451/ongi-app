import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

interface AvatarProps {
  /** 원 안에 보여줄 이름 — 첫 글자만 사용 */
  name: string;
  size?: number;
  /** 초대 대기 중 스타일 (점선 테두리, 무채색) */
  pending?: boolean;
  style?: ViewStyle;
}

/** 이니셜 아바타 — 세리프 첫 글자, 은은한 파란 배경 */
export function Avatar({ name, size = 34, pending = false, style }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        pending && styles.pending,
        style,
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize: size * 0.44 },
          pending && styles.pendingInitial,
        ]}
      >
        {name.slice(0, 1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.accent100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.heading,
    color: colors.accent800,
  },
  pending: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.neutral400,
  },
  pendingInitial: {
    fontFamily: undefined,
    color: colors.neutral500,
  },
});
