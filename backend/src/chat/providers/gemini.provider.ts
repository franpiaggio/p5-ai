import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, ModelInfo } from './llm.interface';

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/';

/**
 * Google Gemini via its OpenAI-compatible endpoint. Used as a free-tier fallback
 * for demo mode (see `ChatService.streamDemo`) — the generous free quota on the
 * Flash models makes it a good backstop when Groq is rate-limited.
 *
 * Like the Groq demo path, this sends text-only content: the demo chain is uniform
 * across providers and image handling stays with the BYOK providers.
 */
@Injectable()
export class GeminiProvider implements LLMProvider {
  async *stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    const client = new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL });

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })) as OpenAI.ChatCompletionMessageParam[],
        stream: true,
        max_tokens: 4_096,
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
        if (
          error.status === 429 ||
          msg.includes('rate limit') ||
          msg.includes('quota') ||
          msg.includes('resource_exhausted')
        ) {
          throw new Error(
            'Demo mode rate limit reached. Please wait a moment or configure your own API key in Settings.',
          );
        }
        if (msg.includes('api key') || msg.includes('authentication')) {
          throw new Error(
            'Gemini API: Invalid API key. Please check server configuration.',
          );
        }
        throw new Error(`Gemini API: ${error.message}`);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const client = new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL });
    try {
      const list = await client.models.list();
      const models: string[] = [];
      for await (const model of list) {
        models.push(model.id);
      }
      return models.sort().map((id) => ({ id }));
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`Gemini API: ${error.message}`);
      }
      throw error;
    }
  }
}
