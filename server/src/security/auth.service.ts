import { createHmac, randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type {
  AuthPrincipal,
  AuthSessionResponse,
  AuthStatusResponse,
  TableAccessGrant,
  TableAccessStatus,
} from "../../../shared/types/auth";
import type { ClientRole } from "../../../shared/types/realtime";
import { env } from "../config/env";
import { DEFAULT_CAMPAIGN_ID, DEFAULT_SESSION_ID } from "../game/game.state";
import type { IdentityRepository, UserAccount } from "./identity.repository";

const tableCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const dummyPasswordHash = bcrypt.hashSync("invalid-account-password", 12);

type SessionClaims = JwtPayload & {
  sub: string;
  exp: number;
  kind: "dm" | "table";
  displayName: string;
  role: ClientRole;
  campaignId: string;
  sessionId?: string;
  accessGrantId?: string;
  isAdmin: boolean;
};

export class SecurityError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

export class AuthService {
  private readonly tableRevocationListeners = new Set<
    (campaignId: string) => void
  >();

  constructor(private readonly repository: IdentityRepository) {}

  async getStatus(): Promise<AuthStatusResponse> {
    return {
      setupRequired: (await this.repository.countPasswordUsers()) === 0,
      persistence: this.repository.mode,
    };
  }

  async registerInitialDm(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<AuthSessionResponse> {
    if ((await this.repository.countPasswordUsers()) > 0) {
      throw new SecurityError(
        "SETUP_ALREADY_COMPLETED",
        409,
        "La cuenta inicial ya fue creada",
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    let account: UserAccount;

    try {
      account = await this.repository.createInitialDm({
        displayName: input.displayName.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
        campaignId: DEFAULT_CAMPAIGN_ID,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "SETUP_ALREADY_COMPLETED"
      ) {
        throw new SecurityError(
          "SETUP_ALREADY_COMPLETED",
          409,
          "La cuenta inicial ya fue creada",
        );
      }

      throw error;
    }

    return this.createDmSession(account);
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthSessionResponse> {
    const account = await this.repository.findUserByEmail(
      normalizeEmail(input.email),
    );
    const validPassword = await bcrypt.compare(
      input.password,
      account?.passwordHash ?? dummyPasswordHash,
    );

    if (!account || !validPassword) {
      throw new SecurityError(
        "INVALID_CREDENTIALS",
        401,
        "Correo o contraseña incorrectos",
      );
    }

    if (account.dmCampaignIds.length === 0 && !account.isAdmin) {
      throw new SecurityError(
        "CAMPAIGN_ACCESS_DENIED",
        403,
        "La cuenta no tiene campañas asignadas como DM",
      );
    }

    return this.createDmSession(account);
  }

  verifyToken(token: string): AuthPrincipal {
    let decoded: string | JwtPayload;

    try {
      decoded = jwt.verify(token, env.authSecret, {
        algorithms: ["HS256"],
      });
    } catch {
      throw new SecurityError(
        "SESSION_INVALID",
        401,
        "La sesión no es válida o expiró",
      );
    }

    if (typeof decoded === "string" || !isSessionClaims(decoded)) {
      throw new SecurityError(
        "SESSION_INVALID",
        401,
        "La sesión no es válida",
      );
    }

    return {
      id: decoded.sub,
      displayName: decoded.displayName,
      role: decoded.role,
      campaignId: decoded.campaignId,
      sessionId: decoded.sessionId,
      accessGrantId: decoded.accessGrantId,
      isAdmin: decoded.isAdmin,
      expiresAt: new Date((decoded.exp ?? 0) * 1000).toISOString(),
    };
  }

  async validateToken(token: string): Promise<AuthPrincipal> {
    const principal = this.verifyToken(token);

    if (principal.role === "dm") {
      return principal;
    }

    if (!principal.accessGrantId) {
      throw new SecurityError(
        "SESSION_INVALID",
        401,
        "La sesión de mesa no contiene una concesión válida",
      );
    }

    const grant = await this.repository.findTableAccessById(
      principal.accessGrantId,
    );

    if (
      !grant ||
      grant.sessionsRevokedAt ||
      grant.campaignId !== principal.campaignId ||
      new Date(grant.expiresAt).getTime() <= Date.now()
    ) {
      throw new SecurityError(
        "SESSION_REVOKED",
        401,
        "El acceso a la mesa fue cerrado",
      );
    }

    return principal;
  }

  async sessionFromToken(token: string): Promise<AuthSessionResponse> {
    return {
      principal: await this.validateToken(token),
      socketToken: token,
    };
  }

  onTableAccessRevoked(listener: (campaignId: string) => void) {
    this.tableRevocationListeners.add(listener);
    return () => this.tableRevocationListeners.delete(listener);
  }

  async createTableAccess(
    principal: AuthPrincipal,
    input: {
      campaignId: string;
      sessionId?: string;
      playerEnabled: boolean;
      displayEnabled: boolean;
      ttlMinutes?: number;
    },
  ): Promise<TableAccessGrant> {
    assertDmCampaign(principal, input.campaignId);

    if (!input.playerEnabled && !input.displayEnabled) {
      throw new SecurityError(
        "TABLE_ACCESS_EMPTY",
        400,
        "Activa jugadores, display o ambos",
      );
    }

    const ttlMinutes = clamp(
      input.ttlMinutes ?? env.tableCodeTtlMinutes,
      15,
      1440,
    );
    const code = generateTableCode();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    const record = await this.repository.replaceTableAccess({
      campaignId: input.campaignId,
      sessionId: input.sessionId ?? DEFAULT_SESSION_ID,
      createdById: principal.id,
      codeHash: hashTableCode(code),
      playerEnabled: input.playerEnabled,
      displayEnabled: input.displayEnabled,
      expiresAt,
    });

    return {
      code,
      campaignId: record.campaignId,
      sessionId: record.sessionId,
      playerEnabled: record.playerEnabled,
      displayEnabled: record.displayEnabled,
      expiresAt: record.expiresAt,
    };
  }

  async getTableAccessStatus(
    principal: AuthPrincipal,
    campaignId: string,
  ): Promise<TableAccessStatus> {
    assertDmCampaign(principal, campaignId);
    const record = await this.repository.findActiveTableAccess(
      campaignId,
      new Date(),
    );

    if (!record) {
      return { active: false, campaignId };
    }

    return {
      active: true,
      campaignId,
      sessionId: record.sessionId,
      playerEnabled: record.playerEnabled,
      displayEnabled: record.displayEnabled,
      expiresAt: record.expiresAt,
    };
  }

  async revokeTableAccess(principal: AuthPrincipal, campaignId: string) {
    assertDmCampaign(principal, campaignId);
    await this.repository.revokeTableAccess(campaignId, new Date());

    for (const listener of this.tableRevocationListeners) {
      listener(campaignId);
    }
  }

  async joinTable(input: {
    code: string;
    role: "player" | "display";
    displayName?: string;
  }): Promise<AuthSessionResponse> {
    const code = normalizeTableCode(input.code);
    const record = await this.repository.findTableAccessByHash(
      hashTableCode(code),
    );

    if (
      !record ||
      record.revokedAt ||
      new Date(record.expiresAt).getTime() <= Date.now()
    ) {
      throw new SecurityError(
        "TABLE_CODE_INVALID",
        401,
        "El código de mesa no es válido o expiró",
      );
    }

    if (
      (input.role === "player" && !record.playerEnabled) ||
      (input.role === "display" && !record.displayEnabled)
    ) {
      throw new SecurityError(
        "TABLE_ROLE_DISABLED",
        403,
        "Ese tipo de acceso no está habilitado",
      );
    }

    const displayName =
      input.displayName?.trim() ||
      (input.role === "display" ? "Pantalla pública" : "Jugador");
    const remainingSeconds = Math.max(
      60,
      Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
    );

    return this.signSession(
      {
        id: `guest:${randomUUID()}`,
        displayName,
        role: input.role,
        campaignId: record.campaignId,
        sessionId: record.sessionId,
        accessGrantId: record.id,
        isAdmin: false,
      },
      "table",
      remainingSeconds,
    );
  }

  private createDmSession(account: UserAccount) {
    const campaignId = account.dmCampaignIds[0] ?? DEFAULT_CAMPAIGN_ID;
    return this.signSession(
      {
        id: account.id,
        displayName: account.displayName,
        role: "dm",
        campaignId,
        sessionId: DEFAULT_SESSION_ID,
        isAdmin: account.isAdmin,
      },
      "dm",
      env.sessionTtlHours * 60 * 60,
    );
  }

  private signSession(
    principal: Omit<AuthPrincipal, "expiresAt">,
    kind: "dm" | "table",
    expiresInSeconds: number,
  ): AuthSessionResponse {
    const socketToken = jwt.sign(
      {
        kind,
        displayName: principal.displayName,
        role: principal.role,
        campaignId: principal.campaignId,
        sessionId: principal.sessionId,
        accessGrantId: principal.accessGrantId,
        isAdmin: principal.isAdmin,
      } satisfies Omit<SessionClaims, keyof JwtPayload>,
      env.authSecret,
      {
        algorithm: "HS256",
        subject: principal.id,
        jwtid: randomUUID(),
        expiresIn: expiresInSeconds,
      },
    );

    return {
      principal: this.verifyToken(socketToken),
      socketToken,
    };
  }
}

function isSessionClaims(payload: JwtPayload): payload is SessionClaims {
  return (
    typeof payload.sub === "string" &&
    typeof payload.exp === "number" &&
    ((payload.kind === "dm" && payload.role === "dm") ||
      (payload.kind === "table" &&
        (payload.role === "player" || payload.role === "display") &&
        typeof payload.accessGrantId === "string")) &&
    typeof payload.displayName === "string" &&
    (payload.role === "dm" ||
      payload.role === "player" ||
      payload.role === "display") &&
    typeof payload.campaignId === "string" &&
    typeof payload.isAdmin === "boolean"
  );
}

function assertDmCampaign(principal: AuthPrincipal, campaignId: string) {
  if (
    principal.role !== "dm" ||
    (!principal.isAdmin && principal.campaignId !== campaignId)
  ) {
    throw new SecurityError(
      "CAMPAIGN_ACCESS_DENIED",
      403,
      "No tienes permisos de DM para esta campaña",
    );
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTableCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateTableCode() {
  return Array.from({ length: 6 }, () =>
    tableCodeAlphabet[randomInt(tableCodeAlphabet.length)],
  ).join("");
}

function hashTableCode(code: string) {
  return createHmac("sha256", env.authSecret)
    .update(normalizeTableCode(code))
    .digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
