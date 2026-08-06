import { themeTokens } from "./theme";

const motion = `background-color ${themeTokens.motion.standard} ease, color ${themeTokens.motion.standard} ease, box-shadow ${themeTokens.motion.standard} ease, transform ${themeTokens.motion.fast} ease`;

export const shellStyles = `
.ryvra-shell-root {
  min-height: 100vh;
  background: ${themeTokens.color.background};
  color: ${themeTokens.color.text};
  font-family: ${themeTokens.typography.fontFamily};
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

.ryvra-header-actions {
  display: flex;
  align-items: center;
  gap: ${themeTokens.spacing.sm};
}

.ryvra-shell-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: ${themeTokens.spacing.xl};
  padding: ${themeTokens.spacing.xl};
}

.ryvra-sidebar {
  background: ${themeTokens.color.surface};
  border: 1px solid ${themeTokens.color.border};
  border-radius: ${themeTokens.radius.lg};
  box-shadow: ${themeTokens.shadow.sm};
  padding: ${themeTokens.spacing.lg};
  display: grid;
  gap: ${themeTokens.spacing.xl};
  height: fit-content;
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
  padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
  font-size: ${themeTokens.typography.size.sm};
}

.ryvra-nav-link:hover,
.ryvra-product-link:hover,
.ryvra-menu-link:hover,
.ryvra-command-trigger:hover,
.ryvra-summary-trigger:hover {
  background: ${themeTokens.color.surfaceStrong};
  border-color: ${themeTokens.color.border};
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
}

.ryvra-nav-link[aria-current="page"],
.ryvra-product-link[aria-current="page"] {
  background: ${themeTokens.color.surfaceStrong};
  color: ${themeTokens.color.primaryActive};
  border-color: ${themeTokens.color.borderStrong};
  font-weight: ${themeTokens.typography.weight.semibold};
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

.ryvra-shell-footer {
  padding: 0 ${themeTokens.spacing.xl} ${themeTokens.spacing.xl};
  color: ${themeTokens.color.textMuted};
  font-size: ${themeTokens.typography.size.sm};
}

@media (max-width: 1024px) {
  .ryvra-shell-layout {
    grid-template-columns: minmax(200px, 230px) minmax(0, 1fr);
    gap: ${themeTokens.spacing.lg};
  }
}

@media (max-width: 860px) {
  .ryvra-header-row {
    padding-left: ${themeTokens.spacing.lg};
    padding-right: ${themeTokens.spacing.lg};
    flex-direction: column;
    align-items: stretch;
  }

  .ryvra-shell-layout {
    grid-template-columns: minmax(0, 1fr);
    padding: ${themeTokens.spacing.lg};
  }

  .ryvra-shell-main {
    padding: ${themeTokens.spacing.lg};
  }

  .ryvra-breadcrumbs {
    padding-left: ${themeTokens.spacing.lg};
    padding-right: ${themeTokens.spacing.lg};
  }
}

@media (prefers-reduced-motion: reduce) {
  .ryvra-shell-root * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
`;
