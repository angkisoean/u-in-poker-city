import { type Card, type EvaluatedHand, HandRank, Rank } from './types';

/**
 * Normalizes any card rank (number or string like 'A', 'K', '10') to its integer rank value 2-14.
 */
export function toNumericRank(rank: Rank | number | string): number {
  if (typeof rank === 'number') return rank;
  switch (rank) {
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    case '10':
    case 'T': return 10;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
    default: {
      const parsed = parseInt(String(rank), 10);
      return isNaN(parsed) ? 14 : parsed;
    }
  }
}

/**
 * Returns a human-readable name for a rank in singular or plural form.
 */
export function getRankName(rank: Rank | number | string, plural: boolean = false): string {
  const num = toNumericRank(rank);
  const names: Record<number, [string, string]> = {
    [Rank.TWO]: ['Deuce', 'Deuces'],
    [Rank.THREE]: ['Three', 'Threes'],
    [Rank.FOUR]: ['Four', 'Fours'],
    [Rank.FIVE]: ['Five', 'Fives'],
    [Rank.SIX]: ['Six', 'Sixes'],
    [Rank.SEVEN]: ['Seven', 'Sevens'],
    [Rank.EIGHT]: ['Eight', 'Eights'],
    [Rank.NINE]: ['Nine', 'Nines'],
    [Rank.TEN]: ['Ten', 'Tens'],
    [Rank.JACK]: ['Jack', 'Jacks'],
    [Rank.QUEEN]: ['Queen', 'Queens'],
    [Rank.KING]: ['King', 'Kings'],
    [Rank.ACE]: ['Ace', 'Aces'],
  };
  const item = names[num] || ['Card', 'Cards'];
  return plural ? item[1] : item[0];
}

interface InternalCard {
  suit: string;
  rank: number;
  original: Card;
}

function toInternalCards(cards: Card[]): InternalCard[] {
  return cards.map((c) => ({
    suit: String(c.suit).toLowerCase(),
    rank: toNumericRank(c.rank),
    original: c,
  }));
}

/**
 * Groups 5 sorted cards by rank, ordered by frequency descending, then rank descending.
 */
function getRankGroups(sortedCards: InternalCard[]): { rank: number; cards: InternalCard[] }[] {
  const map = new Map<number, InternalCard[]>();
  for (const card of sortedCards) {
    const list = map.get(card.rank) ?? [];
    list.push(card);
    map.set(card.rank, list);
  }

  return Array.from(map.entries())
    .map(([rank, cards]) => ({ rank, cards }))
    .sort((a, b) => {
      if (b.cards.length !== a.cards.length) {
        return b.cards.length - a.cards.length;
      }
      return b.rank - a.rank;
    });
}

/**
 * Helper to check if cards all share the same suit.
 */
export function isAllSameSuit(cards: Card[] | InternalCard[]): boolean {
  if (cards.length === 0) return false;
  const firstSuit = String(cards[0].suit).toLowerCase();
  return cards.every((c) => String(c.suit).toLowerCase() === firstSuit);
}

/**
 * Checks for Royal Flush: A-K-Q-J-10 of the same suit.
 */
export function isRoyalFlush(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  if (!isAllSameSuit(internal)) return null;

  if (
    internal[0].rank === Rank.ACE &&
    internal[1].rank === Rank.KING &&
    internal[2].rank === Rank.QUEEN &&
    internal[3].rank === Rank.JACK &&
    internal[4].rank === Rank.TEN
  ) {
    return {
      rank: HandRank.ROYAL_FLUSH,
      rankName: 'Royal Flush',
      bestCards: internal.map((c) => c.original),
      kickers: [Rank.ACE],
    };
  }

  return null;
}

/**
 * Checks for Straight Flush: 5 consecutive cards of the same suit.
 * Supports Ace-low wheel straight flush (5-4-3-2-A).
 */
export function isStraightFlush(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  if (!isAllSameSuit(internal)) return null;

  // Ace-low wheel straight flush: A, 5, 4, 3, 2
  if (
    internal[0].rank === Rank.ACE &&
    internal[1].rank === Rank.FIVE &&
    internal[2].rank === Rank.FOUR &&
    internal[3].rank === Rank.THREE &&
    internal[4].rank === Rank.TWO
  ) {
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: 'Straight Flush (5-High Wheel)',
      bestCards: [internal[1], internal[2], internal[3], internal[4], internal[0]].map((c) => c.original),
      kickers: [Rank.FIVE],
    };
  }

  // Regular straight flush
  const isSeq =
    internal[0].rank === internal[1].rank + 1 &&
    internal[1].rank === internal[2].rank + 1 &&
    internal[2].rank === internal[3].rank + 1 &&
    internal[3].rank === internal[4].rank + 1;

  if (isSeq) {
    if (internal[0].rank === Rank.ACE) {
      return null;
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: `Straight Flush (${getRankName(internal[0].rank)} High)`,
      bestCards: internal.map((c) => c.original),
      kickers: [internal[0].rank],
    };
  }

  return null;
}

/**
 * Checks for Four of a Kind: 4 cards of same rank + 1 kicker.
 */
export function isFourOfAKind(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  const groups = getRankGroups(internal);

  if (groups.length === 2 && groups[0].cards.length === 4) {
    const quadRank = groups[0].rank;
    const kickerRank = groups[1].rank;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: `Four of a Kind (${getRankName(quadRank, true)})`,
      bestCards: [...groups[0].cards, ...groups[1].cards].map((c) => c.original),
      kickers: [quadRank, kickerRank],
    };
  }

  return null;
}

/**
 * Checks for Full House: 3 cards of one rank and 2 cards of another.
 */
export function isFullHouse(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  const groups = getRankGroups(internal);

  if (groups.length === 2 && groups[0].cards.length === 3 && groups[1].cards.length === 2) {
    const tripRank = groups[0].rank;
    const pairRank = groups[1].rank;
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: `Full House (${getRankName(tripRank, true)} full of ${getRankName(pairRank, true)})`,
      bestCards: [...groups[0].cards, ...groups[1].cards].map((c) => c.original),
      kickers: [tripRank, pairRank],
    };
  }

  return null;
}

/**
 * Checks for Flush: 5 cards of the same suit (not a straight).
 */
export function isFlush(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);

  if (isAllSameSuit(internal)) {
    return {
      rank: HandRank.FLUSH,
      rankName: `Flush (${getRankName(internal[0].rank)} High)`,
      bestCards: internal.map((c) => c.original),
      kickers: internal.map((c) => c.rank),
    };
  }

  return null;
}

/**
 * Checks for Straight: 5 consecutive cards (not all same suit).
 * Handles regular straight and Ace-low wheel (A-5-4-3-2).
 */
export function isStraight(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);

  // Wheel straight: A, 5, 4, 3, 2
  if (
    internal[0].rank === Rank.ACE &&
    internal[1].rank === Rank.FIVE &&
    internal[2].rank === Rank.FOUR &&
    internal[3].rank === Rank.THREE &&
    internal[4].rank === Rank.TWO
  ) {
    return {
      rank: HandRank.STRAIGHT,
      rankName: 'Straight (5-High Wheel)',
      bestCards: [internal[1], internal[2], internal[3], internal[4], internal[0]].map((c) => c.original),
      kickers: [Rank.FIVE],
    };
  }

  const isSeq =
    internal[0].rank === internal[1].rank + 1 &&
    internal[1].rank === internal[2].rank + 1 &&
    internal[2].rank === internal[3].rank + 1 &&
    internal[3].rank === internal[4].rank + 1;

  if (isSeq) {
    return {
      rank: HandRank.STRAIGHT,
      rankName: `Straight (${getRankName(internal[0].rank)} High)`,
      bestCards: internal.map((c) => c.original),
      kickers: [internal[0].rank],
    };
  }

  return null;
}

/**
 * Checks for Three of a Kind: 3 cards of one rank + 2 kickers.
 */
export function isThreeOfAKind(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  const groups = getRankGroups(internal);

  if (groups.length === 3 && groups[0].cards.length === 3) {
    const tripRank = groups[0].rank;
    const kickers = [groups[1].rank, groups[2].rank];
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: `Three of a Kind (${getRankName(tripRank, true)})`,
      bestCards: [...groups[0].cards, ...groups[1].cards, ...groups[2].cards].map((c) => c.original),
      kickers: [tripRank, ...kickers],
    };
  }

  return null;
}

/**
 * Checks for Two Pair: 2 pairs of different ranks + 1 kicker.
 */
export function isTwoPair(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  const groups = getRankGroups(internal);

  if (groups.length === 3 && groups[0].cards.length === 2 && groups[1].cards.length === 2) {
    const highPairRank = groups[0].rank;
    const lowPairRank = groups[1].rank;
    const kickerRank = groups[2].rank;
    return {
      rank: HandRank.TWO_PAIR,
      rankName: `Two Pair (${getRankName(highPairRank, true)} and ${getRankName(lowPairRank, true)})`,
      bestCards: [...groups[0].cards, ...groups[1].cards, ...groups[2].cards].map((c) => c.original),
      kickers: [highPairRank, lowPairRank, kickerRank],
    };
  }

  return null;
}

/**
 * Checks for One Pair: 2 cards of one rank + 3 kickers.
 */
export function isPair(cards: Card[]): EvaluatedHand | null {
  if (cards.length !== 5) return null;
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  const groups = getRankGroups(internal);

  if (groups.length === 4 && groups[0].cards.length === 2) {
    const pairRank = groups[0].rank;
    const kickers = [groups[1].rank, groups[2].rank, groups[3].rank];
    return {
      rank: HandRank.PAIR,
      rankName: `One Pair of ${getRankName(pairRank, true)}`,
      bestCards: [
        ...groups[0].cards,
        ...groups[1].cards,
        ...groups[2].cards,
        ...groups[3].cards,
      ].map((c) => c.original),
      kickers: [pairRank, ...kickers],
    };
  }

  return null;
}

/**
 * Fallback to High Card when no other hand ranking matches.
 */
export function getHighCard(cards: Card[]): EvaluatedHand {
  const internal = toInternalCards(cards).sort((a, b) => b.rank - a.rank);
  return {
    rank: HandRank.HIGH_CARD,
    rankName: `High Card (${getRankName(internal[0].rank)})`,
    bestCards: internal.map((c) => c.original),
    kickers: internal.map((c) => c.rank),
  };
}

/**
 * Evaluates an exact 5-card hand against all poker hand ranks.
 */
export function evaluate5CardHand(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error(`evaluate5CardHand expects exactly 5 cards, got ${cards.length}`);
  }

  return (
    isRoyalFlush(cards) ||
    isStraightFlush(cards) ||
    isFourOfAKind(cards) ||
    isFullHouse(cards) ||
    isFlush(cards) ||
    isStraight(cards) ||
    isThreeOfAKind(cards) ||
    isTwoPair(cards) ||
    isPair(cards) ||
    getHighCard(cards)
  );
}

/**
 * Generates all combinations of size k from an array of cards.
 * E.g. For 7 cards and k=5, yields C(7,5) = 21 combinations.
 */
export function getCombinations(cards: Card[], k: number = 5): Card[][] {
  const result: Card[][] = [];

  function backtrack(start: number, current: Card[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/**
 * Compares two evaluated hands.
 *
 * @returns 1 if hand1 wins, -1 if hand2 wins, 0 if hands tie.
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;

  const len = Math.max(hand1.kickers.length, hand2.kickers.length);
  for (let i = 0; i < len; i++) {
    const k1 = hand1.kickers[i] ?? 0;
    const k2 = hand2.kickers[i] ?? 0;
    if (k1 > k2) return 1;
    if (k1 < k2) return -1;
  }

  return 0;
}

/**
 * Evaluates any hand of 5 to 7 cards (e.g. 2 hole cards + 3-5 community cards).
 * Generates all C(N, 5) subsets and returns the optimal 5-card evaluated hand.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (!cards || cards.length < 5) {
    throw new Error(
      `evaluateHand requires at least 5 cards, received ${cards?.length ?? 0}`
    );
  }

  if (cards.length === 5) {
    return evaluate5CardHand(cards);
  }

  const combinations = getCombinations(cards, 5);
  let bestHand = evaluate5CardHand(combinations[0]);

  for (let i = 1; i < combinations.length; i++) {
    const currentHand = evaluate5CardHand(combinations[i]);
    if (compareHands(currentHand, bestHand) > 0) {
      bestHand = currentHand;
    }
  }

  return bestHand;
}
