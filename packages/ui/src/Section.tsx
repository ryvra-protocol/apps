import type { ReactNode } from "react";
import { themeTokens } from "./theme";

export interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <header style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <h2
          style={{
            margin: 0,
            fontSize: themeTokens.typography.size.xl,
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
              fontSize: themeTokens.typography.size.md,
              lineHeight: themeTokens.typography.lineHeight.relaxed,
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
