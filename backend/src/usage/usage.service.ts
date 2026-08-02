import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageDaily } from './usage.entity';

export interface QuotaStatus {
  /** Messages already spent today. */
  used: number;
  /** Daily allowance for this subject. */
  limit: number;
  /** Messages left today (never negative). */
  remaining: number;
  /** ISO timestamp of the next UTC midnight, when the allowance resets. */
  resetsAt: string;
}

const DEFAULT_FREE_MESSAGES_PER_DAY = 25;
const DEFAULT_ANON_FREE_MESSAGES_PER_DAY = 3;

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageDaily)
    private usageRepository: Repository<UsageDaily>,
    private configService: ConfigService,
  ) {}

  private limitFromEnv(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  /** Daily free-message allowance for a logged-in user (`FREE_MESSAGES_PER_DAY`). */
  get dailyLimit(): number {
    return this.limitFromEnv(
      'FREE_MESSAGES_PER_DAY',
      DEFAULT_FREE_MESSAGES_PER_DAY,
    );
  }

  /** Lower allowance for anonymous callers (`ANON_FREE_MESSAGES_PER_DAY`). */
  get anonDailyLimit(): number {
    return this.limitFromEnv(
      'ANON_FREE_MESSAGES_PER_DAY',
      DEFAULT_ANON_FREE_MESSAGES_PER_DAY,
    );
  }

  /** Quota subject for a request: the user if logged in, else their IP. */
  subjectFor(userId?: string, ip?: string): string {
    return userId ? `u:${userId}` : `ip:${ip ?? 'unknown'}`;
  }

  /** Current UTC calendar day as `YYYY-MM-DD`. */
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** ISO timestamp of the next UTC midnight. */
  private nextReset(): string {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    return next.toISOString();
  }

  private async count(subject: string, day: string): Promise<number> {
    const row = await this.usageRepository.findOne({ where: { subject, day } });
    return row?.count ?? 0;
  }

  /** Quota snapshot for the given subject against `limit` (no side effects). */
  async getStatus(subject: string, limit: number): Promise<QuotaStatus> {
    const used = await this.count(subject, this.today());
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetsAt: this.nextReset(),
    };
  }

  /** True when the subject still has free messages left today under `limit`. */
  async hasRemaining(subject: string, limit: number): Promise<boolean> {
    return (await this.count(subject, this.today())) < limit;
  }

  /**
   * Record one spent free message. A single SQLite upsert bumps the (subject, day)
   * counter atomically (`count = count + 1` on conflict), so concurrent requests
   * can't clobber each other's increments.
   */
  async increment(subject: string): Promise<void> {
    const day = this.today();
    await this.usageRepository.query(
      `INSERT INTO usage_daily ("subject", "day", "count", "updatedAt")
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT("subject", "day")
       DO UPDATE SET "count" = "count" + 1, "updatedAt" = CURRENT_TIMESTAMP`,
      [subject, day],
    );
  }
}
