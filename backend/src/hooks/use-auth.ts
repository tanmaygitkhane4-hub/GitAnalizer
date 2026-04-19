import { useState, useEffect, createContext, useContext } from 'react';
import { getProfile, logout, isAuthenticated, type UserProfile } from '@/lib/api';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  authenticated: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  authenticated: false,
  refresh: async () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getProfile();
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const signOut = () => {
    logout();
    setUser(null);
    window.location.href = '/';
  };

  return {
    user,
    loading,
    authenticated: !!user,
    refresh,
    signOut,
  };
}
