import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { aiRouter } from "./routes/ai.routes";
import { authRouter } from "./routes/auth.routes";
import { assetRouter } from "./routes/asset.routes";
import {
  campaignPackageImportRouter,
  campaignPackageRouter,
} from "./routes/campaign-package.routes";
import { campaignRouter, worldRouter } from "./routes/campaign.routes";
import { demoRouter } from "./routes/demo.routes";
import { diceRouter } from "./routes/dice.routes";
import { encounterRouter } from "./routes/encounter.routes";
import { healthRouter } from "./routes/health.routes";
import { networkRouter } from "./routes/network.routes";
import { enemyRouter, npcRouter } from "./routes/npc.routes";
import {
  campaignRulesetRouter,
  rulesetCatalogRouter,
} from "./routes/ruleset.routes";
import { tableAccessRouter } from "./routes/table-access.routes";
import {
  authorizeApiRequest,
  requireAuth,
} from "./security/http-auth";

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: env.jsonLimit }));
  app.use(cookieParser());
  app.use("/assets", express.static(resolveAssetRoot()));

  const apiMetadata = (_request: Request, response: Response) => {
    response.status(200).json({
      name: "DM Interactive Table API",
      version: "2.0.0-alpha.21",
      docs: "/api/health",
    });
  };

  app.get("/api", apiMetadata);

  if (env.nodeEnv !== "production") {
    app.get("/", apiMetadata);
  }

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/table-access", tableAccessRouter);
  app.use("/api", requireAuth, authorizeApiRequest);
  app.use("/api", networkRouter);
  app.use("/api/demo", demoRouter);
  app.use("/api/campaign-packages", campaignPackageImportRouter);
  app.use("/api/rulesets", rulesetCatalogRouter);
  app.use("/api/worlds", worldRouter);
  app.use("/api/campaigns", campaignRouter);
  app.use("/api/campaigns/:campaignId/package", campaignPackageRouter);
  app.use("/api/campaigns/:campaignId/assets", assetRouter);
  app.use("/api/campaigns/:campaignId/ruleset", campaignRulesetRouter);
  app.use("/api/campaigns/:campaignId/dice", diceRouter);
  app.use("/api/campaigns/:campaignId/encounters", encounterRouter);
  app.use("/api/campaigns/:campaignId/npcs", npcRouter);
  app.use("/api/campaigns/:campaignId/enemies", enemyRouter);
  app.use("/api/campaigns/:campaignId/ai", aiRouter);

  app.use("/api", (_request, response) => {
    response.status(404).json({
      error: { code: "ROUTE_NOT_FOUND", message: "Ruta API no encontrada" },
    });
  });

  if (env.nodeEnv === "production") {
    const clientRoot = resolveClientRoot();
    app.use(express.static(clientRoot));
    app.get("*", (_request, response) => {
      response.sendFile(resolve(clientRoot, "index.html"));
    });
  }

  app.use(
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      if (error instanceof SyntaxError && "body" in error) {
        response.status(400).json({
          error: { code: "INVALID_JSON", message: "El JSON no es válido" },
        });
        return;
      }

      console.error("Unhandled HTTP error", error);
      response.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudo completar la solicitud",
        },
      });
    },
  );

  return app;
}

function resolveAssetRoot() {
  const workspaceAssets = resolve(process.cwd(), "assets");

  if (existsSync(workspaceAssets)) {
    return workspaceAssets;
  }

  return resolve(process.cwd(), "..", "assets");
}

function resolveClientRoot() {
  const workspaceClient = resolve(process.cwd(), "client", "dist");

  if (existsSync(workspaceClient)) {
    return workspaceClient;
  }

  return resolve(process.cwd(), "..", "client", "dist");
}
