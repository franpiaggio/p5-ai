import { BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, MessageDto, ImageAttachmentDto } from './dto/chat.dto';
import type { LLMMessage } from './providers/llm.interface';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function imageOf(
  magic: number[],
  totalBytes: number,
  mimeType: 'image/png' | 'image/jpeg',
): ImageAttachmentDto {
  const buf = Buffer.alloc(totalBytes);
  magic.forEach((b, i) => (buf[i] = b));
  return { base64: buf.toString('base64'), mimeType };
}

const png = (bytes = 64) => imageOf(PNG_MAGIC, bytes, 'image/png');
const jpeg = (bytes = 64) => imageOf(JPEG_MAGIC, bytes, 'image/jpeg');

function message(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'm1',
    role: 'user',
    content: 'hello',
    timestamp: 1,
    ...overrides,
  };
}

function request(overrides: Partial<ChatRequestDto> = {}): ChatRequestDto {
  return {
    message: 'change the background color',
    code: 'function setup() {}',
    language: 'javascript',
    history: [],
    config: { provider: 'openai', model: 'gpt-4o', apiKey: 'sk-test' },
    ...overrides,
  };
}

async function consume(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

describe('ChatService', () => {
  let openai: { stream: jest.Mock; listModels: jest.Mock };
  let anthropic: { stream: jest.Mock; listModels: jest.Mock };
  let groq: { stream: jest.Mock; listModels: jest.Mock };
  let gemini: { stream: jest.Mock; listModels: jest.Mock };
  let deepseek: { stream: jest.Mock; listModels: jest.Mock };
  let opencode: { stream: jest.Mock; listModels: jest.Mock };
  let openrouter: { stream: jest.Mock; listModels: jest.Mock };
  let usersService: { getProviderKey: jest.Mock };
  let service: ChatService;

  const mockProvider = () => ({
    // eslint-disable-next-line @typescript-eslint/require-await
    stream: jest.fn(async function* (): AsyncGenerator<string> {
      yield 'chunk';
    }),
    listModels: jest.fn(),
  });

  beforeEach(() => {
    openai = mockProvider();
    anthropic = mockProvider();
    groq = mockProvider();
    gemini = mockProvider();
    deepseek = mockProvider();
    opencode = mockProvider();
    openrouter = mockProvider();
    usersService = { getProviderKey: jest.fn().mockResolvedValue(null) };
    service = new ChatService(
      openai as never,
      anthropic as never,
      groq as never,
      gemini as never,
      deepseek as never,
      opencode as never,
      openrouter as never,
      usersService as never,
    );
  });

  /** Messages the (mocked) provider actually received. */
  const sentMessages = (provider = openai): LLMMessage[] =>
    provider.stream.mock.calls[0][0] as LLMMessage[];

  describe('resolveApiKey', () => {
    it('returns empty string for demo provider without touching the DB', async () => {
      await expect(
        service.resolveApiKey('demo', 'ignored', 'user-1'),
      ).resolves.toBe('');
      expect(usersService.getProviderKey).not.toHaveBeenCalled();
    });

    it('returns empty string for opencode provider without touching the DB', async () => {
      await expect(
        service.resolveApiKey('opencode', 'ignored', 'user-1'),
      ).resolves.toBe('');
      expect(usersService.getProviderKey).not.toHaveBeenCalled();
    });

    it('prefers the key from the request body over the stored key', async () => {
      usersService.getProviderKey.mockResolvedValue('sk-stored');
      await expect(
        service.resolveApiKey('openai', 'sk-body', 'user-1'),
      ).resolves.toBe('sk-body');
    });

    it('falls back to the stored key for the logged-in user', async () => {
      usersService.getProviderKey.mockResolvedValue('sk-stored');
      await expect(
        service.resolveApiKey('openai', undefined, 'user-1'),
      ).resolves.toBe('sk-stored');
      expect(usersService.getProviderKey).toHaveBeenCalledWith(
        'user-1',
        'openai',
      );
    });

    it('throws when there is no key anywhere', async () => {
      await expect(
        service.resolveApiKey('openai', undefined, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(service.resolveApiKey('openai')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('streamChat message assembly', () => {
    it('sends system prompt, current code, history, then the new message', async () => {
      const req = request({
        history: [
          message({ id: 'a', role: 'user', content: 'make it blue' }),
          message({ id: 'b', role: 'assistant', content: 'done, it is blue' }),
        ],
      });

      await consume(service.streamChat(req));

      const msgs = sentMessages();
      expect(msgs.map((m) => m.role)).toEqual([
        'system',
        'user',
        'user',
        'assistant',
        'user',
      ]);
      expect(msgs[1].content).toContain(
        '```javascript\nfunction setup() {}\n```',
      );
      expect(msgs[2].content).toBe('make it blue');
      expect(msgs[3].content).toBe('done, it is blue');
      expect(msgs[4].content).toBe('change the background color');
      expect(openai.stream).toHaveBeenCalledWith(
        expect.anything(),
        'gpt-4o',
        'sk-test',
        expect.anything(),
      );
    });

    it('passes the current code as a prediction for speculative decoding', async () => {
      await consume(service.streamChat(request()));
      const opts = openai.stream.mock.calls[0][3] as { prediction?: string };
      expect(opts.prediction).toBe('```javascript\nfunction setup() {}\n```');
    });

    it('builds the prediction from all files in a multi-file sketch', async () => {
      const req = request({
        files: [
          { name: 'sketch.js', content: 'function setup() {}' },
          { name: 'particle.js', content: 'class P {}' },
        ],
      });
      await consume(service.streamChat(req));
      const opts = openai.stream.mock.calls[0][3] as { prediction?: string };
      expect(opts.prediction).toContain('// filename: particle.js\nclass P {}');
    });

    it('shows a one-file sketch as plain code, without multi-file headers', async () => {
      const req = request({
        files: [{ name: 'sketch.js', content: 'function setup() {}' }],
      });
      await consume(service.streamChat(req));

      const codeContext = sentMessages()[1].content;
      expect(codeContext).toContain('single file — sketch.js');
      expect(codeContext).not.toContain('// filename:');
    });

    it('attaches images to the current message and history messages', async () => {
      const historyImage = png();
      const currentImage = jpeg();
      const req = request({
        history: [message({ content: 'look at this', images: [historyImage] })],
        images: [currentImage],
      });

      await consume(service.streamChat(req));

      const msgs = sentMessages();
      expect(msgs[2].images).toEqual([historyImage]);
      expect(msgs[msgs.length - 1].images).toEqual([currentImage]);
    });

    it('sends the single-file layout rules by default', async () => {
      await consume(service.streamChat(request()));

      const systemPrompt = sentMessages()[0].content;
      expect(systemPrompt).toContain('FILE LAYOUT — SINGLE FILE');
      expect(systemPrompt).not.toContain('FILE LAYOUT — MULTI-FILE');
      expect(systemPrompt).toContain('NEVER use `[NEW FILE]`');
    });

    it('sends the multi-file layout rules once the client opts in', async () => {
      await consume(service.streamChat(request({ allowMultiFile: true })));

      const systemPrompt = sentMessages()[0].content;
      expect(systemPrompt).toContain('FILE LAYOUT — MULTI-FILE');
      expect(systemPrompt).not.toContain('FILE LAYOUT — SINGLE FILE');
      expect(systemPrompt).toContain('[NEW FILE]');
    });

    it('rejects unknown providers', async () => {
      const req = request({
        config: { provider: 'weird' as never, model: 'x', apiKey: 'k' },
      });
      await expect(consume(service.streamChat(req))).rejects.toThrow(
        'Unknown provider: weird',
      );
    });
  });

  describe('streamChat history clamping', () => {
    it('keeps only the last 20 history messages', async () => {
      const history = Array.from({ length: 25 }, (_, i) =>
        message({ id: `m${i}`, content: `msg-${i}` }),
      );

      await consume(service.streamChat(request({ history })));

      const msgs = sentMessages();
      // system + code + 20 history + current message
      expect(msgs).toHaveLength(23);
      expect(msgs[2].content).toBe('msg-5');
      expect(msgs[21].content).toBe('msg-24');
    });

    it('drops older messages once the 250KB history budget is exceeded, keeping newest first', async () => {
      const big = 'a'.repeat(100_000);
      const history = [
        message({ id: 'old-small', content: 'old small message' }),
        message({ id: 'big-1', content: big }),
        message({ id: 'big-2', content: big }),
        message({ id: 'big-3', content: big }),
      ];

      await consume(service.streamChat(request({ history })));

      const msgs = sentMessages();
      const historyContents = msgs.slice(2, -1).map((m) => m.content);
      // Walking newest-first: big-3 (100k) + big-2 (200k) fit, big-1 would hit 300k > 250k
      // and is skipped, then old-small still fits — leaving a gap in the middle.
      expect(historyContents).toEqual(['old small message', big, big]);
    });
  });

  describe('streamChat history code stripping', () => {
    const fenced = '```javascript\nfunction draw() { background(0); }\n```';

    it('replaces code in older assistant messages, keeps the newest one and user messages intact', async () => {
      const history = [
        message({
          id: 'u1',
          role: 'user',
          content: `mine does this:\n${fenced}`,
        }),
        message({
          id: 'a1',
          role: 'assistant',
          content: `Here you go:\n${fenced}`,
        }),
        message({ id: 'u2', role: 'user', content: 'now make it red' }),
        message({ id: 'a2', role: 'assistant', content: `Sure:\n${fenced}` }),
      ];

      await consume(service.streamChat(request({ history })));

      const hist = sentMessages().slice(2, -1);
      expect(hist[0].content).toContain('function draw'); // user message untouched
      expect(hist[1].content).not.toContain('function draw');
      expect(hist[1].content).toContain('[previous code omitted');
      expect(hist[3].content).toContain('function draw'); // newest assistant intact
    });

    it('replaces search/replace blocks and their filename prefix in older assistant messages', async () => {
      const sr =
        '// filename: particle.js\n<<<SEARCH\nlet r = 1;\n===\nlet r = 2;\n>>>REPLACE';
      const history = [
        message({ id: 'a1', role: 'assistant', content: `Patch:\n${sr}` }),
        message({ id: 'a2', role: 'assistant', content: 'anything else?' }),
      ];

      await consume(service.streamChat(request({ history })));

      const hist = sentMessages().slice(2, -1);
      expect(hist[0].content).not.toContain('<<<SEARCH');
      expect(hist[0].content).not.toContain('// filename:');
      expect(hist[0].content).toContain('[previous code omitted');
    });

    it('leaves code-free history untouched', async () => {
      const history = [
        message({
          id: 'a1',
          role: 'assistant',
          content: 'it uses perlin noise',
        }),
        message({ id: 'a2', role: 'assistant', content: 'yes' }),
      ];

      await consume(service.streamChat(request({ history })));

      const hist = sentMessages().slice(2, -1);
      expect(hist[0].content).toBe('it uses perlin noise');
      expect(hist[1].content).toBe('yes');
    });
  });

  describe('streamChat image validation', () => {
    it('accepts valid PNG and JPEG attachments', async () => {
      const req = request({ images: [png(), jpeg()] });
      await expect(consume(service.streamChat(req))).resolves.toEqual([
        'chunk',
      ]);
    });

    it('rejects an image whose bytes do not match its declared PNG type', async () => {
      const fake = { ...jpeg(), mimeType: 'image/png' as const };
      await expect(
        consume(service.streamChat(request({ images: [fake] }))),
      ).rejects.toThrow('does not match declared PNG');
    });

    it('rejects an image whose bytes do not match its declared JPEG type', async () => {
      const fake = { ...png(), mimeType: 'image/jpeg' as const };
      await expect(
        consume(service.streamChat(request({ images: [fake] }))),
      ).rejects.toThrow('does not match declared JPEG');
    });

    it('rejects a single image above the per-image size limit', async () => {
      const huge = png(10 * 1024 * 1024 + 64);
      await expect(
        consume(service.streamChat(request({ images: [huge] }))),
      ).rejects.toThrow('exceeds maximum size');
    });

    it('rejects more than 12 images across message + history', async () => {
      const history = Array.from({ length: 5 }, (_, i) =>
        message({ id: `h${i}`, images: [png(), png(), png()] }),
      ); // 15 images
      await expect(
        consume(service.streamChat(request({ history }))),
      ).rejects.toThrow('Too many images');
    });

    it('rejects when combined image size exceeds the 20MB budget', async () => {
      const sevenMb = 7 * 1024 * 1024;
      const history = [
        message({ id: 'h1', images: [png(sevenMb)] }),
        message({ id: 'h2', images: [png(sevenMb)] }),
      ];
      const req = request({ history, images: [png(sevenMb)] }); // 21MB total, each under 10MB
      await expect(consume(service.streamChat(req))).rejects.toThrow(
        'exceed maximum combined size',
      );
    });
  });

  describe('demo mode', () => {
    const originalGroqKey = process.env.GROQ_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
      // Deterministic regardless of the developer's local env.
      delete process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = originalGroqKey;
      if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGeminiKey;
    });

    it('routes demo requests to Groq with the server-side key and fixed model', async () => {
      process.env.GROQ_API_KEY = 'gsk-server';
      const req = request({ config: { provider: 'demo', model: 'ignored' } });

      await consume(service.streamChat(req));

      expect(groq.stream).toHaveBeenCalledWith(
        expect.anything(),
        'llama-3.3-70b-versatile',
        'gsk-server',
      );
      expect(openai.stream).not.toHaveBeenCalled();
    });

    it('falls back to Gemini when Groq fails before streaming any output', async () => {
      process.env.GROQ_API_KEY = 'gsk-server';
      process.env.GEMINI_API_KEY = 'gem-server';
      groq.stream.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await, require-yield
        async function* (): AsyncGenerator<string> {
          throw new Error('rate limit reached');
        },
      );
      const req = request({ config: { provider: 'demo', model: 'ignored' } });

      const out = await consume(service.streamChat(req));

      expect(groq.stream).toHaveBeenCalled();
      expect(gemini.stream).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        'gem-server',
      );
      expect(out).toContain('chunk');
    });

    it('does not fall back once Groq has started streaming', async () => {
      process.env.GROQ_API_KEY = 'gsk-server';
      process.env.GEMINI_API_KEY = 'gem-server';
      groq.stream.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* (): AsyncGenerator<string> {
          yield 'partial';
          throw new Error('mid-stream failure');
        },
      );
      const req = request({ config: { provider: 'demo', model: 'ignored' } });

      await expect(consume(service.streamChat(req))).rejects.toThrow(
        'mid-stream failure',
      );
      expect(gemini.stream).not.toHaveBeenCalled();
    });

    it('fails clearly when demo mode is not configured', async () => {
      const req = request({ config: { provider: 'demo', model: 'x' } });
      await expect(consume(service.streamChat(req))).rejects.toThrow(
        'Demo mode is not configured',
      );
    });
  });

  describe('openrouter mode', () => {
    it('routes to the OpenRouter provider with the resolved key and model', async () => {
      const req = request({
        config: {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'sk-or-user',
        },
      });

      await consume(service.streamChat(req));

      expect(openrouter.stream).toHaveBeenCalledWith(
        expect.anything(),
        'anthropic/claude-3.5-sonnet',
        'sk-or-user',
        expect.anything(),
      );
      expect(groq.stream).not.toHaveBeenCalled();
      expect(openai.stream).not.toHaveBeenCalled();
    });
  });
});
