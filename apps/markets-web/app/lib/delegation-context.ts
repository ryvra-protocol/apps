import type { OrderDto } from "@ryvra/domain-markets";
import type { DelegatedOperationContext } from "@ryvra/ui";

const unavailableReason = "Not available in current environment";

export function buildOrderDelegationContext(order: OrderDto): DelegatedOperationContext {
  return {
    available: false,
    accountId: order.accountId,
    unavailableReason,
  };
}

export function supportsOrderDelegationVisibility(_orders: readonly OrderDto[] = []): boolean {
  void _orders;
  return false;
}
