import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { AuthPrincipal } from "../../shared/types/auth";
import type { SocketDiagnosticAck } from "../../shared/types/device-experience";
import type {
  HistoryActionAck,
  HistoryCommand,
} from "../../shared/types/session-workflow";
import type {
  AudioMixerAck,
  AudioPresetAck,
  AssetCueAck,
  FogUpdateAck,
  LightUpdateAck,
  VisionUpdateAck,
} from "../../shared/types/table-experience";
import type {
  ClientJoinCommand,
  ClientRole,
  GameStatePayload,
  NarrativeUpdateAck,
  TokenMoveAck,
} from "../../shared/types/realtime";
import type { DiceRollAck } from "../../shared/types/dice";
import type { EncounterAck } from "../../shared/types/combat";
import {
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_SCENE_ID,
  DEFAULT_SESSION_ID,
  gameState,
} from "./game/game.state";
import { combatService } from "./modules/combat/combat.service";
import { diceService } from "./modules/dice/dice.service";
import { campaignService } from "./modules/campaign/campaign.service";
import { sessionWorkflowService } from "./modules/session/session-workflow.service";
import { authService } from "./security";
import { runtimeMetrics } from "./observability/metrics";

type Ack<T> = (payload: T) => void;

type ClientContext = {
  campaignId: string;
  sessionId: string;
  sceneId: string;
  role: ClientRole;
};

type CommandResultCacheEntry = {
  expiresAt: number;
  response?: unknown;
  waiters: Array<(response: unknown) => void>;
};

const clientRoleSchema = z.enum(["dm", "display", "player"]);

const clientJoinSchema = z.object({
  version: z.literal(1).default(1),
  campaignId: z.string().min(1).default(DEFAULT_CAMPAIGN_ID),
  sessionId: z.string().min(1).default(DEFAULT_SESSION_ID),
  sceneId: z.string().min(1).default(DEFAULT_SCENE_ID),
  role: clientRoleSchema.default("display"),
});

const diagnosticPingSchema = z.object({
  version: z.literal(1),
  requestId: z.string().min(1).max(120),
  clientTime: z.number().finite(),
});

const tokenMoveSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  tokenId: z.string().min(1),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  requestId: z.string().min(1),
});

const narrativeUpdateSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  text: z.string().max(5000),
  visibility: z.enum(["public", "dm"]),
  requestId: z.string().min(1),
});

const diceRollSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  formula: z.string().min(1),
  visibility: z.enum(["public", "private", "dm"]),
  purpose: z.string().optional(),
  requestId: z.string().min(1),
});

const encounterCombatantSchema = z.object({
  tokenId: z.string().min(1).optional(),
  entityType: z.enum(["player", "enemy", "npc", "object"]),
  entityId: z.string().min(1).optional(),
  name: z.string().min(1),
  initiative: z.number().finite().optional(),
  currentHp: z.number().int().optional(),
  temporaryHp: z.number().int().optional(),
  conditions: z.array(z.string()).optional(),
});

const createEncounterSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  name: z.string().min(1),
  combatants: z.array(encounterCombatantSchema).min(1),
  requestId: z.string().min(1),
});

const advanceTurnSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  encounterId: z.string().min(1),
  requestId: z.string().min(1),
});

const fogUpdateSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  enabled: z.boolean().optional(),
  opacity: z.number().finite().min(0.1).max(0.95).optional(),
  reveal: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      radius: z.number().finite().positive(),
      label: z.string().optional(),
    })
    .optional(),
  clearRevealed: z.boolean().optional(),
  requestId: z.string().min(1),
});

const lightUpdateSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  action: z.enum([
    "configure",
    "upsert-source",
    "remove-source",
    "clear-sources",
  ]),
  enabled: z.boolean().optional(),
  globalDim: z.number().finite().min(0).max(0.95).optional(),
  source: z
    .object({
      id: z.string().min(1).optional(),
      tokenId: z.string().min(1).optional(),
      name: z.string().min(1).max(80),
      x: z.number().finite(),
      y: z.number().finite(),
      radius: z.number().finite().positive(),
      intensity: z.number().finite().min(0).max(1),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
      visible: z.boolean().optional(),
    })
    .optional(),
  sourceId: z.string().min(1).optional(),
  requestId: z.string().min(1),
});

const visionUpdateSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  action: z.enum([
    "configure",
    "upsert-occluder",
    "set-occluder-open",
    "duplicate-occluder",
    "split-occluder",
    "batch-update",
    "batch-remove",
    "undo",
    "redo",
    "remove-occluder",
    "clear-occluders",
  ]),
  enabled: z.boolean().optional(),
  defaultRange: z.number().finite().positive().optional(),
  occluder: z
    .object({
      id: z.string().min(1).optional(),
      name: z.string().min(1).max(80),
      kind: z.enum(["wall", "door"]).optional(),
      open: z.boolean().optional(),
      x1: z.number().finite(),
      y1: z.number().finite(),
      x2: z.number().finite(),
      y2: z.number().finite(),
      blocksSight: z.boolean().optional(),
      blocksLight: z.boolean().optional(),
    })
    .optional(),
  occluderId: z.string().min(1).optional(),
  open: z.boolean().optional(),
  offsetX: z.number().finite().optional(),
  offsetY: z.number().finite().optional(),
  splitPoint: z
    .object({ x: z.number().finite(), y: z.number().finite() })
    .optional(),
  occluderIds: z.array(z.string().min(1)).min(1).max(200).optional(),
  batchPatch: z
    .object({
      kind: z.enum(["wall", "door"]).optional(),
      open: z.boolean().optional(),
      blocksSight: z.boolean().optional(),
      blocksLight: z.boolean().optional(),
    })
    .optional(),
  requestId: z.string().min(1),
});

const assetCueSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  cue: z.object({
    assetId: z.string().min(1).optional(),
    type: z.enum(["music", "sound", "effect"]),
    name: z.string().min(1),
    mood: z
      .enum(["quiet", "mystery", "danger", "combat", "wonder"])
      .optional(),
    volume: z.number().finite().min(0).max(1).optional(),
    loop: z.boolean().optional(),
  }),
  displayMode: z.enum(["standard", "cinematic"]).optional(),
  playerHandout: z.string().max(1000).optional(),
  requestId: z.string().min(1),
});

const audioMixerUpdateSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  action: z.enum([
    "pause",
    "resume",
    "stop",
    "set-volume",
    "mute",
    "unmute",
    "set-master-volume",
  ]),
  channel: z.enum(["music", "sound", "effect"]).optional(),
  volume: z.number().finite().min(0).max(1).optional(),
  requestId: z.string().min(1),
});

const audioPresetSaveSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  requestId: z.string().min(1),
});

const audioPresetApplySchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  presetId: z.string().min(1),
  transition: z
    .object({
      mode: z.enum(["cut", "fade", "crossfade"]),
      durationMs: z.number().int().min(0).max(10000).optional(),
    })
    .optional(),
  requestId: z.string().min(1),
});

const audioPresetManageSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  presetId: z.string().min(1),
  action: z.enum(["rename", "delete", "move"]),
  name: z.string().min(1).max(80).optional(),
  direction: z.enum(["up", "down"]).optional(),
  requestId: z.string().min(1),
});

const historyCommandSchema = z.object({
  version: z.literal(1),
  campaignId: z.string().min(1),
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
});

const historySnapshotCreateSchema = historyCommandSchema.extend({
  name: z.string().trim().min(1).max(80),
});

const historySnapshotTargetSchema = historyCommandSchema.extend({
  snapshotId: z.string().min(1),
});

export function configureSocket(io: Server) {
  const commandResults = new Map<string, CommandResultCacheEntry>();
  const stopListeningForRevocation = authService.onTableAccessRevoked(
    (campaignId) => {
      for (const connectedSocket of io.sockets.sockets.values()) {
        const principal = connectedSocket.data.principal as
          | AuthPrincipal
          | undefined;

        if (
          principal &&
          principal.role !== "dm" &&
          principal.campaignId === campaignId
        ) {
          connectedSocket.emit("security:error", {
            code: "SESSION_REVOKED",
            message: "Table access was closed by the DM",
          });
          connectedSocket.disconnect(true);
        }
      }
    },
  );
  const stopListeningForSessionChanges =
    sessionWorkflowService.onSessionChanged((session) => {
      io.to(roomNames.session(session.id)).emit("session:updated", session);
    });
  io.engine.once("close", () => {
    stopListeningForRevocation();
    stopListeningForSessionChanges();
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !token) {
      next(socketSecurityError("AUTH_REQUIRED", "Authentication required"));
      return;
    }

    void authService
      .validateToken(token)
      .then((principal) => {
        const requestedCampaignId = socket.handshake.auth?.campaignId;
        const requestedRole = socket.handshake.auth?.role;

        if (
          (requestedCampaignId &&
            requestedCampaignId !== principal.campaignId) ||
          (requestedRole && requestedRole !== principal.role)
        ) {
          next(
            socketSecurityError(
              "CAMPAIGN_ACCESS_DENIED",
              "Socket context is not authorized",
            ),
          );
          return;
        }

        socket.data.principal = principal;
        next();
      })
      .catch((error) => {
        const code =
          error &&
          typeof error === "object" &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "SESSION_INVALID";
        next(
          socketSecurityError(
            code,
            error instanceof Error ? error.message : "Invalid session",
          ),
        );
      });
  });

  io.on("connection", (socket) => {
    runtimeMetrics.connectSocket(socket.recovered);
    installSocketGuards(socket, commandResults);
    const context = contextFromSocket(socket);
    joinContextRooms(socket, context);
    sessionWorkflowService.presence.connect(
      context.sessionId,
      principalFromSocket(socket),
    );
    socket.emit("game:state", snapshotForContext(context));
    emitActiveEncounter(socket, context);

    socket.on("client:join", (rawPayload, ack?: Ack<GameStatePayload>) => {
      const parsed = clientJoinSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return;
      }

      const requestedContext = parsed.data satisfies ClientJoinCommand;
      const principal = principalFromSocket(socket);

      if (
        requestedContext.campaignId !== principal.campaignId ||
        requestedContext.role !== principal.role ||
        (principal.sessionId &&
          requestedContext.sessionId !== principal.sessionId)
      ) {
        socket.emit("security:error", {
          code: "CAMPAIGN_ACCESS_DENIED",
          message: "Socket context is not authorized",
        });
        return;
      }

      const activeSnapshot = gameState.getSnapshot(principal.role);
      const nextContext: ClientContext = {
        ...requestedContext,
        campaignId: principal.campaignId,
        sessionId: principal.sessionId ?? requestedContext.sessionId,
        sceneId: activeSnapshot.sceneId ?? requestedContext.sceneId,
        role: principal.role,
      };
      sessionWorkflowService.presence.disconnect(
        activeContextFromSocket(socket).sessionId,
        principal.id,
      );
      leaveContextRooms(socket);
      joinContextRooms(socket, nextContext);
      sessionWorkflowService.presence.connect(nextContext.sessionId, principal);
      const snapshot = snapshotForContext(nextContext);
      socket.emit("game:state", snapshot);
      emitActiveEncounter(socket, nextContext);
      ack?.(snapshot);
    });

    socket.on("game:state:request", (_payload, ack?: Ack<GameStatePayload>) => {
      const activeContext = activeContextFromSocket(socket);
      const snapshot = snapshotForContext(activeContext);
      socket.emit("game:state", snapshot);
      ack?.(snapshot);
    });

    socket.on(
      "diagnostics:ping",
      (rawPayload, ack?: Ack<SocketDiagnosticAck>) => {
        const parsed = diagnosticPingSchema.safeParse(rawPayload);
        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            serverTime: Date.now(),
            recovered: socket.recovered,
            error: "Invalid diagnostics payload",
          });
          return;
        }

        ack?.({
          ok: true,
          requestId: parsed.data.requestId,
          serverTime: Date.now(),
          recovered: socket.recovered,
        });
      },
    );

    socket.on("disconnect", () => {
      runtimeMetrics.disconnectSocket();
      const activeContext = activeContextFromSocket(socket);
      sessionWorkflowService.presence.disconnect(
        activeContext.sessionId,
        principalFromSocket(socket).id,
      );
    });

    socket.on(
      "history:undo",
      (rawPayload, ack?: Ack<HistoryActionAck>) => {
        handleHistoryCommand(
          io,
          socket,
          rawPayload,
          ack,
          historyCommandSchema,
          () => gameState.undoHistory(),
        );
      },
    );

    socket.on(
      "history:redo",
      (rawPayload, ack?: Ack<HistoryActionAck>) => {
        handleHistoryCommand(
          io,
          socket,
          rawPayload,
          ack,
          historyCommandSchema,
          () => gameState.redoHistory(),
        );
      },
    );

    socket.on(
      "history:snapshot:create",
      async (rawPayload, ack?: Ack<HistoryActionAck>) => {
        await handleAsyncHistoryCommand(
          io,
          socket,
          rawPayload,
          ack,
          historySnapshotCreateSchema,
          async (command) => ({
            ok: true as const,
            history: await gameState.createNamedSnapshot(
              command.name,
              actorIdFromSocket(socket),
            ),
          }),
        );
      },
    );

    socket.on(
      "history:snapshot:restore",
      async (rawPayload, ack?: Ack<HistoryActionAck>) => {
        await handleAsyncHistoryCommand(
          io,
          socket,
          rawPayload,
          ack,
          historySnapshotTargetSchema,
          async (command) => ({
            ok: true as const,
            history: await gameState.restoreNamedSnapshot(command.snapshotId),
          }),
        );
      },
    );

    socket.on(
      "history:snapshot:delete",
      async (rawPayload, ack?: Ack<HistoryActionAck>) => {
        await handleAsyncHistoryCommand(
          io,
          socket,
          rawPayload,
          ack,
          historySnapshotTargetSchema,
          async (command) => ({
            ok: true as const,
            history: await gameState.deleteNamedSnapshot(command.snapshotId),
          }),
          false,
        );
      },
    );

    socket.on("token:move", (rawPayload, ack?: Ack<TokenMoveAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can move tokens",
        )
      ) {
        return;
      }

      const parsed = tokenMoveSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid token:move payload",
        });
        return;
      }

      const result = gameState.moveToken(parsed.data, actorIdFromSocket(socket));
      ack?.(result.ack);

      if (!result.event) {
        return;
      }

      io.to(roomNames.dm(parsed.data.campaignId)).emit(
        "token:moved",
        result.event,
      );

      if (result.isPublicToken) {
        io.to(roomNames.display(parsed.data.sceneId)).emit(
          "token:moved",
          result.event,
        );
        io.to(roomNames.players(parsed.data.sceneId)).emit(
          "token:moved",
          result.event,
        );
      }

      emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
    });

    socket.on(
      "narrative:update",
      (rawPayload, ack?: Ack<NarrativeUpdateAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can update narrative",
          )
        ) {
          return;
        }

        const parsed = narrativeUpdateSchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid narrative:update payload",
          });
          return;
        }

        const result = gameState.updateNarrative(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.(result.ack);

        if (!result.event) {
          return;
        }

        io.to(roomNames.dm(parsed.data.campaignId)).emit(
          "narrative:updated",
          result.event,
        );

        if (result.event.visibility === "public") {
          io.to(roomNames.display(parsed.data.sceneId)).emit(
            "narrative:updated",
            result.event,
          );
          io.to(roomNames.players(parsed.data.sceneId)).emit(
            "narrative:updated",
            result.event,
          );
        }

        emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
      },
    );

    socket.on("dice:roll", async (rawPayload, ack?: Ack<DiceRollAck>) => {
      if (
        !requireAnyRole(
          socket,
          ["dm", "player"],
          ack,
          rawPayload,
          "Only a DM or player can roll dice",
        )
      ) {
        return;
      }

      const parsed = diceRollSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid dice:roll payload",
        });
        return;
      }

      if (
        activeContextFromSocket(socket).role === "player" &&
        parsed.data.visibility === "dm"
      ) {
        ack?.({
          ok: false,
          requestId: parsed.data.requestId,
          error: "Players cannot create DM-only rolls",
        });
        return;
      }

      const diceContext = activeContextFromSocket(socket);
      if (
        diceContext.role === "player" &&
        !campaignService.isSessionLive(
          diceContext.campaignId,
          diceContext.sessionId,
        )
      ) {
        ack?.({
          ok: false,
          requestId: parsed.data.requestId,
          error: "The session is not live",
        });
        return;
      }

      try {
        const roll = await diceService.roll(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.({
          ok: true,
          requestId: parsed.data.requestId,
          roll,
        });

        io.to(roomNames.dm(parsed.data.campaignId)).emit("dice:rolled", roll);

        if (roll.visibility === "public") {
          const sceneId = activeContextFromSocket(socket).sceneId;
          io.to(roomNames.display(sceneId)).emit("dice:rolled", roll);
          io.to(roomNames.players(sceneId)).emit("dice:rolled", roll);
        }
      } catch (error) {
        ack?.({
          ok: false,
          requestId: parsed.data.requestId,
          error: error instanceof Error ? error.message : "Dice roll failed",
        });
      }
    });

    socket.on(
      "encounter:start",
      (rawPayload, ack?: Ack<EncounterAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can start encounters",
          )
        ) {
          return;
        }

        const parsed = createEncounterSchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid encounter:start payload",
          });
          return;
        }

        try {
          const encounter = combatService.createEncounter(parsed.data);
          ack?.({
            ok: true,
            requestId: parsed.data.requestId,
            encounter,
          });
          emitEncounterUpdate(io, encounter);
        } catch (error) {
          ack?.({
            ok: false,
            requestId: parsed.data.requestId,
            error:
              error instanceof Error ? error.message : "Encounter start failed",
          });
        }
      },
    );

    socket.on("turn:advance", (rawPayload, ack?: Ack<EncounterAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can advance turns",
        )
      ) {
        return;
      }

      const parsed = advanceTurnSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid turn:advance payload",
        });
        return;
      }

      try {
        const encounter = combatService.advanceTurn(parsed.data);
        ack?.({
          ok: true,
          requestId: parsed.data.requestId,
          encounter,
        });
        emitEncounterUpdate(io, encounter);
      } catch (error) {
        ack?.({
          ok: false,
          requestId: parsed.data.requestId,
          error:
            error instanceof Error ? error.message : "Turn advance failed",
        });
      }
    });

    socket.on("fog:update", (rawPayload, ack?: Ack<FogUpdateAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can update fog",
        )
      ) {
        return;
      }

      const parsed = fogUpdateSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid fog:update payload",
        });
        return;
      }

      const result = gameState.updateFog(parsed.data, actorIdFromSocket(socket));
      ack?.(result.ack);

      if (!result.event) {
        return;
      }

      emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
        eventName: "fog:updated",
        event: result.event,
      });
      emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
    });

    socket.on("light:update", (rawPayload, ack?: Ack<LightUpdateAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can update lighting",
        )
      ) {
        return;
      }

      const parsed = lightUpdateSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid light:update payload",
        });
        return;
      }

      const result = gameState.updateLighting(
        parsed.data,
        actorIdFromSocket(socket),
      );
      ack?.(result.ack);

      if (!result.event) {
        return;
      }

      io.to(roomNames.dm(parsed.data.campaignId)).emit(
        "light:updated",
        result.event,
      );

      const publicExperience = gameState.getSnapshot("display").scene
        ?.experience;
      const publicSource = publicExperience?.lighting.sources.find(
        (source) => source.id === result.event?.source?.id,
      );
      const publicEvent = publicExperience
        ? {
            ...result.event,
            experience: publicExperience,
            source: publicSource,
          }
        : result.event;

      io.to(roomNames.display(parsed.data.sceneId)).emit(
        "light:updated",
        publicEvent,
      );
      io.to(roomNames.players(parsed.data.sceneId)).emit(
        "light:updated",
        publicEvent,
      );
      emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
    });

    socket.on("vision:update", (rawPayload, ack?: Ack<VisionUpdateAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can update vision",
        )
      ) {
        return;
      }

      const parsed = visionUpdateSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid vision:update payload",
        });
        return;
      }

      const result = gameState.updateVision(
        parsed.data,
        actorIdFromSocket(socket),
      );
      ack?.(result.ack);

      if (!result.event) {
        return;
      }

      io.to(roomNames.dm(parsed.data.campaignId)).emit(
        "vision:updated",
        result.event,
      );

      const publicExperience = gameState.getSnapshot("display").scene?.experience;
      const publicEvent = publicExperience
        ? { ...result.event, experience: publicExperience }
        : result.event;

      io.to(roomNames.display(parsed.data.sceneId)).emit(
        "vision:updated",
        publicEvent,
      );
      io.to(roomNames.players(parsed.data.sceneId)).emit(
        "vision:updated",
        publicEvent,
      );
      emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
    });

    socket.on("asset:cue", (rawPayload, ack?: Ack<AssetCueAck>) => {
      if (
        !requireRole(
          socket,
          "dm",
          ack,
          rawPayload,
          "Only the DM can cue assets",
        )
      ) {
        return;
      }

      const parsed = assetCueSchema.safeParse(rawPayload);

      if (!parsed.success) {
        ack?.({
          ok: false,
          requestId: requestIdFromPayload(rawPayload),
          error: "Invalid asset:cue payload",
        });
        return;
      }

      const result = gameState.cueAsset(parsed.data, actorIdFromSocket(socket));
      ack?.(result.ack);

      if (!result.event) {
        return;
      }

      emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
        eventName: "asset:cued",
        event: result.event,
      });
      emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
    });

    socket.on(
      "audio:mixer:update",
      (rawPayload, ack?: Ack<AudioMixerAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can update audio mixer",
          )
        ) {
          return;
        }

        const parsed = audioMixerUpdateSchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid audio:mixer:update payload",
          });
          return;
        }

        const result = gameState.updateAudioMixer(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.(result.ack);

        if (!result.event) {
          return;
        }

        emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
          eventName: "audio:mixer:updated",
          event: result.event,
        });
        emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
      },
    );

    socket.on(
      "audio:preset:save",
      (rawPayload, ack?: Ack<AudioPresetAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can save audio presets",
          )
        ) {
          return;
        }

        const parsed = audioPresetSaveSchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid audio:preset:save payload",
          });
          return;
        }

        const result = gameState.saveAudioPreset(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.(result.ack);

        if (!result.event) {
          return;
        }

        emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
          eventName: "audio:preset:saved",
          event: result.event,
        });
        emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
      },
    );

    socket.on(
      "audio:preset:apply",
      (rawPayload, ack?: Ack<AudioPresetAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can apply audio presets",
          )
        ) {
          return;
        }

        const parsed = audioPresetApplySchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid audio:preset:apply payload",
          });
          return;
        }

        const result = gameState.applyAudioPreset(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.(result.ack);

        if (!result.event) {
          return;
        }

        emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
          eventName: "audio:preset:applied",
          event: result.event,
        });
        emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
      },
    );

    socket.on(
      "audio:preset:manage",
      (rawPayload, ack?: Ack<AudioPresetAck>) => {
        if (
          !requireRole(
            socket,
            "dm",
            ack,
            rawPayload,
            "Only the DM can manage audio presets",
          )
        ) {
          return;
        }

        const parsed = audioPresetManageSchema.safeParse(rawPayload);

        if (!parsed.success) {
          ack?.({
            ok: false,
            requestId: requestIdFromPayload(rawPayload),
            error: "Invalid audio:preset:manage payload",
          });
          return;
        }

        const result = gameState.manageAudioPreset(
          parsed.data,
          actorIdFromSocket(socket),
        );
        ack?.(result.ack);

        if (!result.event) {
          return;
        }

        emitExperienceUpdate(io, parsed.data.campaignId, parsed.data.sceneId, {
          eventName: "audio:preset:managed",
          event: result.event,
        });
        emitRoleSnapshots(io, parsed.data.campaignId, parsed.data.sceneId);
      },
    );
  });
}

function contextFromSocket(socket: Socket): ClientContext {
  const principal = principalFromSocket(socket);
  const activeSnapshot = gameState.getSnapshot(principal.role);
  const sceneId = z
    .string()
    .min(1)
    .safeParse(socket.handshake.auth?.sceneId);

  return {
    campaignId: principal.campaignId,
    sessionId: principal.sessionId ?? DEFAULT_SESSION_ID,
    sceneId:
      activeSnapshot.campaignId === principal.campaignId &&
      activeSnapshot.sessionId === (principal.sessionId ?? DEFAULT_SESSION_ID)
        ? (activeSnapshot.sceneId ?? DEFAULT_SCENE_ID)
        : sceneId.success
          ? sceneId.data
          : DEFAULT_SCENE_ID,
    role: principal.role,
  };
}

function activeContextFromSocket(socket: Socket): ClientContext {
  const stored = socket.data.context as ClientContext | undefined;

  return stored ?? contextFromSocket(socket);
}

function joinContextRooms(socket: Socket, context: ClientContext) {
  socket.data.context = context;
  socket.join(roomNames.campaign(context.campaignId));
  socket.join(roomNames.session(context.sessionId));
  socket.join(roomNames.scene(context.sceneId));

  if (context.role === "dm") {
    socket.join(roomNames.dm(context.campaignId));
  }

  if (context.role === "display") {
    socket.join(roomNames.display(context.sceneId));
  }

  if (context.role === "player") {
    socket.join(roomNames.player(socket.id));
    socket.join(roomNames.players(context.sceneId));
  }
}

function leaveContextRooms(socket: Socket) {
  for (const room of socket.rooms) {
    if (room !== socket.id) {
      socket.leave(room);
    }
  }
}

function emitRoleSnapshots(io: Server, campaignId: string, sceneId: string) {
  const dmSnapshot = gameState.getSnapshot("dm");
  const sessionId = dmSnapshot.sessionId ?? DEFAULT_SESSION_ID;
  io.to(roomNames.dm(campaignId)).emit("game:state", dmSnapshot);
  io.to(roomNames.display(sceneId)).emit(
    "game:state",
    snapshotForContext({
      campaignId,
      sessionId,
      sceneId,
      role: "display",
    }),
  );
  io.to(roomNames.players(sceneId)).emit(
    "game:state",
    snapshotForContext({
      campaignId,
      sessionId,
      sceneId,
      role: "player",
    }),
  );
}

function emitActiveEncounter(socket: Socket, context: ClientContext) {
  if (
    context.role !== "dm" &&
    !campaignService.isSessionLive(context.campaignId, context.sessionId)
  ) {
    return;
  }
  const encounter = combatService.getActiveEncounter(
    context.campaignId,
    context.sceneId,
  );

  if (encounter) {
    socket.emit("encounter:update", encounter);
  }
}

function emitEncounterUpdate(
  io: Server,
  encounter: ReturnType<typeof combatService.createEncounter>,
) {
  io.to(roomNames.dm(encounter.campaignId)).emit("encounter:update", encounter);
  io.to(roomNames.display(encounter.sceneId)).emit(
    "encounter:update",
    encounter,
  );
  io.to(roomNames.players(encounter.sceneId)).emit(
    "encounter:update",
    encounter,
  );
}

function emitExperienceUpdate(
  io: Server,
  campaignId: string,
  sceneId: string,
  payload: {
    eventName:
      | "fog:updated"
      | "asset:cued"
      | "audio:mixer:updated"
      | "audio:preset:saved"
      | "audio:preset:applied"
      | "audio:preset:managed";
    event: unknown;
  },
) {
  io.to(roomNames.dm(campaignId)).emit(payload.eventName, payload.event);
  io.to(roomNames.display(sceneId)).emit(payload.eventName, payload.event);
  io.to(roomNames.players(sceneId)).emit(payload.eventName, payload.event);
}

function snapshotForContext(context: ClientContext): GameStatePayload {
  const snapshot = gameState.getSnapshot(context.role);
  const contextMatches =
    snapshot.campaignId === context.campaignId &&
    snapshot.sessionId === context.sessionId;
  const canSeeScene =
    context.role === "dm" ||
    campaignService.isSessionLive(context.campaignId, context.sessionId);

  if (contextMatches && canSeeScene) return snapshot;

  return {
    version: 1,
    campaignId: context.campaignId,
    sessionId: context.sessionId,
    updatedAt: snapshot.updatedAt,
  };
}

function handleHistoryCommand<T extends HistoryCommand>(
  io: Server,
  socket: Socket,
  rawPayload: unknown,
  ack: Ack<HistoryActionAck> | undefined,
  schema: z.ZodType<T>,
  operation: (command: T) => {
    ok: boolean;
    error?: string;
    history?: HistoryActionAck["history"];
  },
) {
  void handleAsyncHistoryCommand(
    io,
    socket,
    rawPayload,
    ack,
    schema,
    async (command) => operation(command),
  );
}

async function handleAsyncHistoryCommand<T extends HistoryCommand>(
  io: Server,
  socket: Socket,
  rawPayload: unknown,
  ack: Ack<HistoryActionAck> | undefined,
  schema: z.ZodType<T>,
  operation: (command: T) => Promise<{
    ok: boolean;
    error?: string;
    history?: HistoryActionAck["history"];
  }>,
  emitScene = true,
) {
  if (
    !requireRole(
      socket,
      "dm",
      ack,
      rawPayload,
      "Only the DM can manage history",
    )
  ) {
    return;
  }

  const parsed = schema.safeParse(rawPayload);
  if (!parsed.success) {
    ack?.({
      ok: false,
      requestId: requestIdFromPayload(rawPayload),
      error: "Invalid history command",
    });
    return;
  }

  const context = activeContextFromSocket(socket);
  if (
    parsed.data.campaignId !== context.campaignId ||
    parsed.data.sessionId !== context.sessionId
  ) {
    ack?.({
      ok: false,
      requestId: parsed.data.requestId,
      error: "History context is not authorized",
    });
    return;
  }

  try {
    const result = await operation(parsed.data);
    const response = { ...result, requestId: parsed.data.requestId };
    ack?.(response);
    if (!result.ok) return;

    if (result.history) {
      io.to(roomNames.dm(context.campaignId)).emit(
        "history:updated",
        result.history,
      );
    }

    if (emitScene) {
      const sceneId = gameState.getSnapshot("dm").sceneId ?? context.sceneId;
      emitRoleSnapshots(io, context.campaignId, sceneId);
    }
  } catch (error) {
    ack?.({
      ok: false,
      requestId: parsed.data.requestId,
      error: error instanceof Error ? error.message : "History command failed",
    });
  }
}

function requireRole<T extends { ok: boolean; requestId: string; error?: string }>(
  socket: Socket,
  role: ClientRole,
  ack: Ack<T> | undefined,
  rawPayload: unknown,
  error: string,
) {
  const context = activeContextFromSocket(socket);
  const campaignId = campaignIdFromPayload(rawPayload);

  if (context.role === role && (!campaignId || campaignId === context.campaignId)) {
    return true;
  }

  ack?.({
    ok: false,
    requestId: requestIdFromPayload(rawPayload),
    error:
      campaignId && campaignId !== context.campaignId
        ? "Campaign access denied"
        : error,
  } as T);
  return false;
}

function requireAnyRole<
  T extends { ok: boolean; requestId: string; error?: string },
>(
  socket: Socket,
  roles: ClientRole[],
  ack: Ack<T> | undefined,
  rawPayload: unknown,
  error: string,
) {
  const context = activeContextFromSocket(socket);
  const campaignId = campaignIdFromPayload(rawPayload);

  if (
    roles.includes(context.role) &&
    (!campaignId || campaignId === context.campaignId)
  ) {
    return true;
  }

  ack?.({
    ok: false,
    requestId: requestIdFromPayload(rawPayload),
    error:
      campaignId && campaignId !== context.campaignId
        ? "Campaign access denied"
        : error,
  } as T);
  return false;
}

function principalFromSocket(socket: Socket): AuthPrincipal {
  const principal = socket.data.principal as AuthPrincipal | undefined;

  if (!principal) {
    throw new Error("Authenticated socket principal is missing");
  }

  return principal;
}

function actorIdFromSocket(socket: Socket) {
  return principalFromSocket(socket).id;
}

function campaignIdFromPayload(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "campaignId" in payload &&
    typeof payload.campaignId === "string"
  ) {
    return payload.campaignId;
  }

  return undefined;
}

function installSocketGuards(
  socket: Socket,
  commandResults: Map<string, CommandResultCacheEntry>,
) {
  let windowStartedAt = Date.now();
  let eventCount = 0;

  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    const now = Date.now();
    const principal = principalFromSocket(socket);

    if (principal.role !== "dm" && principal.sessionId) {
      const session = campaignService.getSession(
        principal.campaignId,
        principal.sessionId,
      );
      if (!session || session.phase === "ended") {
        next(socketSecurityError("SESSION_ENDED", "The session has ended"));
        return;
      }
    }

    if (now - windowStartedAt >= 10_000) {
      windowStartedAt = now;
      eventCount = 0;
    }

    eventCount += 1;

    if (eventCount > 200) {
      next(socketSecurityError("RATE_LIMITED", "Too many socket events"));
      return;
    }

    if (Buffer.byteLength(JSON.stringify(payload ?? null), "utf8") > 65_536) {
      next(
        socketSecurityError(
          "PAYLOAD_TOO_LARGE",
          `${String(eventName)} payload is too large`,
        ),
      );
      return;
    }

    const requestId = requestIdFromPayload(payload);
    const originalAck = packet[packet.length - 1];

    if (requestId !== "unknown" && typeof originalAck === "function") {
      const cacheKey = `${actorIdFromSocket(socket)}:${String(eventName)}:${requestId}`;
      const cached = commandResults.get(cacheKey);

      if (cached && cached.expiresAt > now) {
        if ("response" in cached) {
          originalAck(cached.response);
        } else {
          cached.waiters.push(originalAck);
        }
        return;
      }

      const entry: CommandResultCacheEntry = {
        expiresAt: now + 5 * 60 * 1000,
        waiters: [],
      };
      commandResults.set(cacheKey, entry);

      packet[packet.length - 1] = (response: unknown) => {
        entry.response = response;
        originalAck(response);

        for (const waiter of entry.waiters) {
          waiter(response);
        }

        entry.waiters = [];
      };

      if (commandResults.size > 2000) {
        for (const [key, candidate] of commandResults) {
          if (candidate.expiresAt <= now) {
            commandResults.delete(key);
          }
        }
      }
    }

    next();
  });
}

function socketSecurityError(code: string, message: string) {
  const error = new Error(message) as Error & {
    data?: { code: string; message: string };
  };
  error.data = { code, message };
  return error;
}

function requestIdFromPayload(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "requestId" in payload &&
    typeof payload.requestId === "string"
  ) {
    return payload.requestId;
  }

  return "unknown";
}

const roomNames = {
  campaign: (campaignId: string) => `campaign:${campaignId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  scene: (sceneId: string) => `scene:${sceneId}`,
  dm: (campaignId: string) => `dm:${campaignId}`,
  player: (socketId: string) => `player:${socketId}`,
  players: (sceneId: string) => `players:${sceneId}`,
  display: (sceneId: string) => `display:${sceneId}`,
};
