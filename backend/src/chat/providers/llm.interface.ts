export interface LLMImageAttachment {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: LLMImageAttachment[];
}

export interface LLMProvider {
  stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string>;

  listModels(apiKey: string): Promise<string[]>;
}
