import { Router, type Request } from "express";
import { z } from "zod";
import type { CreateAssetRequest } from "../../../shared/types/asset";
import { assetService } from "../modules/asset/asset.service";

export const assetRouter = Router({ mergeParams: true });

const assetTypeSchema = z.enum([
  "map",
  "token",
  "portrait",
  "music",
  "sound",
  "effect",
]);

const createAssetSchema = z.object({
  version: z.literal(1).default(1),
  type: assetTypeSchema,
  name: z.string().min(1),
  url: z.string().min(1),
  provider: z.enum(["local", "remote", "generated"]).optional(),
  status: z.enum(["available", "missing", "archived"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().min(1).default(() => crypto.randomUUID()),
});

assetRouter.get("/", (request, response) => {
  const type = assetTypeSchema.safeParse(request.query.type);

  response
    .status(200)
    .json(
      type.success
        ? assetService.getLibraryByType(campaignIdFromRequest(request), type.data)
        : assetService.getLibrary(campaignIdFromRequest(request)),
    );
});

assetRouter.get("/:assetId", (request, response) => {
  const asset = assetService.getAsset(
    campaignIdFromRequest(request),
    request.params.assetId,
  );

  if (!asset) {
    response.status(404).json({ ok: false, error: "Asset not found" });
    return;
  }

  response.status(200).json(asset);
});

assetRouter.post("/", (request, response) => {
  const parsed = createAssetSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      ok: false,
      error: "Invalid asset request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    response.status(201).json(
      assetService.createAsset(campaignIdFromRequest(request), {
        ...parsed.data,
        metadata: parsed.data.metadata as CreateAssetRequest["metadata"],
      } satisfies CreateAssetRequest),
    );
  } catch (error) {
    response.status(404).json({
      ok: false,
      error: error instanceof Error ? error.message : "Asset create failed",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}

