import { networkInterfaces } from "node:os";
import { Router } from "express";
import type {
  NetworkInfoResponse,
  NetworkOrigin,
} from "../../../shared/types/auth";
import type { NetworkDiagnosticResponse } from "../../../shared/types/device-experience";
import { APP_VERSION } from "../../../shared/version";
import { env } from "../config/env";
import { runtimeMetrics } from "../observability/metrics";
import { persistenceMode } from "../persistence";

export const networkRouter = Router();

networkRouter.get("/network", (request, response) => {
  const protocol = request.protocol;
  const requestHost = request.get("host") ?? `localhost:${env.port}`;
  const requestOrigin = `${protocol}://${requestHost}`;
  const requestUrl = new URL(requestOrigin);
  const port = requestUrl.port || (protocol === "https" ? "443" : "80");
  const origins: NetworkOrigin[] = [];

  if (env.publicBaseUrl) {
    origins.push({
      label: "Dirección configurada",
      url: stripTrailingSlash(env.publicBaseUrl),
      source: "configured",
    });
  }

  origins.push({
    label: "Este navegador",
    url: requestOrigin,
    source: "current",
  });

  for (const address of localIpv4Addresses()) {
    const defaultPort =
      (protocol === "http" && port === "80") ||
      (protocol === "https" && port === "443");
    origins.push({
      label: `Red local · ${address}`,
      url: `${protocol}://${address}${defaultPort ? "" : `:${port}`}`,
      source: "network",
    });
  }

  const uniqueOrigins = origins.filter(
    (origin, index) =>
      origins.findIndex((candidate) => candidate.url === origin.url) === index,
  );
  const payload: NetworkInfoResponse = {
    origins: uniqueOrigins,
    requestId: request.requestId,
    serverTime: new Date().toISOString(),
  };
  response.status(200).json(payload);
});

networkRouter.get("/network/diagnostics", (request, response) => {
  const payload: NetworkDiagnosticResponse = {
    version: 1,
    requestId: request.requestId,
    appVersion: APP_VERSION,
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    persistence: persistenceMode,
    metrics: runtimeMetrics.snapshot(),
  };
  response.status(200).json(payload);
});

function localIpv4Addresses() {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter(
      (entry) =>
        entry.family === "IPv4" &&
        !entry.internal &&
        isPrivateAddress(entry.address),
    )
    .map((entry) => entry.address);
}

function isPrivateAddress(address: string) {
  if (address.startsWith("10.") || address.startsWith("192.168.")) {
    return true;
  }

  const match = address.match(/^172\.(\d+)\./);
  const secondOctet = match ? Number(match[1]) : 0;
  return secondOctet >= 16 && secondOctet <= 31;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}
