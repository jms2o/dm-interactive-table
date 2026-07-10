import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { aiRouter } from "./routes/ai.routes";
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
import { enemyRouter, npcRouter } from "./routes/npc.routes";
import {
  campaignRulesetRouter,
  rulesetCatalogRouter,
} from "./routes/ruleset.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
    }),
  );
  app.use(express.json());
  app.use("/assets", express.static(resolveAssetRoot()));

  app.get("/", (_request, response) => {
    response.status(200).json({
      name: "DM Interactive Table API",
      version: "2.0.0-alpha.20",
      docs: "/api/health",
    });
  });

  app.use("/api", healthRouter);
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

  return app;
}

function resolveAssetRoot() {
  const workspaceAssets = resolve(process.cwd(), "assets");

  if (existsSync(workspaceAssets)) {
    return workspaceAssets;
  }

  return resolve(process.cwd(), "..", "assets");
}
