import React from 'react';
import { TARGET_LINE, DrinkType } from '../types';

interface GlassProps {
  liquidHeight: number; // 0 to 100+
  foamHeight: number;   // 0 to 100+
  isSpilled: boolean;
  drinkType: DrinkType;
}

export const Glass: React.FC<GlassProps> = ({ liquidHeight, foamHeight, isSpilled, drinkType }) => {
  const isSoda = drinkType === 'SODA';

  // Colors
  const liquidColor = isSoda ? 'bg-teal-500' : 'bg-amber-950';
  const foamColor = isSoda ? 'bg-white' : 'bg-amber-200'; // Coffee foam is crema (tan)

  return (
    <div className="relative mx-auto w-32 h-48 sm:w-40 sm:h-60">
      {/* The Glass Container */}
      <div className={`relative w-full h-full border-b-4 border-l-4 border-r-4 border-white/80 rounded-b-xl overflow-hidden backdrop-blur-sm transition-colors duration-300 ${isSpilled ? 'border-red-500 bg-red-900/20' : 'bg-white/10'}`}>
        
        {/* Target Line */}
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
          {/* Bubbles - Only for Soda */}
          {isSoda && liquidHeight > 5 && (
            <>
              <div className="bubble left-[15%] w-1 h-1" style={{ animationDelay: '0s', bottom: '10%' }}></div>
              <div className="bubble left-[35%] w-2 h-2" style={{ animationDelay: '0.3s', bottom: '30%' }}></div>
              <div className="bubble left-[55%] w-1.5 h-1.5" style={{ animationDelay: '0.6s', bottom: '5%' }}></div>
              <div className="bubble left-[75%] w-2 h-2" style={{ animationDelay: '0.1s', bottom: '20%' }}></div>
              <div className="bubble left-[85%] w-1 h-1" style={{ animationDelay: '0.4s', bottom: '40%' }}></div>
            </>
          )}
        </div>

        {/* The Foam */}
        <div 
          className={`absolute left-0 w-full ${foamColor} opacity-80`}
          style={{ 
            bottom: `${liquidHeight}%`,
            height: `${Math.max(0, foamHeight)}%` 
          }}
        >
          {/* Top surface highlight */}
          <div className="w-full h-1 bg-white/40 absolute top-0"></div>
        </div>

      </div>
      
      {/* Spill effect */}
      {isSpilled && (
        <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-48 h-4 blur-md rounded-full ${isSoda ? 'bg-teal-500/50' : 'bg-amber-900/50'}`}></div>
      )}
    </div>
  );
};