import { useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useAuthStore } from '../../store/authStore';
import { fetchModels, getProviderKeys, saveProviderKey, clearProviderKey as clearProviderKeyApi } from '../../services/api';
import type { LLMConfig, ProviderKeys } from '../../types';

const FALLBACK_MODELS: Record<string, string[]> = {
  demo: ['llama-3.3-70b-versatile'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

const PROVIDER_LABELS: Record<string, string> = {
  demo: 'Demo (free)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
};

interface Draft {
  provider: LLMConfig['provider'];
  model: string;
  keys: ProviderKeys;
  storeApiKeys: boolean;
  autoApply: boolean;
}

export function SettingsModal() {
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const user = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize draft from store when modal opens
  useEffect(() => {
    if (!isSettingsOpen) {
      setDraft(null);
      return;
    }
    const s = useEditorStore.getState();
    setDraft({
      provider: s.llmConfig.provider,
      model: s.llmConfig.model,
      keys: { ...s.providerKeys },
      storeApiKeys: s.storeApiKeys,
      autoApply: s.autoApply,
    });
    setModels(FALLBACK_MODELS[s.llmConfig.provider] ?? []);
  }, [isSettingsOpen]);

  // Auto-fetch keys from backend on open
  useEffect(() => {
    if (!draft || !user || !draft.storeApiKeys) return;
    const hasAnyKey = Object.values(draft.keys).some(Boolean);
    if (hasAnyKey) return;
    getProviderKeys().then((keys) => {
      setDraft((prev) => prev ? { ...prev, keys: { ...prev.keys, ...keys } } : prev);
    });
  }, [draft?.storeApiKeys, user, isSettingsOpen]);

  // Fetch models when provider or key changes in draft
  useEffect(() => {
    if (!draft) return;

    const { provider } = draft;
    const apiKey = draft.keys[provider] ?? '';

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
  }, [draft?.provider, draft?.keys[draft?.provider ?? 'demo']]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const store = useEditorStore.getState();

      // Apply provider keys
      for (const [provider, key] of Object.entries(draft.keys)) {
        if (key) {
          store.setProviderKey(provider as LLMConfig['provider'], key);
        } else if (store.providerKeys[provider as LLMConfig['provider']]) {
          store.clearProviderKey(provider as LLMConfig['provider']);
        }
      }

      // Apply config
      store.setLLMConfig({ provider: draft.provider, model: draft.model });
      store.setStoreApiKeys(draft.storeApiKeys);
      store.setAutoApply(draft.autoApply);

      // Save to backend if enabled
      if (user && draft.storeApiKeys) {
        const key = draft.keys[draft.provider];
        if (key && draft.provider !== 'demo') {
          await saveProviderKey(draft.provider, key).catch(() => {});
        }
      }
    } finally {
      setSaving(false);
      setIsSettingsOpen(false);
    }
  }, [draft, user, setIsSettingsOpen]);

  const handleDiscard = useCallback(() => {
    setIsSettingsOpen(false);
  }, [setIsSettingsOpen]);

  useEscapeClose(isSettingsOpen, handleDiscard);

  if (!isSettingsOpen || !draft) return null;

  const isDemo = draft.provider === 'demo';
  const currentKey = draft.keys[draft.provider] ?? '';
  const disabled = saving || loadingModels;

  const updateDraft = (partial: Partial<Draft>) => setDraft((prev) => prev ? { ...prev, ...partial } : prev);

  const handleProviderChange = (provider: LLMConfig['provider']) => {
    updateDraft({
      provider,
      model: FALLBACK_MODELS[provider][0],
    });
  };

  const handleKeyChange = (value: string) => {
    setDraft((prev) => prev ? { ...prev, keys: { ...prev.keys, [prev.provider]: value } } : prev);
  };

  const handleClearKey = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const keys = { ...prev.keys };
      delete keys[prev.provider];
      return { ...prev, keys };
    });
    // Also clear from backend if stored
    if (user && draft.storeApiKeys) {
      clearProviderKeyApi(draft.provider).catch(() => {});
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) handleDiscard();
      }}
    >
      <div className="modal-panel max-w-md relative">
        {saving && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <span className="inline-block w-4 h-4 border-2 border-info/30 border-t-info rounded-full animate-spin" />
              Saving…
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-5">
          <h2 className="modal-title">Settings</h2>
          <button onClick={handleDiscard} className="modal-close" disabled={saving}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <fieldset disabled={disabled} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Provider
            </label>
            <select
              value={draft.provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMConfig['provider'])}
              className="input-field"
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {isDemo && (
            <p className="text-[10px] font-mono text-info/60 bg-info/5 border border-info/15 rounded-lg px-3 py-2">
              Free demo mode powered by Groq + Llama 3.3 70B. No API key needed.
            </p>
          )}

          {!isDemo && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={currentKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder={`Enter ${PROVIDER_LABELS[draft.provider]} key`}
                  className="input-field flex-1"
                />
                {currentKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="px-2.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                    title="Delete key"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              {user && draft.storeApiKeys ? (
                <p className="mt-1.5 text-[10px] font-mono text-text-muted/30">
                  Encrypted &amp; saved to your account.
                </p>
              ) : (
                <div className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-md bg-warning/10 border border-warning/25">
                  <svg className="w-3.5 h-3.5 text-warning shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.85A1 1 0 002.56 20h18.88a1 1 0 00.85-1.29L13.71 3.86a1 1 0 00-1.42 0z" />
                  </svg>
                  <span className="text-[10px] font-mono text-warning/80 leading-relaxed">
                    Session only — your key will be lost when you close this tab.
                    {user && ' Enable "Store my API keys" below to save it.'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isDemo && user && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.storeApiKeys}
                onChange={(e) => updateDraft({ storeApiKeys: e.target.checked })}
                className="rounded border-border/50 accent-accent"
              />
              <span className="text-[10px] font-mono text-text-muted/50">
                Store my API keys (encrypted on server)
              </span>
            </label>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Model {loadingModels && <span className="text-accent/50">loading...</span>}
            </label>
            <select
              value={draft.model}
              onChange={(e) => updateDraft({ model: e.target.value })}
              className="input-field"
            >
              {models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
              {!models.includes(draft.model) && (
                <option value={draft.model}>{draft.model}</option>
              )}
            </select>
          </div>
        </fieldset>

        <div className="mt-5 pt-4 border-t border-border/30 space-y-4">
          <label className={`flex items-center justify-between ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-0.5">
                Auto-apply code
              </span>
              <span className="block text-[10px] font-mono text-text-muted/30">
                Show diff review automatically when AI responds with code
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.autoApply}
              onClick={() => updateDraft({ autoApply: !draft.autoApply })}
              disabled={disabled}
              className="relative shrink-0 ml-4"
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: draft.autoApply ? 'var(--color-success, #22c55e)' : 'var(--color-border)',
                transition: 'background 0.2s',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: draft.autoApply ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
