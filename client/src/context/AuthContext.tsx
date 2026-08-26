/**
 * Auth state: token persistence, session bootstrap, and the routing signal for
 * "this user still needs onboarding".
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  apiRequest,
  setUnauthorizedHandler,
  tokenStore,
} from '@/lib/apiClient';
import type { AuthResponse, MeResponse, PublicUser } from '@/types/api';

interface AuthContextValue {
  user: PublicUser | null;
  /** True while the initial `GET /auth/me` bootstrap is in flight. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
  /**
   * Flips `hasCompletedOnboarding` locally after onboarding is submitted, so the
   * redirect happens without a refetch round-trip.
   */
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Any 401 from anywhere in the app drops the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore the session from a stored token on first load.
  useEffect(() => {
    if (!tokenStore.get()) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await apiRequest<MeResponse>('/api/auth/me');
        if (!cancelled) setUser(response.user);
      } catch (error) {
        // 401 => stale token; anything else (server down) also lands on the
        // login screen, which is the honest state.
        if (!cancelled) {
          if (!(error instanceof ApiError) || error.status === 401) tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthResponse = useCallback((response: AuthResponse): PublicUser => {
    tokenStore.set(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<PublicUser> => {
      const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        anonymous: true,
        body: { email, password },
      });
      queryClient.clear();
      return applyAuthResponse(response);
    },
    [applyAuthResponse, queryClient],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<PublicUser> => {
      const response = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        anonymous: true,
        body: { name, email, password },
      });
      queryClient.clear();
      return applyAuthResponse(response);
    },
    [applyAuthResponse, queryClient],
  );

  const markOnboardingComplete = useCallback(() => {
    setUser((current) => (current ? { ...current, hasCompletedOnboarding: true } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      markOnboardingComplete,
    }),
    [user, isBootstrapping, login, register, logout, markOnboardingComplete],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within <AuthProvider>.');
  return context;
};
