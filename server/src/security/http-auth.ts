import type { NextFunction, Request, Response } from "express";
import { authService } from ".";
import { SecurityError } from "./auth.service";

export const DM_SESSION_COOKIE = "dit_dm_session";
export const TABLE_SESSION_COOKIE = "dit_table_session";

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const token = tokenFromRequest(request);

  if (!token) {
    sendSecurityError(
      response,
      new SecurityError("AUTH_REQUIRED", 401, "Inicia sesión para continuar"),
    );
    return;
  }

  void authService
    .validateToken(token)
    .then((principal) => {
      request.auth = principal;
      next();
    })
    .catch((error) => handleSecurityError(error, response, next));
}

export function authorizeApiRequest(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const principal = request.auth;

  if (!principal) {
    sendSecurityError(
      response,
      new SecurityError("AUTH_REQUIRED", 401, "Inicia sesión para continuar"),
    );
    return;
  }

  const campaignId = campaignIdFromRequest(request);

  if (
    campaignId &&
    !principal.isAdmin &&
    campaignId !== principal.campaignId
  ) {
    sendSecurityError(
      response,
      new SecurityError(
        "CAMPAIGN_ACCESS_DENIED",
        403,
        "La sesión no pertenece a esta campaña",
      ),
    );
    return;
  }

  if (principal.role === "dm") {
    next();
    return;
  }

  const path = request.originalUrl.split("?")[0];
  const readOnlyMethod = request.method === "GET" || request.method === "HEAD";

  if (readOnlyMethod && (campaignId || path.startsWith("/api/rulesets"))) {
    next();
    return;
  }

  if (
    principal.role === "player" &&
    ((request.method === "POST" &&
      /^\/api\/campaigns\/[^/]+\/dice\/roll$/.test(path)) ||
      (request.method === "PATCH" &&
        /^\/api\/campaigns\/[^/]+\/workflow\/character-sheet$/.test(path)))
  ) {
    next();
    return;
  }

  sendSecurityError(
    response,
    new SecurityError(
      "ROLE_ACCESS_DENIED",
      403,
      "Tu rol no puede realizar esta acción",
    ),
  );
}

export function tokenFromRequest(
  request: Request,
  cookieScope?: "dm" | "table",
) {
  const authorization = request.header("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  if (cookieScope === "dm") {
    return request.cookies?.[DM_SESSION_COOKIE] as string | undefined;
  }

  if (cookieScope === "table") {
    return request.cookies?.[TABLE_SESSION_COOKIE] as string | undefined;
  }

  return (
    (request.cookies?.[DM_SESSION_COOKIE] as string | undefined) ??
    (request.cookies?.[TABLE_SESSION_COOKIE] as string | undefined)
  );
}

export function handleSecurityError(
  error: unknown,
  response: Response,
  next?: NextFunction,
) {
  if (error instanceof SecurityError) {
    sendSecurityError(response, error);
    return;
  }

  next?.(error);
}

function sendSecurityError(response: Response, error: SecurityError) {
  response.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

function campaignIdFromRequest(request: Request) {
  const match = request.originalUrl.match(/^\/api\/campaigns\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
