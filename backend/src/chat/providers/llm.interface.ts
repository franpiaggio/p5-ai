export interface LLMImageAttachment {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: LLMImageAttachment[];
}

export interface LLMStreamOptions {
  /** Expected response body for speculative decoding (OpenAI Predicted Outputs):
   * the current sketch code fenced — a near-copy when the model does a full rewrite. */
  prediction?: string;
}

export interface LLMProvider {
  stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
    options?: LLMStreamOptions,
  ): AsyncGenerator<string>;

  listModels(apiKey: string): Promise<string[]>;
}
