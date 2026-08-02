import { useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useAuthStore } from '../../store/authStore';
import { useModelList, MODELS, PROVIDER_LABELS, providerNeedsApiKey } from '../../hooks/useModelList';
import { useProviderKeysQuery, useSaveProviderKey, useClearProviderKey } from '../../hooks/useProviderKeys';
import { updatePreferences, startOpenRouterConnect } from '../../services/api';
import { APP_THEMES } from '../Editor/editorConfig';
import type { LLMConfig, ProviderKeys } from '../../types';

interface Draft {
  provider: LLMConfig['provider'];
  model: string;
  keys: ProviderKeys;
  initialKeys: ProviderKeys;
  storeApiKeys: boolean;
  autoApply: boolean;
  pendingDeletes: string[];
}

export function SettingsModal() {
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const appTheme = useEditorStore((s) => s.appTheme);
  const setAppTheme = useEditorStore((s) => s.setAppTheme);
  const user = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const saveProviderKeyMut = useSaveProviderKey();
  const clearProviderKeyMut = useClearProviderKey();

  const { models, loadingModels } = useModelList(draft?.provider ?? 'demo');

  const shouldFetchKeys = isSettingsOpen && !!user && !!draft?.storeApiKeys;
  const { data: remoteKeys } = useProviderKeysQuery(shouldFetchKeys);

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
      initialKeys: { ...s.providerKeys },
      storeApiKeys: s.storeApiKeys,
      autoApply: s.autoApply,
      pendingDeletes: [],
    });
  }, [isSettingsOpen]);

  // Backfill the model once a live list (e.g. opencode's catalog) finishes
  // loading after the draft was initialized with no model selected yet.
  useEffect(() => {
    if (draft && !draft.model && models.length > 0) {
      setDraft((prev) => (prev ? { ...prev, model: models[0] } : prev));
    }
  }, [draft, models]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const store = useEditorStore.getState();

      // Apply only new/changed keys to local store (skip masked values carried over)
      for (const [provider, key] of Object.entries(draft.keys)) {
        if (key && key !== draft.initialKeys[provider as keyof ProviderKeys]) {
          store.setProviderKey(provider as LLMConfig['provider'], key);
        }
      }
      // Clear deleted provider keys from local store
      for (const provider of draft.pendingDeletes) {
        store.clearProviderKey(provider as LLMConfig['provider']);
      }

      // Apply config
      store.setLLMConfig({ provider: draft.provider, model: draft.model });
      store.setStoreApiKeys(draft.storeApiKeys);
      store.setAutoApply(draft.autoApply);

      // Persist preference to server
      if (user) {
        updatePreferences({ storeApiKeys: draft.storeApiKeys }).catch(() => {});
      }

      // Save only user-changed keys to backend (never re-save masked indicators)
      if (user && draft.storeApiKeys) {
        for (const [provider, key] of Object.entries(draft.keys)) {
          if (key && providerNeedsApiKey(provider) && key !== draft.initialKeys[provider as keyof ProviderKeys]) {
            saveProviderKeyMut.mutate({ provider, apiKey: key });
          }
        }
      }
      if (user && draft.pendingDeletes.length > 0) {
        for (const provider of draft.pendingDeletes) {
          clearProviderKeyMut.mutate(provider);
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
  const isOpencode = draft.provider === 'opencode';
  const isOpenRouter = draft.provider === 'openrouter';
  const isKeyless = !providerNeedsApiKey(draft.provider);
  const currentKey = draft.keys[draft.provider] ?? '';
  const storedKeyMask = draft.storeApiKeys && !draft.pendingDeletes.includes(draft.provider) ? remoteKeys?.[draft.provider] : undefined;
  const openRouterConnected = !!storedKeyMask || !!draft.keys.openrouter;
  const disabled = saving || loadingModels;

  const updateDraft = (partial: Partial<Draft>) => setDraft((prev) => prev ? { ...prev, ...partial } : prev);

  const handleProviderChange = (provider: LLMConfig['provider']) => {
    updateDraft({
      provider,
      model: MODELS[provider]?.[0] ?? '',
    });
  };

  const handleKeyChange = (value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        keys: { ...prev.keys, [prev.provider]: value },
        pendingDeletes: prev.pendingDeletes.filter(p => p !== prev.provider),
      };
    });
  };

  const handleClearKey = () => {
    if (!draft) return;
    const provider = draft.provider;

    // Immediately clear from local store
    useEditorStore.getState().clearProviderKey(provider as LLMConfig['provider']);

    // Immediately clear from server
    if (user) {
      clearProviderKeyMut.mutate(provider);
    }

    // Update draft to reflect the deletion
    setDraft((prev) => {
      if (!prev) return prev;
      const keys = { ...prev.keys };
      delete keys[prev.provider];
      const initialKeys = { ...prev.initialKeys };
      delete initialKeys[prev.provider];
      return { ...prev, keys, initialKeys, pendingDeletes: prev.pendingDeletes.filter(p => p !== prev.provider) };
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) handleDiscard();
      }}
    >
      <div className="modal-panel max-w-md relative" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        {saving && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span className="inline-block w-4 h-4 border-2 border-info/30 border-t-info rounded-full animate-spin" />
              Saving…
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-5">
          <h2 id="settings-modal-title" className="modal-title">Settings</h2>
          <button onClick={handleDiscard} className="modal-close" disabled={saving} aria-label="Close settings">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <fieldset disabled={disabled} className="space-y-4">
          <div>
            <label htmlFor="settings-provider" className="block text-[10px] uppercase tracking-widest text-text-muted/50 mb-1.5">
              Provider
            </label>
            <select
              id="settings-provider"
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
            <p className="text-[10px] text-info/60 bg-info/5 border border-info/15 rounded-lg px-3 py-2">
              Free demo mode powered by Groq + Llama 3.3 70B. No API key needed.
            </p>
          )}

          {isOpencode && (
            <p className="text-[10px] text-info/60 bg-info/5 border border-info/15 rounded-lg px-3 py-2">
              Uses a local <code>opencode serve</code> instance. No API key needed — opencode manages provider auth itself.
            </p>
          )}

          {isOpenRouter && (
            <div className="space-y-2">
              <p className="text-[10px] text-info/60 bg-info/5 border border-info/15 rounded-lg px-3 py-2">
                Connect your OpenRouter account to use your own credits across many models. No API key to paste — requests are billed to your OpenRouter balance.
              </p>
              {openRouterConnected ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-success/25 bg-success/5">
                  <span className="text-[11px] text-success/80 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Account connected{storedKeyMask ? ` (${storedKeyMask})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-[11px] text-error hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      useAuthStore.getState().setIsLoginOpen(true);
                      return;
                    }
                    void startOpenRouterConnect();
                  }}
                  className="btn-primary w-full"
                >
                  Connect OpenRouter account
                </button>
              )}
            </div>
          )}

          {!isKeyless && !isOpenRouter && (
            <div>
              <label htmlFor="settings-api-key" className="block text-[10px] uppercase tracking-widest text-text-muted/50 mb-1.5">
                API Key
              </label>
              {storedKeyMask ? (
                <>
                  <div className="flex gap-2">
                    <input
                      id="settings-api-key"
                      type="text"
                      value={storedKeyMask}
                      disabled
                      className="input-field flex-1 opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="px-2.5 rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Delete key"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-success/50">
                    Stored on server. Delete to set a new key.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      id="settings-api-key"
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
                        className="px-2.5 rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="Delete key"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {user && draft.storeApiKeys ? (
                    <p className="mt-1.5 text-[10px] text-text-muted/30">
                      Will be encrypted &amp; saved to your account.
                    </p>
                  ) : (
                    <div className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-md bg-warning/10 border border-warning/25">
                      <svg className="w-3.5 h-3.5 text-warning shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.85A1 1 0 002.56 20h18.88a1 1 0 00.85-1.29L13.71 3.86a1 1 0 00-1.42 0z" />
                      </svg>
                      <span className="text-[10px] text-warning/80 leading-relaxed">
                        Session only. Your key will be lost when you close this tab.
                        {user && ' Enable "Store my API keys" below to save it.'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!isKeyless && !isOpenRouter && user && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.storeApiKeys}
                onChange={(e) => updateDraft({ storeApiKeys: e.target.checked })}
                className="rounded border-border/50 accent-accent"
              />
              <span className="text-[10px] text-text-muted/50">
                Store my API keys (encrypted on server)
              </span>
            </label>
          )}

          <div>
            <label htmlFor="settings-model" className="block text-[10px] uppercase tracking-widest text-text-muted/50 mb-1.5">
              Model {loadingModels && <span className="text-accent/50">loading...</span>}
            </label>
            <select
              id="settings-model"
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
          <div>
            <label htmlFor="settings-theme" className="block text-[10px] uppercase tracking-widest text-text-muted/50 mb-1.5">
              Theme
            </label>
            <select
              id="settings-theme"
              value={appTheme}
              onChange={(e) => setAppTheme(e.target.value as typeof appTheme)}
              className="input-field"
            >
              {APP_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] text-text-muted/40">
              Paints the whole app, including the editor. Auto follows your system.
            </p>
          </div>

          <label className={`flex items-center justify-between ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-text-muted/50 mb-0.5">
                Auto-apply code
              </span>
              <span className="block text-[10px] text-text-muted/30">
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
