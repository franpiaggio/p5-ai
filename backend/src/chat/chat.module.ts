import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [UsersModule, AuthModule, UsageModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    OpenAIProvider,
    AnthropicProvider,
    GroqProvider,
    GeminiProvider,
    DeepSeekProvider,
    OpencodeProvider,
    OpenRouterProvider,
  ],
})
export class ChatModule {}
