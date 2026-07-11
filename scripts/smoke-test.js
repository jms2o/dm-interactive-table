const assert = require("node:assert/strict");
const { rm } = require("node:fs/promises");
const { createServer } = require("node:http");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const testDataDir = path.join(rootDir, "tmp", `smoke-${process.pid}`);
process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGIN = "*";
process.env.DATABASE_URL = "";
process.env.AUTH_SECRET = "smoke-test-auth-secret-with-at-least-32-characters";
process.env.DATA_DIR = testDataDir;
process.env.TS_NODE_PROJECT = path.join(rootDir, "server", "tsconfig.json");

let dmAccessToken = "";

require(path.join(
  rootDir,
  "server",
  "node_modules",
  "ts-node",
  "register",
  "transpile-only",
));

const { Server } = require(path.join(
  rootDir,
  "server",
  "node_modules",
  "socket.io",
));
const { io: createSocketClient } = require(path.join(
  rootDir,
  "client",
  "node_modules",
  "socket.io-client",
));
const { createApp } = require(path.join(rootDir, "server", "src", "app"));
const { gameState } = require(path.join(
  rootDir,
  "server",
  "src",
  "game",
  "game.state",
));
const { configureSocket } = require(path.join(
  rootDir,
  "server",
  "src",
  "socket",
));
const { authService } = require(path.join(
  rootDir,
  "server",
  "src",
  "security",
));
const { campaignService } = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "campaign",
  "campaign.service",
));
const { sessionWorkflowService } = require(path.join(
  rootDir,
  "server",
  "src",
  "modules",
  "session",
  "session-workflow.service",
));

async function main() {
  await campaignService.initialize();
  await gameState.initialize();

  const app = createApp();
  const httpServer = createServer(app);
  const socketServer = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  configureSocket(socketServer);

  await listen(httpServer);
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const apiBase = `http://127.0.0.1:${port}/api`;
  const socketUrl = `http://127.0.0.1:${port}`;

  try {
    await verifyHttpFlow(apiBase, socketUrl);
    console.log("Smoke test passed");
  } finally {
    await gameState.flushPersistence();
    await campaignService.flushPersistence();
    await sessionWorkflowService.flushPersistence();
    await closeSocketServer(socketServer);
    await closeServer(httpServer);
    await rm(testDataDir, { recursive: true, force: true });
  }
}

async function verifyHttpFlow(apiBase, socketUrl) {
  const apiOrigin = apiBase.replace(/\/api$/, "");
  const root = await getJson(`http://127.0.0.1:${new URL(apiBase).port}/`);
  assert.equal(root.version, "2.0.0-alpha.22");

  const status = await getJson(`${apiBase}/auth/status`);
  assert.equal(status.setupRequired, true);

  const unauthorizedRulesets = await fetch(`${apiBase}/rulesets`);
  assert.equal(unauthorizedRulesets.status, 401);

  const registration = await postJson(
    `${apiBase}/auth/register`,
    {
      displayName: "Smoke DM",
      email: "smoke@example.test",
      password: "smoke-password-123",
    },
    "",
  );
  assert.equal(registration.principal.role, "dm");
  assert.equal(registration.principal.campaignId, "demo-campaign");
  dmAccessToken = registration.socketToken;

  const authenticated = await getJson(`${apiBase}/auth/me`, dmAccessToken);
  assert.equal(authenticated.principal.id, registration.principal.id);

  const network = await getJson(`${apiBase}/network`);
  assert.ok(network.origins.some((origin) => origin.source === "current"));

  const readiness = await getJson(`${apiBase}/demo/readiness`);
  assert.equal(readiness.allReady, true);
  assert.equal(readiness.version, "2.0.0-alpha.22");

  const rulesets = await getJson(`${apiBase}/rulesets`);
  assert.equal(rulesets[0].id, "dnd5e");

  const campaignRuleset = await getJson(
    `${apiBase}/campaigns/demo-campaign/ruleset`,
  );
  assert.equal(campaignRuleset.resolvedRulesetId, "dnd5e");

  const aiDraft = await postJson(`${apiBase}/campaigns/demo-campaign/ai/generate`, {
    version: 1,
    purpose: "npc",
    prompt: "guardiana que conoce el paso bajo el mercado",
    requestId: "smoke-ai",
  });
  assert.equal(aiDraft.provider, "local-draft");
  assert.ok(aiDraft.promptRunId);

  const aiApproval = await postJson(
    `${apiBase}/campaigns/demo-campaign/ai/runs/${aiDraft.promptRunId}/approve`,
    {
      version: 1,
      approved: true,
      requestId: "smoke-ai-approve",
    },
  );
  assert.equal(aiApproval.approved, true);

  const npc = await postJson(`${apiBase}/campaigns/demo-campaign/npcs`, {
    name: "Mira Smoke",
    role: "Informante",
  });
  assert.ok(npc.id);

  const npcToken = await postJson(
    `${apiBase}/campaigns/demo-campaign/npcs/${npc.id}/token`,
    {
      sceneId: "demo-scene",
      x: 420,
      y: 320,
      visible: true,
    },
  );
  assert.equal(npcToken.type, "npc");

  const diceRoll = await postJson(`${apiBase}/campaigns/demo-campaign/dice/roll`, {
    version: 1,
    formula: "d20+3",
    visibility: "public",
    requestId: "smoke-dice",
  });
  assert.equal(diceRoll.visibility, "public");
  assert.equal(typeof diceRoll.resultTotal, "number");

  const encounter = await postJson(`${apiBase}/campaigns/demo-campaign/encounters`, {
    version: 1,
    sceneId: "demo-scene",
    name: "Smoke Encounter",
    combatants: [
      {
        entityType: "player",
        name: "Aelar",
        initiative: 15,
        conditions: ["prone"],
      },
    ],
    requestId: "smoke-encounter",
  });
  assert.equal(encounter.rulesetId, "dnd5e");
  assert.equal(encounter.combatants[0].conditions[0], "prone");

  const assetLibrary = await getJson(`${apiBase}/campaigns/demo-campaign/assets`);
  assert.ok(assetLibrary.assets.length >= 3);
  assert.ok(assetLibrary.assets.some((asset) => asset.type === "map"));
  const ambienceAsset = assetLibrary.assets.find(
    (asset) => asset.type === "music",
  );
  assert.ok(ambienceAsset);
  assert.equal(ambienceAsset.url, "/assets/music/ruins-night.wav");

  const audioResponse = await fetch(`${apiOrigin}${ambienceAsset.url}`);
  assert.equal(audioResponse.ok, true);
  assert.ok((await audioResponse.arrayBuffer()).byteLength > 1000);

  const createdAsset = await postJson(
    `${apiBase}/campaigns/demo-campaign/assets`,
    {
      version: 1,
      type: "sound",
      name: "Smoke bell",
      url: "/assets/sounds/smoke-bell.wav",
      metadata: {
        usage: "ambience",
      },
      requestId: "smoke-asset-create",
    },
  );
  assert.equal(createdAsset.type, "sound");

  const tableAccess = await postJson(`${apiBase}/table-access`, {
    campaignId: "demo-campaign",
    sessionId: "demo-session",
    playerEnabled: true,
    displayEnabled: true,
    ttlMinutes: 60,
  });
  assert.equal(tableAccess.code.length, 6);

  const playerSession = await postJson(
    `${apiBase}/table-access/join`,
    {
      code: tableAccess.code,
      role: "player",
      displayName: "Smoke Player",
    },
    "",
  );
  const displaySession = await postJson(
    `${apiBase}/table-access/join`,
    {
      code: tableAccess.code,
      role: "display",
      displayName: "Smoke Display",
    },
    "",
  );

  const characterSheet = await getJson(
    `${apiBase}/campaigns/demo-campaign/workflow/character-sheet`,
    playerSession.socketToken,
  );
  assert.equal(characterSheet.name, "Smoke Player");
  const updatedSheet = await patchJson(
    `${apiBase}/campaigns/demo-campaign/workflow/character-sheet`,
    { currentHp: 7, temporaryHp: 2, resources: { inspiration: 1 } },
    playerSession.socketToken,
  );
  assert.equal(updatedSheet.currentHp, 7);
  assert.equal(updatedSheet.temporaryHp, 2);
  assert.equal(updatedSheet.name, "Smoke Player");
  const playerWorkflow = await getJson(
    `${apiBase}/campaigns/demo-campaign/workflow`,
    playerSession.socketToken,
  );
  assert.equal(playerWorkflow.sessions.length, 1);
  assert.equal(playerWorkflow.sessions[0].id, "demo-session");
  assert.equal(playerWorkflow.sessions[0].summaryPrivate, "");

  const workflowBeforeStart = await getJson(
    `${apiBase}/campaigns/demo-campaign/workflow`,
  );
  assert.equal(workflowBeforeStart.sessions[0].phase, "preparation");

  const startedWorkflow = await postJson(
    `${apiBase}/campaigns/demo-campaign/workflow/sessions/demo-session/start`,
    {},
  );
  assert.equal(startedWorkflow.session.phase, "live");

  await verifySocketFlow(
    socketUrl,
    ambienceAsset.id,
    ambienceAsset.url,
    dmAccessToken,
    playerSession.socketToken,
    displaySession.socketToken,
  );

  const exportedPackage = await getJson(
    `${apiBase}/campaigns/demo-campaign/package/export`,
  );
  assert.equal(exportedPackage.kind, "dm-interactive-table.campaign-package");
  assert.equal(exportedPackage.schemaVersion, 1);
  assert.equal(exportedPackage.appVersion, "2.0.0-alpha.22");
  assert.equal(exportedPackage.manifest.campaignId, "demo-campaign");
  assert.equal(exportedPackage.manifest.assetMode, "metadata-only");
  assert.ok(exportedPackage.manifest.counts.tokens > 0);
  assert.equal(exportedPackage.manifest.counts.audioPresets, 1);
  assert.ok(exportedPackage.manifest.counts.audioCues >= 1);
  assert.equal(
    exportedPackage.manifest.counts.assets,
    exportedPackage.data.assets.length,
  );
  assert.equal(exportedPackage.data.audioScenes.length, 1);
  assert.equal(exportedPackage.data.audioScenes[0].presetCount, 1);
  assert.ok(exportedPackage.data.audioScenes[0].cueCount >= 1);
  assert.ok(
    exportedPackage.data.audioScenes[0].assetIds.includes(ambienceAsset.id),
  );
  assert.equal(
    exportedPackage.data.activeScene.scene.experience.audioPresets.length,
    1,
  );
  assert.ok(
    exportedPackage.data.assets.some((asset) => asset.type === "map"),
  );
  assert.ok(
    exportedPackage.data.assets.some(
      (asset) =>
        asset.source === "asset-storage" &&
        asset.storageAssetId === createdAsset.id,
    ),
  );
  assert.ok(
    exportedPackage.data.assets.some((asset) => asset.type === "token-swatch"),
  );

  const importReport = await postJson(`${apiBase}/campaign-packages/import`, {
    version: 1,
    mode: "validate",
    package: exportedPackage,
    requestId: "smoke-package-import",
  });
  assert.equal(importReport.importable, true);
  assert.equal(importReport.campaignId, "demo-campaign");

  const applyReport = await postJson(`${apiBase}/campaign-packages/import`, {
    version: 1,
    mode: "apply-copy",
    package: exportedPackage,
    requestId: "smoke-package-apply-copy",
  });
  assert.equal(applyReport.importable, true);
  assert.equal(applyReport.applied, true);
  assert.ok(applyReport.appliedResources.campaignId);
  assert.ok(applyReport.appliedResources.assetIds.length > 0);

  const campaigns = await getJson(`${apiBase}/campaigns`);
  assert.ok(
    campaigns.some(
      (campaign) => campaign.id === applyReport.appliedResources.campaignId,
    ),
  );

  const copiedAssets = await getJson(
    `${apiBase}/campaigns/${applyReport.appliedResources.campaignId}/assets`,
  );
  assert.ok(copiedAssets.assets.length >= applyReport.appliedResources.assetIds.length);
}

async function verifySocketFlow(
  socketUrl,
  ambienceAssetId,
  ambienceAssetUrl,
  dmToken,
  playerToken,
  displayToken,
) {
  const anonymous = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: { role: "dm", campaignId: "demo-campaign" },
    transports: ["websocket"],
  });
  const anonymousRejected = waitFor(anonymous, "connect_error");
  anonymous.connect();
  const anonymousError = await anonymousRejected;
  assert.equal(anonymousError.data.code, "AUTH_REQUIRED");
  anonymous.close();

  const spoofed = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: {
      token: playerToken,
      role: "dm",
      campaignId: "demo-campaign",
    },
    transports: ["websocket"],
  });
  const spoofRejected = waitFor(spoofed, "connect_error");
  spoofed.connect();
  const spoofError = await spoofRejected;
  assert.equal(spoofError.data.code, "CAMPAIGN_ACCESS_DENIED");
  spoofed.close();

  const dm = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: {
      token: dmToken,
      role: "dm",
      campaignId: "demo-campaign",
      sessionId: "demo-session",
      sceneId: "demo-scene",
    },
    transports: ["websocket"],
  });
  const player = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: {
      token: playerToken,
      role: "player",
      campaignId: "demo-campaign",
      sessionId: "demo-session",
      sceneId: "demo-scene",
    },
    transports: ["websocket"],
  });
  const display = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: {
      token: displayToken,
      role: "display",
      campaignId: "demo-campaign",
      sessionId: "demo-session",
      sceneId: "demo-scene",
    },
    transports: ["websocket"],
  });

  const dmConnected = waitFor(dm, "connect");
  const playerConnected = waitFor(player, "connect");
  const displayConnected = waitFor(display, "connect");
  const playerState = waitFor(player, "game:state");
  const displayState = waitFor(display, "game:state");
  const fogUpdated = waitFor(player, "fog:updated");
  const lightUpdated = waitFor(player, "light:updated");
  const visionUpdated = waitFor(player, "vision:updated");
  const assetCued = waitFor(player, "asset:cued");

  dm.connect();
  player.connect();
  display.connect();

  const [, , , initialPlayerState, initialDisplayState] = await Promise.all([
    dmConnected,
    playerConnected,
    displayConnected,
    playerState,
    displayState,
  ]);
  assert.equal(
    initialPlayerState.scene.tokens.some((token) => !token.visible),
    false,
  );
  assert.equal(
    initialDisplayState.scene.tokens.some((token) => !token.visible),
    false,
  );

  const forbiddenMove = await emitWithAck(player, "token:move", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    tokenId: "token-hero",
    position: { x: 5, y: 5 },
    requestId: "smoke-forbidden-player-move",
  });
  assert.equal(forbiddenMove.ok, false);

  const crossCampaignFog = await emitWithAck(dm, "fog:update", {
    version: 1,
    campaignId: "another-campaign",
    sceneId: "demo-scene",
    enabled: true,
    requestId: "smoke-cross-campaign",
  });
  assert.equal(crossCampaignFog.ok, false);
  assert.equal(crossCampaignFog.error, "Campaign access denied");

  const fogAck = await emitWithAck(dm, "fog:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    enabled: true,
    opacity: 0.65,
    reveal: {
      x: 700,
      y: 450,
      radius: 180,
      label: "smoke",
    },
    requestId: "smoke-fog",
  });
  assert.equal(fogAck.ok, true);
  const duplicateFogAck = await emitWithAck(dm, "fog:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    enabled: true,
    opacity: 0.65,
    reveal: {
      x: 700,
      y: 450,
      radius: 180,
      label: "smoke",
    },
    requestId: "smoke-fog",
  });
  assert.deepEqual(duplicateFogAck, fogAck);

  const lightAck = await emitWithAck(dm, "light:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "upsert-source",
    source: {
      tokenId: "token-hero",
      name: "Smoke torch",
      x: 280,
      y: 350,
      radius: 220,
      intensity: 0.82,
      color: "#facc15",
      visible: true,
    },
    requestId: "smoke-light",
  });
  assert.equal(lightAck.ok, true);
  assert.equal(lightAck.experience.lighting.enabled, true);
  assert.equal(lightAck.source.tokenId, "token-hero");
  assert.equal(lightAck.source.x, 280);
  assert.equal(lightAck.source.y, 350);

  const visionAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "upsert-occluder",
    occluder: {
      name: "Smoke door",
      kind: "door",
      open: false,
      x1: 420,
      y1: 250,
      x2: 420,
      y2: 600,
      blocksSight: true,
      blocksLight: true,
    },
    requestId: "smoke-vision",
  });
  assert.equal(visionAck.ok, true);
  assert.equal(visionAck.experience.vision.enabled, true);
  assert.equal(visionAck.experience.vision.occluders.length > 0, true);
  const smokeDoor = visionAck.experience.vision.occluders.find(
    (occluder) => occluder.name === "Smoke door",
  );
  assert.equal(smokeDoor.kind, "door");
  assert.equal(smokeDoor.open, false);

  const assetAck = await emitWithAck(dm, "asset:cue", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    cue: {
      assetId: ambienceAssetId,
      type: "music",
      name: "Smoke ambience",
      mood: "mystery",
      volume: 0.5,
      loop: true,
    },
    displayMode: "cinematic",
    playerHandout: "Smoke handout visible.",
    requestId: "smoke-asset",
  });
  assert.equal(assetAck.ok, true);
  assert.equal(
    assetAck.experience.ambience.activeCue.assetUrl,
    ambienceAssetUrl,
  );
  assert.equal(assetAck.experience.ambience.activeCue.channel, "music");
  assert.equal(assetAck.experience.ambience.activeCue.playback, "playing");
  assert.equal(
    assetAck.experience.audioMixer.channels.music.activeCue.assetUrl,
    ambienceAssetUrl,
  );
  assert.equal(assetAck.experience.audioMixer.channels.music.playback, "playing");

  const [fogEvent, lightEvent, visionEvent, assetEvent] = await Promise.all([
    fogUpdated,
    lightUpdated,
    visionUpdated,
    assetCued,
  ]);
  assert.equal(fogEvent.experience.fogOfWar.enabled, true);
  assert.equal(lightEvent.experience.lighting.enabled, true);
  assert.equal(
    lightEvent.experience.lighting.sources.some(
      (source) => source.tokenId === "token-hero",
    ),
    true,
  );
  assert.equal(lightEvent.source.tokenId, "token-hero");
  assert.equal(visionEvent.experience.vision.enabled, true);
  assert.equal(
    visionEvent.experience.vision.occluders.some(
      (occluder) => occluder.blocksSight && occluder.name === "",
    ),
    true,
  );
  const visionRangeUpdated = waitFor(player, "vision:updated");
  const visionRangeAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "configure",
    enabled: true,
    defaultRange: 630,
    requestId: "smoke-vision-range",
  });
  assert.equal(visionRangeAck.ok, true);
  assert.equal(visionRangeAck.experience.vision.defaultRange, 630);
  const visionRangeEvent = await visionRangeUpdated;
  assert.equal(visionRangeEvent.experience.vision.defaultRange, 630);
  const doorUpdated = waitFor(player, "vision:updated");
  const doorAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "set-occluder-open",
    occluderId: smokeDoor.id,
    open: true,
    requestId: "smoke-door-open",
  });
  assert.equal(doorAck.ok, true);
  assert.equal(
    doorAck.experience.vision.occluders.find(
      (occluder) => occluder.id === smokeDoor.id,
    ).open,
    true,
  );
  const doorEvent = await doorUpdated;
  assert.equal(
    doorEvent.experience.vision.occluders.find(
      (occluder) => occluder.id === smokeDoor.id,
    ).open,
    true,
  );
  const movedDoorUpdated = waitFor(player, "vision:updated");
  const movedDoorAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "upsert-occluder",
    occluder: {
      ...doorAck.experience.vision.occluders.find(
        (occluder) => occluder.id === smokeDoor.id,
      ),
      x1: 455,
      y1: 275,
      x2: 455,
      y2: 625,
    },
    requestId: "smoke-door-move",
  });
  assert.equal(movedDoorAck.ok, true);
  const movedDoorEvent = await movedDoorUpdated;
  const publicMovedDoor = movedDoorEvent.experience.vision.occluders.find(
    (occluder) => occluder.id === smokeDoor.id,
  );
  assert.equal(publicMovedDoor.x1, 455);
  assert.equal(publicMovedDoor.y2, 625);
  const duplicatedUpdated = waitFor(player, "vision:updated");
  const duplicatedAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "duplicate-occluder",
    occluderId: smokeDoor.id,
    offsetX: 35,
    offsetY: 35,
    requestId: "smoke-door-duplicate",
  });
  assert.equal(duplicatedAck.ok, true);
  assert.equal(duplicatedAck.affectedOccluders.length, 1);
  const duplicate = duplicatedAck.affectedOccluders[0];
  assert.equal(duplicate.x1, 490);
  const duplicatedEvent = await duplicatedUpdated;
  assert.equal(
    duplicatedEvent.experience.vision.occluders.some(
      (occluder) => occluder.id === duplicate.id,
    ),
    true,
  );
  const splitUpdated = waitFor(player, "vision:updated");
  const splitAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "split-occluder",
    occluderId: duplicate.id,
    requestId: "smoke-door-split",
  });
  assert.equal(splitAck.ok, true);
  assert.equal(splitAck.affectedOccluders.length, 2);
  const splitEvent = await splitUpdated;
  assert.equal(
    splitAck.affectedOccluders.every((part) =>
      splitEvent.experience.vision.occluders.some(
        (occluder) => occluder.id === part.id,
      ),
    ),
    true,
  );
  const removedUpdated = waitFor(player, "vision:updated");
  const removedAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "remove-occluder",
    occluderId: splitAck.affectedOccluders[0].id,
    requestId: "smoke-door-remove-part",
  });
  assert.equal(removedAck.ok, true);
  const removedEvent = await removedUpdated;
  assert.equal(
    removedEvent.experience.vision.occluders.some(
      (occluder) => occluder.id === splitAck.affectedOccluders[0].id,
    ),
    false,
  );
  const batchIds = [smokeDoor.id, splitAck.affectedOccluders[1].id];
  const batchUpdated = waitFor(player, "vision:updated");
  const batchAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "batch-update",
    occluderIds: batchIds,
    offsetX: 10,
    batchPatch: { blocksLight: false },
    requestId: "smoke-vision-batch",
  });
  assert.equal(batchAck.ok, true);
  assert.equal(batchAck.affectedOccluders.length, 2);
  assert.equal(batchAck.history.canUndo, true);
  const batchEvent = await batchUpdated;
  assert.equal(
    batchIds.every((id) => {
      const occluder = batchEvent.experience.vision.occluders.find(
        (candidate) => candidate.id === id,
      );
      return occluder && !occluder.blocksLight;
    }),
    true,
  );
  const undoUpdated = waitFor(player, "vision:updated");
  const undoAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "undo",
    requestId: "smoke-vision-undo",
  });
  assert.equal(undoAck.ok, true);
  assert.equal(undoAck.history.canRedo, true);
  const undoEvent = await undoUpdated;
  assert.equal(
    undoEvent.experience.vision.occluders.find(
      (occluder) => occluder.id === smokeDoor.id,
    ).x1,
    455,
  );
  const redoUpdated = waitFor(player, "vision:updated");
  const redoAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "redo",
    requestId: "smoke-vision-redo",
  });
  assert.equal(redoAck.ok, true);
  const redoEvent = await redoUpdated;
  assert.equal(
    redoEvent.experience.vision.occluders.find(
      (occluder) => occluder.id === smokeDoor.id,
    ).x1,
    465,
  );
  const batchRemovedUpdated = waitFor(player, "vision:updated");
  const batchRemovedAck = await emitWithAck(dm, "vision:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "batch-remove",
    occluderIds: batchIds,
    requestId: "smoke-vision-batch-remove",
  });
  assert.equal(batchRemovedAck.ok, true);
  const batchRemovedEvent = await batchRemovedUpdated;
  assert.equal(
    batchRemovedEvent.experience.vision.occluders.some((occluder) =>
      batchIds.includes(occluder.id),
    ),
    false,
  );
  assert.equal(assetEvent.experience.displayMode, "cinematic");
  assert.equal(
    assetEvent.experience.ambience.activeCue.assetId,
    ambienceAssetId,
  );
  assert.equal(
    assetEvent.experience.ambience.activeCue.assetUrl,
    ambienceAssetUrl,
  );
  assert.equal(
    assetEvent.experience.audioMixer.channels.music.activeCue.assetId,
    ambienceAssetId,
  );
  assert.equal(assetEvent.experience.audioMixer.channels.music.playback, "playing");

  const hiddenLightUpdated = waitFor(player, "light:updated");
  const hiddenLightAck = await emitWithAck(dm, "light:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "upsert-source",
    source: {
      tokenId: "token-secret",
      name: "Hidden lantern",
      x: 980,
      y: 260,
      radius: 160,
      intensity: 0.6,
      color: "#a78bfa",
      visible: true,
    },
    requestId: "smoke-hidden-light",
  });
  assert.equal(hiddenLightAck.ok, true);
  assert.equal(hiddenLightAck.source.tokenId, "token-secret");
  const hiddenLightEvent = await hiddenLightUpdated;
  assert.equal(hiddenLightEvent.source, undefined);
  assert.equal(
    hiddenLightEvent.experience.lighting.sources.some(
      (source) => source.tokenId === "token-secret",
    ),
    false,
  );

  const moveAck = await emitWithAck(dm, "token:move", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    tokenId: "token-hero",
    position: {
      x: 315,
      y: 365,
    },
    requestId: "smoke-token-light-follow",
  });
  assert.equal(moveAck.ok, true);
  const playerSnapshotAfterMove = await emitWithAck(
    player,
    "game:state:request",
    {},
  );
  const movedLight = playerSnapshotAfterMove.scene.experience.lighting.sources.find(
    (source) => source.tokenId === "token-hero",
  );
  assert.ok(movedLight);
  assert.equal(movedLight.x, 315);
  assert.equal(movedLight.y, 365);

  const mixerVolume = waitFor(player, "audio:mixer:updated");
  const volumeAck = await emitWithAck(dm, "audio:mixer:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "set-master-volume",
    volume: 0.42,
    requestId: "smoke-audio-master",
  });
  assert.equal(volumeAck.ok, true);
  assert.equal(volumeAck.experience.audioMixer.masterVolume, 0.42);
  const volumeEvent = await mixerVolume;
  assert.equal(volumeEvent.experience.audioMixer.masterVolume, 0.42);

  const presetSaved = waitFor(player, "audio:preset:saved");
  const savePresetAck = await emitWithAck(dm, "audio:preset:save", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    name: "Smoke tension",
    requestId: "smoke-audio-preset-save",
  });
  assert.equal(savePresetAck.ok, true);
  assert.equal(savePresetAck.preset.name, "Smoke tension");
  assert.equal(savePresetAck.preset.mixer.masterVolume, 0.42);
  assert.equal(
    savePresetAck.preset.mixer.channels.music.activeCue.assetId,
    ambienceAssetId,
  );
  assert.ok(
    savePresetAck.experience.audioPresets.some(
      (preset) => preset.id === savePresetAck.preset.id,
    ),
  );
  const savePresetEvent = await presetSaved;
  assert.equal(savePresetEvent.preset.id, savePresetAck.preset.id);

  const presetRenamed = waitFor(player, "audio:preset:managed");
  const renamePresetAck = await emitWithAck(dm, "audio:preset:manage", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    presetId: savePresetAck.preset.id,
    action: "rename",
    name: "Smoke tension renamed",
    requestId: "smoke-audio-preset-rename",
  });
  assert.equal(renamePresetAck.ok, true);
  assert.equal(renamePresetAck.preset.id, savePresetAck.preset.id);
  assert.equal(renamePresetAck.preset.name, "Smoke tension renamed");
  assert.ok(
    renamePresetAck.experience.audioPresets.some(
      (preset) =>
        preset.id === savePresetAck.preset.id &&
        preset.name === "Smoke tension renamed",
    ),
  );
  const renamePresetEvent = await presetRenamed;
  assert.equal(renamePresetEvent.action, "rename");
  assert.equal(renamePresetEvent.preset.name, "Smoke tension renamed");

  const secondPresetSaved = waitFor(player, "audio:preset:saved");
  const secondPresetAck = await emitWithAck(dm, "audio:preset:save", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    name: "Smoke second",
    requestId: "smoke-audio-preset-save-second",
  });
  assert.equal(secondPresetAck.ok, true);
  assert.equal(secondPresetAck.preset.name, "Smoke second");
  const secondPresetEvent = await secondPresetSaved;
  assert.equal(secondPresetEvent.preset.id, secondPresetAck.preset.id);

  const presetMoved = waitFor(player, "audio:preset:managed");
  const movePresetAck = await emitWithAck(dm, "audio:preset:manage", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    presetId: savePresetAck.preset.id,
    action: "move",
    direction: "down",
    requestId: "smoke-audio-preset-move",
  });
  assert.equal(movePresetAck.ok, true);
  assert.equal(movePresetAck.preset.id, savePresetAck.preset.id);
  assert.equal(
    movePresetAck.experience.audioPresets[0].id,
    secondPresetAck.preset.id,
  );
  assert.equal(
    movePresetAck.experience.audioPresets[1].id,
    savePresetAck.preset.id,
  );
  const movePresetEvent = await presetMoved;
  assert.equal(movePresetEvent.action, "move");

  const presetDeleted = waitFor(player, "audio:preset:managed");
  const deletePresetAck = await emitWithAck(dm, "audio:preset:manage", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    presetId: secondPresetAck.preset.id,
    action: "delete",
    requestId: "smoke-audio-preset-delete",
  });
  assert.equal(deletePresetAck.ok, true);
  assert.equal(deletePresetAck.preset.id, secondPresetAck.preset.id);
  assert.equal(
    deletePresetAck.experience.audioPresets.some(
      (preset) => preset.id === secondPresetAck.preset.id,
    ),
    false,
  );
  assert.equal(deletePresetAck.experience.audioPresets.length, 1);
  const deletePresetEvent = await presetDeleted;
  assert.equal(deletePresetEvent.action, "delete");

  const mixerPaused = waitFor(player, "audio:mixer:updated");
  const pauseAck = await emitWithAck(dm, "audio:mixer:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "pause",
    channel: "music",
    requestId: "smoke-audio-pause",
  });
  assert.equal(pauseAck.ok, true);
  assert.equal(pauseAck.experience.audioMixer.channels.music.playback, "paused");
  assert.equal(
    pauseAck.experience.audioMixer.channels.music.activeCue.playback,
    "paused",
  );
  const pauseEvent = await mixerPaused;
  assert.equal(pauseEvent.experience.audioMixer.channels.music.playback, "paused");

  const mixerStopped = waitFor(player, "audio:mixer:updated");
  const stopAck = await emitWithAck(dm, "audio:mixer:update", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    action: "stop",
    channel: "music",
    requestId: "smoke-audio-stop",
  });
  assert.equal(stopAck.ok, true);
  assert.equal(stopAck.experience.audioMixer.channels.music.playback, "stopped");
  assert.equal(
    stopAck.experience.audioMixer.channels.music.activeCue,
    undefined,
  );
  assert.equal(stopAck.experience.ambience.enabled, false);
  const stopEvent = await mixerStopped;
  assert.equal(stopEvent.experience.audioMixer.channels.music.playback, "stopped");

  const presetApplied = waitFor(player, "audio:preset:applied");
  const applyPresetAck = await emitWithAck(dm, "audio:preset:apply", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    presetId: savePresetAck.preset.id,
    transition: {
      mode: "fade",
      durationMs: 700,
    },
    requestId: "smoke-audio-preset-apply",
  });
  assert.equal(applyPresetAck.ok, true);
  assert.equal(applyPresetAck.preset.id, savePresetAck.preset.id);
  assert.equal(applyPresetAck.preset.name, "Smoke tension renamed");
  assert.equal(applyPresetAck.experience.audioTransition.mode, "fade");
  assert.equal(applyPresetAck.experience.audioTransition.durationMs, 700);
  assert.equal(
    applyPresetAck.experience.audioTransition.previousMixer,
    undefined,
  );
  assert.equal(applyPresetAck.experience.audioMixer.masterVolume, 0.42);
  assert.equal(
    applyPresetAck.experience.audioMixer.channels.music.activeCue.assetId,
    ambienceAssetId,
  );
  assert.equal(
    applyPresetAck.experience.audioMixer.channels.music.activeCue.assetUrl,
    ambienceAssetUrl,
  );
  assert.equal(
    applyPresetAck.experience.audioMixer.channels.music.activeCue.playback,
    "playing",
  );
  assert.notEqual(
    applyPresetAck.experience.audioMixer.channels.music.activeCue.id,
    assetAck.experience.audioMixer.channels.music.activeCue.id,
  );
  assert.equal(applyPresetAck.experience.ambience.enabled, true);
  assert.equal(
    applyPresetAck.experience.ambience.activeCue.assetId,
    ambienceAssetId,
  );
  const applyPresetEvent = await presetApplied;
  assert.equal(applyPresetEvent.preset.id, savePresetAck.preset.id);
  assert.equal(
    applyPresetEvent.experience.audioMixer.channels.music.activeCue.assetId,
    ambienceAssetId,
  );

  const crossfadeApplied = waitFor(player, "audio:preset:applied");
  const crossfadeAck = await emitWithAck(dm, "audio:preset:apply", {
    version: 1,
    campaignId: "demo-campaign",
    sceneId: "demo-scene",
    presetId: savePresetAck.preset.id,
    transition: {
      mode: "crossfade",
      durationMs: 900,
    },
    requestId: "smoke-audio-preset-crossfade",
  });
  assert.equal(crossfadeAck.ok, true);
  assert.equal(crossfadeAck.experience.audioTransition.mode, "crossfade");
  assert.equal(crossfadeAck.experience.audioTransition.durationMs, 900);
  assert.equal(
    crossfadeAck.experience.audioTransition.previousMixer.channels.music
      .activeCue.assetId,
    ambienceAssetId,
  );
  assert.notEqual(
    crossfadeAck.experience.audioMixer.channels.music.activeCue.id,
    crossfadeAck.experience.audioTransition.previousMixer.channels.music
      .activeCue.id,
  );
  const crossfadeEvent = await crossfadeApplied;
  assert.equal(crossfadeEvent.experience.audioTransition.mode, "crossfade");
  assert.equal(
    crossfadeEvent.experience.audioTransition.previousMixer.channels.music
      .activeCue.assetId,
    ambienceAssetId,
  );

  const snapshotAck = await emitWithAck(dm, "history:snapshot:create", {
    version: 1,
    campaignId: "demo-campaign",
    sessionId: "demo-session",
    name: "Smoke safe point",
    requestId: "smoke-history-snapshot",
  });
  assert.equal(snapshotAck.ok, true);
  assert.equal(snapshotAck.history.snapshots.length, 1);

  const globalUndoAck = await emitWithAck(dm, "history:undo", {
    version: 1,
    campaignId: "demo-campaign",
    sessionId: "demo-session",
    requestId: "smoke-history-undo",
  });
  assert.equal(globalUndoAck.ok, true);
  assert.equal(globalUndoAck.history.canRedo, true);

  const globalRedoAck = await emitWithAck(dm, "history:redo", {
    version: 1,
    campaignId: "demo-campaign",
    sessionId: "demo-session",
    requestId: "smoke-history-redo",
  });
  assert.equal(globalRedoAck.ok, true);
  assert.equal(globalRedoAck.history.canUndo, true);

  const restoreAck = await emitWithAck(dm, "history:snapshot:restore", {
    version: 1,
    campaignId: "demo-campaign",
    sessionId: "demo-session",
    snapshotId: snapshotAck.history.snapshots[0].id,
    requestId: "smoke-history-restore",
  });
  assert.equal(restoreAck.ok, true);

  const playerKicked = waitFor(player, "disconnect");
  const displayKicked = waitFor(display, "disconnect");
  await authService.revokeTableAccess(
    authService.verifyToken(dmToken),
    "demo-campaign",
  );
  assert.equal(await playerKicked, "io server disconnect");
  assert.equal(await displayKicked, "io server disconnect");

  const revokedPlayer = createSocketClient(socketUrl, {
    autoConnect: false,
    auth: { token: playerToken },
    transports: ["websocket"],
  });
  const revokedRejected = waitFor(revokedPlayer, "connect_error");
  revokedPlayer.connect();
  const revokedError = await revokedRejected;
  assert.equal(revokedError.data.code, "SESSION_REVOKED");
  revokedPlayer.close();

  dm.close();
  player.close();
  display.close();
}

async function getJson(url, token = dmAccessToken) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  assert.equal(response.ok, true, `${url} returned ${response.status}`);
  return response.json();
}

async function postJson(url, body, token = dmAccessToken) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, true, `${url} returned ${response.status}`);
  return response.json();
}

async function patchJson(url, body, token = dmAccessToken) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, true, `${url} returned ${response.status}`);
  return response.json();
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs,
    );

    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (!error || error.code === "ERR_SERVER_NOT_RUNNING") {
        resolve();
        return;
      }

      reject(error);
    });
  });
}

function closeSocketServer(server) {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
