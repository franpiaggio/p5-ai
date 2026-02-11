import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage } from './llm.interface';

@Injectable()
export class DeepSeekProvider implements LLMProvider {
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
      baseURL: 'https://api.deepseek.com',
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
        const message = this.formatError(error);
        throw new Error(message);
      }
      throw error;
    }
  }

  async listModels(apiKey: string): Promise<string[]> {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
    try {
      const list = await client.models.list();
      const models: string[] = [];
      for await (const model of list) {
        models.push(model.id);
      }
      return models.sort();
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const message = this.formatError(error);
        throw new Error(message);
      }
      throw error;
    }
  }

  private formatError(error: InstanceType<typeof OpenAI.APIError>): string {
    const msg = error.message.toLowerCase();

    if (msg.includes('insufficient') || msg.includes('billing') || msg.includes('balance')) {
      return 'DeepSeek API: Insufficient credits. Please check your balance at platform.deepseek.com';
    }
    if (msg.includes('invalid api key') || msg.includes('authentication') || msg.includes('auth')) {
      return 'DeepSeek API: Invalid API key. Please check your key in Settings.';
    }
    if (msg.includes('rate limit')) {
      return 'DeepSeek API: Rate limit exceeded. Please wait a moment and try again.';
    }
    if (msg.includes('model')) {
      return 'DeepSeek API: Model not available. Try a different model.';
    }

    return `DeepSeek API: ${error.message}`;
  }
}
