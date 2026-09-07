import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { LoadedDoc } from '../lib/types';

interface Props {
  doc: LoadedDoc;
  onPress: () => void;
  onDelete: () => void;
}

function formatBytes(bytes: number, origin: 'sample' | 'upload'): string {
  if (origin === 'sample') return 'bundled';
  if (!bytes) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DocCard({ doc, onPress, onDelete }: Props) {
  const { theme } = useStore();
  const { meta } = doc;
  const weak = meta.quality !== 'good';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: weak ? theme.amberSoft : theme.accentSoft },
        ]}
      >
        <Ionicons
          name={weak ? 'warning-outline' : 'document-text-outline'}
          size={22}
          color={weak ? theme.amber : theme.accent}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {meta.title}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
          {meta.pages} pg \u00b7 {meta.chunkCount} chunks \u00b7 {formatBytes(meta.sizeBytes, meta.origin)}{' '}
          \u00b7 {timeAgo(meta.addedAt)}
        </Text>
        {weak ? (
          <Text style={[styles.warn, { color: theme.amber }]} numberOfLines={2}>
            {meta.note ?? 'Low text quality \u2014 answers may be incomplete.'}
          </Text>
        ) : meta.note ? (
          <Text style={[styles.note, { color: theme.textFaint }]} numberOfLines={1}>
            {meta.note}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onDelete}
        hitSlop={10}
        accessibilityLabel={`Remove ${meta.title}`}
        style={({ pressed }) => [styles.trash, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="trash-outline" size={18} color={theme.textFaint} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
  },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '700', lineHeight: 19 },
  meta: { fontSize: 12, marginTop: 3 },
  warn: { fontSize: 11.5, marginTop: 4, fontWeight: '600' },
  note: { fontSize: 11.5, marginTop: 4 },
  trash: { padding: 6 },
});
