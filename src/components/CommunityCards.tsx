import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import type { Card as CardType } from '../engine/types';

export interface CommunityCardsProps {
  cards: CardType[];
  winningCardIds?: string[];
  className?: string;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards = [],
  winningCardIds = [],
  className = '',
}) => {
  // Always show 5 slots for Texas Hold'em
  const totalSlots = 5;

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 p-2 rounded-2xl bg-[#121418]/60 border border-white/[0.05] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${className}`}>
      {Array.from({ length: totalSlots }).map((_, index) => {
        const card = cards[index] || null;
        const isRevealed = Boolean(card);
        const cardKey = card ? `${card.rank}-${card.suit}` : '';
        const isWinning = Boolean(
          card && (winningCardIds.includes(card.id || '') || winningCardIds.includes(cardKey))
        );

        return (
          <div key={`community-slot-${index}`} className="relative">
            {isRevealed ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Card
                  card={card}
                  faceUp={true}
                  size="md"
                  highlight={isWinning}
                />
              </motion.div>
            ) : (
              /* Minimalist Slot Placeholder */
              <div className="w-[54px] h-[76px] sm:w-[64px] sm:h-[90px] rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/30 flex items-center justify-center transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
