import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { RootStackParamList } from '../lib/navigation';
import { useStore } from '../lib/store';
import { radius } from '../lib/theme';
import { Session } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function HistoryScreen({ navigation }: Props) {
  const { theme, sessions, activeSession, selectSession, deleteSession, newChat } = useStore();

  const open = (session: Session) => {
    selectSession(session.id);
    navigation.goBack();
  };

  const confirmDelete = (session: Session) => {
    Alert.alert('Delete conversation?', `"${session.title}" and its messages will be erased.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session.id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={[styles.h1, { color: theme.text }]}>Study history</Text>
            <Pressable
              onPress={() => {
                newChat();
                navigation.goBack();
              }}
              style={({ pressed }) => [
                styles.newBtn,
                { backgroundColor: theme.accentSoft, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="add" size={15} color={theme.accent} />
              <Text style={[styles.newText, { color: theme.accent }]}>New chat</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const isActive = item.id === activeSession.id;
          return (
            <Animated.View entering={FadeInDown.delay(index * 45).duration(240)}>
              <Pressable
                onPress={() => open(item)}
                onLongPress={() => confirmDelete(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: isActive ? theme.accentSoft : theme.surface,
                    borderColor: isActive ? theme.accent : theme.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={theme.accent} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                    {item.messages.length} message{item.messages.length === 1 ? '' : 's'} \u00b7{' '}
                    {timeAgo(item.updatedAt)}
                  </Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={theme.textFaint} />
                )}
              </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No conversations yet"
            body="Ask your first question in the Chat tab and it will appear here."
          />
        }
        ListFooterComponent={
          sessions.length > 0 ? (
            <Text style={[styles.hint, { color: theme.textFaint }]}>
              Tip: long-press a conversation to delete it.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: '800' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  newText: { fontSize: 12.5, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14.5, fontWeight: '700' },
  rowMeta: { fontSize: 11.5, marginTop: 3 },
  hint: { fontSize: 11.5, textAlign: 'center', marginTop: 10 },
});
