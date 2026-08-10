import type { InvoiceFilters, PayListRequest } from "@ryvra/domain-payments";
import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { InvoicesTableClient } from "../components/invoices-table-client";
import { ModeBadge } from "../components/mode-badge";
import { EmptyState, ErrorState, PermissionDeniedState, UnauthorizedState } from "../components/page-states";
import { formatCurrencyMinor } from "../lib/format";
import {
  getFirstParam,
  parseAccountId,
  parseDateRange,
  parseInvoiceStatus,
  parsePage,
  parsePageSize,
  parseSortDirection,
  parseWorkspaceId,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

interface PayInvoicesPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildInvoiceRequest(searchParams: RouteSearchParams): PayListRequest<InvoiceFilters> {
  const status = parseInvoiceStatus(searchParams);
  const search = getFirstParam(searchParams, "search")?.trim();
  const dateRange = parseDateRange(searchParams);

  const filters: InvoiceFilters = {
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(dateRange ? { dateRange } : {}),
  };

  return {
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      page: parsePage(searchParams),
      pageSize: parsePageSize(searchParams, 20),
    },
    sort: {
      field: "issuedAt",
      direction: parseSortDirection(searchParams),
    },
  };
}

export default async function PayInvoicesPage({ searchParams }: PayInvoicesPageProps) {
  const runtime = createPayRuntimeContext("pay-web:invoices");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Invoices" description="Access-controlled invoice lifecycle view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/invoices"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Invoices" description="Invoice operations with typed list and summary boundaries.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view invoices."} />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams) ?? "workspace-core-1";
    const request = buildInvoiceRequest(searchParams);
    const [invoiceList, summary] = await Promise.all([
      runtime.payClient.listInvoices(request),
      runtime.payClient.getInvoiceSummary(),
    ]);

    runtime.logger.info("Loaded invoices data", {
      mode: runtime.config.mode,
      accountId,
      workspaceId,
      role: runtime.workspaceRole.role,
      invoiceCount: invoiceList.items.length,
      totalInvoices: summary.totalCount,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Invoices" description="Invoice operations with typed list and summary boundaries.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <Card title="Runtime context">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
              Account: <strong>{accountId}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Workspace: <strong>{workspaceId}</strong>
            </p>
            <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>
              Role: <strong>{runtime.workspaceRole.label}</strong>
            </p>
          </Card>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Card title="Total">
              <p style={{ margin: 0 }}>{summary.totalCount}</p>
            </Card>
            <Card title="Paid">
              <p style={{ margin: 0 }}>{summary.paidCount}</p>
            </Card>
            <Card title="Pending">
              <p style={{ margin: 0 }}>{summary.pendingCount}</p>
            </Card>
            <Card title="Failed">
              <p style={{ margin: 0 }}>{summary.failedCount}</p>
            </Card>
            <Card title="Invoice volume">
              <p style={{ margin: 0 }}>{formatCurrencyMinor(summary.totalAmountMinor, summary.currency)}</p>
            </Card>
          </div>

          <InvoicesTableClient items={invoiceList.items} pagination={invoiceList.pagination} currentUserId={runtime.sessionUserId} />

          {invoiceList.items.length === 0 ? (
            <EmptyState
              title="No invoices"
              description="No invoices matched the current filters."
              actionLink={{ href: "/invoices", label: "Reset filters" }}
            />
          ) : null}
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/invoices", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Invoices" description="Invoice operations with typed list and summary boundaries.">
          <ErrorState
            title="Unable to load invoices"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/invoices", label: "Retry invoices" }}
          />
        </Section>
      </section>
    );
  }
}
