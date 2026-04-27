import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  profile: any | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
}));

interface SessionState {
  currentSessionId: string | null;
  questions: any[];
  startSession: (sessionId: string, questions: any[]) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSessionId: null,
  questions: [],
  startSession: (sessionId, questions) => set({ currentSessionId: sessionId, questions }),
  endSession: () => set({ currentSessionId: null, questions: [] }),
}));
