import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";
import { PrismaClient } from "../generated/prisma/client";

export function createPrismaClient() {
  if (!env.databaseUrl) {
    return null;
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.databaseUrl,
    }),
  });
}

