import React from 'react';
import { motion } from 'framer-motion';

export const FannedHeroCards: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full max-w-[620px] mx-auto select-none flex flex-col items-center justify-center py-4 ${className}`}>
      {/* =========================================================================
          THE 5 FANNED PLAYING CARDS
          Recreated in pure vector/CSS with authentic vintage ivory paper,
          halftone drop shadows, bold vintage numbers, and red diamond lattice back!
          ========================================================================= */}
      <div className="relative w-[340px] sm:w-[460px] md:w-[520px] h-[220px] sm:h-[280px] md:h-[310px] flex items-center justify-center">
        {/* CARD 1: 10 OF SPADES (Far Left, rotated -24deg) */}
        <motion.div
          initial={{ rotate: 0, x: 0, y: 30, opacity: 0 }}
          animate={{ rotate: -24, x: -130, y: 15, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: 2, scale: 1.04, zIndex: 30 }}
          className="absolute w-[95px] sm:w-[130px] md:w-[145px] h-[140px] sm:h-[190px] md:h-[210px] rounded-2xl bg-[#F7EEDD] border-[2.5px] border-[#1C1A17] shadow-[0_12px_30px_rgba(0,0,0,0.65)] p-2 sm:p-3 flex flex-col justify-between origin-bottom cursor-pointer group"
          style={{
            boxShadow: '-6px 12px 0px rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* Top-Left Rank & Suit */}
          <div className="flex flex-col items-start leading-none font-display font-black text-zinc-950">
            <span className="text-base sm:text-2xl tracking-tighter">10</span>
            <span className="text-sm sm:text-lg -mt-1">♠</span>
          </div>
          {/* Center Big Suit */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl sm:text-6xl text-zinc-950/90 font-serif drop-shadow-sm">♠</span>
          </div>
          {/* Bottom-Right Inverted */}
          <div className="flex flex-col items-end leading-none font-display font-black text-zinc-950 rotate-180">
            <span className="text-base sm:text-2xl tracking-tighter">10</span>
            <span className="text-sm sm:text-lg -mt-1">♠</span>
          </div>
        </motion.div>

        {/* CARD 2: 7 OF HEARTS (Mid-Left, rotated -12deg) */}
        <motion.div
          initial={{ rotate: 0, x: 0, y: 30, opacity: 0 }}
          animate={{ rotate: -12, x: -65, y: -4, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -16, scale: 1.04, zIndex: 30 }}
          className="absolute w-[95px] sm:w-[130px] md:w-[145px] h-[140px] sm:h-[190px] md:h-[210px] rounded-2xl bg-[#F7EEDD] border-[2.5px] border-[#1C1A17] p-2 sm:p-3 flex flex-col justify-between origin-bottom cursor-pointer group"
          style={{
            boxShadow: '-4px 12px 0px rgba(0,0,0,0.35), 0 16px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* Top-Left */}
          <div className="flex flex-col items-start leading-none font-display font-black text-[#B91C1C]">
            <span className="text-base sm:text-2xl tracking-tighter">7</span>
            <span className="text-sm sm:text-lg -mt-1">♥</span>
          </div>
          {/* Center Suit */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl sm:text-6xl text-[#B91C1C]/90 font-serif drop-shadow-sm">♥</span>
          </div>
          {/* Bottom-Right */}
          <div className="flex flex-col items-end leading-none font-display font-black text-[#B91C1C] rotate-180">
            <span className="text-base sm:text-2xl tracking-tighter">7</span>
            <span className="text-sm sm:text-lg -mt-1">♥</span>
          </div>
        </motion.div>

        {/* CARD 3: 3 OF CLUBS (Center, rotated 0deg, elevated) */}
        <motion.div
          initial={{ rotate: 0, y: 30, opacity: 0 }}
          animate={{ rotate: 0, x: 0, y: -16, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -26, scale: 1.04, zIndex: 30 }}
          className="absolute w-[95px] sm:w-[130px] md:w-[145px] h-[140px] sm:h-[190px] md:h-[210px] rounded-2xl bg-[#F7EEDD] border-[2.5px] border-[#1C1A17] p-2 sm:p-3 flex flex-col justify-between origin-bottom cursor-pointer group z-10"
          style={{
            boxShadow: '0 12px 0px rgba(0,0,0,0.35), 0 18px 36px rgba(0,0,0,0.75)',
          }}
        >
          {/* Top-Left */}
          <div className="flex flex-col items-start leading-none font-display font-black text-zinc-950">
            <span className="text-base sm:text-2xl tracking-tighter">3</span>
            <span className="text-sm sm:text-lg -mt-1">♣</span>
          </div>
          {/* Center Suit */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl sm:text-6xl text-zinc-950/90 font-serif drop-shadow-sm">♣</span>
          </div>
          {/* Bottom-Right */}
          <div className="flex flex-col items-end leading-none font-display font-black text-zinc-950 rotate-180">
            <span className="text-base sm:text-2xl tracking-tighter">3</span>
            <span className="text-sm sm:text-lg -mt-1">♣</span>
          </div>
        </motion.div>

        {/* CARD 4: 8 OF DIAMONDS (Mid-Right, rotated +12deg) */}
        <motion.div
          initial={{ rotate: 0, x: 0, y: 30, opacity: 0 }}
          animate={{ rotate: 12, x: 65, y: -4, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -16, scale: 1.04, zIndex: 30 }}
          className="absolute w-[95px] sm:w-[130px] md:w-[145px] h-[140px] sm:h-[190px] md:h-[210px] rounded-2xl bg-[#F7EEDD] border-[2.5px] border-[#1C1A17] p-2 sm:p-3 flex flex-col justify-between origin-bottom cursor-pointer group z-10"
          style={{
            boxShadow: '4px 12px 0px rgba(0,0,0,0.35), 0 16px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* Top-Left */}
          <div className="flex flex-col items-start leading-none font-display font-black text-[#B91C1C]">
            <span className="text-base sm:text-2xl tracking-tighter">8</span>
            <span className="text-sm sm:text-lg -mt-1">♦</span>
          </div>
          {/* Center Suit */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl sm:text-6xl text-[#B91C1C]/90 font-serif drop-shadow-sm">♦</span>
          </div>
          {/* Bottom-Right */}
          <div className="flex flex-col items-end leading-none font-display font-black text-[#B91C1C] rotate-180">
            <span className="text-base sm:text-2xl tracking-tighter">8</span>
            <span className="text-sm sm:text-lg -mt-1">♦</span>
          </div>
        </motion.div>

        {/* CARD 5: RED DIAMOND LATTICE CASINO BACK (Far Right, rotated +24deg) */}
        <motion.div
          initial={{ rotate: 0, x: 0, y: 30, opacity: 0 }}
          animate={{ rotate: 24, x: 130, y: 15, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: 2, scale: 1.04, zIndex: 30 }}
          className="absolute w-[95px] sm:w-[130px] md:w-[145px] h-[140px] sm:h-[190px] md:h-[210px] rounded-2xl bg-[#F7EEDD] border-[2.5px] border-[#1C1A17] p-1.5 sm:p-2 origin-bottom cursor-pointer group z-20"
          style={{
            boxShadow: '6px 12px 0px rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* Inner Red & Gold Diamond Lattice Field */}
          <div className="w-full h-full rounded-xl border border-[#540C10] poker-red-lattice relative flex items-center justify-center shadow-inner overflow-hidden">
            {/* Fine Inner Accent Border */}
            <div className="absolute inset-1 rounded-lg border border-amber-200/50 pointer-events-none" />

            {/* Center Gold Medallion with 'U' */}
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#FAF6EE] border border-amber-300 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center z-10">
              <span className="font-mono font-black text-xs sm:text-sm text-[#D35400] leading-none">
                U
              </span>
            </div>
          </div>
        </motion.div>

        {/* =====================================================================
            OVERLAID TYPOGRAPHY (Exactly as in user reference)
            "U IN POKER CITY" + "DECENTRALIZED TEXAS HOLD'EM"
            ===================================================================== */}
        <div className="absolute inset-x-0 bottom-4 sm:bottom-6 md:bottom-8 z-30 flex flex-col items-center justify-center pointer-events-none px-2">
          {/* BOLD OUTLINED VIBRANT ORANGE TITLE */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <h1 className="poker-title-stroke text-3xl sm:text-5xl md:text-6xl tracking-tight leading-none uppercase whitespace-nowrap text-center">
              U IN POKER CITY
            </h1>
          </motion.div>

          {/* VINTAGE GOLD SUBTITLE WITH FLANKING DIVIDER LINES */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex items-center justify-center gap-2 sm:gap-3 mt-1.5 sm:mt-2.5 w-full max-w-[320px] sm:max-w-[440px] md:max-w-[480px]"
          >
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#E5A823] to-[#FFC043] rounded-full shadow-[0_0_6px_rgba(255,192,67,0.6)]" />
            <span className="poker-vintage-gold text-[10px] sm:text-xs md:text-sm tracking-[0.22em] uppercase font-bold whitespace-nowrap drop-shadow-md">
              DECENTRALIZED TEXAS HOLD'EM
            </span>
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#E5A823] to-[#FFC043] rounded-full shadow-[0_0_6px_rgba(255,192,67,0.6)]" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FannedHeroCards;
