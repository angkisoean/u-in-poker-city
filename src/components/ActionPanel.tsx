import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EmoteId, EmoteItem } from '../engine/types.ts';

export interface ActionPanelProps {
  isTurn: boolean;
  currentBetToCall: number;
  playerChips: number;
  minRaise: number;
  maxRaise?: number;
  potSize?: number;
  timeLimit?: number; // In seconds
  timeRemaining?: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  onSendEmote?: (emoteId: EmoteId) => void;
  className?: string;
}

export const EMOTE_LIST: EmoteItem[] = [
  { id: 'rekt', emoji: '🔥', label: 'Rekt', cost: 0.05, glowColor: '#FF0055' },
  { id: 'whale', emoji: '🐋', label: 'Whale', cost: 0.05, glowColor: '#00F0FF' },
  { id: 'diamond', emoji: '💎', label: 'Diamond Hand', cost: 0.05, glowColor: '#00FF88' },
  { id: 'ice', emoji: '🧊', label: 'Ice', cost: 0.05, glowColor: '#3B82F6' },
  { id: 'moon', emoji: '🚀', label: 'Moon', cost: 0.05, glowColor: '#FFB800' },
];

export const ActionPanel: React.FC<ActionPanelProps> = ({
  isTurn,
  currentBetToCall,
  playerChips,
  minRaise,
  maxRaise = playerChips,
  potSize = 0,
  timeLimit = 20,
  timeRemaining: propTimeRemaining,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  onSendEmote,
  className = '',
}) => {
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);

  // Calculate actual raise boundaries
  const effectiveMinRaise = Math.min(Math.max(minRaise, currentBetToCall * 2 || 2), playerChips);
  const effectiveMaxRaise = Math.max(effectiveMinRaise, Math.min(maxRaise, playerChips));
  const [raiseAmount, setRaiseAmount] = useState<number>(effectiveMinRaise);

  // Sync raise amount if min/max changes
  useEffect(() => {
    setRaiseAmount((prev) => Math.min(Math.max(prev, effectiveMinRaise), effectiveMaxRaise));
  }, [effectiveMinRaise, effectiveMaxRaise]);

  // Turn Timer countdown
  const [localSeconds, setLocalSeconds] = useState(timeLimit);
  useEffect(() => {
    if (propTimeRemaining !== undefined) {
      setLocalSeconds(propTimeRemaining);
      return;
    }

    if (!isTurn) {
      setLocalSeconds(timeLimit);
      return;
    }

    const interval = setInterval(() => {
      setLocalSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTurn, propTimeRemaining, timeLimit]);

  const canCheck = currentBetToCall === 0;
  const canCall = currentBetToCall > 0 && playerChips > 0;
  const actualCallAmount = Math.min(currentBetToCall, playerChips);
  const canRaise = playerChips > effectiveMinRaise && playerChips > currentBetToCall;

  // Percentage of timer remaining
  const timerPercentage = Math.max(0, Math.min(100, (localSeconds / timeLimit) * 100));
  const timerColor =
    timerPercentage > 50 ? '#00FF88' : timerPercentage > 20 ? '#FFB800' : '#FF0055';

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 z-40 select-none relative ${className}`}>
      {/* Provocations Emote Menu Popup */}
      <AnimatePresence>
        {showEmotePicker && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-28 left-6 glass-panel-elevated p-3 rounded-2xl flex flex-col gap-2 z-50 border border-[#00F0FF]/30 shadow-[0_0_25px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between pb-1 border-b border-white/10 text-xs font-cyber text-gray-300">
              <span className="flex items-center gap-1">
                <span>💬</span> Provocations
              </span>
              <span className="text-[10px] font-mono text-purple-300">0.05 UCT / emote</span>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {EMOTE_LIST.map((emote) => (
                <motion.button
                  key={emote.id}
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (onSendEmote) onSendEmote(emote.id);
                    setShowEmotePicker(false);
                  }}
                  className="flex flex-col items-center p-2 rounded-xl bg-black/50 border border-white/10 hover:border-[#00F0FF] transition-all cursor-pointer group"
                  style={{
                    boxShadow: `0 0 10px ${emote.glowColor}20`,
                  }}
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">{emote.emoji}</span>
                  <span className="text-[9px] font-cyber text-gray-300 mt-1 whitespace-nowrap">
                    {emote.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raise Amount Slider Drawer */}
      <AnimatePresence>
        {isTurn && showRaiseSlider && canRaise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mb-3 glass-panel-elevated p-4 rounded-2xl border border-[#FF007F]/40 flex flex-col gap-3 shadow-[0_0_30px_rgba(255,0,127,0.25)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-cyber text-xs uppercase tracking-wider text-[#FF007F]">
                Raise Amount
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-white neon-text-magenta">
                  {raiseAmount.toLocaleString()}
                </span>
                <span className="font-cyber text-xs text-purple-300">UCT</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={effectiveMinRaise}
              max={effectiveMaxRaise}
              step={1}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="cyber-slider w-full cursor-pointer"
            />

            {/* Quick Multiplier Buttons */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setRaiseAmount(effectiveMinRaise)}
                className="flex-1 py-1 px-2 rounded-lg bg-black/40 border border-white/10 hover:border-[#FF007F] text-[11px] font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                Min ({effectiveMinRaise})
              </button>
              {potSize > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setRaiseAmount(
                        Math.min(effectiveMaxRaise, Math.max(effectiveMinRaise, Math.round(potSize * 0.5)))
                      )
                    }
                    className="flex-1 py-1 px-2 rounded-lg bg-black/40 border border-white/10 hover:border-[#FF007F] text-[11px] font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    1/2 Pot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRaiseAmount(
                        Math.min(effectiveMaxRaise, Math.max(effectiveMinRaise, Math.round(potSize)))
                      )
                    }
                    className="flex-1 py-1 px-2 rounded-lg bg-black/40 border border-white/10 hover:border-[#FF007F] text-[11px] font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    Pot
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setRaiseAmount(effectiveMaxRaise)}
                className="flex-1 py-1 px-2 rounded-lg bg-black/40 border border-[#FFB800]/40 hover:border-[#FFB800] text-[11px] font-mono text-yellow-400 hover:text-yellow-300 transition-all cursor-pointer"
              >
                Max
              </button>
            </div>

            {/* Confirm Raise Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onRaise(raiseAmount);
                setShowRaiseSlider(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF007F] to-[#7B2FBE] hover:from-[#FF1A8C] hover:to-[#8E3DD1] font-cyber font-bold text-white uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(255,0,127,0.5)] cursor-pointer"
            >
              Confirm Raise to {raiseAmount.toLocaleString()} UCT
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Bar */}
      <AnimatePresence>
        {isTurn && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-panel-elevated rounded-2xl p-3 sm:p-4 border border-white/15 flex flex-col gap-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
          >
            {/* Turn Timer bar */}
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <span className="font-cyber text-[#00F0FF] uppercase tracking-wider">Your Turn</span>
                <span className="font-bold" style={{ color: timerColor }}>
                  {localSeconds}s
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${timerPercentage}%`,
                    backgroundColor: timerColor,
                    boxShadow: `0 0 8px ${timerColor}`,
                  }}
                />
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
              {/* Emotes Trigger */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowEmotePicker(!showEmotePicker)}
                className={`py-3 px-2 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-cyber text-xs transition-all ${
                  showEmotePicker
                    ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'border-white/15 bg-black/40 text-gray-300 hover:border-white/40'
                }`}
                title="Send Provocation"
              >
                <span className="text-base">💬</span>
                <span className="hidden sm:inline">Emotes</span>
              </motion.button>

              {/* FOLD Button (Red) */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onFold}
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-red-700/80 to-red-900/80 hover:from-red-600 hover:to-red-800 border border-red-500/60 font-cyber font-bold text-white text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_12px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Fold
              </motion.button>

              {/* CHECK Button (Cyan) */}
              {canCheck ? (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onCheck}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-600/80 to-cyan-800/80 hover:from-cyan-500 hover:to-cyan-700 border border-[#00F0FF] font-cyber font-bold text-white text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
                >
                  Check
                </motion.button>
              ) : (
                /* CALL Button (Green) */
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onCall(actualCallAmount)}
                  disabled={!canCall}
                  className="py-3 px-2 rounded-xl bg-gradient-to-r from-emerald-600/90 to-green-800/90 hover:from-emerald-500 hover:to-green-700 border border-[#00FF88] font-cyber font-bold text-white text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(0,255,136,0.4)] cursor-pointer flex flex-col items-center justify-center leading-tight"
                >
                  <span>Call</span>
                  <span className="font-mono text-[10px] text-green-200">
                    {actualCallAmount.toLocaleString()} UCT
                  </span>
                </motion.button>
              )}

              {/* RAISE Button (Magenta) */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowRaiseSlider(!showRaiseSlider)}
                disabled={!canRaise}
                className={`py-3 px-2 rounded-xl bg-gradient-to-r from-[#FF007F]/80 to-purple-800/80 hover:from-[#FF007F] hover:to-purple-700 border border-[#FF007F] font-cyber font-bold text-white text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(255,0,127,0.4)] cursor-pointer flex flex-col items-center justify-center leading-tight ${
                  !canRaise ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span>Raise</span>
                <span className="font-mono text-[10px] text-pink-200">
                  {showRaiseSlider ? 'Options ▲' : 'Adjust ▼'}
                </span>
              </motion.button>

              {/* ALL-IN Button (Gold Glow) */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAllIn}
                disabled={playerChips <= 0}
                className="col-span-2 sm:col-span-2 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 border border-[#FFB800] font-cyber font-extrabold text-black text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(255,184,0,0.6)] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>👑 ALL IN</span>
                <span className="font-mono font-bold text-xs bg-black/20 px-1.5 py-0.5 rounded text-black">
                  ({playerChips.toLocaleString()})
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActionPanel;
