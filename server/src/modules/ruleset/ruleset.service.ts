import type {
  CampaignRulesetResponse,
  RulesetDefinition,
  RulesetSummary,
} from "../../../../shared/types/ruleset";
import { campaignService } from "../campaign/campaign.service";

const DND5E_RULESET: RulesetDefinition = {
  id: "dnd5e",
  name: "Dungeons & Dragons 5e",
  version: "5e-core",
  description:
    "Adaptador inicial para campañas d20 con ventaja/desventaja, condiciones y hoja básica.",
  capabilities: [
    "d20-checks",
    "advantage",
    "conditions",
    "initiative",
    "character-sheet",
  ],
  tags: ["fantasy", "d20", "tactical-combat"],
  dice: {
    notationExamples: ["d20", "d20+3", "2d20kh1+4", "2d20kl1+1", "1d8+2"],
    checks: [
      {
        id: "ability-check",
        label: "Prueba de característica",
        formula: "d20+MOD",
        description: "Tirada d20 más modificador de característica.",
      },
      {
        id: "advantage-check",
        label: "Ventaja",
        formula: "2d20kh1+MOD",
        description: "Tira dos d20 y conserva el mayor.",
      },
      {
        id: "disadvantage-check",
        label: "Desventaja",
        formula: "2d20kl1+MOD",
        description: "Tira dos d20 y conserva el menor.",
      },
      {
        id: "attack-roll",
        label: "Ataque",
        formula: "d20+BONUS",
        description: "Tirada contra Clase de Armadura.",
      },
      {
        id: "damage-roll",
        label: "Daño",
        formula: "1d8+MOD",
        description: "Daño base editable por arma, conjuro o rasgo.",
      },
    ],
  },
  combat: {
    initiativeFormula: "d20+DEX",
    conditions: [
      condition("blinded", "Cegado", "No puede ver.", "Ataques contra la criatura suelen tener ventaja."),
      condition("charmed", "Hechizado", "No puede atacar al origen del hechizo.", "El origen puede tener ventaja social."),
      condition("deafened", "Ensordecido", "No puede oír.", "Falla pruebas basadas solo en oído."),
      condition("frightened", "Asustado", "Teme a una fuente visible.", "Desventaja mientras la fuente esté a la vista."),
      condition("grappled", "Agarrado", "Su velocidad queda en 0.", "Termina si el agarre se rompe."),
      condition("incapacitated", "Incapacitado", "No puede realizar acciones ni reacciones.", "Bloquea la mayoría de opciones activas."),
      condition("invisible", "Invisible", "No puede verse sin sentidos especiales.", "Ataques propios suelen tener ventaja."),
      condition("paralyzed", "Paralizado", "No puede moverse ni hablar.", "Impactos cercanos pueden ser críticos."),
      condition("poisoned", "Envenenado", "Sufre por toxina o veneno.", "Desventaja en ataques y pruebas."),
      condition("prone", "Derribado", "Está en el suelo.", "Movimiento limitado; ataques cercanos cambian ventaja."),
      condition("restrained", "Restringido", "Movimiento reducido a 0.", "Ataques y salvaciones de Destreza se complican."),
      condition("stunned", "Aturdido", "Apenas puede actuar.", "Falla salvaciones de Fuerza y Destreza."),
      condition("unconscious", "Inconsciente", "No percibe su entorno.", "Suelta objetos y queda incapacitado."),
    ],
  },
  characterSheet: {
    sections: [
      {
        id: "identity",
        title: "Identidad",
        fields: [
          field("name", "Nombre", "text"),
          field("ancestry", "Linaje", "text"),
          field("className", "Clase", "text"),
          field("level", "Nivel", "number", 1),
        ],
      },
      {
        id: "abilities",
        title: "Características",
        fields: [
          field("strength", "Fuerza", "number", 10),
          field("dexterity", "Destreza", "number", 10),
          field("constitution", "Constitución", "number", 10),
          field("intelligence", "Inteligencia", "number", 10),
          field("wisdom", "Sabiduría", "number", 10),
          field("charisma", "Carisma", "number", 10),
        ],
      },
      {
        id: "combat",
        title: "Combate",
        fields: [
          field("armorClass", "Clase de Armadura", "number", 10),
          field("maxHp", "HP máximo", "number", 1),
          field("currentHp", "HP actual", "number", 1),
          field("speed", "Velocidad", "number", 30),
        ],
      },
      {
        id: "notes",
        title: "Notas",
        fields: [field("features", "Rasgos y equipo", "textarea")],
      },
    ],
  },
};

export class RulesetService {
  private definitions = new Map<string, RulesetDefinition>([
    [DND5E_RULESET.id, DND5E_RULESET],
  ]);

  listRulesets(): RulesetSummary[] {
    return [...this.definitions.values()].map((ruleset) => ({
      id: ruleset.id,
      name: ruleset.name,
      version: ruleset.version,
      description: ruleset.description,
      capabilities: [...ruleset.capabilities],
      tags: [...ruleset.tags],
    }));
  }

  getRuleset(rulesetId: string): RulesetDefinition | null {
    const ruleset = this.definitions.get(rulesetId);
    return ruleset ? cloneRuleset(ruleset) : null;
  }

  getCampaignRuleset(campaignId: string): CampaignRulesetResponse {
    const campaign = campaignService.getCampaign(campaignId);
    const requestedRulesetId = campaign?.ruleset ?? "dnd5e";
    const ruleset = this.getRuleset(requestedRulesetId) ?? this.getRuleset("dnd5e");

    if (!ruleset) {
      throw new Error("Default ruleset not found");
    }

    return {
      campaignId,
      requestedRulesetId,
      resolvedRulesetId: ruleset.id,
      fallbackUsed: requestedRulesetId !== ruleset.id,
      ruleset,
    };
  }

  conditionIdsForCampaign(campaignId: string) {
    return new Set(
      this.getCampaignRuleset(campaignId).ruleset.combat.conditions.map(
        (condition) => condition.id,
      ),
    );
  }
}

export const rulesetService = new RulesetService();

function condition(
  id: string,
  label: string,
  publicDescription: string,
  rulesHint: string,
) {
  return {
    id,
    label,
    publicDescription,
    rulesHint,
  };
}

function field(
  id: string,
  label: string,
  type: "text" | "number" | "textarea" | "select",
  defaultValue?: string | number,
) {
  return {
    id,
    label,
    type,
    defaultValue,
  };
}

function cloneRuleset(ruleset: RulesetDefinition): RulesetDefinition {
  return JSON.parse(JSON.stringify(ruleset)) as RulesetDefinition;
}
