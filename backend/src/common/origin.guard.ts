import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/** The app origins allowed to call browser-only endpoints (same list CORS uses). */
export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Requires the request to come from the app itself: its Origin (or Referer)
 * must match a configured app origin. CORS alone only restrains browsers —
 * this also rejects curl/scripts hitting the endpoint directly, which matters
 * for routes that can spend the server-side demo API key. A determined client
 * can still forge the header; combined with throttling it stops drive-by abuse.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const allowed = allowedOrigins();

    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) return true;

    // Browsers occasionally omit Origin but send Referer for same-origin requests.
    const referer = req.headers.referer;
    if (
      referer &&
      allowed.some((o) => referer === o || referer.startsWith(`${o}/`))
    ) {
      return true;
    }

    throw new ForbiddenException('This endpoint can only be used from the app');
  }
}
