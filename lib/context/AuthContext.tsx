'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { signIn, signOut, getUser, isSignedIn, getCachedAuthUser, clearCachedAuth } from '@/lib/services/puterService';
import { initMemory, isOnboardingComplete, loadBrandKit } from '@/lib/services/memoryService';
import type { BrandKit } from '@/lib/types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: { username: string } | null;
  onboardingComplete: boolean;
  brandKit: BrandKit | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshBrandKit: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedUser = getCachedAuthUser();
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: cachedUser,
    onboardingComplete: false,
    brandKit: null,
  });

  // Initialize auth state and restore session from cache/Puter
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const authenticated = await isSignedIn().catch(() => false);
        const user = authenticated ? await getUser().catch(() => getCachedAuthUser()) : null;

        if (!mounted) return;

        if (!authenticated) {
          clearCachedAuth();
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            onboardingComplete: false,
            brandKit: null,
          });
          return;
        }

        await initMemory().catch(() => {});
        const [onboarding, brandKit] = await Promise.all([
          isOnboardingComplete().catch(() => false),
          loadBrandKit().catch(() => null),
        ]);

        if (!mounted) return;

        setState({
          isLoading: false,
          isAuthenticated: true,
          user,
          onboardingComplete: onboarding,
          brandKit,
        });
      } catch {
        if (!mounted) return;
        clearCachedAuth();
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          onboardingComplete: false,
          brandKit: null,
        });
      }
    }

    checkAuth();
    
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (): Promise<boolean> => {
    try {
      const user = await signIn();
      
      if (user) {
        await initMemory();
        
        const [onboarding, brandKit] = await Promise.all([
          isOnboardingComplete(),
          loadBrandKit(),
        ]);

        setState({
          isLoading: false,
          isAuthenticated: true,
          user,
          onboardingComplete: onboarding,
          brandKit,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        onboardingComplete: false,
        brandKit: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const refreshBrandKit = useCallback(async () => {
    try {
      const brandKit = await loadBrandKit();
      setState(s => ({ ...s, brandKit }));
    } catch (error) {
      console.error('Refresh brand kit error:', error);
    }
  }, []);

  const setOnboardingCompleteState = useCallback((complete: boolean) => {
    setState(s => ({ ...s, onboardingComplete: complete }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshBrandKit,
        setOnboardingComplete: setOnboardingCompleteState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
