import { useState, useCallback, useEffect } from 'react';
import pt from './pt';
import es from './es';
import en from './en';
import type { Language } from '../types';

const translations = { pt, es, en } as const;

type Strings = typeof pt;

let currentLanguage: Language = 'pt';
const listeners: Set<() => void> = new Set();

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  listeners.forEach((fn) => fn());
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(): Strings {
  return translations[currentLanguage];
}

export function useI18n() {
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    listeners.add(forceUpdate);
    return () => { listeners.delete(forceUpdate); };
  }, [forceUpdate]);

  return {
    t: t(),
    language: currentLanguage,
    setLanguage,
  };
}
