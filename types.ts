export type DrinkType = 'SODA';

export type GameState = 'MENU' | 'PLAYING' | 'RESULT';

export type FillStatus = 'EMPTY' | 'POURING' | 'SETTLING' | 'EVALUATING' | 'SPILLED';

export interface ScoreConfig {
  perfectMin: number;
  perfectMax: number;
  goodMin: number;
  goodMax: number;
}

// 80% is the target line
export const TARGET_LINE = 80;

export const SCORING: ScoreConfig = {
  perfectMin: 78,
  perfectMax: 82,
  goodMin: 70,
  goodMax: 90, // Anything above 90 is risky
};