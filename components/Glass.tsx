import React from 'react';
import { DrinkType, SODA_TOLERANCE, COFFEE_TOLERANCE } from '../types';

interface GlassProps {
  liquidHeight: number; // 0 to 100+
  foamHeight: number;   // 0 to 100+
  isSpilled: boolean;
  drinkType: DrinkType;
  targetLine: number;   // Dynamic target percentage
  isPouring?: boolean;  // Added for stream rendering
}

export const Glass: React.FC<GlassProps> = ({ liquidHeight, foamHeight, isSpilled, drinkType, targetLine, isPouring }) => {
  const isSoda = drinkType === 'SODA';

  // Colors
  const liquidColor = isSoda ? 'bg-teal-500' : 'bg-amber-950';
  const foamColor = isSoda ? 'bg-white' : 'bg-amber-200'; // Coffee foam is crema (tan)
  
  // Stream color (lighter than liquid to show flow)
  const liquidStreamColor = isSoda ? 'bg-teal-400' : 'bg-amber-800'; 

  // Determine tolerance based on drink type
  const tolerance = isSoda ? SODA_TOLERANCE : COFFEE_TOLERANCE;

  // Calculate Success Zone
  const zoneBottom = targetLine - tolerance;
  const zoneHeight = tolerance * 2;

  return (
    <div className="relative mx-auto w-32 h-48 sm:w-40 sm:h-60">
      {/* The Glass Container - overflow-hidden is key to cutting off the stream at the bottom */}
      <div className={`relative w-full h-full border-b-4 border-l-4 border-r-4 border-white/80 rounded-b-xl overflow-hidden backdrop-blur-sm transition-colors duration-300 ${isSpilled ? 'border-red-500 bg-red-900/20' : 'bg-white/10'}`}>
        
        {/* 
          Layer 0: The Stream 
          Rendered inside the glass but positioned absolutely to look like it comes from the nozzle.
          Z-Index 0: So it sits BEHIND the rising liquid (Layer 2).
        */}
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-full h-[120%] flex justify-center z-0 pointer-events-none">
           <div 
              className={`
                 ${liquidStreamColor} 
                 transition-all duration-200 ease-in-out
                 rounded-b-full
                 ${isPouring ? 'opacity-90' : 'opacity-0'}
              `}
              style={{
                 width: isPouring ? '10px' : '4px',
                 height: '100%', // Fills the container (which is taller than glass to connect to nozzle)
                 backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)`,
                 backgroundSize: '20px 20px',
                 animation: isPouring ? 'flow-stripe 0.4s linear infinite' : 'none',
              }}
           ></div>
        </div>

        {/* Success Zone (The Green Area) */}
        <div 
          className="absolute w-full bg-green-500/20 border-t border-b border-green-400/50 z-20 transition-all duration-500 pointer-events-none"
          style={{ 
            bottom: `${zoneBottom}%`, 
            height: `${zoneHeight}%` 
          }}
        >
          {/* Target Line Indicator */}
          <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-green-300 opacity-70 transform -translate-y-1/2"></div>
          
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
             <span className="text-[10px] text-green-300 font-bold bg-black/40 px-1 rounded backdrop-blur-md">
               {targetLine}%
             </span>
          </div>
        </div>

        {/* 
          Layer 2: The Liquid 
          Z-Index 10: Sits ABOVE the Stream, creating the illusion of stream entering the liquid.
        */}
        <div 
          className={`absolute bottom-0 left-0 w-full ${liquidColor} z-10`}
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

        {/* The Foam - Also Z-Index 10 to cover stream */}
        <div 
          className={`absolute left-0 w-full ${foamColor} opacity-80 z-10`}
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