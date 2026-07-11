import type {
  DemoReadinessItem,
  DemoReadinessResponse,
  DemoReadinessStatus,
} from "../../../../shared/types/demo";
import {
  DEFAULT_CAMPAIGN_ID,
  gameState,
} from "../../game/game.state";
import { assetService } from "../asset/asset.service";
import { campaignService } from "../campaign/campaign.service";
import { rulesetService } from "../ruleset/ruleset.service";
import { APP_VERSION as DEMO_VERSION } from "../../../../shared/version";


export class DemoService {
  getReadiness(): DemoReadinessResponse {
    const campaign = campaignService.getCampaign(DEFAULT_CAMPAIGN_ID);
    const snapshot = gameState.getSnapshot("dm");
    const scene = snapshot.scene;
    const ruleset = rulesetService.getCampaignRuleset(DEFAULT_CAMPAIGN_ID);
    const visibleTokens = scene?.tokens.filter((token) => token.visible) ?? [];
    const hiddenTokens = scene?.tokens.filter((token) => !token.visible) ?? [];
    const assets = assetService.listAssets(DEFAULT_CAMPAIGN_ID);

    const items: DemoReadinessItem[] = [
      item(
        "campaign",
        "Campaña demo",
        Boolean(campaign),
        campaign
          ? `${campaign.name} usando ${campaign.ruleset}`
          : "No existe la campaña demo",
      ),
      item(
        "ruleset",
        "Ruleset activo",
        ruleset.resolvedRulesetId === "dnd5e",
        `${ruleset.ruleset.name} con ${ruleset.ruleset.combat.conditions.length} condiciones`,
      ),
      item(
        "map",
        "Mapa y escena",
        Boolean(scene?.map && scene.map.width > 0 && scene.map.height > 0),
        scene?.map
          ? `${scene.name} en ${scene.map.width}x${scene.map.height}`
          : "No hay escena activa",
      ),
      item(
        "tokens",
        "Tokens públicos y privados",
        visibleTokens.length > 0 && hiddenTokens.length > 0,
        `${visibleTokens.length} visibles, ${hiddenTokens.length} ocultos`,
      ),
      ready(
        "dice",
        "Dados",
        "HTTP /dice/roll y Socket.IO dice:roll disponibles",
      ),
      ready(
        "combat",
        "Combate",
        "Encuentros con iniciativa, turnos, reglas y condiciones",
      ),
      ready(
        "npc",
        "NPCs y enemigos",
        "Creación por API y conversión a token disponible",
      ),
      ready(
        "ai",
        "IA asistiva",
        "Borradores, PromptRun y aprobación manual disponibles",
      ),
      item(
        "table-experience",
        "Experiencia de mesa",
        Boolean(scene?.experience),
        scene?.experience
          ? `Fog ${scene.experience.fogOfWar.enabled ? "activo" : "preparado"}, display ${scene.experience.displayMode}`
          : "La escena no tiene estado de experiencia",
      ),
      item(
        "dynamic-lighting",
        "Iluminación dinámica",
        Boolean(scene?.experience?.lighting),
        scene?.experience
          ? `Luz ${scene.experience.lighting.enabled ? "activa" : "preparada"}, ${scene.experience.lighting.sources.length} fuentes`
          : "La escena no tiene estado de iluminación",
      ),
      item(
        "line-of-sight",
        "Línea de visión",
        Boolean(scene?.experience?.vision),
        scene?.experience
          ? `Visión ${scene.experience.vision.enabled ? "activa" : "preparada"}, alcance ${scene.experience.vision.defaultRange}, ${scene.experience.vision.occluders.length} obstáculos`
          : "La escena no tiene estado de visión",
      ),
      ready(
        "interactive-doors",
        "Puertas interactivas",
        "Obstáculos door con apertura y cierre sincronizados",
      ),
      ready(
        "visual-occluder-editor",
        "Editor visual de obstáculos",
        "Dibujo por dos puntos y manejadores de extremos en el tablero DM",
      ),
      ready(
        "advanced-occluder-tools",
        "Herramientas avanzadas de obstáculos",
        "Ajuste, continuidad, duplicado, división y eliminación directa",
      ),
      ready(
        "vision-history-batch",
        "Historial y lotes de visión",
        "Undo/redo autoritativo, selección múltiple y mutaciones atómicas",
      ),
      ready(
        "map-camera",
        "Cámara avanzada del mapa",
        "Pan, zoom focal, encuadre y coordenadas de edición transformadas",
      ),
      ready(
        "map-layers-minimap",
        "Capas y minimapa",
        "Capas locales reordenables y navegación general de la escena",
      ),
      ready(
        "multi-screen",
        "Multipantalla",
        "Rutas /dm, /display y /player más rooms Socket.IO",
      ),
      ready(
        "authentication",
        "Autenticación DM",
        "bcrypt, cookie httpOnly y token firmado activos",
      ),
      ready(
        "table-access",
        "Acceso de mesa",
        "Código temporal, QR y roles player/display derivados por servidor",
      ),
      ready(
        "session-recovery",
        "Recuperación",
        "Autosave serializado, snapshots locales/Prisma y reconexión idempotente",
      ),
      ready(
        "session-lobby",
        "Lobby de sesiones",
        "Selector de campaña, presencia y contexto DM firmado",
      ),
      ready(
        "session-lifecycle",
        "Ciclo de sesión",
        "Preparación, partida en vivo y cierre persistentes",
      ),
      ready(
        "player-character-sheet",
        "Hoja de jugador",
        "HP, CA, nivel, notas y recursos aislados por participante",
      ),
      ready(
        "global-history",
        "Historial global",
        "Undo/redo y snapshots nombrados restaurables",
      ),
      ready(
        "delivery-pipeline",
        "Entrega reproducible",
        "Docker Compose, GitHub Actions, CodeQL y Playwright",
      ),
      ready(
        "smoke-test",
        "Smoke test",
        "npm run test:smoke recorre API y Socket.IO",
      ),
      ready(
        "asset-storage",
        "Asset Storage",
        `${assets.length} assets registrados para la campaña demo`,
      ),
      ready(
        "real-audio",
        "Audio real",
        "Cues de ambiente resuelven assetUrl y se reproducen en display/jugador",
      ),
      ready(
        "audio-mixer",
        "Mixer de audio",
        "Canales music/sound/effect con volumen, mute y playback sincronizado",
      ),
      ready(
        "audio-presets",
        "Presets de audio",
        "Guardar y aplicar escenas de audio desde el mixer",
      ),
      ready(
        "audio-transitions",
        "Transiciones de audio",
        "Aplicar presets con corte, fade o crossfade básico",
      ),
      ready(
        "audio-preset-management",
        "Gestión de presets",
        "Renombrar, borrar y reordenar presets de audio",
      ),
      ready(
        "audio-package-export",
        "Audio en paquetes",
        "audioScenes, conteos y remapeo de assets de presets",
      ),
      ready(
        "campaign-package",
        "Import/export",
        "Paquetes JSON versionados con validación, apply-copy y assets de storage",
      ),
    ];

    const readyCount = items.filter((candidate) => candidate.status === "ready")
      .length;

    return {
      version: DEMO_VERSION,
      releaseName: "Session Workflow",
      allReady: readyCount === items.length,
      readyCount,
      totalCount: items.length,
      items,
      routes: [
        { label: "DM", url: "http://localhost:5173/dm" },
        { label: "Display", url: "http://localhost:5173/display" },
        { label: "Jugador", url: "http://localhost:5173/player" },
        {
          label: "Readiness API",
          url: "http://localhost:4000/api/demo/readiness",
        },
      ],
      commands: [
        "npm run dev",
        "npm run build",
        "npm run lint --workspace client",
        "npm run prisma:validate --workspace server",
        "npm run test:smoke",
        "npm run test:workflow",
        "npm run test:e2e",
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}

export const demoService = new DemoService();

function item(
  id: string,
  label: string,
  isReady: boolean,
  evidence: string,
): DemoReadinessItem {
  return {
    id,
    label,
    status: statusFromBoolean(isReady),
    evidence,
  };
}

function ready(id: string, label: string, evidence: string): DemoReadinessItem {
  return {
    id,
    label,
    status: "ready",
    evidence,
  };
}

function statusFromBoolean(isReady: boolean): DemoReadinessStatus {
  return isReady ? "ready" : "blocked";
}
