import {
  type Card,
  type GameConfig,
  GameState,
  HandRank,
  type Player,
  PlayerAction,
  Rank,
  Suit,
} from './types';
import { cardToString, createDeck, dealCards, shuffleDeck } from './deck';
import {
  compareHands,
  evaluateHand,
  evaluate5CardHand,
} from './evaluator';
import {
  calculatePots,
  dealHoleCards,
  getValidActions,
  handlePlayerAction,
  initializeGame,
  postBlinds,
} from './pokerEngine';

/**
 * Lightweight test suite for poker engine validation.
 */
export function runEngineTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${testName}`);
      console.error(`FAIL: ${testName}`);
    }
  }

  // --- 1. Deck Tests ---
  const deck = createDeck();
  assert(deck.length === 52, 'createDeck creates 52 cards');

  const suitsSet = new Set(deck.map((c) => c.suit));
  assert(suitsSet.size === 4, 'Deck has all 4 suits');

  const ranksSet = new Set(deck.map((c) => c.rank));
  assert(ranksSet.size === 13, 'Deck has all 13 ranks');

  const shuffled1 = shuffleDeck(deck, 42);
  const shuffled2 = shuffleDeck(deck, 42);
  assert(
    shuffled1.every((c, i) => c.id === shuffled2[i].id),
    'shuffleDeck with seed is deterministic'
  );

  const { dealt, remaining } = dealCards(deck, 5);
  assert(dealt.length === 5, 'dealCards deals requested count');
  assert(remaining.length === 47, 'dealCards leaves correct remaining count');
  assert(
    cardToString({ suit: Suit.SPADES, rank: Rank.ACE, id: 'SPADES_14' }) === 'A♠',
    'cardToString formats Ace of Spades correctly'
  );

  // --- 2. Evaluator Tests ---
  const royalCards: Card[] = [
    { suit: Suit.SPADES, rank: Rank.ACE, id: 'S_A' },
    { suit: Suit.SPADES, rank: Rank.KING, id: 'S_K' },
    { suit: Suit.SPADES, rank: Rank.QUEEN, id: 'S_Q' },
    { suit: Suit.SPADES, rank: Rank.JACK, id: 'S_J' },
    { suit: Suit.SPADES, rank: Rank.TEN, id: 'S_10' },
  ];
  const evalRoyal = evaluate5CardHand(royalCards);
  assert(evalRoyal.rank === HandRank.ROYAL_FLUSH, 'Royal Flush identified');

  // Straight Flush (9 high)
  const sfCards: Card[] = [
    { suit: Suit.HEARTS, rank: Rank.NINE, id: 'H_9' },
    { suit: Suit.HEARTS, rank: Rank.EIGHT, id: 'H_8' },
    { suit: Suit.HEARTS, rank: Rank.SEVEN, id: 'H_7' },
    { suit: Suit.HEARTS, rank: Rank.SIX, id: 'H_6' },
    { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'H_5' },
  ];
  const evalSf = evaluate5CardHand(sfCards);
  assert(evalSf.rank === HandRank.STRAIGHT_FLUSH, 'Straight Flush identified');
  assert(evalSf.kickers[0] === Rank.NINE, 'Straight Flush high card kicker');

  // Wheel Straight (5-4-3-2-A)
  const wheelCards: Card[] = [
    { suit: Suit.CLUBS, rank: Rank.ACE, id: 'C_A' },
    { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'D_5' },
    { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'H_4' },
    { suit: Suit.SPADES, rank: Rank.THREE, id: 'S_3' },
    { suit: Suit.CLUBS, rank: Rank.TWO, id: 'C_2' },
  ];
  const evalWheel = evaluate5CardHand(wheelCards);
  assert(evalWheel.rank === HandRank.STRAIGHT, 'Ace-low wheel straight identified');
  assert(evalWheel.kickers[0] === Rank.FIVE, 'Wheel straight kicker is 5');

  // Six-high straight beats Five-high wheel straight
  const sixHighStraight: Card[] = [
    { suit: Suit.CLUBS, rank: Rank.SIX, id: 'C_6' },
    { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'D_5' },
    { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'H_4' },
    { suit: Suit.SPADES, rank: Rank.THREE, id: 'S_3' },
    { suit: Suit.CLUBS, rank: Rank.TWO, id: 'C_2' },
  ];
  const evalSixStraight = evaluate5CardHand(sixHighStraight);
  assert(
    compareHands(evalSixStraight, evalWheel) > 0,
    '6-high straight beats 5-high wheel straight'
  );

  // Four of a kind
  const quads: Card[] = [
    { suit: Suit.HEARTS, rank: Rank.KING, id: 'H_K' },
    { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'D_K' },
    { suit: Suit.CLUBS, rank: Rank.KING, id: 'C_K' },
    { suit: Suit.SPADES, rank: Rank.KING, id: 'S_K' },
    { suit: Suit.HEARTS, rank: Rank.TWO, id: 'H_2' },
  ];
  const evalQuads = evaluate5CardHand(quads);
  assert(evalQuads.rank === HandRank.FOUR_OF_A_KIND, 'Four of a Kind identified');
  assert(evalQuads.kickers[0] === Rank.KING && evalQuads.kickers[1] === Rank.TWO, 'Quad kickers correct');

  // Full House
  const fullHouse: Card[] = [
    { suit: Suit.HEARTS, rank: Rank.TEN, id: 'H_10' },
    { suit: Suit.DIAMONDS, rank: Rank.TEN, id: 'D_10' },
    { suit: Suit.CLUBS, rank: Rank.TEN, id: 'C_10' },
    { suit: Suit.SPADES, rank: Rank.FOUR, id: 'S_4' },
    { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'H_4' },
  ];
  const evalFh = evaluate5CardHand(fullHouse);
  assert(evalFh.rank === HandRank.FULL_HOUSE, 'Full House identified');

  // Flush
  const flushCards: Card[] = [
    { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'D_A' },
    { suit: Suit.DIAMONDS, rank: Rank.JACK, id: 'D_J' },
    { suit: Suit.DIAMONDS, rank: Rank.EIGHT, id: 'D_8' },
    { suit: Suit.DIAMONDS, rank: Rank.SIX, id: 'D_6' },
    { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'D_3' },
  ];
  const evalFlush = evaluate5CardHand(flushCards);
  assert(evalFlush.rank === HandRank.FLUSH, 'Flush identified');

  // Two Pair kicker tiebreak
  const twoPairA: Card[] = [
    { suit: Suit.HEARTS, rank: Rank.ACE, id: 'H_A' },
    { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'D_A' },
    { suit: Suit.HEARTS, rank: Rank.EIGHT, id: 'H_8' },
    { suit: Suit.DIAMONDS, rank: Rank.EIGHT, id: 'D_8' },
    { suit: Suit.CLUBS, rank: Rank.KING, id: 'C_K' },
  ];
  const twoPairB: Card[] = [
    { suit: Suit.CLUBS, rank: Rank.ACE, id: 'C_A' },
    { suit: Suit.SPADES, rank: Rank.ACE, id: 'S_A' },
    { suit: Suit.CLUBS, rank: Rank.EIGHT, id: 'C_8' },
    { suit: Suit.SPADES, rank: Rank.EIGHT, id: 'S_8' },
    { suit: Suit.HEARTS, rank: Rank.QUEEN, id: 'H_Q' },
  ];
  const evalTpA = evaluate5CardHand(twoPairA);
  const evalTpB = evaluate5CardHand(twoPairB);
  assert(compareHands(evalTpA, evalTpB) > 0, 'Two pair with King kicker beats Queen kicker');

  // 7-card best hand selection
  const sevenCards: Card[] = [
    { suit: Suit.HEARTS, rank: Rank.ACE, id: 'H_A' },
    { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'D_A' },
    { suit: Suit.HEARTS, rank: Rank.KING, id: 'H_K' },
    { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'D_K' },
    { suit: Suit.CLUBS, rank: Rank.KING, id: 'C_K' }, // makes Full House Kings full of Aces
    { suit: Suit.SPADES, rank: Rank.TWO, id: 'S_2' },
    { suit: Suit.CLUBS, rank: Rank.THREE, id: 'C_3' },
  ];
  const eval7 = evaluateHand(sevenCards);
  assert(eval7.rank === HandRank.FULL_HOUSE, '7-card hand correctly finds best hand (Full House)');
  assert(eval7.kickers[0] === Rank.KING && eval7.kickers[1] === Rank.ACE, 'Kings full of Aces');

  // --- 3. Poker Engine State Machine Tests ---
  const config: GameConfig = {
    tableTier: {
      name: 'Cyberpunk High Stakes',
      buyInMin: 100,
      buyInMax: 1000,
      smallBlind: 10,
      bigBlind: 20,
    },
    maxPlayers: 6,
    timeBank: 30,
  };

  const players: Player[] = [
    {
      id: 'p1',
      name: 'Alice',
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalBetInRound: 0,
      hasFolded: false,
      isAllIn: false,
      isConnected: true,
      seatIndex: 0,
    },
    {
      id: 'p2',
      name: 'Bob',
      chips: 1000,
      holeCards: [],
      currentBet: 0,
      totalBetInRound: 0,
      hasFolded: false,
      isAllIn: false,
      isConnected: true,
      seatIndex: 1,
    },
  ];

  // Heads up game initialization
  let ctx = initializeGame(config, players, 12345);
  assert(ctx.players.length === 2, 'Initializes with 2 players');
  assert(ctx.smallBlindIndex === 0, 'Heads up: dealer is SB');
  assert(ctx.bigBlindIndex === 1, 'Heads up: other player is BB');

  // Post Blinds and Deal Hole Cards
  ctx = postBlinds(ctx);
  ctx = dealHoleCards(ctx);
  assert(ctx.players[0].holeCards.length === 2, 'Alice dealt 2 hole cards');
  assert(ctx.players[1].holeCards.length === 2, 'Bob dealt 2 hole cards');
  assert(ctx.players[0].chips === 990, 'Alice posted SB 10');
  assert(ctx.players[1].chips === 980, 'Bob posted BB 20');
  assert(ctx.pot === 30, 'Pot is 30 after blinds');
  assert(ctx.currentPlayerIndex === 0, 'Heads up: dealer (SB) acts first pre-flop');

  // Valid actions for Alice
  const aliceActions = getValidActions(ctx, 'p1');
  const actionTypes = aliceActions.map((a) => a.action);
  assert(actionTypes.includes(PlayerAction.CALL), 'Alice can call');
  assert(actionTypes.includes(PlayerAction.FOLD), 'Alice can fold');
  assert(actionTypes.includes(PlayerAction.RAISE), 'Alice can raise');

  // Alice calls 20
  ctx = handlePlayerAction(ctx, 'p1', PlayerAction.CALL);
  assert(ctx.players[0].currentBet === 20, 'Alice called 20');
  assert(ctx.pot === 40, 'Pot is 40');
  assert(ctx.currentPlayerIndex === 1, 'Bob is now to act');

  // Bob checks his BB option
  const bobActions = getValidActions(ctx, 'p2');
  assert(
    bobActions.some((a) => a.action === PlayerAction.CHECK),
    'Bob has check option on BB'
  );

  // Bob checks -> advances to FLOP!
  ctx = handlePlayerAction(ctx, 'p2', PlayerAction.CHECK);
  assert(ctx.gameState === GameState.FLOP, 'Advances to FLOP after pre-flop checks');
  assert(ctx.communityCards.length === 3, 'Flop has 3 community cards dealt');
  assert(ctx.players[0].currentBet === 0, 'Street bets reset on flop');
  assert(ctx.currentPlayerIndex === 1, 'Heads up post-flop: BB (Bob) acts first');

  // Bob checks flop
  ctx = handlePlayerAction(ctx, 'p2', PlayerAction.CHECK);
  // Alice checks flop -> advances to TURN!
  ctx = handlePlayerAction(ctx, 'p1', PlayerAction.CHECK);
  assert(ctx.gameState === GameState.TURN, 'Advances to TURN');
  assert(ctx.communityCards.length === 4, 'Turn has 4 community cards');

  // Bob checks turn, Alice checks turn -> advances to RIVER!
  ctx = handlePlayerAction(ctx, 'p2', PlayerAction.CHECK);
  ctx = handlePlayerAction(ctx, 'p1', PlayerAction.CHECK);
  assert(ctx.gameState === GameState.RIVER, 'Advances to RIVER');
  assert(ctx.communityCards.length === 5, 'River has 5 community cards');

  // Bob checks river, Alice checks river -> SHOWDOWN!
  ctx = handlePlayerAction(ctx, 'p2', PlayerAction.CHECK);
  ctx = handlePlayerAction(ctx, 'p1', PlayerAction.CHECK);
  assert(ctx.gameState === GameState.SHOWDOWN, 'Advances to SHOWDOWN');
  assert(ctx.winners !== undefined && ctx.winners.length > 0, 'Winners determined at showdown');
  assert(ctx.pot === 0, 'Pot is awarded and 0');

  // --- 4. Fold to Sole Survivor Test ---
  let foldCtx = initializeGame(config, players, 999);
  foldCtx = postBlinds(foldCtx);
  // Alice folds preflop -> Bob wins immediately
  foldCtx = handlePlayerAction(foldCtx, 'p1', PlayerAction.FOLD);
  assert(foldCtx.gameState === GameState.SHOWDOWN, 'Sole remaining player triggers showdown');
  assert(foldCtx.winners?.[0].playerId === 'p2', 'Bob awarded win by default');
  assert(foldCtx.players[1].chips === 1010, 'Bob received Alice blinds');

  // --- 5. Side Pot Multi All-In Test ---
  const sidePotPlayers: Player[] = [
    {
      id: 'p1',
      name: 'Short Stack',
      chips: 0,
      holeCards: [],
      currentBet: 100,
      totalBetInRound: 100,
      totalBetInHand: 100,
      hasFolded: false,
      isAllIn: true,
      isConnected: true,
      seatIndex: 0,
    },
    {
      id: 'p2',
      name: 'Mid Stack',
      chips: 0,
      holeCards: [],
      currentBet: 300,
      totalBetInRound: 300,
      totalBetInHand: 300,
      hasFolded: false,
      isAllIn: true,
      isConnected: true,
      seatIndex: 1,
    },
    {
      id: 'p3',
      name: 'Deep Stack',
      chips: 500,
      holeCards: [],
      currentBet: 500,
      totalBetInRound: 500,
      totalBetInHand: 500,
      hasFolded: false,
      isAllIn: false,
      isConnected: true,
      seatIndex: 2,
    },
  ];

  const sideCtx: any = {
    players: sidePotPlayers,
    pot: 900,
    communityCards: [],
    sidePots: [],
  };
  const { mainPot, allPots } = calculatePots(sideCtx);
  assert(mainPot === 300, 'Main pot is 300 (100 * 3)');
  assert(allPots.length === 3, 'Created 3 pot tiers (main + 2 side pots)');
  assert(allPots[0].amount === 300, 'Tier 1 is 300');
  assert(allPots[1].amount === 400, 'Tier 2 is 400 (200 * 2)');
  assert(allPots[2].amount === 200, 'Tier 3 remainder is 200 (uncalled deep stack bet)');

  return { passed, failed, errors };
}
