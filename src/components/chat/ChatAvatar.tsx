import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import type { ChatUser } from '../../types';
import { Avatar } from '../ui/Avatar';

/** 대화방 아바타 — 1:1 은 상대 한 명, 그룹은 두 명을 겹쳐서 */
export function ChatAvatar({ participants, size = 48 }: { participants: ChatUser[]; size?: number }) {
  const others = participants.filter((p) => !p.isMe);
  const shown = others.length > 0 ? others : participants;

  if (shown.length < 2) {
    const user = shown[0];
    return <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size={size} />;
  }

  const small = Math.round(size * 0.7);
  return (
    <View style={{ width: size, height: size }}>
      <Avatar name={shown[0].name} uri={shown[0].avatarUrl} size={small} style={styles.back} />
      <Avatar name={shown[1].name} uri={shown[1].avatarUrl} size={small} style={styles.front} />
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  front: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
