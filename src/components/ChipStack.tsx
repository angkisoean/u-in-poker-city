import React from 'react';
import { motion } from 'framer-motion';

export interface ChipStackProps {
  amount: number;
  className?: string;
  isFlyingToPot?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface ChipDenomination {
  value: number;
  bg: string;
  borderColor: string;
  ringColor: string;
  textColor: string;
  glowColor: string;
}

const DENOMINATIONS: ChipDenomination[] = [
  {
    value: 1000,
    bg: 'linear-gradient(135deg, #FFB800 0%, #D48800 100%)',
    borderColor: '#FFE066',
    ringColor: '#FFF3B0',
    textColor: '#1A0C00',
    glowColor: 'rgba(255, 184, 0, 0.6)',
  },
  {
    value: 500,
    bg: 'linear-gradient(135deg, #7B2FBE 0%, #4D187A 100%)',
    borderColor: '#A855F7',
    ringColor: '#D8B4FE',
    textColor: '#FFFFFF',
    glowColor: 'rgba(123, 47, 190, 0.6)',
  },
  {
    value: 100,
    bg: 'linear-gradient(135deg, #1A1A2E 0%, #0F0A1F 100%)',
    borderColor: '#FF007F',
    ringColor: '#FF66B2',
    textColor: '#00F0FF',
    glowColor: 'rgba(255, 0, 127, 0.5)',
  },
  {
    value: 25,
    bg: 'linear-gradient(135deg, #00FF88 0%, #00994D 100%)',
    borderColor: '#66FFB2',
    ringColor: '#CCFFE6',
    textColor: '#003319',
    glowColor: 'rgba(0, 255, 136, 0.5)',
  },
  {
    value: 5,
    bg: 'linear-gradient(135deg, #FF007F 0%, #99004D 100%)',
    borderColor: '#FF66B2',
    ringColor: '#FFB3D9',
    textColor: '#FFFFFF',
    glowColor: 'rgba(255, 0, 127, 0.5)',
  },
  {
    value: 1,
    bg: 'linear-gradient(135deg, #00F0FF 0%, #008899 100%)',
    borderColor: '#66F6FF',
    ringColor: '#CCFCFF',
    textColor: '#002B33',
    glowColor: 'rgba(0, 240, 255, 0.5)',
  },
];

// Break amount into visual chips (up to max 6 visible chips in a stack)
export const calculateVisualChips = (amount: number): ChipDenomination[] => {
  if (amount <= 0) return [];
  const chips: ChipDenomination[] = [];
  let remaining = amount;

  for (const denom of DENOMINATIONS) {
    while (remaining >= denom.value && chips.length < 6) {
      chips.push(denom);
      remaining -= denom.value;
    }
  }

  // If amount is small (e.g. fractional 0.1), provide at least 1 micro chip
  if (chips.length === 0 && amount > 0) {
    chips.push(DENOMINATIONS[DENOMINATIONS.length - 1]);
  }

  return chips;
};

export const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  className = '',
  isFlyingToPot = false,
  showLabel = true,
  size = 'md',
}) => {
  if (amount <= 0) return null;

  const visualChips = calculateVisualChips(amount);

  const dimensionStyles = {
    sm: { width: 24, height: 14, text: 'text-[9px]', offset: 3 },
    md: { width: 32, height: 18, text: 'text-[11px]', offset: 4 },
    lg: { width: 40, height: 22, text: 'text-xs', offset: 5 },
  }[size];

  return (
    <motion.div
      initial={false}
      animate={
        isFlyingToPot
          ? {
              y: -50,
              x: 0,
              opacity: 0,
              scale: 0.6,
              transition: { duration: 0.6, ease: 'easeIn' },
            }
          : { y: 0, opacity: 1, scale: 1 }
      }
      className={`inline-flex flex-col items-center justify-center relative ${className}`}
    >
      {/* 3D Chip Stack Column */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${dimensionStyles.width + 4}px`,
          height: `${dimensionStyles.height + (visualChips.length - 1) * dimensionStyles.offset + 2}px`,
        }}
      >
        {visualChips.map((chip, index) => {
          const bottomOffset = index * dimensionStyles.offset;
          return (
            <div
              key={index}
              className="absolute rounded-full border flex items-center justify-center transition-all duration-200"
              style={{
                width: `${dimensionStyles.width}px`,
                height: `${dimensionStyles.height}px`,
                bottom: `${bottomOffset}px`,
                background: chip.bg,
                borderColor: chip.borderColor,
                boxShadow: `0 2px 4px rgba(0,0,0,0.5), 0 0 6px ${chip.glowColor}`,
                zIndex: index + 1,
              }}
            >
              {/* Inner striped ring */}
              <div
                className="w-4/5 h-4/5 rounded-full border border-dashed flex items-center justify-center opacity-75"
                style={{ borderColor: chip.ringColor }}
              >
                {/* Center dot/number on top chip */}
                {index === visualChips.length - 1 && (
                  <span
                    className="font-mono font-bold leading-none select-none text-[8px]"
                    style={{ color: chip.textColor }}
                  >
                    •
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chip Amount Label */}
      {showLabel && (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950/90 border border-zinc-700/60 shadow-md backdrop-blur-md">
          <span className="font-mono font-semibold text-orange-400 text-[10px] leading-tight">
            {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toLocaleString()}
          </span>
          <span className="text-[9px] text-zinc-400 font-sans font-bold">UCT</span>
        </div>
      )}
    </motion.div>
  );
};

export default ChipStack;
