export type AIGenerationPurpose =
  | "npc"
  | "scene"
  | "villain"
  | "event"
  | "summary"
  | "encounter"
  | "campaign";

export type AIGenerationProvider = "local-draft";

export type AIJsonPrimitive = string | number | boolean | null;

export type AIJsonValue =
  | AIJsonPrimitive
  | AIJsonValue[]
  | { [key: string]: AIJsonValue };

export type AIDraft = Record<string, AIJsonValue>;

export interface AIGenerateRequest {
  version: 1;
  campaignId: string;
  purpose: AIGenerationPurpose;
  prompt: string;
  contextIds?: string[];
  requestId: string;
}

export interface AIPromptRun {
  id: string;
  version: 1;
  campaignId: string;
  requestId: string;
  purpose: AIGenerationPurpose;
  prompt: string;
  contextIds: string[];
  provider: AIGenerationProvider;
  model: string;
  draft: AIDraft;
  warnings: string[];
  approved: boolean;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface AIGenerateResponse {
  promptRunId: string;
  provider: AIGenerationProvider;
  model: string;
  purpose: AIGenerationPurpose;
  draft: AIDraft;
  warnings: string[];
  approved: boolean;
  createdAt: string;
}

export interface AIApproveRequest {
  version: 1;
  campaignId: string;
  promptRunId: string;
  approved: boolean;
  requestId: string;
}

export interface AIApproveResponse {
  promptRunId: string;
  approved: boolean;
  approvedAt?: string;
  updatedAt: string;
}
