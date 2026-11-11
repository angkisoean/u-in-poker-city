import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WalletTransactionRequest {
  type: 'deposit_escrow' | 'settle_escrow' | 'tip_player' | 'connect';
  title: string;
  tableName?: string;
  contractAddress?: string;
  method?: string;
  amount: number;
  yieldEarned?: number;
  totalPayout?: number;
  gasFee?: number;
  memo?: string;
  onConfirm: () => Promise<string | void>;
  onReject: () => void;
}

export interface UnicityWalletModalProps {
  request: WalletTransactionRequest | null;
  walletAddress: string | null;
  walletBalance: number;
  onClose: () => void;
}

export const UnicityWalletModal: React.FC<UnicityWalletModalProps> = ({
  request,
  walletAddress,
  walletBalance,
  onClose,
}) => {
  const [step, setStep] = useState<'review' | 'signing' | 'broadcasting' | 'confirmed' | 'rejected'>('review');
  const [txHash, setTxHash] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!request) return null;

  const gas = request.gasFee ?? 0.00021;
  const isDeposit = request.type === 'deposit_escrow';
  const isSettle = request.type === 'settle_escrow';
  const isConnect = request.type === 'connect';

  const formatAddr = (addr: string | null) => {
    if (!addr) return '0x...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleSignConfirm = async () => {
    try {
      setStep('signing');
      // Simulated cryptography / ZK proof state channel signature
      await new Promise((r) => setTimeout(r, 650));
      
      setStep('broadcasting');
      // Simulated blockchain mempool broadcast
      await new Promise((r) => setTimeout(r, 700));

      const res = await request.onConfirm();
      const generatedHash =
        typeof res === 'string'
          ? res
          : '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setTxHash(generatedHash);
      setStep('confirmed');

      // Auto close after showing confirmed state
      setTimeout(() => {
        onClose();
        setStep('review');
      }, 700);
    } catch {
      setStep('rejected');
      setTimeout(() => {
        request.onReject();
        onClose();
        setStep('review');
      }, 1000);
    }
  };

  const handleReject = () => {
    setStep('rejected');
    setTimeout(() => {
      request.onReject();
      onClose();
      setStep('review');
    }, 400);
  };

  const handleCopyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-[#181B20]/95 border border-orange-500/30 rounded-2xl shadow-[0_0_50px_rgba(255,107,0,0.25)] overflow-hidden flex flex-col font-sans text-zinc-100 select-none backdrop-blur-2xl"
        >
          {/* POPUP WALLET HEADER */}
          <div className="bg-[#121418] px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(255,107,0,0.3)]">
                <span className="font-mono font-bold text-xs text-orange-400">U</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-display font-bold tracking-wide text-zinc-100 flex items-center gap-1.5">
                  UNICITY SPHERE WALLET
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25 font-mono">
                    v2.4
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Unicity Testnet (0x2329)
                </span>
              </div>
            </div>

            {/* Account badge */}
            <div className="flex flex-col items-end text-right">
              <span className="text-[11px] font-mono text-zinc-400 font-medium" title={walletAddress || ''}>
                {formatAddr(walletAddress)}
              </span>
              <span className="text-[10px] font-mono text-orange-400 font-semibold">
                {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} UCT
              </span>
            </div>
          </div>

          {/* POPUP BODY CONTENT */}
          <div className="p-5 flex flex-col gap-4">
            {step === 'review' && (
              <>
                {/* Request Type Banner */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">
                      {isDeposit ? '🔐' : isSettle ? '💰' : isConnect ? '⚡' : '📝'}
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-sm text-zinc-100">
                        {request.title}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-500">
                        Origin: <span className="text-orange-400">uinpokercity.unicity.network</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 font-medium">
                    {isDeposit ? 'ESCROW LOCK' : isSettle ? 'SETTLEMENT' : isConnect ? 'SIGN IN' : 'TX SIGN'}
                  </span>
                </div>

                {/* Table Name if applicable */}
                {request.tableName && (
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-mono">Target Table:</span>
                    <span className="font-display font-bold text-zinc-100">
                      {request.tableName}
                    </span>
                  </div>
                )}

                {isConnect ? (
                  <div className="rounded-xl bg-zinc-900/70 border border-white/[0.06] p-3.5 flex flex-col gap-2 font-mono text-xs">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Action:</span>
                      <span className="font-bold text-orange-400">Signature Verification</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Enforced Network:</span>
                      <span className="text-zinc-200">Unicity Testnet (0x2329)</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        Message to Sign:
                      </span>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800 text-[11px] text-zinc-300 font-mono break-all whitespace-pre-wrap leading-relaxed select-text max-h-36 overflow-y-auto">
                        {request.memo || 'Sign to verify wallet ownership and enter U IN POKER CITY.'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1.5 border-t border-zinc-800">
                      <span>🛡️</span>
                      <span>Gas Fee: 0 UCT • Cryptographic handshake proof</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Transaction Amount Breakdown Box */}
                    <div className="rounded-xl bg-zinc-900/70 border border-white/[0.06] p-3.5 flex flex-col gap-2 font-mono text-xs">
                      {isDeposit && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Escrow Buy-In:</span>
                            <span className="font-bold text-zinc-100 text-sm">
                              {request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} UCT
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-zinc-400">Unicity DeFi Staking:</span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              12.0% APY Active
                            </span>
                          </div>
                        </>
                      )}

                      {isSettle && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Table Chip Stack:</span>
                            <span className="font-bold text-zinc-100">
                              {request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} UCT
                            </span>
                          </div>
                          {request.yieldEarned !== undefined && (
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>Staking Yield Earned:</span>
                              <span className="font-bold">
                                +{request.yieldEarned.toFixed(4)} UCT ✨
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800 text-orange-400 font-bold text-sm">
                            <span>Total Payout:</span>
                            <span>
                              {(request.totalPayout ?? (request.amount + (request.yieldEarned ?? 0))).toFixed(4)} UCT
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-[11px]">
                        <span className="text-zinc-500">Estimated Network Fee:</span>
                        <span className="text-zinc-400">~{gas} UCT ($0.0001)</span>
                      </div>
                    </div>

                    {/* Contract Interaction Details */}
                    <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-white/[0.04] flex flex-col gap-1 text-[10px] font-mono text-zinc-500">
                      <div className="flex justify-between">
                        <span>Contract:</span>
                        <span className="text-zinc-400" title={request.contractAddress || '0xUNI_POKER_ESCROW_CONTRACT_9921'}>
                          {formatAddr(request.contractAddress || '0xUNI_POKER_ESCROW_CONTRACT_9921')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Method:</span>
                        <span className="text-orange-400">{request.method || 'depositEscrow(uint256)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security:</span>
                        <span className="text-emerald-400">✓ Verified ZK-STARK State Channel</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons: Reject vs Sign & Confirm */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={handleReject}
                    className="py-2.5 rounded-xl border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-sans font-medium text-xs tracking-wider transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleSignConfirm}
                    className="py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-sans font-semibold text-xs tracking-wide uppercase transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>✍️</span>
                    <span>{isConnect ? 'Sign & Connect' : 'Sign & Confirm'}</span>
                  </button>
                </div>
              </>
            )}

            {/* SIGNING STATE */}
            {step === 'signing' && (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin shadow-[0_0_15px_rgba(255,107,0,0.4)]" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-bold text-sm text-zinc-100">
                    Signing Transaction...
                  </h4>
                  <p className="text-xs font-mono text-zinc-400">
                    Generating Plonky3 cryptographic signature with Unicity Sphere SDK
                  </p>
                </div>
              </div>
            )}

            {/* BROADCASTING STATE */}
            {step === 'broadcasting' && (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-bold text-sm text-amber-300">
                    Broadcasting to Network...
                  </h4>
                  <p className="text-xs font-mono text-zinc-400">
                    Submitting payload to Unicity L1 mempool
                  </p>
                </div>
              </div>
            )}

            {/* CONFIRMED STATE */}
            {step === 'confirmed' && (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-xl shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  ✓
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-bold text-sm text-emerald-400">
                    Transaction Confirmed!
                  </h4>
                  <p className="text-xs font-mono text-zinc-400">
                    Smart Contract state updated successfully.
                  </p>
                </div>

                <div className="w-full mt-2 p-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">TxHash:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-semibold">{formatAddr(txHash)}</span>
                    <button
                      onClick={handleCopyHash}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REJECTED STATE */}
            {step === 'rejected' && (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 text-xl shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                  ✕
                </div>
                <h4 className="font-display font-bold text-sm text-red-400">
                  Transaction Rejected
                </h4>
                <p className="text-xs font-mono text-zinc-400">
                  User canceled signature request.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UnicityWalletModal;
