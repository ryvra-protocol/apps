export const supportedLocales = ["en", "fr", "ar"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type TextDirection = "ltr" | "rtl";
export type TranslationDictionary = Record<string, string>;
export type LocaleResources = Partial<Record<SupportedLocale, TranslationDictionary>>;

export interface TranslationParams {
  [key: string]: string | number;
}

export const defaultLocale: SupportedLocale = "en";
export const fallbackLocale: SupportedLocale = "en";
export const localeStorageKey = "ryvra.locale";
export const timeZonePreferenceStorageKey = "ryvra.timezone";
export const browserTimeZonePreference = "browser";
export const defaultTimeZone = "UTC";

export const defaultTimeZoneChoices = [
  "UTC",
  "America/New_York",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Africa/Cairo",
] as const;

const rtlLocales = new Set<SupportedLocale>(["ar"]);
const missingKeyDiagnostics = new Set<string>();

export const sharedLocaleResources: LocaleResources = {
  en: {
    "common.notAvailable": "n/a",
    "common.page": "Page",
    "locale.name.en": "English",
    "locale.name.fr": "French",
    "locale.name.ar": "Arabic",
    "nav.overview": "Overview",
    "nav.dashboard": "Dashboard",
    "nav.pay": "Pay",
    "nav.markets": "Markets",
    "nav.points": "Points",
    "nav.tasks": "Tasks",
    "nav.instruments": "Instruments",
    "nav.orders": "Orders",
    "nav.positions": "Positions",
    "nav.classifiedSpot": "Classified Spot",
    "nav.perpsTrading": "Perps Trading",
    "nav.staking": "Staking",
    "nav.invoices": "Invoices",
    "nav.payouts": "Payouts",
    "nav.reconciliation": "Reconciliation",
    "nav.status": "Status",
    "nav.restricted": "Restricted",
    "status.available": "available",
    "status.unavailable": "unavailable",
    "status.pending": "pending",
    "status.processing": "processing",
    "status.current": "current",
    "status.completed": "completed",
    "status.failed": "failed",
    "status.success": "success",
    "status.error": "error",
    "status.confirmed": "confirmed",
    "status.open": "open",
    "status.closed": "closed",
    "status.active": "active",
    "status.matched": "matched",
    "status.blocked": "blocked",
    "status.halted": "halted",
    "status.cooldown": "cooldown",
    "status.already_claimed": "already claimed",
    "status.eligible": "eligible",
    "status.queued": "queued",
    "status.scheduled": "scheduled",
    "status.review_required": "review required",
    "status.approved": "approved",
    "status.rejected": "rejected",
    "mode.mock": "Mock data mode",
    "mode.http": "HTTP mode",
    "state.accessRequired": "Access required",
    "state.permissionRequired": "Permission required",
    "state.noPermissionMessage": "You do not have permission to view this page. Confirm your access level and try again.",
    "claim.dailyTitle": "Daily claim",
    "claim.status": "Status:",
    "claim.nextEligible": "Next eligible:",
    "claim.retryClaim": "Retry claim",
    "claim.startNewAttempt": "Start new attempt",
    "claim.retryStatus": "Retry claim status",
    "claim.unavailableReason": "Unavailable",
    "shell.skipToContent": "Skip to content",
    "shell.commandPalette": "Command Palette",
    "shell.quickActions": "Quick Actions",
    "shell.applicationNavigation": "Application navigation",
    "shell.globalNavigation": "Global navigation",
    "shell.globalSection": "Global",
    "shell.module": "Module",
    "shell.moduleNavigation": "Module navigation",
    "shell.expandSidebarNavigation": "Expand sidebar navigation",
    "shell.collapseSidebarNavigation": "Collapse sidebar navigation",
    "shell.breadcrumb": "Breadcrumb",
    "shell.productNavigationDock": "Product navigation dock",
    "shell.userMenu": "User menu",
    "shell.account": "Account",
    "shell.noAccountActions": "No account actions",
    "shell.productSwitcher": "Product switcher",
    "shell.footerFoundation": "Ryvra unified shell foundation",
    "shell.userMenu.profile": "Profile",
    "shell.userMenu.workspaceSettings": "Settings",
    "shell.userMenu.adminRequired": "Admin role required",
    "shell.localeSettings": "Locale",
    "shell.localeAndTimezoneSettings": "Locale and timezone settings",
    "shell.localeFieldLabel": "Language",
    "shell.localeSelectorAria": "Language selector",
    "shell.timeZoneFieldLabel": "Time zone",
    "shell.timeZoneSelectorAria": "Time zone selector",
    "shell.browserTimeZoneOption": "Browser default ({timeZone})",
    "shell.currentTimeZone": "Current time zone: {timeZone}",
    "shell.currentLocaleAndTimeZone": "Language set to {language}. Time zone set to {timeZone}.",
    "shell.scope": "Scope",
    "shell.scopeAccount": "Account",
    "shell.scopeWorkspace": "Workspace",
    "shell.scopeUser": "User",
    "shell.scopeAccountSelector": "Account scope selector",
    "shell.scopeWorkspaceSelector": "Workspace scope selector",
    "shell.scopeUserSelector": "User scope selector",
    "shell.scopeValidationNotices": "Scope validation notices",
    "notification.trigger": "Notifications",
    "notification.triggerOpen": "Open notification center",
    "notification.triggerOpenUnread": "Open notification center ({count} unread)",
    "notification.unreadCount": "{count} unread notifications",
    "notification.title": "Notification center",
    "notification.close": "Close",
    "notification.closeAria": "Close notification center",
    "notification.deliveryMode": "Delivery mode: {mode}",
    "notification.mode.local": "Local preview settings",
    "notification.mode.remote": "Remote synced settings",
    "notification.mode.localNotice": "Remote notifications and communication preference persistence are not configured in this phase.",
    "notification.categories": "Notification categories",
    "notification.filter.all": "All",
    "notification.filter.claims": "Claims",
    "notification.filter.payouts": "Payouts",
    "notification.filter.tasks": "Tasks",
    "notification.filter.system": "System",
    "notification.sort": "Sort",
    "notification.sort.newest": "Newest first",
    "notification.sort.oldest": "Oldest first",
    "notification.markAllRead": "Mark all as read",
    "notification.loading": "Loading notifications…",
    "notification.errorFallback": "Notifications could not be loaded.",
    "notification.retry": "Retry",
    "notification.empty": "No notifications available for this filter.",
    "notification.items": "Notification items",
    "notification.severity.info": "Info",
    "notification.severity.success": "Success",
    "notification.severity.warn": "Warning",
    "notification.severity.error": "Error",
    "notification.unread": "Unread",
    "notification.markUnread": "Mark unread",
    "notification.markRead": "Mark read",
    "notification.openContext": "Open context",
    "notification.noLinkedRoute": "No linked route",
    "notification.preferences": "Notification preferences",
    "notification.communicationPreferences": "Communication preferences",
    "notification.emailUpdates": "Email updates",
    "notification.enableEmail": "Enable email notifications",
    "notification.emailCategory": "Email {category}",
    "notification.webhookUpdates": "Webhook updates",
    "notification.enableWebhook": "Enable webhook delivery",
    "notification.webhookEndpointUrl": "Webhook endpoint URL",
    "notification.webhookPlaceholder": "https://example.com/notifications",
    "notification.webhookValidationError": "Enter a valid http:// or https:// webhook URL before enabling delivery.",
    "notification.webhookCategory": "Webhook {category}",
    "notification.sendTestPing": "Send test ping",
    "notification.webhookTestPingDeferred": "Webhook test ping is deferred until a remote delivery endpoint is available.",
    "table.noDataAvailable": "No data available",
    "unified.title": "Unified balance",
    "unified.empty": "No unified assets are available for the active account scope.",
    "unified.error": "Unable to load unified balances.",
    "unified.retry": "Retry unified balance",
    "unified.totalAggregated": "Total aggregated balance",
    "unified.assetBreakdown": "Asset breakdown ({count})",
    "unified.column.asset": "Asset",
    "unified.column.chain": "Chain",
    "unified.column.quantity": "Quantity",
    "unified.column.value": "Value",
  },
  fr: {
    "common.notAvailable": "n/d",
    "common.page": "Page",
    "locale.name.en": "Anglais",
    "locale.name.fr": "Français",
    "locale.name.ar": "Arabe",
    "nav.overview": "Vue d’ensemble",
    "nav.dashboard": "Tableau de bord",
    "nav.pay": "Paiements",
    "nav.markets": "Marchés",
    "nav.points": "Points",
    "nav.tasks": "Tâches",
    "nav.instruments": "Instruments",
    "nav.orders": "Ordres",
    "nav.positions": "Positions",
    "nav.classifiedSpot": "Spot classifié",
    "nav.perpsTrading": "Trading perpétuel",
    "nav.staking": "Staking",
    "nav.invoices": "Factures",
    "nav.payouts": "Versements",
    "nav.reconciliation": "Rapprochement",
    "nav.status": "Statut",
    "nav.restricted": "Restreint",
    "status.available": "disponible",
    "status.unavailable": "indisponible",
    "status.pending": "en attente",
    "status.processing": "en cours",
    "status.current": "actuel",
    "status.completed": "terminé",
    "status.failed": "échoué",
    "status.success": "succès",
    "status.error": "erreur",
    "status.confirmed": "confirmé",
    "status.open": "ouvert",
    "status.closed": "fermé",
    "status.active": "actif",
    "status.matched": "rapproché",
    "status.blocked": "bloqué",
    "status.halted": "suspendu",
    "status.cooldown": "délai",
    "status.already_claimed": "déjà réclamé",
    "status.eligible": "admissible",
    "status.queued": "en file",
    "status.scheduled": "planifié",
    "status.review_required": "révision requise",
    "status.approved": "approuvé",
    "status.rejected": "rejeté",
    "mode.mock": "Mode données simulées",
    "mode.http": "Mode HTTP",
    "state.accessRequired": "Accès requis",
    "state.permissionRequired": "Autorisation requise",
    "state.noPermissionMessage": "Vous n’avez pas l’autorisation de voir cette page. Vérifiez votre niveau d’accès et réessayez.",
    "claim.dailyTitle": "Réclamation quotidienne",
    "claim.status": "Statut :",
    "claim.nextEligible": "Prochaine éligibilité :",
    "claim.retryClaim": "Réessayer la réclamation",
    "claim.startNewAttempt": "Démarrer une nouvelle tentative",
    "claim.retryStatus": "Réessayer le statut de réclamation",
    "claim.unavailableReason": "Indisponible",
    "shell.skipToContent": "Aller au contenu",
    "shell.commandPalette": "Palette de commandes",
    "shell.quickActions": "Actions rapides",
    "shell.applicationNavigation": "Navigation de l’application",
    "shell.globalNavigation": "Navigation globale",
    "shell.globalSection": "Global",
    "shell.module": "Module",
    "shell.moduleNavigation": "Navigation du module",
    "shell.expandSidebarNavigation": "Développer la navigation latérale",
    "shell.collapseSidebarNavigation": "Réduire la navigation latérale",
    "shell.breadcrumb": "Fil d’Ariane",
    "shell.productNavigationDock": "Dock de navigation produit",
    "shell.userMenu": "Menu utilisateur",
    "shell.account": "Compte",
    "shell.noAccountActions": "Aucune action de compte",
    "shell.productSwitcher": "Sélecteur de produit",
    "shell.footerFoundation": "Fondation de shell unifiée Ryvra",
    "shell.userMenu.profile": "Profil",
    "shell.userMenu.workspaceSettings": "Paramètres",
    "shell.userMenu.adminRequired": "Rôle administrateur requis",
    "shell.localeSettings": "Langue",
    "shell.localeAndTimezoneSettings": "Paramètres de langue et de fuseau horaire",
    "shell.localeFieldLabel": "Langue",
    "shell.localeSelectorAria": "Sélecteur de langue",
    "shell.timeZoneFieldLabel": "Fuseau horaire",
    "shell.timeZoneSelectorAria": "Sélecteur de fuseau horaire",
    "shell.browserTimeZoneOption": "Par défaut du navigateur ({timeZone})",
    "shell.currentTimeZone": "Fuseau horaire actuel : {timeZone}",
    "shell.currentLocaleAndTimeZone": "Langue définie sur {language}. Fuseau horaire défini sur {timeZone}.",
    "shell.scope": "Portée",
    "shell.scopeAccount": "Compte",
    "shell.scopeWorkspace": "Espace de travail",
    "shell.scopeUser": "Utilisateur",
    "shell.scopeAccountSelector": "Sélecteur de portée du compte",
    "shell.scopeWorkspaceSelector": "Sélecteur de portée de l’espace de travail",
    "shell.scopeUserSelector": "Sélecteur de portée de l’utilisateur",
    "shell.scopeValidationNotices": "Avis de validation de portée",
    "notification.trigger": "Notifications",
    "notification.triggerOpen": "Ouvrir le centre de notifications",
    "notification.triggerOpenUnread": "Ouvrir le centre de notifications ({count} non lues)",
    "notification.unreadCount": "{count} notifications non lues",
    "notification.title": "Centre de notifications",
    "notification.close": "Fermer",
    "notification.closeAria": "Fermer le centre de notifications",
    "notification.deliveryMode": "Mode de livraison : {mode}",
    "notification.mode.local": "Aperçu local",
    "notification.mode.remote": "Paramètres synchronisés à distance",
    "notification.mode.localNotice": "Les notifications distantes et la persistance des préférences de communication ne sont pas configurées dans cette phase.",
    "notification.categories": "Catégories de notifications",
    "notification.filter.all": "Toutes",
    "notification.filter.claims": "Réclamations",
    "notification.filter.payouts": "Versements",
    "notification.filter.tasks": "Tâches",
    "notification.filter.system": "Système",
    "notification.sort": "Trier",
    "notification.sort.newest": "Plus récentes d’abord",
    "notification.sort.oldest": "Plus anciennes d’abord",
    "notification.markAllRead": "Marquer tout comme lu",
    "notification.loading": "Chargement des notifications…",
    "notification.errorFallback": "Impossible de charger les notifications.",
    "notification.retry": "Réessayer",
    "notification.empty": "Aucune notification pour ce filtre.",
    "notification.items": "Éléments de notification",
    "notification.severity.info": "Info",
    "notification.severity.success": "Succès",
    "notification.severity.warn": "Avertissement",
    "notification.severity.error": "Erreur",
    "notification.unread": "Non lue",
    "notification.markUnread": "Marquer non lue",
    "notification.markRead": "Marquer lue",
    "notification.openContext": "Ouvrir le contexte",
    "notification.noLinkedRoute": "Aucun lien de route",
    "notification.preferences": "Préférences de notifications",
    "notification.communicationPreferences": "Préférences de communication",
    "notification.emailUpdates": "Mises à jour e-mail",
    "notification.enableEmail": "Activer les notifications e-mail",
    "notification.emailCategory": "E-mail {category}",
    "notification.webhookUpdates": "Mises à jour webhook",
    "notification.enableWebhook": "Activer la diffusion webhook",
    "notification.webhookEndpointUrl": "URL de terminaison webhook",
    "notification.webhookPlaceholder": "https://example.com/notifications",
    "notification.webhookValidationError": "Saisissez une URL webhook http:// ou https:// valide avant d’activer la diffusion.",
    "notification.webhookCategory": "Webhook {category}",
    "notification.sendTestPing": "Envoyer un ping de test",
    "notification.webhookTestPingDeferred": "Le ping de test webhook est différé jusqu’à la disponibilité d’un point de livraison distant.",
    "table.noDataAvailable": "Aucune donnée disponible",
    "unified.title": "Solde unifié",
    "unified.empty": "Aucun actif unifié n’est disponible pour la portée de compte active.",
    "unified.error": "Impossible de charger les soldes unifiés.",
    "unified.retry": "Réessayer le solde unifié",
    "unified.totalAggregated": "Solde total agrégé",
    "unified.assetBreakdown": "Répartition des actifs ({count})",
    "unified.column.asset": "Actif",
    "unified.column.chain": "Chaîne",
    "unified.column.quantity": "Quantité",
    "unified.column.value": "Valeur",
  },
  ar: {
    "common.notAvailable": "غير متاح",
    "common.page": "صفحة",
    "locale.name.en": "الإنجليزية",
    "locale.name.fr": "الفرنسية",
    "locale.name.ar": "العربية",
    "nav.overview": "نظرة عامة",
    "nav.dashboard": "لوحة التحكم",
    "nav.pay": "المدفوعات",
    "nav.markets": "الأسواق",
    "nav.points": "النقاط",
    "nav.tasks": "المهام",
    "nav.instruments": "الأدوات",
    "nav.orders": "الأوامر",
    "nav.positions": "المراكز",
    "nav.classifiedSpot": "التداول الفوري المصنّف",
    "nav.perpsTrading": "تداول العقود الدائمة",
    "nav.staking": "التحصيص",
    "nav.invoices": "الفواتير",
    "nav.payouts": "الدفعات",
    "nav.reconciliation": "المطابقة",
    "nav.status": "الحالة",
    "nav.restricted": "مقيّد",
    "status.available": "متاح",
    "status.unavailable": "غير متاح",
    "status.pending": "قيد الانتظار",
    "status.processing": "قيد المعالجة",
    "status.current": "الحالي",
    "status.completed": "مكتمل",
    "status.failed": "فشل",
    "status.success": "نجاح",
    "status.error": "خطأ",
    "status.confirmed": "مؤكد",
    "status.open": "مفتوح",
    "status.closed": "مغلق",
    "status.active": "نشط",
    "status.matched": "متطابق",
    "status.blocked": "محظور",
    "status.halted": "متوقف",
    "status.cooldown": "فترة انتظار",
    "status.already_claimed": "تمت المطالبة",
    "status.eligible": "مؤهل",
    "status.queued": "في قائمة الانتظار",
    "status.scheduled": "مجدول",
    "status.review_required": "تتطلب مراجعة",
    "status.approved": "موافق عليه",
    "status.rejected": "مرفوض",
    "mode.mock": "وضع البيانات التجريبية",
    "mode.http": "وضع HTTP",
    "state.accessRequired": "يتطلب الوصول",
    "state.permissionRequired": "إذن مطلوب",
    "state.noPermissionMessage": "ليس لديك إذن لعرض هذه الصفحة. تحقق من مستوى الوصول وحاول مرة أخرى.",
    "claim.dailyTitle": "المطالبة اليومية",
    "claim.status": "الحالة:",
    "claim.nextEligible": "الأهلية التالية:",
    "claim.retryClaim": "إعادة محاولة المطالبة",
    "claim.startNewAttempt": "بدء محاولة جديدة",
    "claim.retryStatus": "إعادة محاولة حالة المطالبة",
    "claim.unavailableReason": "غير متاح",
    "shell.skipToContent": "تخطي إلى المحتوى",
    "shell.commandPalette": "لوحة الأوامر",
    "shell.quickActions": "إجراءات سريعة",
    "shell.applicationNavigation": "تنقل التطبيق",
    "shell.globalNavigation": "تنقل عام",
    "shell.globalSection": "عام",
    "shell.module": "الوحدة",
    "shell.moduleNavigation": "تنقل الوحدة",
    "shell.expandSidebarNavigation": "توسيع تنقل الشريط الجانبي",
    "shell.collapseSidebarNavigation": "طي تنقل الشريط الجانبي",
    "shell.breadcrumb": "مسار التنقل",
    "shell.productNavigationDock": "شريط تنقل المنتجات",
    "shell.userMenu": "قائمة المستخدم",
    "shell.account": "الحساب",
    "shell.noAccountActions": "لا توجد إجراءات للحساب",
    "shell.productSwitcher": "مبدل المنتجات",
    "shell.footerFoundation": "أساس الواجهة الموحدة لـ Ryvra",
    "shell.userMenu.profile": "الملف الشخصي",
    "shell.userMenu.workspaceSettings": "الإعدادات",
    "shell.userMenu.adminRequired": "يتطلب دور المسؤول",
    "shell.localeSettings": "اللغة",
    "shell.localeAndTimezoneSettings": "إعدادات اللغة والمنطقة الزمنية",
    "shell.localeFieldLabel": "اللغة",
    "shell.localeSelectorAria": "محدد اللغة",
    "shell.timeZoneFieldLabel": "المنطقة الزمنية",
    "shell.timeZoneSelectorAria": "محدد المنطقة الزمنية",
    "shell.browserTimeZoneOption": "الإعداد الافتراضي للمتصفح ({timeZone})",
    "shell.currentTimeZone": "المنطقة الزمنية الحالية: {timeZone}",
    "shell.currentLocaleAndTimeZone": "تم تعيين اللغة إلى {language}. وتم تعيين المنطقة الزمنية إلى {timeZone}.",
    "shell.scope": "النطاق",
    "shell.scopeAccount": "الحساب",
    "shell.scopeWorkspace": "مساحة العمل",
    "shell.scopeUser": "المستخدم",
    "shell.scopeAccountSelector": "محدد نطاق الحساب",
    "shell.scopeWorkspaceSelector": "محدد نطاق مساحة العمل",
    "shell.scopeUserSelector": "محدد نطاق المستخدم",
    "shell.scopeValidationNotices": "تنبيهات التحقق من النطاق",
    "notification.trigger": "الإشعارات",
    "notification.triggerOpen": "فتح مركز الإشعارات",
    "notification.triggerOpenUnread": "فتح مركز الإشعارات ({count} غير مقروء)",
    "notification.unreadCount": "{count} إشعار غير مقروء",
    "notification.title": "مركز الإشعارات",
    "notification.close": "إغلاق",
    "notification.closeAria": "إغلاق مركز الإشعارات",
    "notification.deliveryMode": "وضع التسليم: {mode}",
    "notification.mode.local": "إعدادات معاينة محلية",
    "notification.mode.remote": "إعدادات متزامنة عن بُعد",
    "notification.mode.localNotice": "الإشعارات البعيدة وحفظ تفضيلات الاتصال غير مكوّنين في هذه المرحلة.",
    "notification.categories": "فئات الإشعارات",
    "notification.filter.all": "الكل",
    "notification.filter.claims": "المطالبات",
    "notification.filter.payouts": "الدفعات",
    "notification.filter.tasks": "المهام",
    "notification.filter.system": "النظام",
    "notification.sort": "ترتيب",
    "notification.sort.newest": "الأحدث أولاً",
    "notification.sort.oldest": "الأقدم أولاً",
    "notification.markAllRead": "تعيين الكل كمقروء",
    "notification.loading": "جارٍ تحميل الإشعارات…",
    "notification.errorFallback": "تعذر تحميل الإشعارات.",
    "notification.retry": "إعادة المحاولة",
    "notification.empty": "لا توجد إشعارات لهذا الفلتر.",
    "notification.items": "عناصر الإشعارات",
    "notification.severity.info": "معلومة",
    "notification.severity.success": "نجاح",
    "notification.severity.warn": "تحذير",
    "notification.severity.error": "خطأ",
    "notification.unread": "غير مقروء",
    "notification.markUnread": "تعيين كغير مقروء",
    "notification.markRead": "تعيين كمقروء",
    "notification.openContext": "فتح السياق",
    "notification.noLinkedRoute": "لا يوجد مسار مرتبط",
    "notification.preferences": "تفضيلات الإشعارات",
    "notification.communicationPreferences": "تفضيلات الاتصال",
    "notification.emailUpdates": "تحديثات البريد الإلكتروني",
    "notification.enableEmail": "تفعيل إشعارات البريد الإلكتروني",
    "notification.emailCategory": "بريد إلكتروني {category}",
    "notification.webhookUpdates": "تحديثات Webhook",
    "notification.enableWebhook": "تفعيل تسليم Webhook",
    "notification.webhookEndpointUrl": "عنوان Webhook",
    "notification.webhookPlaceholder": "https://example.com/notifications",
    "notification.webhookValidationError": "أدخل عنوان Webhook صالحًا يبدأ بـ http:// أو https:// قبل التفعيل.",
    "notification.webhookCategory": "Webhook {category}",
    "notification.sendTestPing": "إرسال اختبار",
    "notification.webhookTestPingDeferred": "تم تأجيل اختبار Webhook حتى يتوفر عنوان تسليم بعيد.",
    "table.noDataAvailable": "لا توجد بيانات متاحة",
    "unified.title": "الرصيد الموحّد",
    "unified.empty": "لا توجد أصول موحّدة متاحة لنطاق الحساب الحالي.",
    "unified.error": "تعذر تحميل الأرصدة الموحّدة.",
    "unified.retry": "إعادة محاولة الرصيد الموحّد",
    "unified.totalAggregated": "إجمالي الرصيد المجمّع",
    "unified.assetBreakdown": "تفصيل الأصول ({count})",
    "unified.column.asset": "الأصل",
    "unified.column.chain": "السلسلة",
    "unified.column.quantity": "الكمية",
    "unified.column.value": "القيمة",
  },
};

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

function toBaseLocale(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.split("-")[0] ?? normalized;
}

function interpolateTemplate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = params[key];
    return typeof value === "undefined" ? `{${key}}` : String(value);
  });
}

export function shouldEmitMissingKeyDiagnostics(environment = process.env.NODE_ENV): boolean {
  return environment !== "production";
}

export function clearMissingKeyDiagnostics(): void {
  missingKeyDiagnostics.clear();
}

function logMissingKey(message: string, diagnosticsEnabled: boolean): void {
  if (!diagnosticsEnabled || missingKeyDiagnostics.has(message)) {
    return;
  }

  missingKeyDiagnostics.add(message);
  console.warn(message);
}

export function resolveSupportedLocale(value: string | null | undefined, fallback: SupportedLocale = defaultLocale): SupportedLocale {
  const base = toBaseLocale(value);
  return isSupportedLocale(base) ? base : fallback;
}

export function resolveBrowserLocale(fallback: SupportedLocale = defaultLocale): SupportedLocale {
  if (typeof navigator === "undefined") {
    return fallback;
  }

  const candidates = [navigator.language, ...navigator.languages];
  for (const candidate of candidates) {
    const baseLocale = toBaseLocale(candidate);
    if (isSupportedLocale(baseLocale)) {
      return baseLocale;
    }
  }

  return fallback;
}

export function getLocaleDirection(locale: SupportedLocale): TextDirection {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}

export function mergeLocaleResources(base: LocaleResources, override?: LocaleResources): LocaleResources {
  const merged: LocaleResources = {};

  for (const locale of supportedLocales) {
    const baseDictionary = base[locale] ?? {};
    const overrideDictionary = override?.[locale] ?? {};
    merged[locale] = {
      ...baseDictionary,
      ...overrideDictionary,
    };
  }

  return merged;
}

export interface TranslationResolverOptions {
  locale: SupportedLocale;
  resources?: LocaleResources;
  fallbackLocale?: SupportedLocale;
  diagnosticsEnabled?: boolean;
}

export type TranslationResolver = (key: string, fallback?: string, params?: TranslationParams) => string;

export function createTranslationResolver(options: TranslationResolverOptions): TranslationResolver {
  const resources = mergeLocaleResources(sharedLocaleResources, options.resources);
  const locale = options.locale;
  const resolvedFallbackLocale = options.fallbackLocale ?? fallbackLocale;
  const diagnosticsEnabled = options.diagnosticsEnabled ?? shouldEmitMissingKeyDiagnostics();

  return (key: string, fallback?: string, params?: TranslationParams) => {
    const localeDictionary = resources[locale] ?? {};
    const fallbackDictionary = resources[resolvedFallbackLocale] ?? {};

    const localizedValue = localeDictionary[key];
    if (localizedValue) {
      return interpolateTemplate(localizedValue, params);
    }

    const fallbackValue = fallbackDictionary[key];
    if (fallbackValue) {
      if (locale !== resolvedFallbackLocale) {
        logMissingKey(
          `[i18n] Missing key "${key}" for locale "${locale}". Falling back to "${resolvedFallbackLocale}".`,
          diagnosticsEnabled,
        );
      }
      return interpolateTemplate(fallbackValue, params);
    }

    logMissingKey(`[i18n] Missing key "${key}" for locale "${locale}" and fallback locale "${resolvedFallbackLocale}".`, diagnosticsEnabled);
    return interpolateTemplate(fallback ?? key, params);
  };
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function safeGet(storage: StorageLike | null | undefined, key: string): string | null {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: StorageLike | null | undefined, key: string, value: string): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write errors
  }
}

export function readStoredLocale(storage: StorageLike | null | undefined): SupportedLocale | null {
  const raw = safeGet(storage, localeStorageKey);
  if (!raw) {
    return null;
  }

  const baseLocale = toBaseLocale(raw);
  return isSupportedLocale(baseLocale) ? baseLocale : null;
}

export function writeStoredLocale(storage: StorageLike | null | undefined, locale: SupportedLocale): void {
  safeSet(storage, localeStorageKey, locale);
}

export function isValidTimeZone(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZonePreference(preference: string | null | undefined): string {
  if (!preference) {
    return browserTimeZonePreference;
  }

  const trimmed = preference.trim();
  if (trimmed === browserTimeZonePreference) {
    return browserTimeZonePreference;
  }

  return isValidTimeZone(trimmed) ? trimmed : browserTimeZonePreference;
}

export function resolveBrowserTimeZone(fallback = defaultTimeZone): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved && isValidTimeZone(resolved)) {
      return resolved;
    }
  } catch {
    // ignore runtime lookup errors
  }

  return fallback;
}

export function resolveTimeZoneFromPreference(
  preference: string | null | undefined,
  browserTimeZone = resolveBrowserTimeZone(),
): string {
  const normalizedPreference = normalizeTimeZonePreference(preference);
  if (normalizedPreference === browserTimeZonePreference) {
    return browserTimeZone;
  }

  return normalizedPreference;
}

export function readStoredTimeZonePreference(storage: StorageLike | null | undefined): string | null {
  const raw = safeGet(storage, timeZonePreferenceStorageKey);
  if (!raw) {
    return null;
  }

  return normalizeTimeZonePreference(raw);
}

export function writeStoredTimeZonePreference(storage: StorageLike | null | undefined, preference: string): void {
  safeSet(storage, timeZonePreferenceStorageKey, normalizeTimeZonePreference(preference));
}

export interface I18nRuntimeState {
  locale: SupportedLocale;
  timeZonePreference: string;
  timeZone: string;
  resources: LocaleResources;
}

let runtimeState: I18nRuntimeState = {
  locale: defaultLocale,
  timeZonePreference: browserTimeZonePreference,
  timeZone: defaultTimeZone,
  resources: mergeLocaleResources(sharedLocaleResources),
};

export function getRuntimeI18nState(): I18nRuntimeState {
  return runtimeState;
}

export function setRuntimeI18nState(next: Partial<I18nRuntimeState>): void {
  runtimeState = {
    ...runtimeState,
    ...next,
    resources: next.resources ? mergeLocaleResources(sharedLocaleResources, next.resources) : runtimeState.resources,
  };
}

export function translateRuntime(key: string, fallback?: string, params?: TranslationParams): string {
  const resolver = createTranslationResolver({
    locale: runtimeState.locale,
    resources: runtimeState.resources,
  });
  return resolver(key, fallback, params);
}

function normalizeNumericValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function resolveFormattingLocale(locale?: string): SupportedLocale {
  return resolveSupportedLocale(locale, runtimeState.locale);
}

function resolveFormattingTimeZone(timeZone?: string): string {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }

  return runtimeState.timeZone;
}

export interface LocalizedNumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: string;
}

export function formatLocalizedNumber(value: number, options: LocalizedNumberFormatOptions = {}): string {
  const { locale, ...intlOptions } = options;
  const resolvedLocale = resolveFormattingLocale(locale);
  const maximumFractionDigits =
    typeof intlOptions.maximumFractionDigits === "number" ? intlOptions.maximumFractionDigits : 2;
  const minimumFractionDigits =
    typeof intlOptions.minimumFractionDigits === "number" ? intlOptions.minimumFractionDigits : 0;

  return new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits,
    maximumFractionDigits,
    ...intlOptions,
  }).format(normalizeNumericValue(value));
}

function normalizeCurrencyCode(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

export interface LocalizedCurrencyFormatOptions {
  locale?: string;
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatLocalizedCurrency(
  value: number,
  currency: string,
  options: LocalizedCurrencyFormatOptions = {},
): string {
  const resolvedLocale = resolveFormattingLocale(options.locale);
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? Math.max(minimumFractionDigits, 2);

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: options.currencyDisplay ?? "symbol",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(normalizeNumericValue(value));
  } catch {
    return `${formatLocalizedNumber(value, {
      locale: resolvedLocale,
      minimumFractionDigits,
      maximumFractionDigits,
    })} ${normalizedCurrency}`;
  }
}

export interface LocalizedDateTimeFormatOptions {
  locale?: string;
  timeZone?: string;
  includeTimeZoneName?: boolean;
  fallback?: string;
  year?: "numeric" | "2-digit";
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  day?: "numeric" | "2-digit";
  hour?: "numeric" | "2-digit";
  minute?: "numeric" | "2-digit";
}

function parseDateValue(value: string | number | Date): Date | null {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatLocalizedDateTime(
  value: string | number | Date,
  options: LocalizedDateTimeFormatOptions = {},
): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return options.fallback ?? translateRuntime("common.notAvailable", "n/a");
  }

  const resolvedLocale = resolveFormattingLocale(options.locale);
  const resolvedTimeZone = resolveFormattingTimeZone(options.timeZone);

  return new Intl.DateTimeFormat(resolvedLocale, {
    year: options.year ?? "numeric",
    month: options.month ?? "short",
    day: options.day ?? "2-digit",
    hour: options.hour ?? "2-digit",
    minute: options.minute ?? "2-digit",
    timeZone: resolvedTimeZone,
    ...(options.includeTimeZoneName === false ? {} : { timeZoneName: "short" }),
  }).format(parsed);
}

export interface LocalizedRelativeTimeOptions {
  locale?: string;
  now?: string | number | Date;
}

export function formatLocalizedRelativeTime(
  value: string | number | Date,
  options: LocalizedRelativeTimeOptions = {},
): string {
  const targetDate = parseDateValue(value);
  if (!targetDate) {
    return translateRuntime("common.notAvailable", "n/a");
  }

  const nowDate = parseDateValue(options.now ?? Date.now()) ?? new Date();
  const diffMs = targetDate.getTime() - nowDate.getTime();
  const absSeconds = Math.abs(diffMs) / 1000;

  const unitAndValue: [Intl.RelativeTimeFormatUnit, number] =
    absSeconds < 60
      ? ["second", Math.round(diffMs / 1000)]
      : absSeconds < 3600
        ? ["minute", Math.round(diffMs / 60000)]
        : absSeconds < 86400
          ? ["hour", Math.round(diffMs / 3600000)]
          : ["day", Math.round(diffMs / 86400000)];

  return new Intl.RelativeTimeFormat(resolveFormattingLocale(options.locale), {
    numeric: "auto",
  }).format(unitAndValue[1], unitAndValue[0]);
}
