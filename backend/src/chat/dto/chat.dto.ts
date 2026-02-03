export interface MessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LLMConfigDto {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

export interface ChatRequestDto {
  message: string;
  code: string;
  history: MessageDto[];
  config: LLMConfigDto;
}
