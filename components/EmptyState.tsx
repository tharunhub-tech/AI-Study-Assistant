import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, body, children }: Props) {
  const { theme } = useStore();
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.accentSoft, borderColor: theme.border },
        ]}
      >
        <Ionicons name={icon} size={30} color={theme.accent} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{body}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  actions: { marginTop: 18, alignItems: 'center', gap: 10 },
});
