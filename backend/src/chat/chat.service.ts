import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';
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

const DEMO_MODEL = 'llama-3.3-70b-versatile';

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private groqProvider: GroqProvider,
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
}
