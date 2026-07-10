export type RollVisibility = "public" | "private" | "dm";

export interface RollDiceRequest {
  version: 1;
  campaignId: string;
  sessionId?: string;
  formula: string;
  visibility: RollVisibility;
  purpose?: string;
  requestId: string;
}

export interface DiceRollDieBreakdown {
  notation: string;
  sides: number;
  rolls: number[];
}

export interface DiceRollResult {
  id: string;
  version: 1;
  campaignId: string;
  sessionId?: string;
  formula: string;
  normalizedFormula: string;
  output: string;
  resultTotal: number;
  breakdown: DiceRollDieBreakdown[];
  visibility: RollVisibility;
  purpose?: string;
  rolledBy: string;
  createdAt: string;
}

export interface DiceRollAck {
  ok: boolean;
  requestId: string;
  error?: string;
  roll?: DiceRollResult;
}

