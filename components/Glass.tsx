import React from 'react';
import { DrinkType, TARGET_LINE } from '../types';

interface GlassProps {
  liquidHeight: number; // 0 to 100+
  foamHeight: number;   // Not really used for coffee anymore, but kept for interface compatibility or crema
  drinkType: DrinkType;
  isSpilled: boolean;
}

export const Glass: React.FC<GlassProps> = ({ liquidHeight, foamHeight, isSpilled }) => {
  // Cap visual height for internal rendering so it doesn't look weird, 
  // but allow it to look full/overflowing
  const totalVisualHeight = Math.min(105, liquidHeight + foamHeight);
  
  // Coffee Colors
  const liquidColor = 'bg-[#3e2723]';
  const foamColor = 'bg-[#5d4037]'; // Darker foam for crema

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

        {/* The Liquid */}
        <div 
          className={`absolute bottom-0 left-0 w-full ${liquidColor}`}
          style={{ height: `${Math.max(0, liquidHeight)}%` }}
        >
          {/* No bubbles for coffee */}
        </div>

        {/* The Foam (Crema) - Minimal for coffee */}
        <div 
          className={`absolute left-0 w-full transition-all duration-100 ease-out ${foamColor} opacity-90`}
          style={{ 
            bottom: `${liquidHeight}%`,
            height: `${Math.max(0, foamHeight)}%` 
          }}
        >
          {/* Top of foam surface */}
          <div className="w-full h-1 bg-white/10 absolute top-0"></div>
        </div>

      </div>
      
      {/* Spill effect (outside glass) */}
      {isSpilled && (
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-48 h-4 bg-amber-900/50 blur-md rounded-full"></div>
      )}
    </div>
  );
};