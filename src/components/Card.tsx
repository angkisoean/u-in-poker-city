import React from 'react';
import { motion } from 'framer-motion';
import { type Card as CardType, Suit } from '../engine/types.ts';
import { formatRankDisplay } from '../engine/deck.ts';

export interface CardProps {
  card: CardType | null;
  faceUp?: boolean;
  isDealing?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  highlight?: boolean;
}

export const getSuitSymbol = (suit: Suit | string): string => {
  const s = String(suit).toUpperCase();
  switch (s) {
    case 'HEARTS':
    case 'H':
      return '♥';
    case 'DIAMONDS':
    case 'D':
      return '♦';
    case 'CLUBS':
    case 'C':
      return '♣';
    case 'SPADES':
    case 'S':
      return '♠';
    default:
      return '♠';
  }
};

export const isRedSuit = (suit: Suit | string): boolean => {
  const s = String(suit).toUpperCase();
  return s === 'HEARTS' || s === 'H' || s === 'DIAMONDS' || s === 'D';
};

export const Card: React.FC<CardProps> = ({
  card,
  faceUp = false,
  isDealing = false,
  className = '',
  size = 'md',
  delay = 0,
  highlight = false,
}) => {
  const isCardFaceUp = Boolean(faceUp && card);
  const suit = card?.suit || 'SPADES';
  const displayRank = formatRankDisplay(card?.rank || 'A');
  const isRed = isRedSuit(suit);
  const symbol = getSuitSymbol(suit);

  // Modern aspect ratio ~ 1 : 1.4 (responsive)
  const sizeClasses = {
    xs: 'w-[36px] h-[50px] sm:w-[40px] sm:h-[56px] rounded-lg text-[10px] sm:text-[11px]',
    sm: 'w-[46px] h-[64px] sm:w-[52px] sm:h-[72px] rounded-xl text-[11px] sm:text-xs',
    md: 'w-[54px] h-[76px] sm:w-[64px] sm:h-[90px] rounded-xl text-xs sm:text-sm',
    lg: 'w-[72px] h-[100px] sm:w-[80px] sm:h-[112px] rounded-2xl text-sm sm:text-base',
  }[size];

  const suitColorClass = isRed ? 'text-rose-500' : 'text-zinc-900';

  return (
    <motion.div
      initial={isDealing ? { y: -20, opacity: 0, scale: 0.9 } : false}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative select-none ${sizeClasses} ${className}`}
    >
      <div
        className={`w-full h-full rounded-[inherit] overflow-hidden transition-all duration-200 ${
          highlight
            ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(255,107,0,0.4)]'
            : 'shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
        }`}
      >
        {isCardFaceUp ? (
          /* ================= FACE UP: VINTAGE LUXURY CASINO CARD ================= */
          <div className="w-full h-full bg-[#FAF6EE] border border-[#DDD3BF] p-1 sm:p-1.5 flex flex-col justify-between relative group hover:bg-white transition-colors duration-150 shadow-inner">
            {/* Top-Left Corner: Rank & Suit */}
            <div className={`flex flex-col items-start leading-none font-display font-extrabold ${suitColorClass}`}>
              <span className="tracking-tighter text-xs sm:text-sm font-black">{displayRank}</span>
              <span className="text-[10px] sm:text-xs -mt-0.5">{symbol}</span>
            </div>

            {/* Center Big Suit Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className={`text-2xl sm:text-3xl select-none font-serif ${suitColorClass} opacity-85 transition-transform duration-200 group-hover:scale-110 drop-shadow-sm`}
              >
                {symbol}
              </span>
            </div>

            {/* Bottom-Right Inverted Corner */}
            <div className={`flex flex-col items-end leading-none font-display font-extrabold rotate-180 ${suitColorClass}`}>
              <span className="tracking-tighter text-xs sm:text-sm font-black">{displayRank}</span>
              <span className="text-[10px] sm:text-xs -mt-0.5">{symbol}</span>
            </div>
          </div>
        ) : (
          /* ================= FACE DOWN: AUTHENTIC RED & GOLD CASINO DIAMOND LATTICE ================= */
          <div className="w-full h-full bg-[#FAF6EE] border border-[#DDD3BF] p-1 relative flex flex-col items-center justify-center overflow-hidden shadow-inner">
            {/* Diamond Lattice Pattern Field */}
            <div className="w-full h-full rounded-[inherit] border border-[#520C10] poker-red-lattice flex items-center justify-center relative p-1 shadow-sm">
              {/* Inner Fine Border */}
              <div className="absolute inset-0.5 rounded-[inherit] border border-amber-200/40 pointer-events-none" />

              {/* Center Iconic Unicity 'U' Medallion */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#FAF6EE] border border-amber-300/80 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] z-10">
                <span className="font-mono font-black text-[10px] sm:text-xs text-[#D35400] leading-none">
                  U
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
