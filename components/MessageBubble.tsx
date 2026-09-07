import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RootStackParamList } from '../lib/navigation';
import { useStore } from '../lib/store';
import { AnswerMode, Message } from '../lib/types';
import { RichText } from './RichText';

interface Props {
  message: Message;
  index: number;
}

const MODE_LABEL: Record<AnswerMode, string> = {
  direct: 'Direct answer',
  keypoints: 'Key points',
  recap: 'Quick recap',
};

export function MessageBubble({ message, index }: Props) {
  const { theme } = useStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (message.role === 'user') {
    return (
      <Animated.View entering={FadeInDown.duration(240)} style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.userBubble }]}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }

  const grounded = message.grounded !== false;

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(40)} style={styles.botRow}>
      <View style={[styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="sparkles" size={13} color={theme.accent} />
          </View>
          <Text style={[styles.headerName, { color: theme.textMuted }]}>StudyMate AI</Text>
          {message.mode ? (
            <Text style={[styles.modeTag, { color: theme.textFaint }]}>{MODE_LABEL[message.mode]}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: grounded ? theme.goodSoft : theme.amberSoft,
              alignSelf: 'flex-start',
            },
          ]}
        >
          <Ionicons
            name={grounded ? 'shield-checkmark' : 'shield-half'}
            size={12}
            color={grounded ? theme.good : theme.amber}
          />
          <Text style={[styles.badgeText, { color: grounded ? theme.good : theme.amber }]}>
            {grounded
              ? `Grounded in your notes \u00b7 ${message.confidence ?? 0}% match`
              : 'Not found in your notes'}
          </Text>
        </View>

        <RichText text={message.text} />

        {message.sources && message.sources.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sourceRow}
          >
            {message.sources.map((source) => (
              <Pressable
                key={source.chunkId}
                onPress={() =>
                  navigation.navigate('DocDetail', { docId: source.docId, chunkId: source.chunkId })
                }
                style={({ pressed }) => [
                  styles.sourcePill,
                  {
                    backgroundColor: pressed ? theme.accentSoft : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="document-attach-outline" size={12} color={theme.accent} />
                <Text style={[styles.sourceText, { color: theme.textMuted }]} numberOfLines={1}>
                  {shortenTitle(source.docTitle)} \u00b7 p.{source.page} \u00b7 {source.score}%
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.spacer} />
    </Animated.View>
  );
}

function shortenTitle(title: string): string {
  return title.length > 26 ? title.slice(0, 25) + '\u2026' : title;
}

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', marginBottom: 10 },
  userBubble: { maxWidth: '86%', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20, borderBottomRightRadius: 6 },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  botRow: { marginBottom: 4 },
  botBubble: {
    maxWidth: '94%',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  avatar: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 12.5, fontWeight: '700' },
  modeTag: { fontSize: 11, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sourceRow: { gap: 8, paddingTop: 4, paddingRight: 4 },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 240,
  },
  sourceText: { fontSize: 11.5, fontWeight: '600' },
  spacer: { height: 10 },
});
