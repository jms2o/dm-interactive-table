type SnapshotAction = "created" | "restored";

class RuntimeMetrics {
  private activeSockets = 0;
  private totalSocketConnections = 0;
  private recoveredSocketConnections = 0;
  private httpRequests = 0;
  private httpErrors = 0;
  private httpLatencyTotalMs = 0;
  private persistenceWrites = 0;
  private persistenceFailures = 0;
  private snapshotsCreated = 0;
  private snapshotsRestored = 0;

  recordHttp(statusCode: number, durationMs: number) {
    this.httpRequests += 1;
    this.httpLatencyTotalMs += durationMs;
    if (statusCode >= 400) this.httpErrors += 1;
  }

  connectSocket(recovered: boolean) {
    this.activeSockets += 1;
    this.totalSocketConnections += 1;
    if (recovered) this.recoveredSocketConnections += 1;
  }

  disconnectSocket() {
    this.activeSockets = Math.max(0, this.activeSockets - 1);
  }

  recordPersistence(ok: boolean) {
    this.persistenceWrites += 1;
    if (!ok) this.persistenceFailures += 1;
  }

  recordSnapshot(action: SnapshotAction) {
    if (action === "created") this.snapshotsCreated += 1;
    if (action === "restored") this.snapshotsRestored += 1;
  }

  snapshot() {
    return {
      activeSockets: this.activeSockets,
      totalSocketConnections: this.totalSocketConnections,
      recoveredSocketConnections: this.recoveredSocketConnections,
      httpRequests: this.httpRequests,
      httpErrors: this.httpErrors,
      averageHttpLatencyMs:
        this.httpRequests === 0
          ? 0
          : round(this.httpLatencyTotalMs / this.httpRequests),
      persistenceWrites: this.persistenceWrites,
      persistenceFailures: this.persistenceFailures,
      snapshotsCreated: this.snapshotsCreated,
      snapshotsRestored: this.snapshotsRestored,
    };
  }
}

export const runtimeMetrics = new RuntimeMetrics();

function round(value: number) {
  return Math.round(value * 10) / 10;
}
