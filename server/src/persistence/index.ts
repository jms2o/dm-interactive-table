import { LocalFileGameStateRepository } from "./game.repository";
import { createPrismaClient } from "./prisma.client";
import { PrismaGameStateRepository } from "./prisma-game.repository";

export const prisma = createPrismaClient();

export const gameRepository = prisma
  ? new PrismaGameStateRepository(prisma)
  : new LocalFileGameStateRepository();

export const persistenceMode = gameRepository.mode;
