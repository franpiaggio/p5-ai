import { useState, useCallback } from 'react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { loginWithCredentials, loginWithGoogle, getProviderKeys } from '../../services/api';
import type { LLMConfig } from '../../types';

export function LoginModal() {
  const isLoginOpen = useAuthStore((s) => s.isLoginOpen);
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setIsLoginOpen(false);
    setUsername('');
    setPassword('');
    setError('');
  }, [setIsLoginOpen]);

  useEscapeClose(isLoginOpen, handleClose);

  if (!isLoginOpen) return null;

  const restoreApiKeys = async (serverStoreApiKeys?: boolean) => {
    // Use server preference if provided (login response), otherwise fall back to local
    if (serverStoreApiKeys) {
      useEditorStore.getState().setStoreApiKeys(true);
    }
    if (!useEditorStore.getState().storeApiKeys) return;
    const keys = await getProviderKeys();
    const store = useEditorStore.getState();
    for (const [provider, key] of Object.entries(keys)) {
      if (key) store.setProviderKey(provider as LLMConfig['provider'], key);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await loginWithCredentials(username.trim(), password);
      setAuth(result.user);
      handleClose();
      restoreApiKeys(result.user.storeApiKeys);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      setAuth(result.user);
      handleClose();
      restoreApiKeys(result.user.storeApiKeys);
    } catch {
      setError('Google login failed');
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-panel max-w-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="modal-title">
            Sign In
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="input-field"
            />
          </div>

          {error && (
            <p className="text-[11px] font-mono text-accent">{error}</p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password || loading}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] font-mono text-text-muted/30 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            theme="filled_black"
            size="large"
            shape="pill"
            text="signin_with"
            width="300"
          />
        </div>
      </div>
    </div>
  );
}
