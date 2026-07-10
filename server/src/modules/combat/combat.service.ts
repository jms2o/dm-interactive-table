import type {
  AdvanceTurnRequest,
  CombatantState,
  CombatantUpdateRequest,
  CreateEncounterRequest,
  EncounterState,
} from "../../../../shared/types/combat";
import { rulesetService } from "../ruleset/ruleset.service";

export class CombatService {
  private encounters = new Map<string, EncounterState>();
  private activeByScene = new Map<string, string>();

  createEncounter(request: CreateEncounterRequest): EncounterState {
    if (request.combatants.length === 0) {
      throw new Error("Encounter requires at least one combatant");
    }

    const now = new Date().toISOString();
    const ruleset = rulesetService.getCampaignRuleset(request.campaignId).ruleset;
    const combatants = request.combatants
      .map((combatant, index): CombatantState => ({
        id: crypto.randomUUID(),
        tokenId: combatant.tokenId,
        entityType: combatant.entityType,
        entityId: combatant.entityId,
        name: combatant.name,
        initiative: combatant.initiative ?? 0,
        turnOrder: index,
        currentHp: combatant.currentHp,
        temporaryHp: combatant.temporaryHp,
        conditions: normalizeConditions(
          combatant.conditions ?? [],
          ruleset.combat.conditions.map((condition) => condition.id),
        ),
      }))
      .sort(sortByInitiative)
      .map((combatant, index) => ({
        ...combatant,
        turnOrder: index,
      }));

    const encounter: EncounterState = {
      id: crypto.randomUUID(),
      version: 1,
      campaignId: request.campaignId,
      rulesetId: ruleset.id,
      sceneId: request.sceneId,
      name: request.name.trim() || "Encuentro sin nombre",
      status: "active",
      roundNumber: 1,
      activeCombatantId: combatants[0]?.id,
      combatants,
      createdAt: now,
      updatedAt: now,
    };

    this.encounters.set(encounter.id, encounter);
    this.activeByScene.set(this.sceneKey(request.campaignId, request.sceneId), encounter.id);
    return cloneEncounter(encounter);
  }

  getActiveEncounter(campaignId: string, sceneId: string) {
    const encounterId = this.activeByScene.get(this.sceneKey(campaignId, sceneId));
    if (!encounterId) {
      return null;
    }

    const encounter = this.encounters.get(encounterId);
    return encounter ? cloneEncounter(encounter) : null;
  }

  advanceTurn(request: AdvanceTurnRequest): EncounterState {
    const encounter = this.requireEncounter(request.campaignId, request.encounterId);

    if (encounter.status !== "active") {
      throw new Error("Encounter is not active");
    }

    const currentIndex = Math.max(
      0,
      encounter.combatants.findIndex(
        (combatant) => combatant.id === encounter.activeCombatantId,
      ),
    );
    const nextIndex = (currentIndex + 1) % encounter.combatants.length;
    const nextRound = nextIndex === 0 ? encounter.roundNumber + 1 : encounter.roundNumber;

    const updated: EncounterState = {
      ...encounter,
      roundNumber: nextRound,
      activeCombatantId: encounter.combatants[nextIndex]?.id,
      updatedAt: new Date().toISOString(),
    };

    this.encounters.set(updated.id, updated);
    return cloneEncounter(updated);
  }

  updateCombatant(request: CombatantUpdateRequest): EncounterState {
    const encounter = this.requireEncounter(request.campaignId, request.encounterId);
    const ruleset = rulesetService.getCampaignRuleset(request.campaignId).ruleset;
    const combatantIndex = encounter.combatants.findIndex(
      (combatant) => combatant.id === request.combatantId,
    );

    if (combatantIndex < 0) {
      throw new Error("Combatant not found");
    }

    const combatants = encounter.combatants.map((combatant, index) => {
      if (index !== combatantIndex) {
        return combatant;
      }

      return {
        ...combatant,
        currentHp: request.currentHp ?? combatant.currentHp,
        temporaryHp: request.temporaryHp ?? combatant.temporaryHp,
        conditions: request.conditions
          ? normalizeConditions(
              request.conditions,
              ruleset.combat.conditions.map((condition) => condition.id),
            )
          : combatant.conditions,
      };
    });

    const updated: EncounterState = {
      ...encounter,
      combatants,
      updatedAt: new Date().toISOString(),
    };

    this.encounters.set(updated.id, updated);
    return cloneEncounter(updated);
  }

  private requireEncounter(campaignId: string, encounterId: string) {
    const encounter = this.encounters.get(encounterId);

    if (!encounter || encounter.campaignId !== campaignId) {
      throw new Error("Encounter not found");
    }

    return encounter;
  }

  private sceneKey(campaignId: string, sceneId: string) {
    return `${campaignId}:${sceneId}`;
  }
}

export const combatService = new CombatService();

function sortByInitiative(left: CombatantState, right: CombatantState) {
  if (right.initiative !== left.initiative) {
    return right.initiative - left.initiative;
  }

  return left.name.localeCompare(right.name);
}

function cloneEncounter(encounter: EncounterState): EncounterState {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) => ({
      ...combatant,
      conditions: [...combatant.conditions],
    })),
  };
}

function normalizeConditions(conditions: string[], allowedIds: string[]) {
  const allowed = new Set(allowedIds);
  const normalized = conditions
    .map((condition) => condition.trim().toLowerCase())
    .filter(Boolean);
  const unknown = normalized.filter((condition) => !allowed.has(condition));

  if (unknown.length > 0) {
    throw new Error(`Unsupported condition for active ruleset: ${unknown[0]}`);
  }

  return [...new Set(normalized)];
}
