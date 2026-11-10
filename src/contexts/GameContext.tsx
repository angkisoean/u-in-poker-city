import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useWallet } from './WalletContext';
import { useNetworkPokerEngine } from '../hooks/useNetworkPokerEngine';
import { useYield } from '../hooks/useYield';
import { useTiltMeter, type UseTiltMeterReturn } from '../hooks/useTiltMeter';
import { useToast } from './ToastContext';
import { APP_CONFIG } from '../config';
import {
  type TableTier,
  type Player,
  type Card,
  type ValidAction,
  type WinnerResult,
  type TableState,
  type GameStage,
  type ActionPayload,
  GameState,
} from '../engine/types';

export interface GameContextValue {
  isSeated: boolean;
  activeTier: TableTier | null;
  buyInAmount: number;
  gameState: GameState;
  stage: GameStage;
  players: (Player | null)[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  currentPlayer: Player | null;
  heroPlayer: Player | null;
  isHeroTurn: boolean;
  isActionPending: boolean;
  validActions: ValidAction[];
  tableState: TableState;
  winners: WinnerResult[] | undefined;
  isDealing: boolean;
  yieldEarned: number;
  yieldRate: number;
  totalChipValue: number;
  tiltMeter: UseTiltMeterReturn;
  isOnlineRelayConnected: boolean;
  joinTable: (tier: TableTier, buyIn: number) => Promise<void>;
  leaveTable: () => Promise<number>;
  performAction: (action: ActionPayload) => Promise<void>;
  startNewHand: () => void;
  seatPlayerAt: (seatIndex: number) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { address, nametag, promptTransaction, depositYield, isProcessing: isWalletBusy, signMessage } = useWallet();
  const { showToast } = useToast();

  const [isSeated, setIsSeated] = useState<boolean>(false);
  const [activeTier, setActiveTier] = useState<TableTier | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(0);
  const [seatedTimestamp, setSeatedTimestamp] = useState<number>(0);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  const tiltMeter = useTiltMeter(20);

  // Networked Poker Engine Hook - strictly online multiplayer, NO OFFLINE BOTS
  const {
    tableState,
    players,
    communityCards,
    pot,
    currentBet,
    minRaise,
    currentPlayer,
    heroPlayer,
    isHeroTurn,
    validActions,
    gameState,
    stage,
    winners,
    isDealing,
    isOnlineRelayConnected,
    handleAction,
    startNewHand,
    seatPlayerAt,
  } = useNetworkPokerEngine({
    tableTier: activeTier,
    tableId: activeTier ? `table-${activeTier.id}` : 'table-live-1',
    heroAddress: address,
    heroNametag: nametag,
    heroBuyIn: buyInAmount,
    signMessage,
  });

  const { yieldEarned, yieldRate } = useYield(
    isSeated ? buyInAmount : 0,
    seatedTimestamp,
    0.12
  );

  /**
   * Real Network Table Join: signs escrow deposit on Unicity Testnet
   */
  const joinTable = useCallback(
    async (tier: TableTier, buyIn: number) => {
      if (isWalletBusy || isActionPending) {
        showToast({
          type: 'warning',
          title: 'Operation In Progress',
          message: 'Please wait for the current Web3 transaction to complete.',
        });
        return;
      }

      setIsActionPending(true);
      try {
        const tableContractAddress = APP_CONFIG.tableFactoryAddress;
        await promptTransaction({
          type: 'deposit_escrow',
          title: 'Sign Escrow Lock (Live Table Buy-In)',
          tableName: tier.name,
          contractAddress: tableContractAddress,
          method: 'depositBuyIn(uint256 amount)',
          amount: buyIn,
          memo: `Buy-in escrow for ${tier.name}`,
        });

        setActiveTier(tier);
        setBuyInAmount(buyIn);
        setSeatedTimestamp(Date.now());
        setIsSeated(true);
        tiltMeter.resetTilt();

        showToast({
          type: 'success',
          title: 'Table Seated (Online)',
          message: `Connected to ${tier.name}. Waiting for network players...`,
        });
      } catch (err) {
        console.warn('[joinTable] Escrow lock cancelled or failed:', err);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [promptTransaction, tiltMeter, isWalletBusy, isActionPending, showToast]
  );

  /**
   * Real Network Table Leave: settles chip balance back to Unicity wallet
   */
  const leaveTable = useCallback(async (): Promise<number> => {
    if (isWalletBusy || isActionPending) {
      showToast({
        type: 'warning',
        title: 'Operation In Progress',
        message: 'Please wait for current operation to finish.',
      });
      return 0;
    }

    const finalChips = heroPlayer ? heroPlayer.chips : 0;
    const totalSettlement = +(finalChips + yieldEarned).toFixed(4);

    setIsActionPending(true);
    try {
      await promptTransaction({
        type: 'settle_escrow',
        title: 'Sign Escrow Settlement & Cash Out',
        tableName: activeTier?.name || 'Live Table',
        contractAddress: APP_CONFIG.tableFactoryAddress,
        method: 'settleAndReleaseEscrow(address,uint256,uint256)',
        amount: finalChips,
        yieldEarned: yieldEarned,
        totalPayout: totalSettlement,
        memo: 'Release table escrow and claim staking yields',
      });

      if (totalSettlement > 0) {
        depositYield(totalSettlement);
      }

      setIsSeated(false);
      setActiveTier(null);
      setBuyInAmount(0);
      setSeatedTimestamp(0);
      tiltMeter.resetTilt();

      showToast({
        type: 'success',
        title: 'Table Left & Settled',
        message: `Settled ${totalSettlement} UCT directly to your Unicity Testnet balance.`,
      });

      return totalSettlement;
    } catch (err) {
      console.warn('[leaveTable] Settlement cancelled or failed:', err);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [heroPlayer, yieldEarned, activeTier, promptTransaction, depositYield, tiltMeter, isWalletBusy, isActionPending, showToast]);

  const performAction = useCallback(
    async (actionInput: ActionPayload) => {
      if (isActionPending || isWalletBusy) return;
      tiltMeter.recordAction(actionInput.type, actionInput.amount);
      await handleAction(actionInput);
    },
    [handleAction, tiltMeter, isActionPending, isWalletBusy]
  );

  const totalChipValue = heroPlayer ? +(heroPlayer.chips + yieldEarned).toFixed(4) : 0;

  const augmentedTableState: TableState = useMemo(() => {
    return {
      ...tableState,
      tier: activeTier || tableState.tier,
      yieldEarned,
      players: tableState.players.map((p) => {
        if (!p) return null;
        if (p.id === 'hero' || (address && p.walletAddress?.toLowerCase() === address.toLowerCase())) {
          return {
            ...p,
            tiltLevel: tiltMeter.tiltLevel,
          };
        }
        return p;
      }) as Player[],
    };
  }, [tableState, activeTier, yieldEarned, tiltMeter.tiltLevel, address]);

  const value: GameContextValue = {
    isSeated,
    activeTier,
    buyInAmount,
    gameState,
    stage,
    players,
    communityCards,
    pot,
    currentBet,
    minRaise,
    currentPlayer,
    heroPlayer,
    isHeroTurn,
    isActionPending: isActionPending || isWalletBusy,
    validActions,
    tableState: augmentedTableState,
    winners,
    isDealing,
    yieldEarned,
    yieldRate,
    totalChipValue,
    tiltMeter,
    isOnlineRelayConnected,
    joinTable,
    leaveTable,
    performAction,
    startNewHand,
    seatPlayerAt,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
