import { MemoryGameStateRepository } from "./game.repository";
import { createPrismaClient } from "./prisma.client";
import { PrismaGameStateRepository } from "./prisma-game.repository";

const prisma = createPrismaClient();

export const gameRepository = prisma
  ? new PrismaGameStateRepository(prisma)
  : new MemoryGameStateRepository();

export const persistenceMode = gameRepository.mode;

