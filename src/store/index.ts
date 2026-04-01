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
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
