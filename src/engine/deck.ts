import { type Card, Rank, Suit } from './types';

/**
 * Creates a standard 52-card deck for Texas Hold'em (4 suits x 13 ranks).
 * Every card has a guaranteed unique ID: `${suit}_${rank}`.
 */
export function createDeck(): Card[] {
  const suits: Suit[] = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
  const ranks: Rank[] = [
    Rank.TWO,
    Rank.THREE,
    Rank.FOUR,
    Rank.FIVE,
    Rank.SIX,
    Rank.SEVEN,
    Rank.EIGHT,
    Rank.NINE,
    Rank.TEN,
    Rank.JACK,
    Rank.QUEEN,
    Rank.KING,
    Rank.ACE,
  ];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}_${rank}`,
        isFaceUp: false,
      });
    }
  }

  return deck;
}

/**
 * Cryptographically secure RNG float in range [0, 1).
 * Uses window.crypto or globalThis.crypto with 32-bit entropy.
 */
export function getCryptoRandom(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const uint32 = new Uint32Array(1);
    globalThis.crypto.getRandomValues(uint32);
    return uint32[0] / 4294967296;
  }
  return Math.random();
}

/**
 * Creates a 32-bit XorShift pseudorandom number generator for provably fair deterministic replay.
 * @param seed 32-bit unsigned integer seed
 */
export function createXorshift32(seed: number): () => number {
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates deck shuffle with cryptographic RNG or optional provably-fair seed simulation.
 * Pure function: does not mutate input deck.
 *
 * @param deck The deck of cards to shuffle
 * @param seed Optional numeric seed for deterministic shuffle (Xorshift32)
 */
export function shuffleDeck(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  const rng = seed !== undefined ? createXorshift32(seed) : getCryptoRandom;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled;
}

/**
 * Deals a specified number of cards from the top of the deck.
 * Pure function: does not mutate the input deck.
 *
 * @param deck Current deck of cards
 * @param count Number of cards to deal
 * @returns Object with dealt cards and remaining deck
 */
export function dealCards(
  deck: Card[],
  count: number
): { dealt: Card[]; remaining: Card[] } {
  if (count < 0) {
    throw new Error('Count cannot be negative');
  }
  const takeCount = Math.min(count, deck.length);
  const dealt = deck.slice(0, takeCount);
  const remaining = deck.slice(takeCount);

  return { dealt, remaining };
}

/**
 * Standard poker dealer burn card step. Burns 1 card face down from top of deck.
 */
export function burnCard(deck: Card[]): { burned: Card | null; remaining: Card[] } {
  if (deck.length === 0) {
    return { burned: null, remaining: [] };
  }
  return {
    burned: deck[0],
    remaining: deck.slice(1),
  };
}

/**
 * Formats any raw card rank (number 2-14 or string) into poker face notation:
 * 14 -> 'A', 13 -> 'K', 12 -> 'Q', 11 -> 'J', 10 -> '10', 2-9 -> '2'-'9'.
 */
export function formatRankDisplay(rank: Rank | number | string | undefined): string {
  if (rank === undefined || rank === null) return '';
  const str = String(rank).trim().toUpperCase();
  if (str === '14' || str === 'A' || str === 'ACE') return 'A';
  if (str === '13' || str === 'K' || str === 'KING') return 'K';
  if (str === '12' || str === 'Q' || str === 'QUEEN') return 'Q';
  if (str === '11' || str === 'J' || str === 'JACK') return 'J';
  if (str === '10' || str === 'T' || str === 'TEN') return '10';

  const num = typeof rank === 'number' ? rank : parseInt(str, 10);
  if (!isNaN(num)) {
    if (num === 14 || num === Rank.ACE) return 'A';
    if (num === 13 || num === Rank.KING) return 'K';
    if (num === 12 || num === Rank.QUEEN) return 'Q';
    if (num === 11 || num === Rank.JACK) return 'J';
    if (num === 10 || num === Rank.TEN) return '10';
    if (num >= 2 && num <= 9) return String(num);
  }
  return str;
}

/**
 * Helper to get a human-readable display string for a card (e.g. "A♠", "10♥", "2♣").
 */
export function cardToString(card: Card): string {
  const suitSymbols: Record<Suit | string, string> = {
    [Suit.SPADES]: '♠',
    [Suit.HEARTS]: '♥',
    [Suit.DIAMONDS]: '♦',
    [Suit.CLUBS]: '♣',
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
  };

  const r = formatRankDisplay(card.rank);
  const s = suitSymbols[card.suit] ?? String(card.suit);
  return `${r}${s}`;
}

/**
 * Verifies that a collection of cards contains NO duplicate cards.
 */
export function verifyCardsUniqueness(cards: Card[]): boolean {
  const ids = new Set<string>();
  for (const c of cards) {
    const id = c.id || `${c.suit}_${c.rank}`;
    if (ids.has(id)) {
      return false;
    }
    ids.add(id);
  }
  return true;
}
