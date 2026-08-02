import { useEffect, useState } from 'react';
import { fetchModels } from '../services/api';

// Curated fallback shortlists — shown only until the live catalog loads (and for
// key-based providers, only before a key is available). The live list from the
// provider's own `/models` endpoint always overrides these, so they never go
// stale in practice; they just give the picker something sensible pre-key.
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
  // Populated live from the local `opencode serve` catalog.
  opencode: [],
  // Free tiers first. The live catalog (300+ models) overrides this once the
  // account is connected.
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemini-2.0-flash-exp:free',
    'openai/gpt-4o-mini',
    'anthropic/claude-sonnet-4',
  ],
};

export const PROVIDER_LABELS: Record<string, string> = {
  demo: 'Demo (free)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter (connect account)',
  opencode: 'opencode (local)',
};

/** Providers that don't need an API key from the user (server resolves them itself). */
const KEYLESS_PROVIDERS = new Set(['demo', 'opencode']);

export function providerNeedsApiKey(provider: string): boolean {
  return !KEYLESS_PROVIDERS.has(provider);
}

/**
 * Live model list for a provider. Every provider is fetched dynamically from its
 * own catalog (`POST /api/chat/models`) so the picker never shows stale hardcoded
 * IDs. For key-based providers the session `apiKey` is forwarded when present; if
 * it's absent the server falls back to the user's stored key, and if there's no
 * key at all the request just returns nothing and we show the curated fallback.
 *
 * Typing an API key char-by-char is debounced so we don't hammer the endpoint.
 */
export function useModelList(provider: string, apiKey?: string) {
  const [liveModels, setLiveModels] = useState<string[]>([]);
  // Which (provider, hasKey) combination the current `liveModels` reflect, so
  // "loading" and "ready" can be derived instead of set synchronously.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = apiKey?.trim() ?? '';
  const target = `${provider}::${key ? 'k' : ''}`;

  useEffect(() => {
    let cancelled = false;
    // Debounce so each keystroke while typing a key doesn't fire a request;
    // provider switches (no key yet) resolve immediately.
    const delay = key ? 400 : 0;
    const handle = setTimeout(() => {
      fetchModels(provider, key || undefined).then((models) => {
        if (cancelled) return;
        setLiveModels(models);
        setLoadedFor(target);
      });
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [provider, key, target]);

  // Trust the live list only once it matches the current (provider, hasKey);
  // otherwise show the curated fallback (avoids flashing another provider's
  // catalog while switching, or an empty list before a key is entered).
  const ready = loadedFor === target;
  const models =
    ready && liveModels.length > 0 ? sortFreeFirst(liveModels) : (MODELS[provider] ?? []);
  return { models, loadingModels: !ready };
}

/** Surface free (`:free`) models at the top — OpenRouter's catalog is 300+ entries
 * and the free tiers are what most people want to try first. */
function sortFreeFirst(models: string[]): string[] {
  const free = models.filter((m) => m.endsWith(':free'));
  const paid = models.filter((m) => !m.endsWith(':free'));
  return [...free, ...paid];
}
