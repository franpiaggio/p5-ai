import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ListModelsDto } from './dto/chat.dto';

@Controller('api/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('models')
  async listModels(@Body() body: ListModelsDto): Promise<{ models: string[] }> {
    const models = await this.chatService.listModels(
      body.provider,
      body.apiKey || '',
    );
    return { models };
  }

  @Post()
  async chat(@Body() request: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream timeout: 2 minutes max
    res.setTimeout(120_000, () => {
      res.write(`data: ${JSON.stringify({ error: 'Stream timeout exceeded' })}\n\n`);
      res.end();
    });

    try {
      for await (const chunk of this.chatService.streamChat(request)) {
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      if (!res.writableEnded) res.write('data: [DONE]\n\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
}
