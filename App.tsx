import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Glass } from './components/Glass';
import { Dispenser } from './components/Dispenser';
import { GameState, FillStatus, SCORING } from './types';
import { Timer, RefreshCcw, Play, Trophy } from 'lucide-react';

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [completedCups, setCompletedCups] = useState(0);

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

  // --- Game Loop (Physics) ---
  const updatePhysics = useCallback(() => {
    const currentStatus = statusRef.current;

    // 1. Pouring Logic
    if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
      const fillSpeed = 0.55; // Controlled fill speed
      
      // Add liquid
      liquidLevelRef.current += fillSpeed;
      
      // Soda Mechanics: LINEAR Pressure Buildup
      // Rate: 0.22 per frame.
      // If filling to 80% (approx 145 frames) -> ~32 pressure units.
      // This means if you stop at 80%, foam will rise +32 units -> 112 (Spill).
      // You need to stop earlier (e.g., around 65-70%) to let foam rise to the target.
      pressureRef.current += 0.22; 
      
      // Visual base foam while pouring
      // Cap at a small amount so it looks like "agitation" but not full head yet
      if (foamLevelRef.current < 8) {
          foamLevelRef.current += 0.5;
      }
    } 
    // 2. Settling Logic (The Natural Surge)
    else if (!isPouringRef.current && currentStatus === 'SETTLING') {
      
      // Phase A: Pressure Release (The Rise)
      // We transfer pressure to foam height LINEARLY.
      // This creates a steady, suspenseful rise instead of an instant explosion.
      if (pressureRef.current > 0) {
        const riseSpeed = 0.4; // Foam rises at 0.4 units per frame (approx 24 units per second)
        
        const amountToTransfer = Math.min(pressureRef.current, riseSpeed);
        
        foamLevelRef.current += amountToTransfer;
        pressureRef.current -= amountToTransfer;
        
        // Clamp slight floating point errors
        if (pressureRef.current < 0.01) pressureRef.current = 0;
      } 
      // Phase B: Decay (The Settle)
      else {
        // Once pressure is depleted, foam slowly starts to pop.
        // Linear decay prevents it from disappearing too fast.
        if (foamLevelRef.current > 0) {
           foamLevelRef.current -= 0.06; // Slow, steady decay
           if (foamLevelRef.current < 0) foamLevelRef.current = 0;
        }
      }
    }

    // 3. Overflow Check
    const totalHeight = liquidLevelRef.current + foamLevelRef.current;
    
    // SPILL THRESHOLD: 105 (Surface Tension allowed)
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

    // Wait time: Needs to be long enough for the foam to rise fully and start decaying slightly.
    // If pressure is high (~30), rise takes ~1.2s (30/0.4/60).
    // Let's give it 2.2 seconds to be safe and let users see the result.
    const waitTime = 2200; 

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
    liquidLevelRef.current = 0;
    foamLevelRef.current = 0;
    pressureRef.current = 0; // Reset pressure
    isPouringRef.current = false;
    
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    setLiquidLevel(0);
    setFoamLevel(0);
    setStatus('EMPTY');
    statusRef.current = 'EMPTY';
    setFeedback(null);
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
    <div className="min-h-screen flex flex-col items-center justify-center font-sans text-white relative overflow-hidden bg-teal-900">
      
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-400 via-cyan-800 to-black"></div>

      {gameState === 'MENU' && (
        <div className="z-10 text-center bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl max-w-sm mx-4">
          <h1 className="text-5xl font-black mb-2 text-white drop-shadow-md">汽水大師</h1>
          <p className="mb-6 text-lg text-teal-200">不要倒太滿，氣泡會衝上來！</p>
          
          <div className="space-y-4 text-left bg-black/40 p-4 rounded-lg mb-8 text-sm border border-white/5">
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                <p className="text-gray-300">規則：倒汽水到虛線處。</p>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
                <p className="text-gray-300"><span className="text-teal-300 font-bold">警告：</span>停手後氣泡會上升，請提早收手！</p>
             </div>
          </div>

          <button 
            onClick={startGame}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-2xl font-bold text-teal-900 transition-all duration-200 bg-white font-pj rounded-full focus:outline-none hover:bg-gray-200 hover:scale-105 active:scale-95"
          >
            <Play className="mr-2" /> 開始挑戰
          </button>
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
            onClick={startGame}
            className="w-full py-4 bg-white text-teal-900 rounded-xl font-bold text-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
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
               <span className={`font-bold text-xl ${timeLeft < 10 ? 'text-red-400 animate-pulse' : ''}`}>
                 {timeLeft}
               </span>
             </div>
          </div>

          {/* Game Area */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-start mt-4">
            
            {/* Dispenser Machine */}
            <Dispenser isPouring={status === 'POURING'} />

            {/* Glass Area */}
            <div className="relative mt-2">
              {/* Feedback Bubble */}
              {feedback && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-pop">
                  <div className="px-4 py-2 rounded-full font-black border-4 shadow-lg text-xl transform rotate-[-5deg] bg-white text-teal-800 border-teal-500">
                    {feedback}
                  </div>
                </div>
              )}
              
              <Glass 
                liquidHeight={liquidLevel} 
                foamHeight={foamLevel} 
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
                w-24 h-24 rounded-full border-b-8 shadow-2xl flex items-center justify-center transition-all active:scale-95 active:border-b-0 active:translate-y-2
                ${status === 'EVALUATING' || status === 'SPILLED' 
                  ? 'bg-gray-500 border-gray-700 cursor-not-allowed' 
                  : 'bg-teal-500 border-teal-800 hover:bg-teal-400'}
              `}
            >
              <span className="font-bold text-xl drop-shadow-md">倒</span>
            </button>
            <p className="text-center text-sm mt-4 opacity-50">
               按住倒汽水（小心氣泡！）
            </p>
          </div>
        </div>
      )}
    </div>
  );
}