'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserRole = 'patient' | 'medecin' | 'secretaire' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  pendingFormState: unknown | null;
  
  login: (token: string, user: User) => void;
  logout: () => void;
  updateAccessToken: (token: string) => void;
  setPendingFormState: (state: unknown | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      pendingFormState: null,

      login: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
      updateAccessToken: (token) => set({ accessToken: token }),
      setPendingFormState: (state) => set({ pendingFormState: state }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'medirdv-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
