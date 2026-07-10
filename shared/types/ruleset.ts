export type RulesetId = "dnd5e" | string;

export type RulesetCapability =
  | "d20-checks"
  | "advantage"
  | "conditions"
  | "initiative"
  | "character-sheet";

export type SheetFieldType = "text" | "number" | "textarea" | "select";

export interface RulesetSummary {
  id: RulesetId;
  name: string;
  version: string;
  description: string;
  capabilities: RulesetCapability[];
  tags: string[];
}

export interface DiceCheckPreset {
  id: string;
  label: string;
  formula: string;
  description: string;
}

export interface RulesetCondition {
  id: string;
  label: string;
  publicDescription: string;
  rulesHint: string;
}

export interface CharacterSheetField {
  id: string;
  label: string;
  type: SheetFieldType;
  defaultValue?: string | number;
  options?: string[];
}

export interface CharacterSheetSection {
  id: string;
  title: string;
  fields: CharacterSheetField[];
}

export interface RulesetDiceConfig {
  notationExamples: string[];
  checks: DiceCheckPreset[];
}

export interface RulesetCombatConfig {
  initiativeFormula: string;
  conditions: RulesetCondition[];
}

export interface RulesetDefinition extends RulesetSummary {
  dice: RulesetDiceConfig;
  combat: RulesetCombatConfig;
  characterSheet: {
    sections: CharacterSheetSection[];
  };
}

export interface CampaignRulesetResponse {
  campaignId: string;
  requestedRulesetId: string;
  resolvedRulesetId: string;
  fallbackUsed: boolean;
  ruleset: RulesetDefinition;
}
