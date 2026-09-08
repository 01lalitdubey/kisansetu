import { useMemo } from 'react';
import type { Language } from '../types';
import { useAppStore } from '../store/appStore';
import en from './en';
import hi from './hi';
import hinglish from './hinglish';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Registry of available languages. Adding another Indian language later is
 * a one-line change here plus a new translation file — nothing else in the
 * app needs to know.
 */
export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'हिं' },
  { code: 'hinglish', label: 'Hinglish', short: 'HIN' },
];

const bundles: Record<Language, DeepPartial<typeof en>> = {
  en,
  hi,
  hinglish,
};

function lookup(bundle: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, bundle);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export interface TFunction {
  (key: string, vars?: Record<string, string | number>): string;
  /** Return an array value (e.g. checklist items) with English fallback. */
  list: (key: string) => string[];
}

export function createTranslator(lang: Language): TFunction {
  const translate = (key: string, vars?: Record<string, string | number>): string => {
    const path = key.split('.');
    const value = lookup(bundles[lang], path) ?? lookup(en, path);
    return typeof value === 'string' ? interpolate(value, vars) : key;
  };

  const list = (key: string): string[] => {
    const path = key.split('.');
    const value = lookup(bundles[lang], path) ?? lookup(en, path);
    return Array.isArray(value) ? (value as string[]) : [];
  };

  return Object.assign(translate, { list });
}

/**
 * Component hook. Re-renders whenever the language changes in the store,
 * so switching language updates all visible text immediately.
 */
export function useT(): {
  t: TFunction;
  language: Language;
  setLanguage: (l: Language) => void;
} {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const t = useMemo(() => createTranslator(language), [language]);
  return { t, language, setLanguage };
}
