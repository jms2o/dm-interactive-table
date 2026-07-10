export type DisplayMode = "standard" | "cinematic";

export type AmbienceMood =
  | "quiet"
  | "mystery"
  | "danger"
  | "combat"
  | "wonder";

export type AssetCueType = "music" | "sound" | "effect";

export type AudioChannelId = AssetCueType;

export type AudioPlaybackState = "idle" | "playing" | "paused" | "stopped";

export interface FogRevealArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  label?: string;
}

export interface FogOfWarState {
  enabled: boolean;
  opacity: number;
  revealedAreas: FogRevealArea[];
}

export interface LightSource {
  id: string;
  tokenId?: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
  visible: boolean;
}

export interface LightingState {
  enabled: boolean;
  globalDim: number;
  sources: LightSource[];
}

export interface VisionOccluder {
  id: string;
  name: string;
  kind: 'wall' | 'door';
  open: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blocksSight: boolean;
  blocksLight: boolean;
}

export interface VisionState {
  enabled: boolean;
  defaultRange: number;
  occluders: VisionOccluder[];
}

export interface ActiveAssetCue {
  id: string;
  assetId?: string;
  assetUrl?: string;
  channel: AudioChannelId;
  type: AssetCueType;
  name: string;
  mood: AmbienceMood;
  volume: number;
  loop: boolean;
  playback: AudioPlaybackState;
  startedAt: string;
}

export interface AmbienceState {
  enabled: boolean;
  activeCue?: ActiveAssetCue;
}

export interface AudioChannelState {
  id: AudioChannelId;
  label: string;
  volume: number;
  muted: boolean;
  playback: AudioPlaybackState;
  activeCue?: ActiveAssetCue;
}

export interface AudioMixerState {
  masterVolume: number;
  channels: Record<AudioChannelId, AudioChannelState>;
}

export interface AudioScenePreset {
  id: string;
  name: string;
  description?: string;
  mixer: AudioMixerState;
  createdAt: string;
  updatedAt: string;
}

export type AudioTransitionMode = "cut" | "fade" | "crossfade";

export interface AudioTransitionSpec {
  mode: AudioTransitionMode;
  durationMs?: number;
}

export interface AudioTransitionState {
  id: string;
  mode: Exclude<AudioTransitionMode, "cut">;
  durationMs: number;
  startedAt: string;
  fromPresetId?: string;
  toPresetId?: string;
  previousMixer?: AudioMixerState;
}

export interface SceneExperienceState {
  fogOfWar: FogOfWarState;
  lighting: LightingState;
  vision: VisionState;
  ambience: AmbienceState;
  audioMixer: AudioMixerState;
  audioPresets: AudioScenePreset[];
  audioTransition?: AudioTransitionState;
  displayMode: DisplayMode;
  playerHandout: string;
  updatedAt: string;
}

export interface FogUpdateCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  enabled?: boolean;
  opacity?: number;
  reveal?: {
    x: number;
    y: number;
    radius: number;
    label?: string;
  };
  clearRevealed?: boolean;
  requestId: string;
}

export interface FogUpdateAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  error?: string;
}

export interface FogUpdatedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  updatedBy: string;
  updatedAt: string;
}

export type LightUpdateAction =
  | "configure"
  | "upsert-source"
  | "remove-source"
  | "clear-sources";

export interface LightUpdateCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  action: LightUpdateAction;
  enabled?: boolean;
  globalDim?: number;
  source?: {
    id?: string;
    tokenId?: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    intensity: number;
    color: string;
    visible?: boolean;
  };
  sourceId?: string;
  requestId: string;
}

export interface LightUpdateAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  source?: LightSource;
  error?: string;
}

export interface LightUpdatedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  source?: LightSource;
  updatedBy: string;
  updatedAt: string;
}

export type VisionUpdateAction =
  | "configure"
  | "upsert-occluder"
  | "set-occluder-open"
  | "duplicate-occluder"
  | "split-occluder"
  | "batch-update"
  | "batch-remove"
  | "undo"
  | "redo"
  | "remove-occluder"
  | "clear-occluders";

export interface VisionUpdateCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  action: VisionUpdateAction;
  enabled?: boolean;
  defaultRange?: number;
  occluder?: {
    id?: string;
    name: string;
    kind?: 'wall' | 'door';
    open?: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    blocksSight?: boolean;
    blocksLight?: boolean;
  };
  occluderId?: string;
  open?: boolean;
  offsetX?: number;
  offsetY?: number;
  splitPoint?: { x: number; y: number };
  occluderIds?: string[];
  batchPatch?: {
    kind?: 'wall' | 'door';
    open?: boolean;
    blocksSight?: boolean;
    blocksLight?: boolean;
  };
  requestId: string;
}

export interface VisionHistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface VisionUpdateAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  occluder?: VisionOccluder;
  affectedOccluders?: VisionOccluder[];
  history?: VisionHistoryState;
  error?: string;
}

export interface VisionUpdatedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  history: VisionHistoryState;
  updatedBy: string;
  updatedAt: string;
}

export interface AssetCueCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  cue: {
    assetId?: string;
    type: AssetCueType;
    name: string;
    mood?: AmbienceMood;
    volume?: number;
    loop?: boolean;
  };
  displayMode?: DisplayMode;
  playerHandout?: string;
  requestId: string;
}

export interface AssetCueAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  error?: string;
}

export interface AssetCuedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  cuedBy: string;
  updatedAt: string;
}

export type AudioMixerAction =
  | "pause"
  | "resume"
  | "stop"
  | "set-volume"
  | "mute"
  | "unmute"
  | "set-master-volume";

export interface AudioMixerCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  action: AudioMixerAction;
  channel?: AudioChannelId;
  volume?: number;
  requestId: string;
}

export interface AudioMixerAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  error?: string;
}

export interface AudioMixerUpdatedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  updatedBy: string;
  updatedAt: string;
}

export interface AudioPresetSaveCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  name: string;
  description?: string;
  requestId: string;
}

export interface AudioPresetApplyCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  presetId: string;
  transition?: AudioTransitionSpec;
  requestId: string;
}

export type AudioPresetManageAction = "rename" | "delete" | "move";

export interface AudioPresetManageCommand {
  version: 1;
  campaignId: string;
  sceneId: string;
  presetId: string;
  action: AudioPresetManageAction;
  name?: string;
  direction?: "up" | "down";
  requestId: string;
}

export interface AudioPresetAck {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  preset?: AudioScenePreset;
  error?: string;
}

export interface AudioPresetSavedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  preset: AudioScenePreset;
  savedBy: string;
  updatedAt: string;
}

export interface AudioPresetAppliedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  preset: AudioScenePreset;
  appliedBy: string;
  updatedAt: string;
}

export interface AudioPresetManagedEvent {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  action: AudioPresetManageAction;
  preset?: AudioScenePreset;
  managedBy: string;
  updatedAt: string;
}

export function createDefaultSceneExperience(
  updatedAt = new Date().toISOString(),
): SceneExperienceState {
  return {
    fogOfWar: {
      enabled: false,
      opacity: 0.72,
      revealedAreas: [],
    },
    lighting: {
      enabled: false,
      globalDim: 0.58,
      sources: [],
    },
    vision: {
      enabled: false,
      defaultRange: 560,
      occluders: [],
    },
    ambience: {
      enabled: false,
    },
    audioMixer: {
      masterVolume: 0.85,
      channels: {
        music: {
          id: "music",
          label: "Música",
          volume: 0.7,
          muted: false,
          playback: "idle",
        },
        sound: {
          id: "sound",
          label: "Sonido",
          volume: 0.8,
          muted: false,
          playback: "idle",
        },
        effect: {
          id: "effect",
          label: "Efectos",
          volume: 0.9,
          muted: false,
          playback: "idle",
        },
      },
    },
    audioPresets: [],
    displayMode: "standard",
    playerHandout: "",
    updatedAt,
  };
}
