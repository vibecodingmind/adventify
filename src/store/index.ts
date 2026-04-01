import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  divisionId?: string | null;
  unionId?: string | null;
  conferenceId?: string | null;
  churchId?: string | null;
  division?: { id: string; code: string; name: string } | null;
  union?: { id: string; code: string; name: string } | null;
  conference?: { id: string; code: string; name: string } | null;
  church?: { id: string; code: string; name: string; city?: string; country?: string } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'adventify-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// UI State Store
interface UIState {
  sidebarOpen: boolean;
  language: string;
  setSidebarOpen: (open: boolean) => void;
  setLanguage: (lang: string) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: 'en',
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setLanguage: (lang) => set({ language: lang }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'adventify-ui',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
