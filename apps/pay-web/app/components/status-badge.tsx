import { StatusBadge as SharedStatusBadge } from "@ryvra/ui";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <SharedStatusBadge status={status} />;
}
