import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveEmote } from '../engine/types.ts';

export interface EmoteOverlayProps {
  activeEmotes: ActiveEmote[];
  seatCoordinates?: Record<number, { x: number; y: number }>;
  onEmoteComplete?: (emoteId: string) => void;
  className?: string;
}

// Fallback relative seat coordinates percentage [x%, y%] around oval table for 6 seats
// 0: bottom-center, 1: bottom-left, 2: top-left, 3: top-center, 4: top-right, 5: bottom-right
export const DEFAULT_SEAT_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 50, y: 88 },
  1: { x: 18, y: 72 },
  2: { x: 18, y: 28 },
  3: { x: 50, y: 12 },
  4: { x: 82, y: 28 },
  5: { x: 82, y: 72 },
};

export const EmoteOverlay: React.FC<EmoteOverlayProps> = ({
  activeEmotes,
  seatCoordinates = DEFAULT_SEAT_POSITIONS,
  onEmoteComplete,
  className = '',
}) => {
  // Check if any active emote is 'rekt' to trigger screen shake
  const hasRekt = activeEmotes.some((e) => e.emote.id === 'rekt');

  useEffect(() => {
    if (activeEmotes.length > 0 && onEmoteComplete) {
      const timers = activeEmotes.map((e) =>
        setTimeout(() => {
          onEmoteComplete(e.id);
        }, 2200)
      );
      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [activeEmotes, onEmoteComplete]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-50 overflow-hidden ${
        hasRekt ? 'animate-screen-shake' : ''
      } ${className}`}
    >
      <AnimatePresence>
        {activeEmotes.map((item) => {
          const fromPos = seatCoordinates[item.fromSeatIndex] || { x: 50, y: 80 };
          const toPos =
            item.toSeatIndex !== undefined && seatCoordinates[item.toSeatIndex]
              ? seatCoordinates[item.toSeatIndex]
              : { x: 50, y: 45 }; // Center of table if broadcast

          const isRekt = item.emote.id === 'rekt';

          return (
            <React.Fragment key={item.id}>
              {/* Particle Trail */}
              {[...Array(6)].map((_, pIdx) => (
                <motion.div
                  key={`p-${item.id}-${pIdx}`}
                  initial={{
                    left: `${fromPos.x}%`,
                    top: `${fromPos.y}%`,
                    opacity: 0.8,
                    scale: 0.6,
                  }}
                  animate={{
                    left: `${fromPos.x + (toPos.x - fromPos.x) * (0.2 * (pIdx + 1))}%`,
                    top: `${fromPos.y + (toPos.y - fromPos.y) * (0.2 * (pIdx + 1))}%`,
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 * pIdx,
                    ease: 'easeOut',
                  }}
                  className="absolute w-3 h-3 rounded-full blur-sm"
                  style={{
                    backgroundColor: item.emote.glowColor || '#00F0FF',
                    boxShadow: `0 0 10px ${item.emote.glowColor || '#00F0FF'}`,
                  }}
                />
              ))}

              {/* Main Flying & Popping Emote */}
              <motion.div
                initial={{
                  left: `${fromPos.x}%`,
                  top: `${fromPos.y}%`,
                  scale: 0.4,
                  opacity: 0,
                  rotate: -15,
                }}
                animate={{
                  left: [`${fromPos.x}%`, `${toPos.x}%`, `${toPos.x}%`],
                  top: [`${fromPos.y}%`, `${toPos.y}%`, `${toPos.y - 4}%`],
                  scale: [0.4, 1.4, 2.2, 0],
                  opacity: [0, 1, 1, 0],
                  rotate: isRekt ? [-15, 10, -10, 0] : [-15, 0, 5, 0],
                }}
                transition={{
                  duration: 2.0,
                  times: [0, 0.4, 0.8, 1],
                  ease: 'easeInOut',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center select-none"
              >
                {/* Glowing Aura Ring */}
                <div
                  className="absolute w-24 h-24 rounded-full opacity-60 blur-xl animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${item.emote.glowColor || '#00F0FF'} 0%, transparent 70%)`,
                  }}
                />

                {/* Big Emoji */}
                <span
                  className="text-6xl drop-shadow-[0_0_25px_rgba(0,0,0,0.9)]"
                  style={{
                    filter: `drop-shadow(0 0 16px ${item.emote.glowColor || '#00F0FF'})`,
                  }}
                >
                  {item.emote.emoji}
                </span>

                {/* Emote Label Tag */}
                <div
                  className="mt-1 px-3 py-0.5 rounded-full bg-black/80 border border-white/20 text-xs font-cyber font-bold tracking-wider text-white shadow-xl whitespace-nowrap"
                  style={{
                    boxShadow: `0 0 12px ${item.emote.glowColor || '#00F0FF'}`,
                  }}
                >
                  {item.emote.label}
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default EmoteOverlay;
