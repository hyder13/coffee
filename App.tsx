import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Glass } from './components/Glass';
import { Dispenser } from './components/Dispenser';
import { GameState, FillStatus, DrinkType, TARGET_MIN, TARGET_MAX, TOLERANCE, ML_PER_PERCENT } from './types';
import { Timer, RefreshCcw, Trophy, User, Droplets, Volume2, VolumeX, Play } from 'lucide-react';
import { SoundManager } from './utils/sound';

export default function App() {
  // --- Game Config State ---
  const [nickname, setNickname] = useState('');
  const [tempNickname, setTempNickname] = useState(''); // Input field state

  // --- Game Play State ---
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [timeLeft, setTimeLeft] = useState(30);
  
  // Scoreboard
  const [completedCups, setCompletedCups] = useState(0);
  const [totalML, setTotalML] = useState(0);
  
  // Round Specific
  const [drinkType, setDrinkType] = useState<DrinkType>('SODA');
  const [targetLine, setTargetLine] = useState(75); // Dynamic target
  const [isMuted, setIsMuted] = useState(false);

  // Physics Visualization State
  const [liquidLevel, setLiquidLevel] = useState(0); 
  const [foamLevel, setFoamLevel] = useState(0); 
  const [status, setStatus] = useState<FillStatus>('EMPTY');
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- Refs for Physics ---
  const requestRef = useRef<number>(undefined);
  const isPouringRef = useRef(false);
  const liquidLevelRef = useRef(0);
  const foamLevelRef = useRef(0);
  const pressureRef = useRef(0); 
  
  // Timers
  const settledTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Refs for Loop Access (Avoiding closure staleness)
  const statusRef = useRef<FillStatus>('EMPTY');
  const drinkTypeRef = useRef<DrinkType>('SODA');

  useEffect(() => {
    drinkTypeRef.current = drinkType;
  }, [drinkType]);

  const toggleMute = () => {
    const muted = SoundManager.toggleMute();
    setIsMuted(muted);
  };

  // --- Physics Engine ---
  const updatePhysics = useCallback(() => {
    const currentStatus = statusRef.current;
    const currentDrink = drinkTypeRef.current;

    if (currentDrink === 'SODA') {
      // === CHAOTIC SODA PHYSICS ===
      
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = 0.55; 
        liquidLevelRef.current += fillSpeed;
        
        // Pressure builds up, but with randomness (Chaos)
        const chaos = (Math.random() * 0.1) - 0.02; // Small fluctuation
        pressureRef.current += (0.22 + chaos); 
        
        // Base foam creation
        if (foamLevelRef.current < 8) {
            foamLevelRef.current += 0.5;
        }
      } 
      else if (!isPouringRef.current && currentStatus === 'SETTLING') {
        if (pressureRef.current > 0) {
          // Foam rising is unpredictable
          const riseSpeed = 0.4 + (Math.random() * 0.1); 
          const amountToTransfer = Math.min(pressureRef.current, riseSpeed);
          
          foamLevelRef.current += amountToTransfer;
          pressureRef.current -= amountToTransfer;
          
          if (pressureRef.current < 0.01) pressureRef.current = 0;
        } else {
          // Decay also flickers slightly
          if (foamLevelRef.current > 0) {
             foamLevelRef.current -= (0.06 + Math.random() * 0.02);
             if (foamLevelRef.current < 0) foamLevelRef.current = 0;
          }
        }
      }

    } else {
      // === COFFEE PHYSICS ===
      
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = 0.85; 
        liquidLevelRef.current += fillSpeed;
        
        const targetCrema = 5;
        if (foamLevelRef.current < targetCrema) {
          foamLevelRef.current += 0.5;
        }
      }
      else if (!isPouringRef.current && currentStatus === 'SETTLING') {
        if (foamLevelRef.current > 2) {
          foamLevelRef.current -= 0.1;
        }
      }
    }

    // Overflow Check
    const totalHeight = liquidLevelRef.current + foamLevelRef.current;
    
    // Hard Spill Limit (Machine overflow)
    if (totalHeight > 105 && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        handleSpillInternal();
    }

    // Update React
    setLiquidLevel(liquidLevelRef.current);
    setFoamLevel(foamLevelRef.current);

    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  const handleSpillInternal = () => {
    setStatus('SPILLED');
    statusRef.current = 'SPILLED';
    isPouringRef.current = false;
    SoundManager.stopPouring();
    setFeedback("溢出來了！");
    
    // No points, move to next
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 1500);
  };

  // --- Loop Management ---
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

  // --- Interaction ---

  const startPouring = () => {
    if (status === 'EVALUATING' || status === 'SPILLED' || gameState !== 'PLAYING') return;
    
    setStatus('POURING');
    statusRef.current = 'POURING';
    isPouringRef.current = true;
    SoundManager.startPouring(drinkType);
    
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
  };

  const stopPouring = () => {
    if (!isPouringRef.current) return;
    
    isPouringRef.current = false;
    setStatus('SETTLING');
    statusRef.current = 'SETTLING';
    SoundManager.stopPouring();

    // Randomize wait time slightly for realism
    const baseWait = drinkType === 'SODA' ? 2200 : 800;
    const randomWait = baseWait + (Math.random() * 400 - 200);

    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    settledTimerRef.current = setTimeout(() => {
      evaluateRound();
    }, randomWait);
  };

  const evaluateRound = () => {
    setStatus('EVALUATING');
    statusRef.current = 'EVALUATING';
    
    const finalLevel = liquidLevelRef.current + foamLevelRef.current;
    
    // Dynamic Scoring Logic
    const minSuccess = targetLine - TOLERANCE;
    const maxSuccess = targetLine + TOLERANCE;

    let msg = "";
    let isSuccess = false;

    if (finalLevel > 105) {
      msg = "溢出！";
    } else if (finalLevel > maxSuccess) {
      msg = "超過了！";
    } else if (finalLevel < minSuccess) {
      msg = "太少了...";
    } else {
      // In the Zone!
      const diff = Math.abs(finalLevel - targetLine);
      if (diff < 1) msg = "完美控制！";
      else msg = "成功！";
      
      isSuccess = true;
      SoundManager.playWin();
    }

    if (!isSuccess) {
      SoundManager.playPop(); // Standard pop for fail
    }

    setFeedback(msg);

    if (isSuccess) {
      setCompletedCups(c => c + 1);
      // Calculate ML: Total height percent * conversion factor
      const mlEarned = Math.round(finalLevel * ML_PER_PERCENT);
      setTotalML(prev => prev + mlEarned);
    }
    
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 1500);
  };

  const nextRound = () => {
    // Reset Physics
    liquidLevelRef.current = 0;
    foamLevelRef.current = 0;
    pressureRef.current = 0; 
    isPouringRef.current = false;
    SoundManager.stopPouring();
    
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    setLiquidLevel(0);
    setFoamLevel(0);
    setStatus('EMPTY');
    statusRef.current = 'EMPTY';
    setFeedback(null);

    // --- GAMEPLAY RANDOMIZATION ---
    // 1. Random Drink
    const newDrink = Math.random() > 0.5 ? 'SODA' : 'COFFEE';
    setDrinkType(newDrink);

    // 2. Random Target (60% - 85%)
    const newTarget = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
    setTargetLine(newTarget);
  };

  const startGame = () => {
    if (!tempNickname.trim()) return;
    
    setNickname(tempNickname.trim());
    SoundManager.init(); 
    SoundManager.playBGM();
    SoundManager.playPop();
    
    setGameState('PLAYING');
    setCompletedCups(0);
    setTotalML(0);
    setTimeLeft(30);
    nextRound();
  };

  const returnToMenu = () => {
    SoundManager.stopBGM();
    setGameState('MENU');
    setNickname('');
    setTempNickname('');
  };

  // --- Timer ---
  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('RESULT');
            SoundManager.stopPouring();
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
    <div className={`h-[100dvh] w-full flex flex-col items-center font-sans text-white relative overflow-hidden transition-colors duration-500 ${gameState === 'MENU' ? 'bg-neutral-900 justify-center' : (drinkType === 'SODA' ? 'bg-teal-900' : 'bg-amber-950')}`}>
      
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-black"></div>

      {/* Audio Control */}
      <div className="absolute top-safe-4 right-4 z-50 mt-2">
        <button 
          onClick={toggleMute}
          className="p-3 bg-black/30 rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {gameState === 'MENU' && (
        <div className="z-10 text-center bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl w-full max-w-[90%] mx-auto animate-pop">
          <h1 className="text-5xl font-black mb-2 text-white drop-shadow-md tracking-tight">倒飲料大師</h1>
          <p className="text-gray-400 mb-8">挑戰隨機目標！精準控制！</p>
          
          <div className="w-full mb-6">
            <label className="block text-left text-sm font-bold text-gray-400 mb-2 ml-1">請輸入挑戰者暱稱</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="你的名字..."
                maxLength={10}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-teal-400 transition-colors"
              />
            </div>
          </div>

          <button 
            onClick={startGame}
            disabled={!tempNickname.trim()}
            className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-2
              ${tempNickname.trim() 
                ? 'bg-gradient-to-r from-teal-400 to-blue-500 text-white hover:scale-105 active:scale-95' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            <Play size={24} fill="currentColor" /> 開始挑戰
          </button>

          <div className="mt-8 text-sm text-gray-400 font-medium bg-black/20 p-4 rounded-xl text-left">
             <p className="mb-1">🎮 <span className="text-white">玩法說明：</span></p>
             <ul className="list-disc pl-5 space-y-1 opacity-80 text-xs">
               <li>每回合隨機出現 <span className="text-teal-300">汽水</span> 或 <span className="text-amber-300">咖啡</span></li>
               <li>目標線會<span className="text-green-300">動態改變</span>，請看準綠色區間</li>
               <li>只有停在綠色區間內才算成功並累積水量</li>
               <li>汽水氣泡不穩定，請小心控制！</li>
             </ul>
          </div>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="z-10 text-center bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl animate-pop w-[90%] max-w-sm mt-auto mb-auto">
          <h2 className="text-5xl font-black mb-2">挑戰結束</h2>
          <div className="text-xl font-bold text-teal-300 mb-6 flex justify-center items-center gap-2">
            <User size={20} /> {nickname}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
              <p className="text-sm opacity-70 mb-1">完成杯數</p>
              <p className="text-4xl font-bold text-yellow-400">{completedCups}</p>
            </div>
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
              <p className="text-sm opacity-70 mb-1">總累積量</p>
              <div className="flex items-baseline justify-center gap-1">
                <p className="text-3xl font-bold text-blue-300">{totalML}</p>
                <span className="text-sm opacity-60">mL</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl mb-6 text-sm text-gray-300">
            {completedCups > 5 ? '太強了！真的是倒水大師！🏆' : completedCups > 2 ? '表現不錯，繼續保持！👏' : '再接再厲，手別抖！💪'}
          </div>

          <button 
            onClick={returnToMenu}
            className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black text-xl hover:bg-gray-200 transition-colors flex items-center justify-center shadow-lg active:scale-95"
          >
            <RefreshCcw className="mr-3" /> 回到主選單
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full h-full flex flex-col items-center relative z-10 pt-safe">
          
          {/* Header UI (Stats) */}
          <div className="w-full px-4 pt-4 flex justify-between items-center z-20 gap-2">
             <div className="flex gap-2">
               <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg min-w-[70px]">
                 <Trophy size={18} className="text-yellow-400" />
                 <span className="font-bold text-xl tabular-nums">{completedCups}</span>
               </div>
               <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg min-w-[80px]">
                 <Droplets size={18} className="text-blue-400" />
                 <span className="font-bold text-xl tabular-nums">{totalML}<span className="text-xs opacity-60 ml-1">mL</span></span>
               </div>
             </div>
             
             <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg">
               <Timer size={20} className={timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'} />
               <span className={`font-bold text-xl tabular-nums ${timeLeft < 10 ? 'text-red-400' : ''}`}>
                 {timeLeft}s
               </span>
             </div>
          </div>

          {/* Game Stage Area */}
          <div className="flex-1 w-full flex flex-col items-center justify-center relative">
            
            {/* Dispenser */}
            <div className="w-full relative z-10 mb-[-20px]">
              <Dispenser isPouring={status === 'POURING'} drinkType={drinkType} />
            </div>

            {/* Glass Container */}
            <div className="relative pt-8 pb-4">
              {/* Feedback Bubble */}
              {feedback && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-pop">
                  <div className={`px-5 py-2 rounded-2xl font-black border-4 shadow-xl text-2xl transform rotate-[-3deg] bg-white ${drinkType === 'SODA' ? 'text-teal-800 border-teal-500' : 'text-amber-800 border-amber-600'}`}>
                    {feedback}
                  </div>
                </div>
              )}
              
              <Glass 
                liquidHeight={liquidLevel} 
                foamHeight={foamLevel} 
                isSpilled={status === 'SPILLED'} 
                drinkType={drinkType}
                targetLine={targetLine}
              />
            </div>
          </div>

          {/* Controls Area */}
          <div className="w-full pb-8 pt-2 px-6 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent">
            <button
              onMouseDown={startPouring}
              onMouseUp={stopPouring}
              onMouseLeave={stopPouring}
              onTouchStart={(e) => { e.preventDefault(); startPouring(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopPouring(); }}
              disabled={status === 'EVALUATING' || status === 'SPILLED'}
              className={`
                group relative w-full max-w-[320px] h-24 rounded-3xl border-b-8 shadow-2xl flex items-center justify-center transition-all 
                active:scale-95 active:border-b-0 active:translate-y-2
                ${status === 'EVALUATING' || status === 'SPILLED' 
                  ? 'bg-gray-500 border-gray-700 cursor-not-allowed opacity-50' 
                  : (drinkType === 'SODA' ? 'bg-teal-500 border-teal-800 active:bg-teal-600' : 'bg-amber-600 border-amber-900 active:bg-amber-700')}
              `}
            >
              <div className="absolute inset-2 border-2 border-white/20 rounded-2xl pointer-events-none"></div>
              <span className="font-black text-3xl drop-shadow-md tracking-wider">
                {status === 'POURING' ? '倒水中...' : '按住倒水'}
              </span>
            </button>
            
            <p className="text-center text-xs mt-3 opacity-70 font-bold tracking-wide text-white drop-shadow">
               目標：綠色區間 ({targetLine}%)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}