import type {
  DiceRollDieBreakdown,
  DiceRollResult,
  RollDiceRequest,
} from "../../../../shared/types/dice";

type DiceRollConstructor = new (formula: string) => {
  notation: string;
  output: string;
  total: number;
  roll: unknown;
};

type DiceRollModule = {
  DiceRoll: DiceRollConstructor;
};

const MAX_FORMULA_LENGTH = 120;
const MAX_DICE_COUNT = 100;

export class DiceService {
  async roll(request: RollDiceRequest, rolledBy: string): Promise<DiceRollResult> {
    const formula = normalizeFormula(request.formula);
    validateFormulaShape(formula);

    const { DiceRoll } = (await import(
      "@dice-roller/rpg-dice-roller"
    )) as DiceRollModule;
    const diceRoll = new DiceRoll(formula);
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      version: 1,
      campaignId: request.campaignId,
      sessionId: request.sessionId,
      formula: request.formula,
      normalizedFormula: diceRoll.notation,
      output: diceRoll.output,
      resultTotal: diceRoll.total,
      breakdown: extractBreakdown(diceRoll.roll),
      visibility: request.visibility,
      purpose: request.purpose,
      rolledBy,
      createdAt: now,
    };
  }
}

export const diceService = new DiceService();

function normalizeFormula(formula: string) {
  return formula.trim().replace(/\s+/g, "");
}

function validateFormulaShape(formula: string) {
  if (!formula) {
    throw new Error("Dice formula is required");
  }

  if (formula.length > MAX_FORMULA_LENGTH) {
    throw new Error("Dice formula is too long");
  }

  const diceMatches = formula.match(/(\d*)d(\d+|%)/gi) ?? [];
  const diceCount = diceMatches.reduce((total, match) => {
    const count = Number.parseInt(match.split(/d/i)[0] || "1", 10);
    return total + count;
  }, 0);

  if (diceCount > MAX_DICE_COUNT) {
    throw new Error("Dice formula rolls too many dice");
  }
}

function extractBreakdown(roll: unknown): DiceRollDieBreakdown[] {
  const dice: DiceRollDieBreakdown[] = [];
  collectDiceResults(roll, dice);
  return dice;
}

function collectDiceResults(value: unknown, dice: DiceRollDieBreakdown[]) {
  if (!value || typeof value !== "object") {
    return;
  }

  const candidate = value as Record<string, unknown>;
  const rolls = extractRollValues(candidate.rolls ?? candidate.results);
  const sides = extractSides(candidate);
  const notation = String(candidate.notation ?? candidate.type ?? "");

  if (rolls.length > 0 && sides > 0) {
    dice.push({
      notation,
      sides,
      rolls,
    });
  }

  for (const nested of Object.values(candidate)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        collectDiceResults(item, dice);
      }
    } else if (nested && typeof nested === "object") {
      collectDiceResults(nested, dice);
    }
  }
}

function extractSides(candidate: Record<string, unknown>) {
  if (typeof candidate.sides === "number") {
    return candidate.sides;
  }

  if (typeof candidate.max === "number") {
    return candidate.max;
  }

  if (typeof candidate.die === "object" && candidate.die) {
    const die = candidate.die as Record<string, unknown>;
    if (typeof die.sides === "number") {
      return die.sides;
    }
  }

  return 0;
}

function extractRollValues(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "number") {
        return item;
      }

      if (item && typeof item === "object") {
        const candidate = item as Record<string, unknown>;
        if (typeof candidate.value === "number") {
          return candidate.value;
        }
        if (typeof candidate.result === "number") {
          return candidate.result;
        }
      }

      return null;
    })
    .filter((item): item is number => item !== null);
}

