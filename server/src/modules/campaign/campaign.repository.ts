import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type {
  CampaignSummary,
  GameSessionSummary,
  WorldSummary,
} from "../../../../shared/types/campaign";
import { env } from "../../config/env";
import type { PrismaClient } from "../../generated/prisma/client";

export type CampaignCatalog = {
  worlds: WorldSummary[];
  campaigns: CampaignSummary[];
  sessions: GameSessionSummary[];
};

export interface CampaignRepository {
  readonly mode: "local" | "prisma";
  loadCatalog(): Promise<CampaignCatalog | null>;
  saveCatalog(catalog: CampaignCatalog): Promise<void>;
}

export class LocalCampaignRepository implements CampaignRepository {
  readonly mode = "local" as const;
  private readonly filePath: string;
  private writeQueue = Promise.resolve();

  constructor(dataDir = env.dataDir) {
    const root = isAbsolute(dataDir) ? dataDir : resolve(process.cwd(), dataDir);
    this.filePath = resolve(root, "campaign-catalog.json");
  }

  async loadCatalog() {
    try {
      const payload = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as CampaignCatalog;

      if (
        !Array.isArray(payload?.worlds) ||
        !Array.isArray(payload?.campaigns) ||
        !Array.isArray(payload?.sessions)
      ) {
        throw new Error("Invalid local campaign catalog");
      }

      return cloneCatalog(payload);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveCatalog(catalog: CampaignCatalog) {
    const payload = JSON.stringify(cloneCatalog(catalog), null, 2);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporaryPath, payload, "utf8");
      await rename(temporaryPath, this.filePath);
    });

    await this.writeQueue;
  }
}

export class PrismaCampaignRepository implements CampaignRepository {
  readonly mode = "prisma" as const;

  constructor(private readonly prisma: PrismaClient) {}

  async loadCatalog(): Promise<CampaignCatalog> {
    const [worlds, campaigns, sessions] = await Promise.all([
      this.prisma.world.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.campaign.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.gameSession.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    return {
      worlds: worlds.map((world) => ({
        id: world.id,
        name: world.name,
        description: world.description,
        systemTags: [...world.systemTags],
        createdAt: world.createdAt.toISOString(),
        updatedAt: world.updatedAt.toISOString(),
      })),
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        worldId: campaign.worldId ?? undefined,
        name: campaign.name,
        description: campaign.description,
        ruleset: campaign.ruleset,
        status: campaign.status.toLowerCase() as CampaignSummary["status"],
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        campaignId: session.campaignId,
        title: session.title,
        phase: session.phase.toLowerCase() as GameSessionSummary["phase"],
        scheduledAt: session.scheduledAt?.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        summaryPublic: session.summaryPublic,
        summaryPrivate: session.summaryPrivate,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })),
    };
  }

  async saveCatalog(catalog: CampaignCatalog) {
    await this.prisma.$transaction(async (tx) => {
      for (const world of catalog.worlds) {
        await tx.world.upsert({
          where: { id: world.id },
          update: {
            name: world.name,
            description: world.description,
            systemTags: world.systemTags,
          },
          create: {
            id: world.id,
            name: world.name,
            description: world.description,
            systemTags: world.systemTags,
          },
        });
      }

      for (const campaign of catalog.campaigns) {
        await tx.campaign.upsert({
          where: { id: campaign.id },
          update: {
            worldId: campaign.worldId ?? null,
            name: campaign.name,
            description: campaign.description,
            ruleset: campaign.ruleset,
            status: campaign.status.toUpperCase() as
              | "DRAFT"
              | "ACTIVE"
              | "ARCHIVED",
          },
          create: {
            id: campaign.id,
            worldId: campaign.worldId,
            name: campaign.name,
            description: campaign.description,
            ruleset: campaign.ruleset,
            status: campaign.status.toUpperCase() as
              | "DRAFT"
              | "ACTIVE"
              | "ARCHIVED",
          },
        });
      }

      for (const session of catalog.sessions) {
        await tx.gameSession.upsert({
          where: { id: session.id },
          update: {
            title: session.title,
            phase: session.phase.toUpperCase() as
              | "PREPARATION"
              | "LIVE"
              | "ENDED",
            scheduledAt: session.scheduledAt
              ? new Date(session.scheduledAt)
              : null,
            startedAt: session.startedAt ? new Date(session.startedAt) : null,
            endedAt: session.endedAt ? new Date(session.endedAt) : null,
            summaryPublic: session.summaryPublic,
            summaryPrivate: session.summaryPrivate,
          },
          create: {
            id: session.id,
            campaignId: session.campaignId,
            title: session.title,
            phase: session.phase.toUpperCase() as
              | "PREPARATION"
              | "LIVE"
              | "ENDED",
            scheduledAt: session.scheduledAt
              ? new Date(session.scheduledAt)
              : undefined,
            startedAt: session.startedAt
              ? new Date(session.startedAt)
              : undefined,
            endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
            summaryPublic: session.summaryPublic,
            summaryPrivate: session.summaryPrivate,
          },
        });
      }
    });
  }
}

export function cloneCatalog(catalog: CampaignCatalog): CampaignCatalog {
  return {
    worlds: catalog.worlds.map((world) => ({
      ...world,
      systemTags: [...world.systemTags],
    })),
    campaigns: catalog.campaigns.map((campaign) => ({ ...campaign })),
    sessions: catalog.sessions.map((session) => ({ ...session })),
  };
}
