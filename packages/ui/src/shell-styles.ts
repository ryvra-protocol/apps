import { themeTokens } from "./theme";

const motion = `background-color ${themeTokens.motion.standard} ease, color ${themeTokens.motion.standard} ease, box-shadow ${themeTokens.motion.standard} ease, transform ${themeTokens.motion.fast} ease, border-color ${themeTokens.motion.standard} ease`;

export const shellStyles = `
.ryvra-shell-root {
  min-height: 100vh;
  --ryvra-bottom-dock-offset: calc(5rem + env(safe-area-inset-bottom));
  background: ${themeTokens.color.background};
  color: ${themeTokens.color.text};
  font-family: ${themeTokens.typography.fontFamily};
}

.ryvra-visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.ryvra-skip-link {
  position: absolute;
  left: ${themeTokens.spacing.lg};
  top: -120px;
  z-index: 999;
  border-radius: ${themeTokens.radius.sm};
  background: ${themeTokens.color.primary};
  color: ${themeTokens.color.textInverse};
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
  text-decoration: none;
  font-weight: ${themeTokens.typography.weight.semibold};
}

.ryvra-skip-link:focus-visible {
  top: ${themeTokens.spacing.lg};
  outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
  outline-offset: ${themeTokens.focusRing.offset};
}

.ryvra-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: ${themeTokens.color.surface};
  border-bottom: 1px solid ${themeTokens.color.border};
  box-shadow: ${themeTokens.shadow.sm};
}

.ryvra-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themeTokens.spacing.lg};
  padding: ${themeTokens.spacing.md} ${themeTokens.spacing.xl};
}

.ryvra-header-title {
  margin: 0;
  font-size: ${themeTokens.typography.size.lg};
  font-weight: ${themeTokens.typography.weight.semibold};
  line-height: ${themeTokens.typography.lineHeight.tight};
}

.ryvra-header-identity {
  display: grid;
  gap: ${themeTokens.spacing.sm};
  min-width: 0;
}

.ryvra-header-scope {
  min-width: min(100%, 52rem);
}

.ryvra-header-actions {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.sm};
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ryvra-notification-center {
  position: relative;
}

.ryvra-notification-trigger {
  display: inline-flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
  border-color: ${themeTokens.color.border};
  background: ${themeTokens.color.surface};
}

.ryvra-notification-trigger-label {
  font-weight: ${themeTokens.typography.weight.medium};
}

.ryvra-notification-badge {
  min-width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${themeTokens.radius.pill};
  background: ${themeTokens.color.primary};
  color: ${themeTokens.color.textInverse};
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.semibold};
  padding: 0 ${themeTokens.spacing.xs};
}

.ryvra-notification-panel {
  position: absolute;
  right: 0;
  margin-top: ${themeTokens.spacing.sm};
  width: min(560px, calc(100vw - ${themeTokens.spacing["2xl"]}));
  max-height: min(80vh, 760px);
  overflow: auto;
  border-radius: ${themeTokens.radius.lg};
  border: 1px solid ${themeTokens.color.borderStrong};
  background: ${themeTokens.color.surface};
  box-shadow: ${themeTokens.shadow.lg};
  z-index: 70;
  padding: ${themeTokens.spacing.lg};
  display: grid;
  gap: ${themeTokens.spacing.md};
}

.ryvra-notification-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themeTokens.spacing.md};
}

.ryvra-notification-mode-note {
  margin: 0;
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-toolbar {
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-tablist {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
  flex-wrap: wrap;
}

.ryvra-notification-tab {
  border: 1px solid ${themeTokens.color.borderStrong};
  border-radius: ${themeTokens.radius.pill};
  background: ${themeTokens.color.surface};
  color: ${themeTokens.color.text};
  font-size: ${themeTokens.typography.size.sm};
  font-weight: ${themeTokens.typography.weight.medium};
  padding: ${themeTokens.spacing.xs} ${themeTokens.spacing.sm};
  cursor: pointer;
  transition: ${motion};
}

.ryvra-notification-tab[aria-selected="true"] {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.primary};
  color: ${themeTokens.color.primaryActive};
}

.ryvra-notification-tab:focus-visible,
.ryvra-notification-inline-button:focus-visible,
.ryvra-notification-select:focus-visible,
.ryvra-notification-input:focus-visible {
  outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
  outline-offset: ${themeTokens.focusRing.offset};
}

.ryvra-notification-sort-label {
  display: inline-flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-select,
.ryvra-notification-input {
  border: 1px solid ${themeTokens.color.borderStrong};
  border-radius: ${themeTokens.radius.md};
  background: ${themeTokens.color.surface};
  color: ${themeTokens.color.text};
  min-height: 2rem;
  padding: 0 ${themeTokens.spacing.sm};
}

.ryvra-notification-list-shell {
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-item {
  border: 1px solid ${themeTokens.color.border};
  border-radius: ${themeTokens.radius.md};
  background: ${themeTokens.color.surfaceMuted};
  padding: ${themeTokens.spacing.md};
  display: grid;
  gap: ${themeTokens.spacing.xs};
}

.ryvra-notification-item--unread {
  border-color: ${themeTokens.color.primary};
  background: ${themeTokens.color.surfaceStrong};
}

.ryvra-notification-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-unread-pill {
  border-radius: ${themeTokens.radius.pill};
  background: ${themeTokens.color.primary};
  color: ${themeTokens.color.textInverse};
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.semibold};
  padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
}

.ryvra-notification-severity {
  border-radius: ${themeTokens.radius.pill};
  border: 1px solid transparent;
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.semibold};
  padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
}

.ryvra-notification-severity--info {
  border-color: ${themeTokens.color.borderStrong};
  background: ${themeTokens.color.surface};
  color: ${themeTokens.color.text};
}

.ryvra-notification-severity--success {
  border-color: ${themeTokens.color.success};
  background: ${themeTokens.color.successSurface};
  color: ${themeTokens.color.success};
}

.ryvra-notification-severity--warn {
  border-color: ${themeTokens.color.warning};
  background: ${themeTokens.color.warningSurface};
  color: ${themeTokens.color.warning};
}

.ryvra-notification-severity--error {
  border-color: ${themeTokens.color.danger};
  background: ${themeTokens.color.dangerSurface};
  color: ${themeTokens.color.danger};
}

.ryvra-notification-message {
  margin: 0;
  color: ${themeTokens.color.text};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-meta {
  margin: 0;
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.xs};
}

.ryvra-notification-actions {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.md};
  flex-wrap: wrap;
}

.ryvra-notification-inline-button,
.ryvra-notification-link {
  border: 1px solid ${themeTokens.color.borderStrong};
  border-radius: ${themeTokens.radius.md};
  background: ${themeTokens.color.surface};
  color: ${themeTokens.color.text};
  font-size: ${themeTokens.typography.size.sm};
  font-weight: ${themeTokens.typography.weight.medium};
  padding: ${themeTokens.spacing.xs} ${themeTokens.spacing.sm};
  text-decoration: none;
  cursor: pointer;
  transition: ${motion};
}

.ryvra-notification-inline-button:hover,
.ryvra-notification-link:hover {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.primary};
}

.ryvra-notification-inline-button:disabled {
  cursor: not-allowed;
  color: ${themeTokens.color.disabledText};
  background: ${themeTokens.color.disabledBackground};
  border-color: transparent;
}

.ryvra-notification-muted {
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-state {
  margin: 0;
  color: ${themeTokens.color.textMuted};
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-preferences {
  border-top: 1px solid ${themeTokens.color.border};
  padding-top: ${themeTokens.spacing.md};
  display: grid;
  gap: ${themeTokens.spacing.md};
}

.ryvra-notification-fieldset {
  border: 1px solid ${themeTokens.color.border};
  border-radius: ${themeTokens.radius.md};
  padding: ${themeTokens.spacing.md};
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-notification-fieldset > legend {
  padding: 0 ${themeTokens.spacing.xs};
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
  font-weight: ${themeTokens.typography.weight.semibold};
}

.ryvra-notification-checkbox-row {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.sm};
  color: ${themeTokens.color.text};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-grid {
  display: grid;
  gap: ${themeTokens.spacing.xs};
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}

.ryvra-notification-input-row {
  display: grid;
  gap: ${themeTokens.spacing.xs};
  color: ${themeTokens.color.text};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-notification-input-error {
  margin: 0;
  color: ${themeTokens.color.danger};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-shell-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: ${themeTokens.spacing.xl};
  padding: ${themeTokens.spacing.xl};
  padding-bottom: calc(${themeTokens.spacing.xl} + var(--ryvra-bottom-dock-offset));
}

.ryvra-sidebar {
  width: 16rem;
  background: ${themeTokens.color.surface};
  border: 1px solid ${themeTokens.color.border};
  border-radius: ${themeTokens.radius.lg};
  box-shadow: ${themeTokens.shadow.sm};
  padding: ${themeTokens.spacing.lg};
  display: grid;
  gap: ${themeTokens.spacing.xl};
  height: fit-content;
  transition: width ${themeTokens.motion.standard} ease, padding ${themeTokens.motion.standard} ease;
}

.ryvra-sidebar--collapsed {
  width: 5rem;
  padding: ${themeTokens.spacing.md};
  gap: ${themeTokens.spacing.lg};
}

.ryvra-sidebar-toggle {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: ${themeTokens.radius.md};
  border: 1px solid ${themeTokens.color.border};
  background: ${themeTokens.color.surfaceMuted};
  color: ${themeTokens.color.text};
  cursor: pointer;
  transition: ${motion};
}

.ryvra-sidebar--collapsed .ryvra-sidebar-toggle {
  justify-self: center;
}

.ryvra-sidebar-toggle:hover {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.borderStrong};
}

.ryvra-sidebar-toggle:active {
  transform: translateY(1px);
}

.ryvra-sidebar-toggle:focus-visible {
  outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
  outline-offset: ${themeTokens.focusRing.offset};
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.ryvra-sidebar-toggle-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ryvra-sidebar-toggle-icon {
  display: block;
}

.ryvra-sidebar-sections {
  display: grid;
  gap: ${themeTokens.spacing.xl};
}

.ryvra-nav-group {
  display: grid;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-nav-title {
  margin: 0;
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ryvra-nav-list,
.ryvra-breadcrumb-list,
.ryvra-product-list,
.ryvra-menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ryvra-nav-list,
.ryvra-product-list,
.ryvra-menu-list {
  display: grid;
  gap: ${themeTokens.spacing.xs};
}

.ryvra-nav-link,
.ryvra-product-link,
.ryvra-menu-link,
.ryvra-command-trigger,
.ryvra-summary-trigger {
  border: 1px solid transparent;
  border-radius: ${themeTokens.radius.md};
  color: ${themeTokens.color.text};
  background: transparent;
  text-decoration: none;
  transition: ${motion};
}

.ryvra-nav-link,
.ryvra-product-link,
.ryvra-menu-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themeTokens.spacing.sm};
  min-height: 2.5rem;
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-nav-link-content {
  display: inline-flex;
  align-items: center;
  gap: ${themeTokens.spacing.sm};
  min-width: 0;
}

.ryvra-nav-link-label {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ryvra-nav-icon {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  transition: transform ${themeTokens.motion.fast} ease;
}

.ryvra-nav-link--icon-only {
  justify-content: center;
  padding: ${themeTokens.spacing.sm};
  position: relative;
  --ryvra-tooltip-hidden-transform: translateY(-50%) translateX(-4px);
  --ryvra-tooltip-visible-transform: translateY(-50%) translateX(0);
}

.ryvra-nav-link--tooltip-top {
  --ryvra-tooltip-hidden-transform: translateX(-50%) translateY(4px);
  --ryvra-tooltip-visible-transform: translateX(-50%) translateY(0);
}

.ryvra-nav-link--icon-only .ryvra-nav-link-content {
  justify-content: center;
}

.ryvra-nav-link--icon-only::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + ${themeTokens.spacing.sm});
  top: 50%;
  transform: var(--ryvra-tooltip-hidden-transform);
  opacity: 0;
  pointer-events: none;
  z-index: 55;
  border-radius: ${themeTokens.radius.sm};
  background: ${themeTokens.color.text};
  color: ${themeTokens.color.textInverse};
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.medium};
  line-height: 1.25;
  padding: ${themeTokens.spacing.xs} ${themeTokens.spacing.sm};
  white-space: nowrap;
  transition: opacity ${themeTokens.motion.standard} ease, transform ${themeTokens.motion.standard} ease;
}

.ryvra-nav-link--tooltip-top::after {
  left: 50%;
  top: auto;
  bottom: calc(100% + ${themeTokens.spacing.sm});
}

.ryvra-nav-link--icon-only:hover::after,
.ryvra-nav-link--icon-only:focus-visible::after {
  opacity: 1;
  transform: var(--ryvra-tooltip-visible-transform);
}

.ryvra-nav-link:hover,
.ryvra-product-link:hover,
.ryvra-menu-link:hover,
.ryvra-command-trigger:hover,
.ryvra-summary-trigger:hover {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.borderStrong};
}

.ryvra-nav-link:active,
.ryvra-product-link:active,
.ryvra-menu-link:active,
.ryvra-command-trigger:active,
.ryvra-summary-trigger:active {
  transform: translateY(1px);
  background: ${themeTokens.color.border};
}

.ryvra-nav-link:focus-visible,
.ryvra-product-link:focus-visible,
.ryvra-menu-link:focus-visible,
.ryvra-command-trigger:focus-visible,
.ryvra-summary-trigger:focus-visible {
  outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
  outline-offset: ${themeTokens.focusRing.offset};
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.ryvra-nav-link[aria-current="page"],
.ryvra-product-link[aria-current="page"] {
  background: ${themeTokens.color.surfaceStrong};
  color: ${themeTokens.color.primaryActive};
  border-color: ${themeTokens.color.borderStrong};
  font-weight: ${themeTokens.typography.weight.semibold};
}

.ryvra-nav-link[aria-current="page"] .ryvra-nav-icon {
  transform: scale(1.08);
}

.ryvra-nav-link[aria-disabled="true"],
.ryvra-product-link[aria-disabled="true"],
.ryvra-menu-link[aria-disabled="true"] {
  pointer-events: none;
  background: ${themeTokens.color.disabledBackground};
  color: ${themeTokens.color.disabledText};
  border-color: transparent;
}

.ryvra-nav-badge {
  border-radius: ${themeTokens.radius.pill};
  background: ${themeTokens.color.surfaceStrong};
  padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.xs};
  font-weight: ${themeTokens.typography.weight.medium};
}

.ryvra-shell-main {
  min-width: 0;
  background: ${themeTokens.color.surface};
  border: 1px solid ${themeTokens.color.border};
  border-radius: ${themeTokens.radius.lg};
  box-shadow: ${themeTokens.shadow.sm};
  padding: ${themeTokens.spacing.xl};
}

.ryvra-shell-main:focus-visible {
  outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
  outline-offset: ${themeTokens.focusRing.offset};
}

.ryvra-content-frame {
  display: grid;
  gap: ${themeTokens.spacing.xl};
}

.ryvra-breadcrumbs {
  border-top: 1px solid ${themeTokens.color.border};
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.xl} ${themeTokens.spacing.md};
}

.ryvra-breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
}

.ryvra-breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-breadcrumb-item:not(:last-child)::after {
  content: "/";
  color: ${themeTokens.color.borderStrong};
}

.ryvra-breadcrumb-link {
  color: inherit;
  text-decoration: none;
}

.ryvra-breadcrumb-link:hover {
  color: ${themeTokens.color.primary};
  text-decoration: underline;
}

.ryvra-breadcrumb-current {
  color: ${themeTokens.color.text};
  font-weight: ${themeTokens.typography.weight.medium};
}

.ryvra-command-trigger {
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeTokens.typography.size.sm};
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
  background: ${themeTokens.color.surface};
  border-color: ${themeTokens.color.border};
}

.ryvra-menu {
  position: relative;
}

.ryvra-summary-trigger {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-summary-trigger::-webkit-details-marker {
  display: none;
}

.ryvra-menu[open] .ryvra-summary-trigger {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.border};
}

.ryvra-menu-panel {
  position: absolute;
  right: 0;
  margin-top: ${themeTokens.spacing.xs};
  min-width: 200px;
  border-radius: ${themeTokens.radius.md};
  border: 1px solid ${themeTokens.color.border};
  background: ${themeTokens.color.surface};
  box-shadow: ${themeTokens.shadow.md};
  padding: ${themeTokens.spacing.sm};
}

.ryvra-bottom-dock {
  position: fixed;
  left: 50%;
  bottom: calc(${themeTokens.spacing.lg} + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - ${themeTokens.spacing["2xl"]});
  z-index: 45;
  border-radius: ${themeTokens.radius.pill};
  border: 1px solid ${themeTokens.color.borderStrong};
  background: ${themeTokens.color.surface};
  box-shadow: ${themeTokens.shadow.lg};
  padding: ${themeTokens.spacing.xs};
}

.ryvra-bottom-dock-list {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.xs};
}

.ryvra-bottom-dock-link {
  border-radius: ${themeTokens.radius.pill};
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.ryvra-shell-footer {
  padding: 0 ${themeTokens.spacing.xl} calc(${themeTokens.spacing.xl} + var(--ryvra-bottom-dock-offset));
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

@media (max-width: 1024px) {
  .ryvra-shell-layout {
    gap: ${themeTokens.spacing.lg};
  }

  .ryvra-sidebar {
    width: 14.5rem;
  }

  .ryvra-sidebar--collapsed {
    width: 4.75rem;
  }
}

@media (max-width: 860px) {
  .ryvra-header-row {
    padding-left: ${themeTokens.spacing.lg};
    padding-right: ${themeTokens.spacing.lg};
    flex-direction: column;
    align-items: stretch;
  }

  .ryvra-header-actions {
    justify-content: flex-start;
  }

  .ryvra-shell-layout {
    grid-template-columns: minmax(0, 1fr);
    padding: ${themeTokens.spacing.lg};
    padding-bottom: calc(${themeTokens.spacing.lg} + var(--ryvra-bottom-dock-offset));
  }

  .ryvra-sidebar,
  .ryvra-sidebar--collapsed {
    width: 100%;
  }

  .ryvra-shell-main {
    padding: ${themeTokens.spacing.lg};
  }

  .ryvra-breadcrumbs {
    padding-left: ${themeTokens.spacing.lg};
    padding-right: ${themeTokens.spacing.lg};
  }

  .ryvra-bottom-dock {
    max-width: calc(100vw - ${themeTokens.spacing.lg});
  }

  .ryvra-notification-panel {
    right: auto;
    left: 0;
    width: min(560px, calc(100vw - ${themeTokens.spacing.lg}));
  }
}

@media (max-height: 720px) {
  .ryvra-shell-root {
    --ryvra-bottom-dock-offset: calc(4.5rem + env(safe-area-inset-bottom));
  }

  .ryvra-bottom-dock {
    bottom: calc(${themeTokens.spacing.sm} + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .ryvra-shell-root * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
`;
