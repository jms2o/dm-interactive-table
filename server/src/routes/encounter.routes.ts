import { Router, type Request } from "express";
import { z } from "zod";
import type {
  AdvanceTurnRequest,
  CombatantUpdateRequest,
  CreateEncounterRequest,
} from "../../../shared/types/combat";
import { combatService } from "../modules/combat/combat.service";

export const encounterRouter = Router({ mergeParams: true });

const combatantSchema = z.object({
  tokenId: z.string().min(1).optional(),
  entityType: z.enum(["player", "enemy", "npc", "object"]),
  entityId: z.string().min(1).optional(),
  name: z.string().min(1),
  initiative: z.number().finite().optional(),
  currentHp: z.number().int().optional(),
  temporaryHp: z.number().int().optional(),
  conditions: z.array(z.string()).optional(),
});

const createEncounterSchema = z.object({
  version: z.literal(1).default(1),
  sceneId: z.string().min(1),
  name: z.string().min(1),
  combatants: z.array(combatantSchema).min(1),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

const updateCombatantSchema = z.object({
  version: z.literal(1).default(1),
  currentHp: z.number().int().optional(),
  temporaryHp: z.number().int().optional(),
  conditions: z.array(z.string()).optional(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

encounterRouter.post("/", (request, response) => {
  const parsed = createEncounterSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid encounter request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const encounter = combatService.createEncounter({
      ...parsed.data,
      campaignId: campaignIdFromRequest(request),
    } satisfies CreateEncounterRequest);

    response.status(201).json(encounter);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Encounter failed",
    });
  }
});

encounterRouter.get("/active", (request, response) => {
  const sceneId = String(request.query.sceneId ?? "");

  if (!sceneId) {
    response.status(400).json({
      ok: false,
      error: "sceneId query param is required",
    });
    return;
  }

  const encounter = combatService.getActiveEncounter(
    campaignIdFromRequest(request),
    sceneId,
  );

  if (!encounter) {
    response.status(404).json({
      ok: false,
      error: "Active encounter not found",
    });
    return;
  }

  response.status(200).json(encounter);
});

encounterRouter.post("/:encounterId/turn/advance", (request, response) => {
  try {
    const encounter = combatService.advanceTurn({
      version: 1,
      campaignId: campaignIdFromRequest(request),
      encounterId: request.params.encounterId,
      requestId:
        typeof request.body?.requestId === "string"
          ? request.body.requestId
          : crypto.randomUUID(),
    } satisfies AdvanceTurnRequest);

    response.status(200).json(encounter);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Turn advance failed",
    });
  }
});

encounterRouter.patch("/:encounterId/combatants/:combatantId", (request, response) => {
  const parsed = updateCombatantSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid combatant update",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const encounter = combatService.updateCombatant({
      ...parsed.data,
      campaignId: campaignIdFromRequest(request),
      encounterId: request.params.encounterId,
      combatantId: request.params.combatantId,
    } satisfies CombatantUpdateRequest);

    response.status(200).json(encounter);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error:
        error instanceof Error ? error.message : "Combatant update failed",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
