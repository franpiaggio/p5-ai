import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, ModelInfo } from './llm.interface';

/** OpenRouter's `/models` entries extend the OpenAI shape with an
 * `architecture.input_modalities` array (e.g. `["text", "image"]`). */
type OpenRouterModel = {
  id: string;
  architecture?: { input_modalities?: string[] };
};

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

  /** OpenAI-compatible content: plain string, or text + image_url data-URL
   * parts when the message carries images (multimodal OpenRouter models). */
  private buildContent(
    msg: LLMMessage,
  ): string | OpenAI.ChatCompletionContentPart[] {
    if (!msg.images?.length) return msg.content;
    const parts: OpenAI.ChatCompletionContentPart[] = [
      { type: 'text', text: msg.content },
    ];
    for (const img of msg.images) {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      });
    }
    return parts;
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
          content: this.buildContent(m),
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

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const client = this.client(apiKey);
    try {
      const list = await client.models.list();
      const models: ModelInfo[] = [];
      for await (const model of list) {
        // OpenRouter reports modalities live, so vision is authoritative here.
        const modalities = (model as unknown as OpenRouterModel).architecture
          ?.input_modalities;
        models.push({
          id: model.id,
          vision: Array.isArray(modalities)
            ? modalities.includes('image')
            : undefined,
        });
      }
      return models.sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenRouter API: ${error.message}`);
      }
      throw error;
    }
  }
}
