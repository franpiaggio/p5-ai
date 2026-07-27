import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEditorStore } from './editorStore';
import { queryClient, queryKeys } from '../hooks/queryClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  storeApiKeys?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isSaveSketchOpen: boolean;
  isLoginOpen: boolean;
  // Set when the user hits Save while logged out; consumed once after a
  // successful login to auto-resume that save. Transient (not persisted).
  pendingSaveAfterLogin: boolean;

  setAuth: (user: AuthUser) => void;
  logout: () => void;
  setIsSaveSketchOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
  setPendingSaveAfterLogin: (pending: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isSaveSketchOpen: false,
      isLoginOpen: false,
      pendingSaveAfterLogin: false,

      setAuth: (user) => {
        // The sketches list is cached under a user-agnostic query key, so a
        // login must drop any list fetched for a previously logged-in user
        // in this tab (e.g. after switching accounts without a full reload).
        queryClient.removeQueries({ queryKey: queryKeys.sketches });
        set({ user });
      },
      logout: () => {
        // Clear API keys from editor store on logout
        const editorStore = useEditorStore.getState();
        editorStore.setStoreApiKeys(false);
        // Clear all provider keys
        for (const provider of Object.keys(editorStore.providerKeys)) {
          editorStore.clearProviderKey(provider as 'openai' | 'anthropic' | 'deepseek' | 'demo');
        }
        // Drop the cached sketches list so the next user doesn't see a stale
        // (or briefly flashed) copy of the previous user's sketches.
        queryClient.removeQueries({ queryKey: queryKeys.sketches });
        set({ user: null });
      },
      setIsSaveSketchOpen: (isSaveSketchOpen) => set({ isSaveSketchOpen }),
      setIsLoginOpen: (isLoginOpen) => set({ isLoginOpen }),
      setPendingSaveAfterLogin: (pendingSaveAfterLogin) => set({ pendingSaveAfterLogin }),
    }),
    {
      name: 'p5-ai-auth',
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);
