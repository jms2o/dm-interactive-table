import type {
  CampaignPackageAppliedResources,
  CampaignPackage,
  CampaignPackageAsset,
  CampaignPackageAudioScene,
  CampaignPackageImportIssue,
  CampaignPackageImportReport,
  CampaignPackageImportRequest,
} from "../../../../shared/types/campaign-package";
import { DEFAULT_CAMPAIGN_ID, gameState } from "../../game/game.state";
import { aiService } from "../ai/ai.service";
import { assetService, type ImportedAssetCopy } from "../asset/asset.service";
import { campaignService } from "../campaign/campaign.service";
import { npcService } from "../npc/npc.service";
import { rulesetService } from "../ruleset/ruleset.service";
import type { AssetLibraryItem, AssetLibraryType } from "../../../../shared/types/asset";
import type { GameScene } from "../../../../shared/types/game";
import type {
  ActiveAssetCue,
  AudioMixerState,
  AudioTransitionState,
} from "../../../../shared/types/table-experience";

const PACKAGE_KIND = "dm-interactive-table.campaign-package";
const APP_VERSION = "2.0.0-alpha.21";

export class CampaignPackageService {
  exportCampaign(campaignId = DEFAULT_CAMPAIGN_ID, exportedBy = "dm") {
    const campaign = campaignService.getCampaign(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const worlds = campaignService
      .listWorlds()
      .filter((world) => world.id === campaign.worldId);
    const campaigns = [campaign];
    const sessions = campaignService.listSessions(campaignId);
    const activeScene = gameState.getSnapshot("dm");
    const npcs = npcService.listNPCs(campaignId);
    const enemies = npcService.listEnemies(campaignId);
    const promptRuns = aiService.listPromptRuns(campaignId);
    const ruleset = rulesetService.getCampaignRuleset(campaignId).ruleset;
    const tokens = activeScene.scene?.tokens ?? [];
    const audioScenes = buildAudioSceneManifest(activeScene);
    const assets = buildAssetManifest(
      activeScene,
      assetService.listAssets(campaignId),
    );

    const campaignPackage: CampaignPackage = {
      kind: PACKAGE_KIND,
      schemaVersion: 1,
      packageId: crypto.randomUUID(),
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      manifest: {
        campaignId,
        campaignName: campaign.name,
        rulesetId: ruleset.id,
        exportedBy,
        contentProfile: "dm-private",
        assetMode: "metadata-only",
        counts: {
          worlds: worlds.length,
          campaigns: campaigns.length,
          sessions: sessions.length,
          scenes: activeScene.scene ? 1 : 0,
          tokens: tokens.length,
          npcs: npcs.length,
          enemies: enemies.length,
          promptRuns: promptRuns.length,
          assets: assets.length,
          audioPresets: audioScenes.reduce(
            (total, audioScene) => total + audioScene.presetCount,
            0,
          ),
          audioCues: audioScenes.reduce(
            (total, audioScene) => total + audioScene.cueCount,
            0,
          ),
        },
      },
      data: {
        worlds,
        campaigns,
        sessions,
        activeScene,
        npcs,
        enemies,
        promptRuns,
        rulesets: [ruleset],
        assets,
        audioScenes,
      },
    };

    return clonePackage(campaignPackage);
  }

  validateImport(request: CampaignPackageImportRequest): CampaignPackageImportReport {
    const issues = validatePackage(request.package);
    const hasErrors = issues.some((issue) => issue.severity === "error");
    const appliedResources =
      request.mode === "apply-copy" && !hasErrors
        ? this.applyCopy(request.package, issues)
        : undefined;

    return {
      ok: !hasErrors,
      requestId: request.requestId,
      mode: request.mode,
      importable: !hasErrors,
      applied: Boolean(appliedResources),
      packageId: request.package?.packageId,
      campaignId: request.package?.manifest?.campaignId,
      campaignName: request.package?.manifest?.campaignName,
      schemaVersion: request.package?.schemaVersion,
      counts: request.package?.manifest?.counts,
      appliedResources,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  private applyCopy(
    campaignPackage: CampaignPackage,
    issues: CampaignPackageImportIssue[],
  ): CampaignPackageAppliedResources {
    const sourceWorld = campaignPackage.data.worlds[0];
    const sourceCampaign =
      campaignPackage.data.campaigns.find(
        (campaign) => campaign.id === campaignPackage.manifest.campaignId,
      ) ?? campaignPackage.data.campaigns[0];

    if (!sourceCampaign) {
      throw new Error("Package has no campaign data");
    }

    const importedWorld = sourceWorld
      ? campaignService.importWorldCopy(sourceWorld)
      : undefined;
    const importedCampaign = campaignService.importCampaignCopy(
      sourceCampaign,
      importedWorld?.id,
    );
    const importedSessions = campaignPackage.data.sessions.map((session) =>
      campaignService.importSessionCopy(importedCampaign.id, session),
    );
    const importedNPCs = campaignPackage.data.npcs.map((npc) =>
      npcService.importNPCCopy(importedCampaign.id, npc),
    );
    const importedEnemies = campaignPackage.data.enemies.map((enemy) =>
      npcService.importEnemyCopy(importedCampaign.id, enemy),
    );
    const importedPromptRuns = aiService.importPromptRunCopies(
      importedCampaign.id,
      campaignPackage.data.promptRuns,
    );
    const importedAssets = assetService.importAssetCopies(
      importedCampaign.id,
      campaignPackage.data.assets,
    );
    const assetIdMap = assetIdMapFromCopies(importedAssets);
    const importedScene = campaignPackage.data.activeScene.scene
      ? gameState.saveImportedSceneSnapshot({
          campaignId: importedCampaign.id,
          sessionId: importedSessions[0]?.id,
          scene: remapSceneAssetReferences(
            campaignPackage.data.activeScene.scene,
            assetIdMap,
          ),
        })
      : undefined;

    if (importedScene) {
      issues.push({
        severity: "warning",
        code: "scene-not-activated",
        message:
          "Imported scene snapshot was saved but the live table remains on the current scene.",
      });
    }

    return {
      worldId: importedWorld?.id,
      campaignId: importedCampaign.id,
      sessionIds: importedSessions.map((session) => session.id),
      sceneId: importedScene?.id,
      npcIds: importedNPCs.map((npc) => npc.id),
      enemyIds: importedEnemies.map((enemy) => enemy.id),
      promptRunIds: importedPromptRuns.map((promptRun) => promptRun.id),
      assetIds: importedAssets.map((copy) => copy.asset.id),
    };
  }
}

export const campaignPackageService = new CampaignPackageService();

function validatePackage(value: CampaignPackage): CampaignPackageImportIssue[] {
  const issues: CampaignPackageImportIssue[] = [];

  if (!value || typeof value !== "object") {
    return [
      {
        severity: "error",
        code: "invalid-json",
        message: "Package payload must be an object.",
      },
    ];
  }

  if (value.kind !== PACKAGE_KIND) {
    issues.push({
      severity: "error",
      code: "invalid-kind",
      message: "Package kind is not supported.",
    });
  }

  if (value.schemaVersion !== 1) {
    issues.push({
      severity: "error",
      code: "unsupported-schema",
      message: "Only schemaVersion 1 is supported.",
    });
  }

  if (!value.packageId) {
    issues.push({
      severity: "error",
      code: "missing-package-id",
      message: "Package id is required.",
    });
  }

  if (!value.manifest?.campaignId || !value.manifest?.campaignName) {
    issues.push({
      severity: "error",
      code: "missing-campaign",
      message: "Manifest campaign id and name are required.",
    });
  }

  if (!value.data?.activeScene?.scene) {
    issues.push({
      severity: "error",
      code: "missing-scene",
      message: "Package must include an active scene snapshot.",
    });
  }

  if ((value.data?.campaigns ?? []).length === 0) {
    issues.push({
      severity: "error",
      code: "missing-campaign-data",
      message: "Package must include at least one campaign.",
    });
  }

  const rulesetId = value.manifest?.rulesetId;
  if (rulesetId && !rulesetService.getRuleset(rulesetId)) {
    issues.push({
      severity: "warning",
      code: "unknown-ruleset",
      message: `Ruleset '${rulesetId}' is not registered locally.`,
    });
  }

  if ((value.data?.activeScene?.scene?.tokens ?? []).length === 0) {
    issues.push({
      severity: "warning",
      code: "empty-scene",
      message: "Active scene has no tokens.",
    });
  }

  const assets = value.data?.assets ?? [];
  for (const asset of assets) {
    if (!asset.id || !asset.type || !asset.name || !asset.usage) {
      issues.push({
        severity: "error",
        code: "invalid-asset",
        message: "Every package asset requires id, type, name and usage.",
      });
      break;
    }

    if (asset.source === "asset-storage" && !asset.storageAssetId) {
      issues.push({
        severity: "error",
        code: "missing-storage-asset-id",
        message: "Asset storage package entries require storageAssetId.",
      });
      break;
    }
  }

  const assetMode = (value.manifest as { assetMode?: unknown } | undefined)
    ?.assetMode;
  if (!assetMode) {
    issues.push({
      severity: "warning",
      code: "missing-asset-mode",
      message: "Package does not declare assetMode; assuming metadata-only.",
    });
  } else if (assetMode !== "metadata-only") {
    issues.push({
      severity: "error",
      code: "unsupported-asset-mode",
      message: "Only metadata-only asset packages are supported.",
    });
  }

  if (
    typeof value.manifest?.counts?.assets === "number" &&
    value.manifest.counts.assets !== assets.length
  ) {
    issues.push({
      severity: "warning",
      code: "asset-count-mismatch",
      message: "Manifest asset count does not match package asset entries.",
    });
  }

  const audioScenes = value.data?.audioScenes ?? [];
  const sceneAudioPresetCount =
    value.data?.activeScene?.scene?.experience?.audioPresets?.length ?? 0;

  if (audioScenes.length === 0 && sceneAudioPresetCount > 0) {
    issues.push({
      severity: "warning",
      code: "missing-audio-scenes",
      message:
        "Package has audio presets but no audioScenes audit section; using embedded scene experience.",
    });
  }

  const audioPresetCount = audioScenes.reduce(
    (total, audioScene) => total + audioScene.presetCount,
    0,
  );
  const audioCueCount = audioScenes.reduce(
    (total, audioScene) => total + audioScene.cueCount,
    0,
  );

  if (
    typeof value.manifest?.counts?.audioPresets === "number" &&
    value.manifest.counts.audioPresets !== audioPresetCount
  ) {
    issues.push({
      severity: "warning",
      code: "audio-preset-count-mismatch",
      message:
        "Manifest audio preset count does not match audioScenes entries.",
    });
  }

  if (
    typeof value.manifest?.counts?.audioCues === "number" &&
    value.manifest.counts.audioCues !== audioCueCount
  ) {
    issues.push({
      severity: "warning",
      code: "audio-cue-count-mismatch",
      message: "Manifest audio cue count does not match audioScenes entries.",
    });
  }

  const packagedStorageAssetIds = new Set(
    assets
      .map((asset) => asset.storageAssetId)
      .filter((assetId): assetId is string => Boolean(assetId)),
  );

  for (const audioScene of audioScenes) {
    for (const assetId of audioScene.assetIds) {
      if (!packagedStorageAssetIds.has(assetId)) {
        issues.push({
          severity: "warning",
          code: "audio-asset-not-packaged",
          message: `Audio scene references asset '${assetId}' but it is not present as a storage asset package entry.`,
        });
        break;
      }
    }
  }

  return issues;
}

function clonePackage(campaignPackage: CampaignPackage): CampaignPackage {
  return JSON.parse(JSON.stringify(campaignPackage)) as CampaignPackage;
}

function buildAssetManifest(
  activeScene: ReturnType<typeof gameState.getSnapshot>,
  storedAssets: AssetLibraryItem[],
): CampaignPackageAsset[] {
  const scene = activeScene.scene;

  if (!scene) {
    return storedAssets.map((asset) => assetToPackageAsset(asset));
  }

  const assets = storedAssets.map((asset) => assetToPackageAsset(asset, scene));
  const hasRegisteredMapAsset =
    Boolean(scene.map.assetId) &&
    assets.some((asset) => asset.storageAssetId === scene.map.assetId);

  if (!hasRegisteredMapAsset) {
    assets.push({
      id: `map:${scene.map.id}`,
      type: "map",
      usage: "scene-map",
      name: scene.map.name,
      url: scene.map.imageUrl,
      source: "local-url",
      referencedBy: [scene.id, scene.map.id],
      metadata: {
        width: scene.map.width,
        height: scene.map.height,
        gridSize: scene.map.gridSize,
      },
    });
  }

  for (const token of scene.tokens) {
    assets.push({
      id: `token-swatch:${token.id}`,
      type: "token-swatch",
      usage: "token",
      name: `${token.name} swatch`,
      inlineValue: token.color,
      source: "metadata",
      referencedBy: [token.id],
      metadata: {
        tokenType: token.type,
        visible: token.visible,
      },
    });
  }

  for (const audioCueReference of packageAudioCueReferences(scene, assets)) {
    const cue = audioCueReference.cue;

    assets.push({
      id: `ambience:${cue.id}`,
      type: cue.type,
      usage: "ambience",
      name: cue.name,
      source: "metadata",
      referencedBy: audioCueReference.referencedBy,
      metadata: {
        mood: cue.mood,
        volume: cue.volume,
        loop: cue.loop,
      },
    });
  }

  return assets;
}

function assetToPackageAsset(
  asset: AssetLibraryItem,
  scene?: GameScene,
): CampaignPackageAsset {
  return {
    id: `asset:${asset.id}`,
    type: packageTypeFromAsset(asset.type),
    usage: packageUsageFromAsset(asset.type),
    name: asset.name,
    url: asset.url,
    source: "asset-storage",
    storageAssetId: asset.id,
    referencedBy: referencedByForAsset(asset, scene),
    metadata: {
      ...clonePackageMetadata(asset.metadata),
      provider: asset.provider,
      status: asset.status,
      campaignId: asset.campaignId,
    },
  };
}

function buildAudioSceneManifest(
  activeScene: ReturnType<typeof gameState.getSnapshot>,
): CampaignPackageAudioScene[] {
  const scene = activeScene.scene;

  if (!scene) {
    return [];
  }

  const cueReferences = collectAudioCueReferences(scene);
  const assetIds = [
    ...new Set(
      cueReferences
        .map((reference) => reference.cue.assetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    ),
  ];

  return [
    {
      sceneId: scene.id,
      sceneName: scene.name,
      presetCount: scene.experience.audioPresets.length,
      cueCount: cueReferences.length,
      presetIds: scene.experience.audioPresets.map((preset) => preset.id),
      assetIds,
      transitionMode: scene.experience.audioTransition?.mode,
    },
  ];
}

function packageAudioCueReferences(
  scene: GameScene,
  packagedAssets: CampaignPackageAsset[],
) {
  const packagedStorageIds = new Set(
    packagedAssets
      .map((asset) => asset.storageAssetId)
      .filter((assetId): assetId is string => Boolean(assetId)),
  );
  const references = new Map<
    string,
    { cue: ActiveAssetCue; referencedBy: Set<string> }
  >();

  for (const reference of collectAudioCueReferences(scene)) {
    if (reference.cue.assetId && packagedStorageIds.has(reference.cue.assetId)) {
      continue;
    }

    const key = reference.cue.assetId ?? reference.cue.id;
    const existing = references.get(key);

    if (existing) {
      for (const value of reference.referencedBy) {
        existing.referencedBy.add(value);
      }
      continue;
    }

    references.set(key, {
      cue: reference.cue,
      referencedBy: new Set(reference.referencedBy),
    });
  }

  return [...references.values()].map((reference) => ({
    cue: reference.cue,
    referencedBy: [...reference.referencedBy],
  }));
}

function packageTypeFromAsset(
  type: AssetLibraryType,
): CampaignPackageAsset["type"] {
  return type;
}

function packageUsageFromAsset(
  type: AssetLibraryType,
): CampaignPackageAsset["usage"] {
  if (type === "map") {
    return "scene-map";
  }

  if (type === "music" || type === "sound") {
    return "ambience";
  }

  if (type === "effect") {
    return "effect";
  }

  if (type === "portrait") {
    return "portrait";
  }

  return "token";
}

function referencedByForAsset(asset: AssetLibraryItem, scene?: GameScene) {
  const references = new Set<string>();

  if (scene?.map.assetId === asset.id) {
    references.add(scene.id);
    references.add(scene.map.id);
  }

  for (const token of scene?.tokens ?? []) {
    if (token.imageAssetId === asset.id) {
      references.add(token.id);
    }
  }

  if (scene?.experience.ambience.activeCue?.assetId === asset.id) {
    references.add(scene.id);
  }

  if (scene) {
    for (const audioReference of collectAudioCueReferences(scene)) {
      if (audioReference.cue.assetId === asset.id) {
        for (const referencedBy of audioReference.referencedBy) {
          references.add(referencedBy);
        }
      }
    }
  }

  const linkedMapId = asset.metadata.linkedMapId;
  if (typeof linkedMapId === "string") {
    references.add(linkedMapId);
  }

  const linkedTokenId = asset.metadata.linkedTokenId;
  if (typeof linkedTokenId === "string") {
    references.add(linkedTokenId);
  }

  return references.size > 0 ? [...references] : [asset.campaignId];
}

function collectAudioCueReferences(scene: GameScene) {
  const references: Array<{
    cue: ActiveAssetCue;
    referencedBy: string[];
  }> = [];
  const pushCue = (
    cue: ActiveAssetCue | undefined,
    referencedBy: string[],
  ) => {
    if (!cue) {
      return;
    }

    references.push({
      cue,
      referencedBy,
    });
  };

  pushCue(scene.experience.ambience.activeCue, [scene.id, "ambience"]);

  for (const channelId of audioChannelIds()) {
    pushCue(scene.experience.audioMixer.channels[channelId].activeCue, [
      scene.id,
      `audioMixer:${channelId}`,
    ]);
  }

  for (const preset of scene.experience.audioPresets) {
    for (const channelId of audioChannelIds()) {
      pushCue(preset.mixer.channels[channelId].activeCue, [
        scene.id,
        `audioPreset:${preset.id}`,
      ]);
    }
  }

  if (scene.experience.audioTransition?.previousMixer) {
    for (const channelId of audioChannelIds()) {
      pushCue(
        scene.experience.audioTransition.previousMixer.channels[channelId]
          .activeCue,
        [scene.id, `audioTransition:${scene.experience.audioTransition.id}`],
      );
    }
  }

  return references;
}

function assetIdMapFromCopies(importedAssets: ImportedAssetCopy[]) {
  return new Map(
    importedAssets.map((copy) => [copy.sourceAssetId, copy.asset.id] as const),
  );
}

function remapSceneAssetReferences(
  scene: GameScene,
  assetIdMap: Map<string, string>,
): GameScene {
  return {
    ...scene,
    map: {
      ...scene.map,
      assetId: scene.map.assetId
        ? assetIdMap.get(scene.map.assetId) ?? scene.map.assetId
        : undefined,
    },
    tokens: scene.tokens.map((token) => ({
      ...token,
      imageAssetId: token.imageAssetId
        ? assetIdMap.get(token.imageAssetId) ?? token.imageAssetId
        : undefined,
    })),
    experience: {
      ...scene.experience,
      ambience: {
        ...scene.experience.ambience,
        activeCue: scene.experience.ambience.activeCue
          ? remapCueAssetReference(
              scene.experience.ambience.activeCue,
              assetIdMap,
            )
          : undefined,
      },
      audioMixer: remapAudioMixerAssetReferences(
        scene.experience.audioMixer,
        assetIdMap,
      ),
      audioPresets: scene.experience.audioPresets.map((preset) => ({
        ...preset,
        mixer: remapAudioMixerAssetReferences(preset.mixer, assetIdMap),
      })),
      audioTransition: scene.experience.audioTransition
        ? remapAudioTransitionAssetReferences(
            scene.experience.audioTransition,
            assetIdMap,
          )
        : undefined,
    },
  };
}

function remapAudioTransitionAssetReferences(
  transition: AudioTransitionState,
  assetIdMap: Map<string, string>,
): AudioTransitionState {
  return {
    ...transition,
    previousMixer: transition.previousMixer
      ? remapAudioMixerAssetReferences(transition.previousMixer, assetIdMap)
      : undefined,
  };
}

function remapAudioMixerAssetReferences(
  mixer: AudioMixerState,
  assetIdMap: Map<string, string>,
): AudioMixerState {
  return {
    ...mixer,
    channels: {
      music: remapAudioChannelAssetReferences(mixer.channels.music, assetIdMap),
      sound: remapAudioChannelAssetReferences(mixer.channels.sound, assetIdMap),
      effect: remapAudioChannelAssetReferences(
        mixer.channels.effect,
        assetIdMap,
      ),
    },
  };
}

function remapAudioChannelAssetReferences(
  channel: AudioMixerState["channels"][keyof AudioMixerState["channels"]],
  assetIdMap: Map<string, string>,
) {
  return {
    ...channel,
    activeCue: channel.activeCue
      ? remapCueAssetReference(channel.activeCue, assetIdMap)
      : undefined,
  };
}

function remapCueAssetReference(
  cue: ActiveAssetCue,
  assetIdMap: Map<string, string>,
): ActiveAssetCue {
  return {
    ...cue,
    assetId: cue.assetId
      ? assetIdMap.get(cue.assetId) ?? cue.assetId
      : undefined,
  };
}

function clonePackageMetadata(
  value: unknown,
): NonNullable<CampaignPackageAsset["metadata"]> {
  return JSON.parse(JSON.stringify(value ?? {})) as NonNullable<
    CampaignPackageAsset["metadata"]
  >;
}

function audioChannelIds() {
  return ["music", "sound", "effect"] as const;
}
