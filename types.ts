export type DrinkType = 'SODA' | 'COFFEE';

export type GameState = 'MENU' | 'PLAYING' | 'RESULT';

export type FillStatus = 'EMPTY' | 'POURING' | 'SETTLING' | 'EVALUATING' | 'SPILLED';

// Range for the dynamic target generation (percentage)
export const TARGET_MIN = 60;
export const TARGET_MAX = 85;

// Conversion: 1% height ≈ 6ml
export const ML_PER_PERCENT = 6;

// === 遊戲平衡設定 (在此調整手感) ===
export const GAME_CONFIG = {
  SODA: {
    TOLERANCE: 7,         // 判定寬容度 (綠色區間大小 +/- 5%)
    FILL_SPEED: 0.55,     // 倒水速度 (數字越大倒越快)
    FOAM_RATE: 0.22,      // 泡沫產生速度 (數字越大泡沫越多)
    SETTLING_TIME: 1800,  // 手放開後的等待結算時間 (毫秒)
  },
  COFFEE: {
    TOLERANCE: 3,         // 判定寬容度 (綠色區間大小 +/- 3%)
    FILL_SPEED: 0.85,     // 倒水速度 (咖啡比較快)
    FOAM_RATE: 0.05,      // 泡沫產生速度 (咖啡泡沫少)
    SETTLING_TIME: 800,   // 手放開後的等待結算時間 (毫秒)
  }
};