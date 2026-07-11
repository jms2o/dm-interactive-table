import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { authService } from "../security";
import { campaignService } from "../modules/campaign/campaign.service";
import { handleSecurityError, requireAuth } from "../security/http-auth";
import { setTableSessionCookie } from "./auth.routes";

const joinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiados códigos probados. Espera unos minutos.",
    },
  },
});

const joinSchema = z.object({
  code: z.string().trim().min(6).max(12),
  role: z.enum(["player", "display"]),
  displayName: z.string().trim().min(2).max(80).optional(),
});

const createSchema = z.object({
  campaignId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  playerEnabled: z.boolean().default(true),
  displayEnabled: z.boolean().default(true),
  ttlMinutes: z.number().int().min(15).max(1440).optional(),
});

const campaignQuerySchema = z.object({
  campaignId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export const tableAccessRouter = Router();

tableAccessRouter.post(
  "/join",
  joinLimiter,
  asyncHandler(async (request, response) => {
    const session = await authService.joinTable(joinSchema.parse(request.body));
    setTableSessionCookie(response, session);
    response.status(200).json(session);
  }),
);

tableAccessRouter.use(requireAuth);

tableAccessRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const principal = requirePrincipal(request);
    const input = createSchema.parse(request.body);
    const sessionId = input.sessionId ?? principal.sessionId;
    if (
      !sessionId ||
      !campaignService.getSession(input.campaignId, sessionId)
    ) {
      response.status(404).json({
        error: { code: "SESSION_NOT_FOUND", message: "La sesion no existe" },
      });
      return;
    }
    const grant = await authService.createTableAccess(
      principal,
      { ...input, sessionId },
    );
    response.status(201).json(grant);
  }),
);

tableAccessRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { campaignId, sessionId } = campaignQuerySchema.parse(request.query);
    response
      .status(200)
      .json(
        await authService.getTableAccessStatus(
          requirePrincipal(request),
          campaignId,
          sessionId,
        ),
      );
  }),
);

tableAccessRouter.delete(
  "/",
  asyncHandler(async (request, response) => {
    const { campaignId } = campaignQuerySchema.parse(request.query);
    await authService.revokeTableAccess(
      requirePrincipal(request),
      campaignId,
    );
    response.status(204).end();
  }),
);

function requirePrincipal(request: Request) {
  if (!request.auth) {
    throw new Error("AUTH_CONTEXT_MISSING");
  }

  return request.auth;
}

function asyncHandler(
  handler: (request: Request, response: Response) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch((error) => {
      if (error instanceof z.ZodError) {
        response.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Revisa los datos enviados",
            details: error.issues,
          },
        });
        return;
      }

      handleSecurityError(error, response, next);
    });
  };
}
