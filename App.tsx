import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Glass } from './components/Glass';
import { Dispenser } from './components/Dispenser';
import { DrinkType, GameState, FillStatus, SCORING } from './types';
import { Timer, RefreshCcw, Play, Trophy } from 'lucide-react';

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [completedCups, setCompletedCups] = useState(0);

  // Round State
  const [drinkType, setDrinkType] = useState<DrinkType>('COFFEE');
  const [liquidLevel, setLiquidLevel] = useState(0); // Actual liquid
  const [foamLevel, setFoamLevel] = useState(0); // Foam visual height
  const [status, setStatus] = useState<FillStatus>('EMPTY');
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- Refs for Physics ---
  const requestRef = useRef<number>(undefined);
  const isPouringRef = useRef(false);
  const liquidLevelRef = useRef(0);
  const foamLevelRef = useRef(0);
  const pressureRef = useRef(0); // "Fizz" pressure accumulator for soda
  const settledTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // State Refs for Loop Access (prevents loop recreation)
  // We initialize these with the default state values
  const statusRef = useRef<FillStatus>('EMPTY');
  const drinkTypeRef = useRef<DrinkType>('COFFEE');

  // Sync drinkType ref with state (drinkType changes rarely, so Effect sync is fine)
  useEffect(() => { drinkTypeRef.current = drinkType; }, [drinkType]);

  // --- Game Loop (Physics) ---
  const updatePhysics = useCallback(() => {
    // Determine current state from refs
    const currentStatus = statusRef.current;
    const currentDrink = drinkTypeRef.current;

    // 1. Pouring Logic
    if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
      const fillSpeed = 0.6; // Base fill speed
      
      // Add liquid
      liquidLevelRef.current += fillSpeed;

      if (currentDrink === 'SODA') {
        // Soda Mechanics:
        // Accumulate pressure while pouring. 
        // Some pressure converts to immediate foam, but most is stored.
        pressureRef.current += 0.8; 
        
        // Base foam exists while pouring
        if (foamLevelRef.current < 10) {
           foamLevelRef.current += 0.5;
        }
      } else {
        // Coffee Mechanics: No pressure, minimal turbulence
        pressureRef.current = 0;
        foamLevelRef.current = 0;
      }
    } 
    // 2. Settling/Stopping Logic
    else if (!isPouringRef.current && currentStatus === 'SETTLING') {
      if (currentDrink === 'SODA') {
        // The TRICK: When you stop, pressure releases into foam
        if (pressureRef.current > 0) {
          // Rapidly convert pressure to height (the "Rise")
          const releaseAmount = pressureRef.current * 0.15;
          foamLevelRef.current += releaseAmount;
          pressureRef.current -= releaseAmount;
          
          if (pressureRef.current < 0.5) pressureRef.current = 0;
        } else {
          // Once pressure is gone, foam slowly decays
          foamLevelRef.current *= 0.96;
          if (foamLevelRef.current < 0.1) foamLevelRef.current = 0;
        }
      }
    }

    // 3. Overflow Check
    const totalHeight = liquidLevelRef.current + foamLevelRef.current;
    
    // SPILL THRESHOLD: 
    // Increased to 105 to allow for "Surface Tension" effect.
    // > 105 is a hard fail.
    if (totalHeight > 105 && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        handleSpillInternal();
    }

    // Update React State for rendering
    setLiquidLevel(liquidLevelRef.current);
    setFoamLevel(foamLevelRef.current);

    // Continue loop
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  // Handle spill logic inside loop context
  const handleSpillInternal = () => {
    // Immediate updates
    setStatus('SPILLED');
    statusRef.current = 'SPILLED';
    
    isPouringRef.current = false;
    setFeedback("溢出來了！");
    
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 1500);
  };

  // Manage Loop Lifecycle
  useEffect(() => {
    if (gameState === 'PLAYING') {
      if (!requestRef.current) {
         requestRef.current = requestAnimationFrame(updatePhysics);
      }
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [gameState, updatePhysics]);

  // --- Interaction Handlers ---

  const startPouring = () => {
    if (status === 'EVALUATING' || status === 'SPILLED' || gameState !== 'PLAYING') return;
    
    // Immediate updates
    setStatus('POURING');
    statusRef.current = 'POURING';
    isPouringRef.current = true;
    
    // Clear any pending evaluation timers
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
  };

  const stopPouring = () => {
    if (!isPouringRef.current) return;
    
    isPouringRef.current = false;
    
    // Immediate updates
    setStatus('SETTLING');
    statusRef.current = 'SETTLING';

    // Wait for physics to settle before judging
    // Soda needs longer to settle because of the rise
    const waitTime = drinkType === 'SODA' ? 1200 : 600;

    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    settledTimerRef.current = setTimeout(() => {
      evaluateRound();
    }, waitTime);
  };

  const handleSpill = () => {
     handleSpillInternal();
  };

  const evaluateRound = () => {
    setStatus('EVALUATING');
    statusRef.current = 'EVALUATING';
    
    const finalLevel = liquidLevelRef.current + foamLevelRef.current;
    
    let roundScore = 0;
    let msg = "";

    // Tolerance check & Grading
    if (finalLevel > 105) {
      // Hard Spill (Should usually be caught by physics loop, but just in case)
      msg = "溢出來了！";
      roundScore = 0;
    } else if (finalLevel > 100) {
      // 100 - 105: Surface Tension Bonus (Risky but saved!)
      msg = "表面張力！";
      roundScore = 30; // Small bonus for saving it, but not as good as hitting target
    } else if (finalLevel >= SCORING.perfectMin && finalLevel <= SCORING.perfectMax) {
      msg = "完美！";
      roundScore = 100;
    } else if (finalLevel >= SCORING.goodMin && finalLevel <= SCORING.goodMax) {
      msg = "不錯！";
      roundScore = 50;
    } else if (finalLevel > SCORING.goodMax) {
      // Between 90 and 100
      msg = "太多了！";
      roundScore = 10;
    } else if (finalLevel < SCORING.goodMin) {
      msg = "太少了...";
      roundScore = 0;
    } else {
      msg = "太糟了！";
      roundScore = 10;
    }

    setFeedback(msg);
    if (roundScore > 0) {
      setScore(s => s + roundScore);
      setCompletedCups(c => c + 1);
    }
    
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 1500);
  };

  const nextRound = () => {
    // Reset physics
    liquidLevelRef.current = 0;
    foamLevelRef.current = 0;
    pressureRef.current = 0;
    isPouringRef.current = false;
    
    // Clear timers
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    setLiquidLevel(0);
    setFoamLevel(0);
    
    // Immediate updates
    setStatus('EMPTY');
    statusRef.current = 'EMPTY';
    setFeedback(null);
    
    // Random drink (50/50 chance)
    setDrinkType(Math.random() > 0.5 ? 'SODA' : 'COFFEE');
  };

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setCompletedCups(0);
    setTimeLeft(60);
    nextRound();
  };

  // --- Global Timer ---
  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('RESULT');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [gameState, timeLeft]);


  // --- Render ---
  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center font-sans text-white relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-400 via-red-600 to-red-900"></div>

      {gameState === 'MENU' && (
        <div className="z-10 text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl max-w-sm mx-4">
          <h1 className="text-5xl font-black mb-2 text-yellow-300 drop-shadow-md">飲料大師</h1>
          <p className="mb-6 text-lg">你能駕馭氣泡嗎？</p>
          
          <div className="space-y-4 text-left bg-black/20 p-4 rounded-lg mb-8 text-sm">
            <p>☕ <span className="font-bold text-yellow-200">咖啡：</span> 簡單。放開就停。</p>
            <p>🥤 <span className="font-bold text-yellow-200">汽水：</span> 難！停下後氣泡會上升，要提早停！</p>
          </div>

          <button 
            onClick={startGame}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-2xl font-bold text-red-600 transition-all duration-200 bg-white font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white hover:scale-105 active:scale-95"
          >
            <Play className="mr-2" /> 開始遊戲
          </button>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="z-10 text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl animate-pop">
          <h2 className="text-4xl font-bold mb-4">時間到！</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/20 p-4 rounded-xl">
              <p className="text-sm opacity-70">分數</p>
              <p className="text-3xl font-bold text-yellow-300">{score}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl">
              <p className="text-sm opacity-70">杯數</p>
              <p className="text-3xl font-bold">{completedCups}</p>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full py-4 bg-white text-red-600 rounded-xl font-bold text-xl hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <RefreshCcw className="mr-2" /> 再玩一次
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full max-w-md h-full flex flex-col items-center justify-between pb-8 pt-4 z-10">
          
          {/* Header UI */}
          <div className="w-full px-6 flex justify-between items-center mb-4">
             <div className="bg-black/30 px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
               <Trophy size={18} className="text-yellow-400" />
               <span className="font-bold text-xl">{score}</span>
             </div>
             <div className="bg-black/30 px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
               <Timer size={18} />
               <span className={`font-bold text-xl ${timeLeft < 10 ? 'text-red-300 animate-pulse' : ''}`}>
                 {timeLeft}
               </span>
             </div>
          </div>

          {/* Game Area */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-start mt-4">
            
            {/* Dispenser Machine */}
            <Dispenser drinkType={drinkType} isPouring={status === 'POURING'} />

            {/* Glass Area */}
            <div className="relative mt-2">
              {/* Feedback Bubble */}
              {feedback && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-pop">
                  <div className="bg-white text-red-600 px-4 py-2 rounded-full font-black border-4 border-red-600 shadow-lg text-xl transform rotate-[-5deg]">
                    {feedback}
                  </div>
                </div>
              )}
              
              <Glass 
                liquidHeight={liquidLevel} 
                foamHeight={foamLevel} 
                drinkType={drinkType} 
                isSpilled={status === 'SPILLED'} 
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 mb-4 select-none touch-none">
            <button
              onMouseDown={startPouring}
              onMouseUp={stopPouring}
              onMouseLeave={stopPouring}
              onTouchStart={(e) => { e.preventDefault(); startPouring(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopPouring(); }}
              disabled={status === 'EVALUATING' || status === 'SPILLED'}
              className={`
                w-24 h-24 rounded-full border-b-8 border-red-800 shadow-2xl flex items-center justify-center transition-all active:scale-95 active:border-b-0 active:translate-y-2
                ${status === 'EVALUATING' || status === 'SPILLED' ? 'bg-gray-400 border-gray-600 cursor-not-allowed' : 'bg-red-500 hover:bg-red-400'}
              `}
            >
              <span className="font-bold text-xl drop-shadow-md">倒</span>
            </button>
            <p className="text-center text-sm mt-4 opacity-70">按住倒水，放開停止</p>
          </div>
        </div>
      )}
    </div>
  );
}