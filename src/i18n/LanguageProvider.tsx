"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isLanguage, LANGUAGE_COOKIE, translate, type Language } from './translate';
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'fr', setLanguage: () => {} });
export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(initialLanguage);
  const setLanguage = useCallback((next: Language) => {
    if (!isLanguage(next)) return;
    updateLanguage(next);
    document.documentElement.lang = next;
    document.cookie = `${LANGUAGE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    try { localStorage.setItem(LANGUAGE_COOKIE, next); } catch { /* Cookie persistence remains available. */ }
  }, []);
  useEffect(() => {
    function onStorage(event: StorageEvent) { if (event.key === LANGUAGE_COOKIE && isLanguage(event.newValue)) setLanguage(event.newValue); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setLanguage]);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
export function useT() {
  const { language } = useLanguage();
  return useCallback((text: string, values?: Record<string, string | number>) => translate(text, language, values), [language]);
}
