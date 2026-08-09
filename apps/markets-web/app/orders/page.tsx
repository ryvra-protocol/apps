import type { MarketsAccountScopedListRequest, OrderFilters } from "@ryvra/domain-markets";
import {
  Card,
  ComplianceEvidencePanel,
  OperationTimelineCard,
  PolicyLinksCard,
  Section,
  TrustDisclosureCard,
  themeTokens,
} from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { OrdersTableClient } from "../components/orders-table-client";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import {
  parseAccountId,
  parseCursor,
  getFirstParam,
  parseDateRange,
  parseLimit,
  parseOrderSide,
  parseOrderPolicyDecision,
  parseOrderStatus,
  parseOrderType,
  parsePage,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { buildOrderEvidenceReferences, buildOrderTimelineStages, resolveOrderRetryable } from "../lib/trust-compliance";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsOrdersPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildOrderRequest(
  searchParams: RouteSearchParams,
  defaultAccountId: string | undefined,
): MarketsAccountScopedListRequest<OrderFilters> {
  const status = parseOrderStatus(searchParams);
  const side = parseOrderSide(searchParams);
  const type = parseOrderType(searchParams);
  const policyDecision = parseOrderPolicyDecision(searchParams);
  const referenceId = getFirstParam(searchParams, "referenceId")?.trim() ?? getFirstParam(searchParams, "search")?.trim();
  const correlationId = getFirstParam(searchParams, "correlationId")?.trim();
  const routeId = getFirstParam(searchParams, "routeId")?.trim();
  const createdAfter = getFirstParam(searchParams, "createdAfter")?.trim();
  const createdBefore = getFirstParam(searchParams, "createdBefore")?.trim();
  const dateRange = parseDateRange(searchParams);
  const sortField = getFirstParam(searchParams, "sortBy") ?? getFirstParam(searchParams, "sortField") ?? "updated_at";
  const cursor = parseCursor(searchParams);
  const deprecatedPage = parsePage(searchParams);
  const accountId = parseAccountId(searchParams) ?? defaultAccountId ?? "";

  const filters: OrderFilters = {
    ...(status ? { status } : {}),
    ...(side ? { side } : {}),
    ...(type ? { type } : {}),
    ...(policyDecision ? { policyDecision } : {}),
    ...(referenceId ? { referenceId } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(routeId ? { routeId } : {}),
    ...(createdAfter ? { createdAfter } : {}),
    ...(createdBefore ? { createdBefore } : {}),
    ...(dateRange ? { dateRange } : {}),
  };

  return {
    accountId,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      limit: parseLimit(searchParams, 50),
      ...(cursor ? { cursor } : {}),
      ...(typeof deprecatedPage === "number" ? { page: deprecatedPage } : {}),
    },
    sort: {
      field: sortField,
      direction: parseSortDirection(searchParams),
    },
  };
}

export default async function MarketsOrdersPage({ searchParams }: MarketsOrdersPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:orders");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Orders" description="Access-controlled order lifecycle and execution state view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const request = buildOrderRequest(searchParams, runtime.defaultAccountId);
    const [orderList, summary] = await Promise.all([
      runtime.marketsClient.listOrders(request),
      runtime.marketsClient.getOrderSummary({
        accountId: request.accountId,
        ...(request.filters ? { filters: request.filters } : {}),
      }),
    ]);
    const leadOrder = orderList.items[0] ?? null;
    const orderTimelineStages = buildOrderTimelineStages(leadOrder);

    runtime.logger.info("Loaded orders data", {
      mode: runtime.config.mode,
      orderCount: orderList.items.length,
      openOrders: summary.openOrders,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Orders" description="Order lifecycle data with typed list filters and summary counts.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Open">
              <p style={{ margin: 0 }}>{summary.openOrders}</p>
            </Card>
            <Card title="Terminal">
              <p style={{ margin: 0 }}>{summary.terminalOrders}</p>
            </Card>
            <Card title="Review required">
              <p style={{ margin: 0 }}>{summary.reviewRequiredOrders}</p>
            </Card>
            <Card title="Blocked">
              <p style={{ margin: 0 }}>{summary.blockedOrders}</p>
            </Card>
          </div>

          <TrustDisclosureCard
            title="Order lifecycle trust notice"
            confirmationText="Order statuses reflect canonical lifecycle stages from create through settlement."
            retryText="Retry order actions only after checking policy decision and retryability context."
            processingText="Route and correlation references are surfaced for auditability when available."
          />

          <OperationTimelineCard
            title="Latest order operation timeline"
            state={orderTimelineStages.length > 0 ? "success" : "empty"}
            stages={orderTimelineStages}
            emptyMessage="No order timeline is available for the current account scope."
          />

          <ComplianceEvidencePanel
            title="Latest order compliance evidence"
            summaryLabel="Details"
            sourceSystem="markets-api"
            retryable={resolveOrderRetryable(leadOrder)}
            references={buildOrderEvidenceReferences(leadOrder)}
            lastUpdated={leadOrder?.updatedAt}
          />

          <PolicyLinksCard
            title="Markets policy and help"
            description="Use diagnostics and position context before resubmitting or escalating order issues."
            links={[
              { href: "/status", label: "View markets status diagnostics" },
              { href: "/positions", label: "Review position risk state" },
              { href: "/overview", label: "Open markets operational overview" },
            ]}
          />

          <OrdersTableClient items={orderList.items} pagination={orderList.pagination} />

          {orderList.items.length === 0 ? (
            <EmptyState
              title="No orders"
              description="No orders matched the current account scope and filters."
              actionLink={{ href: "/orders", label: "Reset filters" }}
            />
          ) : null}
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/orders", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Orders" description="Order lifecycle data with typed list filters and summary counts.">
          <ErrorState
            title="Unable to load orders"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/orders", label: "Retry orders" }}
          />
        </Section>
      </section>
    );
  }
}
