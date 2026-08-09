import type { MarketOrderStatus, OrderDto } from "@ryvra/domain-markets";
import type { OperationTimelineStage, TrustReference } from "@ryvra/ui";

const failureStatuses = new Set<MarketOrderStatus>(["failed", "canceled", "expired"]);

function resolveOrderCurrentStage(status: MarketOrderStatus): number {
  if (status === "created") {
    return 0;
  }

  if (status === "validated") {
    return 1;
  }

  if (status === "routed") {
    return 2;
  }

  if (status === "partially_filled" || status === "filled") {
    return 3;
  }

  if (status === "settled") {
    return 4;
  }

  return 5;
}

export function buildOrderTimelineStages(order: OrderDto | null): OperationTimelineStage[] {
  if (!order) {
    return [];
  }

  const currentStage = resolveOrderCurrentStage(order.status);

  return [
    {
      id: "created",
      label: "Created",
      status: currentStage > 0 ? "completed" : "current",
      timestamp: order.createdAt,
      current: currentStage === 0,
      references: [{ label: "Order ID", value: order.id }],
    },
    {
      id: "validated",
      label: "Validated",
      status: currentStage > 1 ? "completed" : currentStage === 1 ? "current" : "pending",
      ...(currentStage >= 1 ? { timestamp: order.updatedAt } : {}),
      current: currentStage === 1,
      note: `Policy decision: ${order.policyDecision}`,
    },
    {
      id: "routed",
      label: "Routed",
      status: currentStage > 2 ? "completed" : currentStage === 2 ? "current" : "pending",
      ...(currentStage >= 2 ? { timestamp: order.updatedAt } : {}),
      current: currentStage === 2,
      references: [{ label: "Route ID", ...(order.routeId ? { value: order.routeId } : {}) }],
    },
    {
      id: "filled",
      label: "Execution",
      status: currentStage > 3 ? "completed" : currentStage === 3 ? "current" : "pending",
      ...(currentStage >= 3 ? { timestamp: order.updatedAt } : {}),
      current: currentStage === 3,
      ...(order.filledSize ? { note: `Filled size: ${order.filledSize}` } : {}),
    },
    {
      id: "settled",
      label: "Settled",
      status: currentStage === 4 ? "current" : "pending",
      ...(order.status === "settled" ? { timestamp: order.updatedAt } : {}),
      current: currentStage === 4,
    },
    {
      id: "closed-with-issue",
      label: "Closed with issue",
      status: currentStage === 5 ? "current" : "pending",
      ...(failureStatuses.has(order.status) ? { timestamp: order.updatedAt } : {}),
      current: currentStage === 5,
      ...(failureStatuses.has(order.status) ? { note: `Order closed with status ${order.status.replace(/_/g, " ")}.` } : {}),
    },
  ];
}

export function buildOrderEvidenceReferences(order: OrderDto | null): TrustReference[] {
  if (!order) {
    return [
      { label: "Order ID" },
      { label: "Reference ID" },
      { label: "Correlation ID" },
    ];
  }

  return [
    { label: "Order ID", value: order.id },
    { label: "Reference ID", value: order.referenceId },
    { label: "Correlation ID", value: order.correlationId },
    { label: "Route ID", ...(order.routeId ? { value: order.routeId } : {}) },
  ];
}

export function resolveOrderRetryable(order: OrderDto | null): boolean | null {
  if (!order) {
    return null;
  }

  if (order.policyDecision === "DENY") {
    return false;
  }

  if (order.status === "settled") {
    return false;
  }

  return true;
}
