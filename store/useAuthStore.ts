import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  current_streak: number;
  total_xp: number;
  current_level: number;
  is_premium: boolean;
  last_active_at: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  profile: null,
  setSession: (session) =>
    set((state) => ({
      session,
      user: session ? session.user : null,
      initialized: true,
    })),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    let profile = null;
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      profile = data;
    }

    set({
      session,
      user: session ? session.user : null,
      profile,
      initialized: true,
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      let profile = null;
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        profile = data;
      }
      
      set({
        session,
        user: session ? session.user : null,
        profile,
        initialized: true,
      });
    });
  },
  refreshProfile: async () => {
    const { session } = useAuthStore.getState();
    if (!session?.user) return;
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (data) {
      set({ profile: data });
    }
  }
}));
