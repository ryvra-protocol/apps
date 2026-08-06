import type { AuthDecision, Session } from "./types";
import { Role } from "./types";

export interface AuthGuard {
  authorize(session: Session | null): AuthDecision;
}

export function createStubAuthGuard(allowedRoles: Role[] = [Role.Member]): AuthGuard {
  return {
    authorize(session) {
      if (!session?.user) {
        return { allowed: false, reason: "Missing session" };
      }

      const authorized = session.user.roles.some((role) => allowedRoles.includes(role));

      return authorized
        ? { allowed: true }
        : {
            allowed: false,
            reason: "Role is not permitted by scaffold auth guard",
          };
    },
  };
}
