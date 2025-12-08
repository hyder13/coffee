import React from 'react';
import { DrinkType, TARGET_LINE } from '../types';

interface GlassProps {
  liquidHeight: number; // 0 to 100+
  foamHeight: number;   // Visual extra height for soda
  drinkType: DrinkType;
  isSpilled: boolean;
}

export const Glass: React.FC<GlassProps> = ({ liquidHeight, foamHeight, drinkType, isSpilled }) => {
  // Cap visual height for internal rendering so it doesn't look weird, 
  // but allow it to look full/overflowing
  const totalVisualHeight = Math.min(105, liquidHeight + foamHeight);
  
  // Colors
  const liquidColor = drinkType === 'COFFEE' ? 'bg-[#3e2723]' : 'bg-[#5d4037]';
  const foamColor = drinkType === 'COFFEE' ? 'bg-[#5d4037]' : 'bg-[#d7ccc8]';

  return (
    <div className="relative mx-auto w-32 h-48 sm:w-40 sm:h-60">
      {/* The Glass Container */}
      <div className={`relative w-full h-full border-b-4 border-l-4 border-r-4 border-white/80 rounded-b-xl overflow-hidden backdrop-blur-sm transition-colors duration-300 ${isSpilled ? 'border-red-500 bg-red-900/20' : 'bg-white/10'}`}>
        
        {/* Target Line - Drawn at 80% */}
        <div 
          className="absolute w-full border-t-2 border-dashed border-red-500 z-20 flex items-center justify-end pr-1"
          style={{ bottom: `${TARGET_LINE}%` }}
        >
          <span className="text-[12px] text-red-500 font-bold -mt-4 bg-white/80 px-1 rounded">目標線</span>
        </div>

        {/* The Liquid - REMOVED transition-all to allow smooth 60fps updates */}
        <div 
          className={`absolute bottom-0 left-0 w-full ${liquidColor}`}
          style={{ height: `${Math.max(0, liquidHeight)}%` }}
        >
          {/* Bubbles for Soda */}
          {drinkType === 'SODA' && liquidHeight > 5 && (
            <div className="absolute inset-0 w-full h-full overflow-hidden opacity-50">
              <div className="w-2 h-2 rounded-full bg-white/40 absolute bottom-2 left-2 animate-bounce" style={{ animationDuration: '2s' }}></div>
              <div className="w-1 h-1 rounded-full bg-white/40 absolute bottom-6 left-8 animate-bounce" style={{ animationDuration: '1.5s' }}></div>
              <div className="w-2 h-2 rounded-full bg-white/40 absolute bottom-4 left-1/2 animate-bounce" style={{ animationDuration: '2.2s' }}></div>
              <div className="w-1 h-1 rounded-full bg-white/40 absolute bottom-10 right-4 animate-bounce" style={{ animationDuration: '1.8s' }}></div>
            </div>
          )}
        </div>

        {/* The Foam (Sits on top of liquid) */}
        <div 
          className={`absolute left-0 w-full transition-all duration-100 ease-out ${foamColor} opacity-90`}
          style={{ 
            bottom: `${liquidHeight}%`,
            height: `${Math.max(0, foamHeight)}%` 
          }}
        >
          {/* Top of foam surface */}
          <div className="w-full h-2 bg-white/30 absolute top-0"></div>
        </div>

      </div>
      
      {/* Spill effect (outside glass) */}
      {isSpilled && (
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-48 h-4 bg-amber-900/50 blur-md rounded-full"></div>
      )}
    </div>
  );
};