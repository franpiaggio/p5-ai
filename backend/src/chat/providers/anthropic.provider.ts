import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage } from './llm.interface';

@Injectable()
export class AnthropicProvider implements LLMProvider {
  private buildContent(msg: LLMMessage): string | Anthropic.ContentBlockParam[] {
    if (!msg.images?.length) return msg.content;
    const parts: Anthropic.ContentBlockParam[] = [];
    for (const img of msg.images) {
      parts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: img.base64,
        },
      });
    }
    parts.push({ type: 'text', text: msg.content });
    return parts;
  }

  async *stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    const client = new Anthropic({ apiKey });

    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: this.buildContent(m),
      }));

    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 16_384,
        system: systemMessage?.content || '',
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

  async listModels(apiKey: string): Promise<string[]> {
    const client = new Anthropic({ apiKey });
    try {
      const list = await client.models.list({ limit: 100 });
      return list.data
        .map((m) => m.id)
        .sort();
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
