import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { generateAnswer, newMessageId } from './answerer';
import { chunkPages } from './chunker';
import { extractPdfText } from './pdf';
import { buildIndex, BM25Index } from './retriever';
import { SAMPLE_DOCS } from './samples';
import { darkTheme, lightTheme, Theme } from './theme';
import { AnswerMode, LoadedDoc, Message, Session } from './types';
import { uid, truncate } from './textUtils';

const STORAGE_KEY = 'studymate.v1.state';
const MAX_DOCS = 12;
const MAX_DOC_CHARS = 420_000;
const MAX_SESSIONS = 25;
const WELCOME_TEXT =
  'Hi! I am StudyMate AI. Upload your lecture PDFs in the Library tab and ask me anything \u2014 I answer strictly from your own notes and cite the page, so you always know where the answer came from. If your notes do not cover a topic, I will say so instead of guessing.';

export interface AddDocResult {
  ok: boolean;
  message: string;
}

interface PersistedState {
  docs: LoadedDoc[];
  sessions: Session[];
  activeId: string;
}

interface StoreValue {
  ready: boolean;
  theme: Theme;
  toggleTheme: () => void;
  docs: LoadedDoc[];
  sessions: Session[];
  activeSession: Session;
  index: BM25Index;
  totalChunks: number;
  thinking: boolean;
  busyDoc: string | null;
  addPdfDocument: (uri: string, name: string, sizeBytes: number) => Promise<AddDocResult>;
  addSampleDocument: (sampleId: string) => AddDocResult;
  removeDocument: (docId: string) => void;
  ask: (question: string, mode: AnswerMode) => Promise<void>;
  newChat: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function haptic(kind: 'tap' | 'success' | 'warn') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'tap') Haptics.selectionAsync().catch(() => {});
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {
    // haptics are best-effort only
  }
}

function makeSession(firstMessage?: Message): Session {
  const now = Date.now();
  return {
    id: uid('sess'),
    title: 'New study session',
    createdAt: now,
    updatedAt: now,
    messages: firstMessage ? [firstMessage] : [],
  };
}

function welcomeMessage(): Message {
  return {
    id: newMessageId(),
    role: 'assistant',
    text: WELCOME_TEXT,
    grounded: true,
    confidence: 100,
    createdAt: Date.now(),
  };
}

function docFromSample(sampleId: string): LoadedDoc | null {
  const sample = SAMPLE_DOCS.find((s) => s.id === sampleId);
  if (!sample) return null;
  const chunks = chunkPages(sample.pages, sampleId);
  const chars = sample.pages.reduce((sum, p) => sum + p.length, 0);
  return {
    meta: {
      id: sampleId,
      title: sample.title,
      origin: 'sample',
      pages: sample.pages.length,
      chunkCount: chunks.length,
      chars,
      sizeBytes: chars,
      addedAt: Date.now(),
      quality: 'good',
      note: sample.subject,
    },
    chunks,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [schemeOverride, setSchemeOverride] = useState<'light' | 'dark' | null>(null);
  const scheme = schemeOverride ?? (systemScheme === 'light' ? 'light' : 'dark');
  const theme = scheme === 'light' ? lightTheme : darkTheme;

  const [ready, setReady] = useState(false);
  const [docs, setDocs] = useState<LoadedDoc[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [thinking, setThinking] = useState(false);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- boot: restore state or seed the demo library ----------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const state = JSON.parse(raw) as Partial<PersistedState>;
          const loadedDocs = Array.isArray(state.docs) ? state.docs : [];
          const loadedSessions = Array.isArray(state.sessions) ? state.sessions : [];
          setDocs(loadedDocs);
          setSessions(loadedSessions);
          const restoredActive =
            state.activeId && loadedSessions.some((s) => s.id === state.activeId)
              ? state.activeId
              : loadedSessions[0]?.id ?? '';
          setActiveId(restoredActive);
        } else {
          const seeded = docFromSample('sample_dbms');
          setDocs(seeded ? [seeded] : []);
          const session = makeSession(welcomeMessage());
          setSessions([session]);
          setActiveId(session.id);
        }
      } catch {
        const session = makeSession(welcomeMessage());
        setSessions([session]);
        setActiveId(session.id);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---- persistence (debounced, with size-recovery fallback) --------------
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload: PersistedState = { docs, sessions, activeId };
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        try {
          const trimmed = {
            docs: docs.filter((d) => d.meta.origin === 'sample'),
            sessions: sessions.slice(-6),
            activeId,
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch {
          // storage full — the in-memory session keeps working
        }
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [ready, docs, sessions, activeId]);

  const allChunks = useMemo(() => docs.flatMap((d) => d.chunks), [docs]);
  const index = useMemo(() => buildIndex(allChunks), [allChunks]);

  const totalChunks = useMemo(
    () => docs.reduce((sum, d) => sum + d.meta.chunkCount, 0),
    [docs]
  );

  const activeSession = useMemo<Session>(() => {
    return (
      sessions.find((s) => s.id === activeId) ??
      sessions[0] ??
      makeSession(welcomeMessage())
    );
  }, [sessions, activeId]);

  const updateActive = useCallback(
    (mutate: (session: Session) => Session) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === activeSession.id ? mutate(s) : s));
        return next;
      });
    },
    [activeSession.id]
  );

  const addPdfDocument = useCallback(
    async (uri: string, name: string, sizeBytes: number): Promise<AddDocResult> => {
      setBusyDoc(name);
      try {
        if (docs.length >= MAX_DOCS) {
          return { ok: false, message: `Library limit reached (${MAX_DOCS} documents). Remove one to add another.` };
        }
        const result = await extractPdfText(uri);
        if (result.quality === 'none' || result.pages.length === 0) {
          return {
            ok: false,
            message:
              'No selectable text layer found in this PDF (it is probably a scan or image-only file). Try a different PDF, or use the bundled sample notes.',
          };
        }

        let pages = result.pages;
        let note: string | undefined;
        let chars = result.totalChars;
        if (chars > MAX_DOC_CHARS) {
          const kept: string[] = [];
          let acc = 0;
          for (const page of pages) {
            if (acc >= MAX_DOC_CHARS) break;
            kept.push(page);
            acc += page.length;
          }
          pages = kept;
          chars = acc;
          note = `Index capped at the first ${kept.length} pages to keep the app fast.`;
        }

        const docId = uid('doc');
        const chunks = chunkPages(pages, docId);
        const meta = {
          id: docId,
          title: name.replace(/\.pdf$/i, ''),
          origin: 'upload' as const,
          pages: pages.length,
          chunkCount: chunks.length,
          chars,
          sizeBytes,
          addedAt: Date.now(),
          quality: result.quality,
          note: note ?? (result.quality === 'weak' ? 'Low text quality \u2014 verify answers against the PDF.' : undefined),
        };
        setDocs((prev) => [...prev, { meta, chunks }]);
        haptic('success');
        return {
          ok: true,
          message: `Indexed ${chunks.length} chunks across ${pages.length} page${pages.length === 1 ? '' : 's'} \u2014 ready for questions.`,
        };
      } catch (err) {
        return { ok: false, message: 'Could not read this file. Make sure it is a valid, uncorrupted PDF.' };
      } finally {
        setBusyDoc(null);
      }
    },
    [docs.length]
  );

  const addSampleDocument = useCallback(
    (sampleId: string): AddDocResult => {
      if (docs.some((d) => d.meta.id === sampleId)) {
        return { ok: false, message: 'This note is already in your library.' };
      }
      if (docs.length >= MAX_DOCS) {
        return { ok: false, message: `Library limit reached (${MAX_DOCS} documents).` };
      }
      const doc = docFromSample(sampleId);
      if (!doc) return { ok: false, message: 'Sample note not found.' };
      setDocs((prev) => [...prev, doc]);
      haptic('success');
      return {
        ok: true,
        message: `Added ${doc.meta.chunkCount} chunks from ${doc.meta.pages} pages.`,
      };
    },
    [docs.length, docs]
  );

  const removeDocument = useCallback((docId: string) => {
    setDocs((prev) => prev.filter((d) => d.meta.id !== docId));
    haptic('warn');
  }, []);

  const ask = useCallback(
    async (question: string, mode: AnswerMode) => {
      const trimmed = question.trim();
      if (!trimmed || thinking) return;

      const userMessage: Message = {
        id: newMessageId(),
        role: 'user',
        text: trimmed,
        createdAt: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSession.id) return s;
          const isFirst = s.messages.length === 0;
          return {
            ...s,
            title: isFirst ? truncate(trimmed, 38) : s.title,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage],
          };
        })
      );

      setThinking(true);
      haptic('tap');
      const started = Date.now();
      const result = generateAnswer(trimmed, docs, index, mode);
      const elapsed = Date.now() - started;
      const simulated = Math.min(1400, 420 + result.text.length * 1.6);
      if (simulated > elapsed) {
        await new Promise((resolve) => setTimeout(resolve, simulated - elapsed));
      }

      const assistantMessage: Message = {
        id: newMessageId(),
        role: 'assistant',
        text: result.text,
        mode,
        grounded: result.grounded,
        confidence: result.confidence,
        sources: result.sources,
        createdAt: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMessage] }
            : s
        )
      );
      setThinking(false);
      if (!result.grounded) haptic('warn');
    },
    [activeSession.id, docs, index, thinking]
  );

  const newChat = useCallback(() => {
    const session = makeSession();
    setSessions((prev) => [session, ...prev].slice(0, MAX_SESSIONS));
    setActiveId(session.id);
    haptic('tap');
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setActiveId(sessionId);
    haptic('tap');
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId);
        if (remaining.length === 0) {
          const fresh = makeSession(welcomeMessage());
          setActiveId(fresh.id);
          return [fresh];
        }
        if (sessionId === activeId) setActiveId(remaining[0].id);
        return remaining;
      });
      haptic('warn');
    },
    [activeId]
  );

  const clearAll = useCallback(() => {
    const session = makeSession(welcomeMessage());
    setDocs([]);
    setSessions([session]);
    setActiveId(session.id);
    haptic('warn');
  }, []);

  const toggleTheme = useCallback(() => {
    setSchemeOverride((prev) => {
      const current = prev ?? (systemScheme === 'light' ? 'light' : 'dark');
      return current === 'dark' ? 'light' : 'dark';
    });
    haptic('tap');
  }, [systemScheme]);

  const value: StoreValue = {
    ready,
    theme,
    toggleTheme,
    docs,
    sessions,
    activeSession,
    index,
    totalChunks,
    thinking,
    busyDoc,
    addPdfDocument,
    addSampleDocument,
    removeDocument,
    ask,
    newChat,
    selectSession,
    deleteSession,
    clearAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
