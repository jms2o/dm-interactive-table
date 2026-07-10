const assert = require("node:assert/strict");
const { rm } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.AUTH_SECRET = "recovery-test-secret-with-at-least-32-characters";
process.env.DATA_DIR = path.join(rootDir, "tmp", `recovery-bootstrap-${process.pid}`);
process.env.TS_NODE_PROJECT = path.join(rootDir, "server", "tsconfig.json");

require(path.join(
  rootDir,
  "server",
  "node_modules",
  "ts-node",
  "register",
  "transpile-only",
));

const { GameStateStore } = require(path.join(
  rootDir,
  "server",
  "src",
  "game",
  "game.state",
));
const { LocalFileGameStateRepository } = require(path.join(
  rootDir,
  "server",
  "src",
  "persistence",
  "game.repository",
));

test("the active scene recovers after a local server restart", async () => {
  const dataDir = path.join(rootDir, "tmp", `recovery-scene-${process.pid}`);

  try {
    const firstStore = new GameStateStore(
      new LocalFileGameStateRepository(dataDir),
    );
    await firstStore.initialize();

    const move = firstStore.moveToken(
      {
        version: 1,
        campaignId: "demo-campaign",
        sceneId: "demo-scene",
        tokenId: "token-hero",
        position: { x: 512, y: 384 },
        requestId: "recovery-move",
      },
      "test-dm",
    );
    assert.equal(move.ack.ok, true);
    await firstStore.flushPersistence();

    const recoveredStore = new GameStateStore(
      new LocalFileGameStateRepository(dataDir),
    );
    await recoveredStore.initialize();
    const recovered = recoveredStore.getSnapshot("dm");
    const hero = recovered.scene.tokens.find(
      (token) => token.id === "token-hero",
    );
    assert.ok(hero);
    assert.deepEqual({ x: hero.x, y: hero.y }, { x: 512, y: 384 });
    assert.equal(
      recoveredStore
        .getSnapshot("display")
        .scene.tokens.some((token) => token.id === "token-secret"),
      false,
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
