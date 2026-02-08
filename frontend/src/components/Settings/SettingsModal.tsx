import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { fetchModels, getApiKey } from '../../services/api';
import type { LLMConfig } from '../../types';

const FALLBACK_MODELS: Record<string, string[]> = {
  demo: ['llama-3.3-70b-versatile'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
};

const PROVIDER_LABELS: Record<string, string> = {
  demo: 'Demo (free)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export function SettingsModal() {
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const setLLMConfig = useEditorStore((s) => s.setLLMConfig);
  const autoApply = useEditorStore((s) => s.autoApply);
  const setAutoApply = useEditorStore((s) => s.setAutoApply);
  const user = useAuthStore((s) => s.user);

  const [models, setModels] = useState<string[]>(FALLBACK_MODELS[llmConfig.provider] ?? []);
  const [loadingModels, setLoadingModels] = useState(false);

  // Auto-fetch API key from backend if logged in and key is empty (e.g. page refresh)
  useEffect(() => {
    if (!isSettingsOpen || !user || llmConfig.apiKey) return;
    getApiKey().then((key) => {
      if (key) setLLMConfig({ apiKey: key });
    });
  }, [isSettingsOpen, user]);

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

  if (!isSettingsOpen) return null;

  const isDemo = llmConfig.provider === 'demo';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSettingsOpen(false);
      }}
    >
      <div className="bg-surface-raised rounded-xl p-6 w-full max-w-md border border-border/60 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-mono font-semibold text-text-primary tracking-wide">
            Settings
          </h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-text-muted/40 hover:text-accent transition-colors"
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
                  apiKey: provider === 'demo' ? '' : llmConfig.apiKey,
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
              <input
                type="password"
                value={llmConfig.apiKey}
                onChange={(e) => setLLMConfig({ apiKey: e.target.value })}
                placeholder={`Enter ${PROVIDER_LABELS[llmConfig.provider]} key`}
                className="input-field"
              />
              <p className="mt-1.5 text-[10px] font-mono text-text-muted/30">
                {user
                  ? 'Encrypted & saved to your account.'
                  : 'Stored in session only — cleared when you close the tab.'}
              </p>
            </div>
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

        <div className="mt-5 pt-4 border-t border-border/30">
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
            onClick={() => setIsSettingsOpen(false)}
            className="btn-primary px-5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
