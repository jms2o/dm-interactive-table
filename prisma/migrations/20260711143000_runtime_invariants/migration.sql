-- Runtime invariants that Prisma cannot express as partial unique constraints.
CREATE UNIQUE INDEX IF NOT EXISTS "Scene_one_active_per_campaign"
ON "Scene" ("campaignId")
WHERE "isActive" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "GameSession_one_live_per_campaign"
ON "GameSession" ("campaignId")
WHERE "phase" = 'LIVE';
