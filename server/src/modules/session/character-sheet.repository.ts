import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type {
  PlayerCharacterSheet,
  UpdatePlayerCharacterSheet,
} from "../../../../shared/types/session-workflow";
import { env } from "../../config/env";
import type { PrismaClient } from "../../generated/prisma/client";

export interface CharacterSheetRepository {
  readonly mode: "local" | "prisma";
  getOrCreate(
    campaignId: string,
    playerKey: string,
    displayName: string,
  ): Promise<PlayerCharacterSheet>;
  update(
    campaignId: string,
    playerKey: string,
    patch: UpdatePlayerCharacterSheet,
  ): Promise<PlayerCharacterSheet>;
  flush(): Promise<void>;
}

export class LocalCharacterSheetRepository
  implements CharacterSheetRepository
{
  readonly mode = "local" as const;
  private sheets: PlayerCharacterSheet[] = [];
  private loaded = false;
  private writeQueue = Promise.resolve();
  private readonly filePath: string;

  constructor(dataDir = env.dataDir) {
    const root = isAbsolute(dataDir) ? dataDir : resolve(process.cwd(), dataDir);
    this.filePath = resolve(root, "player-characters.json");
  }

  async getOrCreate(
    campaignId: string,
    playerKey: string,
    displayName: string,
  ) {
    await this.ensureLoaded();
    const existing = this.sheets.find(
      (sheet) =>
        sheet.campaignId === campaignId && sheet.playerKey === playerKey,
    );

    if (existing) return cloneSheet(existing);

    const sheet = createSheet(campaignId, playerKey, displayName);
    this.sheets.push(sheet);
    await this.persist();
    return cloneSheet(sheet);
  }

  async update(
    campaignId: string,
    playerKey: string,
    patch: UpdatePlayerCharacterSheet,
  ) {
    await this.ensureLoaded();
    const sheet = this.sheets.find(
      (candidate) =>
        candidate.campaignId === campaignId &&
        candidate.playerKey === playerKey,
    );

    if (!sheet) throw new Error("Character sheet not found");

    Object.assign(sheet, patch, { updatedAt: new Date().toISOString() });
    await this.persist();
    return cloneSheet(sheet);
  }

  async flush() {
    await this.writeQueue;
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const parsed = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as PlayerCharacterSheet[];
      if (!Array.isArray(parsed)) throw new Error("Invalid character sheets");
      this.sheets = parsed.map(cloneSheet);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private async persist() {
    const payload = JSON.stringify(this.sheets.map(cloneSheet), null, 2);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporaryPath, payload, "utf8");
      await rename(temporaryPath, this.filePath);
    });
    await this.writeQueue;
  }
}

export class PrismaCharacterSheetRepository
  implements CharacterSheetRepository
{
  readonly mode = "prisma" as const;

  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreate(
    campaignId: string,
    playerKey: string,
    displayName: string,
  ) {
    const existing = await this.prisma.playerCharacter.findUnique({
      where: { campaignId_playerKey: { campaignId, playerKey } },
    });

    if (existing) return mapPrismaSheet(existing);

    const created = await this.prisma.playerCharacter.create({
      data: {
        campaignId,
        playerKey,
        name: displayName,
        maxHp: 10,
        currentHp: 10,
        armorClass: 10,
        resources: {},
      },
    });
    return mapPrismaSheet(created);
  }

  async update(
    campaignId: string,
    playerKey: string,
    patch: UpdatePlayerCharacterSheet,
  ) {
    const updated = await this.prisma.playerCharacter.update({
      where: { campaignId_playerKey: { campaignId, playerKey } },
      data: patch,
    });
    return mapPrismaSheet(updated);
  }

  async flush() {}
}

function createSheet(
  campaignId: string,
  playerKey: string,
  displayName: string,
): PlayerCharacterSheet {
  return {
    id: crypto.randomUUID(),
    campaignId,
    playerKey,
    name: displayName,
    ancestry: "",
    className: "",
    level: 1,
    maxHp: 10,
    currentHp: 10,
    temporaryHp: 0,
    armorClass: 10,
    notes: "",
    resources: {},
    updatedAt: new Date().toISOString(),
  };
}

function cloneSheet(sheet: PlayerCharacterSheet): PlayerCharacterSheet {
  return { ...sheet, resources: { ...sheet.resources } };
}

function mapPrismaSheet(sheet: {
  id: string;
  campaignId: string;
  playerKey: string | null;
  name: string;
  ancestry: string;
  className: string;
  level: number;
  maxHp: number;
  currentHp: number;
  temporaryHp: number;
  armorClass: number;
  notes: string;
  resources: unknown;
  updatedAt: Date;
}): PlayerCharacterSheet {
  return {
    id: sheet.id,
    campaignId: sheet.campaignId,
    playerKey: sheet.playerKey ?? "",
    name: sheet.name,
    ancestry: sheet.ancestry,
    className: sheet.className,
    level: sheet.level,
    maxHp: sheet.maxHp,
    currentHp: sheet.currentHp,
    temporaryHp: sheet.temporaryHp,
    armorClass: sheet.armorClass,
    notes: sheet.notes,
    resources: isResourceRecord(sheet.resources) ? sheet.resources : {},
    updatedAt: sheet.updatedAt.toISOString(),
  };
}

function isResourceRecord(value: unknown): value is Record<string, number> {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.values(value).every((entry) => typeof entry === "number"),
  );
}
