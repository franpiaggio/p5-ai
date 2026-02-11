import { useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useAuthStore } from '../../store/authStore';
import { fetchModels, getProviderKeys, saveProviderKey, clearProviderKey as clearProviderKeyApi } from '../../services/api';
import type { LLMConfig } from '../../types';

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

export function SettingsModal() {
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const setLLMConfig = useEditorStore((s) => s.setLLMConfig);
  const autoApply = useEditorStore((s) => s.autoApply);
  const setAutoApply = useEditorStore((s) => s.setAutoApply);
  const providerKeys = useEditorStore((s) => s.providerKeys);
  const setProviderKey = useEditorStore((s) => s.setProviderKey);
  const clearProviderKey = useEditorStore((s) => s.clearProviderKey);
  const storeApiKeys = useEditorStore((s) => s.storeApiKeys);
  const setStoreApiKeys = useEditorStore((s) => s.setStoreApiKeys);
  const user = useAuthStore((s) => s.user);

  const [models, setModels] = useState<string[]>(FALLBACK_MODELS[llmConfig.provider] ?? []);
  const [loadingModels, setLoadingModels] = useState(false);

  // Auto-fetch keys from backend if logged in + storeApiKeys enabled + no keys in session
  useEffect(() => {
    if (!isSettingsOpen || !user || !storeApiKeys) return;
    const hasAnyKey = Object.values(providerKeys).some(Boolean);
    if (hasAnyKey) return;
    getProviderKeys().then((keys) => {
      for (const [provider, key] of Object.entries(keys)) {
        if (key) setProviderKey(provider as LLMConfig['provider'], key);
      }
    });
  }, [isSettingsOpen, user, storeApiKeys]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const provider = llmConfig.provider;
    const apiKey = llmConfig.apiKey;

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
  }, [isSettingsOpen, llmConfig.provider, llmConfig.apiKey]);

  const handleClose = useCallback(() => {
    // Save current provider's key to backend if storeApiKeys enabled
    if (user && storeApiKeys) {
      const { llmConfig: cfg, providerKeys: keys } = useEditorStore.getState();
      const currentKey = keys[cfg.provider];
      if (currentKey && cfg.provider !== 'demo') {
        saveProviderKey(cfg.provider, currentKey).catch(() => {});
      }
    }
    setIsSettingsOpen(false);
  }, [user, storeApiKeys, setIsSettingsOpen]);

  useEscapeClose(isSettingsOpen, handleClose);

  if (!isSettingsOpen) return null;

  const isDemo = llmConfig.provider === 'demo';
  const currentKey = providerKeys[llmConfig.provider] ?? '';

  const handleClear = () => {
    clearProviderKey(llmConfig.provider);
    if (user && storeApiKeys) {
      clearProviderKeyApi(llmConfig.provider).catch(() => {});
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-panel max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h2 className="modal-title">
            Settings
          </h2>
          <button
            onClick={handleClose}
            className="modal-close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Provider
            </label>
            <select
              value={llmConfig.provider}
              onChange={(e) => {
                const provider = e.target.value as LLMConfig['provider'];
                setLLMConfig({
                  provider,
                  model: FALLBACK_MODELS[provider][0],
                });
              }}
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
                  onChange={(e) => setProviderKey(llmConfig.provider, e.target.value)}
                  placeholder={`Enter ${PROVIDER_LABELS[llmConfig.provider]} key`}
                  className="input-field flex-1"
                />
                {currentKey && (
                  <button
                    onClick={handleClear}
                    className="px-2.5 rounded-lg border border-border/30 text-text-muted/50 hover:text-accent hover:border-accent/30 transition-colors"
                    title="Clear key"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[10px] font-mono text-text-muted/30">
                {user && storeApiKeys
                  ? 'Encrypted & saved to your account.'
                  : 'Stored in session only — cleared when you close the tab.'}
              </p>
            </div>
          )}

          {!isDemo && user && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeApiKeys}
                onChange={(e) => setStoreApiKeys(e.target.checked)}
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
              value={llmConfig.model}
              onChange={(e) => setLLMConfig({ model: e.target.value })}
              className="input-field"
            >
              {models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
              {!models.includes(llmConfig.model) && (
                <option value={llmConfig.model}>{llmConfig.model}</option>
              )}
            </select>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border/30 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
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
              aria-checked={autoApply}
              onClick={() => setAutoApply(!autoApply)}
              className="relative shrink-0 ml-4"
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: autoApply ? 'var(--color-success, #22c55e)' : 'var(--color-border)',
                transition: 'background 0.2s',
                border: 'none',
                cursor: 'pointer',
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
                  left: autoApply ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-primary px-5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
