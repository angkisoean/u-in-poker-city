import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../config';

export interface UnicityConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connectionType: 'extension' | 'web_wallet', nametag?: string) => Promise<void>;
  isConnecting?: boolean;
}

export const UnicityConnectModal: React.FC<UnicityConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'extension' | 'web_wallet'>('extension');
  const [nametag, setNametag] = useState<string>('');
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Check if window.sphere or window.unicity extension is injected in the browser
  const hasInjectedSphere =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { sphere?: unknown; unicity?: unknown }).sphere ||
      (window as unknown as { sphere?: unknown; unicity?: unknown }).unicity
    );

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const cleanTag = nametag.trim();
      const finalTag = cleanTag ? (cleanTag.startsWith('@') ? cleanTag : `@${cleanTag}`) : undefined;
      await onConnect(selectedMethod, finalTag);
      onClose();
    } catch (err) {
      console.error('Sphere connection approval error:', err);
    } finally {
      setIsApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-[#12141A]/95 border border-orange-500/40 rounded-3xl shadow-[0_0_50px_rgba(255,107,0,0.25)] overflow-hidden flex flex-col text-zinc-100 backdrop-blur-2xl"
        >
          {/* HEADER */}
          <div className="bg-[#0D0F14] px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.3)]">
                <span className="font-mono font-bold text-sm text-orange-400">U</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-display font-extrabold tracking-wide text-zinc-100 flex items-center gap-1.5">
                  UNICITY SPHERE CONNECT
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25 font-mono">
                    v2.4
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  L1 State Channel Gateway
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-sm cursor-pointer p-1 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="p-6 flex flex-col gap-4">
            {/* dApp Info Banner */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#171A22] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-lg shadow-sm">
                ♠️
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-100">
                  U IN POKER CITY
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Requests connection to your Unicity Wallet
                </span>
              </div>
            </div>

            {/* UNICITY EXTENSION NOT DETECTED ONBOARDING BANNER */}
            {!hasInjectedSphere && selectedMethod === 'extension' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🧩</span>
                  <div className="flex-1">
                    <h5 className="text-xs font-display font-bold text-amber-300">
                      Unicity Wallet Extension Required
                    </h5>
                    <p className="text-[11px] font-sans text-zinc-300 mt-0.5 leading-relaxed">
                      To sign off-chain state channel poker moves directly with your browser extension, please install Unicity Sphere Wallet.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <a
                    href={APP_CONFIG.sphereWalletInstallUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-sans font-extrabold uppercase tracking-wider text-center shadow-sm shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    Install Extension ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('web_wallet')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-sans font-medium text-center border border-white/[0.06] transition-all cursor-pointer"
                  >
                    Use Web Client
                  </button>
                </div>
              </div>
            )}

            {/* Connection Method Tabs */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-sans uppercase tracking-wider text-zinc-400 font-semibold text-[11px]">
                Select Connection Mode
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('extension')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'extension'
                      ? 'bg-orange-500/15 border-orange-500/60 shadow-lg shadow-orange-500/15'
                      : 'bg-[#171A22] border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">🧩</span>
                    {hasInjectedSphere ? (
                      <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
                        Detected
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-amber-400 font-bold">Extension</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-100 mt-1">Sphere Extension</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Official Browser Addon
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('web_wallet')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedMethod === 'web_wallet'
                      ? 'bg-orange-500/15 border-orange-500/60 shadow-lg shadow-orange-500/15'
                      : 'bg-[#171A22] border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  <span className="text-sm">⚡</span>
                  <span className="text-xs font-bold text-zinc-100 mt-1">Sphere Web ID</span>
                  <span className="text-[10px] font-mono text-zinc-400">Instant Testnet Session</span>
                </button>
              </div>
            </div>

            {/* Nametag & Network Config */}
            <div className="p-3.5 rounded-2xl bg-[#171A22] border border-white/[0.06] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-sans">Unicity Nametag:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-400 font-mono text-xs font-bold">@</span>
                  <input
                    type="text"
                    value={nametag.replace(/^@/, '')}
                    onChange={(e) => setNametag(e.target.value)}
                    placeholder="nametag"
                    className="bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 outline-none focus:border-orange-500/50 w-32 text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <span className="text-xs text-zinc-400 font-sans">Enforced Network:</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setNetwork('testnet')}
                    className={`px-2.5 py-1 rounded-md text-[10px] transition-colors cursor-pointer ${
                      network === 'testnet'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Unicity Testnet (0x2329)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetwork('mainnet')}
                    className={`px-2.5 py-1 rounded-md text-[10px] transition-colors cursor-pointer ${
                      network === 'mainnet'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Mainnet
                  </button>
                </div>
              </div>
            </div>

            {/* Requested Scopes */}
            <div className="flex flex-col gap-1.5 text-[11px] font-mono text-zinc-400">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Requested Permissions:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>identity:read — Access public @nametag & address</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>payments:intent — Sign table buy-in & escrow cashouts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>state_channels:sign — Sign zero-gas poker state updates</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isApproving || isConnecting}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-zinc-900 text-zinc-400 font-sans text-xs tracking-wider uppercase cursor-pointer hover:bg-zinc-800 hover:text-white transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isConnecting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-sans font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isApproving || isConnecting ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UnicityConnectModal;
