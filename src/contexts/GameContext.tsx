import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useWallet } from './WalletContext';
import { usePokerEngine } from '../hooks/usePokerEngine';
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
  type ActionType,
  type GameConfig,
  GameState,
  PlayerAction,
} from '../engine/types';

export interface GameContextValue {
  isSeated: boolean;
  activeTier: TableTier | null;
  buyInAmount: number;
  gameState: GameState;
  stage: GameStage;
  players: Player[];
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
  joinTable: (tier: TableTier, buyIn: number) => Promise<void>;
  leaveTable: () => Promise<number>;
  performAction: (action: PlayerAction | ActionType | ActionPayload, amount?: number) => void;
  startNewHand: () => void;
  seatPlayerAt: (seatIndex: number, name?: string, avatar?: string) => void;
}

const DEFAULT_TIER: TableTier = {
  id: 'table-low',
  name: 'Table 2: Neon Street',
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
};

const DEFAULT_CONFIG: GameConfig = {
  tableTier: DEFAULT_TIER,
  maxPlayers: 6,
  timeBank: 20,
};

// Cyber AI Bot Opponents
const AI_ROSTER = [
  { id: 'bot-1', name: 'CyberViper', avatar: '🐍', tiltLevel: 35 },
  { id: 'bot-2', name: 'NeonSamurai', avatar: '⚔️', tiltLevel: 15 },
  { id: 'bot-3', name: 'ZK_Phantom', avatar: '👻', tiltLevel: 42 },
  { id: 'bot-4', name: 'Satoshi_Ghost', avatar: '⚡', tiltLevel: 20 },
  { id: 'bot-5', name: 'GlitchQueen', avatar: '👑', tiltLevel: 65 },
];

function generateOpponents(tier: TableTier, heroBuyIn: number): Player[] {
  const opponentCount = Math.max(1, Math.min(5, tier.activePlayers ? tier.activePlayers - 1 : 1));
  const assignedSeats = [3, 1, 4, 2, 5];

  return AI_ROSTER.slice(0, opponentCount).map((bot, idx) => {
    const seatIndex = assignedSeats[idx] || (idx + 1);
    const variance = (Math.random() * 0.2 - 0.1) * heroBuyIn;
    const chips = Math.max(tier.buyInMin, +(heroBuyIn + variance).toFixed(2));
    const walletAddress = `0xBot_${bot.id.replace(/[^a-zA-Z0-9]/g, '')}_${seatIndex}`.padEnd(42, '0');

    return {
      seatIndex,
      walletAddress,
      balance: chips,
      isActive: true,
      cards: [],
      currentBet: 0,
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      chips,
      holeCards: [],
      totalBetInRound: 0,
      totalBetInHand: 0,
      hasFolded: false,
      isFolded: false,
      isAllIn: false,
      isConnected: true,
      tiltLevel: bot.tiltLevel,
      isWaitingForNextHand: false,
    };
  });
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { address, nametag, promptTransaction, depositYield, isProcessing: isWalletBusy } = useWallet();
  const { showToast } = useToast();

  const [isSeated, setIsSeated] = useState<boolean>(false);
  const [activeTier, setActiveTier] = useState<TableTier | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(0);
  const [seatedTimestamp, setSeatedTimestamp] = useState<number>(0);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  // Tilt Meter integration
  const tiltMeter = useTiltMeter(20);

  // Initial player list
  const defaultPlayers: Player[] = useMemo(() => {
    const heroAddress = address || '0x71C8394b2A43d5268c70f612d7c0fE668b94f9A';
    const heroName = nametag ? nametag.replace(/^@/, '') : address ? `Neo_${address.slice(2, 6)}` : 'Satoshi_Hero';
    const hero: Player = {
      seatIndex: 0,
      walletAddress: heroAddress,
      balance: 500,
      isActive: true,
      cards: [],
      currentBet: 0,
      id: 'hero',
      name: heroName,
      address: heroAddress,
      chips: 500,
      holeCards: [],
      totalBetInRound: 0,
      totalBetInHand: 0,
      hasFolded: false,
      isFolded: false,
      isAllIn: false,
      isConnected: true,
      tiltLevel: 15,
    };
    return [hero, ...generateOpponents(DEFAULT_TIER, 500)];
  }, [address, nametag]);

  // Core poker engine hook
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
    handleAction,
    startNewHand,
    resetGame,
    addPlayer,
  } = usePokerEngine({
    config: DEFAULT_CONFIG,
    initialPlayers: defaultPlayers,
    heroId: 'hero',
    autoAdvanceAi: true,
    aiDelayMs: 1400,
  });

  // Real-time DeFi yield on seated buy-in (~12% APY, updates every second)
  const { yieldEarned, yieldRate } = useYield(
    isSeated ? buyInAmount : 0,
    seatedTimestamp,
    0.12
  );

  /**
   * Join a poker table: locks buy-in via wallet transaction, seats hero with bots ONLY AFTER SUCCESS
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
        // 1. Lock buy-in tokens via Unicity wallet transaction popup
        const tableContractAddress = APP_CONFIG.tableFactoryAddress;
        await promptTransaction({
          type: 'deposit_escrow',
          title: 'Sign Escrow Lock (Table Buy-In)',
          tableName: tier.name,
          contractAddress: tableContractAddress,
          method: 'depositBuyIn(uint256 amount)',
          amount: buyIn,
          memo: `Buy-in escrow for ${tier.name}`,
        });

        // 2. Set seated state and start yield clock ONLY after transaction resolves successfully
        setActiveTier(tier);
        setBuyInAmount(buyIn);
        const now = Date.now();
        setSeatedTimestamp(now);
        setIsSeated(true);

        // 3. Create fresh table configuration
        const gameConfig: GameConfig = {
          tableTier: tier,
          maxPlayers: tier.maxPlayers || 6,
          timeBank: 20,
        };

        // 4. Create Hero and AI opponents
        const heroAddress = address || '0x71C8394b2A43d5268c70f612d7c0fE668b94f9A';
        const heroName = nametag ? nametag.replace(/^@/, '') : address ? `Neo_${address.slice(2, 6)}` : 'Satoshi_Hero';
        const hero: Player = {
          seatIndex: 0,
          walletAddress: heroAddress,
          balance: buyIn,
          isActive: true,
          cards: [],
          currentBet: 0,
          id: 'hero',
          name: heroName,
          address: heroAddress,
          chips: buyIn,
          holeCards: [],
          totalBetInRound: 0,
          totalBetInHand: 0,
          hasFolded: false,
          isFolded: false,
          isAllIn: false,
          isConnected: true,
          tiltLevel: 15,
        };

        const opponents = generateOpponents(tier, buyIn);
        const seatedPlayers = [hero, ...opponents];

        // 5. Initialize poker engine and reset tilt meter
        tiltMeter.resetTilt();
        resetGame(gameConfig, seatedPlayers);

        showToast({
          type: 'success',
          title: 'Table Seated',
          message: `Welcome to ${tier.name}! Good luck on the felt.`,
        });
      } catch (err) {
        console.warn('[joinTable] Escrow lock cancelled or failed:', err);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [address, nametag, promptTransaction, resetGame, tiltMeter, isWalletBusy, isActionPending, showToast]
  );

  /**
   * Leave table: settles current chip stack + accumulated yield back to wallet ONLY AFTER SUCCESS
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
      // 1. Prompt Unicity Wallet Settlement Modal
      await promptTransaction({
        type: 'settle_escrow',
        title: 'Sign Escrow Settlement & Cash Out',
        tableName: activeTier?.name || 'Table 2 (Low)',
        contractAddress: APP_CONFIG.tableFactoryAddress,
        method: 'settleAndReleaseEscrow(address,uint256,uint256)',
        amount: finalChips,
        yieldEarned: yieldEarned,
        totalPayout: totalSettlement,
        memo: 'Release table escrow and claim staking yields',
      });

      // 2. Return chips & yield to player's wallet balance ONLY AFTER confirmed settlement
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
        message: `Successfully cashed out ${totalSettlement} UCT to your wallet.`,
      });

      return totalSettlement;
    } catch (err) {
      console.warn('[leaveTable] Escrow settlement cancelled or failed:', err);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [heroPlayer, yieldEarned, activeTier, promptTransaction, depositYield, tiltMeter, isWalletBusy, isActionPending, showToast]);

  /**
   * Perform action as hero: guards against spam / concurrent requests
   */
  const performAction = useCallback(
    (actionInput: PlayerAction | ActionType | ActionPayload, amount?: number) => {
      if (isActionPending || isWalletBusy) {
        return;
      }

      let rawAction = '';
      let actionAmount = amount;

      if (typeof actionInput === 'object' && 'type' in actionInput) {
        rawAction = actionInput.type;
        actionAmount = actionInput.amount ?? amount;
      } else {
        rawAction = String(actionInput);
      }

      // Record voluntary or aggressive behavior on hero's tilt meter
      tiltMeter.recordAction(rawAction, actionAmount);

      // Delegate to poker engine
      handleAction(actionInput, amount);
    },
    [handleAction, tiltMeter, isActionPending, isWalletBusy]
  );

  /**
   * Dynamically seat a player at an empty seat.
   */
  const seatPlayerAt = useCallback(
    (seatIndex: number, name?: string, avatar?: string) => {
      const tier = activeTier || DEFAULT_TIER;
      const buyIn = buyInAmount || tier.buyInMin * 2;

      // Check if seat is already occupied
      const occupied = players.some((p) => p && p.seatIndex === seatIndex);
      if (occupied) return;

      const usedIds = new Set(players.map((p) => p.id));
      const nextBot = AI_ROSTER.find((b) => !usedIds.has(b.id)) || {
        id: `player-${Date.now()}`,
        name: name || `Player_${seatIndex + 1}`,
        avatar: avatar || '🎲',
        tiltLevel: 20,
      };

      const variance = (Math.random() * 0.2 - 0.1) * buyIn;
      const chips = Math.max(tier.buyInMin, +(buyIn + variance).toFixed(2));
      const walletAddress = `0xBot_${nextBot.id.replace(/[^a-zA-Z0-9]/g, '')}_${seatIndex}`.padEnd(42, '0');

      const newPlayer: Player = {
        seatIndex,
        walletAddress,
        balance: chips,
        isActive: true,
        cards: [],
        currentBet: 0,
        id: nextBot.id,
        name: name || nextBot.name,
        avatar: avatar || nextBot.avatar,
        chips,
        holeCards: [],
        totalBetInRound: 0,
        totalBetInHand: 0,
        hasFolded: false,
        isFolded: false,
        isAllIn: false,
        isConnected: true,
        tiltLevel: nextBot.tiltLevel,
      };

      addPlayer(newPlayer);
    },
    [activeTier, buyInAmount, players, addPlayer]
  );

  // Total real-time value: Hero's table chips + earned staking yield
  const totalChipValue = heroPlayer ? +(heroPlayer.chips + yieldEarned).toFixed(4) : 0;

  // Enhance tableState with live yieldEarned and active tier
  const augmentedTableState: TableState = useMemo(() => {
    return {
      ...tableState,
      tier: activeTier || tableState.tier,
      yieldEarned,
      players: tableState.players.map((p) => {
        if (!p) return null;
        if (p.id === 'hero') {
          return {
            ...p,
            tiltLevel: tiltMeter.tiltLevel,
          };
        }
        return p;
      }),
    };
  }, [tableState, activeTier, yieldEarned, tiltMeter.tiltLevel]);

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
    joinTable,
    leaveTable,
    performAction,
    startNewHand,
    seatPlayerAt,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

/**
 * useGame Hook
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
