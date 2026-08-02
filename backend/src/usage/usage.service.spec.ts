import { UsageService } from './usage.service';

/**
 * Exercises the quota math against an in-memory fake repository. `increment`
 * itself is a raw SQLite upsert (covered by the API/e2e layer with a real DB);
 * here we verify limit resolution, subjects, and the status snapshot.
 */
describe('UsageService', () => {
  let counts: Map<string, number>;
  let repo: { findOne: jest.Mock; query: jest.Mock };
  let config: Record<string, string | undefined>;
  let service: UsageService;

  const today = () => new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    counts = new Map();
    config = {};
    repo = {
      findOne: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          counts.has(where.subject)
            ? { subject: where.subject, day: where.day, count: counts.get(where.subject) }
            : null,
        ),
      ),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      get: jest.fn().mockImplementation((k: string) => config[k]),
    };
    service = new UsageService(repo as never, configService as never);
  });

  it('defaults the user limit to 25 and the anon limit to 3', () => {
    expect(service.dailyLimit).toBe(25);
    expect(service.anonDailyLimit).toBe(3);
  });

  it('honors valid env overrides for both limits', () => {
    config.FREE_MESSAGES_PER_DAY = '50';
    config.ANON_FREE_MESSAGES_PER_DAY = '1';
    expect(service.dailyLimit).toBe(50);
    expect(service.anonDailyLimit).toBe(1);
  });

  it('ignores a non-numeric override', () => {
    config.FREE_MESSAGES_PER_DAY = 'nonsense';
    expect(service.dailyLimit).toBe(25);
  });

  it('builds subjects from user id or IP', () => {
    expect(service.subjectFor('user-1', '1.2.3.4')).toBe('u:user-1');
    expect(service.subjectFor(undefined, '1.2.3.4')).toBe('ip:1.2.3.4');
    expect(service.subjectFor(undefined, undefined)).toBe('ip:unknown');
  });

  it('reports remaining as limit minus used, floored at zero', async () => {
    counts.set('u:user-1', 3);
    const status = await service.getStatus('u:user-1', 10);
    expect(status).toMatchObject({ used: 3, limit: 10, remaining: 7 });
    expect(status.resetsAt.endsWith('Z')).toBe(true);

    counts.set('u:user-1', 12); // over the limit
    const over = await service.getStatus('u:user-1', 10);
    expect(over.remaining).toBe(0);
  });

  it('treats an unseen subject as zero used', async () => {
    const status = await service.getStatus('ip:9.9.9.9', 3);
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(3);
  });

  it('hasRemaining is false exactly at the limit', async () => {
    counts.set('ip:1.1.1.1', 1);
    expect(await service.hasRemaining('ip:1.1.1.1', 2)).toBe(true);
    counts.set('ip:1.1.1.1', 2);
    expect(await service.hasRemaining('ip:1.1.1.1', 2)).toBe(false);
  });

  it('increment runs a single upsert for today', async () => {
    await service.increment('u:user-1');
    expect(repo.query).toHaveBeenCalledTimes(1);
    const [, params] = repo.query.mock.calls[0];
    expect(params).toEqual(['u:user-1', today()]);
  });
});
