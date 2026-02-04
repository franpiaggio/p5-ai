import { useEditorStore } from '../../store/editorStore';

const MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
};

export function SettingsModal() {
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const setLLMConfig = useEditorStore((s) => s.setLLMConfig);

  if (!isSettingsOpen) return null;

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
                const provider = e.target.value as 'openai' | 'anthropic';
                setLLMConfig({ provider, model: MODELS[provider][0] });
              }}
              className="input-field"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Model
            </label>
            <select
              value={llmConfig.model}
              onChange={(e) => setLLMConfig({ model: e.target.value })}
              className="input-field"
            >
              {MODELS[llmConfig.provider].map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={llmConfig.apiKey}
              onChange={(e) => setLLMConfig({ apiKey: e.target.value })}
              placeholder={`Enter ${llmConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic'} key`}
              className="input-field"
            />
            <p className="mt-1.5 text-[10px] font-mono text-text-muted/30">
              Stored locally. Sent to backend only for API calls.
            </p>
          </div>
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
