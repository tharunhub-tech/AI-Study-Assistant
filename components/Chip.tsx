import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function Chip({ label, active = false, icon, onPress }: ChipProps) {
  const { theme } = useStore();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.surface,
          borderColor: active ? theme.accent : theme.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Ionicons name={icon} size={13} color={active ? theme.onAccent : theme.textMuted} />
        ) : null}
        <Text
          style={[styles.label, { color: active ? theme.onAccent : theme.textMuted }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12.5, fontWeight: '600' },
});
