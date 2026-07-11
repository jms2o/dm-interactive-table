import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { GameScene } from "../../../shared/types/game";
import type { NamedGameSnapshot } from "../../../shared/types/session-workflow";
import {
  createDefaultSceneExperience,
  type ActiveAssetCue,
  type AudioChannelId,
  type AudioScenePreset,
  type AudioTransitionState,
  type SceneExperienceState,
} from "../../../shared/types/table-experience";
import { env } from "../config/env";

export type PersistenceMode = "memory" | "local" | "prisma";

export type SceneSnapshot = {
  campaignId: string;
  sessionId: string;
  scene: GameScene;
  dmNarrativeText: string;
  updatedAt: string;
};

export type NamedSceneSnapshotRecord = NamedGameSnapshot & {
  createdById?: string;
  snapshot: SceneSnapshot;
};

export type TokenPositionUpdate = {
  sceneId: string;
  tokenId: string;
  x: number;
  y: number;
};

export type NarrativePersistenceUpdate = {
  sceneId: string;
  text: string;
  visibility: "public" | "dm";
};

export interface GameStateRepository {
  readonly mode: PersistenceMode;
  loadScene(campaignId: string, sceneId: string): Promise<SceneSnapshot | null>;
  loadSessionScene(
    campaignId: string,
    sessionId: string,
  ): Promise<SceneSnapshot | null>;
  saveSceneSnapshot(snapshot: SceneSnapshot): Promise<void>;
  saveTokenPosition(update: TokenPositionUpdate): Promise<void>;
  saveNarrative(update: NarrativePersistenceUpdate): Promise<void>;
  listNamedSnapshots(
    campaignId: string,
    sessionId: string,
  ): Promise<NamedSceneSnapshotRecord[]>;
  saveNamedSnapshot(snapshot: NamedSceneSnapshotRecord): Promise<void>;
  loadNamedSnapshot(snapshotId: string): Promise<NamedSceneSnapshotRecord | null>;
  deleteNamedSnapshot(snapshotId: string): Promise<void>;
}

export function cloneSnapshot(snapshot: SceneSnapshot): SceneSnapshot {
  return {
    ...snapshot,
    scene: cloneScene(snapshot.scene),
  };
}

export class MemoryGameStateRepository implements GameStateRepository {
  readonly mode: PersistenceMode = "memory";
  protected snapshots = new Map<string, SceneSnapshot>();
  protected namedSnapshots = new Map<string, NamedSceneSnapshotRecord>();

  async loadScene(
    campaignId: string,
    sceneId: string,
  ): Promise<SceneSnapshot | null> {
    const snapshot = this.snapshots.get(this.key(campaignId, sceneId));
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async saveSceneSnapshot(snapshot: SceneSnapshot): Promise<void> {
    this.snapshots.set(this.key(snapshot.campaignId, snapshot.scene.id), cloneSnapshot(snapshot));
  }

  async loadSessionScene(campaignId: string, sessionId: string) {
    const snapshot = [...this.snapshots.values()]
      .filter(
        (candidate) =>
          candidate.campaignId === campaignId &&
          candidate.sessionId === sessionId,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async saveTokenPosition(update: TokenPositionUpdate): Promise<void> {
    for (const [key, snapshot] of this.snapshots) {
      if (snapshot.scene.id !== update.sceneId) {
        continue;
      }

      const token = snapshot.scene.tokens.find(
        (candidate) => candidate.id === update.tokenId,
      );

      if (!token) {
        continue;
      }

      token.x = update.x;
      token.y = update.y;
      snapshot.updatedAt = new Date().toISOString();
      this.snapshots.set(key, cloneSnapshot(snapshot));
      return;
    }
  }

  async saveNarrative(update: NarrativePersistenceUpdate): Promise<void> {
    for (const [key, snapshot] of this.snapshots) {
      if (snapshot.scene.id !== update.sceneId) {
        continue;
      }

      if (update.visibility === "public") {
        snapshot.scene.narrativeText = update.text;
      } else {
        snapshot.dmNarrativeText = update.text;
      }

      snapshot.updatedAt = new Date().toISOString();
      this.snapshots.set(key, cloneSnapshot(snapshot));
      return;
    }
  }

  async listNamedSnapshots(campaignId: string, sessionId: string) {
    return [...this.namedSnapshots.values()]
      .filter(
        (record) =>
          record.campaignId === campaignId && record.sessionId === sessionId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(cloneNamedSnapshot);
  }

  async saveNamedSnapshot(snapshot: NamedSceneSnapshotRecord) {
    this.namedSnapshots.set(snapshot.id, cloneNamedSnapshot(snapshot));
  }

  async loadNamedSnapshot(snapshotId: string) {
    const snapshot = this.namedSnapshots.get(snapshotId);
    return snapshot ? cloneNamedSnapshot(snapshot) : null;
  }

  async deleteNamedSnapshot(snapshotId: string) {
    this.namedSnapshots.delete(snapshotId);
  }

  protected key(campaignId: string, sceneId: string) {
    return `${campaignId}:${sceneId}`;
  }
}

export class LocalFileGameStateRepository
  extends MemoryGameStateRepository
  implements GameStateRepository
{
  override readonly mode: PersistenceMode = "local";
  private loaded = false;
  private writeQueue = Promise.resolve();
  private readonly filePath: string;

  constructor(dataDir = env.dataDir) {
    super();
    const root = isAbsolute(dataDir) ? dataDir : resolve(process.cwd(), dataDir);
    this.filePath = resolve(root, "game-state.json");
  }

  override async loadScene(campaignId: string, sceneId: string) {
    await this.ensureLoaded();
    return super.loadScene(campaignId, sceneId);
  }

  override async saveSceneSnapshot(snapshot: SceneSnapshot) {
    await this.ensureLoaded();
    await super.saveSceneSnapshot(snapshot);
    await this.persist();
  }

  override async loadSessionScene(campaignId: string, sessionId: string) {
    await this.ensureLoaded();
    return super.loadSessionScene(campaignId, sessionId);
  }

  override async saveTokenPosition(update: TokenPositionUpdate) {
    await this.ensureLoaded();
    await super.saveTokenPosition(update);
    await this.persist();
  }

  override async saveNarrative(update: NarrativePersistenceUpdate) {
    await this.ensureLoaded();
    await super.saveNarrative(update);
    await this.persist();
  }

  override async listNamedSnapshots(campaignId: string, sessionId: string) {
    await this.ensureLoaded();
    return super.listNamedSnapshots(campaignId, sessionId);
  }

  override async saveNamedSnapshot(snapshot: NamedSceneSnapshotRecord) {
    await this.ensureLoaded();
    await super.saveNamedSnapshot(snapshot);
    await this.persist();
  }

  override async loadNamedSnapshot(snapshotId: string) {
    await this.ensureLoaded();
    return super.loadNamedSnapshot(snapshotId);
  }

  override async deleteNamedSnapshot(snapshotId: string) {
    await this.ensureLoaded();
    await super.deleteNamedSnapshot(snapshotId);
    await this.persist();
  }

  private async ensureLoaded() {
    if (this.loaded) {
      return;
    }

    this.loaded = true;

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as
        | SceneSnapshot[]
        | {
            version: 2;
            scenes: SceneSnapshot[];
            namedSnapshots: NamedSceneSnapshotRecord[];
          };
      const snapshots = Array.isArray(parsed) ? parsed : parsed.scenes;
      const namedSnapshots = Array.isArray(parsed)
        ? []
        : parsed.namedSnapshots ?? [];

      if (!Array.isArray(snapshots) || !Array.isArray(namedSnapshots)) {
        throw new Error("Local game state has an invalid structure");
      }

      for (const snapshot of snapshots) {
        if (snapshot?.campaignId && snapshot?.scene?.id) {
          this.snapshots.set(
            this.key(snapshot.campaignId, snapshot.scene.id),
            cloneSnapshot(snapshot),
          );
        }
      }

      for (const record of namedSnapshots) {
        if (record?.id && record?.snapshot?.scene?.id) {
          this.namedSnapshots.set(record.id, cloneNamedSnapshot(record));
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async persist() {
    const payload = JSON.stringify(
      {
        version: 2,
        scenes: [...this.snapshots.values()].map((snapshot) =>
          cloneSnapshot(snapshot),
        ),
        namedSnapshots: [...this.namedSnapshots.values()].map((snapshot) =>
          cloneNamedSnapshot(snapshot),
        ),
      },
      null,
      2,
    );
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporaryPath, payload, "utf8");
      await rename(temporaryPath, this.filePath);
    });

    await this.writeQueue;
  }
}

function cloneNamedSnapshot(
  record: NamedSceneSnapshotRecord,
): NamedSceneSnapshotRecord {
  return { ...record, snapshot: cloneSnapshot(record.snapshot) };
}

function cloneScene(scene: GameScene): GameScene {
  return {
    ...scene,
    map: { ...scene.map },
    tokens: scene.tokens.map((token) => ({ ...token })),
    experience: cloneExperience(scene.experience),
  };
}

function cloneExperience(
  experience: SceneExperienceState | undefined,
): SceneExperienceState {
  const defaults = createDefaultSceneExperience();
  const source = experience ?? defaults;
  const sourceAmbience = source.ambience ?? defaults.ambience;

  return {
    ...defaults,
    ...source,
    fogOfWar: {
      ...defaults.fogOfWar,
      ...source.fogOfWar,
      revealedAreas: (source.fogOfWar?.revealedAreas ?? []).map((area) => ({
        ...area,
      })),
    },
    lighting: cloneLighting(source.lighting ?? defaults.lighting),
    ambience: {
      ...defaults.ambience,
      ...sourceAmbience,
      activeCue: sourceAmbience.activeCue
        ? normalizeCue(sourceAmbience.activeCue)
        : undefined,
    },
    audioMixer: cloneAudioMixer(source.audioMixer ?? defaults.audioMixer),
    audioPresets: cloneAudioPresets(source.audioPresets ?? []),
    audioTransition: cloneAudioTransition(source.audioTransition),
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
