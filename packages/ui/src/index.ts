export { Button } from "./Button";
export type { ButtonProps, ButtonVariant } from "./Button";

export { Card } from "./Card";
export type { CardProps } from "./Card";

export { Section } from "./Section";
export type { SectionProps } from "./Section";

export { DataTable } from "./DataTable";
export type { DataTableColumn, DataTableProps } from "./DataTable";

export { StatusBadge } from "./StatusBadge";
export type { StatusBadgeProps } from "./StatusBadge";

export { UnifiedBalanceCard } from "./UnifiedBalanceCard";
export type { UnifiedBalanceCardProps, UnifiedBalanceCardRow, UnifiedBalanceCardState } from "./UnifiedBalanceCard";

export { AppShell } from "./AppShell";
export type { AppShellProps } from "./AppShell";

export { GlobalHeader } from "./GlobalHeader";
export type { GlobalHeaderProps } from "./GlobalHeader";

export { NotificationCenter } from "./NotificationCenter";
export type { NotificationCenterProps } from "./NotificationCenter";

export { NotificationCenterProvider, useNotificationCenter } from "./NotificationCenterProvider";
export type {
  NotificationCenterContextValue,
  NotificationCenterProviderProps,
  NotificationCenterStatus,
} from "./NotificationCenterProvider";

export {
  notificationCategories,
  notificationSeverities,
  notificationSortOrders,
  createDefaultCategoryToggles,
  createDefaultNotificationPreferences,
  createInitialNotificationPanelUiState,
  createNotificationId,
  countUnreadNotifications,
  filterNotifications,
  formatNotificationReferenceSnippet,
  isWebhookEndpointUrlValid,
  markAllNotificationsRead,
  markNotificationRead,
  mergeNotificationPreferences,
  resolveNotificationListState,
  sortNotifications,
  toggleNotificationPanelOpen,
  upsertNotification,
} from "./notification-center-model";
export type {
  NotificationCategory,
  NotificationCategoryToggles,
  NotificationDraft,
  NotificationFilter,
  NotificationItem,
  NotificationListState,
  NotificationPanelUiState,
  NotificationPreferences,
  NotificationSeverity,
  NotificationSortOrder,
} from "./notification-center-model";

export {
  NOTIFICATION_FEED_STORAGE_PREFIX,
  NOTIFICATION_PREFERENCES_STORAGE_PREFIX,
  buildNotificationFeedStorageKey,
  buildNotificationPreferencesStorageKey,
  loadNotificationStorageSnapshot,
  persistNotificationStorageSnapshot,
} from "./notification-center-storage";
export type { NotificationPersistenceMode, NotificationStorageLoadResult } from "./notification-center-storage";

export { GlobalSidebar } from "./GlobalSidebar";
export type { GlobalSidebarProps } from "./GlobalSidebar";

export { ProductSwitcher } from "./ProductSwitcher";
export type { ProductSwitcherProps } from "./ProductSwitcher";

export { UserMenu } from "./UserMenu";
export type { UserMenuProps } from "./UserMenu";

export { Breadcrumbs } from "./Breadcrumbs";
export type { BreadcrumbsProps } from "./Breadcrumbs";

export { CommandPaletteTrigger } from "./CommandPaletteTrigger";
export type { CommandPaletteTriggerProps } from "./CommandPaletteTrigger";

export { ContextualNav } from "./ContextualNav";
export type { ContextualNavProps } from "./ContextualNav";

export { ShellNavList } from "./ShellNavList";
export type { ShellNavListProps } from "./ShellNavList";

export { BottomIconDock } from "./BottomIconDock";
export type { BottomIconDockProps } from "./BottomIconDock";

export { NavItemIcon } from "./NavItemIcon";
export type { NavItemIconProps } from "./NavItemIcon";
export {
  SIDEBAR_COLLAPSE_STORAGE_KEY,
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
  toggleSidebarCollapsed,
} from "./sidebar-preferences";

export {
  NAV_ICON_SIZE,
  NAV_ICON_STROKE_WIDTH,
  NAV_ICON_VIEW_BOX,
  navIconNames,
  resolveNavIconName,
  type NavIconName,
} from "./nav-icons";

export type { ShellNavItem, ProductSwitcherItem, BreadcrumbItem, UserMenuItem } from "./navigation";

export { themeTokens } from "./theme";
export type { ThemeTokens } from "./theme";
export {
  formatInsightCurrency,
  formatInsightNumber,
  formatInsightPercent,
  formatInsightTimestamp,
  InsightModuleCard,
  InsightTrendBars,
  InsightWindowSelector,
} from "./PortfolioInsights";
export type {
  InsightModuleCardProps,
  InsightModuleState,
  InsightTrendBarsProps,
  InsightTrendPoint,
  InsightWindow,
  InsightWindowOption,
  InsightWindowSelectorProps,
} from "./PortfolioInsights";

export {
  TRUST_REDACTED_VALUE,
  TRUST_UNAVAILABLE_VALUE,
  buildNextStepMessage,
  buildRetrySafetyMessage,
  formatTrustTimestamp,
  sanitizeTrustReferenceValue,
  ComplianceEvidencePanel,
  ConfirmationReceiptCard,
  ErrorTransparencySummary,
  OperationTimelineCard,
  PolicyLinksCard,
  TrustDisclosureCard,
} from "./TrustCompliance";
export type {
  ComplianceEvidencePanelProps,
  ConfirmationReceiptCardProps,
  ErrorTransparencySummaryProps,
  OperationTimelineCardProps,
  OperationTimelineStage,
  OperationTimelineState,
  PolicyLinkItem,
  PolicyLinksCardProps,
  TrustDisclosureCardProps,
  TrustReference,
} from "./TrustCompliance";
