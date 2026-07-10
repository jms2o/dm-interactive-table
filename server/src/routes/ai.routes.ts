import { Router, type Request } from "express";
import { z } from "zod";
import type {
  AIApproveRequest,
  AIGenerateRequest,
} from "../../../shared/types/ai";
import { aiService } from "../modules/ai/ai.service";

export const aiRouter = Router({ mergeParams: true });

const purposeSchema = z.enum([
  "npc",
  "scene",
  "villain",
  "event",
  "summary",
  "encounter",
  "campaign",
]);

const generateSchema = z.object({
  version: z.literal(1).default(1),
  campaignId: z.string().min(1).optional(),
  purpose: purposeSchema,
  prompt: z.string().min(1).max(4000),
  contextIds: z.array(z.string().min(1)).optional(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

const approveSchema = z.object({
  version: z.literal(1).default(1),
  approved: z.boolean(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

aiRouter.post("/generate", (request, response) => {
  const parsed = generateSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid AI generation request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const result = aiService.generate(
      {
        ...parsed.data,
        campaignId: campaignIdFromRequest(request),
      } satisfies AIGenerateRequest,
      "http-api",
    );

    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "AI generation failed",
    });
  }
});

aiRouter.get("/runs", (request, response) => {
  response
    .status(200)
    .json(aiService.listPromptRuns(campaignIdFromRequest(request)));
});

aiRouter.post("/runs/:promptRunId/approve", (request, response) => {
  const parsed = approveSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid AI approval request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const result = aiService.approve({
      ...parsed.data,
      campaignId: campaignIdFromRequest(request),
      promptRunId: request.params.promptRunId,
    } satisfies AIApproveRequest);

    response.status(200).json(result);
  } catch (error) {
    response.status(404).json({
      ok: false,
      error: error instanceof Error ? error.message : "Prompt run not found",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
