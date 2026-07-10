export type AssetLibraryType =
  | "map"
  | "token"
  | "portrait"
  | "music"
  | "sound"
  | "effect";

export type AssetProvider = "local" | "remote" | "generated";

export type AssetStatus = "available" | "missing" | "archived";

export type AssetJsonPrimitive = string | number | boolean | null;

export type AssetJsonValue =
  | AssetJsonPrimitive
  | AssetJsonValue[]
  | { [key: string]: AssetJsonValue };

export interface AssetLibraryItem {
  id: string;
  campaignId: string;
  type: AssetLibraryType;
  name: string;
  url: string;
  provider: AssetProvider;
  status: AssetStatus;
  metadata: Record<string, AssetJsonValue>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  version: 1;
  type: AssetLibraryType;
  name: string;
  url: string;
  provider?: AssetProvider;
  status?: AssetStatus;
  metadata?: Record<string, AssetJsonValue>;
  requestId: string;
}

export interface AssetLibraryResponse {
  version: 1;
  campaignId: string;
  assets: AssetLibraryItem[];
  counts: Record<AssetLibraryType, number>;
  updatedAt: string;
}

