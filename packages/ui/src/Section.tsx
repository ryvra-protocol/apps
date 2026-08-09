import type { ReactNode } from "react";
import { themeTokens } from "./theme";

export interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.xl }}>
      <header style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <h2
          style={{
            margin: 0,
            fontSize: themeTokens.typography.size.xl,
            fontWeight: themeTokens.typography.weight.semibold,
            lineHeight: themeTokens.typography.lineHeight.tight,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            style={{
              margin: 0,
              color: themeTokens.color.textMuted,
              fontSize: themeTokens.typography.size.sm,
              lineHeight: themeTokens.typography.lineHeight.relaxed,
              maxWidth: "80ch",
            }}
          >
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
