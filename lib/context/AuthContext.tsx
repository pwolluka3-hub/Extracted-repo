'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { signIn, signOut, getUser, isSignedIn, waitForPuter } from '@/lib/services/puterService';
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
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    onboardingComplete: false,
    brandKit: null,
  });

  // Initialize auth state - INSTANT loading, background check
  useEffect(() => {
    let mounted = true;
    
    // Show content immediately - no blocking
    setState(prev => ({ ...prev, isLoading: false }));
    
    // Background auth check (non-blocking)
    async function checkAuth() {
      try {
        const authenticated = await Promise.race([
          isSignedIn(),
          new Promise<boolean>(r => setTimeout(() => r(false), 400))
        ]).catch(() => false);
        if (!mounted || !authenticated) return;

        const user = await getUser().catch(() => null);
        if (!mounted || !user) return;
        
        // Load user data
        await initMemory().catch(() => {});
        const [onboarding, brandKit] = await Promise.all([
          isOnboardingComplete().catch(() => false),
          loadBrandKit().catch(() => null),
        ]);

        if (mounted) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            user,
            onboardingComplete: onboarding,
            brandKit,
          });
        }
      } catch {
        // Silently fail - user stays unauthenticated
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
