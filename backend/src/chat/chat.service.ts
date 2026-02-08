import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';
import { ChatRequestDto, ImageAttachmentDto } from './dto/chat.dto';
import type { LLMMessage } from './providers/llm.interface';

const SYSTEM_PROMPT = `You are a p5.js coding assistant. Help users create and fix p5.js sketches.

Rules:
- Provide complete, runnable p5.js code using global mode (setup/draw)
- Wrap code in \`\`\`javascript blocks
- Keep explanations to 1-3 sentences max
- Minimal code comments — only for non-obvious logic
- When fixing bugs, state what changed in one line

The user's current code is provided for context.`;

const DEMO_MODEL = 'llama-3.3-70b-versatile';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGES = 12;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TEXT_BYTES = 250_000;
const MAX_MESSAGE_TEXT_BYTES = 100_000;

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private groqProvider: GroqProvider,
  ) {}

  private estimateBase64Bytes(base64: string): number {
    const normalized = base64.replace(/\s/g, '');
    return Math.floor((normalized.length * 3) / 4);
  }

  private validateAndCountImages(images: ImageAttachmentDto[] | undefined, context: string): number {
    if (!images?.length) return 0;

    let totalBytes = 0;

    for (const img of images) {
      const estimated = this.estimateBase64Bytes(img.base64);
      totalBytes += estimated;

      if (estimated > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Image in ${context} exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        );
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(img.base64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 image data');
      }

      if (buf.length > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Image in ${context} exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        );
      }

      if (img.mimeType === 'image/png') {
        const valid = PNG_MAGIC.every((b, i) => buf[i] === b);
        if (!valid) {
          throw new BadRequestException(
            'Image content does not match declared PNG type',
          );
        }
      } else if (img.mimeType === 'image/jpeg') {
        const valid = JPEG_MAGIC.every((b, i) => buf[i] === b);
        if (!valid) {
          throw new BadRequestException(
            'Image content does not match declared JPEG type',
          );
        }
      }
    }

    return totalBytes;
  }

  private enforceImageBudgets(request: ChatRequestDto): void {
    let totalBytes = 0;
    let totalCount = request.images?.length ?? 0;

    totalBytes += this.validateAndCountImages(request.images, 'current message');

    for (const msg of request.history) {
      totalBytes += this.validateAndCountImages(msg.images, 'history');
      totalCount += msg.images?.length ?? 0;
    }

    if (totalCount > MAX_TOTAL_IMAGES) {
      throw new BadRequestException(`Too many images provided (${totalCount}). Max ${MAX_TOTAL_IMAGES} per request including history.`);
    }

    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      throw new BadRequestException(
        `Images exceed maximum combined size of ${MAX_TOTAL_IMAGE_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  private clampHistory(history: ChatRequestDto['history']): ChatRequestDto['history'] {
    if (!history?.length) return [];

    const capped = history.slice(-MAX_HISTORY_MESSAGES);
    const kept: typeof capped = [];
    let textBytes = 0;

    for (let i = capped.length - 1; i >= 0; i--) {
      const msg = capped[i];
      const content = msg.content.slice(0, MAX_MESSAGE_TEXT_BYTES);
      const contentBytes = Buffer.byteLength(content, 'utf8');

      if (contentBytes > MAX_MESSAGE_TEXT_BYTES) {
        throw new BadRequestException('Message content is too large');
      }

      if (textBytes + contentBytes > MAX_HISTORY_TEXT_BYTES) {
        continue;
      }

      kept.push({ ...msg, content });
      textBytes += contentBytes;
    }

    return kept.reverse();
  }

  async *streamChat(request: ChatRequestDto): AsyncGenerator<string> {
    const history = this.clampHistory(request.history);
    this.enforceImageBudgets({ ...request, history });

    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Current p5.js code:\n\`\`\`javascript\n${request.code}\n\`\`\``,
      },
    ];

    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
        ...(msg.images?.length ? { images: msg.images } : {}),
      });
    }

    messages.push({
      role: 'user',
      content: request.message,
      ...(request.images?.length ? { images: request.images } : {}),
    });

    if (request.config.provider === 'demo') {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        throw new Error('Demo mode is not configured. Please use your own API key in Settings.');
      }
      yield* this.groqProvider.stream(messages, DEMO_MODEL, groqKey);
      return;
    }

    const provider =
      request.config.provider === 'openai'
        ? this.openaiProvider
        : this.anthropicProvider;

    yield* provider.stream(messages, request.config.model, request.config.apiKey);
  }

  async listModels(provider: string, apiKey: string): Promise<string[]> {
    switch (provider) {
      case 'openai':
        return this.openaiProvider.listModels(apiKey);
      case 'anthropic':
        return this.anthropicProvider.listModels(apiKey);
      case 'demo': {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) return ['llama-3.3-70b-versatile'];
        return this.groqProvider.listModels(groqKey);
      }
      default:
        return [];
    }
  }
}
