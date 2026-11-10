import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeGame,
  handlePlayerAction,
  getValidActions,
  resetForNewHand,
  advanceState,
  determineWinners,
} from '../engine/pokerEngine';
import {
  type GameContext,
  type GameConfig,
  type Player,
  type Card,
  type ValidAction,
  type WinnerResult,
  type TableState,
  type GameStage,
  type GamePhase,
  type ActionPayload,
  type ActionType,
  GameState,
  PlayerAction,
} from '../engine/types';

export interface UsePokerEngineOptions {
  config: GameConfig;
  initialPlayers: Player[];
  heroId?: string;
  autoAdvanceAi?: boolean;
  aiDelayMs?: number;
}

export interface UsePokerEngineReturn {
  context: GameContext;
  tableState: TableState;
  players: Player[];
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
  handleAction: (action: PlayerAction | ActionType | ActionPayload, amount?: number) => void;
  startNewHand: () => void;
  resetGame: (newConfig?: GameConfig, newPlayers?: Player[]) => void;
  addPlayer: (newPlayer: Player) => void;
}

/**
 * Maps engine GameState to standard GamePhase
 */
export function mapGameStateToGamePhase(state: GameState): GamePhase {
  switch (state) {
    case GameState.LOBBY:
      return 'LOBBY';
    case GameState.POST_BLINDS:
    case GameState.PRE_FLOP:
      return 'PRE_FLOP';
    case GameState.FLOP:
      return 'FLOP';
    case GameState.TURN:
      return 'TURN';
    case GameState.RIVER:
      return 'RIVER';
    case GameState.SHOWDOWN:
      return 'SHOWDOWN';
    default:
      return 'LOBBY';
  }
}

/**
 * Maps engine GameState to UI GameStage
 */
export function mapGameStateToStage(state: GameState): GameStage {
  switch (state) {
    case GameState.LOBBY:
      return 'waiting';
    case GameState.POST_BLINDS:
    case GameState.PRE_FLOP:
      return 'preflop';
    case GameState.FLOP:
      return 'flop';
    case GameState.TURN:
      return 'turn';
    case GameState.RIVER:
      return 'river';
    case GameState.SHOWDOWN:
      return 'showdown';
    default:
      return 'waiting';
  }
}

/**
 * Normalizes any string action to PlayerAction enum
 */
export function normalizePlayerAction(rawAction: PlayerAction | ActionType | string): PlayerAction {
  const norm = String(rawAction).toUpperCase().replace('-', '_');
  switch (norm) {
    case 'FOLD':
      return PlayerAction.FOLD;
    case 'CHECK':
      return PlayerAction.CHECK;
    case 'CALL':
      return PlayerAction.CALL;
    case 'RAISE':
      return PlayerAction.RAISE;
    case 'ALL_IN':
    case 'ALLIN':
      return PlayerAction.ALL_IN;
    default:
      return PlayerAction.CHECK;
  }
}

/**
 * usePokerEngine
 * Core custom hook managing Texas Hold'em state machine, reactive updates,
 * dealing animations, and AI opponent turn dispatching.
 */
export function usePokerEngine({
  config,
  initialPlayers,
  heroId = 'hero',
  autoAdvanceAi = true,
  aiDelayMs = 1200,
}: UsePokerEngineOptions): UsePokerEngineReturn {
  // Initialize context and auto post blinds & deal cards
  const [context, setContext] = useState<GameContext>(() => {
    try {
      const initial = initializeGame(config, initialPlayers);
      return resetForNewHand(initial);
    } catch {
      return initializeGame(config, initialPlayers);
    }
  });

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current active player whose turn it is
  const currentPlayer =
    context.currentPlayerIndex >= 0 && context.currentPlayerIndex < context.players.length
      ? context.players[context.currentPlayerIndex]
      : null;

  const heroPlayer = context.players.find((p) => p.id === heroId) || null;
  const isHeroTurn = Boolean(
    currentPlayer &&
      currentPlayer.id === heroId &&
      context.gameState !== GameState.SHOWDOWN &&
      context.gameState !== GameState.LOBBY
  );

  // Compute valid actions for current player
  const validActions = currentPlayer
    ? getValidActions(context, currentPlayer.id)
    : [];

  /**
   * Action handler for hero or system dispatch
   */
  const handleAction = useCallback(
    (actionInput: PlayerAction | ActionType | ActionPayload, amount?: number) => {
      let resolvedAction: PlayerAction;
      let resolvedAmount = amount;

      if (typeof actionInput === 'object' && 'type' in actionInput) {
        resolvedAction = normalizePlayerAction(actionInput.type);
        resolvedAmount = actionInput.amount ?? amount;
      } else {
        resolvedAction = normalizePlayerAction(actionInput);
      }

      setContext((prevContext) => {
        if (!currentPlayer) return prevContext;
        try {
          const updated = handlePlayerAction(
            prevContext,
            currentPlayer.id,
            resolvedAction,
            resolvedAmount
          );
          return updated;
        } catch (err) {
          console.warn('[PokerEngine] handlePlayerAction warning:', err);
          return prevContext;
        }
      });
    },
    [currentPlayer]
  );

  /**
   * Start a new hand (resets deck, moves dealer button, posts blinds)
   */
  const startNewHand = useCallback(() => {
    setIsDealing(true);
    setContext((prev) => {
      try {
        const next = resetForNewHand(prev);
        return next;
      } catch (err) {
        console.warn('[PokerEngine] Failed to reset for new hand:', err);
        return prev;
      }
    });

    setTimeout(() => {
      setIsDealing(false);
    }, 800);
  }, []);

  /**
   * Reset game with fresh config and players
   */
  const resetGame = useCallback(
    (newConfig?: GameConfig, newPlayers?: Player[]) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

      const cfg = newConfig || config;
      const pl = newPlayers || initialPlayers;
      try {
        const initial = initializeGame(cfg, pl);
        const started = resetForNewHand(initial);
        setContext(started);
      } catch {
        // fallback
      }
    },
    [config, initialPlayers]
  );

  /**
   * Adds a player to the table dynamically (e.g. joins mid-game).
   */
  const addPlayer = useCallback((newPlayer: Player) => {
    setContext((prev) => {
      if (prev.players.some((p) => p.id === newPlayer.id || p.seatIndex === newPlayer.seatIndex)) {
        return prev;
      }

      const isHandInProgress =
        prev.gameState !== GameState.LOBBY && prev.gameState !== GameState.SHOWDOWN;

      const playerToAdd: Player = {
        ...newPlayer,
        isWaitingForNextHand: isHandInProgress,
        hasFolded: isHandInProgress,
        holeCards: [],
        cards: [],
        currentBet: 0,
        totalBetInRound: 0,
        actedThisStreet: isHandInProgress,
      };

      const updatedPlayers = [...prev.players, playerToAdd].sort(
        (a, b) => a.seatIndex - b.seatIndex
      );

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  }, []);

  /**
   * ANTI-STUCK WATCHDOG: Ensures game never hangs indefinitely
   * If a player is marked turn but cannot act (or is disconnected/all-in), or if turn hangs >25s
   */
  useEffect(() => {
    if (context.gameState === GameState.SHOWDOWN || context.gameState === GameState.LOBBY) {
      return;
    }

    // Check if current player is invalid or can't act
    const nonFolded = context.players.filter((p) => !p.hasFolded && !p.isWaitingForNextHand);
    if (nonFolded.length <= 1) {
      setContext((prev) => determineWinners(prev).context);
      return;
    }

    const canActCount = context.players.filter(
      (p) => !p.hasFolded && !p.isAllIn && p.chips > 0 && !p.isWaitingForNextHand
    ).length;

    // If 1 or 0 players can act (all others all-in), advance state automatically
    if (canActCount <= 1) {
      const timer = setTimeout(() => {
        setContext((prev) => advanceState(prev));
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Safety watchdog for invalid current player index
    if (context.currentPlayerIndex < 0 || context.currentPlayerIndex >= context.players.length) {
      const timer = setTimeout(() => {
        setContext((prev) => advanceState(prev));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [context.gameState, context.players, context.currentPlayerIndex]);

  /**
   * AI Opponent Automation Loop
   */
  useEffect(() => {
    if (!autoAdvanceAi) return;
    if (context.gameState === GameState.SHOWDOWN || context.gameState === GameState.LOBBY) return;
    if (!currentPlayer || currentPlayer.id === heroId) return;

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }

    const delay = aiDelayMs + Math.floor(Math.random() * 600);
    aiTimerRef.current = setTimeout(() => {
      setContext((prev) => {
        const aiPlayer = prev.players[prev.currentPlayerIndex];
        if (!aiPlayer || aiPlayer.id === heroId) return prev;

        const options = getValidActions(prev, aiPlayer.id);
        if (options.length === 0) {
          // If no actions valid, advance automatically
          return advanceState(prev);
        }

        const canCheck = options.some((o) => o.action === PlayerAction.CHECK);
        const callOption = options.find((o) => o.action === PlayerAction.CALL);
        const raiseOption = options.find((o) => o.action === PlayerAction.RAISE);
        const allInOption = options.find((o) => o.action === PlayerAction.ALL_IN);

        let chosenAction = PlayerAction.FOLD;
        let chosenAmount: number | undefined;

        const rand = Math.random();

        if (canCheck) {
          if (rand < 0.75) {
            chosenAction = PlayerAction.CHECK;
          } else if (rand < 0.95 && raiseOption && raiseOption.minAmount) {
            chosenAction = PlayerAction.RAISE;
            chosenAmount = raiseOption.minAmount;
          } else {
            chosenAction = PlayerAction.CHECK;
          }
        } else if (callOption) {
          const toCall = callOption.minAmount || (prev.currentBet - aiPlayer.currentBet);
          const potOdds = toCall / (prev.pot + toCall);

          if (potOdds < 0.35) {
            if (rand < 0.70) {
              chosenAction = PlayerAction.CALL;
            } else if (rand < 0.90 && raiseOption && raiseOption.minAmount) {
              chosenAction = PlayerAction.RAISE;
              chosenAmount = raiseOption.minAmount;
            } else {
              chosenAction = PlayerAction.FOLD;
            }
          } else {
            if (rand < 0.45) {
              chosenAction = PlayerAction.CALL;
            } else if (rand < 0.90) {
              chosenAction = PlayerAction.FOLD;
            } else if (raiseOption && raiseOption.minAmount) {
              chosenAction = PlayerAction.RAISE;
              chosenAmount = raiseOption.minAmount;
            } else if (allInOption) {
              chosenAction = PlayerAction.CALL;
            } else {
              chosenAction = PlayerAction.FOLD;
            }
          }
        } else if (allInOption) {
          chosenAction = rand < 0.5 ? PlayerAction.ALL_IN : PlayerAction.FOLD;
          chosenAmount = aiPlayer.chips;
        }

        try {
          return handlePlayerAction(prev, aiPlayer.id, chosenAction, chosenAmount);
        } catch (err) {
          console.warn('[AI action failed, falling back to check/fold]', err);
          if (canCheck) {
            return handlePlayerAction(prev, aiPlayer.id, PlayerAction.CHECK);
          }
          return handlePlayerAction(prev, aiPlayer.id, PlayerAction.FOLD);
        }
      });
    }, delay);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [context, currentPlayer, heroId, autoAdvanceAi, aiDelayMs]);

  /**
   * Auto Showdown advancement: When hand finishes at showdown, wait 8 seconds
   */
  useEffect(() => {
    if (context.gameState === GameState.SHOWDOWN) {
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);

      showdownTimerRef.current = setTimeout(() => {
        // Auto rebuy any player with chips <= 0 so game continues seamlessly
        setContext((prev) => {
          const activeWithChips = prev.players.filter((p) => p.chips > 0 && p.isConnected);
          if (activeWithChips.length < 2) {
            // Re-fund bankrupt bots with tier buyInMin
            prev.players.forEach((p) => {
              if (p.chips <= 0 && p.id !== heroId) {
                p.chips = prev.config.tableTier.buyInMin * 2;
                p.balance = p.chips;
                p.hasFolded = false;
                p.isAllIn = false;
              }
            });
          }
          return prev;
        });

        startNewHand();
      }, 8000);
    }

    return () => {
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    };
  }, [context.gameState, context.players, heroId, startNewHand]);

  // Transform internal GameContext to UI TableState
  const stage = mapGameStateToStage(context.gameState);
  const gamePhase = mapGameStateToGamePhase(context.gameState);
  const turnIndex =
    context.currentPlayerIndex >= 0 && context.players[context.currentPlayerIndex]
      ? context.players[context.currentPlayerIndex].seatIndex ?? context.currentPlayerIndex
      : -1;

  const tableState: TableState = {
    id: 'unicity-table-main',
    name: context.config.tableTier.name,
    tier: context.config.tableTier,
    pot: context.gameState === GameState.SHOWDOWN ? (context.lastPot ?? context.pot) : Math.round(context.pot),
    lastPot: context.lastPot ?? context.pot,
    winners: context.winners,
    currentBet: context.currentBet,
    minRaise: context.minRaise,
    communityCards: context.communityCards,
    turnIndex,
    gamePhase,
    players: context.players.map((p, idx) => {
      const isTurn = idx === context.currentPlayerIndex;
      const isActive = !p.hasFolded && p.isConnected;
      const cards = p.holeCards || [];
      const balance = p.chips;
      const walletAddress =
        p.walletAddress || p.address || ('0x' + p.id.replace(/[^a-zA-Z0-9]/g, '').padEnd(40, '0')).slice(0, 42);

      return {
        ...p,
        seatIndex: p.seatIndex !== undefined ? p.seatIndex : idx,
        walletAddress,
        balance,
        chips: balance,
        isActive,
        cards,
        holeCards: cards,
        isFolded: p.hasFolded,
        isDealer: idx === context.dealerIndex,
        isSmallBlind: idx === context.smallBlindIndex,
        isBigBlind: idx === context.bigBlindIndex,
        isTurn,
      };
    }),
    dealerIndex: context.dealerIndex,
    dealerSeatIndex: context.dealerIndex,
    currentTurnSeatIndex: turnIndex,
    stage,
    gameState: context.gameState,
    yieldEarned: 0,
    turnTimeLimit: 20,
    turnTimeRemaining: 20,
  };

  return {
    context,
    tableState,
    players: context.players,
    communityCards: context.communityCards,
    pot: context.pot,
    currentBet: context.currentBet,
    minRaise: context.minRaise,
    currentPlayer,
    heroPlayer,
    isHeroTurn,
    validActions,
    gameState: context.gameState,
    stage,
    winners: context.winners,
    isDealing,
    handleAction,
    startNewHand,
    resetGame,
    addPlayer,
  };
}

export default usePokerEngine;
