import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Glass } from './components/Glass';
import { Dispenser } from './components/Dispenser';
import { GameState, FillStatus, SCORING, DrinkType } from './types';
import { Timer, RefreshCcw, Play, Trophy, Coffee, GlassWater } from 'lucide-react';

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [timeLeft, setTimeLeft] = useState(25);
  const [score, setScore] = useState(0);
  const [completedCups, setCompletedCups] = useState(0);
  const [drinkType, setDrinkType] = useState<DrinkType>('SODA');

  // Round State
  const [liquidLevel, setLiquidLevel] = useState(0); // Actual liquid
  const [foamLevel, setFoamLevel] = useState(0); // Foam visual height
  const [status, setStatus] = useState<FillStatus>('EMPTY');
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- Refs for Physics ---
  const requestRef = useRef<number>(undefined);
  const isPouringRef = useRef(false);
  const liquidLevelRef = useRef(0);
  const foamLevelRef = useRef(0);
  const pressureRef = useRef(0); // Soda pressure mechanic
  const settledTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // State Refs for Loop Access
  const statusRef = useRef<FillStatus>('EMPTY');
  const drinkTypeRef = useRef<DrinkType>('SODA');

  // Sync ref with state
  useEffect(() => {
    drinkTypeRef.current = drinkType;
  }, [drinkType]);

  // --- Game Loop (Physics) ---
  const updatePhysics = useCallback(() => {
    const currentStatus = statusRef.current;
    const currentDrink = drinkTypeRef.current;

    if (currentDrink === 'SODA') {
      // === SODA PHYSICS (UNCHANGED) ===
      
      // 1. Pouring Logic
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = 0.55; 
        liquidLevelRef.current += fillSpeed;
        
        // Pressure Buildup
        pressureRef.current += 0.22; 
        
        // Visual base foam
        if (foamLevelRef.current < 8) {
            foamLevelRef.current += 0.5;
        }
      } 
      // 2. Settling Logic
      else if (!isPouringRef.current && currentStatus === 'SETTLING') {
        if (pressureRef.current > 0) {
          const riseSpeed = 0.4;
          const amountToTransfer = Math.min(pressureRef.current, riseSpeed);
          
          foamLevelRef.current += amountToTransfer;
          pressureRef.current -= amountToTransfer;
          
          if (pressureRef.current < 0.01) pressureRef.current = 0;
        } else {
          // Decay
          if (foamLevelRef.current > 0) {
             foamLevelRef.current -= 0.06;
             if (foamLevelRef.current < 0) foamLevelRef.current = 0;
          }
        }
      }

    } else {
      // === COFFEE PHYSICS (NEW) ===
      // Fast pour, no pressure, small constant crema
      
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = 0.85; // Faster than soda
        liquidLevelRef.current += fillSpeed;
        
        // No pressure buildup for coffee
        
        // Crema foam (constant small amount while pouring)
        const targetCrema = 5;
        if (foamLevelRef.current < targetCrema) {
          foamLevelRef.current += 0.5;
        }
      }
      else if (!isPouringRef.current && currentStatus === 'SETTLING') {
        // Coffee settles immediately to a thin layer
        if (foamLevelRef.current > 2) {
          foamLevelRef.current -= 0.1;
        }
      }
    }

    // 3. Overflow Check (Common)
    const totalHeight = liquidLevelRef.current + foamLevelRef.current;
    
    // SPILL THRESHOLD
    if (totalHeight > 105 && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        handleSpillInternal();
    }

    // Update React State
    setLiquidLevel(liquidLevelRef.current);
    setFoamLevel(foamLevelRef.current);

    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  const handleSpillInternal = () => {
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
    
    setStatus('POURING');
    statusRef.current = 'POURING';
    isPouringRef.current = true;
    
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
  };

  const stopPouring = () => {
    if (!isPouringRef.current) return;
    
    isPouringRef.current = false;
    setStatus('SETTLING');
    statusRef.current = 'SETTLING';

    // Different wait times based on drink type
    // Soda needs time for foam to rise. Coffee is quick.
    const waitTime = drinkType === 'SODA' ? 2200 : 800;

    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    settledTimerRef.current = setTimeout(() => {
      evaluateRound();
    }, waitTime);
  };

  const evaluateRound = () => {
    setStatus('EVALUATING');
    statusRef.current = 'EVALUATING';
    
    const finalLevel = liquidLevelRef.current + foamLevelRef.current;
    
    let roundScore = 0;
    let msg = "";

    if (finalLevel > 105) {
      msg = "溢出來了！";
      roundScore = 0;
    } else if (finalLevel > 100) {
      msg = "表面張力！"; // Surface tension save
      roundScore = 30; 
    } else if (finalLevel >= SCORING.perfectMin && finalLevel <= SCORING.perfectMax) {
      msg = "完美！";
      roundScore = 100;
    } else if (finalLevel >= SCORING.goodMin && finalLevel <= SCORING.goodMax) {
      msg = "不錯！";
      roundScore = 50;
    } else if (finalLevel > SCORING.goodMax) {
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
    // --- RESET ALL PHYSICS PARAMS ---
    liquidLevelRef.current = 0;
    foamLevelRef.current = 0;
    pressureRef.current = 0; // Crucial reset
    isPouringRef.current = false;
    
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    setLiquidLevel(0);
    setFoamLevel(0);
    setStatus('EMPTY');
    statusRef.current = 'EMPTY';
    setFeedback(null);
  };

  const startGame = (type: DrinkType) => {
    setDrinkType(type);
    setGameState('PLAYING');
    setScore(0);
    setCompletedCups(0);
    setTimeLeft(25);
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
    <div className={`min-h-screen flex flex-col items-center justify-center font-sans text-white relative overflow-hidden transition-colors duration-500 ${gameState === 'MENU' ? 'bg-neutral-900' : (drinkType === 'SODA' ? 'bg-teal-900' : 'bg-amber-950')}`}>
      
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-black"></div>

      {gameState === 'MENU' && (
        <div className="z-10 text-center bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl max-w-sm mx-4 w-full">
          <h1 className="text-5xl font-black mb-6 text-white drop-shadow-md">倒飲料大師</h1>
          
          <div className="grid gap-4">
            <button 
              onClick={() => startGame('SODA')}
              className="group relative flex items-center justify-center gap-3 w-full px-6 py-4 text-xl font-bold text-teal-900 transition-all duration-200 bg-teal-300 rounded-xl hover:bg-teal-200 hover:scale-105 active:scale-95"
            >
              <GlassWater size={24} /> 
              <div>
                <span className="block">激浪汽水</span>
                <span className="text-xs opacity-75 font-normal">困難：注意氣泡！</span>
              </div>
            </button>

            <button 
              onClick={() => startGame('COFFEE')}
              className="group relative flex items-center justify-center gap-3 w-full px-6 py-4 text-xl font-bold text-amber-900 transition-all duration-200 bg-amber-300 rounded-xl hover:bg-amber-200 hover:scale-105 active:scale-95"
            >
              <Coffee size={24} /> 
              <div>
                <span className="block">醇香咖啡</span>
                <span className="text-xs opacity-75 font-normal">普通：速度很快！</span>
              </div>
            </button>
          </div>

          <div className="mt-8 text-sm text-gray-400">
             規則：將飲料倒至虛線處
          </div>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="z-10 text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl animate-pop">
          <h2 className="text-4xl font-bold mb-4">時間到！</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/20 p-4 rounded-xl">
              <p className="text-sm opacity-70">總分</p>
              <p className="text-3xl font-bold text-yellow-400">{score}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl">
              <p className="text-sm opacity-70">完成杯數</p>
              <p className="text-3xl font-bold">{completedCups}</p>
            </div>
          </div>

          <button 
            onClick={() => setGameState('MENU')}
            className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold text-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <RefreshCcw className="mr-2" /> 返回菜單
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
               <span className={`font-bold text-xl ${timeLeft < 10 ? 'text-red-400 animate-pulse' : ''}`}>
                 {timeLeft}
               </span>
             </div>
          </div>

          {/* Game Area */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-start mt-4">
            
            {/* Dispenser Machine */}
            <Dispenser isPouring={status === 'POURING'} drinkType={drinkType} />

            {/* Glass Area */}
            <div className="relative mt-2">
              {/* Feedback Bubble */}
              {feedback && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-pop">
                  <div className={`px-4 py-2 rounded-full font-black border-4 shadow-lg text-xl transform rotate-[-5deg] bg-white ${drinkType === 'SODA' ? 'text-teal-800 border-teal-500' : 'text-amber-800 border-amber-600'}`}>
                    {feedback}
                  </div>
                </div>
              )}
              
              <Glass 
                liquidHeight={liquidLevel} 
                foamHeight={foamLevel} 
                isSpilled={status === 'SPILLED'} 
                drinkType={drinkType}
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
                w-24 h-24 rounded-full border-b-8 shadow-2xl flex items-center justify-center transition-all active:scale-95 active:border-b-0 active:translate-y-2
                ${status === 'EVALUATING' || status === 'SPILLED' 
                  ? 'bg-gray-500 border-gray-700 cursor-not-allowed' 
                  : (drinkType === 'SODA' ? 'bg-teal-500 border-teal-800 hover:bg-teal-400' : 'bg-amber-600 border-amber-900 hover:bg-amber-500')}
              `}
            >
              <span className="font-bold text-xl drop-shadow-md">倒</span>
            </button>
            <p className="text-center text-sm mt-4 opacity-50">
               {drinkType === 'SODA' ? '按住倒汽水（小心氣泡！）' : '按住倒咖啡（速度很快！）'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}