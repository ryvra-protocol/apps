import type { ReactNode } from "react";
import { themeTokens } from "./theme";

export interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
