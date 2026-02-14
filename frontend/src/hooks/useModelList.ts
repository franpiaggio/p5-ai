import { useQuery } from '@tanstack/react-query';
import { fetchModels } from '../services/api';
import { queryKeys } from './queryClient';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';
import type { LLMConfig } from '../types';

/** Models rarely change, cache for 5 minutes */
const MODELS_STALE_TIME_MS = 5 * 60_000;

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
  const user = useAuthStore((s) => s.user);
  const storeApiKeys = useEditorStore((s) => s.storeApiKeys);
  const useServerKey = storeApiKeys && !!user && !apiKey;

  const enabled = provider === 'demo' || !!apiKey || useServerKey;

  const { data, isLoading } = useQuery({
    queryKey: useServerKey
      ? queryKeys.models(provider, '__stored__')
      : queryKeys.models(provider, apiKey),
    queryFn: () => fetchModels(provider, useServerKey ? undefined : apiKey),
    enabled,
    staleTime: MODELS_STALE_TIME_MS,
    placeholderData: FALLBACK_MODELS[provider] ?? [],
  });

  const models = data && data.length > 0 ? data : FALLBACK_MODELS[provider] ?? [];

  return { models, loadingModels: isLoading && enabled };
}
