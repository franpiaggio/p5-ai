import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import type { ChatRequestDto } from './dto/chat.dto';
import type { LLMMessage } from './providers/llm.interface';

const SYSTEM_PROMPT = `You are a p5.js coding assistant. Help users create and fix p5.js sketches.

Rules:
- Provide complete, runnable p5.js code using global mode (setup/draw)
- Wrap code in \`\`\`javascript blocks
- Keep explanations to 1-3 sentences max
- Minimal code comments — only for non-obvious logic
- When fixing bugs, state what changed in one line

The user's current code is provided for context.`;

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
  ) {}

  async *streamChat(request: ChatRequestDto): AsyncGenerator<string> {
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
      });
    }

    messages.push({
      role: 'user',
      content: request.message,
    });

    const provider =
      request.config.provider === 'openai'
        ? this.openaiProvider
        : this.anthropicProvider;

    yield* provider.stream(messages, request.config.model, request.config.apiKey);
  }
}
