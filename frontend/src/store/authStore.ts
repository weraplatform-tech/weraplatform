import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  login: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (user: any) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));
