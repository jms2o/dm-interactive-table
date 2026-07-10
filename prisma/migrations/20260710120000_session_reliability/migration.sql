-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "TableAccessCode" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdById" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "playerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "sessionsRevokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableAccessCode_codeHash_key" ON "TableAccessCode"("codeHash");

-- CreateIndex
CREATE INDEX "TableAccessCode_campaignId_expiresAt_idx" ON "TableAccessCode"("campaignId", "expiresAt");

-- CreateIndex
CREATE INDEX "TableAccessCode_sessionId_idx" ON "TableAccessCode"("sessionId");

-- CreateIndex
CREATE INDEX "TableAccessCode_createdById_idx" ON "TableAccessCode"("createdById");

-- AddForeignKey
ALTER TABLE "TableAccessCode" ADD CONSTRAINT "TableAccessCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAccessCode" ADD CONSTRAINT "TableAccessCode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAccessCode" ADD CONSTRAINT "TableAccessCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
