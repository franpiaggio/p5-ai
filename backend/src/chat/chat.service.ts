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

// PNG: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// JPEG: FF D8 FF
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB decoded

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private groqProvider: GroqProvider,
  ) {}

  private validateImages(images?: ImageAttachmentDto[]) {
    if (!images?.length) return;

    for (const img of images) {
      // Decode and check size
      let buf: Buffer;
      try {
        buf = Buffer.from(img.base64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 image data');
      }

      if (buf.length > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Image exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        );
      }

      // Validate magic bytes match claimed mimeType
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
  }

  async *streamChat(request: ChatRequestDto): AsyncGenerator<string> {
    // Validate images on current message and history
    this.validateImages(request.images);
    for (const msg of request.history) {
      this.validateImages(msg.images);
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Current p5.js code:\n\`\`\`javascript\n${request.code}\n\`\`\``,
      },
    ];

    for (const msg of request.history) {
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
