import { Chunk } from './types';
import { tokenize } from './textUtils';

/**
 * In-device BM25 vector store — the mobile counterpart of the FAISS index.
 * BM25 is a standard lexical-similarity ranking function used in search
 * engines and is the scoring half of most RAG retrievers.
 */
export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
  confidence: number; // 0..1 saturating score for UI display
}

const K1 = 1.5;
const B = 0.75;

export class BM25Index {
  private chunks: Chunk[] = [];
  private tf: Map<string, number>[] = [];
  private df: Map<string, number> = new Map();
  private dl: number[] = [];
  private avgdl = 0;

  get size(): number {
    return this.chunks.length;
  }

  get docCount(): number {
    return new Set(this.chunks.map((c) => c.docId)).size;
  }

  build(chunks: Chunk[]): void {
    this.chunks = chunks;
    this.tf = [];
    this.df = new Map();
    this.dl = [];
    let total = 0;

    chunks.forEach((chunk, i) => {
      const terms = tokenize(chunk.text);
      const counts = new Map<string, number>();
      for (const t of terms) counts.set(t, (counts.get(t) ?? 0) + 1);
      counts.forEach((_, term) => this.df.set(term, (this.df.get(term) ?? 0) + 1));
      this.tf[i] = counts;
      this.dl[i] = terms.length;
      total += terms.length;
    });

    this.avgdl = chunks.length ? total / chunks.length : 0;
  }

  search(query: string, k = 5): RetrievedChunk[] {
    if (this.chunks.length === 0) return [];
    const queryTerms = Array.from(new Set(tokenize(query)));
    if (queryTerms.length === 0) return [];

    const N = this.chunks.length;
    const results: RetrievedChunk[] = [];

    for (let i = 0; i < N; i++) {
      const counts = this.tf[i];
      const dl = this.dl[i] || 1;
      let score = 0;
      for (const term of queryTerms) {
        const tf = counts.get(term);
        if (!tf) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * (dl / this.avgdl)));
        score += idf * norm;
      }
      if (score > 0) {
        results.push({
          chunk: this.chunks[i],
          score,
          confidence: Math.min(1, score / (score + 2.6)),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  /** Coverage of query terms in a chunk — used by the answer synthesiser. */
  static coverage(text: string, queryTerms: string[]): number {
    const doc = new Set(tokenize(text));
    let hits = 0;
    for (const t of queryTerms) if (doc.has(t)) hits++;
    return queryTerms.length ? hits / queryTerms.length : 0;
  }
}

export function buildIndex(chunks: Chunk[]): BM25Index {
  const index = new BM25Index();
  index.build(chunks);
  return index;
}
