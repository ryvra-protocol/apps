import type { ReactNode } from "react";
import { themeTokens } from "./theme";

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <article
      style={{
        border: `1px solid ${themeTokens.color.border}`,
        borderRadius: themeTokens.radius.lg,
        padding: themeTokens.spacing.lg,
        background: themeTokens.color.surface,
        boxShadow: themeTokens.shadow.sm,
        display: "grid",
        gap: themeTokens.spacing.sm,
      }}
    >
      {title ? (
        <h3
          style={{
            margin: 0,
            fontSize: themeTokens.typography.size.md,
            fontWeight: themeTokens.typography.weight.semibold,
            lineHeight: themeTokens.typography.lineHeight.tight,
          }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </article>
  );
}
