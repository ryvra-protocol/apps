# Phase 18: Internationalization and localization

## Supported locales and fallback

- Supported locales: `en` (default), `fr`, `ar`
- Fallback locale: `en`
- Runtime locale resolution order:
  1. Stored locale preference (`ryvra.locale`)
  2. Browser locale (language-only match)
  3. `en`
- Missing translation behavior:
  - Fall back to `en`
  - In non-production mode, emit one warning per missing key path

## Translation key organization

- Shared dictionary lives in `packages/ui/src/i18n-runtime.ts`
- Namespaces:
  - `common.*`
  - `locale.*`
  - `nav.*`
  - `shell.*`
  - `notification.*`
  - `table.*`
  - `unified.*`
  - `status.*`
  - `mode.*`
  - `claim.*`
- App shells attach key metadata (`labelKey`, `ariaLabelKey`, `badgeKey`) to navigation/breadcrumb/user-menu items so translation resolves at render time.

## Locale + timezone runtime strategy

- Shared provider: `packages/ui/src/I18nProvider.tsx`
- Locale switcher/timezone switcher surface: `packages/ui/src/LocalePreferences.tsx` in global header actions
- Timezone preference key: `ryvra.timezone`
- Timezone resolution:
  - explicit timezone preference when valid
  - otherwise browser timezone
  - final fallback `UTC`
- Formatting utilities (`formatLocalizedNumber`, `formatLocalizedCurrency`, `formatLocalizedDateTime`, `formatLocalizedRelativeTime`) are centralized in `packages/ui/src/i18n-runtime.ts`.

## Currency formatting policy

- Presentation only (no calculation changes)
- Deterministic defaults:
  - Number formatting defaults to `0..2` fraction digits unless overridden
  - Currency defaults to 2 fraction digits
- Currency display mode is selected per surface:
  - pay amount surfaces use symbols
  - insight modules can use currency code display for compact KPI consistency

## RTL readiness scope

Implemented:

- `dir="rtl"` toggled from locale at shell root and document root
- RTL-specific shell CSS rules for:
  - skip-link position
  - icon-only nav tooltip placement
  - notification panel anchoring
  - menu panel anchoring
  - sidebar collapse/expand glyph direction
- Locale/timezone controls remain keyboard accessible and screen-reader labeled in RTL

Known limitations:

- Some deeply nested page-level copy remains English-first in this phase unless the surface is routed through shared translated shell primitives.
- Product-specific long-form explanatory copy in app feature modules is only partially localized and should be migrated to keyed dictionaries incrementally.

## Migration guidance for new locales

1. Add locale code to `supportedLocales` in `packages/ui/src/i18n-runtime.ts`.
2. Add dictionary entries for the full shared namespace set (`shell.*`, `notification.*`, etc.).
3. Validate fallback warnings in non-production mode and close missing-key gaps.
4. Verify RTL/LTR direction behavior for the locale.
5. Run full release checks (`lint`, `typecheck`, `build`, `test`) and app-specific build targets.
