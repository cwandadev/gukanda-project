// Tiny translation layer: t('client.home') looks the key up in en.json / fr.json.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

export type Lang = 'en' | 'fr';
const dictionaries = { en, fr };
const STORAGE_KEY = 'gukanda.lang';

// Walks "a.b.c" through the nested JSON.
function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<any>((node, part) => node?.[part], dict);
  return typeof value === 'string' ? value : undefined;
}

type I18nValue = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  // Restore the saved language (AsyncStorage uses localStorage on web).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'fr') setLangState(v);
      })
      .catch(() => {});
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };

  // Falls back to English, then to the key itself, so a gap is visible not fatal.
  const t = (key: string) => lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
