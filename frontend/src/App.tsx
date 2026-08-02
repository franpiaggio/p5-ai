import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toolbar, SettingsModal } from './components';
import { SaveSketchModal } from './components/Sketches/SaveSketchModal';
import { LoginModal } from './components/Auth/LoginModal';
import { useEditorStore } from './store/editorStore';
import { useAuthStore } from './store/authStore';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
import {
  getProfile,
  getProviderKeys,
  setUnauthorizedHandler,
  connectOpenRouter,
  takeOpenRouterVerifier,
  updatePreferences,
  fetchModels,
} from './services/api';
import { queryClient, queryKeys } from './hooks/queryClient';
import type { LLMConfig } from './types';

function App() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isEditorPage =
    location.pathname === '/' ||
    location.pathname.startsWith('/sketch/') ||
    location.pathname.startsWith('/example/');

  // Register a global 401 handler: if any authenticated request finds the session
  // expired/invalid, clear the stale local auth state and prompt re-login so the UI
  // never claims to be logged in while the backend rejects every request.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const { user: current, logout, setIsLoginOpen } = useAuthStore.getState();
      if (!current) return; // nothing persisted to reconcile
      logout();
      setIsLoginOpen(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Validate the persisted session against the backend on startup. The auth cookie
  // (JWT) expires after 7 days while the persisted `user` never does, so on load we
  // confirm the session is still valid and refresh the user; a 401 is handled by the
  // global unauthorized handler above (logs out + opens login).
  useEffect(() => {
    if (!useAuthStore.getState().user) return;
    getProfile()
      .then((profile) => {
        useAuthStore.getState().setAuth({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          storeApiKeys: profile.storeApiKeys,
        });
      })
      .catch(() => {}); // 401 already handled globally; ignore transient errors
  }, []);

  // Finish the OpenRouter OAuth flow when we land back with a `?code=`. OpenRouter
  // strips any query we set on the callback URL, so the return trip is identified
  // by the PKCE verifier we stashed before redirecting (present only during a
  // connect). Exchange the code for a user-scoped key (stored server-side), then
  // switch the editor to OpenRouter. Enabling "store keys" lets the backend
  // resolve the connected key on every chat request. Runs once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = code ? takeOpenRouterVerifier() : null;
    if (!code || !verifier) return;
    const cleanUrl = window.location.pathname;
    const finish = () => window.history.replaceState({}, '', cleanUrl);

    connectOpenRouter(code, verifier)
      .then(async () => {
        const store = useEditorStore.getState();
        store.setStoreApiKeys(true);
        updatePreferences({ storeApiKeys: true }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: queryKeys.providerKeys });
        // Pick a real model from OpenRouter's live catalog, preferring a free
        // tier — hardcoded IDs go stale and 404. Fall back to a paid default only
        // if the catalog can't be read.
        let model = 'openai/gpt-4o-mini';
        try {
          const models = await fetchModels('openrouter');
          model = models.find((m) => m.endsWith(':free')) ?? models[0] ?? model;
        } catch {
          // keep the fallback
        }
        useEditorStore.getState().setLLMConfig({ provider: 'openrouter', model });
      })
      .catch(() => {})
      .finally(finish);
  }, []);

  // Auto-restore API keys: fetch server preference and keys on mount/login
  useEffect(() => {
    if (!user) return;
    const store = useEditorStore.getState();
    const hasAnyKey = Object.values(store.providerKeys).some(Boolean);

    const fetchAndRestoreKeys = async () => {
      if (Object.values(useEditorStore.getState().providerKeys).some(Boolean)) return;
      const keys = await getProviderKeys();
      const s = useEditorStore.getState();
      for (const [provider, key] of Object.entries(keys)) {
        if (key) s.setProviderKey(provider as LLMConfig['provider'], key);
      }
    };

    if (store.storeApiKeys) {
      if (!hasAnyKey) fetchAndRestoreKeys().catch(() => {});
    } else {
      getProfile()
        .then(async (profile) => {
          if (!profile.storeApiKeys) return;
          useEditorStore.getState().setStoreApiKeys(true);
          await fetchAndRestoreKeys();
        })
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      {isEditorPage && <Toolbar />}
      <Outlet />
      <SettingsModal />
      <LoginModal />
      <SaveSketchModal />
      <UnsavedChangesDialog />
    </div>
  );
}

export default App;
