import { Router, type Request } from "express";
import { z } from "zod";
import type { UpdatePlayerCharacterSheet } from "../../../shared/types/session-workflow";
import { sessionWorkflowService } from "../modules/session/session-workflow.service";
import { authService } from "../security";

export const sessionWorkflowRouter = Router({ mergeParams: true });

const endSessionSchema = z.object({
  summaryPublic: z.string().max(5000).optional(),
  summaryPrivate: z.string().max(5000).optional(),
});

const resourcesSchema = z.record(
  z.string().trim().min(1).max(40),
  z.number().int().min(0).max(999),
);

const characterPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    ancestry: z.string().trim().max(80).optional(),
    className: z.string().trim().max(80).optional(),
    level: z.number().int().min(1).max(30).optional(),
    maxHp: z.number().int().min(1).max(9999).optional(),
    currentHp: z.number().int().min(0).max(9999).optional(),
    temporaryHp: z.number().int().min(0).max(9999).optional(),
    armorClass: z.number().int().min(0).max(99).optional(),
    notes: z.string().max(5000).optional(),
    resources: resourcesSchema.optional(),
  })
  .strict();

sessionWorkflowRouter.get("/", (request, response) => {
  try {
    response.status(200).json(
      sessionWorkflowService.getWorkflow(
        campaignIdFromRequest(request),
        request.auth,
      ),
    );
  } catch (error) {
    sendWorkflowError(response, error);
  }
});

sessionWorkflowRouter.post("/sessions/:sessionId/start", async (request, response) => {
  try {
    response.status(200).json({
      session: await sessionWorkflowService.startSession(
        campaignIdFromRequest(request),
        sessionIdFromRequest(request),
      ),
    });
  } catch (error) {
    sendWorkflowError(response, error);
  }
});

sessionWorkflowRouter.post("/sessions/:sessionId/end", async (request, response) => {
  const parsed = endSessionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Revisa los resumenes" },
    });
    return;
  }

  try {
    const campaignId = campaignIdFromRequest(request);
    const session = await sessionWorkflowService.endSession(
      campaignId,
      sessionIdFromRequest(request),
      parsed.data,
    );
    await authService.revokeTableAccess(request.auth!, campaignId, {
      disconnect: false,
    });
    response.status(200).json({
      session,
    });
  } catch (error) {
    sendWorkflowError(response, error);
  }
});

sessionWorkflowRouter.post(
  "/sessions/:sessionId/reopen",
  async (request, response) => {
    try {
      response.status(200).json({
        session: await sessionWorkflowService.reopenSession(
          campaignIdFromRequest(request),
          sessionIdFromRequest(request),
        ),
      });
    } catch (error) {
      sendWorkflowError(response, error);
    }
  },
);

sessionWorkflowRouter.get("/character-sheet", async (request, response, next) => {
  if (request.auth?.role !== "player") {
    response.status(403).json({
      error: { code: "ROLE_ACCESS_DENIED", message: "Solo disponible para jugador" },
    });
    return;
  }
  try {
    response.status(200).json(
      await sessionWorkflowService.getCharacterSheet(
        request.auth!,
        campaignIdFromRequest(request),
      ),
    );
  } catch (error) {
    next(error);
  }
});

sessionWorkflowRouter.patch(
  "/character-sheet",
  async (request, response, next) => {
    if (request.auth?.role !== "player") {
      response.status(403).json({
        error: { code: "ROLE_ACCESS_DENIED", message: "Solo disponible para jugador" },
      });
      return;
    }
    const parsed = characterPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos de la hoja",
          details: parsed.error.issues,
        },
      });
      return;
    }

    try {
      response.status(200).json(
        await sessionWorkflowService.updateCharacterSheet(
          request.auth!,
          campaignIdFromRequest(request),
          parsed.data as UpdatePlayerCharacterSheet,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}

function sessionIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).sessionId);
}

function sendWorkflowError(
  response: import("express").Response,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "Workflow failed";
  const conflict = message === "Another session is already live";
  response.status(conflict ? 409 : 404).json({
    error: {
      code: conflict ? "SESSION_ALREADY_LIVE" : "WORKFLOW_NOT_FOUND",
      message,
    },
  });
}
