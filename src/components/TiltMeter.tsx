import React from 'react';
import { motion } from 'framer-motion';

export interface TiltMeterProps {
  tiltLevel: number; // 0 - 100
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

interface TiltTier {
  min: number;
  max: number;
  label: string;
  icon: string;
  color: string;
  glow: string;
  isPulsing?: boolean;
}

const TILT_TIERS: TiltTier[] = [
  {
    min: 0,
    max: 20,
    label: 'Ice Cold',
    icon: '🧊',
    color: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
  {
    min: 21,
    max: 40,
    label: 'Cool',
    icon: '💧',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.6)',
  },
  {
    min: 41,
    max: 60,
    label: 'Warm',
    icon: '⚡',
    color: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.6)',
  },
  {
    min: 61,
    max: 80,
    label: 'Hot',
    icon: '🔥',
    color: '#FF6B00',
    glow: 'rgba(255, 107, 0, 0.7)',
  },
  {
    min: 81,
    max: 100,
    label: 'TILTING',
    icon: '🚨',
    color: '#FF0055',
    glow: 'rgba(255, 0, 85, 0.9)',
    isPulsing: true,
  },
];

export const getTiltTier = (level: number): TiltTier => {
  const clamped = Math.max(0, Math.min(100, level));
  return TILT_TIERS.find((t) => clamped >= t.min && clamped <= t.max) || TILT_TIERS[0];
};

export const TiltMeter: React.FC<TiltMeterProps> = ({
  tiltLevel,
  compact = false,
  showLabel = true,
  className = '',
}) => {
  const clampedLevel = Math.max(0, Math.min(100, tiltLevel));
  const tier = getTiltTier(clampedLevel);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} title={`Tilt: ${clampedLevel}% (${tier.label})`}>
        <div
          className={`w-2.5 h-2.5 rounded-full ${tier.isPulsing ? 'animate-ping' : ''}`}
          style={{
            backgroundColor: tier.color,
            boxShadow: `0 0 8px ${tier.glow}`,
          }}
        />
        <span className="text-[10px] font-mono" style={{ color: tier.color }}>
          {tier.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`glass-panel-subtle rounded-xl p-2.5 flex flex-col gap-1.5 border border-white/10 ${
        tier.isPulsing ? 'ring-1 ring-red-500/60 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : ''
      } ${className}`}
    >
      {/* Top Header info */}
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-cyber">
            <span className="text-sm">{tier.icon}</span>
            <span className="text-[11px] uppercase tracking-wider text-gray-300">Tilt Meter</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className={`font-bold text-[11px] uppercase tracking-wider ${
                tier.isPulsing ? 'animate-pulse font-extrabold' : ''
              }`}
              style={{ color: tier.color, textShadow: `0 0 8px ${tier.glow}` }}
            >
              {tier.label}
            </span>
            <span className="text-[10px] text-gray-400">({clampedLevel}%)</span>
          </div>
        </div>
      )}

      {/* Horizontal Meter Bar */}
      <div className="relative w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-[1px]">
        {/* Background gradient track */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(90deg, #3B82F6 0%, #00F0FF 25%, #FFB800 50%, #FF6B00 75%, #FF0055 100%)',
          }}
        />

        {/* Dynamic Animated Fill */}
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{
            width: `${clampedLevel}%`,
            backgroundColor: tier.color,
            boxShadow: `0 0 10px ${tier.glow}, 0 0 20px ${tier.glow}`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Subtle sheen highlight inside bar */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full pointer-events-none" />
        </motion.div>

        {/* Tick dividers (20%, 40%, 60%, 80%) */}
        {[20, 40, 60, 80].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default TiltMeter;
