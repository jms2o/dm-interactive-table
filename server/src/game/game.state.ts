import type { GameScene } from "../../../shared/types/game";
import type {
  GameHistoryState,
  NamedGameSnapshot,
} from "../../../shared/types/session-workflow";
import {
  createDefaultSceneExperience,
  type ActiveAssetCue,
  type AudioChannelId,
  type AudioMixerAck,
  type AudioMixerCommand,
  type AudioMixerUpdatedEvent,
  type AudioPresetAck,
  type AudioPresetAppliedEvent,
  type AudioPresetApplyCommand,
  type AudioPresetSavedEvent,
  type AudioPresetSaveCommand,
  type AudioPresetManagedEvent,
  type AudioPresetManageCommand,
  type AudioScenePreset,
  type AudioTransitionMode,
  type AudioTransitionSpec,
  type AudioTransitionState,
  type AssetCueAck,
  type AssetCueCommand,
  type AssetCuedEvent,
  type FogUpdateAck,
  type FogUpdateCommand,
  type FogUpdatedEvent,
  type LightSource,
  type LightUpdateAck,
  type LightUpdateCommand,
  type LightUpdatedEvent,
  type SceneExperienceState,
  type VisionOccluder,
  type VisionUpdateAck,
  type VisionUpdateCommand,
  type VisionUpdatedEvent,
} from "../../../shared/types/table-experience";
import type { GameToken, TokenType } from "../../../shared/types/token";
import type {
  ClientRole,
  GameStatePayload,
  NarrativeUpdateAck,
  NarrativeUpdateCommand,
  NarrativeUpdatedEvent,
  TokenMoveAck,
  TokenMoveCommand,
  TokenMovedEvent,
} from "../../../shared/types/realtime";
import { gameRepository } from "../persistence";
import type {
  GameStateRepository,
  NamedSceneSnapshotRecord,
  SceneSnapshot,
} from "../persistence/game.repository";
import { cloneSnapshot } from "../persistence/game.repository";
import {
  assetService,
  DEMO_HERO_TOKEN_ASSET_ID,
  DEMO_MAP_ASSET_ID,
} from "../modules/asset/asset.service";

export const DEFAULT_CAMPAIGN_ID = "demo-campaign";
export const DEFAULT_SESSION_ID = "demo-session";
export const DEFAULT_SCENE_ID = "demo-scene";

type MoveTokenResult = {
  ack: TokenMoveAck;
  event?: TokenMovedEvent;
  isPublicToken: boolean;
};

type NarrativeUpdateResult = {
  ack: NarrativeUpdateAck;
  event?: NarrativeUpdatedEvent;
};

type FogUpdateResult = {
  ack: FogUpdateAck;
  event?: FogUpdatedEvent;
};

type LightUpdateResult = {
  ack: LightUpdateAck;
  event?: LightUpdatedEvent;
};

type VisionUpdateResult = {
  ack: VisionUpdateAck;
  event?: VisionUpdatedEvent;
};

type AssetCueResult = {
  ack: AssetCueAck;
  event?: AssetCuedEvent;
};

type AudioMixerUpdateResult = {
  ack: AudioMixerAck;
  event?: AudioMixerUpdatedEvent;
};

type AudioPresetSaveResult = {
  ack: AudioPresetAck;
  event?: AudioPresetSavedEvent;
};

type AudioPresetApplyResult = {
  ack: AudioPresetAck;
  event?: AudioPresetAppliedEvent;
};

type AudioPresetManageResult = {
  ack: AudioPresetAck;
  event?: AudioPresetManagedEvent;
};

type AddTokenCommand = {
  campaignId: string;
  sceneId: string;
  entityId?: string;
  name: string;
  type: TokenType;
  x: number;
  y: number;
  size: number;
  color: string;
  visible: boolean;
};

type RuntimeState = {
  campaignId: string;
  sessionId: string;
  scene: GameScene;
  dmNarrativeText: string;
  updatedAt: string;
};

const initialScene: GameScene = {
  id: DEFAULT_SCENE_ID,
  name: "Campamento en ruinas",
  map: {
    id: "demo-map",
    assetId: DEMO_MAP_ASSET_ID,
    name: "Mapa de prueba",
    imageUrl: "/assets/maps/demo-camp.png",
    gridSize: 70,
    width: 1400,
    height: 900,
  },
  tokens: [
    {
      id: "token-hero",
      imageAssetId: DEMO_HERO_TOKEN_ASSET_ID,
      name: "Aelar",
      type: "player",
      x: 280,
      y: 350,
      size: 1,
      color: "#3b82f6",
      visible: true,
    },
    {
      id: "token-goblin",
      name: "Emboscador",
      type: "enemy",
      x: 700,
      y: 420,
      size: 1,
      color: "#ef4444",
      visible: true,
    },
    {
      id: "token-secret",
      name: "Sombra oculta",
      type: "npc",
      x: 980,
      y: 260,
      size: 1,
      color: "#7c3aed",
      visible: false,
    },
  ],
  narrativeText:
    "La fogata apenas ilumina las piedras antiguas mientras algo se mueve entre los árboles.",
  experience: createDefaultSceneExperience(),
};

function cloneScene(scene: GameScene): GameScene {
  return {
    ...scene,
    map: { ...scene.map },
    tokens: scene.tokens.map((token) => ({ ...token })),
    experience: cloneExperience(scene.experience),
  };
}

function sceneForRole(scene: GameScene, role: ClientRole): GameScene {
  const cloned = cloneScene(scene);

  if (role === "dm") {
    return cloned;
  }

  const publicTokens = cloned.tokens.filter((token) => token.visible);
  const publicTokenIds = new Set(publicTokens.map((token) => token.id));

  return {
    ...cloned,
    tokens: publicTokens,
    experience: {
      ...cloned.experience,
      lighting: {
        ...cloned.experience.lighting,
        sources: cloned.experience.lighting.sources.filter(
          (source) =>
            source.visible &&
            (!source.tokenId || publicTokenIds.has(source.tokenId)),
        ),
      },
      vision: {
        ...cloned.experience.vision,
        occluders: cloned.experience.vision.occluders.map((occluder) => ({
          ...occluder,
          name: "",
        })),
      },
    },
  };
}

export class GameStateStore {
  constructor(private readonly repository: GameStateRepository) {}

  private readonly visionHistoryLimit = 50;
  private readonly gameHistoryLimit = 50;
  private readonly namedSnapshotLimit = 30;
  private visionUndoStack: SceneExperienceState["vision"][] = [];
  private visionRedoStack: SceneExperienceState["vision"][] = [];
  private gameUndoStack: SceneSnapshot[] = [];
  private gameRedoStack: SceneSnapshot[] = [];
  private namedSnapshots: NamedGameSnapshot[] = [];
  private historySuppressed = false;
  private persistenceQueue = Promise.resolve();
  private contextQueue = Promise.resolve();

  private state: RuntimeState = {
    campaignId: DEFAULT_CAMPAIGN_ID,
    sessionId: DEFAULT_SESSION_ID,
    scene: initialScene,
    dmNarrativeText: "",
    updatedAt: new Date().toISOString(),
  };
  private lastCommittedSnapshot = this.toSnapshot();

  async initialize(
    campaignId = DEFAULT_CAMPAIGN_ID,
    sessionId = DEFAULT_SESSION_ID,
    sessionTitle = "Sesion Demo",
  ) {
    try {
      await this.activateContext(campaignId, sessionId, sessionTitle);
    } catch (error) {
      console.error("Game state persistence initialization failed", error);
    }
  }

  activateContext(
    campaignId: string,
    sessionId: string,
    sessionTitle = "Sesion",
  ) {
    const operation = this.contextQueue.then(async () => {
      await this.flushPersistence();
      let persisted = await this.repository.loadSessionScene(
        campaignId,
        sessionId,
      );

      if (!persisted && campaignId === DEFAULT_CAMPAIGN_ID) {
        persisted = await this.repository.loadScene(campaignId, DEFAULT_SCENE_ID);
      }

      this.state = persisted
        ? runtimeFromSnapshot(persisted, sessionId)
        : {
            campaignId,
            sessionId,
            scene: createSceneForContext(campaignId, sessionId, sessionTitle),
            dmNarrativeText: "",
            updatedAt: new Date().toISOString(),
          };
      this.visionUndoStack = [];
      this.visionRedoStack = [];
      this.gameUndoStack = [];
      this.gameRedoStack = [];
      this.namedSnapshots = (
        await this.repository.listNamedSnapshots(campaignId, sessionId)
      ).map(snapshotMetadata);
      this.lastCommittedSnapshot = this.toSnapshot();

      if (!persisted) {
        await this.repository.saveSceneSnapshot(this.toSnapshot());
      }
    });
    this.contextQueue = operation.catch(() => undefined);
    return operation;
  }

  getSnapshot(role: ClientRole): GameStatePayload {
    return {
      version: 1,
      campaignId: this.state.campaignId,
      sessionId: this.state.sessionId,
      sceneId: this.state.scene.id,
      scene: sceneForRole(this.state.scene, role),
      visionHistory: role === "dm" ? this.getVisionHistory() : undefined,
      history: role === "dm" ? this.getHistoryState() : undefined,
      updatedAt: this.state.updatedAt,
    };
  }

  getHistoryState(): GameHistoryState {
    return {
      canUndo: this.gameUndoStack.length > 0,
      canRedo: this.gameRedoStack.length > 0,
      undoDepth: this.gameUndoStack.length,
      redoDepth: this.gameRedoStack.length,
      snapshots: this.namedSnapshots.map((snapshot) => ({ ...snapshot })),
    };
  }

  undoHistory() {
    const previous = this.gameUndoStack.pop();
    if (!previous) return { ok: false as const, error: "Nothing to undo" };
    this.gameRedoStack.push(this.toSnapshot());
    this.restoreRuntimeSnapshot(previous);
    return { ok: true as const, history: this.getHistoryState() };
  }

  redoHistory() {
    const next = this.gameRedoStack.pop();
    if (!next) return { ok: false as const, error: "Nothing to redo" };
    this.gameUndoStack.push(this.toSnapshot());
    this.restoreRuntimeSnapshot(next);
    return { ok: true as const, history: this.getHistoryState() };
  }

  async createNamedSnapshot(name: string, createdById?: string) {
    if (this.namedSnapshots.length >= this.namedSnapshotLimit) {
      throw new Error("Snapshot limit reached");
    }

    await this.flushPersistence();
    const record: NamedSceneSnapshotRecord = {
      id: crypto.randomUUID(),
      campaignId: this.state.campaignId,
      sessionId: this.state.sessionId,
      sceneId: this.state.scene.id,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      createdById,
      snapshot: this.toSnapshot(),
    };
    await this.repository.saveNamedSnapshot(record);
    this.namedSnapshots = [snapshotMetadata(record), ...this.namedSnapshots];
    return this.getHistoryState();
  }

  async restoreNamedSnapshot(snapshotId: string) {
    const record = await this.repository.loadNamedSnapshot(snapshotId);
    if (
      !record ||
      record.campaignId !== this.state.campaignId ||
      record.sessionId !== this.state.sessionId
    ) {
      throw new Error("Snapshot not found");
    }

    this.pushGameUndo(this.toSnapshot());
    this.gameRedoStack = [];
    this.restoreRuntimeSnapshot(record.snapshot);
    return this.getHistoryState();
  }

  async deleteNamedSnapshot(snapshotId: string) {
    if (!this.namedSnapshots.some((snapshot) => snapshot.id === snapshotId)) {
      throw new Error("Snapshot not found");
    }
    await this.repository.deleteNamedSnapshot(snapshotId);
    this.namedSnapshots = this.namedSnapshots.filter(
      (snapshot) => snapshot.id !== snapshotId,
    );
    return this.getHistoryState();
  }

  updateFog(command: FogUpdateCommand, updatedBy: string): FogUpdateResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectFogUpdate(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectFogUpdate(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;

    if (typeof command.enabled === "boolean") {
      experience.fogOfWar.enabled = command.enabled;
    }

    if (typeof command.opacity === "number") {
      experience.fogOfWar.opacity = clamp(command.opacity, 0.1, 0.95);
    }

    if (command.clearRevealed) {
      experience.fogOfWar.revealedAreas = [];
    }

    if (command.reveal) {
      experience.fogOfWar.revealedAreas.push({
        id: crypto.randomUUID(),
        x: clamp(command.reveal.x, 0, this.state.scene.map.width),
        y: clamp(command.reveal.y, 0, this.state.scene.map.height),
        radius: clamp(command.reveal.radius, 20, this.state.scene.map.width),
        label: command.reveal.label?.trim() || undefined,
      });
      experience.fogOfWar.enabled = true;
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        updatedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  updateLighting(
    command: LightUpdateCommand,
    updatedBy: string,
  ): LightUpdateResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectLightUpdate(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectLightUpdate(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;
    let source: LightSource | undefined;

    if (command.action === "configure") {
      if (typeof command.enabled === "boolean") {
        experience.lighting.enabled = command.enabled;
      }

      if (typeof command.globalDim === "number") {
        experience.lighting.globalDim = clamp(command.globalDim, 0, 0.95);
      }
    }

    if (command.action === "upsert-source") {
      if (!command.source) {
        return this.rejectLightUpdate(
          command.requestId,
          "Light source is required",
        );
      }

      source = normalizeLightSource(
        command.source,
        this.state.scene.map.width,
        this.state.scene.map.height,
      );

      if (source.tokenId) {
        const linkedToken = this.state.scene.tokens.find(
          (token) => token.id === source?.tokenId,
        );

        if (!linkedToken) {
          return this.rejectLightUpdate(command.requestId, "Token not found");
        }

        source = {
          ...source,
          x: linkedToken.x,
          y: linkedToken.y,
        };
      }

      const existingIndex = findLightSourceIndex(
        experience.lighting.sources,
        source,
      );

      if (existingIndex >= 0) {
        experience.lighting.sources[existingIndex] = source;
      } else {
        experience.lighting.sources = [
          ...experience.lighting.sources,
          source,
        ];
      }

      experience.lighting.enabled = true;
    }

    if (command.action === "remove-source") {
      if (!command.sourceId) {
        return this.rejectLightUpdate(
          command.requestId,
          "Light source id is required",
        );
      }

      experience.lighting.sources = experience.lighting.sources.filter(
        (candidate) => candidate.id !== command.sourceId,
      );
    }

    if (command.action === "clear-sources") {
      experience.lighting.sources = [];
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);
    const clonedSource = source ? cloneLightSource(source) : undefined;

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
        source: clonedSource,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        source: clonedSource,
        updatedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  updateVision(
    command: VisionUpdateCommand,
    updatedBy: string,
  ): VisionUpdateResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectVisionUpdate(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectVisionUpdate(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;
    let affectedOccluders: VisionOccluder[] | undefined;
    const previousVision = cloneVision(experience.vision);

    if (command.action === "undo") {
      const restored = this.visionUndoStack.pop();
      if (!restored) {
        return this.rejectVisionUpdate(command.requestId, "Nothing to undo");
      }
      this.visionRedoStack.push(previousVision);
      experience.vision = cloneVision(restored);
      affectedOccluders = experience.vision.occluders;
    }

    if (command.action === "redo") {
      const restored = this.visionRedoStack.pop();
      if (!restored) {
        return this.rejectVisionUpdate(command.requestId, "Nothing to redo");
      }
      this.visionUndoStack.push(previousVision);
      experience.vision = cloneVision(restored);
      affectedOccluders = experience.vision.occluders;
    }

    if (command.action === "configure") {
      if (typeof command.enabled === "boolean") {
        experience.vision.enabled = command.enabled;
      }
      if (typeof command.defaultRange === "number") {
        experience.vision.defaultRange = clamp(
          command.defaultRange,
          this.state.scene.map.gridSize,
          Math.max(this.state.scene.map.width, this.state.scene.map.height) * 2,
        );
      }
    }

    if (command.action === "upsert-occluder") {
      if (!command.occluder) {
        return this.rejectVisionUpdate(command.requestId, "Occluder is required");
      }

      const occluder = normalizeVisionOccluder(
        command.occluder,
        this.state.scene.map.width,
        this.state.scene.map.height,
      );
      const existingIndex = experience.vision.occluders.findIndex(
        (candidate) => candidate.id === occluder.id,
      );

      if (existingIndex >= 0) {
        experience.vision.occluders[existingIndex] = occluder;
      } else {
        experience.vision.occluders = [...experience.vision.occluders, occluder];
      }

      experience.vision.enabled = true;
      affectedOccluders = [occluder];
    }

    if (command.action === "set-occluder-open") {
      if (!command.occluderId || typeof command.open !== "boolean") {
        return this.rejectVisionUpdate(
          command.requestId,
          "Occluder id and open state are required",
        );
      }

      const occluder = experience.vision.occluders.find(
        (candidate) => candidate.id === command.occluderId,
      );

      if (!occluder) {
        return this.rejectVisionUpdate(command.requestId, "Occluder not found");
      }

      if (occluder.kind !== "door") {
        return this.rejectVisionUpdate(command.requestId, "Occluder is not a door");
      }

      occluder.open = command.open;
      affectedOccluders = [occluder];
    }

    if (command.action === "duplicate-occluder") {
      const source = experience.vision.occluders.find(
        (candidate) => candidate.id === command.occluderId,
      );
      if (!source) {
        return this.rejectVisionUpdate(command.requestId, "Occluder not found");
      }

      const offsetX = command.offsetX ?? this.state.scene.map.gridSize / 2;
      const offsetY = command.offsetY ?? this.state.scene.map.gridSize / 2;
      const duplicate = normalizeVisionOccluder(
        {
          ...source,
          id: undefined,
          name: `${source.name} copia`,
          x1: source.x1 + offsetX,
          y1: source.y1 + offsetY,
          x2: source.x2 + offsetX,
          y2: source.y2 + offsetY,
        },
        this.state.scene.map.width,
        this.state.scene.map.height,
      );
      experience.vision.occluders = [
        ...experience.vision.occluders,
        duplicate,
      ];
      affectedOccluders = [duplicate];
    }

    if (command.action === "split-occluder") {
      const sourceIndex = experience.vision.occluders.findIndex(
        (candidate) => candidate.id === command.occluderId,
      );
      if (sourceIndex < 0) {
        return this.rejectVisionUpdate(command.requestId, "Occluder not found");
      }

      const source = experience.vision.occluders[sourceIndex];
      const splitPoint = {
        x: clamp(
          command.splitPoint?.x ?? (source.x1 + source.x2) / 2,
          0,
          this.state.scene.map.width,
        ),
        y: clamp(
          command.splitPoint?.y ?? (source.y1 + source.y2) / 2,
          0,
          this.state.scene.map.height,
        ),
      };
      if (
        Math.hypot(splitPoint.x - source.x1, splitPoint.y - source.y1) < 1 ||
        Math.hypot(splitPoint.x - source.x2, splitPoint.y - source.y2) < 1
      ) {
        return this.rejectVisionUpdate(
          command.requestId,
          "Split point must be inside the occluder",
        );
      }

      const first = normalizeVisionOccluder(
        {
          ...source,
          id: undefined,
          name: `${source.name} A`,
          x2: splitPoint.x,
          y2: splitPoint.y,
        },
        this.state.scene.map.width,
        this.state.scene.map.height,
      );
      const second = normalizeVisionOccluder(
        {
          ...source,
          id: undefined,
          name: `${source.name} B`,
          x1: splitPoint.x,
          y1: splitPoint.y,
        },
        this.state.scene.map.width,
        this.state.scene.map.height,
      );
      experience.vision.occluders.splice(sourceIndex, 1, first, second);
      affectedOccluders = [first, second];
    }

    if (command.action === "batch-update") {
      if (!command.occluderIds?.length) {
        return this.rejectVisionUpdate(command.requestId, "Occluder ids are required");
      }
      const ids = new Set(command.occluderIds);
      const selected = experience.vision.occluders.filter((candidate) =>
        ids.has(candidate.id),
      );
      if (!selected.length) {
        return this.rejectVisionUpdate(command.requestId, "Occluders not found");
      }
      if (
        !command.batchPatch &&
        typeof command.offsetX !== "number" &&
        typeof command.offsetY !== "number"
      ) {
        return this.rejectVisionUpdate(command.requestId, "Batch change is required");
      }

      const updatedById = new Map(
        selected.map((source) => {
          const kind = command.batchPatch?.kind ?? source.kind;
          const updated = normalizeVisionOccluder(
            {
              ...source,
              kind,
              open:
                kind === "door"
                  ? (command.batchPatch?.open ?? source.open)
                  : false,
              blocksSight:
                command.batchPatch?.blocksSight ?? source.blocksSight,
              blocksLight:
                command.batchPatch?.blocksLight ?? source.blocksLight,
              x1: source.x1 + (command.offsetX ?? 0),
              y1: source.y1 + (command.offsetY ?? 0),
              x2: source.x2 + (command.offsetX ?? 0),
              y2: source.y2 + (command.offsetY ?? 0),
            },
            this.state.scene.map.width,
            this.state.scene.map.height,
          );
          return [source.id, updated] as const;
        }),
      );
      experience.vision.occluders = experience.vision.occluders.map(
        (candidate) => updatedById.get(candidate.id) ?? candidate,
      );
      affectedOccluders = [...updatedById.values()];
    }

    if (command.action === "batch-remove") {
      if (!command.occluderIds?.length) {
        return this.rejectVisionUpdate(command.requestId, "Occluder ids are required");
      }
      const ids = new Set(command.occluderIds);
      affectedOccluders = experience.vision.occluders.filter((candidate) =>
        ids.has(candidate.id),
      );
      if (!affectedOccluders.length) {
        return this.rejectVisionUpdate(command.requestId, "Occluders not found");
      }
      experience.vision.occluders = experience.vision.occluders.filter(
        (candidate) => !ids.has(candidate.id),
      );
    }

    if (command.action === "remove-occluder") {
      if (!command.occluderId) {
        return this.rejectVisionUpdate(command.requestId, "Occluder id is required");
      }
      const removed = experience.vision.occluders.find(
        (candidate) => candidate.id === command.occluderId,
      );
      if (!removed) {
        return this.rejectVisionUpdate(command.requestId, "Occluder not found");
      }
      affectedOccluders = [removed];
      experience.vision.occluders = experience.vision.occluders.filter(
        (candidate) => candidate.id !== command.occluderId,
      );
    }

    if (command.action === "clear-occluders") {
      affectedOccluders = experience.vision.occluders;
      experience.vision.occluders = [];
    }

    if (command.action !== "undo" && command.action !== "redo") {
      this.visionUndoStack.push(previousVision);
      if (this.visionUndoStack.length > this.visionHistoryLimit) {
        this.visionUndoStack.shift();
      }
      this.visionRedoStack = [];
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );
    const clonedExperience = cloneExperience(experience);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
        affectedOccluders: affectedOccluders?.map((occluder) => ({ ...occluder })),
        history: this.getVisionHistory(),
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        history: this.getVisionHistory(),
        updatedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  getVisionHistory() {
    return {
      canUndo: this.visionUndoStack.length > 0,
      canRedo: this.visionRedoStack.length > 0,
    };
  }

  cueAsset(command: AssetCueCommand, cuedBy: string): AssetCueResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectAssetCue(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectAssetCue(command.requestId, "Scene not found");
    }

    const cueName = command.cue.name.trim();

    if (!cueName) {
      return this.rejectAssetCue(command.requestId, "Cue name is required");
    }

    const resolvedAsset = command.cue.assetId
      ? assetService.getAsset(command.campaignId, command.cue.assetId)
      : null;

    if (command.cue.assetId) {
      if (!resolvedAsset) {
        return this.rejectAssetCue(command.requestId, "Cue asset not found");
      }

      if (resolvedAsset.status !== "available") {
        return this.rejectAssetCue(command.requestId, "Cue asset unavailable");
      }

      if (resolvedAsset.type !== command.cue.type) {
        return this.rejectAssetCue(command.requestId, "Cue asset type mismatch");
      }
    }

    const now = new Date().toISOString();
    const experience = this.state.scene.experience;
    const channel = channelFromCueType(command.cue.type);
    const activeCue: ActiveAssetCue = {
      id: crypto.randomUUID(),
      assetId: command.cue.assetId,
      assetUrl: resolvedAsset?.url,
      channel,
      type: command.cue.type,
      name: resolvedAsset?.name ?? cueName,
      mood: command.cue.mood ?? "mystery",
      volume: clamp(command.cue.volume ?? 0.55, 0, 1),
      loop: command.cue.loop ?? command.cue.type === "music",
      playback: "playing",
      startedAt: now,
    };

    experience.ambience = {
      enabled: true,
      activeCue,
    };
    experience.audioTransition = undefined;
    experience.audioMixer.channels[channel] = {
      ...experience.audioMixer.channels[channel],
      playback: "playing",
      activeCue,
    };

    if (command.displayMode) {
      experience.displayMode = command.displayMode;
    }

    if (typeof command.playerHandout === "string") {
      experience.playerHandout = command.playerHandout.trim();
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        cuedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  updateAudioMixer(
    command: AudioMixerCommand,
    updatedBy: string,
  ): AudioMixerUpdateResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectAudioMixerUpdate(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectAudioMixerUpdate(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;
    experience.audioTransition = undefined;

    if (command.action === "set-master-volume") {
      if (typeof command.volume !== "number") {
        return this.rejectAudioMixerUpdate(
          command.requestId,
          "Master volume is required",
        );
      }

      experience.audioMixer.masterVolume = clamp(command.volume, 0, 1);
    } else {
      if (!command.channel) {
        return this.rejectAudioMixerUpdate(
          command.requestId,
          "Audio channel is required",
        );
      }

      const channel = experience.audioMixer.channels[command.channel];

      if (!channel) {
        return this.rejectAudioMixerUpdate(
          command.requestId,
          "Audio channel not found",
        );
      }

      if (command.action === "set-volume") {
        if (typeof command.volume !== "number") {
          return this.rejectAudioMixerUpdate(
            command.requestId,
            "Channel volume is required",
          );
        }

        channel.volume = clamp(command.volume, 0, 1);
      }

      if (command.action === "mute") {
        channel.muted = true;
      }

      if (command.action === "unmute") {
        channel.muted = false;
      }

      if (command.action === "pause") {
        channel.playback = channel.activeCue ? "paused" : "idle";
        if (channel.activeCue) {
          channel.activeCue.playback = channel.playback;
        }
      }

      if (command.action === "resume") {
        channel.playback = channel.activeCue ? "playing" : "idle";
        if (channel.activeCue) {
          channel.activeCue.playback = channel.playback;
        }
      }

      if (command.action === "stop") {
        channel.playback = "stopped";
        if (channel.activeCue) {
          channel.activeCue.playback = "stopped";
        }

        const stoppedCueId = channel.activeCue?.id;
        channel.activeCue = undefined;

        if (
          stoppedCueId &&
          experience.ambience.activeCue?.id === stoppedCueId
        ) {
          experience.ambience.activeCue = undefined;
          experience.ambience.enabled = false;
        }
      }

      if (
        channel.activeCue &&
        experience.ambience.activeCue?.id === channel.activeCue.id
      ) {
        experience.ambience.activeCue = {
          ...channel.activeCue,
          playback: channel.playback,
        };
      }
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        updatedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  saveAudioPreset(
    command: AudioPresetSaveCommand,
    savedBy: string,
  ): AudioPresetSaveResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectAudioPresetSave(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectAudioPresetSave(command.requestId, "Scene not found");
    }

    const presetName = command.name.trim();

    if (!presetName) {
      return this.rejectAudioPresetSave(
        command.requestId,
        "Preset name is required",
      );
    }

    const now = new Date().toISOString();
    const experience = this.state.scene.experience;
    const existingIndex = experience.audioPresets.findIndex(
      (candidate) => candidate.name.toLowerCase() === presetName.toLowerCase(),
    );
    const existing = existingIndex >= 0
      ? experience.audioPresets[existingIndex]
      : undefined;
    const preset: AudioScenePreset = {
      id: existing?.id ?? crypto.randomUUID(),
      name: presetName,
      description: command.description?.trim() || undefined,
      mixer: cloneAudioMixer(experience.audioMixer),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      experience.audioPresets[existingIndex] = preset;
    } else {
      experience.audioPresets = [...experience.audioPresets, preset];
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);
    const clonedPreset = cloneAudioPreset(preset);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
        preset: clonedPreset,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        preset: clonedPreset,
        savedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  applyAudioPreset(
    command: AudioPresetApplyCommand,
    appliedBy: string,
  ): AudioPresetApplyResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectAudioPresetApply(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectAudioPresetApply(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;
    const preset = experience.audioPresets.find(
      (candidate) => candidate.id === command.presetId,
    );

    if (!preset) {
      return this.rejectAudioPresetApply(command.requestId, "Preset not found");
    }

    const now = new Date().toISOString();
    const previousMixer = cloneAudioMixer(experience.audioMixer);
    const transition = normalizeTransitionSpec(command.transition);
    experience.audioMixer = instantiatePresetMixer(
      preset.mixer,
      now,
      command.campaignId,
    );
    experience.audioTransition = createAudioTransitionState({
      previousMixer,
      startedAt: now,
      toPresetId: preset.id,
      transition,
    });

    const activeCue = firstActiveAudioCue(experience.audioMixer);
    experience.ambience = activeCue
      ? { enabled: true, activeCue }
      : { enabled: false };

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);
    const clonedPreset = cloneAudioPreset(preset);

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
        preset: clonedPreset,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        preset: clonedPreset,
        appliedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  manageAudioPreset(
    command: AudioPresetManageCommand,
    managedBy: string,
  ): AudioPresetManageResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectAudioPresetManage(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectAudioPresetManage(command.requestId, "Scene not found");
    }

    const experience = this.state.scene.experience;
    const presetIndex = experience.audioPresets.findIndex(
      (candidate) => candidate.id === command.presetId,
    );

    if (presetIndex < 0) {
      return this.rejectAudioPresetManage(command.requestId, "Preset not found");
    }

    const existingPreset = experience.audioPresets[presetIndex];
    let resultPreset: AudioScenePreset | undefined = existingPreset;

    if (command.action === "rename") {
      const nextName = command.name?.trim() ?? "";

      if (!nextName) {
        return this.rejectAudioPresetManage(
          command.requestId,
          "Preset name is required",
        );
      }

      const duplicate = experience.audioPresets.some(
        (candidate) =>
          candidate.id !== command.presetId &&
          candidate.name.toLowerCase() === nextName.toLowerCase(),
      );

      if (duplicate) {
        return this.rejectAudioPresetManage(
          command.requestId,
          "Preset name already exists",
        );
      }

      resultPreset = {
        ...existingPreset,
        name: nextName,
        updatedAt: new Date().toISOString(),
      };
      experience.audioPresets[presetIndex] = resultPreset;
    }

    if (command.action === "delete") {
      resultPreset = existingPreset;
      experience.audioPresets = experience.audioPresets.filter(
        (candidate) => candidate.id !== command.presetId,
      );

      if (
        experience.audioTransition?.toPresetId === command.presetId ||
        experience.audioTransition?.fromPresetId === command.presetId
      ) {
        experience.audioTransition = undefined;
      }
    }

    if (command.action === "move") {
      if (!command.direction) {
        return this.rejectAudioPresetManage(
          command.requestId,
          "Move direction is required",
        );
      }

      const targetIndex =
        command.direction === "up" ? presetIndex - 1 : presetIndex + 1;

      if (
        targetIndex >= 0 &&
        targetIndex < experience.audioPresets.length
      ) {
        const presets = [...experience.audioPresets];
        const [movedPreset] = presets.splice(presetIndex, 1);
        presets.splice(targetIndex, 0, movedPreset);
        experience.audioPresets = presets;
      }

      resultPreset = existingPreset;
    }

    this.touchExperience();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    const clonedExperience = cloneExperience(experience);
    const clonedPreset = resultPreset ? cloneAudioPreset(resultPreset) : undefined;

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        experience: clonedExperience,
        preset: clonedPreset,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        experience: clonedExperience,
        action: command.action,
        preset: clonedPreset,
        managedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  moveToken(command: TokenMoveCommand, movedBy: string): MoveTokenResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectTokenMove(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectTokenMove(command.requestId, "Scene not found");
    }

    const token = this.state.scene.tokens.find(
      (candidate) => candidate.id === command.tokenId,
    );

    if (!token) {
      return this.rejectTokenMove(command.requestId, "Token not found");
    }

    if (
      command.position.x < 0 ||
      command.position.y < 0 ||
      command.position.x > this.state.scene.map.width ||
      command.position.y > this.state.scene.map.height
    ) {
      return this.rejectTokenMove(
        command.requestId,
        "Token position is outside map bounds",
      );
    }

    token.x = command.position.x;
    token.y = command.position.y;
    const attachedLightSources =
      this.state.scene.experience.lighting.sources.filter(
        (source) => source.tokenId === token.id,
      );

    for (const source of attachedLightSources) {
      source.x = token.x;
      source.y = token.y;
    }

    this.touch();
    if (attachedLightSources.length > 0) {
      this.state.scene.experience.updatedAt = this.state.updatedAt;
    }

    this.persistSafely(() =>
      this.repository.saveTokenPosition({
        sceneId: this.state.scene.id,
        tokenId: token.id,
        x: token.x,
        y: token.y,
      }),
    );
    if (attachedLightSources.length > 0) {
      this.persistSafely(() =>
        this.repository.saveSceneSnapshot(this.toSnapshot()),
      );
    }

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
        token: {
          id: token.id,
          x: token.x,
          y: token.y,
        },
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        tokenId: token.id,
        x: token.x,
        y: token.y,
        movedBy,
        updatedAt: this.state.updatedAt,
      },
      isPublicToken: token.visible,
    };
  }

  updateNarrative(
    command: NarrativeUpdateCommand,
    updatedBy: string,
  ): NarrativeUpdateResult {
    if (command.campaignId !== this.state.campaignId) {
      return this.rejectNarrativeUpdate(command.requestId, "Campaign not found");
    }

    if (command.sceneId !== this.state.scene.id) {
      return this.rejectNarrativeUpdate(command.requestId, "Scene not found");
    }

    if (command.visibility === "public") {
      this.state.scene.narrativeText = command.text;
    } else {
      this.state.dmNarrativeText = command.text;
    }

    this.touch();
    this.persistSafely(() =>
      this.repository.saveNarrative({
        sceneId: this.state.scene.id,
        text: command.text,
        visibility: command.visibility,
      }),
    );

    return {
      ack: {
        ok: true,
        requestId: command.requestId,
      },
      event: {
        version: 1,
        sceneId: this.state.scene.id,
        text: command.text,
        visibility: command.visibility,
        updatedBy,
        updatedAt: this.state.updatedAt,
      },
    };
  }

  addTokenToScene(command: AddTokenCommand): GameToken | null {
    if (
      command.campaignId !== this.state.campaignId ||
      command.sceneId !== this.state.scene.id
    ) {
      return null;
    }

    const token: GameToken = {
      id: crypto.randomUUID(),
      name: command.name,
      type: command.type,
      x: clamp(command.x, 0, this.state.scene.map.width),
      y: clamp(command.y, 0, this.state.scene.map.height),
      size: command.size,
      color: command.color,
      visible: command.visible,
    };

    this.state.scene.tokens.push(token);
    this.touch();
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );

    return { ...token };
  }

  saveImportedSceneSnapshot(input: {
    campaignId: string;
    sessionId?: string;
    scene: GameScene;
  }) {
    const tokenIdMap = new Map(
      input.scene.tokens.map((token) => [token.id, crypto.randomUUID()]),
    );
    const experience = cloneExperience(input.scene.experience);
    experience.lighting.sources = experience.lighting.sources.map((source) => ({
      ...source,
      tokenId: source.tokenId
        ? tokenIdMap.get(source.tokenId) ?? source.tokenId
        : undefined,
    }));
    const scene = cloneScene({
      ...input.scene,
      id: crypto.randomUUID(),
      experience,
      tokens: input.scene.tokens.map((token) => ({
        ...token,
        id: tokenIdMap.get(token.id) ?? crypto.randomUUID(),
      })),
    });
    const snapshot: SceneSnapshot = {
      campaignId: input.campaignId,
      sessionId: input.sessionId ?? "",
      scene,
      dmNarrativeText: "",
      updatedAt: new Date().toISOString(),
    };

    this.persistSafely(() => this.repository.saveSceneSnapshot(snapshot));
    return cloneScene(scene);
  }

  private rejectTokenMove(requestId: string, error: string): MoveTokenResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
      isPublicToken: false,
    };
  }

  private rejectNarrativeUpdate(
    requestId: string,
    error: string,
  ): NarrativeUpdateResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectFogUpdate(requestId: string, error: string): FogUpdateResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectLightUpdate(requestId: string, error: string): LightUpdateResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectVisionUpdate(requestId: string, error: string): VisionUpdateResult {
    return { ack: { ok: false, requestId, error } };
  }

  private rejectAssetCue(requestId: string, error: string): AssetCueResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectAudioMixerUpdate(
    requestId: string,
    error: string,
  ): AudioMixerUpdateResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectAudioPresetSave(
    requestId: string,
    error: string,
  ): AudioPresetSaveResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectAudioPresetApply(
    requestId: string,
    error: string,
  ): AudioPresetApplyResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private rejectAudioPresetManage(
    requestId: string,
    error: string,
  ): AudioPresetManageResult {
    return {
      ack: {
        ok: false,
        requestId,
        error,
      },
    };
  }

  private touch() {
    if (
      !this.historySuppressed &&
      this.lastCommittedSnapshot.campaignId === this.state.campaignId &&
      this.lastCommittedSnapshot.sessionId === this.state.sessionId
    ) {
      this.pushGameUndo(this.lastCommittedSnapshot);
      this.gameRedoStack = [];
    }
    this.state.updatedAt = new Date().toISOString();
    this.lastCommittedSnapshot = this.toSnapshot();
  }

  private touchExperience() {
    this.touch();
    this.state.scene.experience.updatedAt = this.state.updatedAt;
    this.lastCommittedSnapshot = this.toSnapshot();
  }

  private pushGameUndo(snapshot: SceneSnapshot) {
    this.gameUndoStack.push(cloneSnapshot(snapshot));
    if (this.gameUndoStack.length > this.gameHistoryLimit) {
      this.gameUndoStack.splice(0, this.gameUndoStack.length - this.gameHistoryLimit);
    }
  }

  private restoreRuntimeSnapshot(snapshot: SceneSnapshot) {
    this.historySuppressed = true;
    const updatedAt = new Date().toISOString();
    this.state = {
      ...runtimeFromSnapshot(snapshot, this.state.sessionId),
      campaignId: this.state.campaignId,
      sessionId: this.state.sessionId,
      updatedAt,
    };
    this.state.scene.experience.updatedAt = updatedAt;
    this.lastCommittedSnapshot = this.toSnapshot();
    this.historySuppressed = false;
    this.persistSafely(() =>
      this.repository.saveSceneSnapshot(this.toSnapshot()),
    );
  }

  private toSnapshot(): SceneSnapshot {
    return {
      campaignId: this.state.campaignId,
      sessionId: this.state.sessionId,
      scene: cloneScene(this.state.scene),
      dmNarrativeText: this.state.dmNarrativeText,
      updatedAt: this.state.updatedAt,
    };
  }

  async flushPersistence() {
    await this.persistenceQueue;
  }

  private persistSafely(operation: () => Promise<void>) {
    this.persistenceQueue = this.persistenceQueue
      .then(operation)
      .catch((error) => {
        console.error("Game state persistence write failed", error);
      });
  }
}

export const gameState = new GameStateStore(gameRepository);

function runtimeFromSnapshot(
  snapshot: SceneSnapshot,
  fallbackSessionId: string,
): RuntimeState {
  return {
    campaignId: snapshot.campaignId,
    sessionId: snapshot.sessionId || fallbackSessionId,
    scene: withSceneExperience(snapshot.scene),
    dmNarrativeText: snapshot.dmNarrativeText,
    updatedAt: snapshot.updatedAt,
  };
}

function createSceneForContext(
  campaignId: string,
  sessionId: string,
  sessionTitle: string,
) {
  const scene = cloneScene(initialScene);
  if (
    campaignId === DEFAULT_CAMPAIGN_ID &&
    sessionId === DEFAULT_SESSION_ID
  ) {
    return scene;
  }

  const tokenIds = new Map(
    scene.tokens.map((token) => [token.id, crypto.randomUUID()]),
  );
  scene.id = crypto.randomUUID();
  scene.name = sessionTitle.trim() || "Escena de preparacion";
  scene.map.id = crypto.randomUUID();
  scene.tokens = scene.tokens.map((token) => ({
    ...token,
    id: tokenIds.get(token.id)!,
  }));
  scene.experience.lighting.sources = scene.experience.lighting.sources.map(
    (source) => ({
      ...source,
      tokenId: source.tokenId
        ? tokenIds.get(source.tokenId) ?? source.tokenId
        : undefined,
    }),
  );
  return scene;
}

function snapshotMetadata(record: NamedSceneSnapshotRecord): NamedGameSnapshot {
  return {
    id: record.id,
    campaignId: record.campaignId,
    sessionId: record.sessionId,
    sceneId: record.sceneId,
    name: record.name,
    createdAt: record.createdAt,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function withSceneExperience(scene: GameScene): GameScene {
  return {
    ...scene,
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
    vision: cloneVision(source.vision ?? defaults.vision),
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

function cloneVision(
  vision: SceneExperienceState["vision"] | undefined,
): SceneExperienceState["vision"] {
  const defaults = createDefaultSceneExperience().vision;
  const source = vision ?? defaults;

  return {
    enabled: source.enabled ?? defaults.enabled,
    defaultRange: Number.isFinite(source.defaultRange)
      ? source.defaultRange
      : defaults.defaultRange,
    occluders: (source.occluders ?? []).map((occluder) => ({
      ...occluder,
      kind: occluder.kind === "door" ? "door" : "wall",
      open: occluder.kind === "door" ? (occluder.open ?? false) : false,
    })),
  };
}

function normalizeVisionOccluder(
  occluder: NonNullable<VisionUpdateCommand["occluder"]>,
  mapWidth: number,
  mapHeight: number,
): VisionOccluder {
  return {
    id: occluder.id || crypto.randomUUID(),
    name: occluder.name.trim() || "Obstáculo",
    kind: occluder.kind === "door" ? "door" : "wall",
    open: occluder.kind === "door" ? (occluder.open ?? false) : false,
    x1: clamp(occluder.x1, 0, mapWidth),
    y1: clamp(occluder.y1, 0, mapHeight),
    x2: clamp(occluder.x2, 0, mapWidth),
    y2: clamp(occluder.y2, 0, mapHeight),
    blocksSight: occluder.blocksSight ?? true,
    blocksLight: occluder.blocksLight ?? true,
  };
}

function cloneLightSource(source: LightSource): LightSource {
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

function normalizeLightSource(
  source: NonNullable<LightUpdateCommand["source"]>,
  mapWidth: number,
  mapHeight: number,
): LightSource {
  return {
    id: source.id?.trim() || crypto.randomUUID(),
    tokenId: source.tokenId?.trim() || undefined,
    name: source.name.trim() || "Luz",
    x: clamp(source.x, 0, mapWidth),
    y: clamp(source.y, 0, mapHeight),
    radius: clamp(source.radius, 20, Math.max(mapWidth, mapHeight)),
    intensity: clamp(source.intensity, 0, 1),
    color: normalizeLightColor(source.color),
    visible: source.visible ?? true,
  };
}

function findLightSourceIndex(sources: LightSource[], source: LightSource) {
  if (source.tokenId) {
    const tokenIndex = sources.findIndex(
      (candidate) => candidate.tokenId === source.tokenId,
    );

    if (tokenIndex >= 0) {
      return tokenIndex;
    }
  }

  return sources.findIndex((candidate) => candidate.id === source.id);
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
    .map((preset) => cloneAudioPreset(preset));
}

function cloneAudioPreset(preset: AudioScenePreset): AudioScenePreset {
  return {
    ...preset,
    name: preset.name.trim(),
    description: preset.description?.trim() || undefined,
    mixer: cloneAudioMixer(preset.mixer),
  };
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

function normalizeTransitionSpec(
  transition: AudioTransitionSpec | undefined,
): Required<AudioTransitionSpec> {
  const mode = transition?.mode ?? "cut";
  const normalizedMode: AudioTransitionMode =
    mode === "fade" || mode === "crossfade" ? mode : "cut";
  const defaultDuration = normalizedMode === "cut" ? 0 : 1200;

  return {
    mode: normalizedMode,
    durationMs: clamp(
      Math.round(transition?.durationMs ?? defaultDuration),
      0,
      10000,
    ),
  };
}

function createAudioTransitionState({
  previousMixer,
  startedAt,
  toPresetId,
  transition,
}: {
  previousMixer: SceneExperienceState["audioMixer"];
  startedAt: string;
  toPresetId: string;
  transition: Required<AudioTransitionSpec>;
}): AudioTransitionState | undefined {
  if (transition.mode === "cut" || transition.durationMs <= 0) {
    return undefined;
  }

  return {
    id: crypto.randomUUID(),
    mode: transition.mode,
    durationMs: transition.durationMs,
    startedAt,
    toPresetId,
    previousMixer:
      transition.mode === "crossfade" && mixerHasActiveCue(previousMixer)
        ? cloneAudioMixer(previousMixer)
        : undefined,
  };
}

function mixerHasActiveCue(mixer: SceneExperienceState["audioMixer"]) {
  return audioChannelIds().some((channelId) =>
    Boolean(mixer.channels[channelId].activeCue),
  );
}

function instantiatePresetMixer(
  mixer: SceneExperienceState["audioMixer"],
  startedAt: string,
  campaignId: string,
): SceneExperienceState["audioMixer"] {
  const clonedMixer = cloneAudioMixer(mixer);

  for (const channelId of audioChannelIds()) {
    const channel = clonedMixer.channels[channelId];

    if (!channel.activeCue) {
      channel.playback = channel.playback === "stopped" ? "stopped" : "idle";
      continue;
    }

    const resolvedAsset = channel.activeCue.assetId
      ? assetService.getAsset(campaignId, channel.activeCue.assetId)
      : null;
    const playback = channel.playback === "paused" ? "paused" : "playing";

    channel.playback = playback;
    channel.activeCue = {
      ...channel.activeCue,
      id: crypto.randomUUID(),
      assetUrl: resolvedAsset?.url ?? channel.activeCue.assetUrl,
      playback,
      startedAt,
    };
  }

  return clonedMixer;
}

function firstActiveAudioCue(
  mixer: SceneExperienceState["audioMixer"],
): ActiveAssetCue | undefined {
  for (const channelId of audioChannelIds()) {
    const cue = mixer.channels[channelId].activeCue;

    if (cue && cue.playback !== "stopped") {
      return normalizeCue(cue);
    }
  }

  return undefined;
}

function normalizeCue(cue: ActiveAssetCue): ActiveAssetCue {
  const channel = cue.channel ?? channelFromCueType(cue.type);
  const playback = cue.playback ?? "playing";

  return {
    ...cue,
    channel,
    playback,
  };
}

function channelFromCueType(type: AudioChannelId): AudioChannelId {
  return type;
}

function audioChannelIds(): AudioChannelId[] {
  return ["music", "sound", "effect"];
}
