"use client";

import { useI18n } from "./I18nProvider";

export function LocalePreferences() {
  const {
    locale,
    localeOptions,
    setLocale,
    timeZonePreference,
    setTimeZonePreference,
    timeZoneOptions,
    resolvedTimeZone,
    t,
  } = useI18n();

  const selectedLanguage = t(`locale.name.${locale}`, locale);

  return (
    <details className="ryvra-menu">
      <summary className="ryvra-summary-trigger" aria-label={t("shell.localeAndTimezoneSettings", "Locale and timezone settings")}>
        {t("shell.localeSettings", "Locale")}
      </summary>
      <div className="ryvra-menu-panel ryvra-locale-panel" role="group" aria-label={t("shell.localeAndTimezoneSettings", "Locale and timezone settings")}>
        <div className="ryvra-locale-controls">
          <label className="ryvra-locale-field">
            <span className="ryvra-locale-field-label">{t("shell.localeFieldLabel", "Language")}</span>
            <select
              className="ryvra-notification-select"
              value={locale}
              aria-label={t("shell.localeSelectorAria", "Language selector")}
              onChange={(event) => {
                setLocale(event.currentTarget.value);
              }}
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ryvra-locale-field">
            <span className="ryvra-locale-field-label">{t("shell.timeZoneFieldLabel", "Time zone")}</span>
            <select
              className="ryvra-notification-select"
              value={timeZonePreference}
              aria-label={t("shell.timeZoneSelectorAria", "Time zone selector")}
              onChange={(event) => {
                setTimeZonePreference(event.currentTarget.value);
              }}
            >
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="ryvra-locale-helper">{t("shell.currentTimeZone", "Current time zone: {timeZone}", { timeZone: resolvedTimeZone })}</p>
          <p className="ryvra-visually-hidden" aria-live="polite">
            {t("shell.currentLocaleAndTimeZone", "Language set to {language}. Time zone set to {timeZone}.", {
              language: selectedLanguage,
              timeZone: resolvedTimeZone,
            })}
          </p>
        </div>
      </div>
    </details>
  );
}
