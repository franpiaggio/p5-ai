import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import type { ChatRequestDto } from './dto/chat.dto';
import type { LLMMessage } from './providers/llm.interface';

const SYSTEM_PROMPT = `You are an expert p5.js creative coding assistant. You help users create, debug, and improve their p5.js sketches.

When providing code:
- Always provide complete, runnable p5.js code
- Use the global mode (setup() and draw() functions)
- Include helpful comments explaining key concepts
- Wrap code in \`\`\`javascript code blocks

When answering questions:
- Be concise but helpful
- Explain p5.js concepts clearly
- Suggest creative improvements when appropriate

The user's current code will be provided for context.`;

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
