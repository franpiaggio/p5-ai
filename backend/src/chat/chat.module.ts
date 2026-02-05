import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';

@Module({
  controllers: [ChatController],
  providers: [ChatService, OpenAIProvider, AnthropicProvider, GroqProvider],
})
export class ChatModule {}
