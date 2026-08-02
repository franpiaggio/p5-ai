/* eslint-disable @typescript-eslint/no-require-imports -- AppModule must load after test env vars are set */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';

/**
 * API wiring smoke test: real HTTP through guards, validation and TypeORM
 * against an in-memory SQLite database. Covers what unit tests can't — that
 * the cookie auth, guards and controllers are actually wired together.
 */
describe('API (e2e)', () => {
  let app: INestApplication;
  let authCookie: string;
  let sketchId: string;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'e2e-jwt-secret';
    process.env.ADMIN_PASSWORD = 'e2e-admin-password';
    // Keep the suite hermetic: a real key (from the root .env) would make
    // demo-provider requests hit the actual Groq/Gemini API. Empty string (not
    // delete): dotenv won't override an existing env var, but '' is falsy
    // for the demo-key checks.
    process.env.GROQ_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    // Import after env is set so ConfigModule picks up the test values.
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror the middleware from main.ts that the routes depend on.
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 15_000);

  it('GET /api/health responds ok', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  describe('auth', () => {
    it('rejects a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);
    });

    it('logs in the seeded admin and sets an httpOnly token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'e2e-admin-password' })
        .expect(201);

      expect(res.body.user.name).toBe('Admin');
      const cookies = res.get('Set-Cookie')!;
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      expect(tokenCookie).toContain('HttpOnly');
      authCookie = tokenCookie!.split(';')[0];
    });
  });

  describe('chat origin guard', () => {
    it('rejects a chat request without an app Origin (curl/scripts)', async () => {
      await request(app.getHttpServer())
        .post('/api/chat/models')
        .send({ provider: 'openai', apiKey: 'sk-x' })
        .expect(403);
    });

    it('rejects a foreign Origin', async () => {
      await request(app.getHttpServer())
        .post('/api/chat/models')
        .set('Origin', 'https://evil.example')
        .send({ provider: 'openai', apiKey: 'sk-x' })
        .expect(403);
    });

    it('lets a request with the app Origin through to the controller', async () => {
      // Passing the guard is what matters here; the unconfigured demo provider
      // answers with its static fallback model list.
      const res = await request(app.getHttpServer())
        .post('/api/chat/models')
        .set('Origin', 'http://localhost:5173')
        .send({ provider: 'demo' })
        .expect(201);
      expect(res.body.models).toEqual([
        { id: 'llama-3.3-70b-versatile', vision: false },
      ]);
    });
  });

  describe('free-usage quota', () => {
    const APP_ORIGIN = 'http://localhost:5173';

    it('reports the anonymous per-IP allowance for logged-out callers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/chat/usage')
        .set('Origin', APP_ORIGIN)
        .expect(200);
      expect(res.body.anonymous).toBe(true);
      expect(res.body.used).toBe(0);
      expect(res.body.remaining).toBe(res.body.limit);
      expect(typeof res.body.limit).toBe('number');
    });

    it('reports the larger allowance for a logged-in user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/chat/usage')
        .set('Origin', APP_ORIGIN)
        .set('Cookie', authCookie)
        .expect(200);
      expect(res.body.anonymous).toBe(false);
      expect(res.body.used).toBe(0);
      expect(res.body.remaining).toBe(res.body.limit);
      expect(typeof res.body.resetsAt).toBe('string');
    });

    it('lets anonymous callers through the quota pre-flight (no 401)', async () => {
      // Demo isn't configured in this hermetic suite, so the request passes the
      // per-IP quota check and then surfaces the "not configured" error in-stream
      // — proving anonymous demo is allowed (not blocked with 401 as before).
      const res = await request(app.getHttpServer())
        .post('/api/chat')
        .set('Origin', APP_ORIGIN)
        .send({
          message: 'hi',
          code: '',
          history: [],
          config: { provider: 'demo', model: 'x' },
        })
        .expect(201); // NestJS default for POST; the SSE body carries the error
      expect(res.text).toContain('Demo mode is not configured');
    });
  });

  describe('OpenRouter connect', () => {
    it('requires auth to connect an OpenRouter account', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/openrouter/connect')
        .send({ code: 'abc', codeVerifier: 'a'.repeat(40) })
        .expect(401);
    });

    it('validates the connect payload', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/openrouter/connect')
        .set('Cookie', authCookie)
        .send({ code: 'abc' }) // missing codeVerifier
        .expect(400);
    });
  });

  describe('sketches', () => {
    it('requires auth to list sketches', async () => {
      await request(app.getHttpServer()).get('/api/sketches').expect(401);
    });

    it('requires auth to create a sketch', async () => {
      await request(app.getHttpServer())
        .post('/api/sketches')
        .send({ title: 'nope', code: 'x' })
        .expect(401);
    });

    it('creates a sketch with the auth cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sketches')
        .set('Cookie', authCookie)
        .send({ title: 'E2E sketch', code: 'function setup() {}' })
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.title).toBe('E2E sketch');
      sketchId = res.body.id;
    });

    it('rejects unknown fields via the validation whitelist', async () => {
      await request(app.getHttpServer())
        .post('/api/sketches')
        .set('Cookie', authCookie)
        .send({ title: 'x', code: 'y', hacker: true })
        .expect(400);
    });

    it('lists the created sketch without the code payload', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sketches')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('E2E sketch');
      expect(res.body[0].code).toBeUndefined();
    });

    it('fetches the full sketch by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.code).toBe('function setup() {}');
    });

    it('serves the public endpoint without auth (public by default) and without owner info or history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sketches/public/${sketchId}`)
        .expect(200);

      expect(res.body.code).toBe('function setup() {}');
      expect(res.body.userId).toBeUndefined();
      expect(res.body.codeHistory).toBeUndefined();
    });

    it('404s the public endpoint once the owner marks the sketch private', async () => {
      await request(app.getHttpServer())
        .put(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .send({ isPublic: false })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/sketches/public/${sketchId}`)
        .expect(404);

      // Owner can still open it through the authed route.
      await request(app.getHttpServer())
        .get(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .expect(200);

      // Restore public so later assertions are unaffected.
      await request(app.getHttpServer())
        .put(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .send({ isPublic: true })
        .expect(200);
    });

    it('updates and deletes the sketch', async () => {
      await request(app.getHttpServer())
        .put(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .send({ title: 'Renamed' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/sketches/${sketchId}`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });
});
