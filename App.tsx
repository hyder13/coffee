import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Glass } from './components/Glass';
import { Dispenser } from './components/Dispenser';
import { GameState, FillStatus, DrinkType, TARGET_MIN, TARGET_MAX, GAME_CONFIG, ML_PER_PERCENT, SODA_APPEARANCE_CHANCE, GAME_DURATION } from './types';
import { Timer, RefreshCcw, Trophy, User, Droplets, Play, Clock, Lock, ShieldCheck } from 'lucide-react';
import { SoundManager } from './utils/sound';

export default function App() {
  // --- Auth State ---
  const [gameState, setGameState] = useState<GameState>('PASSCODE');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [isPasscodeError, setIsPasscodeError] = useState(false);

  // --- Game Config State ---
  const [nickname, setNickname] = useState('');
  const [tempNickname, setTempNickname] = useState(''); 

  // --- Game Play State ---
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [endTime, setEndTime] = useState(''); 
  
  const [completedCups, setCompletedCups] = useState(0);
  const [totalML, setTotalML] = useState(0);
  
  const [drinkType, setDrinkType] = useState<DrinkType>('SODA');
  const [targetLine, setTargetLine] = useState(75); 

  const [liquidLevel, setLiquidLevel] = useState(0); 
  const [foamLevel, setFoamLevel] = useState(0); 
  const [status, setStatus] = useState<FillStatus>('EMPTY');
  const [feedback, setFeedback] = useState<string | null>(null);

  const requestRef = useRef<number>(undefined);
  const isPouringRef = useRef(false);
  const liquidLevelRef = useRef(0);
  const foamLevelRef = useRef(0);
  const pressureRef = useRef(0); 
  
  const settledTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const statusRef = useRef<FillStatus>('EMPTY');
  const drinkTypeRef = useRef<DrinkType>('SODA');

  useEffect(() => {
    drinkTypeRef.current = drinkType;
  }, [drinkType]);

  // --- Passcode Verification ---
  const handleVerifyPasscode = () => {
    if (passcodeInput === '我愛慧邦') {
      setGameState('MENU');
      setIsPasscodeError(false);
    } else {
      setIsPasscodeError(true);
      setPasscodeInput('');
      setTimeout(() => setIsPasscodeError(false), 500);
    }
  };

  // --- Physics Engine ---
  const updatePhysics = useCallback(() => {
    const currentStatus = statusRef.current;
    const currentDrink = drinkTypeRef.current;
    const config = GAME_CONFIG[currentDrink];
    const flowNoise = Math.random() * 0.04; 

    if (currentDrink === 'SODA') {
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = config.FILL_SPEED + flowNoise; 
        liquidLevelRef.current += fillSpeed;
        const chaos = (Math.random() * 0.1) - 0.02; 
        pressureRef.current += (config.FOAM_RATE + chaos); 
        if (foamLevelRef.current < 8) {
            foamLevelRef.current += 0.5;
        }
      } 
      else if (!isPouringRef.current && currentStatus === 'SETTLING') {
        if (pressureRef.current > 0) {
          const riseSpeed = 0.4 + (Math.random() * 0.1); 
          const amountToTransfer = Math.min(pressureRef.current, riseSpeed);
          foamLevelRef.current += amountToTransfer;
          pressureRef.current -= amountToTransfer;
          if (pressureRef.current < 0.01) pressureRef.current = 0;
        } else if (foamLevelRef.current > 0) {
             foamLevelRef.current -= (0.06 + Math.random() * 0.02);
             if (foamLevelRef.current < 0) foamLevelRef.current = 0;
        }
      }
    } else {
      if (isPouringRef.current && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        const fillSpeed = config.FILL_SPEED + flowNoise; 
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

    const totalHeight = liquidLevelRef.current + foamLevelRef.current;
    if (totalHeight > 105 && currentStatus !== 'SPILLED' && currentStatus !== 'EVALUATING') {
        handleSpillInternal();
    }
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
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 1000);
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      if (!requestRef.current) requestRef.current = requestAnimationFrame(updatePhysics);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, updatePhysics]);

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
    const baseWait = GAME_CONFIG[drinkType].SETTLING_TIME;
    const randomWait = baseWait + (Math.random() * 400 - 200);
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    settledTimerRef.current = setTimeout(() => evaluateRound(), randomWait);
  };

  const evaluateRound = () => {
    setStatus('EVALUATING');
    statusRef.current = 'EVALUATING';
    const finalLevel = liquidLevelRef.current + foamLevelRef.current;
    const config = GAME_CONFIG[drinkType];
    const currentTolerance = config.TOLERANCE;
    const minSuccess = targetLine - currentTolerance;
    const maxSuccess = targetLine + currentTolerance;

    let msg = "";
    let isSuccess = false;
    let perfectMultiplier = 1;

    if (finalLevel > 105) {
      msg = "溢出！";
    } else if (finalLevel > maxSuccess) {
      msg = "超過了！";
    } else if (finalLevel < minSuccess) {
      msg = "太少了...";
    } else {
      const diff = Math.abs(finalLevel - targetLine);
      isSuccess = true;
      SoundManager.playWin();
      if (diff < 1) {
        msg = "完美控制！";
        perfectMultiplier = 1.2; 
      } else {
        msg = "成功！";
      }
    }

    if (!isSuccess) SoundManager.playPop();
    setFeedback(msg);

    if (isSuccess) {
      setCompletedCups(c => c + 1);
      let mlEarned = Math.floor(finalLevel * ML_PER_PERCENT * config.SCORE_MULTIPLIER * perfectMultiplier);
      if (perfectMultiplier > 1) {
        mlEarned += config.PERFECT_BONUS;
      }
      setTotalML(prev => prev + mlEarned);
    }
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(nextRound, 750);
  };

  const nextRound = () => {
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

    const newDrink = Math.random() < SODA_APPEARANCE_CHANCE ? 'SODA' : 'COFFEE';
    setDrinkType(newDrink);
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
    setEndTime('');
    setTimeLeft(GAME_DURATION); 
    nextRound();
  };

  const returnToMenu = () => {
    SoundManager.stopBGM();
    setGameState('MENU');
    setNickname('');
    setTempNickname('');
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('RESULT');
            const now = new Date();
            setEndTime(now.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
            SoundManager.stopPouring();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [gameState, timeLeft]);

  return (
    <div className={`h-[100dvh] w-full flex flex-col items-center font-sans text-white relative overflow-hidden transition-colors duration-500 ${gameState === 'MENU' || gameState === 'PASSCODE' ? 'bg-neutral-900 justify-center' : (drinkType === 'SODA' ? 'bg-teal-900' : 'bg-amber-950')}`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-black"></div>

      {/* Passcode Authorization Dialog */}
      {gameState === 'PASSCODE' && (
        <div className="z-[1000] fixed inset-0 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
           <div className={`w-full max-w-md bg-white/10 border border-white/20 p-8 rounded-[2.5rem] shadow-2xl transition-transform duration-300 ${isPasscodeError ? 'animate-shake' : 'animate-pop'}`}>
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform -rotate-3">
                 <Lock className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-black text-center mb-2 tracking-tight">身份驗證</h2>
              <p className="text-gray-400 text-center mb-8 text-sm">請輸入通關密語以繼續遊戲</p>
              
              <div className="space-y-4">
                 <div className="relative">
                    <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${passcodeInput ? 'text-green-400' : 'text-gray-500'}`} size={20} />
                    <input 
                       type="text" 
                       value={passcodeInput}
                       onChange={(e) => setPasscodeInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasscode()}
                       placeholder="通關密語..."
                       className={`w-full bg-black/40 border-2 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold transition-all outline-none text-center tracking-widest placeholder:tracking-normal placeholder:font-normal
                        ${isPasscodeError ? 'border-red-500 text-red-400' : 'border-white/10 focus:border-yellow-400/50 text-white'}
                       `}
                    />
                 </div>
                 <button 
                    onClick={handleVerifyPasscode}
                    className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-neutral-900 font-black text-xl rounded-2xl shadow-xl transition-all"
                 >
                    驗證進入
                 </button>
              </div>
              <p className="mt-8 text-[10px] text-center text-gray-500 uppercase tracking-[0.2em]">Authorized Access Only</p>
           </div>
        </div>
      )}

      {gameState === 'MENU' && (
        <div className="z-10 text-center bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl w-full max-w-[90%] mx-auto animate-pop">
          <h1 className="text-5xl font-black mb-2 text-white drop-shadow-md tracking-tight">倒飲料大師</h1>
          <p className="text-gray-400 mb-8">挑戰隨機目標！精準控制！</p>
          <div className="w-full mb-6">
            <label className="block text-left text-sm font-bold text-gray-400 mb-2 ml-1">請輸入挑戰者暱稱</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" value={tempNickname} onChange={(e) => setTempNickname(e.target.value)} placeholder="你的名字..." maxLength={10} className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-teal-400 transition-colors" />
            </div>
          </div>
          <button onClick={startGame} disabled={!tempNickname.trim()} className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${tempNickname.trim() ? 'bg-gradient-to-r from-teal-400 to-blue-500 text-white hover:scale-105 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}><Play size={24} fill="currentColor" /> 開始挑戰</button>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="z-10 text-center bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl animate-pop w-[90%] max-w-sm mt-auto mb-auto">
          <h2 className="text-5xl font-black mb-2">挑戰結束</h2>
          <div className="text-xl font-bold text-teal-300 mb-2 flex justify-center items-center gap-2"><User size={20} /> {nickname}</div>
          <div className="text-xs text-gray-400 mb-6 font-mono tracking-wider flex items-center justify-center gap-1 opacity-80"><Clock size={12} /> {endTime}</div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5"><p className="text-sm opacity-70 mb-1">完成杯數</p><p className="text-4xl font-bold text-yellow-400">{completedCups}</p></div>
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5"><p className="text-sm opacity-70 mb-1">總累積量</p><div className="flex items-baseline justify-center gap-1"><p className="text-3xl font-bold text-blue-300">{totalML}</p><span className="text-sm opacity-60">mL</span></div></div>
          </div>
          <button onClick={returnToMenu} className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black text-xl hover:bg-gray-200 transition-colors flex items-center justify-center shadow-lg active:scale-95"><RefreshCcw className="mr-3" /> 回到主選單</button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full h-full flex flex-col items-center relative z-10 pt-safe">
          <div className="w-full px-4 pt-4 flex justify-between items-center z-20 gap-2">
             <div className="flex gap-2">
               <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg min-w-[70px]"><Trophy size={18} className="text-yellow-400" /><span className="font-bold text-xl tabular-nums">{completedCups}</span></div>
               <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg min-w-[80px]"><Droplets size={18} className="text-blue-400" /><span className="font-bold text-xl tabular-nums">{totalML}<span className="text-xs opacity-60 ml-1">mL</span></span></div>
             </div>
             <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-lg"><Timer size={20} className={timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'} /><span className={`font-bold text-xl tabular-nums ${timeLeft < 10 ? 'text-red-400' : ''}`}>{timeLeft}s</span></div>
          </div>
          <div className="flex-1 w-full flex flex-col items-center justify-center relative">
            {feedback && (
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-[100] animate-pop pointer-events-none">
                  <div className={`px-6 py-3 rounded-2xl font-black border-4 shadow-2xl text-3xl transform -rotate-6 bg-white ${drinkType === 'SODA' ? 'text-teal-800 border-teal-500' : 'text-amber-800 border-amber-600'}`}>{feedback}</div>
                </div>
              )}
            <div className="w-full relative z-30 mb-[-20px]"><Dispenser isPouring={status === 'POURING'} drinkType={drinkType} /></div>
            <div className="relative pt-8 pb-4 z-10"><Glass liquidHeight={liquidLevel} foamHeight={foamLevel} isSpilled={status === 'SPILLED'} drinkType={drinkType} targetLine={targetLine} isPouring={status === 'POURING'} /></div>
          </div>
          <div className="w-full pb-8 pt-2 px-6 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent z-20">
            <button onMouseDown={startPouring} onMouseUp={stopPouring} onMouseLeave={stopPouring} onTouchStart={(e) => { e.preventDefault(); startPouring(); }} onTouchEnd={(e) => { e.preventDefault(); stopPouring(); }} disabled={status === 'EVALUATING' || status === 'SPILLED'} className={`group relative w-full max-w-[320px] h-24 rounded-3xl border-b-8 shadow-2xl flex items-center justify-center transition-all active:scale-95 active:border-b-0 active:translate-y-2 ${status === 'EVALUATING' || status === 'SPILLED' ? 'bg-gray-500 border-gray-700 cursor-not-allowed opacity-50' : (drinkType === 'SODA' ? 'bg-teal-500 border-teal-800 active:bg-teal-600' : 'bg-amber-600 border-amber-900 active:bg-amber-700')}`}><div className="absolute inset-2 border-2 border-white/20 rounded-2xl pointer-events-none"></div><span className="font-black text-3xl drop-shadow-md tracking-wider">{status === 'POURING' ? '倒水中...' : '按住倒水'}</span></button>
            <p className="text-center text-xs mt-3 opacity-70 font-bold tracking-wide text-white drop-shadow">目標：綠色區間 ({targetLine}%)</p>
          </div>
        </div>
      )}
    </div>
  );
}