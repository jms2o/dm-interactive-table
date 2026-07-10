import type {
  CampaignSummary,
  CreateCampaignRequest,
  CreateGameSessionRequest,
  CreateWorldRequest,
  GameSessionSummary,
  WorldSummary,
} from "../../../../shared/types/campaign";

const DEMO_WORLD_ID = "demo-world";
const DEMO_CAMPAIGN_ID = "demo-campaign";
const DEMO_SESSION_ID = "demo-session";

export class CampaignService {
  private worlds = new Map<string, WorldSummary>();
  private campaigns = new Map<string, CampaignSummary>();
  private sessions = new Map<string, GameSessionSummary>();

  constructor() {
    const now = new Date().toISOString();
    this.worlds.set(DEMO_WORLD_ID, {
      id: DEMO_WORLD_ID,
      name: "Mundo Demo",
      description: "Base local para probar campañas, escenas y motores.",
      systemTags: ["fantasy", "dnd5e"],
      createdAt: now,
      updatedAt: now,
    });
    this.campaigns.set(DEMO_CAMPAIGN_ID, {
      id: DEMO_CAMPAIGN_ID,
      worldId: DEMO_WORLD_ID,
      name: "Campaña Demo",
      description: "Campaña local conectada al mapa demo.",
      ruleset: "dnd5e",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    this.sessions.set(DEMO_SESSION_ID, {
      id: DEMO_SESSION_ID,
      campaignId: DEMO_CAMPAIGN_ID,
      title: "Sesión Demo",
      summaryPublic: "",
      summaryPrivate: "",
      createdAt: now,
      updatedAt: now,
    });
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
    return cloneCampaign(campaign);
  }

  listSessions(campaignId: string) {
    return [...this.sessions.values()]
      .filter((session) => session.campaignId === campaignId)
      .map(cloneSession);
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
      scheduledAt: request.scheduledAt,
      summaryPublic: "",
      summaryPrivate: "",
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
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
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    return cloneSession(session);
  }
}

export const campaignService = new CampaignService();

function cloneWorld(world: WorldSummary): WorldSummary {
  return {
    ...world,
    systemTags: [...world.systemTags],
  };
}

function cloneCampaign(campaign: CampaignSummary): CampaignSummary {
  return { ...campaign };
}

function cloneSession(session: GameSessionSummary): GameSessionSummary {
  return { ...session };
}
