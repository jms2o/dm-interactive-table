import { Router } from "express";
import { persistenceMode } from "../persistence";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "dm-interactive-table-server",
    persistence: persistenceMode,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
