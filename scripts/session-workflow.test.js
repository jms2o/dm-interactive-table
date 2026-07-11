const assert = require("node:assert/strict");
const { rm } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.AUTH_SECRET = "workflow-test-secret-with-at-least-32-characters";
process.env.DATA_DIR = path.join(rootDir, "tmp", `workflow-bootstrap-${process.pid}`);
process.env.TS_NODE_PROJECT = path.join(rootDir, "server", "tsconfig.json");

require(path.join(
  rootDir,
  "node_modules",
  "ts-node",
  "register",
  "transpile-only",
));

const { CampaignService } = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "campaign",
  "campaign.service",
));
const { LocalCampaignRepository } = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "campaign",
  "campaign.repository",
));
const { LocalCharacterSheetRepository } = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "session",
  "character-sheet.repository",
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

test("campaign sessions persist their lifecycle and only one can be live", async () => {
  const dataDir = path.join(rootDir, "tmp", `workflow-catalog-${process.pid}`);

  try {
    const service = new CampaignService(new LocalCampaignRepository(dataDir));
    await service.initialize();
    const campaign = service.createCampaign({
      name: "The Glass Coast",
      ruleset: "dnd5e",
    });
    const first = service.createSession(campaign.id, { title: "Arrival" });
    const second = service.createSession(campaign.id, { title: "The Beacon" });
    assert.equal(service.startSession(campaign.id, first.id).phase, "live");
    assert.throws(
      () => service.startSession(campaign.id, second.id),
      /already live/,
    );
    await service.flushPersistence();

    const reloaded = new CampaignService(new LocalCampaignRepository(dataDir));
    await reloaded.initialize();
    assert.equal(reloaded.getSession(campaign.id, first.id).phase, "live");
    reloaded.endSession(campaign.id, first.id, {
      summaryPublic: "The party reached the coast.",
    });
    assert.equal(reloaded.startSession(campaign.id, second.id).phase, "live");
    await reloaded.flushPersistence();
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("player sheets are durable and isolated by participant", async () => {
  const dataDir = path.join(rootDir, "tmp", `workflow-sheet-${process.pid}`);

  try {
    const repository = new LocalCharacterSheetRepository(dataDir);
    const first = await repository.getOrCreate("campaign", "player:a", "Aelar");
    await repository.update("campaign", "player:a", {
      currentHp: 4,
      resources: { inspiration: 1 },
    });
    const second = await repository.getOrCreate("campaign", "player:b", "Mira");
    assert.notEqual(first.id, second.id);

    const reloaded = new LocalCharacterSheetRepository(dataDir);
    const persisted = await reloaded.getOrCreate(
      "campaign",
      "player:a",
      "Ignored",
    );
    assert.equal(persisted.name, "Aelar");
    assert.equal(persisted.currentHp, 4);
    assert.equal(persisted.resources.inspiration, 1);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("global undo and named snapshots survive a repository reload", async () => {
  const dataDir = path.join(rootDir, "tmp", `workflow-history-${process.pid}`);

  try {
    const store = new GameStateStore(new LocalFileGameStateRepository(dataDir));
    await store.initialize();
    const initial = store.getSnapshot("dm");
    const token = initial.scene.tokens[0];
    const moved = store.moveToken(
      {
        version: 1,
        campaignId: initial.campaignId,
        sceneId: initial.sceneId,
        tokenId: token.id,
        position: { x: token.x + 70, y: token.y },
        requestId: "workflow-move",
      },
      "test-dm",
    );
    assert.equal(moved.ack.ok, true);
    assert.equal(store.getHistoryState().canUndo, true);
    assert.equal(store.undoHistory().ok, true);
    assert.equal(store.getSnapshot("dm").scene.tokens[0].x, token.x);
    await store.createNamedSnapshot("Before the gate", "test-dm");
    await store.flushPersistence();

    const reloaded = new GameStateStore(
      new LocalFileGameStateRepository(dataDir),
    );
    await reloaded.initialize();
    assert.equal(reloaded.getHistoryState().snapshots.length, 1);
    assert.equal(reloaded.getHistoryState().snapshots[0].name, "Before the gate");
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
