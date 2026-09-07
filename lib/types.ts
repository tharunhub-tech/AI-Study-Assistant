export type AnswerMode = 'direct' | 'keypoints' | 'recap';

export type DocQuality = 'good' | 'weak' | 'none';

export interface Chunk {
  id: string;
  docId: string;
  page: number;
  index: number;
  text: string;
}

export interface DocMeta {
  id: string;
  title: string;
  origin: 'sample' | 'upload';
  pages: number;
  chunkCount: number;
  chars: number;
  sizeBytes: number;
  addedAt: number;
  quality: DocQuality;
  note?: string;
}

export interface LoadedDoc {
  meta: DocMeta;
  chunks: Chunk[];
}

export interface SourceRef {
  chunkId: string;
  docId: string;
  docTitle: string;
  page: number;
  score: number;
  snippet: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: AnswerMode;
  grounded?: boolean;
  confidence?: number;
  sources?: SourceRef[];
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface SampleDoc {
  id: string;
  title: string;
  subject: string;
  pages: string[];
}
