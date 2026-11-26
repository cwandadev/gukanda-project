// Login state for the whole app: the session, the profile (with the ROLE) and sign in/up/out.
import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n, type Lang } from './i18n';
import type { Role } from './role';
import { supabase } from './supabase';

export type Profile = { id: string; role: Role; full_name: string; preferred_language: Lang };
export type AuthResult = { errorKey?: string; needsEmailConfirmation?: boolean };

// Supabase error codes -> our translation keys (so no English text is hardcoded).
const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'auth.error.invalidCredentials',
  user_already_exists: 'auth.error.emailTaken',
  email_exists: 'auth.error.emailTaken',
  weak_password: 'auth.error.weakPassword',
  over_request_rate_limit: 'auth.error.rateLimit',
  over_email_send_rate_limit: 'auth.error.rateLimit',
  email_not_confirmed: 'auth.error.emailNotConfirmed',
};

function errorKeyFor(error: AuthError): string {
  if (error.code && ERROR_KEYS[error.code]) return ERROR_KEYS[error.code];
  if (error.name === 'AuthRetryableFetchError') return 'auth.error.network';
  return 'auth.error.generic';
}

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean; // true until we know who is signed in AND have their profile
  profileError: boolean; // signed in, but the profile could not be loaded
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  saveLanguage: (lang: Lang) => Promise<void>;
  retryProfile: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { lang, setLang } = useI18n();
  const setLangRef = useRef(setLang); // keeps the effect below from re-running on every render
  setLangRef.current = setLang;

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null); // user id whose profile load finished
  const [profileError, setProfileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const userId = session?.user.id ?? null;

  // 1) Who is signed in? (restored from storage on start, then kept up to date)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 2) Load that user's profile (role, name, language). RLS lets you read your own row.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(false);
      setProfileFor(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, role, full_name, preferred_language')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(data as Profile);
          setProfileError(false);
          setLangRef.current((data as Profile).preferred_language); // use the saved language
        }
        setProfileFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, retry]);

  const loading = !sessionLoaded || (userId !== null && profileFor !== userId);

  const signIn: AuthValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { errorKey: errorKeyFor(error) } : {};
  };

  const signUp: AuthValue['signUp'] = async (email, password, fullName) => {
    // The database trigger makes the profile and ALWAYS gives the role "client".
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, preferred_language: lang } },
    });
    if (error) return { errorKey: errorKeyFor(error) };
    return data.session ? {} : { needsEmailConfirmation: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const saveLanguage: AuthValue['saveLanguage'] = async (next) => {
    setLang(next);
    if (!profile) return; // signed out: only the device remembers it
    const { error } = await supabase.from('profiles').update({ preferred_language: next }).eq('id', profile.id);
    if (!error) setProfile({ ...profile, preferred_language: next });
  };

  const retryProfile = () => setRetry((n) => n + 1);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileError, signIn, signUp, signOut, saveLanguage, retryProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
