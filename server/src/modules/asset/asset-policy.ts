import { Buffer } from "node:buffer";
import type {
  AssetLibraryType,
  AssetPolicyLimits,
  CreateAssetRequest,
} from "../../../../shared/types/asset";

const MEBIBYTE = 1024 * 1024;

export const ASSET_POLICY_LIMITS: AssetPolicyLimits = {
  maxAssetsPerCampaign: 500,
  maxNameCharacters: 120,
  maxUrlCharacters: 2048,
  maxMetadataBytes: 16 * 1024,
  maxMapDimensionPixels: 8192,
  maxAudioDurationSeconds: 4 * 60 * 60,
  maxDeclaredBytes: {
    map: 50 * MEBIBYTE,
    token: 10 * MEBIBYTE,
    portrait: 15 * MEBIBYTE,
    music: 40 * MEBIBYTE,
    sound: 20 * MEBIBYTE,
    effect: 20 * MEBIBYTE,
  },
};

export class AssetPolicyError extends Error {
  readonly code = "ASSET_POLICY_REJECTED";

  constructor(message: string) {
    super(message);
    this.name = "AssetPolicyError";
  }
}

export function assertAssetPolicy(
  request: CreateAssetRequest,
  currentAssetCount: number,
) {
  if (currentAssetCount >= ASSET_POLICY_LIMITS.maxAssetsPerCampaign) {
    throw new AssetPolicyError("Campaign asset limit reached");
  }

  const name = request.name.trim();
  if (!name || name.length > ASSET_POLICY_LIMITS.maxNameCharacters) {
    throw new AssetPolicyError("Asset name is outside the allowed length");
  }

  const url = request.url.trim();
  if (
    !url ||
    url.length > ASSET_POLICY_LIMITS.maxUrlCharacters ||
    !isAllowedAssetUrl(url)
  ) {
    throw new AssetPolicyError("Asset URL is not allowed");
  }

  const metadata = request.metadata ?? {};
  const metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  if (metadataBytes > ASSET_POLICY_LIMITS.maxMetadataBytes) {
    throw new AssetPolicyError("Asset metadata is too large");
  }

  const sizeBytes = numericMetadata(metadata.sizeBytes);
  if (
    sizeBytes !== undefined &&
    (sizeBytes < 0 ||
      sizeBytes > ASSET_POLICY_LIMITS.maxDeclaredBytes[request.type])
  ) {
    throw new AssetPolicyError("Declared asset size exceeds policy");
  }

  if (request.type === "map") {
    assertMapDimension(metadata.width, "width");
    assertMapDimension(metadata.height, "height");
  }

  if (isAudioType(request.type)) {
    const durationSeconds = numericMetadata(metadata.durationSeconds);
    if (
      durationSeconds !== undefined &&
      (durationSeconds < 0 ||
        durationSeconds > ASSET_POLICY_LIMITS.maxAudioDurationSeconds)
    ) {
      throw new AssetPolicyError("Audio duration exceeds policy");
    }
  }
}

function isAllowedAssetUrl(value: string) {
  if (/^\/assets\/[a-zA-Z0-9/_.,@%+\-]+$/.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function assertMapDimension(value: unknown, label: string) {
  const dimension = numericMetadata(value);
  if (
    dimension !== undefined &&
    (dimension <= 0 || dimension > ASSET_POLICY_LIMITS.maxMapDimensionPixels)
  ) {
    throw new AssetPolicyError(`Map ${label} exceeds policy`);
  }
}

function numericMetadata(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isAudioType(type: AssetLibraryType) {
  return type === "music" || type === "sound" || type === "effect";
}
