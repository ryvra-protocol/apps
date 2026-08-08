import { themeTokens } from "@ryvra/ui";

interface StatusBadgeProps {
  status: string;
}

function resolveStatusColor(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (
    normalized.includes("filled") ||
    normalized.includes("settled") ||
    normalized.includes("active") ||
    normalized.includes("tradable") ||
    normalized.includes("pass") ||
    normalized.includes("open")
  ) {
    return "#2f855a";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("denied") ||
    normalized.includes("rejected") ||
    normalized.includes("halted") ||
    normalized.includes("suspended") ||
    normalized.includes("critical") ||
    normalized.includes("breached") ||
    normalized.includes("fail")
  ) {
    return "#b83232";
  }

  if (
    normalized.includes("review") ||
    normalized.includes("watch") ||
    normalized.includes("partial") ||
    normalized.includes("created") ||
    normalized.includes("routed") ||
    normalized.includes("reducing") ||
    normalized.includes("degraded") ||
    normalized.includes("medium") ||
    normalized.includes("high")
  ) {
    return "#975a16";
  }

  return themeTokens.color.textMuted;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: themeTokens.radius.pill,
        border: `1px solid ${themeTokens.color.border}`,
        padding: `${themeTokens.spacing.xs} ${themeTokens.spacing.sm}`,
        fontSize: themeTokens.typography.size.xs,
        fontWeight: themeTokens.typography.weight.semibold,
        color: resolveStatusColor(status),
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {status}
    </span>
  );
}
