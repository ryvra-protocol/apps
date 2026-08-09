export const NAV_ICON_SIZE = 18;
export const NAV_ICON_VIEW_BOX = "0 0 24 24";
export const NAV_ICON_STROKE_WIDTH = 1.8;

export const navIconNames = [
  "overview",
  "dashboard",
  "pay",
  "markets",
  "points",
  "tasks",
  "invoices",
  "payouts",
  "reconciliation",
  "instruments",
  "orders",
  "positions",
  "status",
  "default",
] as const;

export type NavIconName = (typeof navIconNames)[number];

export function resolveNavIconName(itemId: string): NavIconName {
  const normalized = itemId.trim().toLowerCase();

  if (normalized === "overview") {
    return "overview";
  }

  if (normalized === "pay") {
    return "pay";
  }

  if (normalized === "markets") {
    return "markets";
  }

  if (normalized === "points" || normalized === "points-ledger") {
    return "points";
  }

  if (normalized === "tasks") {
    return "tasks";
  }

  if (normalized.startsWith("pay-")) {
    const suffix = normalized.slice("pay-".length);
    if (suffix === "dashboard") {
      return "dashboard";
    }
    if (suffix === "invoices") {
      return "invoices";
    }
    if (suffix === "payouts") {
      return "payouts";
    }
    if (suffix === "reconciliation") {
      return "reconciliation";
    }
    return "pay";
  }

  if (normalized.startsWith("markets-")) {
    const suffix = normalized.slice("markets-".length);
    if (suffix === "dashboard") {
      return "dashboard";
    }
    if (suffix === "instruments") {
      return "instruments";
    }
    if (suffix === "orders") {
      return "orders";
    }
    if (suffix === "positions") {
      return "positions";
    }
    return "markets";
  }

  if (normalized.startsWith("points-")) {
    const suffix = normalized.slice("points-".length);
    if (suffix === "dashboard") {
      return "dashboard";
    }
    if (suffix === "tasks") {
      return "tasks";
    }
    if (suffix === "status") {
      return "status";
    }
    if (suffix === "ledger") {
      return "points";
    }
    return "points";
  }

  if (normalized.endsWith("status")) {
    return "status";
  }

  return "default";
}
