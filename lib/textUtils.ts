/**
 * Small, dependency-free text utilities used by the retrieval pipeline.
 * (Mobile equivalent of the LangChain text splitter + tokenizer helpers.)
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'to', 'in', 'on',
  'at', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'it', 'its', 'this',
  'that', 'these', 'those', 'for', 'with', 'as', 'by', 'from', 'into', 'than', 'then',
  'too', 'very', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might',
  'do', 'does', 'did', 'done', 'have', 'has', 'had', 'you', 'your', 'yours', 'we', 'our',
  'they', 'them', 'their', 'he', 'she', 'his', 'her', 'i', 'me', 'my', 'what', 'which',
  'who', 'whom', 'how', 'when', 'where', 'why', 'not', 'no', 'so', 'such', 'about',
  'between', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
  'over', 'under', 'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'only', 'own', 'same', 'also', 'using',
  'used', 'use', 'e', 'g', 'eg', 'ie', 'ie', 'etc', 'via', 'per', 'one', 'two', 'three',
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very small Porter-style stemmer so "scheduling" matches "schedule"-family words. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 4) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('edly')) return w.slice(0, -4);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('ment') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('ness') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
    return w.slice(0, -1);
  }
  return w;
}

/** Tokenize into stemmed, stopword-filtered terms. */
export function tokenize(text: string): string[] {
  const norm = normalize(text);
  if (!norm) return [];
  const out: string[] = [];
  for (const raw of norm.split(' ')) {
    if (raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Splits text into sentences, tolerating newlines from PDF line wrapping. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    const isEnd = ch === '.' || ch === '!' || ch === '?' || ch === '\n';
    if (!isEnd) continue;
    const prev = text[i - 1] ?? '';
    const next = text[i + 1] ?? ' ';
    if (ch === '.' && /[0-9]/.test(prev) && /[0-9]/.test(next)) continue;
    if (ch === '.') {
      const tail = buf.slice(-4).toLowerCase();
      if (/\b(e\.g|i\.e|etc|vs|dr|prof|mr|ms|fig|no)\.?$/.test(tail)) continue;
      // Skip whitespace after the terminator, then require a clear new-sentence start.
      let j = i + 1;
      while (j < text.length && /[ \t\r]/.test(text[j])) j++;
      const following = j < text.length ? text[j] : '\n';
      if (!/[\nA-Z0-9\"'(\[]/.test(following)) continue;
    }
    const clean = buf.replace(/\s+/g, ' ').trim();
    if (clean.length > 1) out.push(clean);
    buf = '';
  }
  const tail = buf.replace(/\s+/g, ' ').trim();
  if (tail.length > 1) out.push(tail);
  return out;
}

export function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '\u2026';
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
