"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserTimeZonePreference,
  createTranslationResolver,
  defaultLocale,
  defaultTimeZone,
  defaultTimeZoneChoices,
  getLocaleDirection,
  mergeLocaleResources,
  normalizeTimeZonePreference,
  readStoredLocale,
  readStoredTimeZonePreference,
  resolveBrowserLocale,
  resolveBrowserTimeZone,
  resolveSupportedLocale,
  resolveTimeZoneFromPreference,
  setRuntimeI18nState,
  sharedLocaleResources,
  supportedLocales,
  writeStoredLocale,
  writeStoredTimeZonePreference,
  type LocaleResources,
  type StorageLike,
  type SupportedLocale,
  type TextDirection,
  type TranslationResolver,
} from "./i18n-runtime";

export interface LocaleOption {
  value: SupportedLocale;
  label: string;
}

export interface TimeZoneOption {
  value: string;
  label: string;
}

export interface I18nContextValue {
  locale: SupportedLocale;
  direction: TextDirection;
  timeZonePreference: string;
  resolvedTimeZone: string;
  supportedLocales: readonly SupportedLocale[];
  localeOptions: LocaleOption[];
  timeZoneOptions: TimeZoneOption[];
  t: TranslationResolver;
  setLocale: (next: string) => void;
  setTimeZonePreference: (next: string) => void;
}

export interface I18nProviderProps {
  children: ReactNode;
  resources?: LocaleResources;
  storage?: StorageLike | null;
  hydrateFromStorage?: boolean;
  initialLocale?: SupportedLocale;
  initialTimeZonePreference?: string;
}

function resolveStorage(storage: StorageLike | null | undefined): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

const defaultTranslator = createTranslationResolver({
  locale: defaultLocale,
  resources: mergeLocaleResources(sharedLocaleResources),
  diagnosticsEnabled: false,
});

const defaultContextValue: I18nContextValue = {
  locale: defaultLocale,
  direction: "ltr",
  timeZonePreference: browserTimeZonePreference,
  resolvedTimeZone: "UTC",
  supportedLocales,
  localeOptions: supportedLocales.map((locale) => ({ value: locale, label: defaultTranslator(`locale.name.${locale}`, locale) })),
  timeZoneOptions: [],
  t: defaultTranslator,
  setLocale: () => undefined,
  setTimeZonePreference: () => undefined,
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export function I18nProvider({
  children,
  resources,
  storage,
  hydrateFromStorage = true,
  initialLocale,
  initialTimeZonePreference,
}: I18nProviderProps) {
  const resolvedStorage = useMemo(() => resolveStorage(storage), [storage]);
  const [locale, setLocale] = useState<SupportedLocale>(() => resolveSupportedLocale(initialLocale ?? defaultLocale, defaultLocale));
  const [timeZonePreference, setTimeZonePreference] = useState<string>(() =>
    normalizeTimeZonePreference(initialTimeZonePreference ?? browserTimeZonePreference),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrateFromStorage) {
      setHydrated(true);
      return;
    }

    const storedLocale = readStoredLocale(resolvedStorage);
    const storedTimeZonePreference = readStoredTimeZonePreference(resolvedStorage);

    setLocale(storedLocale ?? resolveBrowserLocale(defaultLocale));
    setTimeZonePreference(storedTimeZonePreference ?? browserTimeZonePreference);
    setHydrated(true);
  }, [hydrateFromStorage, resolvedStorage]);

  const mergedResources = useMemo(
    () => mergeLocaleResources(sharedLocaleResources, resources),
    [resources],
  );

  const browserTimeZone = hydrated ? resolveBrowserTimeZone(defaultTimeZone) : defaultTimeZone;
  const resolvedTimeZone = resolveTimeZoneFromPreference(timeZonePreference, browserTimeZone);
  const direction = getLocaleDirection(locale);

  const t = useMemo(
    () =>
      createTranslationResolver({
        locale,
        resources: mergedResources,
      }),
    [locale, mergedResources],
  );

  const localeOptions = useMemo<LocaleOption[]>(
    () =>
      supportedLocales.map((value) => ({
        value,
        label: t(`locale.name.${value}`, value),
      })),
    [t],
  );

  const timeZoneOptions = useMemo<TimeZoneOption[]>(() => {
    const options = [
      browserTimeZonePreference,
      ...defaultTimeZoneChoices,
      ...(defaultTimeZoneChoices.includes(resolvedTimeZone as (typeof defaultTimeZoneChoices)[number])
        ? []
        : [resolvedTimeZone]),
    ];
    const uniqueOptions = [...new Set(options)];

    return uniqueOptions.map((option) => ({
      value: option,
      label:
        option === browserTimeZonePreference
          ? t("shell.browserTimeZoneOption", "Browser default ({timeZone})", { timeZone: browserTimeZone })
          : option,
    }));
  }, [browserTimeZone, resolvedTimeZone, t]);

  setRuntimeI18nState({
    locale,
    timeZonePreference,
    timeZone: resolvedTimeZone,
    resources: mergedResources,
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!resolvedStorage) {
      return;
    }

    writeStoredLocale(resolvedStorage, locale);
    writeStoredTimeZonePreference(resolvedStorage, normalizeTimeZonePreference(timeZonePreference));
  }, [hydrated, locale, resolvedStorage, timeZonePreference]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    if (document.body) {
      document.body.dir = direction;
    }
  }, [direction, locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction,
      timeZonePreference,
      resolvedTimeZone,
      supportedLocales,
      localeOptions,
      timeZoneOptions,
      t,
      setLocale: (next: string) => {
        setLocale(resolveSupportedLocale(next, defaultLocale));
      },
      setTimeZonePreference: (next: string) => {
        setTimeZonePreference(normalizeTimeZonePreference(next));
      },
    }),
    [direction, locale, localeOptions, resolvedTimeZone, t, timeZoneOptions, timeZonePreference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
