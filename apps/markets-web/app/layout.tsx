import type { Metadata } from "next";
import { roleClaimsFromSession, resolveStubSessionFromEnv } from "@ryvra/auth";
import { Suspense, type ReactNode } from "react";
import { ShellFrame } from "./shell-frame";

export const metadata: Metadata = {
  title: "Ryvra Markets",
  description: "Markets web platform shell",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const defaultWorkspaceId = process.env.RYVRA_DEFAULT_WORKSPACE_ID?.trim() || "workspace-core-1";
  const defaultAccountId = process.env.RYVRA_MARKETS_ACCOUNT_ID?.trim() || "acct-core-1";
  const session = resolveStubSessionFromEnv({
    defaultUserId: process.env.RYVRA_DEFAULT_USER_ID?.trim() || "user-core-1",
  });
  const roleClaims = roleClaimsFromSession(session);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Suspense fallback={<div>{children}</div>}>
          <ShellFrame
            roleClaims={roleClaims}
            defaultAccountId={defaultAccountId}
            defaultWorkspaceId={defaultWorkspaceId}
            sessionUserId={session.user?.id ?? "user-core-1"}
          >
            {children}
          </ShellFrame>
        </Suspense>
      </body>
    </html>
  );
}
