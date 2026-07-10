import "dotenv/config";
import type { CorsOptions } from "cors";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

const corsOrigin: CorsOptions["origin"] =
  parsed.CLIENT_ORIGIN === "*"
    ? true
    : parsed.CLIENT_ORIGIN.split(",").map((origin) => origin.trim());

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  clientOrigin: parsed.CLIENT_ORIGIN,
  corsOrigin,
  databaseUrl: parsed.DATABASE_URL,
};
