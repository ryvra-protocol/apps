export const themeTokens = {
  color: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#e2e8f0",
    primary: "#38bdf8",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
  },
} as const;

export type ThemeTokens = typeof themeTokens;
