import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { gameState } from "./game/game.state";
import { configureSocket } from "./socket";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.corsOrigin,
    methods: ["GET", "POST"],
  },
});

configureSocket(io);

void gameState.initialize().then(() => {
  httpServer.listen(env.port, () => {
    console.log(`DM Interactive Table server listening on port ${env.port}`);
  });
});
