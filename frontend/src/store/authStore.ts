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

  setAuth: (user: AuthUser) => void;
  logout: () => void;
  setIsProfileOpen: (open: boolean) => void;
  setIsSaveSketchOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isProfileOpen: false,
      isSaveSketchOpen: false,
      isLoginOpen: false,

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
    }),
    {
      name: 'p5-ai-auth',
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);
