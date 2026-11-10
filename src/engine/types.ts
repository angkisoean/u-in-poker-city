/**
 * U IN POKER CITY - Texas Hold'em Poker Engine Types
 * Pure TypeScript definitions for the Web3 poker platform.
 */

export enum Suit {
  HEARTS = 'HEARTS',
  DIAMONDS = 'DIAMONDS',
  CLUBS = 'CLUBS',
  SPADES = 'SPADES',
}

export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

export interface Card {
  suit: Suit | string;
  rank: Rank | number | string;
  id?: string;
  isFaceUp?: boolean;
}

export enum HandRank {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export enum GameState {
  LOBBY = 'LOBBY',
  POST_BLINDS = 'POST_BLINDS',
  PRE_FLOP = 'PRE_FLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
}

export type GamePhase = 'LOBBY' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export enum PlayerAction {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
}

export interface Player {
  // --- Reverse-Engineered Standard Game-Server State Fields ---
  seatIndex: number;
  walletAddress?: string;
  balance?: number;
  isActive?: boolean;
  cards?: Card[];
  currentBet: number;

  // --- Engine & UI Backward Compatibility Fields ---
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  totalBetInRound: number;
  totalBetInHand?: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  avatar?: string;
  actedThisStreet?: boolean;
  isFolded?: boolean;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isTurn?: boolean;
  tiltLevel?: number;
  address?: string;
  status?: string;
  totalWon?: number;
  timeRemaining?: number;
  isWaitingForNextHand?: boolean;
}

export interface TableTier {
  name: string;
  buyInMin: number;
  buyInMax: number;
  smallBlind: number;
  bigBlind: number;
  // UI metadata
  id?: string;
  tierName?: string;
  icon?: string;
  colorGradient?: string;
  activePlayers?: number;
  maxPlayers?: number;
  tablesCount?: number;
  description?: string;
}

export interface GameConfig {
  tableTier: TableTier;
  maxPlayers: number;
  timeBank: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  bestCards: Card[];
  kickers: number[];
}

export interface WinnerResult {
  playerId: string;
  amount: number;
  hand?: EvaluatedHand;
  potType?: 'main' | 'side';
  potIndex?: number;
}

export interface ValidAction {
  action: PlayerAction;
  minAmount?: number;
  maxAmount?: number;
}

export interface GameContext {
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  gameState: GameState;
  deck: Card[];
  round: number;
  minRaise: number;
  lastRaiseBet: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  winners?: WinnerResult[];
  lastPot?: number;
  config: GameConfig;
}

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';
export type GameStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended' | 'waiting';

// UI State & Interaction types
export interface TableState {
  id?: string;
  name?: string;
  tier?: TableTier;
  // --- Strict Industry Standard Game-Server State Shape ---
  players: (Player | null)[];
  communityCards: Card[];
  pot: number;
  lastPot?: number;
  turnIndex: number; // seatIndex of active acting player
  gamePhase: GamePhase; // LOBBY -> PRE_FLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
  currentBet: number;

  // Supplementary engine & UI metadata
  minRaise?: number;
  yieldEarned?: number;
  gameState?: GameState;
  stage?: GameStage;
  winners?: WinnerResult[];
  dealerIndex?: number;
  dealerSeatIndex?: number;
  currentTurnSeatIndex?: number;
  smallBlindIndex?: number;
  bigBlindIndex?: number;
  turnTimeLimit?: number;
  turnTimeRemaining?: number;
}

export type EmoteId = 'rekt' | 'whale' | 'diamond' | 'ice' | 'moon' | string;

export interface EmoteItem {
  id: EmoteId;
  emoji: string;
  label: string;
  cost: number;
  glowColor: string;
}

export interface ActiveEmote {
  id: string;
  emoteId?: EmoteId;
  emote: EmoteItem;
  fromSeatIndex: number;
  seatIndex?: number;
  toSeatIndex?: number;
  targetSeat?: number;
  timestamp: number;
}

export interface ActionPayload {
  type: ActionType;
  amount?: number;
}
