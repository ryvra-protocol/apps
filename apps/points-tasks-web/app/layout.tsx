import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShellFrame } from "./shell-frame";

export const metadata: Metadata = {
  title: "Ryvra Points/Tasks",
  description: "Points and Tasks web platform shell",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ShellFrame>{children}</ShellFrame>
      </body>
    </html>
  );
}
