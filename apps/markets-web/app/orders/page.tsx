import type { MarketsListRequest, OrderFilters } from "@ryvra/domain-markets";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { OrdersTableClient } from "../components/orders-table-client";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import {
  getFirstParam,
  parseDateRange,
  parseOrderSide,
  parseOrderStatus,
  parseOrderType,
  parsePage,
  parsePageSize,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsOrdersPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildOrderRequest(searchParams: RouteSearchParams): MarketsListRequest<OrderFilters> {
  const status = parseOrderStatus(searchParams);
  const side = parseOrderSide(searchParams);
  const type = parseOrderType(searchParams);
  const search = getFirstParam(searchParams, "search")?.trim();
  const dateRange = parseDateRange(searchParams);
  const sortField = getFirstParam(searchParams, "sortField") ?? "createdAt";

  const filters: OrderFilters = {
    ...(status ? { status } : {}),
    ...(side ? { side } : {}),
    ...(type ? { type } : {}),
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
    const request = buildOrderRequest(searchParams);
    const [orderList, summary] = await Promise.all([
      runtime.marketsClient.listOrders(request),
      runtime.marketsClient.getOrderSummary(request.filters),
    ]);

    runtime.logger.info("Loaded orders data", {
      mode: runtime.config.mode,
      orderCount: orderList.items.length,
      openOrders: summary.openCount,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Orders" description="Order lifecycle data with typed list filters and summary counts.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Open">
              <p style={{ margin: 0 }}>{summary.openCount}</p>
            </Card>
            <Card title="Filled/Settled">
              <p style={{ margin: 0 }}>{summary.filledCount}</p>
            </Card>
            <Card title="Canceled/Expired">
              <p style={{ margin: 0 }}>{summary.canceledCount}</p>
            </Card>
            <Card title="Failed">
              <p style={{ margin: 0 }}>{summary.failedCount}</p>
            </Card>
          </div>

          <OrdersTableClient items={orderList.items} pagination={orderList.pagination} />
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
