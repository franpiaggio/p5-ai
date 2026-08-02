import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { OriginGuard, allowedOrigins } from './origin.guard';

function contextWithHeaders(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('allowedOrigins', () => {
  const original = process.env.CORS_ORIGIN;
  afterEach(() => {
    if (original === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = original;
  });

  it('defaults to the local dev origin', () => {
    delete process.env.CORS_ORIGIN;
    expect(allowedOrigins()).toEqual(['http://localhost:5173']);
  });

  it('splits and trims a comma-separated list', () => {
    process.env.CORS_ORIGIN = 'https://app.example.com, http://localhost:5173';
    expect(allowedOrigins()).toEqual([
      'https://app.example.com',
      'http://localhost:5173',
    ]);
  });
});

describe('OriginGuard', () => {
  const guard = new OriginGuard();
  const original = process.env.CORS_ORIGIN;

  beforeEach(() => {
    process.env.CORS_ORIGIN = 'https://app.example.com';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = original;
  });

  it('allows a request with a matching Origin', () => {
    expect(
      guard.canActivate(
        contextWithHeaders({ origin: 'https://app.example.com' }),
      ),
    ).toBe(true);
  });

  it('allows a request with a matching Referer when Origin is absent', () => {
    expect(
      guard.canActivate(
        contextWithHeaders({ referer: 'https://app.example.com/some/page' }),
      ),
    ).toBe(true);
  });

  it('rejects a request without Origin or Referer (curl/scripts)', () => {
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a foreign Origin', () => {
    expect(() =>
      guard.canActivate(contextWithHeaders({ origin: 'https://evil.example' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a Referer that only shares a prefix with the allowed origin', () => {
    expect(() =>
      guard.canActivate(
        contextWithHeaders({ referer: 'https://app.example.com.evil.io/x' }),
      ),
    ).toThrow(ForbiddenException);
  });
});
