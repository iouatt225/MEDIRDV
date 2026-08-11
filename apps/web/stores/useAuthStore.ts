'use client';

import { create } from 'zustand';

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
  pendingFormState: unknown | null;
  
  login: (token: string, user: User) => void;
  logout: () => void;
  updateAccessToken: (token: string) => void;
  setPendingFormState: (state: unknown | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  pendingFormState: null,

  login: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
  logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
  updateAccessToken: (token) => set({ accessToken: token }),
  setPendingFormState: (state) => set({ pendingFormState: state }),
}));
