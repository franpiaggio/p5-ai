import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage } from './llm.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  async *stream(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    const client = new OpenAI({ apiKey });

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
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

  private formatError(error: InstanceType<typeof OpenAI.APIError>): string {
    const msg = error.message.toLowerCase();

    if (msg.includes('insufficient_quota') || msg.includes('billing')) {
      return 'OpenAI API: Insufficient credits. Please check your billing at platform.openai.com';
    }
    if (msg.includes('invalid api key') || msg.includes('authentication') || msg.includes('incorrect api key')) {
      return 'OpenAI API: Invalid API key. Please check your key in Settings.';
    }
    if (msg.includes('rate limit')) {
      return 'OpenAI API: Rate limit exceeded. Please wait a moment and try again.';
    }
    if (msg.includes('model')) {
      return `OpenAI API: Model not available. Try a different model.`;
    }

    return `OpenAI API: ${error.message}`;
  }
}
