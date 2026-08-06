import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ryvra Pay",
  description: "Pay web platform shell",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "1.5rem",
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        {children}
      </body>
    </html>
  );
}
