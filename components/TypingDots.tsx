import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useStore } from '../lib/store';

function Dot({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration: 520 }), -1, true));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -3 * progress.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function TypingDots() {
  const { theme } = useStore();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Dot delay={0} color={theme.accent} />
      <Dot delay={140} color={theme.accent} />
      <Dot delay={280} color={theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
