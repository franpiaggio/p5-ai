import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage } from './llm.interface';

@Injectable()
export class GroqProvider implements LLMProvider {
  private buildContent(msg: LLMMessage): string | OpenAI.ChatCompletionContentPart[] {
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
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

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
        if (msg.includes('rate limit')) {
          throw new Error('Demo mode rate limit reached. Please wait a moment or configure your own API key in Settings.');
        }
        if (msg.includes('invalid api key') || msg.includes('authentication')) {
          throw new Error('Groq API: Invalid API key. Please check server configuration.');
        }
        throw new Error(`Groq API: ${error.message}`);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<string[]> {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const list = await client.models.list();
    const models: string[] = [];
    for await (const model of list) {
      models.push(model.id);
    }
    return models.sort();
  }
}
