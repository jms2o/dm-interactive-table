export type TableDeviceProfile = "tv" | "tablet" | "phone";
export type PhysicalUnit = "cm" | "in";

export interface TableDevicePreferences {
  version: 1;
  profile: TableDeviceProfile;
  physicalUnit: PhysicalUnit;
  cellSize: number;
  pixelsPerInch: number;
  calibrationEnabled: boolean;
  safeAreaPx: number;
  wakeLockEnabled: boolean;
  kioskEnabled: boolean;
  hideCursor: boolean;
}

export interface NetworkDiagnosticResponse {
  version: 1;
  requestId: string;
  appVersion: string;
  serverTime: string;
  uptimeSeconds: number;
  persistence: "memory" | "local" | "prisma";
  metrics: {
    activeSockets: number;
    totalSocketConnections: number;
    recoveredSocketConnections: number;
    httpRequests: number;
    httpErrors: number;
    averageHttpLatencyMs: number;
    persistenceWrites: number;
    persistenceFailures: number;
    snapshotsCreated: number;
    snapshotsRestored: number;
  };
}

export interface SocketDiagnosticCommand {
  version: 1;
  requestId: string;
  clientTime: number;
}

export interface SocketDiagnosticAck {
  ok: boolean;
  requestId: string;
  serverTime: number;
  recovered: boolean;
  error?: string;
}
