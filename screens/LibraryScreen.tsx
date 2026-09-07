import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DocCard } from '../components/DocCard';
import { EmptyState } from '../components/EmptyState';
import { RootStackParamList } from '../lib/navigation';
import { SAMPLE_DOCS } from '../lib/samples';
import { useStore } from '../lib/store';
import { radius } from '../lib/theme';

export function LibraryScreen() {
  const { theme, docs, totalChunks, addPdfDocument, addSampleDocument, removeDocument, busyDoc } =
    useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const working = uploading || busyDoc !== null;

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploading(true);
      const added = await addPdfDocument(asset.uri, asset.name ?? 'Lecture notes.pdf', asset.size ?? 0);
      setUploading(false);
      Alert.alert(added.ok ? 'Added to library' : 'Could not index PDF', added.message);
    } catch {
      setUploading(false);
      Alert.alert('Upload failed', 'This file could not be opened. Please pick a valid PDF.');
    }
  };

  const confirmDelete = (docId: string, title: string) => {
    Alert.alert('Remove document?', `"${title}" will be removed from your index.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeDocument(docId) },
    ]);
  };

  const addedSamples = new Set(docs.map((d) => d.meta.id));

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={docs}
        keyExtractor={(item) => item.meta.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={[styles.h1, { color: theme.text }]}>Library</Text>
            <Text style={[styles.sub, { color: theme.textMuted }]}>
              {docs.length} document{docs.length === 1 ? '' : 's'} \u00b7 {totalChunks} chunks in the
              vector store
            </Text>

            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Add lecture material</Text>
              <Text style={[styles.panelBody, { color: theme.textMuted }]}>
                PDFs are parsed on-device: text is extracted, split into chunks and indexed for
                retrieval \u2014 nothing leaves your phone.
              </Text>

              <View style={styles.buttonRow}>
                <Pressable
                  onPress={handleUpload}
                  disabled={working}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.accent, opacity: working || pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="cloud-upload-outline" size={17} color={theme.onAccent} />
                  <Text style={[styles.primaryText, { color: theme.onAccent }]}>
                    {working ? 'Indexing\u2026' : 'Upload PDF'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  disabled={working}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: theme.border, backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="reader-outline" size={17} color={theme.text} />
                  <Text style={[styles.secondaryText, { color: theme.text }]}>Sample notes</Text>
                </Pressable>
              </View>

              {working ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[styles.progress, { backgroundColor: theme.accentSoft }]}
                >
                  <Ionicons name="sync-outline" size={14} color={theme.accent} />
                  <Text style={[styles.progressText, { color: theme.accent }]} numberOfLines={2}>
                    {busyDoc ? `Extracting text & chunking "${busyDoc}"\u2026` : 'Preparing file\u2026'}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(260)}>
            <DocCard
              doc={item}
              onPress={() => navigation.navigate('DocDetail', { docId: item.meta.id })}
              onDelete={() => confirmDelete(item.meta.id, item.meta.title)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="documents-outline"
            title="No documents yet"
            body="Upload a lecture PDF or load a bundled sample note, then ask questions in the Chat tab."
          />
        }
      />

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Bundled sample notes</Text>
              <Pressable hitSlop={10} onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.sheetSub, { color: theme.textMuted }]}>
              Ready-made unit notes for testing the RAG pipeline instantly.
            </Text>
            {SAMPLE_DOCS.map((sample) => {
              const already = addedSamples.has(sample.id);
              return (
                <View key={sample.id} style={[styles.sampleRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.sampleInfo}>
                    <Text style={[styles.sampleTitle, { color: theme.text }]} numberOfLines={2}>
                      {sample.title}
                    </Text>
                    <Text style={[styles.sampleMeta, { color: theme.textFaint }]}>
                      {sample.subject} \u00b7 {sample.pages.length} pages
                    </Text>
                  </View>
                  <Pressable
                    disabled={already}
                    onPress={() => {
                      const res = addSampleDocument(sample.id);
                      if (!res.ok) Alert.alert('Not added', res.message);
                    }}
                    style={({ pressed }) => [
                      styles.addBtn,
                      {
                        backgroundColor: already ? theme.surfaceAlt : theme.accentSoft,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={already ? 'checkmark' : 'add'}
                      size={16}
                      color={already ? theme.textFaint : theme.accent}
                    />
                    <Text style={[styles.addText, { color: already ? theme.textFaint : theme.accent }]}>
                      {already ? 'Added' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 32 },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  panel: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 20 },
  panelTitle: { fontSize: 15.5, fontWeight: '700' },
  panelBody: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  primaryText: { fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    marginTop: 12,
  },
  progressText: { fontSize: 12, fontWeight: '600', flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,14,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingBottom: 34,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetSub: { fontSize: 12.5, marginTop: 4, marginBottom: 12 },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sampleInfo: { flex: 1 },
  sampleTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  sampleMeta: { fontSize: 11.5, marginTop: 3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addText: { fontSize: 12, fontWeight: '700' },
});
