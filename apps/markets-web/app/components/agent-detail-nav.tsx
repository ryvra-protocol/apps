import { themeTokens } from "@ryvra/ui";

interface AgentDetailNavProps {
  agentId: string;
  query?: string;
}

const links = [
  { href: "", label: "Summary" },
  { href: "/activity", label: "Activity" },
  { href: "/mandate", label: "Mandate" },
  { href: "/permissions", label: "Permissions" },
  { href: "/risk", label: "Risk" },
  { href: "/audit", label: "Audit" },
] as const;

export function AgentDetailNav({ agentId, query }: AgentDetailNavProps) {
  const suffix = query && query.length > 0 ? `?${query}` : "";

  return (
    <nav aria-label="Agent detail sections" style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
      {links.map((item) => (
        <a
          key={item.label}
          href={`/agents/${agentId}${item.href}${suffix}`}
          style={{
            border: `1px solid ${themeTokens.color.borderStrong}`,
            borderRadius: themeTokens.radius.md,
            textDecoration: "none",
            color: themeTokens.color.text,
            padding: `${themeTokens.spacing.xs} ${themeTokens.spacing.md}`,
            fontSize: themeTokens.typography.size.sm,
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
