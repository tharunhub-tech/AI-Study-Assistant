import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { radius } from '../lib/theme';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

const DIAGRAM = `+----------+     +----------------+     +----------------+
|  Student  | --> |   PDF Upload   | --> | Question Input |
+----------+     +----------------+     +----------------+
                        |                       |
                        v                       |
                +----------------+              |
                | PDF Processing | <------------+
                +----------------+              |
                        |                       |
                        v                       |
                +----------------+     +----------------+
                |  Vector Store  | <--|   Chunk Store  |
                +----------------+     +----------------+
                        |
                        v
          +-------------------------------+
          |  RAG Pipeline (retrieval +    |
          |  answer synthesis)            |
          +-------------------------------+
                        |
                        v
                +----------------+
                |  Answer Output |
                +----------------+`;

const FOLDER = `studymate-ai/
|-- app.py                 # UI: upload, chat, history
|-- src/
|   |-- pdf_processor.py   # load PDF -> extract text -> chunks
|   |-- vector_store.py    # embeddings + FAISS index (save/load)
|   \`-- chat_engine.py     # retrieve -> prompt -> generate answer
|-- requirements.txt       # pinned dependencies
|-- .env.example           # GEMINI_API_KEY=your_key_here
\`-- README.md              # overview + usage

This mobile build mirrors it 1:1:
  app.py            -> screens/ChatScreen.tsx, LibraryScreen.tsx
  pdf_processor.py  -> lib/pdf.ts + lib/chunker.ts
  vector_store.py   -> lib/retriever.ts (BM25 index)
  chat_engine.py    -> lib/answerer.ts (RAG + guardrails)
  session_state     -> lib/store.tsx (AsyncStorage sessions)`;

const STAGES = [
  { n: '1', title: 'PDF Upload', body: 'Student uploads lecture PDFs through the UI.' },
  { n: '2', title: 'PDF Processing', body: 'Text is extracted with PyPDF and split into manageable chunks.' },
  { n: '3', title: 'Vector Store', body: 'FAISS stores embeddings of the chunks for fast similarity search.' },
  { n: '4', title: 'Question Input', body: 'Student asks a question in natural language.' },
  { n: '5', title: 'RAG Pipeline', body: 'LangChain retrieves relevant chunks and frames the prompt for Gemini.' },
  { n: '6', title: 'Answer Output', body: 'The response is shown with its sources.' },
  { n: '7', title: 'Answer Verification', body: 'If nothing relevant is found, an anti-hallucination reply is returned.' },
];

const COMPONENTS = [
  { name: 'PDF Upload', tech: 'Streamlit', purpose: 'Interface for student uploads' },
  { name: 'PDF Processing', tech: 'PyPDF', purpose: 'Extracts and processes PDF text' },
  { name: 'Vector Store', tech: 'FAISS', purpose: 'Stores and manages text embeddings' },
  { name: 'Language Understanding', tech: 'LangChain', purpose: 'Orchestrates retrieval augmented generation' },
  { name: 'Text Generation', tech: 'Google Gemini API', purpose: 'Generates answers based on PDF content' },
  { name: 'User Interface', tech: 'Streamlit', purpose: 'Displays chat and upload history' },
  { name: 'Session Management', tech: 'Streamlit', purpose: 'Maintains user session and history' },
];

const OBJECTIVES = [
  'Provide instant answers to student queries from lecture materials.',
  'Enhance understanding of concepts through interactive dialogue.',
  'Ensure ease of use by allowing uploads of various lecture PDFs.',
  'Maintain simplicity in code design for effective teaching.',
  'Implement safeguards against incorrect information retrieval.',
];

const GUARDRAILS = [
  'Relevance threshold: a chunk must clear a BM25 confidence cut-off before it may be quoted.',
  'Refusal answer: if nothing relevant is found, the app says so instead of inventing content.',
  'Citations: every grounded answer shows the document, page and match score of its sources.',
  'Text-quality check: PDFs without a usable text layer (scans) are rejected with a clear message.',
  'Extractive answers: sentences are quoted from the notes, so nothing is paraphrased into fiction.',
];

const NEXT_STEPS = [
  'Swap the extractive synthesiser for Gemini 1.5 Flash (free tier) via GEMINI_API_KEY for fluent answers.',
  'Replace BM25 with FAISS + sentence-transformer embeddings (all-MiniLM-L6-v2) for semantic retrieval.',
  'Add OCR (Tesseract) so scanned PDFs can be indexed too.',
  'Stream the answer token by token and persist per-student chat history.',
];

interface Section {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  body: React.ReactNode;
}

export function ReportScreen() {
  const { theme, docs, totalChunks, sessions } = useStore();

  const sections: Section[] = [
    {
      key: 'synopsis',
      title: 'Project synopsis',
      icon: 'document-text-outline',
      body: (
        <>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>Problem. </Text>
            Many students struggle to retrieve relevant information from thick lecture PDFs, which
            hinders the study process.
          </Text>
          <Text style={[styles.subHead, { color: theme.text }]}>Objectives</Text>
          {OBJECTIVES.map((o) => (
            <View key={o} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: theme.accent }]}>{'\u2022'}</Text>
              <Text style={[styles.p, { color: theme.textMuted, marginBottom: 4 }]}>{o}</Text>
            </View>
          ))}
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>Scope. </Text>
            Develops the AI study assistant with the defined technologies. Excludes paid services
            (beyond the Gemini free tier), integration with other platforms, and any AI features not
            in the tech stack.
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>Novelty. </Text>
            Unlike plain ChatGPT, this assistant answers only from the uploaded lecture PDFs, so
            answers stay accurate and traceable to the material instead of generalising from a broad
            database.
          </Text>
        </>
      ),
    },
    {
      key: 'architecture',
      title: 'System architecture',
      icon: 'git-network-outline',
      body: (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.codeCard, { backgroundColor: theme.bgAlt, borderColor: theme.border }]}>
              <Text style={[styles.code, { color: theme.textMuted }]}>{DIAGRAM}</Text>
            </View>
          </ScrollView>
          <View style={styles.stageWrap}>
            {STAGES.map((stage) => (
              <View key={stage.n} style={[styles.stageRow, { borderColor: theme.border }]}>
                <View style={[styles.stageNum, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.stageNumText, { color: theme.onAccent }]}>{stage.n}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.stageTitle, { color: theme.text }]}>{stage.title}</Text>
                  <Text style={[styles.p, { color: theme.textMuted, marginBottom: 0 }]}>{stage.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ),
    },
    {
      key: 'components',
      title: 'Components & tech stack',
      icon: 'layers-outline',
      body: (
        <View style={styles.tableWrap}>
          {COMPONENTS.map((c) => (
            <View key={c.name} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.tableName, { color: theme.text }]}>{c.name}</Text>
              <Text style={[styles.tableTech, { color: theme.accent }]}>{c.tech}</Text>
              <Text style={[styles.p, { color: theme.textMuted, marginBottom: 0 }]}>{c.purpose}</Text>
            </View>
          ))}
        </View>
      ),
    },
    {
      key: 'folder',
      title: 'Folder structure',
      icon: 'folder-outline',
      body: (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.codeCard, { backgroundColor: theme.bgAlt, borderColor: theme.border }]}>
            <Text style={[styles.code, { color: theme.textMuted }]}>{FOLDER}</Text>
          </View>
        </ScrollView>
      ),
    },
    {
      key: 'mapping',
      title: 'How this app runs the same pipeline',
      icon: 'phone-portrait-outline',
      body: (
        <>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            This Expo build is the same RAG architecture running entirely on-device, so it works with
            zero server cost and keeps student notes private:
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>1. Upload </Text>
            {'\u2192'} expo-document-picker selects the PDF.
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>2. Processing </Text>
            {'\u2192'} lib/pdf.ts inflates FlateDecode streams and parses the Tj/TJ text operators
            (the PyPDF role); lib/chunker.ts splits into overlapping chunks (the LangChain splitter
            role).
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>3. Vector store </Text>
            {'\u2192'} lib/retriever.ts builds a BM25 index (the FAISS role) and ranks chunks per
            question.
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>4. Generation </Text>
            {'\u2192'} lib/answerer.ts selects the best sentences from the top chunks and cites them
            (the Gemini role, offline edition).
          </Text>
          <Text style={[styles.p, { color: theme.textMuted }]}>
            <Text style={[styles.strong, { color: theme.text }]}>5. Sessions </Text>
            {'\u2192'} lib/store.tsx persists documents and conversations in AsyncStorage (the
            Streamlit session_state role).
          </Text>
        </>
      ),
    },
    {
      key: 'guardrails',
      title: 'Anti-hallucination safeguards',
      icon: 'shield-checkmark-outline',
      body: (
        <>
          {GUARDRAILS.map((g) => (
            <View key={g} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: theme.good }]}>{'\u2022'}</Text>
              <Text style={[styles.p, { color: theme.textMuted, marginBottom: 4 }]}>{g}</Text>
            </View>
          ))}
        </>
      ),
    },
    {
      key: 'next',
      title: 'Next steps & viva talking points',
      icon: 'rocket-outline',
      body: (
        <>
          {NEXT_STEPS.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: theme.amber }]}>{'\u2022'}</Text>
              <Text style={[styles.p, { color: theme.textMuted, marginBottom: 4 }]}>{s}</Text>
            </View>
          ))}
          <Text style={[styles.p, { color: theme.textMuted, marginTop: 6 }]}>
            Be ready to explain: why chunking is needed before retrieval, why BM25/FAISS is faster
            than scanning every page per question, and what stops the model from inventing answers.
          </Text>
        </>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.heroMark, { backgroundColor: theme.accent }]}>
              <Ionicons name="sparkles" size={20} color={theme.onAccent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>StudyMate AI</Text>
              <Text style={[styles.heroSub, { color: theme.textMuted }]}>
                Continuous Assessment project \u00b7 BCA 2nd year \u00b7 RAG study assistant
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Stat value={`${docs.length}`} label="docs" />
              <Stat value={`${totalChunks}`} label="chunks" />
              <Stat value={`${sessions.length}`} label="chats" />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(280)}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name={item.icon} size={16} color={theme.accent} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              </View>
              {item.body}
            </View>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { theme } = useStore();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 40 },
  hero: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  heroMark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 21, fontWeight: '800' },
  heroSub: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 22 },
  stat: { alignItems: 'flex-start' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIcon: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  strong: { fontWeight: '800' },
  p: { fontSize: 13.5, lineHeight: 21, marginBottom: 9 },
  subHead: { fontSize: 13, fontWeight: '800', marginTop: 4, marginBottom: 8, letterSpacing: 0.2 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 14, lineHeight: 21, fontWeight: '800' },
  codeCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 2,
  },
  code: { fontSize: 10.5, lineHeight: 15, fontFamily: MONO },
  stageWrap: { marginTop: 14, gap: 8 },
  stageRow: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stageNum: { width: 24, height: 24, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stageNumText: { fontSize: 12, fontWeight: '800' },
  stageTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 3 },
  tableWrap: { gap: 2 },
  tableRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tableName: { fontSize: 13.5, fontWeight: '700' },
  tableTech: { fontSize: 12, fontWeight: '700', marginVertical: 2 },
});
