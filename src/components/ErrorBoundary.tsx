import { Component, type ErrorInfo, type ReactNode } from 'react';
import { UnicityBrandBadge } from '../components/UnicityBrandBadge';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Unicity Poker ErrorBoundary Caught Exception]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('unicity_sphere_poker_wallet_v2');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#08090B] text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden select-none">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full p-8 rounded-3xl bg-[#12141A]/95 border border-orange-500/30 shadow-[0_0_60px_rgba(255,107,0,0.2)] backdrop-blur-2xl flex flex-col items-center text-center">
            <UnicityBrandBadge label="UNICITY NETWORK" sublabel="STABILITY SHIELD" className="mb-4" />

            <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-2xl text-orange-400 mb-4 shadow-[0_0_25px_rgba(255,107,0,0.25)]">
              ⚡
            </div>

            <h2 className="poker-title-stroke text-2xl tracking-tight uppercase">
              CONNECTION INTERRUPTED
            </h2>

            <p className="font-mono text-xs text-orange-400 font-bold mt-1 tracking-wide">
              RE-SYNCING WITH UNICITY NETWORK...
            </p>

            <p className="font-sans text-xs text-zinc-400 mt-3 leading-relaxed">
              A state channel synchronization or RPC connection timeout occurred. Your escrowed tokens and table state are secured by the Unicity L1 consensus.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] font-mono text-zinc-400 w-full text-left break-all">
                <span className="text-red-400 font-bold">Error:</span> {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={this.handleResetState}
                className="flex-1 py-3 px-4 rounded-xl border border-white/[0.08] bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-sans uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Reset Session
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-sans uppercase tracking-wider font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all cursor-pointer active:scale-95"
              >
                Re-sync & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
