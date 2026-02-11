import { useEffect, useState } from 'react';
import { fetchModels } from '../services/api';
import type { LLMConfig } from '../types';

export const FALLBACK_MODELS: Record<string, string[]> = {
  demo: ['llama-3.3-70b-versatile'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

export const PROVIDER_LABELS: Record<string, string> = {
  demo: 'Demo (free)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
};

export function useModelList(provider: LLMConfig['provider'], apiKey: string) {
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS[provider] ?? []);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (provider !== 'demo' && !apiKey) {
      setModels(FALLBACK_MODELS[provider] ?? []);
      return;
    }

    let cancelled = false;
    setLoadingModels(true);

    fetchModels(provider, apiKey).then((fetched) => {
      if (cancelled) return;
      setModels(fetched.length > 0 ? fetched : FALLBACK_MODELS[provider] ?? []);
      setLoadingModels(false);
    }).catch(() => {
      if (cancelled) return;
      setModels(FALLBACK_MODELS[provider] ?? []);
      setLoadingModels(false);
    });

    return () => { cancelled = true; };
  }, [provider, apiKey]);

  return { models, loadingModels };
}
