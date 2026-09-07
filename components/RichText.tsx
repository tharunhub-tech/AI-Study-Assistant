import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';

/** Renders assistant answers with light markdown: **bold** and bullet lines. */
export function RichText({ text }: { text: string }) {
  const { theme } = useStore();
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, i) => {
        if (line.trim().startsWith('\u2022')) {
          return (
            <View key={`b${i}`} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.accent }]}>{'\u2022'}</Text>
              <Text style={[styles.bulletText, { color: theme.text }]}>
                {renderInline(line.replace(/^\s*\u2022\s*/, ''), theme)}
              </Text>
            </View>
          );
        }
        if (line.trim().length === 0) return null;
        return (
          <Text key={`p${i}`} style={[styles.paragraph, { color: theme.text }]}>
            {renderInline(line, theme)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInline(line: string, theme: { accent: string; text: string; textMuted: string }) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <Text key={i} style={{ color: theme.accent, fontWeight: '700' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  paragraph: { fontSize: 15, lineHeight: 23, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 4 },
  bulletDot: { fontSize: 15, lineHeight: 23, marginRight: 8, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 23 },
});
