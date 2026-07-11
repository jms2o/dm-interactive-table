import type {
  CampaignSummary,
  CreateCampaignRequest,
  CreateGameSessionRequest,
  CreateWorldRequest,
  GameSessionSummary,
  WorldSummary,
} from "../../../../shared/types/campaign";
import { prisma } from "../../persistence";
import {
  cloneCatalog,
  LocalCampaignRepository,
  PrismaCampaignRepository,
  type CampaignCatalog,
  type CampaignRepository,
} from "./campaign.repository";

const DEMO_WORLD_ID = "demo-world";
const DEMO_CAMPAIGN_ID = "demo-campaign";
const DEMO_SESSION_ID = "demo-session";

export class CampaignService {
  private worlds = new Map<string, WorldSummary>();
  private campaigns = new Map<string, CampaignSummary>();
  private sessions = new Map<string, GameSessionSummary>();
  private persistenceQueue = Promise.resolve();
  private initialized = false;

  constructor(private readonly repository: CampaignRepository) {
    this.replaceCatalog(createDemoCatalog());
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    const persisted = await this.repository.loadCatalog();

    if (persisted?.campaigns.length) {
      this.replaceCatalog(normalizeCatalog(persisted));
      return;
    }

    await this.repository.saveCatalog(this.catalog());
  }

  listWorlds() {
    return [...this.worlds.values()].map(cloneWorld);
  }

  createWorld(request: CreateWorldRequest) {
    const now = new Date().toISOString();
    const world: WorldSummary = {
      id: crypto.randomUUID(),
      name: request.name.trim(),
      description: request.description?.trim() ?? "",
      systemTags: request.systemTags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.worlds.set(world.id, world);
    this.persistSafely();
    return cloneWorld(world);
  }

  importWorldCopy(source: WorldSummary) {
    const now = new Date().toISOString();
    const world: WorldSummary = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (Importado)`,
      createdAt: now,
      updatedAt: now,
      systemTags: [...source.systemTags],
    };

    this.worlds.set(world.id, world);
    this.persistSafely();
    return cloneWorld(world);
  }

  listCampaigns() {
    return [...this.campaigns.values()].map(cloneCampaign);
  }

  getCampaign(campaignId: string) {
    const campaign = this.campaigns.get(campaignId);
    return campaign ? cloneCampaign(campaign) : null;
  }

  createCampaign(request: CreateCampaignRequest) {
    const now = new Date().toISOString();
    const campaign: CampaignSummary = {
      id: crypto.randomUUID(),
      worldId: request.worldId,
      name: request.name.trim(),
      description: request.description?.trim() ?? "",
      ruleset: request.ruleset?.trim() || "dnd5e",
      status: request.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(campaign.id, campaign);
    this.persistSafely();
    return cloneCampaign(campaign);
  }

  importCampaignCopy(source: CampaignSummary, worldId?: string) {
    const now = new Date().toISOString();
    const campaign: CampaignSummary = {
      ...source,
      id: crypto.randomUUID(),
      worldId,
      name: `${source.name} (Importada)`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(campaign.id, campaign);
    this.persistSafely();
    return cloneCampaign(campaign);
  }

  listSessions(campaignId: string) {
    return [...this.sessions.values()]
      .filter((session) => session.campaignId === campaignId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(cloneSession);
  }

  getSession(campaignId: string, sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session?.campaignId === campaignId ? cloneSession(session) : null;
  }

  createSession(campaignId: string, request: CreateGameSessionRequest) {
    if (!this.campaigns.has(campaignId)) {
      throw new Error("Campaign not found");
    }

    const now = new Date().toISOString();
    const session: GameSessionSummary = {
      id: crypto.randomUUID(),
      campaignId,
      title: request.title.trim(),
      phase: "preparation",
      scheduledAt: request.scheduledAt,
      summaryPublic: "",
      summaryPrivate: "",
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    this.persistSafely();
    return cloneSession(session);
  }

  importSessionCopy(campaignId: string, source: GameSessionSummary) {
    if (!this.campaigns.has(campaignId)) {
      throw new Error("Campaign not found");
    }

    const now = new Date().toISOString();
    const session: GameSessionSummary = {
      ...source,
      id: crypto.randomUUID(),
      campaignId,
      phase: "preparation",
      startedAt: undefined,
      endedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    this.persistSafely();
    return cloneSession(session);
  }

  startSession(campaignId: string, sessionId: string) {
    const session = this.requireSession(campaignId, sessionId);
    const conflictingSession = [...this.sessions.values()].find(
      (candidate) => candidate.phase === "live" && candidate.id !== sessionId,
    );

    if (conflictingSession) {
      throw new Error("Another session is already live");
    }

    const now = new Date().toISOString();
    session.phase = "live";
    session.startedAt = session.startedAt ?? now;
    session.endedAt = undefined;
    session.updatedAt = now;
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = "active";
      campaign.updatedAt = now;
    }
    this.persistSafely();
    return cloneSession(session);
  }

  endSession(
    campaignId: string,
    sessionId: string,
    summaries?: { summaryPublic?: string; summaryPrivate?: string },
  ) {
    const session = this.requireSession(campaignId, sessionId);
    const now = new Date().toISOString();
    session.phase = "ended";
    session.endedAt = now;
    session.summaryPublic = summaries?.summaryPublic?.trim() ?? session.summaryPublic;
    session.summaryPrivate =
      summaries?.summaryPrivate?.trim() ?? session.summaryPrivate;
    session.updatedAt = now;
    this.persistSafely();
    return cloneSession(session);
  }

  reopenSession(campaignId: string, sessionId: string) {
    const session = this.requireSession(campaignId, sessionId);
    const now = new Date().toISOString();
    session.phase = "preparation";
    session.startedAt = undefined;
    session.endedAt = undefined;
    session.updatedAt = now;
    this.persistSafely();
    return cloneSession(session);
  }

  isSessionLive(campaignId: string, sessionId: string) {
    return this.sessions.get(sessionId)?.campaignId === campaignId &&
      this.sessions.get(sessionId)?.phase === "live";
  }

  getRuntimeSession() {
    const sessions = [...this.sessions.values()];
    const existing =
      sessions.find((session) => session.phase === "live") ??
      this.sessions.get(DEMO_SESSION_ID) ??
      sessions[0];
    if (existing) return cloneSession(existing);

    const campaign =
      this.campaigns.get(DEMO_CAMPAIGN_ID) ?? this.campaigns.values().next().value;
    if (!campaign) throw new Error("Campaign catalog is empty");
    return this.createSession(campaign.id, { title: "Sesion inicial" });
  }

  async flushPersistence() {
    await this.persistenceQueue;
  }

  private requireSession(campaignId: string, sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.campaignId !== campaignId) {
      throw new Error("Session not found");
    }
    return session;
  }

  private catalog(): CampaignCatalog {
    return cloneCatalog({
      worlds: [...this.worlds.values()],
      campaigns: [...this.campaigns.values()],
      sessions: [...this.sessions.values()],
    });
  }

  private replaceCatalog(catalog: CampaignCatalog) {
    this.worlds = new Map(catalog.worlds.map((world) => [world.id, cloneWorld(world)]));
    this.campaigns = new Map(
      catalog.campaigns.map((campaign) => [campaign.id, cloneCampaign(campaign)]),
    );
    this.sessions = new Map(
      catalog.sessions.map((session) => [session.id, cloneSession(session)]),
    );
  }

  private persistSafely() {
    const snapshot = this.catalog();
    this.persistenceQueue = this.persistenceQueue
      .then(() => this.repository.saveCatalog(snapshot))
      .catch((error) => console.error("Campaign catalog persistence failed", error));
  }
}

const campaignRepository = prisma
  ? new PrismaCampaignRepository(prisma)
  : new LocalCampaignRepository();

export const campaignService = new CampaignService(campaignRepository);

function createDemoCatalog(): CampaignCatalog {
  const now = new Date().toISOString();
  return {
    worlds: [
      {
        id: DEMO_WORLD_ID,
        name: "Mundo Demo",
        description: "Base local para probar campanas, escenas y motores.",
        systemTags: ["fantasy", "dnd5e"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    campaigns: [
      {
        id: DEMO_CAMPAIGN_ID,
        worldId: DEMO_WORLD_ID,
        name: "Campana Demo",
        description: "Campana local conectada al mapa demo.",
        ruleset: "dnd5e",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessions: [
      {
        id: DEMO_SESSION_ID,
        campaignId: DEMO_CAMPAIGN_ID,
        title: "Sesion Demo",
        phase: "preparation",
        summaryPublic: "",
        summaryPrivate: "",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

function normalizeCatalog(catalog: CampaignCatalog): CampaignCatalog {
  return {
    ...catalog,
    sessions: catalog.sessions.map((session) => ({
      ...session,
      phase:
        session.phase === "live" || session.phase === "ended"
          ? session.phase
          : "preparation",
    })),
  };
}

function cloneWorld(world: WorldSummary): WorldSummary {
  return { ...world, systemTags: [...world.systemTags] };
}

function cloneCampaign(campaign: CampaignSummary): CampaignSummary {
  return { ...campaign };
}

function cloneSession(session: GameSessionSummary | undefined): GameSessionSummary {
  if (!session) throw new Error("Session not found");
  return { ...session };
}
