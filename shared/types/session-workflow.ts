import type { CampaignSummary, GameSessionSummary } from "./campaign";

export type SessionPhase = "preparation" | "live" | "ended";

export type SessionParticipant = {
  id: string;
  displayName: string;
  role: "dm" | "player" | "display";
  connectedAt: string;
};

export type SessionWorkflowState = {
  campaign: CampaignSummary;
  sessions: GameSessionSummary[];
  participantsBySession: Record<string, SessionParticipant[]>;
};

export type SessionLifecycleResponse = {
  session: GameSessionSummary;
};

export type PlayerCharacterSheet = {
  id: string;
  campaignId: string;
  playerKey: string;
  name: string;
  ancestry: string;
  className: string;
  level: number;
  maxHp: number;
  currentHp: number;
  temporaryHp: number;
  armorClass: number;
  notes: string;
  resources: Record<string, number>;
  updatedAt: string;
};

export type UpdatePlayerCharacterSheet = Partial<
  Pick<
    PlayerCharacterSheet,
    | "name"
    | "ancestry"
    | "className"
    | "level"
    | "maxHp"
    | "currentHp"
    | "temporaryHp"
    | "armorClass"
    | "notes"
    | "resources"
  >
>;

export type NamedGameSnapshot = {
  id: string;
  campaignId: string;
  sessionId: string;
  sceneId: string;
  name: string;
  createdAt: string;
};

export type GameHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
  snapshots: NamedGameSnapshot[];
};

export type HistoryCommand = {
  version: 1;
  campaignId: string;
  sessionId: string;
  requestId: string;
};

export type CreateHistorySnapshotCommand = HistoryCommand & {
  name: string;
};

export type RestoreHistorySnapshotCommand = HistoryCommand & {
  snapshotId: string;
};

export type HistoryActionAck = {
  ok: boolean;
  requestId: string;
  error?: string;
  history?: GameHistoryState;
};
