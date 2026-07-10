export type TokenType = "player" | "enemy" | "npc" | "object";

export interface GameToken {
  id: string;
  imageAssetId?: string;
  name: string;
  type: TokenType;
  x: number;
  y: number;
  size: number;
  color: string;
  visible: boolean;
}
