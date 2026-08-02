import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, ModelInfo } from './llm.interface';

@Injectable()
export class AnthropicProvider implements LLMProvider {
  private buildContent(
    msg: LLMMessage,
    cacheBreakpoint = false,
  ): string | Anthropic.ContentBlockParam[] {
    if (!msg.images?.length && !cacheBreakpoint) return msg.content;
    const parts: Anthropic.ContentBlockParam[] = [];
    for (const img of msg.images ?? []) {
      parts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: img.base64,
        },
      });
    }
    parts.push({
      type: 'text',
      text: msg.content,
      ...(cacheBreakpoint
        ? { cache_control: { type: 'ephemeral' as const } }
        : {}),
    });
    return parts;
  }

  async *stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    const client = new Anthropic({ apiKey });

    const systemMessage = messages.find((m) => m.role === 'system');
    // Two cache breakpoints: the static system prompt always hits on later
    // turns; the code-context message (always first in the chat) hits as long
    // as the sketch hasn't changed since the previous request.
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m, idx) => ({
        role: m.role as 'user' | 'assistant',
        content: this.buildContent(m, idx === 0),
      }));

    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 16_384,
        system: [
          {
            type: 'text',
            text: systemMessage?.content || '',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: chatMessages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const message = this.formatError(error);
        throw new Error(message);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const client = new Anthropic({ apiKey });
    try {
      const list = await client.models.list({ limit: 100 });
      // vision is resolved by ChatService via the name heuristic.
      return list.data
        .map((m) => m.id)
        .sort()
        .map((id) => ({ id }));
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const message = this.formatError(error);
        throw new Error(message);
      }
      throw error;
    }
  }

  private formatError(error: InstanceType<typeof Anthropic.APIError>): string {
    const msg = error.message.toLowerCase();

    if (msg.includes('credit balance') || msg.includes('billing')) {
      return 'Anthropic API: Insufficient credits. Please check your billing at console.anthropic.com';
    }
    if (msg.includes('invalid api key') || msg.includes('authentication')) {
      return 'Anthropic API: Invalid API key. Please check your key in Settings.';
    }
    if (msg.includes('rate limit')) {
      return 'Anthropic API: Rate limit exceeded. Please wait a moment and try again.';
    }
    if (msg.includes('model')) {
      return `Anthropic API: Model not available. Try a different model.`;
    }

    return `Anthropic API: ${error.message}`;
  }
}
