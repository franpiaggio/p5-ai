export interface ImageAttachment {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: ImageAttachment[];
}

export interface ConsoleLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
  line?: number;
  column?: number;
}

export interface EditorError {
  line: number;
  column?: number;
  message: string;
}

export interface LLMConfig {
  provider: 'demo' | 'openai' | 'anthropic' | 'deepseek';
  model: string;
  apiKey: string;
}

export interface CodeChange {
  id: string;
  messageId: string;
  timestamp: number;
  previousCode: string;
  newCode: string;
  summary?: string;
  prompt?: string;
  isRestore?: boolean;
}

export type ProviderKeys = Partial<Record<LLMConfig['provider'], string>>;

export type TabType = 'console' | 'chat' | 'history' | 'code';

export interface SketchSummary {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SketchFull extends SketchSummary {
  code: string;
  codeHistory?: CodeChange[] | null;
}
