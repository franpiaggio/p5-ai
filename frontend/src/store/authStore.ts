import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isProfileOpen: boolean;
  isSaveSketchOpen: boolean;
  isLoginOpen: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setIsProfileOpen: (open: boolean) => void;
  setIsSaveSketchOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isProfileOpen: false,
      isSaveSketchOpen: false,
      isLoginOpen: false,

      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setIsProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
      setIsSaveSketchOpen: (isSaveSketchOpen) => set({ isSaveSketchOpen }),
      setIsLoginOpen: (isLoginOpen) => set({ isLoginOpen }),
    }),
    {
      name: 'p5-ai-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
