import { Controller, Post, Body, Res, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ListModelsDto } from './dto/chat.dto';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';

@Controller('api/chat')
@UseGuards(OptionalAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('models')
  async listModels(
    @Body() body: ListModelsDto,
    @Req() req: Request,
  ): Promise<{ models: string[] }> {
    try {
      const userId = (req as any).user?.sub as string | undefined;
      const apiKey = await this.chatService.resolveApiKey(
        body.provider,
        body.apiKey,
        userId,
      );
      const models = await this.chatService.listModels(body.provider, apiKey);
      return { models };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list models';
      throw new HttpException({ error: message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  async chat(@Body() request: ChatRequestDto, @Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream timeout: 2 minutes max
    res.setTimeout(300_000, () => {
      res.write(`data: ${JSON.stringify({ error: 'Stream timeout exceeded' })}\n\n`);
      res.end();
    });

    try {
      const userId = (req as any).user?.sub as string | undefined;
      const resolvedKey = await this.chatService.resolveApiKey(
        request.config.provider,
        request.config.apiKey,
        userId,
      );
      request.config.apiKey = resolvedKey;

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
