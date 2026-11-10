import { useState, useEffect, useCallback } from 'react';
import { pokerNetwork, type NetworkTableSync } from '../network/pokerNetworkRelay';
import {
  type TableState,
  type Player,
  type Card,
  type ValidAction,
  type WinnerResult,
  type GameStage,
  type ActionPayload,
  GameState,
  PlayerAction,
  type TableTier,
} from '../engine/types';

export interface UseNetworkPokerEngineProps {
  tableTier: TableTier | null;
  tableId?: string;
  heroAddress?: string | null;
  heroNametag?: string;
  heroBuyIn?: number;
  signMessage?: (message: string) => Promise<string>;
}

export interface UseNetworkPokerEngineReturn {
  tableState: TableState;
  players: (Player | null)[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  currentPlayer: Player | null;
  heroPlayer: Player | null;
  isHeroTurn: boolean;
  validActions: ValidAction[];
  gameState: GameState;
  stage: GameStage;
  winners: WinnerResult[] | undefined;
  isDealing: boolean;
  isOnlineRelayConnected: boolean;
  handleAction: (action: ActionPayload) => Promise<void>;
  startNewHand: () => void;
  seatPlayerAt: (seatIndex: number) => void;
}

export function useNetworkPokerEngine({
  tableTier,
  tableId = 'table-live-1',
  heroAddress,
  heroNametag,
  heroBuyIn = 100,
  signMessage,
}: UseNetworkPokerEngineProps): UseNetworkPokerEngineReturn {
  const [isOnlineRelayConnected, setIsOnlineRelayConnected] = useState<boolean>(pokerNetwork.isRelayConnected);
  const [isDealing, setIsDealing] = useState<boolean>(false);

  // Initialize strictly with real empty seats (6-max) - ZERO MOCK BOTS
  const [syncedState, setSyncedState] = useState<NetworkTableSync>(() => {
    const emptySeats: null[] = [null, null, null, null, null, null];
    return {
      tableId,
      tableName: tableTier?.name || 'Live Unicity Table',
      pot: 0,
      currentBet: tableTier?.bigBlind || 2,
      minRaise: (tableTier?.bigBlind || 2) * 2,
      communityCards: [],
      turnIndex: -1,
      dealerIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 1,
      gamePhase: 'LOBBY',
      stage: 'waiting',
      players: emptySeats,
      winners: undefined,
    };
  });

  // Track connected Hero player
  const heroPlayer = (syncedState.players.find(
    (p) => p && heroAddress && (p.walletAddress?.toLowerCase() === heroAddress.toLowerCase() || p.id === 'hero')
  ) || null) as Player | null;

  // Track current turn player
  const currentPlayer = (syncedState.turnIndex >= 0 && syncedState.players[syncedState.turnIndex]
    ? syncedState.players[syncedState.turnIndex]
    : null) as Player | null;

  const isHeroTurn = Boolean(
    heroPlayer &&
    currentPlayer &&
    currentPlayer.seatIndex === heroPlayer.seatIndex &&
    syncedState.gamePhase !== 'SHOWDOWN' &&
    syncedState.gamePhase !== 'LOBBY'
  );

  // Connect to P2P relay on mount
  useEffect(() => {
    pokerNetwork.connect();

    const unsubConnect = pokerNetwork.on('relay:connected', () => {
      setIsOnlineRelayConnected(true);
      if (heroAddress) {
        pokerNetwork.joinTable(tableId, {
          id: heroAddress,
          name: heroNametag || `User_${heroAddress.slice(2, 6)}`,
          walletAddress: heroAddress,
          chips: heroBuyIn,
          nametag: heroNametag,
        });
      }
    });

    const unsubDisconnect = pokerNetwork.on('relay:disconnected', () => {
      setIsOnlineRelayConnected(false);
    });

    const unsubSync = pokerNetwork.on('TABLE_STATE_SYNC', (data: unknown) => {
      const syncData = data as NetworkTableSync;
      if (syncData && syncData.tableId === tableId) {
        setSyncedState(syncData);
      }
    });

    const unsubJoin = pokerNetwork.on('PLAYER_JOINED', (data: unknown) => {
      const payload = data as { seatIndex: number; player: Player };
      if (payload && payload.player) {
        setSyncedState((prev) => {
          const nextPlayers = [...prev.players];
          nextPlayers[payload.seatIndex] = {
            ...payload.player,
            walletAddress: payload.player.walletAddress || '',
          };
          return { ...prev, players: nextPlayers };
        });
      }
    });

    const unsubLeft = pokerNetwork.on('PLAYER_LEFT', (data: unknown) => {
      const payload = data as { seatIndex: number };
      if (payload) {
        setSyncedState((prev) => {
          const nextPlayers = [...prev.players];
          nextPlayers[payload.seatIndex] = null;
          return { ...prev, players: nextPlayers };
        });
      }
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubSync();
      unsubJoin();
      unsubLeft();
    };
  }, [tableId, heroAddress, heroNametag, heroBuyIn]);

  // If hero enters and seat 0 is empty, seat hero in real network state
  useEffect(() => {
    if (!heroAddress) return;
    const heroSeat: Player = {
      id: heroAddress,
      seatIndex: 0,
      name: heroNametag ? heroNametag.replace(/^@/, '') : `User_${heroAddress.slice(2, 6)}`,
      walletAddress: heroAddress,
      balance: heroBuyIn,
      chips: heroBuyIn,
      currentBet: 0,
      totalBetInRound: 0,
      totalBetInHand: 0,
      isActive: true,
      isFolded: false,
      hasFolded: false,
      isAllIn: false,
      isConnected: true,
      cards: [],
      holeCards: [],
    };

    pokerNetwork.joinTable(tableId, heroSeat);

    setSyncedState((prev) => {
      const alreadySeated = prev.players.some((p) => p && p.walletAddress?.toLowerCase() === heroAddress.toLowerCase());
      if (alreadySeated) return prev;

      const nextPlayers = [...prev.players];
      nextPlayers[0] = {
        ...heroSeat,
        walletAddress: heroSeat.walletAddress || '',
      };

      return {
        ...prev,
        players: nextPlayers,
      };
    });

    return () => {
      pokerNetwork.leaveTable(tableId);
    };
  }, [tableId, heroAddress, heroNametag, heroBuyIn]);

  // Compute real legal actions for hero
  const validActions: ValidAction[] = [];
  if (isHeroTurn && heroPlayer) {
    validActions.push({ action: PlayerAction.FOLD });
    const toCall = syncedState.currentBet - (heroPlayer.currentBet || 0);

    if (toCall <= 0) {
      validActions.push({ action: PlayerAction.CHECK });
    } else {
      validActions.push({
        action: PlayerAction.CALL,
        minAmount: Math.min(toCall, heroPlayer.chips),
        maxAmount: Math.min(toCall, heroPlayer.chips),
      });
    }

    if (heroPlayer.chips > toCall) {
      validActions.push({
        action: PlayerAction.RAISE,
        minAmount: Math.min(syncedState.minRaise, heroPlayer.chips),
        maxAmount: heroPlayer.chips,
      });
    }

    if (heroPlayer.chips > 0) {
      validActions.push({
        action: PlayerAction.ALL_IN,
        minAmount: heroPlayer.chips,
        maxAmount: heroPlayer.chips,
      });
    }
  }

  // Handle Action: Sign off-chain state channel move and emit to relay
  const handleAction = useCallback(
    async (action: ActionPayload) => {
      if (!isHeroTurn || !heroPlayer) return;

      let signature = '';
      if (signMessage) {
        try {
          const payloadToSign = `UnicityStateChannel:action=${action.type}&amount=${action.amount || 0}&table=${tableId}&nonce=${Date.now()}`;
          signature = await signMessage(payloadToSign);
        } catch (err) {
          console.warn('[NetworkPokerEngine] State channel signing rejected:', err);
        }
      }

      // 1. Dispatch over P2P network relay
      pokerNetwork.sendAction(action, signature);

      // 2. Optimistic local update for responsive feel
      setSyncedState((prev) => {
        const nextPlayers = [...prev.players];
        const p = nextPlayers[heroPlayer.seatIndex];
        if (!p) return prev;

        if (action.type === 'fold') {
          p.hasFolded = true;
          p.isFolded = true;
        } else if (action.type === 'call') {
          const pay = Math.min(syncedState.currentBet - p.currentBet, p.chips);
          p.chips -= pay;
          p.currentBet += pay;
        } else if (action.type === 'raise' && action.amount) {
          const diff = action.amount - p.currentBet;
          p.chips -= diff;
          p.currentBet = action.amount;
        }

        return {
          ...prev,
          players: nextPlayers,
          turnIndex: -1, // Wait for network state response
        };
      });
    },
    [isHeroTurn, heroPlayer, signMessage, tableId, syncedState.currentBet]
  );

  const startNewHand = useCallback(() => {
    setIsDealing(true);
    setTimeout(() => setIsDealing(false), 800);
  }, []);

  const seatPlayerAt = useCallback((seatIndex: number) => {
    console.info('[NetworkPokerEngine] Seat selected by remote or prospective player:', seatIndex);
  }, []);

  const resolvedGameState: GameState =
    syncedState.gamePhase === 'SHOWDOWN'
      ? GameState.SHOWDOWN
      : syncedState.gamePhase === 'LOBBY'
      ? GameState.LOBBY
      : GameState.PRE_FLOP;

  const tableState: TableState = {
    id: tableId,
    name: syncedState.tableName,
    tier: tableTier || {
      id: 'table-live',
      name: 'Unicity Live Table',
      tierName: 'Online',
      buyInMin: 1,
      buyInMax: 1000,
      smallBlind: 1,
      bigBlind: 2,
      activePlayers: syncedState.players.filter(Boolean).length,
      maxPlayers: 6,
    },
    pot: syncedState.pot,
    lastPot: syncedState.lastPot ?? syncedState.pot,
    winners: syncedState.winners,
    currentBet: syncedState.currentBet,
    minRaise: syncedState.minRaise,
    communityCards: syncedState.communityCards,
    turnIndex: syncedState.turnIndex,
    gamePhase: syncedState.gamePhase,
    players: syncedState.players.map((p, idx) => {
      if (!p) return null;
      return {
        ...p,
        seatIndex: idx,
        isDealer: idx === syncedState.dealerIndex,
        isSmallBlind: idx === syncedState.smallBlindIndex,
        isBigBlind: idx === syncedState.bigBlindIndex,
        isTurn: idx === syncedState.turnIndex,
      };
    }) as Player[],
    dealerIndex: syncedState.dealerIndex,
    dealerSeatIndex: syncedState.dealerIndex,
    currentTurnSeatIndex: syncedState.turnIndex,
    stage: syncedState.stage,
    gameState: resolvedGameState,
    yieldEarned: 0,
    turnTimeLimit: 20,
    turnTimeRemaining: 20,
  };

  return {
    tableState,
    players: syncedState.players as (Player | null)[],
    communityCards: syncedState.communityCards,
    pot: syncedState.pot,
    currentBet: syncedState.currentBet,
    minRaise: syncedState.minRaise,
    currentPlayer,
    heroPlayer,
    isHeroTurn,
    validActions,
    gameState: resolvedGameState,
    stage: syncedState.stage,
    winners: syncedState.winners,
    isDealing,
    isOnlineRelayConnected,
    handleAction,
    startNewHand,
    seatPlayerAt,
  };
}
