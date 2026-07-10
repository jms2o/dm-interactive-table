import type {
  AIApproveRequest,
  AIApproveResponse,
  AIDraft,
  AIGenerateRequest,
  AIGenerateResponse,
  AIGenerationPurpose,
  AIPromptRun,
} from "../../../../shared/types/ai";

const PROVIDER = "local-draft";
const MODEL = "deterministic-v0";

export class AIService {
  private promptRuns = new Map<string, AIPromptRun>();

  generate(request: AIGenerateRequest, requestedBy: string): AIGenerateResponse {
    const prompt = normalizePrompt(request.prompt);

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const now = new Date().toISOString();
    const promptRun: AIPromptRun = {
      id: crypto.randomUUID(),
      version: 1,
      campaignId: request.campaignId,
      requestId: request.requestId,
      purpose: request.purpose,
      prompt,
      contextIds: request.contextIds ?? [],
      provider: PROVIDER,
      model: MODEL,
      draft: buildDraft(request.purpose, prompt),
      warnings: buildWarnings(prompt, request.contextIds ?? []),
      approved: false,
      requestedBy,
      createdAt: now,
      updatedAt: now,
    };

    this.promptRuns.set(promptRun.id, promptRun);

    return {
      promptRunId: promptRun.id,
      provider: promptRun.provider,
      model: promptRun.model,
      purpose: promptRun.purpose,
      draft: cloneDraft(promptRun.draft),
      warnings: [...promptRun.warnings],
      approved: promptRun.approved,
      createdAt: promptRun.createdAt,
    };
  }

  listPromptRuns(campaignId: string) {
    return [...this.promptRuns.values()]
      .filter((promptRun) => promptRun.campaignId === campaignId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(clonePromptRun);
  }

  approve(request: AIApproveRequest): AIApproveResponse {
    const promptRun = this.promptRuns.get(request.promptRunId);

    if (!promptRun || promptRun.campaignId !== request.campaignId) {
      throw new Error("Prompt run not found");
    }

    const now = new Date().toISOString();
    const updated: AIPromptRun = {
      ...promptRun,
      approved: request.approved,
      approvedAt: request.approved ? now : undefined,
      updatedAt: now,
    };

    this.promptRuns.set(updated.id, updated);

    return {
      promptRunId: updated.id,
      approved: updated.approved,
      approvedAt: updated.approvedAt,
      updatedAt: updated.updatedAt,
    };
  }

  importPromptRunCopies(campaignId: string, promptRuns: AIPromptRun[]) {
    const now = new Date().toISOString();

    return promptRuns.map((source) => {
      const promptRun: AIPromptRun = {
        ...source,
        id: crypto.randomUUID(),
        campaignId,
        requestId: `imported-${crypto.randomUUID()}`,
        contextIds: [...source.contextIds],
        draft: cloneDraft(source.draft),
        warnings: [...source.warnings],
        requestedBy: "package-import",
        createdAt: now,
        updatedAt: now,
        approvedAt: source.approved ? now : undefined,
      };

      this.promptRuns.set(promptRun.id, promptRun);
      return clonePromptRun(promptRun);
    });
  }
}

export const aiService = new AIService();

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ");
}

function buildWarnings(prompt: string, contextIds: string[]) {
  const warnings: string[] = [];

  if (contextIds.length === 0) {
    warnings.push("Borrador generado sin contexto seleccionado de campaña.");
  }

  if (prompt.length < 18) {
    warnings.push("Prompt corto: revisa coherencia antes de aprobar.");
  }

  return warnings;
}

function buildDraft(purpose: AIGenerationPurpose, prompt: string): AIDraft {
  const subject = titleFromPrompt(prompt);

  switch (purpose) {
    case "npc":
      return {
        name: subject,
        role: "Contacto de campaña",
        motivation: `Quiere resolver algo relacionado con "${prompt}".`,
        voice: "Habla con frases medidas y evita revelar todo de inmediato.",
        publicNotes: `${subject} puede introducir una pista o complicación visible para el grupo.`,
        privateNotes: "Tiene una razón personal para ocultar parte de la verdad.",
        secrets: [
          "Conoce una ruta, deuda o nombre que todavía no debe llegar a los jugadores.",
        ],
      };
    case "scene":
      return {
        name: `Escena: ${subject}`,
        narrativeText: `El grupo se encuentra ante ${prompt}. Algo en el ambiente sugiere que la situación puede cambiar rápido.`,
        hooks: [
          "Una señal visible invita a investigar.",
          "Un testigo o rastro conecta la escena con la campaña principal.",
        ],
        complications: [
          "Un aliado no dice toda la verdad.",
          "El tiempo disponible se reduce si el grupo duda demasiado.",
        ],
      };
    case "villain":
      return {
        name: subject,
        agenda: `Controlar o explotar ${prompt} antes de que los héroes entiendan su valor.`,
        methods: [
          "Usa intermediarios para mantenerse fuera de vista.",
          "Convierte problemas pequeños en decisiones morales difíciles.",
        ],
        weakness: "Subestima los vínculos personales del grupo.",
      };
    case "event":
      return {
        title: `Evento: ${subject}`,
        trigger: `Ocurre cuando el grupo interactúa con ${prompt}.`,
        consequence:
          "Cambia la prioridad inmediata de la sesión y abre una decisión clara para los jugadores.",
      };
    case "summary":
      return {
        summaryPublic: `La sesión giró alrededor de ${prompt}. El grupo obtuvo nuevas pistas y dejó al menos una tensión abierta.`,
        summaryPrivate:
          "Revisar qué información fue revelada, qué secreto sigue activo y qué NPC debe reaccionar después.",
        unresolvedThreads: [
          "Una consecuencia pendiente necesita aparecer en la próxima sesión.",
          "Un NPC debería ajustar su postura según la decisión del grupo.",
        ],
      };
    case "encounter":
      return {
        name: `Encuentro: ${subject}`,
        enemies: [
          { name: "Amenaza principal", role: "presión frontal" },
          { name: "Apoyo táctico", role: "control o distracción" },
        ],
        terrain: "Usa cobertura, elevación o un obstáculo que obligue a moverse.",
        twist: `El objetivo real no es solo derrotar enemigos: también importa ${prompt}.`,
      };
    case "campaign":
      return {
        title: subject,
        premise: `Una campaña centrada en ${prompt}, diseñada para mezclar exploración, intriga y encuentros tácticos.`,
        factions: [
          "Una facción pública con recursos legítimos.",
          "Una red oculta que manipula eventos desde dentro.",
        ],
        startingScene:
          "Los personajes llegan a un lugar donde una petición sencilla revela un conflicto mayor.",
      };
    default:
      return {
        title: subject,
        notes: prompt,
      };
  }
}

function titleFromPrompt(prompt: string) {
  const words = prompt
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0) {
    return "Borrador";
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function clonePromptRun(promptRun: AIPromptRun): AIPromptRun {
  return {
    ...promptRun,
    contextIds: [...promptRun.contextIds],
    draft: cloneDraft(promptRun.draft),
    warnings: [...promptRun.warnings],
  };
}

function cloneDraft(draft: AIDraft): AIDraft {
  return JSON.parse(JSON.stringify(draft)) as AIDraft;
}
