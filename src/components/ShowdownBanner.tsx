import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WinnerResult, Player } from '../engine/types.ts';
import { Card } from './Card.tsx';

export interface ShowdownBannerProps {
  winners?: WinnerResult[];
  players: (Player | null)[];
  heroPlayerId?: string;
  potAmount: number;
  durationSeconds?: number;
  onDealNextHand?: () => void;
  className?: string;
}

export const ShowdownBanner: React.FC<ShowdownBannerProps> = ({
  winners = [],
  players = [],
  heroPlayerId = 'hero',
  potAmount,
  durationSeconds = 8,
  onDealNextHand,
  className = '',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(durationSeconds);

  useEffect(() => {
    setSecondsRemaining(durationSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [durationSeconds]);

  if (!winners || winners.length === 0) return null;

  // Primary winner (or multiple if split pot)
  const primaryWinner = winners[0];
  const winnerPlayer = players.find((p) => p && p.id === primaryWinner.playerId);
  const isHeroWinner = primaryWinner.playerId === heroPlayerId || (winnerPlayer && winnerPlayer.seatIndex === 0);
  const hand = primaryWinner.hand;
  const bestCards = hand?.bestCards || [];
  const rankName = hand?.rankName || 'Winning Hand';

  // Format winner name
  const winnerName = isHeroWinner
    ? `You (${winnerPlayer?.name || 'Hero'})`
    : winnerPlayer?.name || 'Winner';
  const totalAmountWon = winners.reduce((sum, w) => sum + w.amount, 0) || potAmount;

  const timerRatio = Math.max(0, Math.min(1, secondsRemaining / durationSeconds));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-lg mx-auto bg-[#181B20]/95 border-2 border-orange-500/60 rounded-3xl p-5 shadow-[0_0_50px_rgba(255,107,0,0.35)] backdrop-blur-2xl text-zinc-100 flex flex-col items-center gap-3.5 select-none relative overflow-hidden ${className}`}
      >
        {/* Top Progress Line for Showdown Duration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_12px_#FF6B00]"
            initial={{ width: '100%' }}
            animate={{ width: `${timerRatio * 100}%` }}
            transition={{ duration: 0.25, ease: 'linear' }}
          />
        </div>

        {/* WINNER HEADER BADGE */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="font-mono font-bold text-xs uppercase tracking-widest text-orange-400">
            {winners.length > 1 ? 'SPLIT POT SHOWDOWN' : 'SHOWDOWN RESULT'}
          </span>
        </div>

        {/* WINNER NAME & POT AMOUNT */}
        <div className="flex flex-col items-center text-center">
          <h3 className="font-sans font-bold text-xl sm:text-2xl text-white flex items-center gap-2">
            <span>{winnerName}</span>
            <span className="text-sm px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 font-mono">
              WON
            </span>
          </h3>

          <div className="mt-1 flex items-center gap-1.5 font-mono">
            <span className="text-zinc-400 text-xs">Total Awarded:</span>
            <span className="text-2xl font-bold text-orange-400 drop-shadow-[0_0_12px_rgba(255,107,0,0.5)]">
              +{totalAmountWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-orange-400 font-bold">UCT</span>
          </div>
        </div>

        {/* MULTI-POT WINNER BREAKDOWN (MAIN POT & SIDE POTS) */}
        {winners.length > 1 && (
          <div className="w-full flex flex-col gap-1.5 p-2.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08] text-xs font-mono">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              Pot Distribution Breakdown:
            </span>
            {winners.map((w, idx) => {
              const pPlayer = players.find((p) => p && p.id === w.playerId);
              const pName = w.playerId === heroPlayerId ? 'You' : (pPlayer?.name || `Player ${idx + 1}`);
              const label = w.potType === 'side' ? `Side Pot ${w.potIndex ?? 1}` : 'Main Pot';
              return (
                <div key={`winner-pot-${idx}`} className="flex justify-between items-center px-2 py-1 rounded bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-300 font-medium">
                    <span className="text-orange-400 font-bold">{label}:</span> {pName}
                  </span>
                  <span className="text-orange-400 font-bold">
                    +{w.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} UCT
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* PROMINENT WINNING HAND RANK DISPLAY */}
        <div className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900/90 border border-orange-500/40 flex flex-col items-center justify-center gap-1 shadow-inner">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Winning Combination
          </span>
          <span className="poker-vintage-gold text-base sm:text-xl font-bold tracking-[0.14em] text-center drop-shadow-[0_0_12px_rgba(255,192,67,0.5)]">
            {rankName}
          </span>
        </div>

        {/* 5 WINNING CARDS PREVIEW */}
        {bestCards.length > 0 && (
          <div className="flex items-center gap-1.5 py-1">
            {bestCards.map((card, idx) => (
              <motion.div
                key={`win-card-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.06 }}
              >
                <Card
                  card={card}
                  faceUp={true}
                  size="xs"
                  highlight={true}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* FOOTER: Countdown & Manual Skip / Deal Now button */}
        <div className="w-full pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Next hand in {secondsRemaining}s</span>
          </span>

          {onDealNextHand && (
            <button
              onClick={onDealNextHand}
              className="py-1 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-sans font-semibold text-xs transition-all duration-150 cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-1"
            >
              <span>Deal Now</span>
              <span>➔</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
