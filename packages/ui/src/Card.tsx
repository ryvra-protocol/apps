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
        border: `1px solid ${themeTokens.color.surface}`,
        borderRadius: themeTokens.radius.md,
        padding: themeTokens.spacing.md,
        background: themeTokens.color.surface,
      }}
    >
      {title ? <h3>{title}</h3> : null}
      {children}
    </article>
  );
}
