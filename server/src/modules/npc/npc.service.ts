import type {
  CreateEnemyRequest,
  CreateNPCRequest,
  EnemyProfile,
  NPCProfile,
} from "../../../../shared/types/npc";

export class NPCService {
  private npcs = new Map<string, NPCProfile>();
  private enemies = new Map<string, EnemyProfile>();

  listNPCs(campaignId: string) {
    return [...this.npcs.values()]
      .filter((npc) => npc.campaignId === campaignId)
      .map(cloneNPC);
  }

  getNPC(campaignId: string, npcId: string) {
    const npc = this.npcs.get(npcId);
    return npc?.campaignId === campaignId ? cloneNPC(npc) : null;
  }

  createNPC(campaignId: string, request: CreateNPCRequest) {
    const now = new Date().toISOString();
    const npc: NPCProfile = {
      id: crypto.randomUUID(),
      campaignId,
      name: request.name.trim(),
      role: request.role?.trim() ?? "",
      motivation: request.motivation?.trim() ?? "",
      voice: request.voice?.trim() ?? "",
      publicNotes: request.publicNotes?.trim() ?? "",
      privateNotes: request.privateNotes?.trim() ?? "",
      secrets: request.secrets ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.npcs.set(npc.id, npc);
    return cloneNPC(npc);
  }

  importNPCCopy(campaignId: string, source: NPCProfile) {
    const now = new Date().toISOString();
    const npc: NPCProfile = {
      ...source,
      id: crypto.randomUUID(),
      campaignId,
      secrets: [...source.secrets],
      createdAt: now,
      updatedAt: now,
    };

    this.npcs.set(npc.id, npc);
    return cloneNPC(npc);
  }

  listEnemies(campaignId: string) {
    return [...this.enemies.values()]
      .filter((enemy) => enemy.campaignId === campaignId)
      .map(cloneEnemy);
  }

  getEnemy(campaignId: string, enemyId: string) {
    const enemy = this.enemies.get(enemyId);
    return enemy?.campaignId === campaignId ? cloneEnemy(enemy) : null;
  }

  createEnemy(campaignId: string, request: CreateEnemyRequest) {
    const now = new Date().toISOString();
    const maxHp = request.maxHp ?? 7;
    const enemy: EnemyProfile = {
      id: crypto.randomUUID(),
      campaignId,
      name: request.name.trim(),
      creatureType: request.creatureType?.trim() ?? "creature",
      maxHp,
      currentHp: request.currentHp ?? maxHp,
      armorClass: request.armorClass ?? 10,
      challengeRating: request.challengeRating?.trim() ?? "0",
      createdAt: now,
      updatedAt: now,
    };

    this.enemies.set(enemy.id, enemy);
    return cloneEnemy(enemy);
  }

  importEnemyCopy(campaignId: string, source: EnemyProfile) {
    const now = new Date().toISOString();
    const enemy: EnemyProfile = {
      ...source,
      id: crypto.randomUUID(),
      campaignId,
      createdAt: now,
      updatedAt: now,
    };

    this.enemies.set(enemy.id, enemy);
    return cloneEnemy(enemy);
  }
}

export const npcService = new NPCService();

function cloneNPC(npc: NPCProfile): NPCProfile {
  return {
    ...npc,
    secrets: [...npc.secrets],
  };
}

function cloneEnemy(enemy: EnemyProfile): EnemyProfile {
  return { ...enemy };
}
