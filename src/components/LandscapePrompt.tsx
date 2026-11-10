import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LandscapePrompt: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width is mobile/tablet size and height > width
      const isMobile = window.innerWidth <= 900;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitMobile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-[#08090B]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(255,107,0,0.25)]">
            📱
          </div>
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-orange-500 text-black flex items-center justify-center text-xs font-bold shadow-md"
          >
            ↻
          </motion.div>
        </div>

        <h3 className="poker-title-stroke text-xl tracking-tight uppercase mb-2">
          PLEASE ROTATE YOUR DEVICE
        </h3>

        <p className="font-mono text-xs text-orange-400 font-bold uppercase tracking-wider mb-3">
          OPTIMIZED FOR LANDSCAPE VIEW
        </p>

        <p className="font-sans text-xs text-zinc-400 max-w-xs leading-relaxed">
          The 6-max Texas Hold'em felt and live off-chain state channel controls require horizontal screen dimensions for the best gameplay experience.
        </p>
      </motion.div>
    </AnimatePresence>
  );
};
