import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { gameState } from "./game/game.state";
import { prisma } from "./persistence";
import { configureSocket } from "./socket";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
  maxHttpBufferSize: 65_536,
  pingInterval: 20_000,
  pingTimeout: 20_000,
});

configureSocket(io);

void gameState.initialize().then(() => {
  httpServer.listen(env.port, "0.0.0.0", () => {
    console.log(`DM Interactive Table 2.0.0-alpha.21`);
    console.log(`Local:   http://localhost:${env.port}`);

    for (const address of localNetworkAddresses()) {
      console.log(`Network: http://${address}:${env.port}`);
    }
  });
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received, saving the active session...`);
  await gameState.flushPersistence();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await prisma?.$disconnect();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

function localNetworkAddresses() {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter(
      (entry) => entry.family === "IPv4" && !entry.internal,
    )
    .map((entry) => entry.address);
}
