import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, ModelInfo } from './llm.interface';

@Injectable()
export class GroqProvider implements LLMProvider {
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
      // Groq doesn't support vision — always send content as plain string.
      // Groq's TPM rate limiter counts input + max_tokens as the request size,
      // and this provider only ever runs on the server's demo key (free tier:
      // 12k TPM on llama-3.3-70b). 4k output leaves ~8k for input — enough for
      // a full sketch rewrite while keeping large sketches under the limit.
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
        if (msg.includes('rate limit')) {
          throw new Error(
            'Demo mode rate limit reached. Please wait a moment or configure your own API key in Settings.',
          );
        }
        if (msg.includes('invalid api key') || msg.includes('authentication')) {
          throw new Error(
            'Groq API: Invalid API key. Please check server configuration.',
          );
        }
        throw new Error(`Groq API: ${error.message}`);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    try {
      const list = await client.models.list();
      const models: string[] = [];
      for await (const model of list) {
        models.push(model.id);
      }
      return models.sort().map((id) => ({ id }));
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid api key') || msg.includes('authentication')) {
          throw new Error(
            'Groq API: Invalid API key. Please check server configuration.',
          );
        }
        throw new Error(`Groq API: ${error.message}`);
      }
      throw error;
    }
  }
}
