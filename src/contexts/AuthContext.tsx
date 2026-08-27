import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { formatSupabaseError } from '@/lib/supabaseErrors';
import { appStorage } from '@/lib/appStorage';

interface AuthContextValue {
  isCloudEnabled: boolean;
  isLoading: boolean;
  authError: string | null;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    let isMounted = true;
    let authChanged = false;

    const hydrate = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted || authChanged) return;
        appStorage.bindUser(data.session?.user.id ?? null);
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setAuthError(null);
      } catch (error: unknown) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setAuthError(formatSupabaseError(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrate();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      authChanged = true;
      appStorage.bindUser(nextSession?.user.id ?? null);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: unknown) {
      throw new Error(formatSupabaseError(error));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.href,
          data: {
            username: username.trim(),
          },
        },
      });
      if (error) throw error;

      return {
        needsEmailConfirmation: !data.session,
      };
    } catch (error: unknown) {
      throw new Error(formatSupabaseError(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      throw new Error(formatSupabaseError(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href,
      });
      if (error) throw error;
    } catch (error: unknown) {
      throw new Error(formatSupabaseError(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isCloudEnabled: isSupabaseConfigured,
      isLoading,
      authError,
      session,
      user,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [authError, isLoading, resetPassword, session, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth musí být použitý uvnitř AuthProvider.');
  }
  return context;
};
