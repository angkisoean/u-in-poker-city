import { dealCards, shuffleDeck, createDeck, burnCard } from './deck';
import { compareHands, evaluateHand } from './evaluator';
import {
  type Card,
  type GameConfig,
  type GameContext,
  GameState,
  HandRank,
  type Player,
  PlayerAction,
  type SidePot,
  type ValidAction,
  type WinnerResult,
} from './types';

/**
 * Deep clones the GameContext object to ensure pure, side-effect-free operations.
 */
function cloneContext(ctx: GameContext): GameContext {
  return {
    ...ctx,
    players: ctx.players.map((p) => ({
      ...p,
      holeCards: [...p.holeCards],
    })),
    communityCards: [...ctx.communityCards],
    deck: [...ctx.deck],
    sidePots: ctx.sidePots.map((sp) => ({
      ...sp,
      eligiblePlayerIds: [...sp.eligiblePlayerIds],
    })),
    winners: ctx.winners ? ctx.winners.map((w) => ({ ...w })) : undefined,
    config: {
      ...ctx.config,
      tableTier: { ...ctx.config.tableTier },
    },
  };
}

/**
 * Finds the next seat index matching an optional predicate.
 */
export function getNextSeatIndex(
  players: Player[],
  fromIndex: number,
  filter?: (p: Player) => boolean
): number {
  const n = players.length;
  if (n === 0) return -1;
  for (let offset = 1; offset <= n; offset++) {
    const idx = (fromIndex + offset) % n;
    const player = players[idx];
    if (!filter || filter(player)) {
      return idx;
    }
  }
  return -1;
}

/**
 * Returns the index of the next active player who can take an action
 * (not folded, not all-in, has chips > 0, connected).
 */
export function nextActivePlayer(
  context: GameContext,
  startIndex?: number
): number {
  const start = startIndex !== undefined ? startIndex : context.currentPlayerIndex;
  return getNextSeatIndex(
    context.players,
    start,
    (p) => !p.hasFolded && !p.isAllIn && p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );
}

/**
 * Initializes a new Texas Hold'em game context.
 *
 * @param config Game configuration (tier, max players, timeBank)
 * @param players Initial array of seated players
 * @param seed Optional RNG seed for deterministic provably fair shuffling
 */
export function initializeGame(
  config: GameConfig,
  players: Player[],
  seed?: number
): GameContext {
  const activePlayers = players.filter(
    (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );
  if (activePlayers.length < 2) {
    throw new Error('At least 2 active players with chips are required to initialize a poker game');
  }

  const initialDeck = shuffleDeck(createDeck(), seed);
  const dealerIndex = 0;

  // In Heads-up: Dealer is SB, other player is BB
  // In 3+ players: SB is (dealer+1), BB is (dealer+2)
  const isHeadsUp = activePlayers.length === 2;
  const smallBlindIndex = isHeadsUp
    ? dealerIndex
    : getNextSeatIndex(
        players,
        dealerIndex,
        (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
      );
  const bigBlindIndex = getNextSeatIndex(
    players,
    smallBlindIndex,
    (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );

  const initialContext: GameContext = {
    players: players.map((p, idx) => ({
      ...p,
      seatIndex: p.seatIndex ?? idx,
      holeCards: [],
      currentBet: 0,
      totalBetInRound: 0,
      totalBetInHand: 0,
      hasFolded: false,
      isAllIn: false,
      actedThisStreet: false,
    })),
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    dealerIndex,
    currentPlayerIndex: -1,
    gameState: GameState.LOBBY,
    deck: initialDeck,
    round: 1,
    minRaise: config.tableTier.bigBlind,
    lastRaiseBet: config.tableTier.bigBlind,
    smallBlindIndex,
    bigBlindIndex,
    winners: undefined,
    config,
  };

  return initialContext;
}

/**
 * Posts Small and Big Blinds.
 * Heads-up rules: Dealer posts SB, other player posts BB.
 * 3+ player rules: (dealer+1) posts SB, (dealer+2) posts BB.
 */
export function postBlinds(context: GameContext): GameContext {
  const next = cloneContext(context);
  const { smallBlind, bigBlind } = next.config.tableTier;

  // Post Small Blind
  const sbPlayer = next.players[next.smallBlindIndex];
  const sbAmount = Math.min(sbPlayer.chips, smallBlind);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet += sbAmount;
  sbPlayer.totalBetInRound += sbAmount;
  sbPlayer.totalBetInHand = (sbPlayer.totalBetInHand ?? 0) + sbAmount;
  if (sbPlayer.chips === 0) {
    sbPlayer.isAllIn = true;
  }
  next.pot += sbAmount;

  // Post Big Blind
  const bbPlayer = next.players[next.bigBlindIndex];
  const bbAmount = Math.min(bbPlayer.chips, bigBlind);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet += bbAmount;
  bbPlayer.totalBetInRound += bbAmount;
  bbPlayer.totalBetInHand = (bbPlayer.totalBetInHand ?? 0) + bbAmount;
  if (bbPlayer.chips === 0) {
    bbPlayer.isAllIn = true;
  }
  next.pot += bbAmount;

  next.currentBet = Math.max(sbPlayer.currentBet, bbPlayer.currentBet);
  next.minRaise = next.currentBet + bigBlind;
  next.lastRaiseBet = next.currentBet;
  next.gameState = GameState.PRE_FLOP;

  // Set first to act pre-flop:
  // In Heads-up: Dealer (SB) acts first pre-flop
  // In 3+ players: Player immediately clockwise from BB (UTG) acts first
  const isHeadsUp = next.players.filter((p) => p.chips > 0 || p.isAllIn).length === 2;
  if (isHeadsUp) {
    next.currentPlayerIndex = sbPlayer.isAllIn
      ? nextActivePlayer(next, next.smallBlindIndex)
      : next.smallBlindIndex;
  } else {
    next.currentPlayerIndex = nextActivePlayer(next, next.bigBlindIndex);
  }

  return next;
}

/**
 * Deals 2 hole cards to each active player using standard casino clockwise procedure.
 * Guarantees all players' cards are cleared first and drawn strictly from the remaining single deck.
 */
export function dealHoleCards(context: GameContext): GameContext {
  const next = cloneContext(context);
  let currentDeck = next.deck;

  // Clear previous cards first to prevent any phantom or ghost cards
  for (const player of next.players) {
    player.holeCards = [];
    player.cards = [];
  }

  // Realistic dealing round: 1 card to each active player clockwise, then 2nd card to each
  for (let cardRound = 0; cardRound < 2; cardRound++) {
    for (const player of next.players) {
      if (
        player.isConnected &&
        !player.isWaitingForNextHand &&
        (player.chips > 0 || player.isAllIn || player.currentBet > 0)
      ) {
        const { dealt, remaining } = dealCards(currentDeck, 1);
        player.holeCards = [...player.holeCards, ...dealt];
        player.cards = [...player.holeCards];
        currentDeck = remaining;
      }
    }
  }

  next.deck = currentDeck;
  return next;
}

/**
 * Deals community cards (Flop: 3, Turn: 1, River: 1) with standard poker burn card procedure.
 */
export function dealCommunityCards(
  context: GameContext,
  count: number,
  burn: boolean = true
): GameContext {
  const next = cloneContext(context);
  let currentDeck = next.deck;

  // Real casino poker: burn 1 card face down from top of deck before dealing to table
  if (burn && currentDeck.length > count) {
    const { remaining } = burnCard(currentDeck);
    currentDeck = remaining;
  }

  const { dealt, remaining } = dealCards(currentDeck, count);
  const faceUpDealt = dealt.map((c) => ({ ...c, isFaceUp: true }));
  next.communityCards = [...next.communityCards, ...faceUpDealt];
  next.deck = remaining;
  return next;
}

/**
 * Checks whether the current street's betting round is complete.
 */
export function isRoundComplete(context: GameContext): boolean {
  const nonFolded = context.players.filter((p) => !p.hasFolded);

  // If only 1 player remaining, round/hand is complete
  if (nonFolded.length <= 1) {
    return true;
  }

  // Players who can take actions (not folded, not all-in, have chips)
  const canAct = nonFolded.filter((p) => !p.isAllIn && p.chips > 0);

  // If 0 players can act, all remaining are all-in -> round complete
  if (canAct.length === 0) {
    return true;
  }

  // If 1 player can act and everyone else is all-in:
  // They must have either acted and matched currentBet
  if (canAct.length === 1) {
    const solePlayer = canAct[0];
    if (solePlayer.actedThisStreet && solePlayer.currentBet === context.currentBet) {
      return true;
    }
    // If they already bet more than or equal to currentBet and have acted
    if (solePlayer.actedThisStreet && solePlayer.currentBet >= context.currentBet) {
      return true;
    }
  }

  // General case with 2+ players able to act:
  // Every active player must have acted this street AND matched the table's currentBet
  const allActedAndMatched = canAct.every(
    (p) => p.actedThisStreet && p.currentBet === context.currentBet
  );

  return allActedAndMatched;
}

/**
 * Calculates main pot and side pots based on player contributions and all-ins.
 * Supports arbitrary number of side pots.
 */
export function calculatePots(context: GameContext): {
  mainPot: number;
  sidePots: SidePot[];
  allPots: SidePot[];
} {
  const contributors = context.players
    .map((p) => ({
      id: p.id,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      totalBet: p.totalBetInHand ?? 0,
    }))
    .filter((c) => c.totalBet > 0);

  if (contributors.length === 0) {
    return { mainPot: 0, sidePots: [], allPots: [] };
  }

  // Distinct all-in thresholds sorted ascending
  const allInCaps = Array.from(
    new Set(contributors.filter((c) => c.isAllIn).map((c) => c.totalBet))
  ).sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const cap of allInCaps) {
    const tierDelta = cap - previousLevel;
    if (tierDelta <= 0) continue;

    let potAmount = 0;
    const eligible: string[] = [];

    for (const c of contributors) {
      if (c.totalBet > previousLevel) {
        const contribution = Math.min(c.totalBet - previousLevel, tierDelta);
        potAmount += contribution;
        if (!c.hasFolded) {
          eligible.push(c.id);
        }
      }
    }

    if (potAmount > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
    }
    previousLevel = cap;
  }

  // Any remaining contributions above highest all-in
  let remainderPot = 0;
  const remainderEligible: string[] = [];

  for (const c of contributors) {
    if (c.totalBet > previousLevel) {
      const contribution = c.totalBet - previousLevel;
      remainderPot += contribution;
      if (!c.hasFolded) {
        remainderEligible.push(c.id);
      }
    }
  }

  if (remainderPot > 0) {
    pots.push({ amount: remainderPot, eligiblePlayerIds: remainderEligible });
  }

  if (pots.length === 0) {
    return { mainPot: context.pot, sidePots: [], allPots: [] };
  }

  const mainPot = pots.length > 0 ? pots[0].amount : context.pot;
  const sidePotsList = pots.length > 1 ? pots.slice(1) : [];

  return { mainPot, sidePots: sidePotsList, allPots: pots };
}

/**
 * Calculates live side pots directly from active players and total pot amount on table.
 */
export function calculateLivePots(
  players: (Player | null)[],
  totalPot: number = 0
): { mainPot: number; sidePots: SidePot[]; allPots: SidePot[] } {
  const activePlayers = players.filter((p): p is Player => Boolean(p));
  if (activePlayers.length === 0) {
    return { mainPot: totalPot, sidePots: [], allPots: [] };
  }
  return calculatePots({
    players: activePlayers,
    communityCards: [],
    pot: totalPot,
    sidePots: [],
    currentBet: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    gameState: GameState.RIVER,
    deck: [],
    round: 1,
    minRaise: 0,
    lastRaiseBet: 0,
    smallBlindIndex: 0,
    bigBlindIndex: 0,
    config: {
      tableTier: {
        name: 'Live',
        buyInMin: 100,
        buyInMax: 1000,
        smallBlind: 5,
        bigBlind: 10,
      },
      maxPlayers: 6,
      timeBank: 20,
    },
  });
}

/**
 * Evaluates all hands and distributes pots (main + side pots) to winners.
 * Handles split pots and odd chip distribution clockwise from dealer button.
 */
export function determineWinners(context: GameContext): {
  context: GameContext;
  winners: WinnerResult[];
} {
  const next = cloneContext(context);
  const nonFolded = next.players.filter(
    (p) => !p.hasFolded && !p.isWaitingForNextHand
  );

  // Preserve final pot for UI display
  next.lastPot = next.pot;

  // Case 1: Everyone folded except 1 player (winner by default)
  if (nonFolded.length === 1) {
    const soleWinner = nonFolded[0];
    const winAmount = next.pot;
    soleWinner.chips += winAmount;

    const winners: WinnerResult[] = [
      {
        playerId: soleWinner.id,
        amount: winAmount,
        hand: {
          rank: HandRank.HIGH_CARD,
          rankName: 'Won (Everyone Else Folded)',
          bestCards: soleWinner.holeCards || [],
          kickers: [],
        },
      },
    ];

    next.pot = 0;
    next.sidePots = [];
    next.winners = winners;
    next.gameState = GameState.SHOWDOWN;
    return { context: next, winners };
  }

  // Case 2: Showdown with multiple players
  // Reveal hole cards for all players who made it to showdown
  next.players.forEach((p) => {
    if (!p.hasFolded) {
      p.holeCards = (p.holeCards || []).map((c) => ({ ...c, isFaceUp: true }));
      if (p.cards) {
        p.cards = p.cards.map((c) => ({ ...c, isFaceUp: true }));
      }
    }
  });
  const { allPots } = calculatePots(next);
  const potsToDistribute = allPots.length > 0 ? allPots : [
    {
      amount: next.pot,
      eligiblePlayerIds: nonFolded.map((p) => p.id),
    },
  ];

  // Evaluate hands for all non-folded players with holeCards
  const evaluatedMap = new Map<string, ReturnType<typeof evaluateHand>>();
  for (const p of nonFolded) {
    if (p.holeCards.length >= 2 && next.communityCards.length >= 3) {
      const allCards: Card[] = [...p.holeCards, ...next.communityCards];
      evaluatedMap.set(p.id, evaluateHand(allCards));
    }
  }

  const winnersByPlayer = new Map<string, { amount: number; hand?: ReturnType<typeof evaluateHand> }>();

  // Distribute each pot tier
  potsToDistribute.forEach((potSlice: SidePot) => {
    if (potSlice.amount <= 0) return;

    // Filter eligible players who actually showed down
    const contenders = potSlice.eligiblePlayerIds
      .map((id: string) => next.players.find((p) => p.id === id))
      .filter((p: Player | undefined): p is Player => p !== undefined && !p.hasFolded);

    if (contenders.length === 0) return;

    if (contenders.length === 1) {
      const winner = contenders[0];
      winner.chips += potSlice.amount;
      const prev = winnersByPlayer.get(winner.id) ?? { amount: 0 };
      winnersByPlayer.set(winner.id, {
        amount: prev.amount + potSlice.amount,
        hand: evaluatedMap.get(winner.id),
      });
      return;
    }

    // Compare hands to find the best among contenders
    let winningContenders: Player[] = [contenders[0]];
    let bestHand = evaluatedMap.get(contenders[0].id);

    for (let i = 1; i < contenders.length; i++) {
      const current = contenders[i];
      const currentHand = evaluatedMap.get(current.id);

      if (!bestHand && currentHand) {
        bestHand = currentHand;
        winningContenders = [current];
      } else if (bestHand && currentHand) {
        const cmp = compareHands(currentHand, bestHand);
        if (cmp > 0) {
          bestHand = currentHand;
          winningContenders = [current];
        } else if (cmp === 0) {
          winningContenders.push(current);
        }
      }
    }

    // Split pot among winning contenders
    const share = Math.floor(potSlice.amount / winningContenders.length);
    let remainder = potSlice.amount % winningContenders.length;

    // Odd chips are awarded clockwise starting from the dealer button
    winningContenders.sort((a, b) => {
      const distA = (a.seatIndex - next.dealerIndex + next.players.length) % next.players.length;
      const distB = (b.seatIndex - next.dealerIndex + next.players.length) % next.players.length;
      return distA - distB;
    });

    for (const w of winningContenders) {
      let winShare = share;
      if (remainder > 0) {
        winShare += 1;
        remainder -= 1;
      }
      w.chips += winShare;
      const prev = winnersByPlayer.get(w.id) ?? { amount: 0 };
      winnersByPlayer.set(w.id, {
        amount: prev.amount + winShare,
        hand: evaluatedMap.get(w.id),
      });
    }
  });

  const winnersList: WinnerResult[] = Array.from(winnersByPlayer.entries()).map(
    ([playerId, data]) => ({
      playerId,
      amount: data.amount,
      hand: data.hand,
    })
  );

  next.pot = 0;
  next.sidePots = [];
  next.winners = winnersList;
  next.gameState = GameState.SHOWDOWN;

  return { context: next, winners: winnersList };
}

/**
 * Returns valid actions and betting ranges for the player whose turn it is.
 */
export function getValidActions(
  context: GameContext,
  playerId: string
): ValidAction[] {
  if (
    context.gameState === GameState.LOBBY ||
    context.gameState === GameState.SHOWDOWN
  ) {
    return [];
  }

  const currentPlayer = context.players[context.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return [];
  }

  if (currentPlayer.hasFolded || currentPlayer.isAllIn || currentPlayer.chips <= 0) {
    return [];
  }

  const actions: ValidAction[] = [];
  const toCall = context.currentBet - currentPlayer.currentBet;

  // 1. FOLD: Always permissible
  actions.push({ action: PlayerAction.FOLD });

  // 2. CHECK or CALL
  if (toCall <= 0) {
    actions.push({ action: PlayerAction.CHECK });
  } else {
    actions.push({
      action: PlayerAction.CALL,
      minAmount: Math.min(toCall, currentPlayer.chips),
      maxAmount: Math.min(toCall, currentPlayer.chips),
    });
  }

  // 3. ALL_IN: Always permissible if player has chips
  if (currentPlayer.chips > 0) {
    actions.push({
      action: PlayerAction.ALL_IN,
      minAmount: currentPlayer.chips,
      maxAmount: currentPlayer.chips,
    });
  }

  // 4. RAISE: Permissible if player has more chips than toCall
  if (currentPlayer.chips > toCall) {
    const minRaiseDelta = Math.max(
      context.currentBet - context.lastRaiseBet,
      context.config.tableTier.bigBlind
    );
    const minTotalBet = context.currentBet + minRaiseDelta;
    const maxTotalBet = currentPlayer.currentBet + currentPlayer.chips;

    // Can only make a legal non-allin raise if chips allow reaching minTotalBet
    if (maxTotalBet >= minTotalBet) {
      actions.push({
        action: PlayerAction.RAISE,
        minAmount: minTotalBet,
        maxAmount: maxTotalBet,
      });
    }
  }

  return actions;
}

/**
 * Handles a player's action (FOLD, CHECK, CALL, RAISE, ALL_IN).
 * Pure function: returns a new updated GameContext.
 */
export function handlePlayerAction(
  context: GameContext,
  playerId: string,
  action: PlayerAction,
  amount?: number
): GameContext {
  const next = cloneContext(context);
  const player = next.players[next.currentPlayerIndex];

  if (!player || player.id !== playerId) {
    throw new Error(`It is not player ${playerId}'s turn to act`);
  }

  const toCall = next.currentBet - player.currentBet;

  switch (action) {
    case PlayerAction.FOLD: {
      player.hasFolded = true;
      player.actedThisStreet = true;
      break;
    }

    case PlayerAction.CHECK: {
      if (toCall > 0) {
        throw new Error('Cannot CHECK when there is an active bet to call');
      }
      player.actedThisStreet = true;
      break;
    }

    case PlayerAction.CALL: {
      if (toCall <= 0) {
        throw new Error('Nothing to call. Use CHECK instead');
      }
      const pay = Math.min(toCall, player.chips);
      player.chips -= pay;
      player.currentBet += pay;
      player.totalBetInRound += pay;
      player.totalBetInHand = (player.totalBetInHand ?? 0) + pay;
      next.pot += pay;

      if (player.chips === 0) {
        player.isAllIn = true;
      }
      player.actedThisStreet = true;
      break;
    }

    case PlayerAction.RAISE: {
      if (!amount) {
        throw new Error('Raise requires a specified total bet amount');
      }
      const minRaiseDelta = Math.max(
        next.currentBet - next.lastRaiseBet,
        next.config.tableTier.bigBlind
      );
      const minTotalBet = next.currentBet + minRaiseDelta;
      const maxTotalBet = player.currentBet + player.chips;

      if (amount < minTotalBet) {
        throw new Error(`Raise amount ${amount} is below minimum raise of ${minTotalBet}`);
      }
      if (amount > maxTotalBet) {
        throw new Error(`Raise amount ${amount} exceeds player chips limit of ${maxTotalBet}`);
      }

      const added = amount - player.currentBet;
      player.chips -= added;
      player.currentBet = amount;
      player.totalBetInRound += added;
      player.totalBetInHand = (player.totalBetInHand ?? 0) + added;
      next.pot += added;

      if (player.chips === 0) {
        player.isAllIn = true;
      }

      // Record raise metrics
      next.lastRaiseBet = next.currentBet;
      next.currentBet = amount;
      next.minRaise = amount + (amount - next.lastRaiseBet);
      player.actedThisStreet = true;

      // Re-open betting for other non-folded, non-all-in players
      for (const other of next.players) {
        if (other.id !== player.id && !other.hasFolded && !other.isAllIn) {
          other.actedThisStreet = false;
        }
      }
      break;
    }

    case PlayerAction.ALL_IN: {
      const added = player.chips;
      const totalBet = player.currentBet + added;
      player.chips = 0;
      player.isAllIn = true;
      player.totalBetInRound += added;
      player.totalBetInHand = (player.totalBetInHand ?? 0) + added;
      next.pot += added;
      player.currentBet = totalBet;
      player.actedThisStreet = true;

      // Check if this all-in constitutes a raise
      if (totalBet > next.currentBet) {
        const raiseDelta = totalBet - next.currentBet;
        const previousDelta = Math.max(
          next.currentBet - next.lastRaiseBet,
          next.config.tableTier.bigBlind
        );

        // If all-in is a full raise, reopen action
        if (raiseDelta >= previousDelta) {
          next.lastRaiseBet = next.currentBet;
          next.minRaise = totalBet + raiseDelta;
          for (const other of next.players) {
            if (other.id !== player.id && !other.hasFolded && !other.isAllIn) {
              other.actedThisStreet = false;
            }
          }
        }
        next.currentBet = totalBet;
      }
      break;
    }
  }

  // 1. If only one non-folded player remains, hand ends immediately
  const nonFolded = next.players.filter(
    (p) => !p.hasFolded && !p.isWaitingForNextHand
  );
  if (nonFolded.length <= 1) {
    return determineWinners(next).context;
  }

  // 2. Check if the betting round is complete
  if (isRoundComplete(next)) {
    return advanceState(next);
  }

  // 3. Otherwise advance to the next active player
  next.currentPlayerIndex = nextActivePlayer(next, next.currentPlayerIndex);
  return next;
}

/**
 * Transitions between game states (PRE_FLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN).
 * Deals community cards, resets street bets, and handles all-in board runouts.
 */
export function advanceState(context: GameContext): GameContext {
  let next = cloneContext(context);

  // If hand is already at showdown, return as is
  if (next.gameState === GameState.SHOWDOWN) {
    return next;
  }

  // If only 1 player remains, go straight to determine winners
  const nonFolded = next.players.filter(
    (p) => !p.hasFolded && !p.isWaitingForNextHand
  );
  if (nonFolded.length <= 1) {
    return determineWinners(next).context;
  }

  // Reset street-level bet tracking when moving to a new street
  if (
    next.gameState === GameState.PRE_FLOP ||
    next.gameState === GameState.FLOP ||
    next.gameState === GameState.TURN
  ) {
    for (const p of next.players) {
      p.currentBet = 0;
      p.totalBetInRound = 0;
      p.actedThisStreet = false;
    }
    next.currentBet = 0;
    next.minRaise = next.config.tableTier.bigBlind;
    next.lastRaiseBet = 0;
  }

  // Determine state transitions
  switch (next.gameState) {
    case GameState.LOBBY: {
      next = postBlinds(next);
      next = dealHoleCards(next);
      return next;
    }

    case GameState.POST_BLINDS: {
      next = dealHoleCards(next);
      next.gameState = GameState.PRE_FLOP;
      return next;
    }

    case GameState.PRE_FLOP: {
      next.gameState = GameState.FLOP;
      next = dealCommunityCards(next, 3, true);
      break;
    }

    case GameState.FLOP: {
      next.gameState = GameState.TURN;
      next = dealCommunityCards(next, 1, true);
      break;
    }

    case GameState.TURN: {
      next.gameState = GameState.RIVER;
      next = dealCommunityCards(next, 1, true);
      break;
    }

    case GameState.RIVER: {
      return determineWinners(next).context;
    }
  }

  // Check if remaining players are all-in (no further betting possible)
  const canActCount = next.players.filter(
    (p) => !p.hasFolded && !p.isAllIn && p.chips > 0
  ).length;

  if (canActCount <= 1) {
    // Run out remaining community cards to showdown
    while (next.gameState !== GameState.SHOWDOWN) {
      if (next.gameState === GameState.FLOP) {
        next.gameState = GameState.TURN;
        next = dealCommunityCards(next, 1, true);
      } else if (next.gameState === GameState.TURN) {
        next.gameState = GameState.RIVER;
        next = dealCommunityCards(next, 1, true);
      } else if (next.gameState === GameState.RIVER) {
        return determineWinners(next).context;
      }
    }
    return next;
  }

  // Set first player to act post-flop:
  // First active player clockwise from the dealer button
  next.currentPlayerIndex = nextActivePlayer(next, next.dealerIndex);
  return next;
}

/**
 * Resets the context for a new hand, moves the dealer button clockwise,
 * reshuffles the deck, and automatically posts blinds and deals hole cards.
 */
export function resetForNewHand(
  context: GameContext,
  seed?: number
): GameContext {
  const next = cloneContext(context);

  // Activate any players who were waiting for the previous hand to complete
  for (const p of next.players) {
    if (p.isWaitingForNextHand && p.chips > 0 && p.isConnected) {
      p.isWaitingForNextHand = false;
    }
  }

  // Filter players who still have chips and are active
  const activePlayers = next.players.filter(
    (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );
  if (activePlayers.length < 2) {
    throw new Error('Not enough active players with chips for a new hand');
  }

  // Move dealer button to next active seat
  next.dealerIndex = getNextSeatIndex(
    next.players,
    next.dealerIndex,
    (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );

  const isHeadsUp = activePlayers.length === 2;
  next.smallBlindIndex = isHeadsUp
    ? next.dealerIndex
    : getNextSeatIndex(
        next.players,
        next.dealerIndex,
        (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
      );
  next.bigBlindIndex = getNextSeatIndex(
    next.players,
    next.smallBlindIndex,
    (p) => p.chips > 0 && p.isConnected && !p.isWaitingForNextHand
  );

  // Reset player cards & street state
  for (const p of next.players) {
    p.holeCards = [];
    p.cards = [];
    p.currentBet = 0;
    p.totalBetInRound = 0;
    p.totalBetInHand = 0;
    p.hasFolded = p.chips <= 0;
    p.isAllIn = false;
    p.actedThisStreet = false;
  }

  next.communityCards = [];
  next.pot = 0;
  next.sidePots = [];
  next.winners = undefined;
  next.deck = shuffleDeck(createDeck(), seed);
  next.round += 1;
  next.gameState = GameState.POST_BLINDS;

  // Post blinds and deal hole cards
  const withBlinds = postBlinds(next);
  const withCards = dealHoleCards(withBlinds);

  return withCards;
}
