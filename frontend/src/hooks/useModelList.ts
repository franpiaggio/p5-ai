import { useEffect, useState } from 'react';
import { fetchModels } from '../services/api';

export const MODELS: Record<string, string[]> = {
  demo: ['llama-3.3-70b-versatile'],
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'],
  anthropic: [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  // Populated live from the local `opencode serve` catalog — see useModelList below.
  opencode: [],
};

export const PROVIDER_LABELS: Record<string, string> = {
  demo: 'Demo (free)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  opencode: 'opencode (local)',
};

/** Providers that don't need an API key from the user (server resolves them itself). */
const KEYLESS_PROVIDERS = new Set(['demo', 'opencode']);

export function providerNeedsApiKey(provider: string): boolean {
  return !KEYLESS_PROVIDERS.has(provider);
}

export function useModelList(provider: string) {
  const [opencodeModels, setOpencodeModels] = useState<string[]>([]);
  // Tracks which fetch this model list reflects, so "loading" can be derived
  // instead of set synchronously at the top of the effect below.
  const [opencodeLoadedFor, setOpencodeLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (provider !== 'opencode') return;
    let cancelled = false;
    fetchModels('opencode').then((models) => {
      if (cancelled) return;
      setOpencodeModels(models);
      setOpencodeLoadedFor('opencode');
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  if (provider === 'opencode') {
    return { models: opencodeModels, loadingModels: opencodeLoadedFor !== 'opencode' };
  }
  return { models: MODELS[provider] ?? [], loadingModels: false };
}
