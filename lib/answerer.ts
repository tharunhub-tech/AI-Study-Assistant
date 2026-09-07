import { BM25Index } from './retriever';
import { AnswerMode, LoadedDoc, SourceRef } from './types';
import { jaccard, splitSentences, tokenize, truncate, uid } from './textUtils';

/**
 * answerer.ts — the RAG generation half.
 *
 * Because the app must run offline and on free tiers only, answers are built
 * extractively: the retriever ranks chunks, the synthesiser selects and orders
 * the best sentences, and a guardrail refuses to answer when nothing in the
 * library is relevant (anti-hallucination safeguard).
 */
export interface AnswerResult {
  grounded: boolean;
  text: string;
  sources: SourceRef[];
  /** Integer 0-100 confidence shown in the answer badge. */
  confidence: number;
  notice?: string;
}

const MIN_CONFIDENCE = 0.2;
const TOP_CHUNKS = 5;
const MAX_SENTENCE = 620;

/** A question must be matched by at least this many distinct note terms. */
function requiredHits(queryTermCount: number): number {
  return Math.min(2, queryTermCount);
}

function countHits(text: string, queryTerms: string[]): number {
  const doc = new Set(tokenize(text));
  let hits = 0;
  for (const term of queryTerms) if (doc.has(term)) hits++;
  return hits;
}

/** Long lecture sentences are broken at clause boundaries so they can be quoted. */
function refine(sentence: string): string[] {
  if (sentence.length <= MAX_SENTENCE) return [sentence];
  const parts = sentence.split(/;\s+|\s+[—–]\s+|:\s+(?=[A-Z0-9])/);
  if (parts.length > 1) {
    const out: string[] = [];
    let buf = '';
    for (const part of parts) {
      if (buf && buf.length + part.length > 500) {
        out.push(buf.trim());
        buf = '';
      }
      buf += (buf ? ' ' : '') + part.trim();
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
  const words = sentence.split(' ');
  const out: string[] = [];
  let buf = '';
  for (const word of words) {
    if (buf.length + word.length > 450 && buf.length > 120) {
      out.push(buf.trim());
      buf = '';
    }
    buf += word + ' ';
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function generateAnswer(
  question: string,
  docs: LoadedDoc[],
  index: BM25Index,
  mode: AnswerMode
): AnswerResult {
  if (docs.length === 0) {
    return {
      grounded: false,
      text:
        'Your library is empty, so I have nothing to search. Add a lecture PDF (or a sample note) from the Library tab, then ask me again — I answer only from what you upload.',
      sources: [],
      confidence: 0,
      notice: 'No documents indexed',
    };
  }

  const queryTerms = Array.from(new Set(tokenize(question)));
  if (queryTerms.length === 0) {
    return {
      grounded: false,
      text: 'That question is too short for me to match against your notes. Try a full sentence such as "What is third normal form?"',
      sources: [],
      confidence: 0,
      notice: 'Query too short',
    };
  }

  const minHits = requiredHits(queryTerms.length);

  // ---- retrieval + relevance gate ----------------------------------------
  const hits = index
    .search(question, TOP_CHUNKS)
    .filter((hit) => hit.confidence >= MIN_CONFIDENCE)
    .filter((hit) => countHits(hit.chunk.text, queryTerms) >= minHits);

  if (hits.length === 0) {
    return {
      grounded: false,
      text:
        `I could not find "${truncate(question, 70)}" anywhere in your uploaded notes, so I will not guess an answer. ` +
        'This safeguard keeps every answer sourced from your own material. Try rephrasing with the terms used in the lecture, or upload the unit that covers this topic.',
      sources: [],
      confidence: 0,
      notice: 'No relevant chunk above threshold',
    };
  }

  // ---- sentence selection across the top-ranked chunks --------------------
  interface ScoredSentence {
    text: string;
    score: number;
    order: number;
    docId: string;
    docTitle: string;
    page: number;
  }

  const candidates: ScoredSentence[] = [];
  let order = 0;
  hits.forEach((hit, hitIndex) => {
    const doc = docs.find((d) => d.meta.id === hit.chunk.docId);
    const title = doc?.meta.title ?? 'Notes';
    const pieces = splitSentences(hit.chunk.text).flatMap(refine);
    pieces.forEach((sentence, sIndex) => {
      if (sentence.length < 25 || sentence.length > MAX_SENTENCE) return;
      // avoid mid-sentence fragments such as "robin scheduling? Answer: ..."
      if (!/^[A-Z0-9"'(\[]/.test(sentence)) return;
      const hitsInSentence = countHits(sentence, queryTerms);
      if (hitsInSentence < minHits) return;
      let score = (hitsInSentence / queryTerms.length) * 3 + hit.confidence;
      if (sIndex === 0) score += 0.25;
      if (sentence.length >= 60 && sentence.length <= 260) score += 0.2;
      candidates.push({
        text: sentence,
        score,
        order: order++,
        docId: hit.chunk.docId,
        docTitle: title,
        page: hit.chunk.page,
      });
    });
  });

  if (candidates.length === 0) {
    return {
      grounded: false,
      text:
        'Your notes mention this topic, but not clearly enough to quote an answer confidently. Try a more specific question (for example, name the exact concept you want defined).',
      sources: hits.slice(0, 2).map((h) => toSource(h, docs)),
      confidence: Math.round(hits[0].confidence * 100),
      notice: 'Matched but not quotable',
    };
  }

  candidates.sort((a, b) => b.score - a.score);
  const chosen: ScoredSentence[] = [];
  for (const candidate of candidates) {
    if (chosen.length >= (mode === 'recap' ? 2 : 4)) break;
    if (chosen.some((c) => jaccard(c.text, candidate.text) > 0.55)) continue;
    chosen.push(candidate);
  }
  chosen.sort((a, b) => a.order - b.order);

  const confidence = Math.round(Math.min(1, hits[0].confidence + 0.12) * 100);
  const sources: SourceRef[] = hits.slice(0, 3).map((h) => toSource(h, docs));
  const primary = chosen[0];

  let body: string;
  if (mode === 'keypoints') {
    body = chosen.map((c) => `\u2022 ${toBullet(c.text)}`).join('\n');
  } else if (mode === 'recap') {
    body = chosen.map((c) => shorten(c.text)).join(' ');
  } else {
    body = chosen
      .map((c) => (c.docId === primary.docId ? c.text : `[${c.docTitle}, p.${c.page}] ${c.text}`))
      .join(' ');
  }

  return {
    grounded: true,
    text: body,
    sources,
    confidence,
  };
}

function toSource(
  hit: { chunk: { id: string; docId: string; page: number; text: string }; confidence: number },
  docs: LoadedDoc[]
): SourceRef {
  const doc = docs.find((d) => d.meta.id === hit.chunk.docId);
  return {
    chunkId: hit.chunk.id,
    docId: hit.chunk.docId,
    docTitle: doc?.meta.title ?? 'Notes',
    page: hit.chunk.page,
    score: Math.round(hit.confidence * 100),
    snippet: truncate(hit.chunk.text.replace(/\s+/g, ' '), 96),
  };
}

function shorten(sentence: string): string {
  const clauses = sentence.split(/,\s+(?=which|where|so that|and so)\s*/i);
  let text = clauses[0];
  if (text.length > 210) {
    const cut = text.indexOf(', ');
    if (cut > 60) text = text.slice(0, cut);
  }
  text = text.trim();
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

function toBullet(sentence: string): string {
  let s = sentence.replace(/^(therefore|thus|hence|also|however|finally|in addition|specifically)[:,]?\s+/i, '');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

export function newMessageId(): string {
  return uid('msg');
}
