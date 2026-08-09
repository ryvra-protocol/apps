"use client";

import type { PayoutDto } from "@ryvra/domain-payments";
import { mapPayoutStatusNotification, useNotificationCenter } from "@ryvra/ui";
import { useEffect } from "react";

interface PayoutStatusNotificationBridgeProps {
  payouts: Pick<PayoutDto, "id" | "status" | "createdAt" | "completedAt">[];
}

export function PayoutStatusNotificationBridge({ payouts }: PayoutStatusNotificationBridgeProps) {
  const { addNotification } = useNotificationCenter();

  useEffect(() => {
    payouts.forEach((payout) => {
      const mapped = mapPayoutStatusNotification({
        payoutId: payout.id,
        status: payout.status,
        eventKey: `payout:${payout.id}:${payout.status}:${payout.completedAt ?? payout.createdAt}`,
        timestamp: payout.completedAt ?? payout.createdAt,
        routeHref: `/payouts?status=${encodeURIComponent(payout.status)}&ref=notification&entity=payout`,
        retryable: payout.status === "FAILED",
      });

      if (mapped) {
        addNotification(mapped);
      }
    });
  }, [addNotification, payouts]);

  return null;
}
