import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TableTier } from '../engine/types.ts';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';
import { UnicityBrandBadge } from './UnicityBrandBadge.tsx';

export interface LobbyProps {
  walletAddress?: string;
  walletBalance?: number;
  onDisconnect?: () => void;
  onJoinTable?: (tier: TableTier, buyInAmount: number) => void;
  onBack?: () => void;
  className?: string;
}

export interface SubTableInfo {
  id: string;
  tableNumber: number;
  name: string;
  playersCount: number;
  maxSeats: number;
  status: 'In Hand' | 'Waiting';
  avgPot: number;
}

export interface DistrictVisualConfig {
  themeColor: string;
  borderColor: string;
  glowColor: string;
  gradientBadge: string;
  tagline: string;
  accentBg: string;
  btnGradient: string;
  levelBadge: string;
}

export const DISTRICT_VISUALS: Record<string, DistrictVisualConfig> = {
  'table-micro': {
    themeColor: '#FF8533',
    borderColor: 'rgba(255, 133, 51, 0.4)',
    glowColor: 'rgba(255, 133, 51, 0.25)',
    gradientBadge: 'from-orange-500/15 to-amber-600/15 border-orange-500/30 text-orange-300',
    tagline: 'TRAINING GROUNDS • LOW RISK',
    accentBg: 'bg-orange-500/10',
    btnGradient: 'from-orange-500/90 to-amber-600/90 hover:from-orange-400 hover:to-amber-500 text-black shadow-orange-500/20',
    levelBadge: 'ROOKIE FELT',
  },
  'table-low': {
    themeColor: '#FF6B00',
    borderColor: 'rgba(255, 107, 0, 0.45)',
    glowColor: 'rgba(255, 107, 0, 0.3)',
    gradientBadge: 'from-orange-500/20 to-amber-600/20 border-orange-500/40 text-orange-300',
    tagline: 'POPULAR DISTRICT • HIGH ACTION',
    accentBg: 'bg-orange-500/10',
    btnGradient: 'from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-orange-500/30',
    levelBadge: 'CORE ACTION',
  },
  'table-mid': {
    themeColor: '#FFA347',
    borderColor: 'rgba(255, 163, 71, 0.45)',
    glowColor: 'rgba(255, 163, 71, 0.3)',
    gradientBadge: 'from-amber-500/20 to-orange-600/20 border-amber-500/40 text-amber-300',
    tagline: 'SPHERE CASINO • SERIOUS GRIND',
    accentBg: 'bg-amber-500/10',
    btnGradient: 'from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-amber-500/30',
    levelBadge: 'PRO STAKES',
  },
  'table-high': {
    themeColor: '#FFC043',
    borderColor: 'rgba(255, 192, 67, 0.5)',
    glowColor: 'rgba(255, 192, 67, 0.35)',
    gradientBadge: 'from-amber-400/20 to-yellow-600/20 border-amber-400/50 text-amber-200',
    tagline: 'VIP HIGH ROLLERS • WHALE ARENA',
    accentBg: 'bg-amber-500/10',
    btnGradient: 'from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-amber-400/30',
    levelBadge: 'WHALE LOUNGE',
  },
};

export const TABLE_TIERS: TableTier[] = [
  {
    id: 'table-micro',
    name: 'Trainee District',
    tierName: 'Tier 1: 1 - 100',
    buyInMin: 1,
    buyInMax: 100,
    smallBlind: 0.5,
    bigBlind: 1.0,
    icon: '♠️',
    colorGradient: 'orange',
    activePlayers: 48,
    maxPlayers: 6,
    tablesCount: 10,
    description: 'Entry-level felt for testing strategies and quick practice runs.',
  },
  {
    id: 'table-low',
    name: 'Neon Street',
    tierName: 'Tier 2: 100 - 1,000',
    buyInMin: 100,
    buyInMax: 1000,
    smallBlind: 5.0,
    bigBlind: 10.0,
    icon: '♣️',
    colorGradient: 'orange',
    activePlayers: 132,
    maxPlayers: 6,
    tablesCount: 10,
    description: 'The pulsing heart of Poker City. Fast pace and high volume.',
  },
  {
    id: 'table-mid',
    name: 'Sphere Casino',
    tierName: 'Tier 3: 1,000 - 10,000',
    buyInMin: 1000,
    buyInMax: 10000,
    smallBlind: 50.0,
    bigBlind: 100.0,
    icon: '♦️',
    colorGradient: 'orange',
    activePlayers: 64,
    maxPlayers: 6,
    tablesCount: 10,
    description: 'High roller tables with deep stacks and serious stakes.',
  },
  {
    id: 'table-high',
    name: 'Unicity High Rollers',
    tierName: 'Tier 4: 10,000 - 50,000',
    buyInMin: 10000,
    buyInMax: 50000,
    smallBlind: 500.0,
    bigBlind: 1000.0,
    icon: '👑',
    colorGradient: 'orange',
    activePlayers: 19,
    maxPlayers: 6,
    tablesCount: 10,
    description: 'Whale-exclusive penthouse suites with massive pots.',
  },
];

// Generates 10 realistic tables for each of the 4 table districts
export function generateDistrictTables(tier: TableTier): SubTableInfo[] {
  const presets = [
    { count: 2, status: 'In Hand' as const },
    { count: 3, status: 'In Hand' as const },
    { count: 4, status: 'In Hand' as const },
    { count: 2, status: 'Waiting' as const },
    { count: 5, status: 'In Hand' as const },
    { count: 3, status: 'Waiting' as const },
    { count: 6, status: 'In Hand' as const },
    { count: 2, status: 'In Hand' as const },
    { count: 4, status: 'Waiting' as const },
    { count: 3, status: 'In Hand' as const },
  ];

  return presets.map((p, idx) => {
    const num = idx + 1;
    const numStr = num < 10 ? `0${num}` : `${num}`;
    return {
      id: `${tier.id}-t${num}`,
      tableNumber: num,
      name: `Table #${numStr}`,
      playersCount: p.count,
      maxSeats: 6,
      status: p.status,
      avgPot: +(tier.bigBlind * (p.count * 2.8)).toFixed(2),
    };
  });
}

export const Lobby: React.FC<LobbyProps> = ({
  walletAddress: propWalletAddress,
  walletBalance: propWalletBalance,
  onDisconnect: propOnDisconnect,
  onJoinTable: propOnJoinTable,
  onBack,
  className = '',
}) => {
  const wallet = useWallet();
  const game = useGame();

  const walletAddress = propWalletAddress ?? wallet.address ?? '0x71C8394b2A43d5268c70f612d7c0fE668b94f9A';
  const walletBalance = propWalletBalance ?? wallet.balance;
  const handleDisconnect = propOnDisconnect ?? wallet.disconnectWallet;
  const handleJoinTableAction = propOnJoinTable ?? ((tier: TableTier, amount: number) => game.joinTable(tier, amount));

  const [viewingDistrict, setViewingDistrict] = useState<TableTier | null>(null);
  const [selectedSubTable, setSelectedSubTable] = useState<{
    tier: TableTier;
    subTable: SubTableInfo;
  } | null>(null);

  const [buyInAmount, setBuyInAmount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleOpenTableBuyIn = (tier: TableTier, subTable: SubTableInfo) => {
    setSelectedSubTable({ tier, subTable });
    setBuyInAmount(Math.round((tier.buyInMin + tier.buyInMax) / 2));
  };

  const handleConfirmJoin = async () => {
    if (selectedSubTable) {
      setIsSubmitting(true);
      const chosenTier: TableTier = {
        ...selectedSubTable.tier,
        name: `${selectedSubTable.tier.name} (${selectedSubTable.subTable.name})`,
        activePlayers: selectedSubTable.subTable.playersCount,
      };
      const chosenAmount = buyInAmount;
      try {
        await handleJoinTableAction(chosenTier, chosenAmount);
        setSelectedSubTable(null);
      } catch (err) {
        console.warn('Escrow transaction cancelled or failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const activeDistrictTables = viewingDistrict ? generateDistrictTables(viewingDistrict) : [];
  const isInsufficient = selectedSubTable ? buyInAmount > walletBalance : false;

  return (
    <div className={`relative min-h-screen bg-[#08090B] flex flex-col justify-between overflow-x-hidden ${className}`}>
      {/* Dynamic Cyber Ambient Glow Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-[30rem] h-[30rem] bg-amber-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#1a1d24_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* =========================================================================
          TOP NAVBAR
          ========================================================================= */}
      <header className="relative z-20 shrink-0 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-white/[0.08] bg-[#0E1015]/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {viewingDistrict ? (
            <button
              onClick={() => setViewingDistrict(null)}
              className="py-1.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-sans font-medium flex items-center gap-1.5"
              title="Back to Districts"
            >
              <span>←</span>
              <span>Back to Districts</span>
            </button>
          ) : onBack ? (
            <button
              onClick={onBack}
              className="py-1.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-sans font-medium"
              title="Return"
            >
              ← Back
            </button>
          ) : null}

          <UnicityBrandBadge label="UNICITY NETWORK" sublabel="TESTNET" />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="poker-title-stroke text-base sm:text-lg tracking-tight uppercase">
                U IN POKER CITY
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 font-mono font-bold">
                {viewingDistrict ? (viewingDistrict.tierName || 'DISTRICT').toUpperCase() : 'TESTNET LOBBY'}
              </span>
            </div>
            <span className="text-[10px] font-sans text-zinc-400 hidden sm:inline">
              Decentralized ZK Texas Hold'em • Sphere Testnet v2.4
            </span>
          </div>
        </div>

        {/* Wallet Info Badge, Faucet & Disconnect */}
        <div className="flex items-center gap-2.5">
          {/* Testnet Faucet Button */}
          <button
            onClick={() => {
              wallet.claimFaucet(5000);
            }}
            disabled={wallet.isProcessing}
            className="py-1.5 px-3 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-400 hover:text-orange-300 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Claim 5,000 free UCT tokens"
          >
            <span>🚰</span>
            <span className="hidden sm:inline">+5,000</span>
            <span>UCT Faucet</span>
          </button>

          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#16191F]/90 border border-white/[0.08] backdrop-blur-md shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <div className="flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                {wallet.nametag && (
                  <span className="font-mono text-xs font-bold text-orange-400">
                    {wallet.nametag}
                  </span>
                )}
                <span className="font-mono text-[10px] text-zinc-400" title={walletAddress}>
                  ({formatAddress(walletAddress)})
                </span>
              </div>
              <span className="font-mono font-bold text-xs text-zinc-100">
                {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-orange-400">UCT</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="py-1.5 px-3 rounded-xl border border-zinc-800 hover:border-red-500/30 bg-zinc-900/80 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Disconnect</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          VIEW 1: THE 4 DISTRICT CARDS (Tiers Selection - Visual Overhaul)
          ========================================================================= */}
      {!viewingDistrict ? (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col justify-center">
          {/* Header Banner Section */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#14171E]/90 via-[#191D26]/80 to-[#14171E]/90 p-6 rounded-3xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                  Live Districts
                </span>
                <span className="text-zinc-500 text-xs">•</span>
                <span className="text-zinc-400 text-xs font-mono">40 Tables Online</span>
              </div>
              <h2 className="poker-title-stroke text-2xl sm:text-3xl tracking-tight uppercase">
                AVAILABLE <span className="text-white">DISTRICTS</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="poker-vintage-gold text-xs tracking-[0.16em] uppercase">
                  NO-LIMIT TEXAS HOLD'EM • 10 ACTIVE TABLES PER DISTRICT
                </span>
              </div>
              <p className="text-xs sm:text-sm font-sans text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                Choose your stakes bracket. Each district contains 10 active poker tables with live occupancy. Select any district to browse open seats.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-950/80 border border-orange-500/40 text-xs font-mono text-zinc-200 shadow-[0_0_20px_rgba(255,107,0,0.15)]">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shadow-[0_0_10px_#FF6B00]" />
                <span className="text-orange-400 font-extrabold text-sm">+12.0% APY</span>
                <span className="text-zinc-400">Auto-Yield Active</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Escrow deposits earn native staking yield while seated
              </span>
            </div>
          </div>

          {/* The 4 Districts Premium Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TABLE_TIERS.map((tier, idx) => {
              const visualKey = tier.id || 'table-low';
              const visual = DISTRICT_VISUALS[visualKey] || DISTRICT_VISUALS['table-low'];

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  onClick={() => setViewingDistrict(tier)}
                  style={{
                    boxShadow: `0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 0 20px -5px ${visual.glowColor}`,
                  }}
                  className="group relative rounded-3xl p-6 bg-gradient-to-b from-[#191D26] to-[#12141A] border border-white/[0.08] hover:border-[rgba(255,255,255,0.25)] flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Glowing Top Edge Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${visual.themeColor}, transparent)`,
                    }}
                  />

                  {/* Ambient Radiant Glow Orb */}
                  <div
                    className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: visual.themeColor }}
                  />

                  {/* Card Main Content */}
                  <div>
                    {/* Top Row: Icon Pod + Tier Level Pill */}
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-lg group-hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: `${visual.themeColor}15`,
                          borderColor: `${visual.themeColor}40`,
                          boxShadow: `0 0 20px ${visual.glowColor}`,
                        }}
                      >
                        {tier.icon}
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className="text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border mb-1"
                          style={{
                            color: visual.themeColor,
                            borderColor: `${visual.themeColor}40`,
                            backgroundColor: `${visual.themeColor}15`,
                          }}
                        >
                          {visual.levelBadge}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 font-bold">
                          {tier.tierName}
                        </span>
                      </div>
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="font-display font-extrabold text-xl text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2">
                      <span>{tier.name}</span>
                    </h3>
                    <p className="text-[11px] font-mono font-medium mt-1 uppercase tracking-wider" style={{ color: visual.themeColor }}>
                      {visual.tagline}
                    </p>
                    <p className="text-xs font-sans text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {tier.description}
                    </p>

                    {/* Stakes Dashboard Box */}
                    <div className="mt-5 p-4 rounded-2xl bg-black/40 border border-white/[0.06] backdrop-blur-md flex flex-col gap-2.5 font-mono text-xs">
                      {/* Buy-In Row */}
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-[11px]">Buy-In Bracket:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-zinc-100 text-sm">
                            {tier.buyInMin.toLocaleString()} - {tier.buyInMax.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400">UCT</span>
                        </div>
                      </div>

                      {/* Blinds Row */}
                      <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
                        <span className="text-zinc-400 text-[11px]">Table Blinds:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-sm" style={{ color: visual.themeColor }}>
                            {tier.smallBlind} / {tier.bigBlind}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: visual.themeColor }}>UCT</span>
                        </div>
                      </div>

                      {/* Active Tables Count Row */}
                      <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
                        <span className="text-zinc-400 text-[11px]">Available Tables:</span>
                        <span className="text-emerald-400 flex items-center gap-1.5 font-bold text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse" />
                          10 Tables (Browse)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Open District CTA Button */}
                  <div className="mt-6 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingDistrict(tier);
                      }}
                      className={`w-full py-3 px-4 rounded-2xl bg-gradient-to-r ${visual.btnGradient} font-display font-extrabold text-xs tracking-wider uppercase shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <span>Open District Tables</span>
                      <span className="text-sm font-bold">→</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>
      ) : (
        /* =========================================================================
            VIEW 2: THE 10 TABLES LIST FOR THE CHOSEN DISTRICT
            ========================================================================= */
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col justify-center">
          {/* District Header Bar */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#14171E]/90 border border-white/[0.08] backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3.5">
              <span className="text-4xl p-3 rounded-2xl bg-zinc-900 border border-white/[0.08] shadow-md">
                {viewingDistrict.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="poker-title-stroke text-xl sm:text-2xl tracking-tight uppercase">
                    {viewingDistrict.name}
                  </h2>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold">
                    {viewingDistrict.tierName}
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Blinds: <span className="text-orange-400 font-bold">{viewingDistrict.smallBlind} / {viewingDistrict.bigBlind} UCT</span> • Buy-In: {viewingDistrict.buyInMin.toLocaleString()} - {viewingDistrict.buyInMax.toLocaleString()} UCT • 10 Active Tables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewingDistrict(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-sans font-medium transition-all cursor-pointer shadow-sm active:scale-95"
              >
                ← Switch District
              </button>
            </div>
          </div>

          {/* Clean 10 Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeDistrictTables.map((subTable) => {
              const emptySeats = subTable.maxSeats - subTable.playersCount;
              const isFull = subTable.playersCount >= subTable.maxSeats;

              return (
                <div
                  key={subTable.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                    isFull
                      ? 'bg-zinc-900/40 border-white/[0.04] opacity-60'
                      : 'bg-gradient-to-r from-[#171A22] to-[#13151B] border-white/[0.08] hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(255,107,0,0.15)]'
                  }`}
                >
                  {/* Left: Table Identifier & Status */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-950 border border-white/[0.08] flex items-center justify-center font-mono font-bold text-sm text-orange-400 shadow-inner">
                      #{subTable.tableNumber < 10 ? `0${subTable.tableNumber}` : subTable.tableNumber}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-zinc-100">
                          {subTable.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                            subTable.status === 'In Hand'
                              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {subTable.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
                        <span>Avg Pot: <span className="text-zinc-200 font-bold">{subTable.avgPot} UCT</span></span>
                        <span>•</span>
                        <span className="text-zinc-400">
                          {subTable.playersCount}/{subTable.maxSeats} Players Seated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Seat Availability Badge + Join CTA */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="font-mono text-xs font-bold text-zinc-200">
                        {subTable.playersCount}/{subTable.maxSeats}
                      </span>
                      <span className={`text-[10px] font-mono font-medium ${emptySeats > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {emptySeats > 0 ? `${emptySeats} open seats` : 'Table full'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenTableBuyIn(viewingDistrict, subTable)}
                      disabled={isFull}
                      className={`py-2 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-sm ${
                        isFull
                          ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-400 text-black cursor-pointer shadow-orange-500/20 active:scale-95'
                      }`}
                    >
                      {isFull ? 'Full' : 'Join Table'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 w-full text-center py-4 text-xs font-mono text-zinc-500 border-t border-white/[0.04]">
        U IN POKER CITY • Zero-Knowledge State Channel Poker • Unicity Network
      </footer>

      {/* =========================================================================
          BUY-IN ESCROW MODAL: Sliders, Presets, Yield Staking, Wallet Signing
          ========================================================================= */}
      <AnimatePresence>
        {selectedSubTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-[#16191F]/95 backdrop-blur-2xl p-6 rounded-3xl border border-orange-500/40 relative shadow-[0_0_50px_rgba(255,107,0,0.25)]"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedSubTable(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl p-2 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                  {selectedSubTable.tier.icon}
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-zinc-100">
                    {selectedSubTable.tier.name} — {selectedSubTable.subTable.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-orange-400">
                      Blinds: {selectedSubTable.tier.smallBlind} / {selectedSubTable.tier.bigBlind} UCT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
                      {selectedSubTable.subTable.playersCount}/{selectedSubTable.subTable.maxSeats} Players Seated
                    </span>
                  </div>
                </div>
              </div>

              {/* Slider for Buy-in Amount */}
              <div className="my-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-sans uppercase tracking-wider text-zinc-400 font-medium">
                    Lock Escrow Buy-In
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-bold text-orange-400">
                      {buyInAmount.toLocaleString()}
                    </span>
                    <span className="font-mono text-xs text-orange-400 font-bold">UCT</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={selectedSubTable.tier.buyInMin}
                  max={selectedSubTable.tier.buyInMax}
                  step={selectedSubTable.tier.buyInMin >= 10000 ? 500 : selectedSubTable.tier.buyInMin >= 1000 ? 100 : selectedSubTable.tier.buyInMin >= 100 ? 10 : 1}
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />

                <div className="flex justify-between text-[11px] font-mono text-zinc-500 px-1">
                  <span>Min: {selectedSubTable.tier.buyInMin.toLocaleString()} UCT</span>
                  <span>Max: {selectedSubTable.tier.buyInMax.toLocaleString()} UCT</span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setBuyInAmount(selectedSubTable.tier.buyInMin)}
                    className="flex-1 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Min
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBuyInAmount(
                        Math.round((selectedSubTable.tier.buyInMin + selectedSubTable.tier.buyInMax) / 2)
                      )
                    }
                    className="flex-1 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white cursor-pointer transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyInAmount(selectedSubTable.tier.buyInMax)}
                    className="flex-1 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* DeFi Yield Escrow Info */}
              <div className="mb-4 p-3 rounded-2xl bg-zinc-900/80 border border-orange-500/20 text-xs font-mono text-zinc-300 flex items-center justify-between">
                <span>⚡ Unicity Auto-Staking Yield:</span>
                <span className="font-bold text-orange-400">+12.0% APY</span>
              </div>

              {/* Insufficient balance warning */}
              {isInsufficient && (
                <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    Insufficient balance. You have {walletBalance.toFixed(2)} UCT, but selected{' '}
                    {buyInAmount} UCT. Use the Faucet button above to claim more.
                  </span>
                </div>
              )}

              {/* Confirm / Action Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubTable(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-zinc-900 text-zinc-400 font-sans text-xs tracking-wider uppercase cursor-pointer hover:bg-zinc-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={isInsufficient || isSubmitting}
                  className={`flex-1 py-2.5 rounded-xl font-sans font-bold text-xs tracking-wider uppercase transition-all shadow-md ${
                    isInsufficient || isSubmitting
                      ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'
                      : 'bg-orange-500 hover:bg-orange-400 text-black cursor-pointer shadow-orange-500/20 active:scale-95'
                  }`}
                >
                  {isSubmitting ? 'Locking Escrow...' : 'Deposit & Sit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lobby;
