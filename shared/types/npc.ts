export interface NPCProfile {
  id: string;
  campaignId: string;
  name: string;
  role: string;
  motivation: string;
  voice: string;
  publicNotes: string;
  privateNotes: string;
  secrets: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnemyProfile {
  id: string;
  campaignId: string;
  name: string;
  creatureType: string;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  challengeRating: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNPCRequest {
  name: string;
  role?: string;
  motivation?: string;
  voice?: string;
  publicNotes?: string;
  privateNotes?: string;
  secrets?: string[];
}

export interface CreateEnemyRequest {
  name: string;
  creatureType?: string;
  maxHp?: number;
  currentHp?: number;
  armorClass?: number;
  challengeRating?: string;
}

export interface CreateEntityTokenRequest {
  sceneId: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  visible?: boolean;
}

