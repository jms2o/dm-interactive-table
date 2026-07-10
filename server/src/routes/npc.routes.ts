import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { TokenType } from "../../../shared/types/token";
import { gameState } from "../game/game.state";
import { npcService } from "../modules/npc/npc.service";

export const npcRouter = Router({ mergeParams: true });
export const enemyRouter = Router({ mergeParams: true });

const createNPCSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  motivation: z.string().optional(),
  voice: z.string().optional(),
  publicNotes: z.string().optional(),
  privateNotes: z.string().optional(),
  secrets: z.array(z.string()).optional(),
});

const createEnemySchema = z.object({
  name: z.string().min(1),
  creatureType: z.string().optional(),
  maxHp: z.number().int().positive().optional(),
  currentHp: z.number().int().optional(),
  armorClass: z.number().int().positive().optional(),
  challengeRating: z.string().optional(),
});

const createTokenSchema = z.object({
  sceneId: z.string().min(1),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  size: z.number().positive().optional(),
  color: z.string().optional(),
  visible: z.boolean().optional(),
});

npcRouter.get("/", (request, response) => {
  response.status(200).json(npcService.listNPCs(campaignIdFromRequest(request)));
});

npcRouter.post("/", (request, response) => {
  const parsed = createNPCSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid NPC request" });
    return;
  }

  response
    .status(201)
    .json(npcService.createNPC(campaignIdFromRequest(request), parsed.data));
});

npcRouter.post("/:npcId/token", (request, response) => {
  createEntityToken(request, response, "npc");
});

enemyRouter.get("/", (request, response) => {
  response
    .status(200)
    .json(npcService.listEnemies(campaignIdFromRequest(request)));
});

enemyRouter.post("/", (request, response) => {
  const parsed = createEnemySchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid enemy request" });
    return;
  }

  response
    .status(201)
    .json(npcService.createEnemy(campaignIdFromRequest(request), parsed.data));
});

enemyRouter.post("/:enemyId/token", (request, response) => {
  createEntityToken(request, response, "enemy");
});

function createEntityToken(
  request: Request,
  response: Response,
  type: Extract<TokenType, "npc" | "enemy">,
) {
  const parsed = createTokenSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid token request" });
    return;
  }

  const campaignId = campaignIdFromRequest(request);
  const entity =
    type === "npc"
      ? npcService.getNPC(campaignId, String(request.params.npcId))
      : npcService.getEnemy(campaignId, String(request.params.enemyId));

  if (!entity) {
    response.status(404).json({ ok: false, error: "Entity not found" });
    return;
  }

  const token = gameState.addTokenToScene({
    campaignId,
    sceneId: parsed.data.sceneId,
    entityId: entity.id,
    name: entity.name,
    type,
    x: parsed.data.x ?? 560,
    y: parsed.data.y ?? 420,
    size: parsed.data.size ?? 1,
    color: parsed.data.color ?? (type === "npc" ? "#a78bfa" : "#f97316"),
    visible: parsed.data.visible ?? true,
  });

  if (!token) {
    response.status(404).json({ ok: false, error: "Scene not found" });
    return;
  }

  response.status(201).json(token);
}

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
