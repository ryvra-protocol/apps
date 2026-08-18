import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import { Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, PermissionDeniedState, UnauthorizedState } from "../../components/page-states";
import { P2pHistoryTableClient } from "../../components/p2p-history-table-client";
import { buildP2pHistoryRows } from "../../lib/p2p";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../../lib/runtime";

interface P2pHistoryPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function P2pHistoryPage({ searchParams }: P2pHistoryPageProps) {
  const runtime = createPayRuntimeContext("pay-web:p2p-history");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P History" description="Access-controlled P2P activity view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/p2p/history"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P History" description="Person-to-person activity and status history.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view P2P history."} />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);

    const [payouts, invoices, overview] = await Promise.all([
      runtime.payClient.listPayouts({ pagination: { page: 1, pageSize: 50 }, sort: { field: "createdAt", direction: "desc" } }),
      runtime.payClient.listInvoices({ pagination: { page: 1, pageSize: 50 }, sort: { field: "issuedAt", direction: "desc" } }),
      runtime.payClient.getPayOverview(),
    ]);

    const rows = buildP2pHistoryRows({
      payouts: payouts.items,
      invoices: invoices.items,
      overview,
    });

    runtime.logger.info("Loaded P2P history route", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      rowCount: rows.length,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P History" description="Status-aware person-to-person history with deterministic preview fallback.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <P2pHistoryTableClient
            mode={runtime.config.mode}
            accountId={accountId}
            rows={rows}
            {...(workspaceId ? { workspaceId } : {})}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/p2p/history", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P History" description="Person-to-person activity and status history.">
          <ErrorState
            title="Unable to load P2P history"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/p2p/history", label: "Retry history" }}
          />
        </Section>
      </section>
    );
  }
}
