import type { AIPromptRun } from "./ai";
import type {
  CampaignSummary,
  GameSessionSummary,
  WorldSummary,
} from "./campaign";
import type { GameStatePayload } from "./realtime";
import type { EnemyProfile, NPCProfile } from "./npc";
import type { RulesetSummary } from "./ruleset";
import type { AudioTransitionMode } from "./table-experience";

export type CampaignPackageKind =
  "dm-interactive-table.campaign-package";

export type CampaignPackageImportMode = "validate" | "preview" | "apply-copy";

export type CampaignPackageAssetType =
  | "map"
  | "token"
  | "token-swatch"
  | "music"
  | "sound"
  | "effect"
  | "portrait";

export type CampaignPackageAssetUsage =
  | "scene-map"
  | "token"
  | "ambience"
  | "effect"
  | "portrait";

export type CampaignPackageJsonPrimitive = string | number | boolean | null;

export type CampaignPackageJsonValue =
  | CampaignPackageJsonPrimitive
  | CampaignPackageJsonValue[]
  | { [key: string]: CampaignPackageJsonValue };

export interface CampaignPackageAsset {
  id: string;
  type: CampaignPackageAssetType;
  usage: CampaignPackageAssetUsage;
  name: string;
  url?: string;
  inlineValue?: string;
  source: "asset-storage" | "local-url" | "generated" | "metadata";
  storageAssetId?: string;
  referencedBy: string[];
  metadata?: Record<string, CampaignPackageJsonValue>;
}

export interface CampaignPackageManifest {
  campaignId: string;
  campaignName: string;
  rulesetId: string;
  exportedBy: string;
  contentProfile: "dm-private";
  assetMode: "metadata-only";
  counts: {
    worlds: number;
    campaigns: number;
    sessions: number;
    scenes: number;
    tokens: number;
    npcs: number;
    enemies: number;
    promptRuns: number;
    assets: number;
    audioPresets: number;
    audioCues: number;
  };
}

export interface CampaignPackageAudioScene {
  sceneId: string;
  sceneName: string;
  presetCount: number;
  cueCount: number;
  presetIds: string[];
  assetIds: string[];
  transitionMode?: AudioTransitionMode;
}

export interface CampaignPackageData {
  worlds: WorldSummary[];
  campaigns: CampaignSummary[];
  sessions: GameSessionSummary[];
  activeScene: GameStatePayload;
  npcs: NPCProfile[];
  enemies: EnemyProfile[];
  promptRuns: AIPromptRun[];
  rulesets: RulesetSummary[];
  assets: CampaignPackageAsset[];
  audioScenes: CampaignPackageAudioScene[];
}

export interface CampaignPackage {
  kind: CampaignPackageKind;
  schemaVersion: 1;
  packageId: string;
  appVersion: string;
  exportedAt: string;
  manifest: CampaignPackageManifest;
  data: CampaignPackageData;
}

export interface CampaignPackageImportRequest {
  version: 1;
  mode: CampaignPackageImportMode;
  package: CampaignPackage;
  requestId: string;
}

export interface CampaignPackageImportIssue {
  severity: "warning" | "error";
  code: string;
  message: string;
}

export interface CampaignPackageAppliedResources {
  worldId?: string;
  campaignId?: string;
  sessionIds: string[];
  sceneId?: string;
  npcIds: string[];
  enemyIds: string[];
  promptRunIds: string[];
  assetIds: string[];
}

export interface CampaignPackageImportReport {
  ok: boolean;
  requestId: string;
  mode: CampaignPackageImportMode;
  importable: boolean;
  applied: boolean;
  packageId?: string;
  campaignId?: string;
  campaignName?: string;
  schemaVersion?: number;
  counts?: CampaignPackageManifest["counts"];
  appliedResources?: CampaignPackageAppliedResources;
  issues: CampaignPackageImportIssue[];
  checkedAt: string;
}
