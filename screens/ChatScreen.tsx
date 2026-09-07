import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { MessageBubble } from '../components/MessageBubble';
import { TypingDots } from '../components/TypingDots';
import { RootStackParamList, TabParamList } from '../lib/navigation';
import { useStore } from '../lib/store';
import { radius } from '../lib/theme';
import { AnswerMode, LoadedDoc, Message } from '../lib/types';

const MODES: { key: AnswerMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'direct', label: 'Direct answer', icon: 'arrow-forward-circle-outline' },
  { key: 'keypoints', label: 'Key points', icon: 'list-outline' },
  { key: 'recap', label: 'Quick recap', icon: 'flash-outline' },
];

function buildSuggestions(docs: LoadedDoc[]): string[] {
  const ids = new Set(docs.map((d) => d.meta.id));
  const out: string[] = [];
  if (ids.has('sample_dbms')) out.push('What is third normal form?', '3NF vs BCNF?');
  if (ids.has('sample_os')) out.push('Explain CPU scheduling criteria', 'What is the convoy effect?');
  if (ids.has('sample_cn')) out.push('List the seven OSI layers', 'TCP vs UDP?');
  if (out.length === 0) {
    out.push('Summarise the key ideas in my notes', 'What are the main definitions?');
  }
  return out.slice(0, 4);
}

export function ChatScreen() {
  const { theme, activeSession, thinking, ask, docs, totalChunks, newChat } = useStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList & TabParamList>>();
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<AnswerMode>('direct');
  const listRef = useRef<FlatList<Message>>(null);

  const messages = activeSession.messages;
  const suggestions = useMemo(() => buildSuggestions(docs), [docs]);

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 90);
    return () => clearTimeout(timer);
  }, [messages.length, thinking]);

  const send = (value?: string) => {
    const question = (value ?? draft).trim();
    if (!question || thinking) return;
    setDraft('');
    void ask(question, mode);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
            <Ionicons name="sparkles" size={16} color={theme.onAccent} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>StudyMate AI</Text>
            <Text style={[styles.brandSub, { color: theme.textMuted }]}>
              {docs.length} doc{docs.length === 1 ? '' : 's'} \u00b7 {totalChunks} chunks indexed
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => navigation.navigate('History')}
            accessibilityLabel="Chat history"
            style={styles.headerBtn}
          >
            <Ionicons name="time-outline" size={21} color={theme.textMuted} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={newChat}
            accessibilityLabel="New chat"
            style={styles.headerBtn}
          >
            <Ionicons name="create-outline" size={21} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.modeBar, { backgroundColor: theme.bg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
          {MODES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={mode === item.key}
              onPress={() => setMode(item.key)}
            />
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => <MessageBubble message={item} index={index} />}
          ListEmptyComponent={
            <View>
              <EmptyState
                icon={docs.length === 0 ? 'library-outline' : 'chatbubble-ellipses-outline'}
                title={docs.length === 0 ? 'Add your lecture notes first' : 'Ask anything from your notes'}
                body={
                  docs.length === 0
                    ? 'StudyMate answers strictly from the PDFs you upload \u2014 no guessing, no generic internet answers.'
                    : 'Type a question below. Every answer cites the document and page it came from.'
                }
              >
                {docs.length === 0 ? (
                  <Pressable
                    onPress={() => navigation.navigate('Library')}
                    style={({ pressed }) => [
                      styles.cta,
                      { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color={theme.onAccent} />
                    <Text style={[styles.ctaText, { color: theme.onAccent }]}>Open library</Text>
                  </Pressable>
                ) : (
                  <View style={styles.suggestionWrap}>
                    {suggestions.map((s, i) => (
                      <Animated.View key={s} entering={FadeInDown.delay(i * 60).duration(260)}>
                        <Chip label={s} icon="help-circle-outline" onPress={() => send(s)} />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </EmptyState>
            </View>
          }
          ListFooterComponent={
            thinking ? (
              <View style={styles.typingWrap}>
                <TypingDots />
                <Text style={[styles.thinkingText, { color: theme.textFaint }]}>
                  Retrieving relevant chunks\u2026
                </Text>
              </View>
            ) : (
              <View style={{ height: 8 }} />
            )
          }
        />

        <View style={[styles.inputBar, { backgroundColor: theme.bgAlt, borderTopColor: theme.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question from your notes\u2026"
            placeholderTextColor={theme.textFaint}
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            multiline
            maxLength={400}
            returnKeyType="send"
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => send()}
            disabled={!draft.trim() || thinking}
            accessibilityLabel="Send question"
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !draft.trim() || thinking ? theme.surfaceAlt : theme.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={!draft.trim() || thinking ? theme.textFaint : theme.onAccent}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  brandSub: { fontSize: 11.5, marginTop: 2 },
  headerBtn: { padding: 4 },
  modeBar: { paddingVertical: 10 },
  modeRow: { gap: 8, paddingHorizontal: 16 },
  listContent: { padding: 16, paddingBottom: 12 },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
  typingWrap: { paddingLeft: 4, paddingTop: 4 },
  thinkingText: { fontSize: 11.5, marginTop: 6, marginLeft: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
