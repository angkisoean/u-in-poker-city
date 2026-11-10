import React from 'react';

export interface UnicityBrandBadgeProps {
  label?: string;
  sublabel?: string;
  showTestnetPill?: boolean;
  className?: string;
}

export const UnicityBrandBadge: React.FC<UnicityBrandBadgeProps> = ({
  label = 'UNICITY NETWORK',
  sublabel = 'TESTNET',
  showTestnetPill = true,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-black border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md select-none ${className}`}
      title="Unicity Blockchain Testnet Phase"
    >
      {/* Iconic Square 'U' Logo Badge */}
      <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
        <span className="font-mono font-black text-sm text-[#D35400] leading-none tracking-tighter">
          U
        </span>
      </div>

      {/* Brand Text */}
      <div className="flex items-center gap-2">
        <span className="font-sans font-bold text-xs sm:text-sm tracking-wider text-white uppercase whitespace-nowrap">
          {label}
        </span>

        {showTestnetPill && (
          <span className="px-1.5 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/50 text-[9px] font-mono font-bold text-orange-400 uppercase tracking-widest">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default UnicityBrandBadge;
