import { Router, type Request } from "express";
import { rulesetService } from "../modules/ruleset/ruleset.service";

export const rulesetCatalogRouter = Router();
export const campaignRulesetRouter = Router({ mergeParams: true });

rulesetCatalogRouter.get("/", (_request, response) => {
  response.status(200).json(rulesetService.listRulesets());
});

rulesetCatalogRouter.get("/:rulesetId", (request, response) => {
  const ruleset = rulesetService.getRuleset(request.params.rulesetId);

  if (!ruleset) {
    response.status(404).json({ ok: false, error: "Ruleset not found" });
    return;
  }

  response.status(200).json(ruleset);
});

campaignRulesetRouter.get("/", (request, response) => {
  try {
    response
      .status(200)
      .json(rulesetService.getCampaignRuleset(campaignIdFromRequest(request)));
  } catch (error) {
    response.status(404).json({
      ok: false,
      error: error instanceof Error ? error.message : "Ruleset not found",
    });
  }
});

function campaignIdFromRequest(request: Request) {
  return String((request.params as Record<string, string>).campaignId);
}
