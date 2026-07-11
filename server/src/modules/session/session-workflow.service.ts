import type { AuthPrincipal } from "../../../../shared/types/auth";
import type { GameSessionSummary } from "../../../../shared/types/campaign";
import type {
  SessionParticipant,
  SessionWorkflowState,
  UpdatePlayerCharacterSheet,
} from "../../../../shared/types/session-workflow";
import { prisma } from "../../persistence";
import { campaignService } from "../campaign/campaign.service";
import {
  LocalCharacterSheetRepository,
  PrismaCharacterSheetRepository,
  type CharacterSheetRepository,
} from "./character-sheet.repository";

type SessionListener = (session: GameSessionSummary) => void;

export class SessionPresenceService {
  private participants = new Map<string, Map<string, SessionParticipant>>();

  connect(sessionId: string, principal: AuthPrincipal) {
    const session = this.participants.get(sessionId) ?? new Map();
    session.set(principal.id, {
      id: principal.id,
      displayName: principal.displayName,
      role: principal.role,
      connectedAt: new Date().toISOString(),
    });
    this.participants.set(sessionId, session);
  }

  disconnect(sessionId: string, principalId: string) {
    const session = this.participants.get(sessionId);
    session?.delete(principalId);
    if (session?.size === 0) this.participants.delete(sessionId);
  }

  list(sessionId: string) {
    return [...(this.participants.get(sessionId)?.values() ?? [])].map(
      (participant) => ({ ...participant }),
    );
  }
}

export class SessionWorkflowService {
  private listeners = new Set<SessionListener>();

  constructor(
    private readonly sheets: CharacterSheetRepository,
    readonly presence = new SessionPresenceService(),
  ) {}

  getWorkflow(
    campaignId: string,
    principal?: AuthPrincipal,
  ): SessionWorkflowState {
    const campaign = campaignService.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (principal && principal.campaignId !== campaignId && !principal.isAdmin) {
      throw new Error("Campaign access denied");
    }
    const allSessions = campaignService.listSessions(campaignId);
    const sessions =
      !principal || principal.role === "dm"
        ? allSessions
        : allSessions
            .filter((session) => session.id === principal.sessionId)
            .map((session) => ({ ...session, summaryPrivate: "" }));

    return {
      campaign,
      sessions,
      participantsBySession: Object.fromEntries(
        sessions.map((session) => [session.id, this.presence.list(session.id)]),
      ),
    };
  }

  async startSession(campaignId: string, sessionId: string) {
    const session = campaignService.startSession(campaignId, sessionId);
    await campaignService.flushPersistence();
    return this.notify(session);
  }

  async endSession(
    campaignId: string,
    sessionId: string,
    summaries?: { summaryPublic?: string; summaryPrivate?: string },
  ) {
    const session = campaignService.endSession(campaignId, sessionId, summaries);
    await campaignService.flushPersistence();
    return this.notify(session);
  }

  async reopenSession(campaignId: string, sessionId: string) {
    const session = campaignService.reopenSession(campaignId, sessionId);
    await campaignService.flushPersistence();
    return this.notify(session);
  }

  onSessionChanged(listener: SessionListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCharacterSheet(principal: AuthPrincipal, campaignId: string) {
    assertPlayerCampaign(principal, campaignId);
    return this.sheets.getOrCreate(
      campaignId,
      principal.id,
      principal.displayName,
    );
  }

  async updateCharacterSheet(
    principal: AuthPrincipal,
    campaignId: string,
    patch: UpdatePlayerCharacterSheet,
  ) {
    assertPlayerCampaign(principal, campaignId);
    await this.sheets.getOrCreate(campaignId, principal.id, principal.displayName);
    return this.sheets.update(campaignId, principal.id, normalizePatch(patch));
  }

  flushPersistence() {
    return this.sheets.flush();
  }

  private notify(session: GameSessionSummary) {
    for (const listener of this.listeners) listener(session);
    return session;
  }
}

const characterSheetRepository = prisma
  ? new PrismaCharacterSheetRepository(prisma)
  : new LocalCharacterSheetRepository();

export const sessionWorkflowService = new SessionWorkflowService(
  characterSheetRepository,
);

function assertPlayerCampaign(principal: AuthPrincipal, campaignId: string) {
  if (principal.role !== "player" || principal.campaignId !== campaignId) {
    throw new Error("Player campaign access denied");
  }
}

function normalizePatch(patch: UpdatePlayerCharacterSheet) {
  const normalized: UpdatePlayerCharacterSheet = { ...patch };
  if (typeof patch.name === "string") normalized.name = patch.name.trim();
  if (typeof patch.ancestry === "string") {
    normalized.ancestry = patch.ancestry.trim();
  }
  if (typeof patch.className === "string") {
    normalized.className = patch.className.trim();
  }
  if (typeof patch.notes === "string") normalized.notes = patch.notes.trim();
  if (patch.resources) normalized.resources = { ...patch.resources };
  return normalized;
}
