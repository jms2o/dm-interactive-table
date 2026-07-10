import { Router, type Request } from "express";
import { z } from "zod";
import type { CampaignPackageImportRequest } from "../../../shared/types/campaign-package";
import { campaignPackageService } from "../modules/campaign-package/campaign-package.service";

export const campaignPackageRouter = Router({ mergeParams: true });
export const campaignPackageImportRouter = Router();

const importSchema = z.object({
  version: z.literal(1).default(1),
  mode: z.enum(["validate", "preview", "apply-copy"]).default("validate"),
  package: z.unknown(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

campaignPackageRouter.get("/export", (request, response) => {
  try {
    response
      .status(200)
      .json(
        campaignPackageService.exportCampaign(campaignIdFromRequest(request)),
      );
  } catch (error) {
    response.status(404).json({
      ok: false,
      error: error instanceof Error ? error.message : "Export failed",
    });
  }
});

campaignPackageImportRouter.post("/import", (request, response) => {
  const parsed = importSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid package import request",
      details: parsed.error.flatten(),
    });
    return;
  }

  const report = campaignPackageService.validateImport(
    parsed.data as CampaignPackageImportRequest,
  );

  response.status(report.ok ? 200 : 422).json(report);
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
