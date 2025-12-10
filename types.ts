export type DrinkType = 'SODA' | 'COFFEE';

export type GameState = 'MENU' | 'PLAYING' | 'RESULT';

export type FillStatus = 'EMPTY' | 'POURING' | 'SETTLING' | 'EVALUATING' | 'SPILLED';

// Range for the dynamic target generation (percentage)
export const TARGET_MIN = 60;
export const TARGET_MAX = 85;

// Tolerance range (+/- percentage from target)
export const TOLERANCE = 3; 

// Conversion: 1% height ≈ 5ml (assuming 500ml glass capacity)
export const ML_PER_PERCENT = 5;