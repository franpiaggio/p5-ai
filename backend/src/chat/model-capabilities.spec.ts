import {
  supportsVisionByName,
  providerForwardsImages,
  canAcceptImages,
} from './model-capabilities';

describe('supportsVisionByName', () => {
  it('flags modern OpenAI multimodal families as vision', () => {
    for (const id of [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4.1-nano',
      'gpt-4-turbo',
      'chatgpt-4o-latest',
      'o4-mini',
    ]) {
      expect(supportsVisionByName('openai', id)).toBe(true);
    }
  });

  it('rejects OpenAI text-only / non-chat and vision-less minis', () => {
    for (const id of [
      'gpt-3.5-turbo',
      'text-embedding-3-large',
      'whisper-1',
      'tts-1',
      'dall-e-3',
      'o3-mini',
      'o1-mini',
    ]) {
      expect(supportsVisionByName('openai', id)).toBe(false);
    }
  });

  it('flags Claude 3/4 as vision but not 3.5 Haiku', () => {
    expect(supportsVisionByName('anthropic', 'claude-3-haiku-20240307')).toBe(
      true,
    );
    expect(supportsVisionByName('anthropic', 'claude-sonnet-4-20250514')).toBe(
      true,
    );
    expect(
      supportsVisionByName('anthropic', 'claude-3-5-sonnet-20241022'),
    ).toBe(true);
    expect(supportsVisionByName('anthropic', 'claude-3-5-haiku-20241022')).toBe(
      false,
    );
  });

  it('treats DeepSeek / demo / opencode models as text-only', () => {
    expect(supportsVisionByName('deepseek', 'deepseek-chat')).toBe(false);
    expect(supportsVisionByName('demo', 'llama-3.3-70b-versatile')).toBe(false);
    expect(supportsVisionByName('opencode', 'anthropic/claude-opus-4')).toBe(
      false,
    );
  });

  it('uses a name heuristic for OpenRouter (fallback)', () => {
    expect(supportsVisionByName('openrouter', 'openai/gpt-4o-mini')).toBe(true);
    expect(supportsVisionByName('openrouter', 'mistralai/pixtral-12b')).toBe(
      true,
    );
    expect(
      supportsVisionByName('openrouter', 'google/gemini-2.0-flash-exp'),
    ).toBe(true);
    expect(
      supportsVisionByName('openrouter', 'meta-llama/llama-3.3-70b-instruct'),
    ).toBe(false);
  });
});

describe('providerForwardsImages', () => {
  it('is true only for providers whose stream() forwards image content', () => {
    expect(providerForwardsImages('openai')).toBe(true);
    expect(providerForwardsImages('anthropic')).toBe(true);
    expect(providerForwardsImages('openrouter')).toBe(true);
    for (const p of ['deepseek', 'demo', 'groq', 'gemini', 'opencode']) {
      expect(providerForwardsImages(p)).toBe(false);
    }
  });
});

describe('canAcceptImages', () => {
  it('allows vision models on forwarding providers', () => {
    expect(canAcceptImages('openai', 'gpt-4o')).toBe(true);
    expect(canAcceptImages('anthropic', 'claude-sonnet-4-20250514')).toBe(true);
  });

  it('blocks non-vision models even on forwarding providers', () => {
    expect(canAcceptImages('openai', 'gpt-3.5-turbo')).toBe(false);
    expect(canAcceptImages('anthropic', 'claude-3-5-haiku-20241022')).toBe(
      false,
    );
  });

  it('trusts OpenRouter for any model (it validates per-model itself)', () => {
    expect(canAcceptImages('openrouter', 'anything/whatever')).toBe(true);
  });

  it('blocks providers that never forward images', () => {
    expect(canAcceptImages('deepseek', 'deepseek-chat')).toBe(false);
    expect(canAcceptImages('demo', 'llama-3.3-70b-versatile')).toBe(false);
    expect(canAcceptImages('opencode', 'anthropic/claude-opus-4')).toBe(false);
  });
});
