import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import { Section, themeTokens } from "@ryvra/ui";
import { MerchantDashboardClient } from "../components/merchant-dashboard-client";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, PermissionDeniedState, UnauthorizedState } from "../components/page-states";
import { buildMerchantSettlementSummary, buildMerchantTransactions } from "../lib/merchant-dashboard";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

interface MerchantDashboardPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function MerchantDashboardPage({ searchParams }: MerchantDashboardPageProps) {
  const runtime = createPayRuntimeContext("pay-web:merchant-dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Merchant Dashboard" description="Access-controlled merchant operations view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/merchant"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Merchant Dashboard" description="Merchant analytics and operations surface.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view the merchant dashboard."} />
        </Section>
      </section>
    );
  }

  const canViewMerchantDashboard = canAccessWorkspaceCapability(runtime.workspaceRole, "admin");
  if (!canViewMerchantDashboard) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Merchant Dashboard" description="Merchant analytics and operations surface.">
          <PermissionDeniedState
            message={
              describeWorkspaceCapabilityRequirement("admin", runtime.workspaceRole, "Merchant dashboard") ||
              "Merchant dashboard access requires Admin workspace access."
            }
          />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);

    const [invoiceList, payoutList, reconciliationList, payoutSummary] = await Promise.all([
      runtime.payClient.listInvoices({ pagination: { page: 1, pageSize: 100 }, sort: { field: "issuedAt", direction: "desc" } }),
      runtime.payClient.listPayouts({ pagination: { page: 1, pageSize: 100 }, sort: { field: "createdAt", direction: "desc" } }),
      runtime.payClient.listReconciliationItems({
        pagination: { page: 1, pageSize: 100 },
        sort: { field: "updatedAt", direction: "desc" },
      }),
      runtime.payClient.getPayoutSummary(),
    ]);

    const rows = buildMerchantTransactions({
      invoices: invoiceList.items,
      payouts: payoutList.items,
      reconciliation: reconciliationList.items,
    });

    runtime.logger.info("Loaded merchant dashboard", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      transactionCount: rows.length,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Merchant Dashboard" description="Merchant KPI, transaction operations, and deferred refund/dispute visibility.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <MerchantDashboardClient
            mode={runtime.config.mode}
            accountId={accountId}
            roleLabel={runtime.workspaceRole.label}
            rows={rows}
            settlementSummary={buildMerchantSettlementSummary(payoutSummary)}
            {...(workspaceId ? { workspaceId } : {})}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/merchant", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Merchant Dashboard" description="Merchant analytics and operations surface.">
          <ErrorState
            title="Unable to load merchant dashboard"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/merchant", label: "Retry merchant dashboard" }}
          />
        </Section>
      </section>
    );
  }
}
