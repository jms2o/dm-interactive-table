export interface Enemy {
  id: string;
  name: string;
  creatureType: string;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  challengeRating: string;
}