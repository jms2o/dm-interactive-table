import { Router, type Request } from "express";
import { z } from "zod";
import { campaignService } from "../modules/campaign/campaign.service";

export const worldRouter = Router();
export const campaignRouter = Router();

const createWorldSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemTags: z.array(z.string()).optional(),
});

const createCampaignSchema = z.object({
  worldId: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  ruleset: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const createSessionSchema = z.object({
  title: z.string().min(1),
  scheduledAt: z.string().optional(),
});

worldRouter.get("/", (_request, response) => {
  response.status(200).json(campaignService.listWorlds());
});

worldRouter.post("/", (request, response) => {
  const parsed = createWorldSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid world request" });
    return;
  }

  response.status(201).json(campaignService.createWorld(parsed.data));
});

campaignRouter.get("/", (_request, response) => {
  response.status(200).json(campaignService.listCampaigns());
});

campaignRouter.post("/", (request, response) => {
  const parsed = createCampaignSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid campaign request" });
    return;
  }

  response.status(201).json(campaignService.createCampaign(parsed.data));
});

campaignRouter.get("/:campaignId", (request, response) => {
  const campaign = campaignService.getCampaign(campaignIdFromRequest(request));

  if (!campaign) {
    response.status(404).json({ ok: false, error: "Campaign not found" });
    return;
  }

  response.status(200).json(campaign);
});

campaignRouter.get("/:campaignId/sessions", (request, response) => {
  response
    .status(200)
    .json(campaignService.listSessions(campaignIdFromRequest(request)));
});

campaignRouter.post("/:campaignId/sessions", (request, response) => {
  const parsed = createSessionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ ok: false, error: "Invalid session request" });
    return;
  }

  try {
    response
      .status(201)
      .json(
        campaignService.createSession(campaignIdFromRequest(request), parsed.data),
      );
  } catch (error) {
    response.status(404).json({
      ok: false,
      error: error instanceof Error ? error.message : "Session failed",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}

