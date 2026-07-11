const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "asset-test-secret-with-at-least-32-characters";
process.env.TS_NODE_PROJECT = path.join(rootDir, "server", "tsconfig.json");

require(path.join(
  rootDir,
  "node_modules",
  "ts-node",
  "register",
  "transpile-only",
));

const {
  ASSET_POLICY_LIMITS,
  AssetPolicyError,
  assertAssetPolicy,
} = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "asset",
  "asset-policy",
));

const baseRequest = {
  version: 1,
  type: "map",
  name: "Reference map",
  url: "/assets/maps/reference.webp",
  metadata: { width: 4096, height: 4096, sizeBytes: 10_000_000 },
  requestId: "asset-policy-test",
};

test("asset policy accepts a bounded local map", () => {
  assert.doesNotThrow(() => assertAssetPolicy(baseRequest, 4));
});

test("asset policy rejects unsafe URLs and oversized maps", () => {
  assert.throws(
    () =>
      assertAssetPolicy(
        { ...baseRequest, url: "javascript:alert(1)" },
        0,
      ),
    AssetPolicyError,
  );
  assert.throws(
    () =>
      assertAssetPolicy(
        {
          ...baseRequest,
          metadata: {
            width: ASSET_POLICY_LIMITS.maxMapDimensionPixels + 1,
            height: 2048,
          },
        },
        0,
      ),
    /width exceeds policy/,
  );
});

test("asset policy enforces campaign and metadata limits", () => {
  assert.throws(
    () =>
      assertAssetPolicy(
        baseRequest,
        ASSET_POLICY_LIMITS.maxAssetsPerCampaign,
      ),
    /Campaign asset limit/,
  );
  assert.throws(
    () =>
      assertAssetPolicy(
        {
          ...baseRequest,
          metadata: { note: "x".repeat(ASSET_POLICY_LIMITS.maxMetadataBytes) },
        },
        0,
      ),
    /metadata is too large/,
  );
});
