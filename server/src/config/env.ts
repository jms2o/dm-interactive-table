import "dotenv/config";
import type { CorsOptions } from "cors";
import { z } from "zod";

const developmentAuthSecret =
  "development-only-change-this-auth-secret-before-production";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32).default(developmentAuthSecret),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  TABLE_CODE_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(15)
    .max(1440)
    .default(720),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  DATA_DIR: z.string().default("data"),
  JSON_LIMIT: z.string().default("256kb"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  PUBLIC_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

const parsed = envSchema.parse(process.env);

if (
  parsed.NODE_ENV === "production" &&
  parsed.AUTH_SECRET === developmentAuthSecret
) {
  throw new Error("AUTH_SECRET must be set to a unique value in production");
}

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
  authSecret: parsed.AUTH_SECRET,
  sessionTtlHours: parsed.SESSION_TTL_HOURS,
  tableCodeTtlMinutes: parsed.TABLE_CODE_TTL_MINUTES,
  cookieSecure:
    parsed.COOKIE_SECURE === undefined
      ? parsed.NODE_ENV === "production"
      : parsed.COOKIE_SECURE === "true",
  dataDir: parsed.DATA_DIR,
  jsonLimit: parsed.JSON_LIMIT,
  trustProxy: parsed.TRUST_PROXY === "true",
  publicBaseUrl: parsed.PUBLIC_BASE_URL,
};
