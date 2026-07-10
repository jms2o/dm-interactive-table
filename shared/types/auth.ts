import type { ClientRole } from "./realtime";

export type AuthPrincipal = {
  id: string;
  displayName: string;
  role: ClientRole;
  campaignId: string;
  sessionId?: string;
  accessGrantId?: string;
  isAdmin: boolean;
  expiresAt: string;
};

export type AuthSessionResponse = {
  principal: AuthPrincipal;
  socketToken: string;
};

export type AuthStatusResponse = {
  setupRequired: boolean;
  persistence: "local" | "prisma";
};

export type TableAccessGrant = {
  code: string;
  campaignId: string;
  sessionId?: string;
  playerEnabled: boolean;
  displayEnabled: boolean;
  expiresAt: string;
};

export type TableAccessStatus = {
  active: boolean;
  campaignId: string;
  sessionId?: string;
  playerEnabled?: boolean;
  displayEnabled?: boolean;
  expiresAt?: string;
};

export type NetworkOrigin = {
  label: string;
  url: string;
  source: "current" | "configured" | "network";
};

export type NetworkInfoResponse = {
  origins: NetworkOrigin[];
};
