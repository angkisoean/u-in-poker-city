import React from 'react';
import type { Player } from '../engine/types.ts';
import { Card } from './Card.tsx';

export interface PlayerSeatProps {
  player: Player | null;
  seatIndex: number;
  isHero?: boolean;
  isCurrentTurn?: boolean;
  onSeatClick?: (seatIndex: number) => void;
  className?: string;
  timeRemaining?: number;
  isWinner?: boolean;
  winnerHand?: string;
  isShowdown?: boolean;
  currentHandRank?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  seatIndex,
  isHero = false,
  isCurrentTurn = false,
  onSeatClick,
  className = '',
  timeRemaining,
  isWinner = false,
  winnerHand,
  isShowdown = false,
  currentHandRank,
}) => {
  // Empty seat placeholder
  if (!player) {
    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`}>
        <button
          onClick={() => onSeatClick && onSeatClick(seatIndex)}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border border-dashed border-zinc-700/60 hover:border-orange-500/60 bg-zinc-900/40 hover:bg-zinc-800/60 flex flex-col items-center justify-center text-zinc-500 hover:text-orange-400 transition-all duration-150 cursor-pointer group shadow-inner"
          title={`Take Seat ${seatIndex + 1}`}
        >
          <span className="text-base group-hover:scale-110 transition-transform duration-150 font-mono">+</span>
          <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">Sit</span>
        </button>
      </div>
    );
  }

  const isTurn = Boolean(isCurrentTurn || player.isTurn);
  const isFolded = Boolean(player.isFolded || player.hasFolded);
  const isAllIn = Boolean(player.isAllIn);
  const isWaiting = Boolean(player.isWaitingForNextHand);

  // Cards to display: prioritize actively dealt holeCards
  const holeCards = player.holeCards && player.holeCards.length > 0 ? player.holeCards : player.cards || [];

  // Floating Status Text
  let statusBadge: { text: string; color: string } | null = null;
  if (isWinner) {
    statusBadge = {
      text: winnerHand ? `👑 ${winnerHand}` : '👑 WINNER',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold',
    };
  } else if (isWaiting) {
    statusBadge = {
      text: '⏳ WAITING FOR HAND',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold',
    };
  } else if (isFolded) {
    statusBadge = {
      text: 'FOLDED',
      color: 'bg-zinc-900/90 text-zinc-400 border-zinc-700/60',
    };
  } else if (isAllIn) {
    statusBadge = {
      text: '⚡ ALL-IN',
      color: 'bg-red-500/20 text-red-400 border-red-500/40 font-bold',
    };
  } else if (isTurn) {
    statusBadge = {
      text: timeRemaining !== undefined ? `THINKING (${timeRemaining}s)` : 'THINKING',
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-semibold animate-pulse',
    };
  }

  // =========================================================================
  // HERO SEAT VIEW: Prominent, clear hole cards with zero overlap
  // =========================================================================
  if (isHero) {
    return (
      <div
        className={`relative flex flex-col items-center select-none transition-all duration-200 ${
          isFolded ? 'opacity-40 grayscale' : 'opacity-100'
        } ${className}`}
      >
        {/* HERO HOLE CARDS: Placed cleanly above the Hero Pod with dedicated vertical clearance */}
        {holeCards.length > 0 && (
          <div className="flex items-center justify-center mb-2 relative z-20">
            {/* Current Evaluated Hand Rank Pill (Floats cleanly ABOVE the cards to avoid any collision) */}
            {currentHandRank && !isFolded && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap pointer-events-none">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-tight bg-zinc-950/95 text-orange-400 border border-orange-500/40 shadow-lg backdrop-blur-md font-semibold">
                  {currentHandRank}
                </span>
              </div>
            )}

            <div
              style={{ transform: 'rotate(-3deg) translateY(2px)' }}
              className="transition-transform duration-200 hover:translate-y-[-4px] cursor-pointer"
            >
              <Card
                card={holeCards[0]}
                faceUp={true}
                size="sm"
                highlight={isWinner}
              />
            </div>
            <div
              style={{ transform: 'rotate(3deg) translateY(2px)', marginLeft: '-12px' }}
              className="transition-transform duration-200 hover:translate-y-[-4px] cursor-pointer"
            >
              <Card
                card={holeCards[1] || null}
                faceUp={true}
                size="sm"
                highlight={isWinner}
              />
            </div>
          </div>
        )}

        {/* HERO STATUS BADGE (Folded / Thinking / Winner) */}
        {statusBadge && (
          <div className="mb-1.5 z-30 whitespace-nowrap pointer-events-none">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-tight shadow-md backdrop-blur-md border ${statusBadge.color}`}
            >
              {statusBadge.text}
            </span>
          </div>
        )}

        {/* HERO GLASS CAPSULE POD */}
        <div
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#16191F]/95 border backdrop-blur-xl transition-all duration-200 shadow-xl ${
            isWinner
              ? 'border-2 border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_25px_rgba(255,184,0,0.35)]'
              : isTurn
              ? 'border-2 border-orange-500 ring-4 ring-orange-500/25 shadow-[0_0_20px_rgba(255,107,0,0.25)] animate-pulse'
              : 'border-white/[0.12] hover:border-white/[0.2]'
          }`}
        >
          {/* Avatar & Dealer Button */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 shadow-inner overflow-hidden">
              {player.avatar && typeof player.avatar === 'string' && player.avatar.length > 4 ? (
                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span>{player.avatar || 'YOU'}</span>
              )}
            </div>

            {/* Dealer 'D' */}
            {player.isDealer && (
              <div
                className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-orange-500 text-black font-mono font-bold text-[9px] flex items-center justify-center shadow-md border border-white/40 z-20"
                title="Dealer"
              >
                D
              </div>
            )}

            {/* Small Blind 'SB' */}
            {!player.isDealer && player.isSmallBlind && (
              <div
                className="absolute -top-1.5 -left-1.5 px-1 rounded bg-zinc-800 text-orange-400 border border-orange-500/40 font-mono font-bold text-[8px] z-20"
                title="Small Blind"
              >
                SB
              </div>
            )}

            {/* Big Blind 'BB' */}
            {!player.isDealer && player.isBigBlind && (
              <div
                className="absolute -top-1.5 -left-1.5 px-1 rounded bg-zinc-800 text-orange-400 border border-orange-500/40 font-mono font-bold text-[8px] z-20"
                title="Big Blind"
              >
                BB
              </div>
            )}
          </div>

          {/* Name & Chips */}
          <div className="flex flex-col min-w-[76px]">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-xs text-zinc-100 tracking-tight truncate" title={player.name}>
                {player.name}
              </span>
              <span className="text-[8px] font-mono px-1 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                YOU
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xs font-bold text-zinc-200">
                {(player.balance ?? player.chips).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-mono text-orange-400 font-bold">UCT</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPPONENT SEAT VIEW: Compact self-contained capsule (Cards neatly integrated)
  // =========================================================================
  return (
    <div
      className={`relative flex flex-col items-center select-none transition-all duration-200 ${
        isFolded ? 'opacity-40 grayscale' : 'opacity-100'
      } ${className}`}
    >
      {/* OPPONENT STATUS BADGE (Folded / Thinking / Winner) */}
      {statusBadge && (
        <div className="mb-1.5 z-30 whitespace-nowrap pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-tight shadow-md backdrop-blur-md border ${statusBadge.color}`}
          >
            {statusBadge.text}
          </span>
        </div>
      )}

      {/* COMPACT OPPONENT CAPSULE POD */}
      <div
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#16191F]/90 border backdrop-blur-xl transition-all duration-200 shadow-lg ${
          isWinner
            ? 'border-2 border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_25px_rgba(255,184,0,0.35)]'
            : isTurn
            ? 'border-2 border-orange-500 ring-4 ring-orange-500/20 shadow-[0_0_20px_rgba(255,107,0,0.25)] animate-pulse'
            : 'border-white/[0.08] hover:border-white/[0.15]'
        }`}
      >
        {/* Avatar with Dealer/Blind Badge */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 shadow-inner overflow-hidden">
            {player.avatar && typeof player.avatar === 'string' && player.avatar.length > 4 ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span>{player.avatar || player.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Dealer Button Badge 'D' */}
          {player.isDealer && (
            <div
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 text-black font-mono font-bold text-[8px] flex items-center justify-center shadow-md border border-white/40 z-20"
              title="Dealer"
            >
              D
            </div>
          )}

          {/* Small Blind 'SB' */}
          {!player.isDealer && player.isSmallBlind && (
            <div
              className="absolute -top-1.5 -left-1.5 px-1 rounded bg-zinc-800 text-orange-400 border border-orange-500/40 font-mono font-bold text-[7px] z-20"
              title="Small Blind"
            >
              SB
            </div>
          )}

          {/* Big Blind 'BB' */}
          {!player.isDealer && player.isBigBlind && (
            <div
              className="absolute -top-1.5 -left-1.5 px-1 rounded bg-zinc-800 text-orange-400 border border-orange-500/40 font-mono font-bold text-[7px] z-20"
              title="Big Blind"
            >
              BB
            </div>
          )}
        </div>

        {/* Player Name & Chips */}
        <div className="flex flex-col min-w-[62px] sm:min-w-[72px] max-w-[90px] sm:max-w-[110px]">
          <span className="font-display font-bold text-[11px] sm:text-xs text-zinc-100 tracking-tight truncate" title={player.name}>
            {player.name}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[10px] sm:text-[11px] font-medium text-zinc-300 truncate">
              {(player.balance ?? player.chips).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-[9px] font-mono text-orange-400 font-bold">UCT</span>
          </div>
        </div>

        {/* COMPACT MINI CARDS TUCKED TO THE RIGHT OF OPPONENT POD */}
        {holeCards.length > 0 && !isFolded && !isWaiting && (
          <div className="flex items-center pl-1 border-l border-white/[0.08]">
            <div style={{ transform: 'rotate(-4deg)' }}>
              <Card
                card={holeCards[0]}
                faceUp={Boolean(holeCards[0]?.isFaceUp) || isShowdown}
                size="xs"
                highlight={isWinner}
              />
            </div>
            <div style={{ transform: 'rotate(4deg)', marginLeft: '-14px' }}>
              <Card
                card={holeCards[1] || null}
                faceUp={Boolean(holeCards[1]?.isFaceUp) || isShowdown}
                size="xs"
                highlight={isWinner}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
