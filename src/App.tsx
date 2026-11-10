import { Landing } from './components/Landing.tsx';
import { Lobby } from './components/Lobby.tsx';
import { PokerTable } from './components/PokerTable.tsx';
import { ToastProvider } from './contexts/ToastContext';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandscapePrompt } from './components/LandscapePrompt';
import type { TableTier, ActionPayload } from './engine/types.ts';

function PokerAppContent() {
  const { address, isConnected, connectWallet, openConnectModal, disconnectWallet } = useWallet();
  const {
    isSeated,
    tableState,
    joinTable,
    leaveTable,
    performAction,
    startNewHand,
    seatPlayerAt,
    isActionPending,
  } = useGame();

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      if (!addr) {
        openConnectModal();
      }
    } catch (err) {
      console.warn('Wallet connection cancelled or failed:', err);
      openConnectModal();
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const handleJoinTable = async (tier: TableTier, buyInAmount: number) => {
    try {
      await joinTable(tier, buyInAmount);
    } catch (err) {
      console.error('Failed to join table:', err);
    }
  };

  const handleStandUp = async () => {
    try {
      await leaveTable();
    } catch (err) {
      console.error('Failed to leave table:', err);
    }
  };

  return (
    <div className={`w-full ${isSeated ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#08090B] text-zinc-100`}>
      {/* 1. Landing Screen if not connected */}
      {!isConnected || !address ? (
        <Landing
          walletAddress={null}
          onConnectWallet={handleConnectWallet}
        />
      ) : !isSeated ? (
        /* 2. Lobby Screen if connected but not seated at table */
        <Lobby
          walletAddress={address}
          onDisconnect={handleDisconnect}
          onJoinTable={handleJoinTable}
        />
      ) : (
        /* 3. Poker Table Screen if currently in game */
        <>
          <LandscapePrompt />
          <PokerTable
            onStandUp={handleStandUp}
            onDealNextHand={startNewHand}
            onSeatPlayer={seatPlayerAt}
            tableState={tableState}
            heroPlayerId="hero"
            onAction={(action: ActionPayload) => performAction(action)}
            isActionPending={isActionPending}
          />
        </>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <WalletProvider>
          <GameProvider>
            <PokerAppContent />
          </GameProvider>
        </WalletProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
