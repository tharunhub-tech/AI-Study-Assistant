/**
 * pdf.ts — mobile equivalent of PyPDF.
 *
 * Extracts the text layer of a PDF directly from its content streams:
 *   1. locate every `stream ... endstream` block,
 *   2. inflate FlateDecode (zlib) payloads with pako,
 *   3. parse the PDF text-showing operators (Tj / TJ / ' / "),
 *   4. rebuild readable lines from the positioning operators (Td / TD / T* / ET).
 *
 * Scanned/image-only PDFs have no text layer, which is detected and reported so
 * the app can warn the user instead of silently indexing garbage (safeguard #1).
 */
import { inflate } from 'pako';

export interface PdfExtractResult {
  pages: string[];
  totalChars: number;
  quality: 'good' | 'weak' | 'none';
}

function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    out += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return out;
}

function decodeLiteral(raw: string): string {
  let s = raw.slice(1, -1);
  s = s.replace(/\\\r?\n/g, '');
  s = s.replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)));
  s = s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1');
  return s;
}

function decodeHex(raw: string): string {
  let h = raw.slice(1, -1).replace(/\s+/g, '');
  if (h.length % 2 === 1) h += '0';
  const bytes: number[] = [];
  for (let i = 0; i < h.length; i += 2) bytes.push(parseInt(h.substr(i, 2), 16));
  if (bytes.length === 0) return '';

  // UTF-16BE encoded strings are common for titles / non-Latin fonts.
  let bigEndianNulls = 0;
  for (let i = 0; i < bytes.length; i += 2) if (bytes[i] === 0) bigEndianNulls++;
  if (bytes.length >= 4 && bigEndianNulls / (bytes.length / 2) > 0.6) {
    let out = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return out;
  }

  let printable = 0;
  for (const b of bytes) if ((b >= 32 && b < 127) || b === 10 || b === 13) printable++;
  if (printable / bytes.length < 0.7) return '';
  return bytes.map((b) => String.fromCharCode(b)).join('');
}

const TOKEN_RE =
  /\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]*>|\[|\]|[-+]?(?:\d+\.\d*|\.\d+|\d+)|[A-Za-z][A-Za-z0-9'"*]*|>>|<<|\/[^\s()<>\[\]{}\/]+|./g;

/** Converts one decoded content stream into readable text. */
function contentStreamToText(content: string): string {
  const lines: string[] = [];
  let line = '';
  let depth = 0;

  const flush = () => {
    const clean = line.replace(/\s+/g, ' ').trim();
    if (clean.length >= 2) lines.push(clean);
    line = '';
  };

  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(content)) !== null) {
    const token = match[0];
    const first = token[0];

    if (first === '[') {
      depth++;
      continue;
    }
    if (first === ']') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (first === '(') {
      line += decodeLiteral(token);
      continue;
    }
    if (first === '<' && token !== '<<') {
      line += decodeHex(token);
      continue;
    }
    if (token === '<<' || token === '>>') continue;
    if (first === '/') continue;
    if (first === '-' || first === '+' || first === '.' || (first >= '0' && first <= '9')) {
      // Kerning values inside a TJ array: strongly negative = wide gap = word break.
      if (depth > 0) {
        const num = parseFloat(token);
        if (!Number.isNaN(num) && num <= -80) line += ' ';
      }
      continue;
    }

    if (token === 'Td' || token === 'TD' || token === 'T*' || token === 'ET' || token === 'BT' || token === 'Tm') {
      flush();
      continue;
    }
    if (token === "'" || token === '"') {
      flush();
      continue;
    }
  }
  flush();
  return lines.join('\n');
}

function extractPages(bytes: Uint8Array): string[] {
  const raw = bytesToLatin1(bytes);
  const pages: string[] = [];
  let pos = 0;

  while (true) {
    const idx = raw.indexOf('stream', pos);
    if (idx === -1) break;
    const dictStart = raw.lastIndexOf('<<', idx);
    const dict = dictStart >= 0 ? raw.slice(dictStart, idx) : '';

    let dataStart = idx + 6;
    if (raw[dataStart] === '\r') dataStart++;
    if (raw[dataStart] === '\n') dataStart++;
    const endIdx = raw.indexOf('endstream', dataStart);
    if (endIdx === -1) break;
    pos = endIdx + 9;

    if (
      dict.includes('/Image') ||
      dict.includes('/Font') ||
      dict.includes('/ObjStm') ||
      dict.includes('/DCTDecode') ||
      dict.includes('/JPXDecode') ||
      dict.includes('/CCITTFaxDecode')
    ) {
      continue;
    }

    let content: string;
    if (dict.includes('/FlateDecode')) {
      try {
        const inflated = inflate(bytes.subarray(dataStart, endIdx));
        content = bytesToLatin1(inflated as Uint8Array);
      } catch {
        continue; // corrupt / unsupported stream — skip rather than fail the upload
      }
    } else if (!dict.includes('/Filter')) {
      content = bytesToLatin1(bytes.subarray(dataStart, endIdx));
    } else {
      continue;
    }

    if (!content.includes('BT') && !content.includes('Tj') && !content.includes('TJ')) continue;
    const text = contentStreamToText(content);
    if (text.trim().length > 0) pages.push(text);
  }

  return pages;
}

function qualityOf(pages: string[]): 'good' | 'weak' | 'none' {
  const all = pages.join(' ');
  if (all.trim().length < 60) return 'none';
  let printable = 0;
  for (let i = 0; i < all.length; i++) {
    const code = all.charCodeAt(i);
    if ((code >= 32 && code < 127) || code === 10 || code === 13) printable++;
  }
  const ratio = printable / all.length;
  if (ratio < 0.7 || all.length < 300) return 'weak';
  return 'good';
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    // Web fallback: blob:/data: URLs are readable through fetch.
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
}

export async function extractPdfText(uri: string): Promise<PdfExtractResult> {
  const bytes = await readFileBytes(uri);
  const head = bytesToLatin1(bytes.subarray(0, 8));
  if (!head.includes('%PDF')) {
    return { pages: [], totalChars: 0, quality: 'none' };
  }
  const pages = extractPages(bytes);
  const totalChars = pages.reduce((sum, p) => sum + p.length, 0);
  return { pages, totalChars, quality: qualityOf(pages) };
}
