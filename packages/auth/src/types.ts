export enum Role {
  Admin = "admin",
  Member = "member",
  Support = "support",
}

export interface SessionUser {
  id: string;
  email?: string;
  roles: Role[];
}

export interface Session {
  user: SessionUser | null;
  issuedAt: string;
  expiresAt?: string;
}

export interface AuthDecision {
  allowed: boolean;
  reason?: string;
}
