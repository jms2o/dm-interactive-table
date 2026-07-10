import { Router, type Request } from "express";
import { z } from "zod";
import type { RollDiceRequest } from "../../../shared/types/dice";
import { diceService } from "../modules/dice/dice.service";

export const diceRouter = Router({ mergeParams: true });

const rollDiceSchema = z.object({
  version: z.literal(1).default(1),
  sessionId: z.string().min(1).optional(),
  formula: z.string().min(1),
  visibility: z.enum(["public", "private", "dm"]).default("public"),
  purpose: z.string().optional(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

diceRouter.post("/roll", async (request, response) => {
  const parsed = rollDiceSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid dice roll request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const roll = await diceService.roll(
      {
        ...parsed.data,
        campaignId: campaignIdFromRequest(request),
      } satisfies RollDiceRequest,
      "http-api",
    );

    response.status(200).json(roll);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Dice roll failed",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
