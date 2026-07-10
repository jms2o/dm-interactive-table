import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { AuthSessionResponse } from "../../../shared/types/auth";
import { env } from "../config/env";
import { authService } from "../security";
import {
  DM_SESSION_COOKIE,
  handleSecurityError,
  TABLE_SESSION_COOKIE,
  tokenFromRequest,
} from "../security/http-auth";

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiados intentos. Espera unos minutos.",
    },
  },
});

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const authRouter = Router();

authRouter.get("/status", asyncHandler(async (_request, response) => {
  response.status(200).json(await authService.getStatus());
}));

authRouter.post(
  "/register",
  credentialsLimiter,
  asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const session = await authService.registerInitialDm(input);
    setSessionCookie(response, "dm", session);
    response.status(201).json(session);
  }),
);

authRouter.post(
  "/login",
  credentialsLimiter,
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const session = await authService.login(input);
    setSessionCookie(response, "dm", session);
    response.status(200).json(session);
  }),
);

authRouter.get("/me", asyncHandler(async (request, response) => {
  const scope = request.query.scope === "table" ? "table" : "dm";
  const token = tokenFromRequest(request, scope);

  if (!token) {
    response.status(401).json({
      error: { code: "AUTH_REQUIRED", message: "No hay una sesión activa" },
    });
    return;
  }

  response.status(200).json(await authService.sessionFromToken(token));
}));

authRouter.post("/logout", (request, response) => {
  const scope = request.query.scope === "table" ? "table" : "dm";
  response.clearCookie(
    scope === "dm" ? DM_SESSION_COOKIE : TABLE_SESSION_COOKIE,
    cookieOptions(),
  );
  response.status(204).end();
});

function setSessionCookie(
  response: Response,
  scope: "dm" | "table",
  session: AuthSessionResponse,
) {
  response.cookie(
    scope === "dm" ? DM_SESSION_COOKIE : TABLE_SESSION_COOKIE,
    session.socketToken,
    {
      ...cookieOptions(),
      expires: new Date(session.principal.expiresAt),
    },
  );
}

export function setTableSessionCookie(
  response: Response,
  session: AuthSessionResponse,
) {
  setSessionCookie(response, "table", session);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
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
