import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { allowedOrigins } from './common/origin.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Behind nginx (prod) the client IP arrives in X-Forwarded-For. Trusting the
  // first hop makes req.ip the real client — used for anonymous free-usage quota
  // and throttling. Harmless in dev (localhost).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const baseJsonLimit = process.env.JSON_LIMIT ?? '256kb';
  const chatJsonLimit = process.env.CHAT_JSON_LIMIT ?? '12mb';

  app.use(helmet());
  app.use(
    compression({
      filter: (req, res) => {
        const ct = res.getHeader('Content-Type');
        if (typeof ct === 'string' && ct.includes('text/event-stream'))
          return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api/chat') ||
      req.path.startsWith('/api/sketches')
    )
      return next();
    return json({ limit: baseJsonLimit })(req, res, next);
  });
  app.use('/api/sketches', json({ limit: '2mb' }));
  app.use('/api/chat', json({ limit: chatJsonLimit }));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: allowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
