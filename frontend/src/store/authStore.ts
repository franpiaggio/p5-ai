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
      logout: () => set({ user: null }),
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
