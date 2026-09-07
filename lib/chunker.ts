import { Chunk } from './types';
import { splitSentences } from './textUtils';

/**
 * Mobile port of LangChain's RecursiveCharacterTextSplitter.
 * Packs sentences into chunks of ~chunkSize characters with overlap between
 * consecutive chunks, keeping page attribution so answers can cite sources.
 */
export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkPages(pages: string[], docId: string, opts: ChunkOptions = {}): Chunk[] {
  const chunkSize = opts.chunkSize ?? 1100;
  const overlap = opts.overlap ?? 180;
  const chunks: Chunk[] = [];
  let globalIndex = 0;

  pages.forEach((pageText, pageIndex) => {
    const page = pageIndex + 1;
    const sentences = splitSentences(pageText);
    let current: string[] = [];
    let length = 0;

    const pushCurrent = () => {
      const text = current.join(' ').replace(/\s+/g, ' ').trim();
      if (text.length >= 40) {
        chunks.push({ id: `${docId}_c${globalIndex}`, docId, page, index: globalIndex, text });
        globalIndex++;
      }
      return text;
    };

    for (const sentence of sentences) {
      if (length + sentence.length + 1 > chunkSize && current.length > 0) {
        const previous = pushCurrent();
        // carry overlap into the next chunk so answers are not cut mid-thought
        const carry = previous.slice(Math.max(0, previous.length - overlap));
        const cutAt = carry.indexOf(' ');
        const carryText = cutAt > -1 && carry.length - cutAt < overlap ? carry.slice(cutAt + 1) : carry;
        current = carryText ? [carryText] : [];
        length = carryText.length;
      }
      current.push(sentence);
      length += sentence.length + 1;
    }
    if (current.length > 0) pushCurrent();
  });

  return chunks;
}

export function chunkStats(chunks: Chunk[]): { chars: number; avg: number } {
  const chars = chunks.reduce((sum, c) => sum + c.text.length, 0);
  return { chars, avg: chunks.length ? Math.round(chars / chunks.length) : 0 };
}
