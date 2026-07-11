import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedBrowserMutation(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const decision = evaluateBrowserMutation({
    method: request.method,
    origin: request.get("origin"),
    fetchSite: request.get("sec-fetch-site"),
    requestOrigin: `${request.protocol}://${request.get("host") ?? ""}`,
    allowedOrigins: env.clientOrigins,
    allowAnyDevelopmentOrigin:
      env.nodeEnv !== "production" && env.clientOrigin === "*",
  });

  if (decision.ok) {
    next();
    return;
  }

  response.status(403).json({
    error: {
      code: "CSRF_REJECTED",
      message: "El origen de la solicitud no esta autorizado",
    },
  });
}

export function evaluateBrowserMutation(input: {
  method: string;
  origin?: string;
  fetchSite?: string;
  requestOrigin: string;
  allowedOrigins: string[];
  allowAnyDevelopmentOrigin?: boolean;
}) {
  if (safeMethods.has(input.method.toUpperCase())) {
    return { ok: true as const, reason: "safe-method" };
  }

  if (input.fetchSite?.toLowerCase() === "cross-site") {
    return { ok: false as const, reason: "cross-site" };
  }

  if (!input.origin) {
    return { ok: true as const, reason: "non-browser" };
  }

  const normalizedOrigin = normalizeOrigin(input.origin);
  const normalizedRequestOrigin = normalizeOrigin(input.requestOrigin);

  if (
    input.allowAnyDevelopmentOrigin ||
    normalizedOrigin === normalizedRequestOrigin ||
    input.allowedOrigins.some(
      (candidate) => normalizeOrigin(candidate) === normalizedOrigin,
    )
  ) {
    return { ok: true as const, reason: "trusted-origin" };
  }

  return { ok: false as const, reason: "untrusted-origin" };
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}
