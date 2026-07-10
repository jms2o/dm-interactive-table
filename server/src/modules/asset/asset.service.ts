import type {
  AssetProvider,
  AssetJsonValue,
  AssetLibraryItem,
  AssetLibraryResponse,
  AssetLibraryType,
  CreateAssetRequest,
} from "../../../../shared/types/asset";
import type { CampaignPackageAsset } from "../../../../shared/types/campaign-package";
import { campaignService } from "../campaign/campaign.service";

const DEMO_CAMPAIGN_ID = "demo-campaign";
export const DEMO_MAP_ASSET_ID = "asset-demo-map-camp";
export const DEMO_HERO_TOKEN_ASSET_ID = "asset-demo-token-aelar";
export const DEMO_AMBIENCE_ASSET_ID = "asset-demo-ambience-ruins";

export type ImportedAssetCopy = {
  sourceAssetId: string;
  asset: AssetLibraryItem;
};

export class AssetService {
  private assets = new Map<string, AssetLibraryItem>();

  constructor() {
    const now = new Date().toISOString();

    this.seed({
      id: DEMO_MAP_ASSET_ID,
      campaignId: DEMO_CAMPAIGN_ID,
      type: "map",
      name: "Mapa de prueba",
      url: "/assets/maps/demo-camp.png",
      provider: "local",
      status: "available",
      metadata: {
        width: 1400,
        height: 900,
        gridSize: 70,
        linkedMapId: "demo-map",
        usage: "scene-map",
      },
      createdAt: now,
      updatedAt: now,
    });
    this.seed({
      id: DEMO_HERO_TOKEN_ASSET_ID,
      campaignId: DEMO_CAMPAIGN_ID,
      type: "token",
      name: "Token Aelar",
      url: "/assets/tokens/aelar.png",
      provider: "local",
      status: "available",
      metadata: {
        linkedTokenId: "token-hero",
        usage: "token-image",
      },
      createdAt: now,
      updatedAt: now,
    });
    this.seed({
      id: DEMO_AMBIENCE_ASSET_ID,
      campaignId: DEMO_CAMPAIGN_ID,
      type: "music",
      name: "Ruinas nocturnas",
      url: "/assets/music/ruins-night.wav",
      provider: "local",
      status: "available",
      metadata: {
        mood: "mystery",
        loop: true,
        usage: "ambience",
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  listAssets(campaignId: string, type?: AssetLibraryType) {
    return [...this.assets.values()]
      .filter((asset) => asset.campaignId === campaignId)
      .filter((asset) => !type || asset.type === type)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(cloneAsset);
  }

  getAsset(campaignId: string, assetId: string) {
    const asset = this.assets.get(assetId);

    if (!asset || asset.campaignId !== campaignId) {
      return null;
    }

    return cloneAsset(asset);
  }

  getLibrary(campaignId: string): AssetLibraryResponse {
    const assets = this.listAssets(campaignId);

    return libraryResponse(campaignId, assets);
  }

  getLibraryByType(
    campaignId: string,
    type: AssetLibraryType,
  ): AssetLibraryResponse {
    const assets = this.listAssets(campaignId, type);

    return libraryResponse(campaignId, assets);
  }

  createAsset(campaignId: string, request: CreateAssetRequest) {
    if (!campaignService.getCampaign(campaignId)) {
      throw new Error("Campaign not found");
    }

    const now = new Date().toISOString();
    const asset: AssetLibraryItem = {
      id: crypto.randomUUID(),
      campaignId,
      type: request.type,
      name: request.name.trim(),
      url: request.url.trim(),
      provider: request.provider ?? providerFromUrl(request.url),
      status: request.status ?? "available",
      metadata: cloneMetadata(request.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
    };

    this.assets.set(asset.id, asset);
    return cloneAsset(asset);
  }

  importAssetCopies(
    campaignId: string,
    packageAssets: CampaignPackageAsset[],
  ): ImportedAssetCopy[] {
    const copies: ImportedAssetCopy[] = [];

    for (const packageAsset of packageAssets) {
      if (
        packageAsset.source !== "asset-storage" ||
        !packageAsset.storageAssetId ||
        !packageAsset.url
      ) {
        continue;
      }

      const type = assetTypeFromPackage(packageAsset.type);
      if (!type) {
        continue;
      }

      const copy = this.createAsset(campaignId, {
        version: 1,
        type,
        name: `${packageAsset.name} (Importado)`,
        url: packageAsset.url,
        provider: providerFromPackage(packageAsset),
        status: "available",
        metadata: {
          ...cloneMetadata(packageAsset.metadata ?? {}),
          importedFromPackageAssetId: packageAsset.id,
          importedSourceAssetId: packageAsset.storageAssetId,
        },
        requestId: crypto.randomUUID(),
      });

      copies.push({
        sourceAssetId: packageAsset.storageAssetId,
        asset: copy,
      });
    }

    return copies;
  }

  private seed(asset: AssetLibraryItem) {
    this.assets.set(asset.id, cloneAsset(asset));
  }
}

export const assetService = new AssetService();

function libraryResponse(
  campaignId: string,
  assets: AssetLibraryItem[],
): AssetLibraryResponse {
  return {
    version: 1,
    campaignId,
    assets,
    counts: countByType(assets),
    updatedAt: new Date().toISOString(),
  };
}

function cloneAsset(asset: AssetLibraryItem): AssetLibraryItem {
  return {
    ...asset,
    metadata: cloneMetadata(asset.metadata),
  };
}

function cloneMetadata(metadata: unknown): Record<string, AssetJsonValue> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return JSON.parse(JSON.stringify(metadata)) as Record<string, AssetJsonValue>;
}

function countByType(
  assets: AssetLibraryItem[],
): Record<AssetLibraryType, number> {
  return {
    map: assets.filter((asset) => asset.type === "map").length,
    token: assets.filter((asset) => asset.type === "token").length,
    portrait: assets.filter((asset) => asset.type === "portrait").length,
    music: assets.filter((asset) => asset.type === "music").length,
    sound: assets.filter((asset) => asset.type === "sound").length,
    effect: assets.filter((asset) => asset.type === "effect").length,
  };
}

function providerFromUrl(url: string): AssetProvider {
  if (url.startsWith("/assets/")) {
    return "local";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return "remote";
  }

  return "generated";
}

function providerFromPackage(packageAsset: CampaignPackageAsset): AssetProvider {
  const provider = packageAsset.metadata?.provider;

  return provider === "local" ||
    provider === "remote" ||
    provider === "generated"
    ? provider
    : providerFromUrl(packageAsset.url ?? "");
}

function assetTypeFromPackage(
  type: CampaignPackageAsset["type"],
): AssetLibraryType | null {
  if (type === "token-swatch") {
    return null;
  }

  return type;
}
