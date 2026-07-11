-- CreateEnum
CREATE TYPE "SessionPhase" AS ENUM ('PREPARATION', 'LIVE', 'ENDED');

-- AlterTable
ALTER TABLE "GameSession"
ADD COLUMN "phase" "SessionPhase" NOT NULL DEFAULT 'PREPARATION';

-- AlterTable
ALTER TABLE "PlayerCharacter"
ADD COLUMN "playerKey" TEXT,
ADD COLUMN "temporaryHp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "resources" JSONB;

-- CreateTable
CREATE TABLE "GameSnapshot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCharacter_campaignId_playerKey_key"
ON "PlayerCharacter"("campaignId", "playerKey");

-- CreateIndex
CREATE INDEX "GameSnapshot_campaignId_sessionId_createdAt_idx"
ON "GameSnapshot"("campaignId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "GameSnapshot_sceneId_idx" ON "GameSnapshot"("sceneId");

-- CreateIndex
CREATE INDEX "GameSnapshot_createdById_idx" ON "GameSnapshot"("createdById");

-- AddForeignKey
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_sceneId_fkey"
FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
