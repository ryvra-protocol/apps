import type { InvoiceDto, PayoutDto, ReconciliationItemDto } from "@ryvra/domain-payments";
import type { DelegatedOperationContext } from "@ryvra/ui";

const unavailableReason = "Not available in current environment";

function unavailableContext(): DelegatedOperationContext {
  return {
    available: false,
    unavailableReason,
  };
}

export function buildPayoutDelegationContext(_payout: PayoutDto): DelegatedOperationContext {
  void _payout;
  return unavailableContext();
}

export function buildInvoiceDelegationContext(_invoice: InvoiceDto): DelegatedOperationContext {
  void _invoice;
  return unavailableContext();
}

export function buildReconciliationDelegationContext(_item: ReconciliationItemDto): DelegatedOperationContext {
  void _item;
  return unavailableContext();
}

export function supportsPayoutDelegationVisibility(): boolean {
  return false;
}

export function supportsInvoiceDelegationVisibility(): boolean {
  return false;
}

export function supportsReconciliationDelegationVisibility(): boolean {
  return false;
}
