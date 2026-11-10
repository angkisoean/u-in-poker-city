import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BettingControlsProps {
  isTurn: boolean;
  currentBetToCall: number;
  playerChips: number;
  minRaise: number;
  maxRaise?: number;
  potSize?: number;
  timeLimit?: number;
  timeRemaining?: number;
  disabled?: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  className?: string;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  isTurn,
  currentBetToCall,
  playerChips,
  minRaise,
  maxRaise = playerChips,
  potSize = 0,
  timeLimit = 20,
  timeRemaining,
  disabled = false,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  className = '',
}) => {
  const [showRaiseDrawer, setShowRaiseDrawer] = useState<boolean>(false);

  // Effective raise bounds
  const effectiveMinRaise = Math.min(
    Math.max(minRaise, currentBetToCall * 2 || 2),
    playerChips
  );
  const effectiveMaxRaise = Math.max(effectiveMinRaise, Math.min(maxRaise, playerChips));
  const [raiseAmount, setRaiseAmount] = useState<number>(effectiveMinRaise);

  useEffect(() => {
    setRaiseAmount((prev) => Math.min(Math.max(prev, effectiveMinRaise), effectiveMaxRaise));
  }, [effectiveMinRaise, effectiveMaxRaise]);

  // Turn Timer
  const [timerSeconds, setTimerSeconds] = useState(timeRemaining ?? timeLimit);
  useEffect(() => {
    if (timeRemaining !== undefined) {
      setTimerSeconds(timeRemaining);
      return;
    }
    if (!isTurn) {
      setTimerSeconds(timeLimit);
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTurn, timeRemaining, timeLimit]);

  const canCheck = currentBetToCall === 0;
  const canCall = currentBetToCall > 0 && playerChips > 0;
  const actualCallAmount = Math.min(currentBetToCall, playerChips);
  const canRaise = playerChips > effectiveMinRaise && playerChips > currentBetToCall;

  // Auto-action when 20s thinking time expires
  useEffect(() => {
    if (isTurn && timerSeconds === 0) {
      if (canCheck) {
        onCheck();
      } else {
        onFold();
      }
    }
  }, [isTurn, timerSeconds, canCheck, onCheck, onFold]);

  // Preset Handlers
  const handlePreset = (type: 'half' | 'pot' | 'allin') => {
    let target = effectiveMinRaise;
    if (type === 'half') {
      target = Math.max(effectiveMinRaise, Math.floor(potSize / 2));
    } else if (type === 'pot') {
      target = Math.max(effectiveMinRaise, Math.floor(potSize));
    } else if (type === 'allin') {
      target = playerChips;
    }
    setRaiseAmount(Math.min(target, effectiveMaxRaise));
  };

  const step = effectiveMaxRaise <= 10 ? 0.02 : effectiveMaxRaise <= 100 ? 0.5 : 1;
  const timerRatio = Math.max(0, Math.min(1, timerSeconds / timeLimit));
  const formatAmount = (num: number) =>
    num.toLocaleString(undefined, {
      minimumFractionDigits: effectiveMaxRaise <= 10 ? 2 : 0,
      maximumFractionDigits: 2,
    });

  return (
    <div className={`relative max-w-2xl w-full mx-auto select-none ${className}`}>
      {/* FLOATING ACTION DOCK */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 relative overflow-hidden transition-all duration-200">
        {/* Turn Countdown Progress Line (20 seconds) */}
        {isTurn && (
          <div className="absolute top-0 inset-x-0 h-1 bg-zinc-800 overflow-hidden">
            <motion.div
              className={`h-full transition-all duration-300 ${
                timerSeconds <= 5
                  ? 'bg-red-500 shadow-[0_0_12px_#EF4444]'
                  : 'bg-orange-500 shadow-[0_0_10px_#FF6B00]'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${timerRatio * 100}%` }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
          </div>
        )}

        {/* Turn Status & 20s Thinking Timer Header */}
        {isTurn && (
          <div className="flex items-center justify-between text-xs px-1 pt-0.5">
            <span className="text-zinc-300 font-sans font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span>Giliran Anda Bertindak</span>
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-zinc-500 text-[11px]">Waktu Berpikir:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-xs border ${
                  timerSeconds <= 5
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                }`}
              >
                ⏱️ {timerSeconds}s
              </span>
            </div>
          </div>
        )}

        {/* EXPANDABLE RAISE DRAWER */}
        <AnimatePresence>
          {showRaiseDrawer && isTurn && canRaise && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2.5 pb-2 border-b border-zinc-800/80"
            >
              {/* Presets and Value Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePreset('half')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    1/2 Pot
                  </button>
                  <button
                    onClick={() => handlePreset('pot')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    Pot
                  </button>
                  <button
                    onClick={() => handlePreset('allin')}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    All-in
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-zinc-500 text-xs">Amount:</span>
                  <span className="font-bold text-sm text-orange-400">
                    {formatAmount(raiseAmount)} UCT
                  </span>
                </div>
              </div>

              {/* Range Slider */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={effectiveMinRaise}
                  max={effectiveMaxRaise}
                  step={step}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN BUTTONS ROW */}
        <div className="flex items-center gap-2">
          {/* FOLD BUTTON */}
          <button
            onClick={onFold}
            disabled={!isTurn || disabled}
            className={`flex-1 py-2.5 px-3 rounded-xl font-sans text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isTurn && !disabled
                ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 active:scale-[0.98]'
                : 'bg-zinc-900 border border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            Fold
          </button>

          {/* CHECK / CALL BUTTON */}
          {canCheck ? (
            <button
              onClick={onCheck}
              disabled={!isTurn || disabled}
              className={`flex-1 py-2.5 px-3 rounded-xl font-sans text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isTurn && !disabled
                  ? 'bg-zinc-800 hover:border-orange-500/50 hover:bg-zinc-750 text-white border border-zinc-700/60 shadow-sm active:scale-[0.98]'
                  : 'bg-zinc-900 border border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => onCall(actualCallAmount)}
              disabled={!isTurn || !canCall || disabled}
              className={`flex-1 py-2.5 px-3 rounded-xl font-sans text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                isTurn && canCall && !disabled
                  ? 'bg-zinc-800 hover:border-orange-500/50 hover:bg-zinc-750 text-white border border-zinc-700/60 shadow-sm active:scale-[0.98]'
                  : 'bg-zinc-900 border border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              <span>Call</span>
              <span className="font-mono text-orange-400 font-bold">
                {formatAmount(actualCallAmount)} UCT
              </span>
            </button>
          )}

          {/* BET / RAISE TOGGLE & CONFIRM */}
          {canRaise && (
            <>
              {showRaiseDrawer ? (
                <button
                  onClick={() => {
                    onRaise(raiseAmount);
                    setShowRaiseDrawer(false);
                  }}
                  disabled={!isTurn || disabled}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-sans text-xs sm:text-sm font-semibold shadow-lg shadow-orange-500/20 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Confirm Raise</span>
                  <span className="font-mono font-bold">
                    ({formatAmount(raiseAmount)})
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowRaiseDrawer(true)}
                  disabled={!isTurn || disabled}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-sans text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isTurn && !disabled
                      ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20 active:scale-95'
                      : 'bg-zinc-900 border border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  Raise
                </button>
              )}
            </>
          )}

          {/* ALL-IN BUTTON */}
          <button
            onClick={onAllIn}
            disabled={!isTurn || playerChips <= 0 || disabled}
            className={`px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isTurn && playerChips > 0 && !disabled
                ? 'bg-zinc-800/60 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 text-zinc-400 border border-zinc-700/50 active:scale-[0.98]'
                : 'bg-zinc-900 border border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
            title="Go All-In"
          >
            All-In
          </button>
        </div>
      </div>
    </div>
  );
};
