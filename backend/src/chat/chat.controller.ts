import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatRequestDto, ListModelsDto } from './dto/chat.dto';
import type { ModelInfo } from './providers/llm.interface';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { OriginGuard } from '../common/origin.guard';
import { UsageService } from '../usage/usage.service';

/** Request after OptionalAuthGuard has (optionally) attached the JWT payload. */
type AuthedRequest = Request & { user?: { sub?: string } };

// OriginGuard: chat can spend the server-side demo key, so it is app-only —
// callers must present the app's Origin/Referer (plus the global throttling).
@Controller('api/chat')
@UseGuards(OriginGuard, OptionalAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usageService: UsageService,
  ) {}

  @Post('models')
  async listModels(
    @Body() body: ListModelsDto,
    @Req() req: Request,
  ): Promise<{ models: ModelInfo[] }> {
    try {
      const userId = (req as AuthedRequest).user?.sub;
      const apiKey = await this.chatService.resolveApiKey(
        body.provider,
        body.apiKey,
        userId,
      );
      const models = await this.chatService.listModels(body.provider, apiKey);
      return { models };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list models';
      throw new HttpException({ error: message }, HttpStatus.BAD_REQUEST);
    }
  }

  // Free-usage quota status for the caller. Logged-in users get their per-user
  // allowance; anonymous callers get the lower per-IP allowance (`anonymous:true`)
  // so the UI can nudge them to sign in for more.
  @Get('usage')
  async getUsage(@Req() req: Request) {
    const userId = (req as AuthedRequest).user?.sub;
    const anonymous = !userId;
    const limit = anonymous
      ? this.usageService.anonDailyLimit
      : this.usageService.dailyLimit;
    const subject = this.usageService.subjectFor(userId, req.ip);
    const status = await this.usageService.getStatus(subject, limit);
    return { requiresLogin: false, anonymous, ...status };
  }

  // Tighter than the global limits: every request here is a full LLM call
  // (and demo mode spends the server-side key). Human chat pacing fits well
  // under 10/min.
  @Throttle({
    short: { limit: 10, ttl: 60_000 },
    long: { limit: 100, ttl: 600_000 },
  })
  @Post()
  async chat(
    @Body() request: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as AuthedRequest).user?.sub;
    const isDemo = request.config.provider === 'demo';
    // Free/demo usage runs on the operator's shared keys, so it is rationed:
    // per user when logged in, per IP (lower cap) when anonymous. BYOK skips this.
    const quotaSubject = this.usageService.subjectFor(userId, req.ip);
    const quotaLimit = userId
      ? this.usageService.dailyLimit
      : this.usageService.anonDailyLimit;

    // Pre-flight (nothing streamed yet, so this surfaces as a real HTTP status).
    if (isDemo) {
      if (!(await this.usageService.hasRemaining(quotaSubject, quotaLimit))) {
        const status = await this.usageService.getStatus(
          quotaSubject,
          quotaLimit,
        );
        const upsell = userId
          ? 'add your own API key in Settings for unlimited use'
          : 'sign in for more, or add your own API key';
        throw new HttpException(
          {
            error: `You've reached today's free limit of ${status.limit} messages. It resets at midnight UTC — ${upsell}.`,
            ...status,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    let resolvedKey: string;
    try {
      resolvedKey = await this.chatService.resolveApiKey(
        request.config.provider,
        request.config.apiKey,
        userId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'API key is required';
      throw new HttpException({ error: message }, HttpStatus.BAD_REQUEST);
    }
    request.config.apiKey = resolvedKey;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream timeout: 2 minutes max
    res.setTimeout(300_000, () => {
      res.write(
        `data: ${JSON.stringify({ error: 'Stream timeout exceeded' })}\n\n`,
      );
      res.end();
    });

    try {
      let counted = false;
      for await (const chunk of this.chatService.streamChat(request)) {
        // Charge the free quota only once real output starts, so a request that
        // fails before producing anything doesn't cost the caller a message.
        if (isDemo && !counted) {
          counted = true;
          void this.usageService.increment(quotaSubject).catch(() => {});
        }
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      if (!res.writableEnded) res.write('data: [DONE]\n\n');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
}
