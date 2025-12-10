import React from 'react';
import { DrinkType } from '../types';

interface DispenserProps {
  isPouring: boolean;
  drinkType: DrinkType;
}

export const Dispenser: React.FC<DispenserProps> = ({ isPouring, drinkType }) => {
  const isSoda = drinkType === 'SODA';

  // Styling based on drink type
  const brandColor = isSoda ? 'bg-teal-600' : 'bg-amber-900';
  const logoText = isSoda ? '激浪汽水' : '醇香咖啡';
  // Use slightly lighter colors for the stream to show flow
  const liquidStreamColor = isSoda ? 'bg-teal-400' : 'bg-amber-800'; 
  const textColor = isSoda ? 'text-teal-800' : 'text-amber-100';

  return (
    <div className="w-full flex flex-col items-center relative z-10">
      {/* Main Machine Body */}
      <div className="w-full h-32 bg-neutral-800 border-b-8 border-neutral-900 relative shadow-xl overflow-hidden">
        {/* Drink Tank Window */}
        <div className="absolute top-4 left-4 right-4 h-16 bg-black/50 rounded-lg overflow-hidden border-2 border-neutral-600">
           {/* Liquid inside machine */}
           <div className={`w-full h-full ${brandColor} opacity-80 flex items-center justify-center`}>
              <div className="wave w-[200%] h-full absolute opacity-30 bg-white translate-x-1/2 skew-x-12"></div>
           </div>
        </div>

        {/* Nozzle Area */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 bg-gray-300 rounded-t-lg shadow-inner flex items-center justify-center">
            <span className={`text-[12px] font-bold ${textColor}`}>
              {logoText}
            </span>
        </div>
      </div>

      {/* The Nozzle Tip */}
      <div className="w-4 h-4 bg-gray-400 rounded-b-sm shadow-md relative flex justify-center">
          {/* Pouring Stream */}
          {/* We keep the container always present but animate the inner div height for smoother physics feel */}
          <div className="absolute top-full w-2 overflow-visible flex justify-center">
             <div 
                className={`
                   ${liquidStreamColor} 
                   transition-all duration-200 ease-in-out
                   rounded-b-full
                   ${isPouring ? 'h-52 opacity-90' : 'h-0 opacity-0'}
                `}
                style={{
                   width: isPouring ? '10px' : '4px', // Slight width expansion when pouring
                   // Striped gradient to simulate fast flowing liquid
                   backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)`,
                   backgroundSize: '20px 20px',
                   animation: isPouring ? 'flow-stripe 0.4s linear infinite' : 'none',
                   boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
             >
                {/* Optional: Add a subtle 'core' to the stream for depth */}
                <div className="w-full h-full bg-white/10 absolute top-0 left-0 animate-pulse"></div>
             </div>
          </div>
      </div>
    </div>
  );
};