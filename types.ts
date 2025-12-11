export type DrinkType = 'SODA' | 'COFFEE';

export type GameState = 'MENU' | 'PLAYING' | 'RESULT';

export type FillStatus = 'EMPTY' | 'POURING' | 'SETTLING' | 'EVALUATING' | 'SPILLED';

// Range for the dynamic target generation (percentage)
export const TARGET_MIN = 60;
export const TARGET_MAX = 85;

// Tolerance range (+/- percentage from target)
export const COFFEE_TOLERANCE = 3; 
export const SODA_TOLERANCE = 5; // 汽水比較難控制，給予較寬的判定範圍 (Widened from 3 to 5)

// Conversion: 1% height ≈ 6ml (Increased from 5 to create wider score range)
export const ML_PER_PERCENT = 6;