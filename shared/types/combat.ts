import type { TokenType } from "./token";

export type EncounterStatus = "draft" | "active" | "completed";

export interface CombatantState {
  id: string;
  tokenId?: string;
  entityType: TokenType;
  entityId?: string;
  name: string;
  initiative: number;
  turnOrder: number;
  currentHp?: number;
  temporaryHp?: number;
  conditions: string[];
}

export interface EncounterState {
  id: string;
  version: 1;
  campaignId: string;
  rulesetId: string;
  sceneId: string;
  name: string;
  status: EncounterStatus;
  roundNumber: number;
  activeCombatantId?: string;
  combatants: CombatantState[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEncounterCombatant {
  tokenId?: string;
  entityType: TokenType;
  entityId?: string;
  name: string;
  initiative?: number;
  currentHp?: number;
  temporaryHp?: number;
  conditions?: string[];
}

export interface CreateEncounterRequest {
  version: 1;
  campaignId: string;
  sceneId: string;
  name: string;
  combatants: CreateEncounterCombatant[];
  requestId: string;
}

export interface EncounterAck {
  ok: boolean;
  requestId: string;
  error?: string;
  encounter?: EncounterState;
}

export interface AdvanceTurnRequest {
  version: 1;
  campaignId: string;
  encounterId: string;
  requestId: string;
}

export interface CombatantUpdateRequest {
  version: 1;
  campaignId: string;
  encounterId: string;
  combatantId: string;
  currentHp?: number;
  temporaryHp?: number;
  conditions?: string[];
  requestId: string;
}
