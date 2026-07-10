import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { PrismaClient } from "../generated/prisma/client";
import { env } from "../config/env";

export type IdentityPersistenceMode = "local" | "prisma";

export type UserAccount = {
  id: string;
  displayName: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  dmCampaignIds: string[];
};

export type TableAccessRecord = {
  id: string;
  campaignId: string;
  sessionId?: string;
  createdById: string;
  codeHash: string;
  playerEnabled: boolean;
  displayEnabled: boolean;
  expiresAt: string;
  revokedAt?: string;
  sessionsRevokedAt?: string;
  createdAt: string;
};

export type CreateInitialDmInput = {
  displayName: string;
  email: string;
  passwordHash: string;
  campaignId: string;
};

export type CreateTableAccessInput = {
  campaignId: string;
  sessionId?: string;
  createdById: string;
  codeHash: string;
  playerEnabled: boolean;
  displayEnabled: boolean;
  expiresAt: Date;
};

export interface IdentityRepository {
  readonly mode: IdentityPersistenceMode;
  countPasswordUsers(): Promise<number>;
  createInitialDm(input: CreateInitialDmInput): Promise<UserAccount>;
  findUserByEmail(email: string): Promise<UserAccount | null>;
  replaceTableAccess(input: CreateTableAccessInput): Promise<TableAccessRecord>;
  findTableAccessByHash(codeHash: string): Promise<TableAccessRecord | null>;
  findTableAccessById(id: string): Promise<TableAccessRecord | null>;
  findActiveTableAccess(
    campaignId: string,
    now: Date,
  ): Promise<TableAccessRecord | null>;
  revokeTableAccess(campaignId: string, revokedAt: Date): Promise<void>;
}

type LocalIdentityData = {
  users: UserAccount[];
  tableAccess: TableAccessRecord[];
};

const emptyLocalData = (): LocalIdentityData => ({
  users: [],
  tableAccess: [],
});

export class LocalIdentityRepository implements IdentityRepository {
  readonly mode = "local" as const;
  private data = emptyLocalData();
  private loaded = false;
  private writeQueue = Promise.resolve();
  private readonly filePath: string;

  constructor(dataDir = env.dataDir) {
    const root = isAbsolute(dataDir) ? dataDir : resolve(process.cwd(), dataDir);
    this.filePath = resolve(root, "identity.json");
  }

  async countPasswordUsers() {
    await this.ensureLoaded();
    return this.data.users.filter((user) => user.passwordHash).length;
  }

  async createInitialDm(input: CreateInitialDmInput) {
    await this.ensureLoaded();

    if (this.data.users.some((user) => user.passwordHash)) {
      throw new Error("SETUP_ALREADY_COMPLETED");
    }

    const user: UserAccount = {
      id: crypto.randomUUID(),
      displayName: input.displayName,
      email: input.email,
      passwordHash: input.passwordHash,
      isAdmin: true,
      dmCampaignIds: [input.campaignId],
    };

    this.data.users.push(user);
    await this.persist();
    return cloneUser(user);
  }

  async findUserByEmail(email: string) {
    await this.ensureLoaded();
    const user = this.data.users.find((candidate) => candidate.email === email);
    return user ? cloneUser(user) : null;
  }

  async replaceTableAccess(input: CreateTableAccessInput) {
    await this.ensureLoaded();
    const revokedAt = new Date().toISOString();

    for (const access of this.data.tableAccess) {
      if (access.campaignId === input.campaignId && !access.revokedAt) {
        access.revokedAt = revokedAt;
      }
    }

    const record: TableAccessRecord = {
      id: crypto.randomUUID(),
      campaignId: input.campaignId,
      sessionId: input.sessionId,
      createdById: input.createdById,
      codeHash: input.codeHash,
      playerEnabled: input.playerEnabled,
      displayEnabled: input.displayEnabled,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.data.tableAccess.push(record);
    await this.persist();
    return { ...record };
  }

  async findTableAccessByHash(codeHash: string) {
    await this.ensureLoaded();
    const record = this.data.tableAccess.find(
      (candidate) => candidate.codeHash === codeHash,
    );
    return record ? { ...record } : null;
  }

  async findTableAccessById(id: string) {
    await this.ensureLoaded();
    const record = this.data.tableAccess.find(
      (candidate) => candidate.id === id,
    );
    return record ? { ...record } : null;
  }

  async findActiveTableAccess(campaignId: string, now: Date) {
    await this.ensureLoaded();
    const record = [...this.data.tableAccess]
      .reverse()
      .find(
        (candidate) =>
          candidate.campaignId === campaignId &&
          !candidate.revokedAt &&
          new Date(candidate.expiresAt) > now,
      );
    return record ? { ...record } : null;
  }

  async revokeTableAccess(campaignId: string, revokedAt: Date) {
    await this.ensureLoaded();
    let changed = false;

    for (const access of this.data.tableAccess) {
      if (
        access.campaignId === campaignId &&
        !access.sessionsRevokedAt &&
        new Date(access.expiresAt) > revokedAt
      ) {
        if (!access.revokedAt) {
          access.revokedAt = revokedAt.toISOString();
        }
        access.sessionsRevokedAt = revokedAt.toISOString();
        changed = true;
      }
    }

    if (changed) {
      await this.persist();
    }
  }

  private async ensureLoaded() {
    if (this.loaded) {
      return;
    }

    this.loaded = true;

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalIdentityData>;
      this.data = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        tableAccess: Array.isArray(parsed.tableAccess)
          ? parsed.tableAccess
          : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async persist() {
    const snapshot = JSON.stringify(this.data, null, 2);
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(directory, { recursive: true });
      await writeFile(temporaryPath, snapshot, "utf8");
      await rename(temporaryPath, this.filePath);
    });

    await this.writeQueue;
  }
}

export class PrismaIdentityRepository implements IdentityRepository {
  readonly mode = "prisma" as const;

  constructor(private readonly prisma: PrismaClient) {}

  countPasswordUsers() {
    return this.prisma.user.count({
      where: { passwordHash: { not: null } },
    });
  }

  async createInitialDm(input: CreateInitialDmInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const existingUsers = await tx.user.count({
          where: { passwordHash: { not: null } },
        });

        if (existingUsers > 0) {
          throw new Error("SETUP_ALREADY_COMPLETED");
        }

        await tx.campaign.upsert({
          where: { id: input.campaignId },
          update: {},
          create: {
            id: input.campaignId,
            name: "Demo Campaign",
            description: "Campaña local de desarrollo",
            status: "ACTIVE",
          },
        });

        const user = await tx.user.create({
          data: {
            displayName: input.displayName,
            email: input.email,
            passwordHash: input.passwordHash,
            role: "ADMIN",
            campaignMemberships: {
              create: {
                campaignId: input.campaignId,
                role: "DM",
              },
            },
          },
          include: { campaignMemberships: true },
        });

        return mapPrismaUser(user);
      },
      { isolationLevel: "Serializable" },
    );
  }

  async findUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { campaignMemberships: true },
    });

    if (!user?.passwordHash || !user.email) {
      return null;
    }

    return mapPrismaUser(user);
  }

  async replaceTableAccess(input: CreateTableAccessInput) {
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.tableAccessCode.updateMany({
        where: {
          campaignId: input.campaignId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return tx.tableAccessCode.create({
        data: {
          campaignId: input.campaignId,
          sessionId: input.sessionId,
          createdById: input.createdById,
          codeHash: input.codeHash,
          playerEnabled: input.playerEnabled,
          displayEnabled: input.displayEnabled,
          expiresAt: input.expiresAt,
        },
      });
    });

    return mapPrismaAccess(record);
  }

  async findTableAccessByHash(codeHash: string) {
    const record = await this.prisma.tableAccessCode.findUnique({
      where: { codeHash },
    });
    return record ? mapPrismaAccess(record) : null;
  }

  async findTableAccessById(id: string) {
    const record = await this.prisma.tableAccessCode.findUnique({
      where: { id },
    });
    return record ? mapPrismaAccess(record) : null;
  }

  async findActiveTableAccess(campaignId: string, now: Date) {
    const record = await this.prisma.tableAccessCode.findFirst({
      where: {
        campaignId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
    return record ? mapPrismaAccess(record) : null;
  }

  async revokeTableAccess(campaignId: string, revokedAt: Date) {
    await this.prisma.tableAccessCode.updateMany({
      where: { campaignId, revokedAt: null },
      data: { revokedAt },
    });
    await this.prisma.tableAccessCode.updateMany({
      where: {
        campaignId,
        sessionsRevokedAt: null,
        expiresAt: { gt: revokedAt },
      },
      data: { sessionsRevokedAt: revokedAt },
    });
  }
}

function cloneUser(user: UserAccount): UserAccount {
  return { ...user, dmCampaignIds: [...user.dmCampaignIds] };
}

function mapPrismaUser(user: {
  id: string;
  displayName: string;
  email: string | null;
  passwordHash: string | null;
  role: string;
  campaignMemberships: Array<{ campaignId: string; role: string }>;
}): UserAccount {
  if (!user.email || !user.passwordHash) {
    throw new Error("USER_ACCOUNT_INCOMPLETE");
  }

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    passwordHash: user.passwordHash,
    isAdmin: user.role === "ADMIN",
    dmCampaignIds: user.campaignMemberships
      .filter((membership) => membership.role === "DM")
      .map((membership) => membership.campaignId),
  };
}

function mapPrismaAccess(record: {
  id: string;
  campaignId: string;
  sessionId: string | null;
  createdById: string;
  codeHash: string;
  playerEnabled: boolean;
  displayEnabled: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  sessionsRevokedAt: Date | null;
  createdAt: Date;
}): TableAccessRecord {
  return {
    id: record.id,
    campaignId: record.campaignId,
    sessionId: record.sessionId ?? undefined,
    createdById: record.createdById,
    codeHash: record.codeHash,
    playerEnabled: record.playerEnabled,
    displayEnabled: record.displayEnabled,
    expiresAt: record.expiresAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString(),
    sessionsRevokedAt: record.sessionsRevokedAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}
