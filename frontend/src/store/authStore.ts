import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEditorStore } from './editorStore';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  storeApiKeys?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isProfileOpen: boolean;
  isSaveSketchOpen: boolean;
  isLoginOpen: boolean;
  // Set when the user hits Save while logged out; consumed once after a
  // successful login to auto-resume that save. Transient (not persisted).
  pendingSaveAfterLogin: boolean;

  setAuth: (user: AuthUser) => void;
  logout: () => void;
  setIsProfileOpen: (open: boolean) => void;
  setIsSaveSketchOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
  setPendingSaveAfterLogin: (pending: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isProfileOpen: false,
      isSaveSketchOpen: false,
      isLoginOpen: false,
      pendingSaveAfterLogin: false,

      setAuth: (user) => set({ user }),
      logout: () => {
        // Clear API keys from editor store on logout
        const editorStore = useEditorStore.getState();
        editorStore.setStoreApiKeys(false);
        // Clear all provider keys
        for (const provider of Object.keys(editorStore.providerKeys)) {
          editorStore.clearProviderKey(provider as 'openai' | 'anthropic' | 'deepseek' | 'demo');
        }
        set({ user: null });
      },
      setIsProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
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
