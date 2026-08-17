import type { ReactNode } from "react";
import { themeTokens } from "./theme";

export type CardTone = "default" | "highlight" | "muted";

export interface CardProps {
  title?: string;
  children: ReactNode;
  tone?: CardTone;
}

function resolveCardPalette(tone: CardTone): { background: string; border: string } {
  if (tone === "highlight") {
    return {
      background: themeTokens.color.primarySurface,
      border: themeTokens.color.primaryBorder,
    };
  }

  if (tone === "muted") {
    return {
      background: themeTokens.color.surfaceMuted,
      border: themeTokens.color.borderStrong,
    };
  }

  return {
    background: themeTokens.color.surface,
    border: themeTokens.color.border,
  };
}

export function Card({ title, children, tone = "default" }: CardProps) {
  const palette = resolveCardPalette(tone);

  return (
    <article
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: themeTokens.radius.lg,
        padding: themeTokens.spacing.lg,
        background: palette.background,
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
