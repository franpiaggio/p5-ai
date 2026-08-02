import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage } from './llm.interface';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter via its OpenAI-compatible endpoint. Users connect their own
 * OpenRouter account through OAuth (see `AuthService.connectOpenRouter`), so the
 * `apiKey` here is that user's OpenRouter key and requests spend *their* balance
 * — never the operator's. Models are addressed as `vendor/model` (e.g.
 * `anthropic/claude-sonnet-4`).
 */
@Injectable()
export class OpenRouterProvider implements LLMProvider {
  private client(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      // Optional attribution headers OpenRouter uses for its rankings.
      defaultHeaders: { 'X-Title': 'p5.ai' },
    });
  }

  async *stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    const client = this.client(apiKey);

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })) as OpenAI.ChatCompletionMessageParam[],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const msg = error.message.toLowerCase();
        if (error.status === 402 || msg.includes('insufficient')) {
          throw new Error(
            'OpenRouter: insufficient credits. Add balance to your OpenRouter account and try again.',
          );
        }
        if (
          error.status === 401 ||
          msg.includes('invalid api key') ||
          msg.includes('authentication')
        ) {
          throw new Error(
            'OpenRouter: your connection expired. Reconnect your account in Settings.',
          );
        }
        if (error.status === 429 || msg.includes('rate limit')) {
          throw new Error(
            'OpenRouter rate limit reached. Please wait a moment and try again.',
          );
        }
        throw new Error(`OpenRouter API: ${error.message}`);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<string[]> {
    const client = this.client(apiKey);
    try {
      const list = await client.models.list();
      const models: string[] = [];
      for await (const model of list) {
        models.push(model.id);
      }
      return models.sort();
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenRouter API: ${error.message}`);
      }
      throw error;
    }
  }
}
