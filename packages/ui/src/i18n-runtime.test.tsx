import assert from "node:assert/strict";
import test from "node:test";
import {
  clearMissingKeyDiagnostics,
  createTranslationResolver,
  formatLocalizedCurrency,
  formatLocalizedDateTime,
  formatLocalizedNumber,
  isValidTimeZone,
  readStoredLocale,
  readStoredTimeZonePreference,
  resolveTimeZoneFromPreference,
  setRuntimeI18nState,
  sharedLocaleResources,
  shouldEmitMissingKeyDiagnostics,
  writeStoredLocale,
  writeStoredTimeZonePreference,
  type StorageLike,
} from "./i18n-runtime";

test("translation resolver falls back to default locale and emits diagnostics in non-production", () => {
  clearMissingKeyDiagnostics();
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };

  try {
    const t = createTranslationResolver({
      locale: "fr",
      resources: {
        en: {
          "custom.greeting": "Hello",
        },
      },
      diagnosticsEnabled: shouldEmitMissingKeyDiagnostics("test"),
    });

    assert.equal(t("custom.greeting"), "Hello");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] ?? "", /falling back/i);
  } finally {
    console.warn = originalWarn;
  }
});

test("missing-key diagnostics are suppressed in production mode", () => {
  clearMissingKeyDiagnostics();
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };

  try {
    const t = createTranslationResolver({
      locale: "fr",
      resources: {
        en: {
          "custom.onlyDefault": "Default text",
        },
      },
      diagnosticsEnabled: shouldEmitMissingKeyDiagnostics("production"),
    });

    assert.equal(t("custom.onlyDefault"), "Default text");
    assert.equal(warnings.length, 0);
  } finally {
    console.warn = originalWarn;
  }
});

test("locale and timezone preferences round-trip through storage helpers", () => {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  writeStoredLocale(storage, "ar");
  writeStoredTimeZonePreference(storage, "Europe/Paris");

  assert.equal(readStoredLocale(storage), "ar");
  assert.equal(readStoredTimeZonePreference(storage), "Europe/Paris");
});

test("number, currency, date-time, and timezone normalization are locale aware", () => {
  setRuntimeI18nState({
    locale: "en",
    timeZonePreference: "UTC",
    timeZone: "UTC",
    resources: sharedLocaleResources,
  });

  const englishNumber = formatLocalizedNumber(12345.67, { locale: "en", maximumFractionDigits: 2 });
  const frenchNumber = formatLocalizedNumber(12345.67, { locale: "fr", maximumFractionDigits: 2 });
  assert.notEqual(englishNumber, frenchNumber);

  const englishCurrency = formatLocalizedCurrency(1234.5, "USD", { locale: "en" });
  const frenchCurrency = formatLocalizedCurrency(1234.5, "USD", { locale: "fr" });
  assert.notEqual(englishCurrency, frenchCurrency);

  const utcDate = formatLocalizedDateTime("2026-08-10T12:00:00.000Z", {
    locale: "en",
    timeZone: "UTC",
  });
  const parisDate = formatLocalizedDateTime("2026-08-10T12:00:00.000Z", {
    locale: "en",
    timeZone: "Europe/Paris",
  });
  assert.notEqual(utcDate, parisDate);

  assert.equal(resolveTimeZoneFromPreference("Invalid/Zone", "Europe/Paris"), "Europe/Paris");
  assert.equal(resolveTimeZoneFromPreference("UTC", "Europe/Paris"), "UTC");
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("Invalid/Zone"), false);
});
