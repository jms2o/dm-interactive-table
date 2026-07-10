import type { InputJsonValue } from "@prisma/client/runtime/client";
import type { GameScene } from "../../../shared/types/game";
import {
  createDefaultSceneExperience,
  type ActiveAssetCue,
  type AudioChannelId,
  type AudioScenePreset,
  type AudioTransitionState,
  type SceneExperienceState,
} from "../../../shared/types/table-experience";
import type { GameToken, TokenType } from "../../../shared/types/token";
import type { PrismaClient } from "../generated/prisma/client";
import {
  TokenType as PrismaTokenType,
  type TokenType as PrismaTokenTypeValue,
} from "../generated/prisma/enums";
import type {
  GameStateRepository,
  NarrativePersistenceUpdate,
  SceneSnapshot,
  TokenPositionUpdate,
} from "./game.repository";

const tokenTypeToPrisma: Record<TokenType, PrismaTokenTypeValue> = {
  player: PrismaTokenType.PLAYER,
  enemy: PrismaTokenType.ENEMY,
  npc: PrismaTokenType.NPC,
  object: PrismaTokenType.OBJECT,
};

const tokenTypeFromPrisma: Record<string, TokenType> = {
  PLAYER: "player",
  ENEMY: "enemy",
  NPC: "npc",
  OBJECT: "object",
};

export class PrismaGameStateRepository implements GameStateRepository {
  readonly mode = "prisma" as const;

  constructor(private readonly prisma: PrismaClient) {}

  async loadScene(
    campaignId: string,
    sceneId: string,
  ): Promise<SceneSnapshot | null> {
    const scene = await this.prisma.scene.findFirst({
      where: {
        id: sceneId,
        campaignId,
      },
      include: {
        battleMap: true,
        tokens: true,
      },
    });

    if (!scene) {
      return null;
    }

    return {
      campaignId,
      sessionId: scene.sessionId ?? "",
      scene: {
        id: scene.id,
        name: scene.name,
        narrativeText: scene.narrativeText,
        map: {
          id: scene.battleMap.id,
          assetId: scene.battleMap.assetId ?? undefined,
          name: scene.battleMap.name,
          imageUrl: scene.battleMap.imageUrl,
          gridSize: scene.battleMap.gridSize,
          width: scene.battleMap.width,
          height: scene.battleMap.height,
        },
        tokens: scene.tokens.map((token) => ({
          id: token.id,
          imageAssetId: token.imageAssetId ?? undefined,
          name: token.name,
          type: tokenTypeFromPrisma[token.entityType] ?? "object",
          x: token.x,
          y: token.y,
          size: token.size,
          color: token.color,
          visible: token.visible,
        })),
        experience: readExperience(scene.sceneState),
      },
      dmNarrativeText: scene.dmNotes,
      updatedAt: scene.updatedAt.toISOString(),
    };
  }

  async saveSceneSnapshot(snapshot: SceneSnapshot): Promise<void> {
    const map = snapshot.scene.map;

    await this.prisma.$transaction(async (tx) => {
      await tx.campaign.upsert({
        where: { id: snapshot.campaignId },
        update: {
          name: "Demo Campaign",
          status: "ACTIVE",
        },
        create: {
          id: snapshot.campaignId,
          name: "Demo Campaign",
          description: "Campaña local de desarrollo",
          ruleset: "dnd5e",
          status: "ACTIVE",
        },
      });

      if (snapshot.sessionId) {
        await tx.gameSession.upsert({
          where: { id: snapshot.sessionId },
          update: {
            title: "Demo Session",
          },
          create: {
            id: snapshot.sessionId,
            campaignId: snapshot.campaignId,
            title: "Demo Session",
          },
        });
      }

      await tx.battleMap.upsert({
        where: { id: map.id },
        update: {
          name: map.name,
          imageUrl: map.imageUrl,
          gridSize: map.gridSize,
          width: map.width,
          height: map.height,
        },
        create: {
          id: map.id,
          campaignId: snapshot.campaignId,
          name: map.name,
          imageUrl: map.imageUrl,
          gridSize: map.gridSize,
          width: map.width,
          height: map.height,
        },
      });

      await tx.scene.upsert({
        where: { id: snapshot.scene.id },
        update: {
          name: snapshot.scene.name,
          narrativeText: snapshot.scene.narrativeText,
          dmNotes: snapshot.dmNarrativeText,
          isActive: true,
          battleMapId: map.id,
          sceneState: toJsonValue(snapshot.scene.experience),
        },
        create: {
          id: snapshot.scene.id,
          campaignId: snapshot.campaignId,
          sessionId: snapshot.sessionId || null,
          battleMapId: map.id,
          name: snapshot.scene.name,
          narrativeText: snapshot.scene.narrativeText,
          dmNotes: snapshot.dmNarrativeText,
          isActive: true,
          sceneState: toJsonValue(snapshot.scene.experience),
        },
      });

      for (const token of snapshot.scene.tokens) {
        await upsertToken(tx, snapshot.scene.id, token);
      }
    });
  }

  async saveTokenPosition(update: TokenPositionUpdate): Promise<void> {
    await this.prisma.gameToken.updateMany({
      where: {
        id: update.tokenId,
        sceneId: update.sceneId,
      },
      data: {
        x: update.x,
        y: update.y,
      },
    });
  }

  async saveNarrative(update: NarrativePersistenceUpdate): Promise<void> {
    await this.prisma.scene.updateMany({
      where: {
        id: update.sceneId,
      },
      data:
        update.visibility === "public"
          ? { narrativeText: update.text }
          : { dmNotes: update.text },
    });
  }
}

function toJsonValue(value: unknown): InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as InputJsonValue;
}

function readExperience(value: unknown): SceneExperienceState {
  const defaults = createDefaultSceneExperience();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const candidate = value as Partial<SceneExperienceState>;
  const candidateAmbience = candidate.ambience ?? defaults.ambience;

  return {
    ...defaults,
    ...candidate,
    fogOfWar: {
      ...defaults.fogOfWar,
      ...(candidate.fogOfWar ?? {}),
      revealedAreas: Array.isArray(candidate.fogOfWar?.revealedAreas)
        ? candidate.fogOfWar.revealedAreas.map((area) => ({ ...area }))
        : [],
    },
    lighting: cloneLighting(candidate.lighting ?? defaults.lighting),
    ambience: {
      ...defaults.ambience,
      ...candidateAmbience,
      activeCue: candidateAmbience.activeCue
        ? normalizeCue(candidateAmbience.activeCue)
        : undefined,
    },
    audioMixer: cloneAudioMixer(candidate.audioMixer ?? defaults.audioMixer),
    audioPresets: cloneAudioPresets(candidate.audioPresets ?? []),
    audioTransition: cloneAudioTransition(candidate.audioTransition),
    displayMode:
      candidate.displayMode === "cinematic" ? "cinematic" : "standard",
    playerHandout:
      typeof candidate.playerHandout === "string"
        ? candidate.playerHandout
        : "",
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function cloneLighting(
  lighting: SceneExperienceState["lighting"] | undefined,
): SceneExperienceState["lighting"] {
  const defaults = createDefaultSceneExperience().lighting;
  const source = lighting ?? defaults;

  return {
    enabled: source.enabled ?? defaults.enabled,
    globalDim: clamp(source.globalDim ?? defaults.globalDim, 0, 0.95),
    sources: Array.isArray(source.sources)
      ? source.sources.map((lightSource) => cloneLightSource(lightSource))
      : [],
  };
}

function cloneLightSource(
  source: SceneExperienceState["lighting"]["sources"][number],
): SceneExperienceState["lighting"]["sources"][number] {
  return {
    id: source.id?.trim() || crypto.randomUUID(),
    tokenId: source.tokenId?.trim() || undefined,
    name: source.name?.trim() || "Luz",
    x: Number.isFinite(source.x) ? source.x : 0,
    y: Number.isFinite(source.y) ? source.y : 0,
    radius: Number.isFinite(source.radius) ? source.radius : 160,
    intensity: Number.isFinite(source.intensity) ? source.intensity : 0.75,
    color: normalizeLightColor(source.color),
    visible: source.visible ?? true,
  };
}

function normalizeLightColor(value: string | undefined) {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }

  return "#facc15";
}

function cloneAudioMixer(
  mixer: SceneExperienceState["audioMixer"] | undefined,
): SceneExperienceState["audioMixer"] {
  const defaults = createDefaultSceneExperience().audioMixer;
  const source = mixer ?? defaults;
  const channels = source.channels ?? defaults.channels;

  return {
    masterVolume: clamp(source.masterVolume ?? defaults.masterVolume, 0, 1),
    channels: {
      music: cloneAudioChannel("music", channels.music),
      sound: cloneAudioChannel("sound", channels.sound),
      effect: cloneAudioChannel("effect", channels.effect),
    },
  };
}

function cloneAudioChannel(
  id: AudioChannelId,
  channel: SceneExperienceState["audioMixer"]["channels"][AudioChannelId],
) {
  const fallback = createDefaultSceneExperience().audioMixer.channels[id];

  return {
    ...fallback,
    ...channel,
    id,
    activeCue: channel?.activeCue
      ? normalizeCue(channel.activeCue)
      : undefined,
  };
}

function cloneAudioPresets(
  presets: SceneExperienceState["audioPresets"] | undefined,
): AudioScenePreset[] {
  if (!Array.isArray(presets)) {
    return [];
  }

  return presets
    .filter((preset) => typeof preset.name === "string" && preset.name.trim())
    .map((preset) => ({
      ...preset,
      name: preset.name.trim(),
      description: preset.description?.trim() || undefined,
      mixer: cloneAudioMixer(preset.mixer),
    }));
}

function cloneAudioTransition(
  transition: SceneExperienceState["audioTransition"] | undefined,
): AudioTransitionState | undefined {
  if (!transition?.id || !transition.startedAt) {
    return undefined;
  }

  if (transition.mode !== "fade" && transition.mode !== "crossfade") {
    return undefined;
  }

  return {
    id: transition.id,
    mode: transition.mode,
    durationMs: clamp(Math.round(transition.durationMs), 0, 10000),
    startedAt: transition.startedAt,
    fromPresetId: transition.fromPresetId,
    toPresetId: transition.toPresetId,
    previousMixer:
      transition.mode === "crossfade" && transition.previousMixer
        ? cloneAudioMixer(transition.previousMixer)
        : undefined,
  };
}

function normalizeCue(cue: ActiveAssetCue): ActiveAssetCue {
  const channel = cue.channel ?? cue.type;

  return {
    ...cue,
    channel,
    playback: cue.playback ?? "playing",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function upsertToken(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  sceneId: string,
  token: GameToken,
) {
  await tx.gameToken.upsert({
    where: { id: token.id },
    update: {
      name: token.name,
      entityType: tokenTypeToPrisma[token.type],
      x: token.x,
      y: token.y,
      size: token.size,
      color: token.color,
      visible: token.visible,
    },
    create: {
      id: token.id,
      sceneId,
      name: token.name,
      entityType: tokenTypeToPrisma[token.type],
      x: token.x,
      y: token.y,
      size: token.size,
      color: token.color,
      visible: token.visible,
    },
  });
}
