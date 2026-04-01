'use client';

import { useCallback, useMemo } from 'react';
import { useUIStore } from '@/store';
import en from '@/lib/translations/en';
import fr from '@/lib/translations/fr';
import es from '@/lib/translations/es';
import pt from '@/lib/translations/pt';
import sw from '@/lib/translations/sw';
import type { TranslationKeys } from '@/lib/translations/en';

// All translations keyed by language code
export const translations: Record<string, TranslationKeys> = {
  en,
  fr,
  es,
  pt,
  sw,
};

// Supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
];

export type SupportedLanguage = 'en' | 'fr' | 'es' | 'pt' | 'sw';

/**
 * Server-side translation function.
 * Returns the translation object for the given language.
 */
export function getTranslation(lang: string): TranslationKeys {
  return translations[lang] || translations['en'];
}

/**
 * Deep-access an object by a dot-separated key path.
 * e.g. getNestedValue(obj, 'nav.dashboard') → obj.nav.dashboard
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key path if not found
    }
  }
  return typeof current === 'string' ? current : path;
}

/**
 * Interpolate values into a template string.
 * e.g. interpolate('Hello, {name}!', { name: 'John' }) → 'Hello, John!'
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * React hook for translations.
 * Reads language from the Zustand UI store.
 */
export function useTranslation() {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const langTranslations = translations[language] || translations['en'];
      const rawValue = getNestedValue(langTranslations as unknown as Record<string, unknown>, key);
      return interpolate(rawValue, params);
    },
    [language]
  );

  const currentTranslations = useMemo(
    () => translations[language] || translations['en'],
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    translations: currentTranslations,
    supportedLanguages,
  };
}
