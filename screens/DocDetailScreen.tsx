import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { RootStackParamList } from '../lib/navigation';
import { useStore } from '../lib/store';
import { radius } from '../lib/theme';
import { Chunk } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DocDetail'>;

export function DocDetailScreen({ route, navigation }: Props) {
  const { docId, chunkId } = route.params;
  const { theme, docs } = useStore();
  const doc = docs.find((d) => d.meta.id === docId);
  const [highlight, setHighlight] = useState<string | undefined>(chunkId);
  const listRef = useRef<FlatList<Chunk>>(null);

  useEffect(() => {
    navigation.setOptions({ title: doc ? 'Document' : 'Not found' });
  }, [navigation, doc]);

  useEffect(() => {
    if (!chunkId || !doc) return;
    const target = doc.chunks.findIndex((c) => c.id === chunkId);
    if (target < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0.25 });
    }, 380);
    return () => clearTimeout(timer);
  }, [chunkId, doc]);

  if (!doc) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]}>
        <EmptyState
          icon="document-outline"
          title="Document unavailable"
          body="This document was removed from your library."
        />
      </SafeAreaView>
    );
  }

  const { meta } = doc;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <FlatList
        ref={listRef}
        data={doc.chunks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }, 120);
        }}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{meta.title}</Text>
            <View style={styles.metaRow}>
              <Tag icon="copy-outline" label={`${meta.pages} pages`} />
              <Tag icon="grid-outline" label={`${meta.chunkCount} chunks`} />
              <Tag
                icon="pricetag-outline"
                label={meta.origin === 'sample' ? 'sample' : 'uploaded'}
              />
            </View>
            {meta.note ? (
              <View style={[styles.note, { backgroundColor: theme.amberSoft }]}>
                <Ionicons name="information-circle-outline" size={14} color={theme.amber} />
                <Text style={[styles.noteText, { color: theme.amber }]}>{meta.note}</Text>
              </View>
            ) : null}
            <Text style={[styles.sectionLabel, { color: theme.textFaint }]}>
              RETRIEVED CHUNKS \u00b7 BM25 INDEX
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const active = item.id === highlight;
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(240)}>
              <View
                style={[
                  styles.chunk,
                  {
                    backgroundColor: theme.surface,
                    borderColor: active ? theme.accent : theme.border,
                    borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.chunkHeader}>
                  <View style={[styles.pageBadge, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.pageText, { color: theme.accent }]}>p.{item.page}</Text>
                  </View>
                  <Text style={[styles.chunkIndex, { color: theme.textFaint }]}>
                    chunk #{item.index + 1}
                  </Text>
                  {active ? (
                    <Ionicons name="flash" size={13} color={theme.accent} style={styles.spark} />
                  ) : null}
                </View>
                <Text style={[styles.chunkText, { color: theme.text }]}>{item.text}</Text>
              </View>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Tag({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { theme } = useStore();
  return (
    <View style={[styles.tag, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Ionicons name={icon} size={12} color={theme.textMuted} />
      <Text style={[styles.tagText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: { fontSize: 11.5, fontWeight: '600' },
  note: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: radius.md,
    marginTop: 14,
  },
  noteText: { fontSize: 12, flex: 1, lineHeight: 17, fontWeight: '600' },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  chunk: { borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  chunkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  pageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  pageText: { fontSize: 11, fontWeight: '800' },
  chunkIndex: { fontSize: 11, fontWeight: '600' },
  spark: { marginLeft: 'auto' },
  chunkText: { fontSize: 13.5, lineHeight: 21 },
});
