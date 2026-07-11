export type CampaignStatus = "draft" | "active" | "archived";

export interface WorldSummary {
  id: string;
  name: string;
  description: string;
  systemTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSummary {
  id: string;
  worldId?: string;
  name: string;
  description: string;
  ruleset: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GameSessionSummary {
  id: string;
  campaignId: string;
  title: string;
  phase: import("./session-workflow").SessionPhase;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  summaryPublic: string;
  summaryPrivate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorldRequest {
  name: string;
  description?: string;
  systemTags?: string[];
}

export interface CreateCampaignRequest {
  worldId?: string;
  name: string;
  description?: string;
  ruleset?: string;
  status?: CampaignStatus;
}

export interface CreateGameSessionRequest {
  title: string;
  scheduledAt?: string;
}
