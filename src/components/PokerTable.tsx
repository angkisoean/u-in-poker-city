import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  TableState,
  Player,
  ActionPayload,
} from '../engine/types.ts';
import { evaluateHand, getRankName } from '../engine/evaluator.ts';
import { calculateLivePots } from '../engine/pokerEngine.ts';
import { CommunityCards } from './CommunityCards.tsx';
import { PlayerSeat } from './PlayerSeat.tsx';
import { BettingControls } from './BettingControls.tsx';
import { ShowdownBanner } from './ShowdownBanner.tsx';
import { UnicityBrandBadge } from './UnicityBrandBadge.tsx';

export interface PokerTableProps {
  tableState?: TableState;
  heroPlayerId?: string;
  onAction?: (action: ActionPayload) => void;
  onStandUp?: () => void;
  onDealNextHand?: () => void;
  onSeatPlayer?: (seatIndex: number) => void;
  isActionPending?: boolean;
  className?: string;
}

export interface SeatPlacement {
  seatIndex: number;
  top: string;
  left: string;
}

export interface BetPlacement {
  seatIndex: number;
  top: string;
  left: string;
}

// 6-Max Radial Table Seating Coordinates (Symmetrical with ample breathing space)
const RING_6MAX_SEATING: Record<number, SeatPlacement> = {
  // Seat 0: Hero (Bottom Center - 6 o'clock)
  0: { seatIndex: 0, top: '84%', left: '50%' },
  // Seat 1: Bottom Left (~7:30 o'clock)
  1: { seatIndex: 1, top: '68%', left: '16%' },
  // Seat 2: Top Left (~10:30 o'clock)
  2: { seatIndex: 2, top: '24%', left: '18%' },
  // Seat 3: Top Center (12 o'clock)
  3: { seatIndex: 3, top: '12%', left: '50%' },
  // Seat 4: Top Right (~1:30 o'clock)
  4: { seatIndex: 4, top: '24%', left: '82%' },
  // Seat 5: Bottom Right (~4:30 o'clock)
  5: { seatIndex: 5, top: '68%', left: '84%' },
};

// Dedicated table bet chip coordinates on the felt (in front of each seat towards pot)
const RING_6MAX_BETS: Record<number, BetPlacement> = {
  0: { seatIndex: 0, top: '70%', left: '50%' },
  1: { seatIndex: 1, top: '56%', left: '27%' },
  2: { seatIndex: 2, top: '36%', left: '29%' },
  3: { seatIndex: 3, top: '25%', left: '50%' },
  4: { seatIndex: 4, top: '36%', left: '71%' },
  5: { seatIndex: 5, top: '56%', left: '73%' },
};

const EMPTY_SEATS: (Player | null)[] = [null, null, null, null, null, null];

export const PokerTable: React.FC<PokerTableProps> = ({
  tableState: propTableState,
  heroPlayerId = 'hero',
  onAction,
  onStandUp,
  onDealNextHand,
  onSeatPlayer,
  isActionPending = false,
  className = '',
}) => {
  // Derive table state from single source of truth - strictly empty seats if no real players
  const players = propTableState?.players || EMPTY_SEATS;
  const communityCards = propTableState?.communityCards || [];
  const pot = propTableState?.pot ?? 0;
  const currentBet = propTableState?.currentBet ?? 0;
  const turnIndex = propTableState?.turnIndex ?? 0;
  const gamePhase = propTableState?.gamePhase || 'PRE_FLOP';
  const yieldEarned = propTableState?.yieldEarned ?? 0;
  const winners = propTableState?.winners || [];

  // Table always supports 6 seats
  const totalSeats = 6;

  // Notification for players who joined mid-hand
  const [waitingNotice, setWaitingNotice] = useState<string | null>(null);

  // 20-Second Thinking Timer for each turn
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(20);

  useEffect(() => {
    setTurnTimeRemaining(20);
    const interval = setInterval(() => {
      setTurnTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [turnIndex]);

  // State channel signature notification
  const [lastSignedChannel, setLastSignedChannel] = useState<{
    action: string;
    amount?: number;
    sig: string;
    nonce: number;
  } | null>(null);
  const [nonceCounter, setNonceCounter] = useState<number>(101);

  // Find Hero player
  const heroPlayer = players.find((p) => p && (p.id === heroPlayerId || p.seatIndex === 0)) || players[0];
  const isHeroTurn = heroPlayer
    ? (turnIndex === heroPlayer.seatIndex || Boolean(heroPlayer.isTurn)) && !heroPlayer.hasFolded
    : false;

  const heroCallAmount = heroPlayer ? Math.max(0, currentBet - heroPlayer.currentBet) : 0;
  const heroBalance = heroPlayer ? heroPlayer.balance || heroPlayer.chips : 0;

  // Active players count vs waiting players count
  const activePlayersCount = players.filter((p) => p && !p.isWaitingForNextHand && p.chips > 0).length;
  const waitingPlayers = players.filter((p) => p && p.isWaitingForNextHand);

  // Evaluate Hero's Current Hand Strength (e.g. "Two Pair", "Flush", "Pair of Kings")
  const heroHandRank = useMemo(() => {
    if (!heroPlayer) return '';
    const heroHoleCards = heroPlayer.holeCards && heroPlayer.holeCards.length > 0 ? heroPlayer.holeCards : heroPlayer.cards || [];
    if (heroHoleCards.length < 2) return '';

    const combinedCards = [...heroHoleCards, ...communityCards];
    if (combinedCards.length >= 5) {
      try {
        const evalResult = evaluateHand(combinedCards);
        return evalResult.rankName;
      } catch {
        return '';
      }
    } else if (heroHoleCards.length === 2 && heroHoleCards[0].rank === heroHoleCards[1].rank) {
      return `Pocket Pair (${getRankName(heroHoleCards[0].rank, true)})`;
    }
    return '';
  }, [heroPlayer, communityCards]);

  // Action Dispatcher with Off-Chain Signature
  const handleActionDispatch = (payload: ActionPayload) => {
    const nextNonce = nonceCounter + 1;
    setNonceCounter(nextNonce);
    const mockSig = '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setLastSignedChannel({
      action: payload.type.toUpperCase(),
      amount: payload.amount,
      sig: mockSig,
      nonce: nextNonce,
    });
    setTimeout(() => {
      setLastSignedChannel((prev) => (prev?.nonce === nextNonce ? null : prev));
    }, 2800);

    if (onAction) {
      onAction(payload);
    }
  };

  // Handle clicking empty seat
  const handleSeatClick = (sIdx: number) => {
    if (onSeatPlayer) {
      onSeatPlayer(sIdx);
      if (gamePhase !== 'SHOWDOWN') {
        setWaitingNotice(`A new player joined Seat ${sIdx + 1} — Currently waiting for this hand to finish before joining.`);
        setTimeout(() => setWaitingNotice(null), 4500);
      }
    }
  };

  // Find first empty seat to simulate player joining
  const handleSimulateJoin = () => {
    const emptySeatIndex = [1, 2, 4, 5, 3].find(
      (idx) => !players.some((p) => p && p.seatIndex === idx)
    );
    if (emptySeatIndex !== undefined && onSeatPlayer) {
      handleSeatClick(emptySeatIndex);
    }
  };

  // Winning cards to highlight during showdown
  const winningBestCards = winners[0]?.hand?.bestCards || [];
  const winningCardIds = winningBestCards.map((c) => c.id || `${c.rank}-${c.suit}`);

  const tableName = propTableState?.tier?.name || 'Table 2: Neon Street';
  const smallBlind = propTableState?.tier?.smallBlind ?? 5.0;
  const bigBlind = propTableState?.tier?.bigBlind ?? 10.0;

  const currentPot = gamePhase === 'SHOWDOWN' ? (propTableState?.lastPot ?? pot) : pot;
  const { mainPot, sidePots } = useMemo(() => {
    return calculateLivePots(players, currentPot);
  }, [players, currentPot]);

  // Stand Out action: immediately auto-folds hand so other players proceed without waiting
  const handleStandOut = () => {
    if (heroPlayer && !heroPlayer.hasFolded && heroPlayer.holeCards && heroPlayer.holeCards.length > 0) {
      if (onAction) {
        onAction({ type: 'fold' });
      }
    }
    if (onStandUp) {
      onStandUp();
    }
  };

  return (
    <div
      className={`h-screen max-h-screen w-full bg-[#08090B] text-zinc-100 flex flex-col justify-between select-none relative overflow-hidden ${className}`}
    >
      {/* =========================================================================
          1. HEADER BAR: Table Identity, Active Players, Stage Pill, Leave
          ========================================================================= */}
      <header className="h-14 shrink-0 w-full flex items-center justify-between px-4 sm:px-8 bg-[#08090B]/95 border-b border-white/[0.08] backdrop-blur-xl z-30">
        {/* Left: Table Identity & Stakes with Brand Badge */}
        <div className="flex items-center gap-3">
          <UnicityBrandBadge label="UNICITY" sublabel="TESTNET" className="hidden sm:inline-flex" />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs sm:text-sm text-zinc-100">
                {tableName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-orange-400 border border-orange-500/30">
                {smallBlind} / {bigBlind} Testnet UCT
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              <span className="text-orange-400 font-semibold">{activePlayersCount} Playing</span>
              {waitingPlayers.length > 0 && (
                <span className="text-amber-400 font-semibold">({waitingPlayers.length} Waiting for next hand)</span>
              )}
              <span>• 6-Max No-Limit Texas Hold'em</span>
            </div>
          </div>
        </div>

        {/* Center: Stage Pill & Simulate Join Shortcut */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 tracking-wider font-semibold shadow-inner">
            TESTNET STAGE: {gamePhase}
          </span>

          {players.length < 6 && onSeatPlayer && (
            <button
              onClick={handleSimulateJoin}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/[0.08] hover:border-orange-500/40 text-[11px] font-mono text-zinc-400 hover:text-orange-400 transition-all cursor-pointer shadow-sm"
              title="Add another player to an empty seat to test waiting queue"
            >
              <span>+ Add Player</span>
            </button>
          )}
        </div>

        {/* Right: Auto-Yield Badge & Stand Up Cashout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#FF6B00]" />
            <span className="text-xs font-mono text-zinc-400 hidden md:inline">Testnet Yield:</span>
            <span className="font-mono font-bold text-xs text-orange-400">
              +{yieldEarned.toFixed(4)} UCT
            </span>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              (12% APY)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStandOut}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-400 hover:text-orange-300 border border-orange-500/40 text-xs font-sans font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,107,0,0.2)]"
              title="Automatically fold current hand and stand out so table does not wait"
            >
              <span>🚶</span>
              <span>Stand Out</span>
            </button>

            {onStandUp && (
              <button
                onClick={onStandUp}
                className="py-1.5 px-2.5 rounded-xl bg-zinc-900 hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-xs font-sans font-medium transition-all duration-200 cursor-pointer flex items-center gap-1"
                title="Leave table and settle escrow to wallet"
              >
                <span>Leave</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* FLOATING NOTICE WHEN PLAYER JOINS MID-HAND */}
      <AnimatePresence>
        {waitingNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#16191F]/95 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-xl flex items-center gap-2 text-xs font-mono text-amber-300 pointer-events-none"
          >
            <span>⏳</span>
            <span>{waitingNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          2. THE POKER ARENA: Minimalist Felt Oval Table (Fills Center Space)
          ========================================================================= */}
      <main className="flex-1 min-h-0 relative w-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        <div className="relative w-full max-w-6xl xl:max-w-7xl h-full max-h-[640px] xl:max-h-[720px] 2xl:max-h-[780px] flex items-center justify-center">
          {/* THE FELT TABLE OVAL */}
          <div
            className="absolute inset-x-[5%] sm:inset-x-[7%] md:inset-x-[9%] inset-y-[9%] sm:inset-y-[11%] rounded-[180px] sm:rounded-[240px] md:rounded-[280px] border border-orange-500/25 bg-gradient-to-b from-[#14171D] via-[#101217] to-[#0A0B0E] shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at center, rgba(255,107,0,0.08) 0%, transparent 68%)',
            }}
          >
            {/* Subtle Inner Contour Racetrack */}
            <div className="absolute inset-3 sm:inset-4 rounded-[170px] sm:rounded-[225px] md:rounded-[265px] border border-white/[0.04] pointer-events-none" />
          </div>

          {/* =====================================================================
              CENTER STAGE: Pot & Community Cards
              ===================================================================== */}
          <div className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 sm:gap-2.5 z-20 pointer-events-none">
            {/* POT BADGE */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                {gamePhase === 'SHOWDOWN' ? 'Final Pot Awarded' : 'Total Pot'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#FF6B00]" />
                <span className="font-mono text-2xl sm:text-3xl font-bold text-orange-400 tracking-tight drop-shadow-[0_0_15px_rgba(255,107,0,0.3)]">
                  {currentPot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="font-mono text-xs text-orange-400 font-bold">UCT</span>
              </div>

              {/* DYNAMIC MULTI-POT BREAKDOWN (MAIN POT & SIDE POTS) */}
              {sidePots.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs mt-1.5">
                  <div className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[10px] font-mono font-bold text-orange-400 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span>Main Pot: {mainPot.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} UCT</span>
                  </div>
                  {sidePots.map((sp, idx) => (
                    <div
                      key={`sidepot-${idx}`}
                      className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[10px] font-mono font-bold text-amber-300 shadow-sm flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Side Pot {idx + 1}: {sp.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} UCT</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COMMUNITY CARDS */}
            <div className="pointer-events-auto">
              <CommunityCards cards={communityCards} winningCardIds={winningCardIds} />
            </div>
          </div>

          {/* SHOWDOWN WINNER CELEBRATION MODAL OVERLAY */}
          {gamePhase === 'SHOWDOWN' && winners.length > 0 && (
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-md px-3 pointer-events-auto">
              <ShowdownBanner
                winners={winners}
                players={players}
                heroPlayerId={heroPlayerId}
                potAmount={propTableState?.lastPot ?? pot}
                durationSeconds={8}
                onDealNextHand={onDealNextHand}
              />
            </div>
          )}

          {/* =====================================================================
              3. DEDICATED TABLE BET CHIPS (Placed cleanly on felt towards pot)
              ===================================================================== */}
          {Array.from({ length: totalSeats }).map((_, sIdx) => {
            const betPos = RING_6MAX_BETS[sIdx];
            const player = players.find((p) => p && p.seatIndex === sIdx);
            if (!betPos || !player || !player.currentBet || player.currentBet <= 0 || player.isWaitingForNextHand) {
              return null;
            }

            return (
              <motion.div
                key={`bet-${sIdx}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-zinc-950/90 border border-orange-500/40 shadow-md flex items-center gap-1 pointer-events-none"
                style={{ top: betPos.top, left: betPos.left }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_#FF6B00]" />
                <span className="font-mono font-bold text-[10px] sm:text-[11px] text-zinc-200">
                  {player.currentBet.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-orange-400 font-semibold">UCT</span>
                </span>
              </motion.div>
            );
          })}

          {/* =====================================================================
              4. 6 PLAYER SEATS AROUND THE FELT
              ===================================================================== */}
          {Array.from({ length: totalSeats }).map((_, sIdx) => {
            const placement = RING_6MAX_SEATING[sIdx];
            if (!placement) return null;

            const player = players.find((p) => p && p.seatIndex === sIdx) || null;
            const isHero = sIdx === 0 || (player && player.id === heroPlayerId);
            const isTurn = Boolean(
              player && (turnIndex === sIdx || player.isTurn) && !player.hasFolded && !player.isWaitingForNextHand
            );

            // Winner identification for this seat
            const winnerEntry = winners.find((w) => w.playerId === player?.id);
            const isWinner = Boolean(gamePhase === 'SHOWDOWN' && winnerEntry);
            const winnerHand = winnerEntry?.hand?.rankName;

            return (
              <div
                key={`seat-${sIdx}`}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  top: placement.top,
                  left: placement.left,
                }}
              >
                <PlayerSeat
                  player={player}
                  seatIndex={sIdx}
                  isHero={Boolean(isHero)}
                  isCurrentTurn={isTurn}
                  timeRemaining={isTurn ? turnTimeRemaining : undefined}
                  isWinner={isWinner}
                  winnerHand={winnerHand}
                  isShowdown={gamePhase === 'SHOWDOWN'}
                  currentHandRank={isHero ? heroHandRank : undefined}
                  onSeatClick={handleSeatClick}
                />
              </div>
            );
          })}
        </div>

        {/* REAL-TIME OFF-CHAIN P2P STATE CHANNEL SIGNED BADGE */}
        <AnimatePresence>
          {lastSignedChannel && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-zinc-950/90 border border-orange-500/40 shadow-[0_0_20px_rgba(255,107,0,0.25)] backdrop-blur-md flex items-center gap-2 pointer-events-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
              <span className="font-mono font-bold text-[11px] text-orange-400">
                STATE CHANNEL SIGNED
              </span>
              <span className="font-mono text-[11px] text-zinc-300">
                {lastSignedChannel.action}
                {lastSignedChannel.amount ? ` (${lastSignedChannel.amount} UCT)` : ''}
              </span>
              <span className="font-mono text-[10px] text-zinc-500 border-l border-zinc-800 pl-2">
                Nonce #{lastSignedChannel.nonce}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =========================================================================
          3. FLOATING ACTION DOCK (Bottom Bar)
          ========================================================================= */}
      <footer className="shrink-0 w-full px-4 pb-3 pt-1 z-40 bg-[#08090B]/90 backdrop-blur-md border-t border-white/[0.05]">
        <BettingControls
          isTurn={isHeroTurn}
          disabled={isActionPending}
          currentBetToCall={heroCallAmount}
          playerChips={heroBalance}
          minRaise={Math.max(currentBet * 2 || 0.4, bigBlind * 2)}
          maxRaise={heroBalance}
          potSize={pot}
          timeLimit={20}
          timeRemaining={turnTimeRemaining}
          onFold={() => handleActionDispatch({ type: 'fold' })}
          onCheck={() => handleActionDispatch({ type: 'check' })}
          onCall={(amount) => handleActionDispatch({ type: 'call', amount })}
          onRaise={(amount) => handleActionDispatch({ type: 'raise', amount })}
          onAllIn={() => handleActionDispatch({ type: 'all-in' })}
        />
      </footer>
    </div>
  );
};
