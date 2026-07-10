const assert = require("node:assert/strict");
const { readFile, rm } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.AUTH_SECRET = "unit-test-auth-secret-with-at-least-32-characters";
process.env.DATA_DIR = path.join(rootDir, "tmp", `security-bootstrap-${process.pid}`);
process.env.TS_NODE_PROJECT = path.join(rootDir, "server", "tsconfig.json");

require(path.join(
  rootDir,
  "server",
  "node_modules",
  "ts-node",
  "register",
  "transpile-only",
));

const {
  AuthService,
  SecurityError,
} = require(path.join(
  rootDir,
  "server",
  "src",
  "security",
  "auth.service",
));
const { LocalIdentityRepository } = require(path.join(
  rootDir,
  "server",
  "src",
  "security",
  "identity.repository",
));

test("initial DM setup uses a bcrypt hash and survives repository reload", async () => {
  const dataDir = path.join(rootDir, "tmp", `security-account-${process.pid}`);

  try {
    const service = new AuthService(new LocalIdentityRepository(dataDir));
    assert.equal((await service.getStatus()).setupRequired, true);

    const registered = await service.registerInitialDm({
      displayName: "Test DM",
      email: "DM@Example.test",
      password: "a-strong-test-password",
    });
    assert.equal(registered.principal.role, "dm");
    assert.equal((await service.getStatus()).setupRequired, false);

    const persisted = await readFile(path.join(dataDir, "identity.json"), "utf8");
    assert.equal(persisted.includes("a-strong-test-password"), false);
    assert.equal(persisted.includes('"passwordHash": "$2'), true);

    const reloaded = new AuthService(new LocalIdentityRepository(dataDir));
    const login = await reloaded.login({
      email: "dm@example.test",
      password: "a-strong-test-password",
    });
    assert.equal(login.principal.id, registered.principal.id);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("table codes assign fixed roles and can be revoked", async () => {
  const dataDir = path.join(rootDir, "tmp", `security-table-${process.pid}`);

  try {
    const service = new AuthService(new LocalIdentityRepository(dataDir));
    const dmSession = await service.registerInitialDm({
      displayName: "Table DM",
      email: "table@example.test",
      password: "another-strong-password",
    });
    const grant = await service.createTableAccess(dmSession.principal, {
      campaignId: "demo-campaign",
      sessionId: "demo-session",
      playerEnabled: true,
      displayEnabled: true,
      ttlMinutes: 30,
    });

    const player = await service.joinTable({
      code: grant.code.toLowerCase(),
      role: "player",
      displayName: "Aelar",
    });
    assert.equal(player.principal.role, "player");
    assert.equal(player.principal.campaignId, "demo-campaign");
    assert.equal(service.verifyToken(player.socketToken).role, "player");

    await service.createTableAccess(dmSession.principal, {
      campaignId: "demo-campaign",
      sessionId: "demo-session",
      playerEnabled: true,
      displayEnabled: true,
      ttlMinutes: 30,
    });
    assert.equal((await service.validateToken(player.socketToken)).role, "player");

    await service.revokeTableAccess(dmSession.principal, "demo-campaign");
    await assert.rejects(
      () => service.validateToken(player.socketToken),
      (error) =>
        error instanceof SecurityError && error.code === "SESSION_REVOKED",
    );
    await assert.rejects(
      () =>
        service.joinTable({
          code: grant.code,
          role: "display",
        }),
      (error) =>
        error instanceof SecurityError && error.code === "TABLE_CODE_INVALID",
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
