import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMStreamOptions } from './llm.interface';

const MAX_COMPLETION_TOKENS = 16_384;

/** Predicted Outputs is only accepted by the gpt-4o / gpt-4.1 families —
 * passing `prediction` to other models fails the whole request. */
const supportsPrediction = (model: string): boolean =>
  /^gpt-4o|^gpt-4\.1/.test(model);

@Injectable()
export class OpenAIProvider implements LLMProvider {
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
    options?: LLMStreamOptions,
  ): AsyncGenerator<string> {
    const client = new OpenAI({ apiKey });

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: this.buildContent(m),
        })) as OpenAI.ChatCompletionMessageParam[],
        stream: true,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        // Speculative decoding against the current code: full-rewrite responses
        // are a near-copy of it, cutting latency 2-4x. Rejected prediction
        // tokens bill at output rates — acceptable for sketch-sized files.
        ...(options?.prediction && supportsPrediction(model)
          ? { prediction: { type: 'content' as const, content: options.prediction } }
          : {}),
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
    const client = new OpenAI({ apiKey });
    try {
      const list = await client.models.list();
      const models: string[] = [];
      for await (const model of list) {
        if (model.id.startsWith('gpt-')) {
          models.push(model.id);
        }
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

    if (msg.includes('insufficient_quota') || msg.includes('billing')) {
      return 'OpenAI API: Insufficient credits. Please check your billing at platform.openai.com';
    }
    if (
      msg.includes('invalid api key') ||
      msg.includes('authentication') ||
      msg.includes('incorrect api key')
    ) {
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
