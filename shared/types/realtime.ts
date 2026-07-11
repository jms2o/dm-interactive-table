import type { GameScene } from "./game";
import type { VisionHistoryState } from "./table-experience";
import type { GameHistoryState } from "./session-workflow";

export type ClientRole = "dm" | "display" | "player";

export type EventVisibility = "public" | "dm";

export interface ClientJoinCommand {
  version: 1;
  campaignId: string;
  sessionId?: string;
  sceneId: string;
  role: ClientRole;
}

export interface PublicSceneState extends GameScene {}

export interface GameStatePayload {
  version: 1;
  campaignId: string;
  sessionId?: string;
  sceneId?: string;
  scene?: PublicSceneState;
  visionHistory?: VisionHistoryState;
  history?: GameHistoryState;
  updatedAt: string;
}

export interface TokenMoveCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  tokenId: string;
  position: {
    x: number;
    y: number;
  };
  requestId: string;
}

export interface TokenMoveAck {
  ok: boolean;
  requestId: string;
  error?: string;
  token?: {
    id: string;
    x: number;
    y: number;
  };
}

export interface TokenMovedEvent {
  version: 1;
  sceneId: string;
  tokenId: string;
  x: number;
  y: number;
  movedBy: string;
  updatedAt: string;
}

export interface NarrativeUpdateCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  text: string;
  visibility: EventVisibility;
  requestId: string;
}

export interface NarrativeUpdateAck {
  ok: boolean;
  requestId: string;
  error?: string;
}

export interface NarrativeUpdatedEvent {
  version: 1;
  sceneId: string;
  text: string;
  visibility: EventVisibility;
  updatedBy: string;
  updatedAt: string;
}

export interface RealtimeError {
  code: string;
  message: string;
  requestId?: string;
  retryable: boolean;
}
