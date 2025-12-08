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
  const liquidStreamColor = isSoda ? 'bg-teal-400' : 'bg-amber-950';
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
      <div className="w-4 h-4 bg-gray-400 rounded-b-sm shadow-md relative">
          {/* Pouring Stream */}
          {isPouring && (
             <div className={`absolute top-full left-1/2 -translate-x-1/2 w-2 h-[400px] ${liquidStreamColor} rounded-full`}></div>
          )}
      </div>
    </div>
  );
};