import type { BattleMap } from "./map";
import type { SceneExperienceState } from "./table-experience";
import type { GameToken } from "./token";

export interface GameScene {
  id: string;
  name: string;
  map: BattleMap;
  tokens: GameToken[];
  narrativeText: string;
  experience: SceneExperienceState;
}
