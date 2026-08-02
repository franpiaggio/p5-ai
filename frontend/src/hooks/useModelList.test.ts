import { describe, it, expect } from 'vitest';
import { modelSupportsVision, MODELS } from './useModelList';
import type { ModelInfo } from '../types';

describe('modelSupportsVision', () => {
  const models: ModelInfo[] = [
    { id: 'gpt-4o', vision: true },
    { id: 'gpt-3.5-turbo', vision: false },
  ];

  it('returns the flag for a listed model', () => {
    expect(modelSupportsVision(models, 'gpt-4o')).toBe(true);
    expect(modelSupportsVision(models, 'gpt-3.5-turbo')).toBe(false);
  });

  it('defaults to false for a model not in the list', () => {
    expect(modelSupportsVision(models, 'unknown-model')).toBe(false);
    expect(modelSupportsVision([], 'gpt-4o')).toBe(false);
  });

  it('curated fallback lists carry vision flags for gating pre-fetch', () => {
    // OpenAI shortlist is all multimodal; DeepSeek is text-only.
    expect(MODELS.openai.every((m) => m.vision)).toBe(true);
    expect(MODELS.deepseek.every((m) => !m.vision)).toBe(true);
    // OpenRouter shortlist mixes both.
    expect(modelSupportsVision(MODELS.openrouter, 'openai/gpt-4o-mini')).toBe(true);
    expect(
      modelSupportsVision(MODELS.openrouter, 'meta-llama/llama-3.3-70b-instruct:free'),
    ).toBe(false);
  });
});
