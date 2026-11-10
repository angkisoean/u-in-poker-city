import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card.tsx';
import { ChipStack } from './ChipStack.tsx';
import { UnicityBrandBadge } from './UnicityBrandBadge.tsx';
import { FannedHeroCards } from './FannedHeroCards.tsx';
import { useNetworkStats } from '../hooks/useNetworkStats.ts';

export interface LandingProps {
  walletAddress?: string | null;
  onConnectWallet?: () => void;
  onEnterLobby?: () => void;
  className?: string;
}

export const Landing: React.FC<LandingProps> = ({
  walletAddress: propWalletAddress,
  onConnectWallet,
  onEnterLobby,
  className = '',
}) => {
  const stats = useNetworkStats();
  const [internalAddress, setInternalAddress] = useState<string | null>(propWalletAddress || null);
  const walletAddress = propWalletAddress !== undefined ? propWalletAddress : internalAddress;

  const handleConnect = () => {
    if (onConnectWallet) {
      onConnectWallet();
    } else {
      setInternalAddress('0x71C8394b2A43d5268c70f612d7c0fE668b94f9A');
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between items-center overflow-x-hidden bg-[#08090B] text-zinc-100 select-none ${className}`}
    >
      {/* =========================================================================
          BACKGROUND AMBIENCE: Floating Vintage Cards & Casino Glows
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Warm Ambient Orange Glows */}
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-orange-500/[0.07] blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] rounded-full bg-orange-500/[0.05] blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full bg-orange-500/[0.05] blur-[120px]" />

        {/* Ambient Subtle Poker Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,107,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating Background Card 1 (Ace of Spades) */}
        <div className="absolute top-24 left-[5%] animate-float-slow opacity-30 hidden lg:block">
          <Card card={{ suit: 'spades', rank: 'A' }} faceUp={true} size="md" />
        </div>

        {/* Floating Background Card 2 (Red Casino Lattice Back) */}
        <div className="absolute top-28 right-[6%] animate-float-reverse opacity-40 hidden lg:block">
          <Card card={{ suit: 'hearts', rank: 'K' }} faceUp={false} size="md" />
        </div>

        {/* Floating Background Card 3 (Queen of Hearts) */}
        <div className="absolute bottom-32 left-[7%] animate-float-reverse opacity-25 hidden xl:block">
          <Card card={{ suit: 'hearts', rank: 'Q' }} faceUp={true} size="sm" />
        </div>

        {/* Floating Background Card 4 (Red Casino Lattice Back) */}
        <div className="absolute bottom-36 right-[8%] animate-float-slow opacity-30 hidden xl:block">
          <Card card={{ suit: 'diamonds', rank: 'J' }} faceUp={false} size="sm" />
        </div>

        {/* Floating Chip Stacks */}
        <div className="absolute top-[32%] left-[12%] animate-float-reverse opacity-35 hidden 2xl:block">
          <ChipStack amount={500} showLabel={false} size="sm" />
        </div>
        <div className="absolute top-[42%] right-[11%] animate-float-slow opacity-40 hidden 2xl:block">
          <ChipStack amount={1000} showLabel={false} size="md" />
        </div>
      </div>

      {/* =========================================================================
          TOP NAVIGATION: Brand Badge & Testnet Status
          ========================================================================= */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 z-20 flex items-center justify-between">
        {/* Authentic Unicity Brand Badge matching user reference */}
        <UnicityBrandBadge label="UNICITY NETWORK" sublabel="TESTNET" />

        {/* Testnet Network Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#121418]/90 border border-orange-500/35 backdrop-blur-md text-xs font-mono text-zinc-300 shadow-[0_0_15px_rgba(255,107,0,0.15)]">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#FF6B00]" />
          <span className="font-semibold text-orange-400">Sphere Testnet Active</span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">v2.4</span>
        </div>
      </header>

      {/* =========================================================================
          CENTER HERO SECTION: Interactive Fanned Cards & Retro Branding
          ========================================================================= */}
      <main className="z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto my-auto py-4 sm:py-8">
        {/* Phase Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-orange-500/35 mb-2 backdrop-blur-xl shadow-lg"
        >
          <span className="text-orange-400 text-xs">⚡</span>
          <span className="font-mono text-xs uppercase tracking-widest text-orange-400 font-bold">
            PHASE 1: PUBLIC TESTNET PLAYGROUND
          </span>
          <span className="text-orange-400 text-xs">⚡</span>
        </motion.div>

        {/* INTERACTIVE FANNED PLAYING CARDS WITH OUTLINED TITLE */}
        <FannedHeroCards />

        {/* Narrative Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-2 text-xs sm:text-sm md:text-base font-sans text-zinc-400 max-w-xl tracking-normal leading-relaxed"
        >
          Zero-Knowledge P2P State Channel Poker on{' '}
          <span className="text-orange-400 font-semibold">Unicity Blockchain</span>.
          No house edge, instant off-chain moves, and provably fair cryptographic shuffling.
        </motion.p>

        {/* 3 TACTILE CASINO FEATURE CHIPS */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left"
        >
          {/* Feature 1 */}
          <div className="p-3.5 rounded-2xl bg-[#14161B]/90 border border-white/[0.08] hover:border-orange-500/40 backdrop-blur-md shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🛡️</span>
              <span className="font-display font-bold text-xs text-zinc-100 group-hover:text-orange-400 transition-colors">
                Mental Poker ZK
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Multi-party cryptographic card shuffle. No one can see cards before reveal.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-3.5 rounded-2xl bg-[#14161B]/90 border border-white/[0.08] hover:border-orange-500/40 backdrop-blur-md shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚡</span>
              <span className="font-display font-bold text-xs text-zinc-100 group-hover:text-orange-400 transition-colors">
                State Channel P2P
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Sub-second actions signed with Sphere Connect v2.4. Zero gas per bet.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-3.5 rounded-2xl bg-[#14161B]/90 border border-white/[0.08] hover:border-orange-500/40 backdrop-blur-md shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">✨</span>
              <span className="font-display font-bold text-xs text-zinc-100 group-hover:text-orange-400 transition-colors">
                +12% APY Yield
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Table buy-in escrow earns continuous auto-staking yield while you play.
            </p>
          </div>
        </motion.div>

        {/* CTA BUTTON SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-7 flex flex-col items-center gap-3"
        >
          {!walletAddress ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnect}
              className="px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-sans font-black text-sm sm:text-base tracking-wide uppercase cursor-pointer shadow-[0_0_30px_rgba(255,107,0,0.45)] border-2 border-amber-300/60 flex items-center gap-2.5 transition-all duration-200"
            >
              <span>⚡</span>
              <span>Connect Unicity Sphere Wallet</span>
            </motion.button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="px-4 py-2.5 rounded-2xl bg-[#14161B]/95 border border-white/[0.12] backdrop-blur-md flex items-center gap-2.5 shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                <span className="font-mono text-xs text-zinc-400">Connected:</span>
                <span className="font-mono font-bold text-xs text-orange-400">
                  {formatAddress(walletAddress)}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onEnterLobby}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-sans font-black text-sm sm:text-base tracking-wide uppercase cursor-pointer shadow-[0_0_25px_rgba(255,107,0,0.4)] border border-amber-300/60 flex items-center gap-2 transition-all duration-200"
              >
                <span>Enter Testnet Casino Floor</span>
                <span>→</span>
              </motion.button>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Sphere Connect v2.4 • Direct Extension Handshake • Real-Time On-Chain Balance</span>
          </div>
        </motion.div>
      </main>

      {/* =========================================================================
          BOTTOM STATS BAR: Testnet Metrics
          ========================================================================= */}
      <footer className="w-full z-10 py-5 px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="max-w-3xl mx-auto bg-[#14161B]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl py-3 px-6 flex flex-wrap items-center justify-around gap-4 text-center shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-xs font-mono text-zinc-400">Testnet Players:</span>
            <span className="text-xs font-mono font-bold text-zinc-100">
              {stats.totalPlayers.toLocaleString()}
            </span>
          </div>

          <div className="hidden sm:block text-zinc-700">|</div>

          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xs">♠</span>
            <span className="text-xs font-mono text-zinc-400">Active Tables:</span>
            <span className="text-xs font-mono font-bold text-orange-400">
              {stats.activeTablesCount} (4 Districts)
            </span>
          </div>

          <div className="hidden sm:block text-zinc-700">|</div>

          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xs">✨</span>
            <span className="text-xs font-mono text-zinc-400">Testnet UCT Volume:</span>
            <span className="text-xs font-mono font-bold text-orange-400">
              {stats.totalVolume.toLocaleString()} UCT
            </span>
          </div>
        </motion.div>
      </footer>
    </div>
  );
};

export default Landing;
