export type DrinkType = 'SODA' | 'COFFEE';

export type GameState = 'MENU' | 'PLAYING' | 'RESULT';

export type FillStatus = 'EMPTY' | 'POURING' | 'SETTLING' | 'EVALUATING' | 'SPILLED';

// Range for the dynamic target generation (percentage)
export const TARGET_MIN = 60;
export const TARGET_MAX = 85;

// === 遊戲總時間設定 (秒) ===
export const GAME_DURATION = 60;

// === 出現機率設定 ===
// 0.7 代表 70% 機率出現汽水
export const SODA_APPEARANCE_CHANCE = 0.7; 

// 基礎轉換: 1% 高度 ≈ 6ml
export const ML_PER_PERCENT = 6;

// === 遊戲平衡設定 (在此調整手感與分數) ===
export const GAME_CONFIG = {
  SODA: {
    TOLERANCE: 7,         // 判定寬容度
    FILL_SPEED: 0.55,     // 倒水速度
    FOAM_RATE: 0.22,      // 泡沫產生速度
    SETTLING_TIME: 1000,  // 等待結算時間
    // --- 分數相關 ---
    SCORE_MULTIPLIER: 1.5, // [設定] 汽水分數比較高，給予 1.5 倍加成
    PERFECT_BONUS: 399,     // [設定] 汽水完美控制時的額外加分
  },
  COFFEE: {
    TOLERANCE: 3,         // 判定寬容度
    FILL_SPEED: 0.85,     // 倒水速度
    FOAM_RATE: 0.05,      // 泡沫產生速度
    SETTLING_TIME: 800,   // 等待結算時間
    // --- 分數相關 ---
    SCORE_MULTIPLIER: 1.0, // [設定] 咖啡基礎倍率
    PERFECT_BONUS: 99,     // [設定] 咖啡完美控制時的額外加分
  }
};