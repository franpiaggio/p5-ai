import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamChat, type ChatRequest } from './api';
import type { Message } from '../types';

function sseResponse(chunks: string[], init: ResponseInit = { status: 200 }): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, init);
}

const fetchMock = vi.fn();

function request(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    message: 'hi',
    code: 'function setup() {}',
    history: [],
    config: { provider: 'demo', model: 'llama' },
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('streamChat SSE parsing', () => {
  it('yields content events until [DONE]', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"content":"Hel"}\n\n',
        'data: {"content":"lo"}\n\n',
        'data: [DONE]\n\n',
        'data: {"content":"after done, ignored"}\n\n',
      ]),
    );

    await expect(collect(streamChat(request()))).resolves.toEqual(['Hel', 'lo']);
  });

  it('reassembles SSE events split across network chunks', async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"cont', 'ent":"Hi"}\n\ndata: {"content":" there"}\n', '\ndata: [DONE]\n\n']),
    );

    await expect(collect(streamChat(request()))).resolves.toEqual(['Hi', ' there']);
  });

  it('skips malformed JSON lines and keeps streaming', async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {broken json\n\n', 'data: {"content":"ok"}\n\n', 'data: [DONE]\n\n']),
    );

    await expect(collect(streamChat(request()))).resolves.toEqual(['ok']);
  });

  it('throws when the stream carries an error event', async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"content":"partial"}\n\n', 'data: {"error":"Provider exploded"}\n\n']),
    );

    const gen = streamChat(request());
    const received: string[] = [];
    await expect(async () => {
      for await (const chunk of gen) received.push(chunk);
    }).rejects.toThrow('Provider exploded');
    expect(received).toEqual(['partial']);
  });

  it('throws the response body text on a non-ok response', async () => {
    fetchMock.mockResolvedValue(new Response('Rate limit exceeded', { status: 429 }));
    await expect(collect(streamChat(request()))).rejects.toThrow('Rate limit exceeded');
  });

  it('reports a friendly error when the backend is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(collect(streamChat(request()))).rejects.toThrow('Cannot connect to backend');
  });

  it('ends silently when the request is aborted', async () => {
    fetchMock.mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'));
    await expect(collect(streamChat(request()))).resolves.toEqual([]);
  });
});

describe('streamChat request shaping', () => {
  it('caps the history sent to the backend at the last 10 messages', async () => {
    fetchMock.mockResolvedValue(sseResponse(['data: [DONE]\n\n']));
    const history = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i}`,
      role: 'user' as const,
      content: `msg-${i}`,
      timestamp: i,
    })) as Message[];

    await collect(streamChat(request({ history })));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.history).toHaveLength(10);
    expect(body.history[0].content).toBe('msg-5');
    expect(body.history[9].content).toBe('msg-14');
  });
});
