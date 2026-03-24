'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Button98 } from '@/components/ui/Button98';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

interface Card {
  suit: Suit;
  rank: number;
}

type Phase = 'passing' | 'playing' | 'trick-done' | 'round-over' | 'game-over';
type PassDirection = 'left' | 'right' | 'across' | 'none';

interface Player {
  name: string;
  hand: Card[];
  score: number;
  roundScore: number;
  tricks: Card[][];
  isHuman: boolean;
}

interface HeartsState {
  players: Player[];
  phase: Phase;
  passDirection: PassDirection;
  passCards: Card[];
  currentTrick: (Card | null)[];
  leadPlayer: number;
  currentPlayer: number;
  heartsBroken: boolean;
  roundNumber: number;
  trickNumber: number;
  message: string;
}

const SUITS: Suit[] = ['clubs', 'diamonds', 'spades', 'hearts'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const PASS_ORDER: PassDirection[] = ['left', 'right', 'across', 'none'];

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#c00' : '#000';
}

function cardValue(card: Card): number {
  return card.rank === 1 ? 14 : card.rank;
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
  return [...hand].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || cardValue(a) - cardValue(b));
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank: rank === 14 ? 1 : rank });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealHands(): Card[][] {
  const deck = shuffle(createDeck());
  return [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39, 52)];
}

function findTwoOfClubs(players: Player[]): number {
  return players.findIndex((p) => p.hand.some((c) => c.suit === 'clubs' && c.rank === 2));
}

function getTrickWinner(trick: (Card | null)[], leadPlayer: number): number {
  const leadSuit = trick[leadPlayer]!.suit;
  let winnerIdx = leadPlayer;
  let highVal = cardValue(trick[leadPlayer]!);
  for (let i = 0; i < 4; i++) {
    const card = trick[i]!;
    if (card.suit === leadSuit && cardValue(card) > highVal) {
      highVal = cardValue(card);
      winnerIdx = i;
    }
  }
  return winnerIdx;
}

function trickPoints(trick: (Card | null)[]): number {
  let pts = 0;
  for (const card of trick) {
    if (!card) continue;
    if (card.suit === 'hearts') pts += 1;
    if (card.suit === 'spades' && card.rank === 12) pts += 13;
  }
  return pts;
}

function isLegalPlay(card: Card, hand: Card[], trick: (Card | null)[], leadPlayer: number, currentPlayer: number, heartsBroken: boolean, trickNumber: number): boolean {
  const leadCard = trick[leadPlayer];
  if (!leadCard) {
    // Leading
    if (trickNumber === 0) return card.suit === 'clubs' && card.rank === 2;
    if (!heartsBroken && card.suit === 'hearts') {
      return hand.every((c) => c.suit === 'hearts');
    }
    return true;
  }
  // Must follow suit
  const hasSuit = hand.some((c) => c.suit === leadCard.suit);
  if (hasSuit) return card.suit === leadCard.suit;
  // Can't play hearts or QoS on first trick
  if (trickNumber === 0) {
    if (card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 12)) {
      return hand.every((c) => c.suit === 'hearts' || (c.suit === 'spades' && c.rank === 12));
    }
  }
  return true;
}

function aiChooseCard(playerIdx: number, state: HeartsState): Card {
  const player = state.players[playerIdx];
  const hand = player.hand;
  const legal = hand.filter((c) => isLegalPlay(c, hand, state.currentTrick, state.leadPlayer, playerIdx, state.heartsBroken, state.trickNumber));
  if (legal.length === 0) return hand[0];

  // Simple AI: play lowest legal card, but dump high cards when void
  const leadCard = state.currentTrick[state.leadPlayer];
  if (leadCard) {
    const followCards = legal.filter((c) => c.suit === leadCard.suit);
    if (followCards.length > 0) {
      // Follow suit: play highest below winner or lowest above
      followCards.sort((a, b) => cardValue(a) - cardValue(b));
      return followCards[0];
    }
    // Void: dump queen of spades or high hearts
    const qos = legal.find((c) => c.suit === 'spades' && c.rank === 12);
    if (qos) return qos;
    const hearts = legal.filter((c) => c.suit === 'hearts').sort((a, b) => cardValue(b) - cardValue(a));
    if (hearts.length > 0) return hearts[0];
  }

  // Leading: play lowest non-heart
  const nonHearts = legal.filter((c) => c.suit !== 'hearts');
  if (nonHearts.length > 0) {
    nonHearts.sort((a, b) => cardValue(a) - cardValue(b));
    return nonHearts[0];
  }
  legal.sort((a, b) => cardValue(a) - cardValue(b));
  return legal[0];
}

function aiChoosePassCards(hand: Card[]): Card[] {
  const sorted = [...hand].sort((a, b) => cardValue(b) - cardValue(a));
  // Pass highest 3 cards, preferring spades Q/K/A and hearts
  const priority = sorted.sort((a, b) => {
    if (a.suit === 'spades' && a.rank === 12) return -1;
    if (b.suit === 'spades' && b.rank === 12) return 1;
    if (a.suit === 'spades' && cardValue(a) >= 12) return -1;
    if (b.suit === 'spades' && cardValue(b) >= 12) return 1;
    return cardValue(b) - cardValue(a);
  });
  return priority.slice(0, 3);
}

function initRound(prevPlayers?: Player[], roundNumber = 0): HeartsState {
  const hands = dealHands();
  const players: Player[] = [
    { name: 'You', hand: sortHand(hands[0]), score: prevPlayers?.[0]?.score ?? 0, roundScore: 0, tricks: [], isHuman: true },
    { name: 'Ben', hand: sortHand(hands[1]), score: prevPlayers?.[1]?.score ?? 0, roundScore: 0, tricks: [], isHuman: false },
    { name: 'Dave', hand: sortHand(hands[2]), score: prevPlayers?.[2]?.score ?? 0, roundScore: 0, tricks: [], isHuman: false },
    { name: 'Michele', hand: sortHand(hands[3]), score: prevPlayers?.[3]?.score ?? 0, roundScore: 0, tricks: [], isHuman: false },
  ];

  const passDir = PASS_ORDER[roundNumber % 4];

  return {
    players,
    phase: passDir === 'none' ? 'playing' : 'passing',
    passDirection: passDir,
    passCards: [],
    currentTrick: [null, null, null, null],
    leadPlayer: findTwoOfClubs(players),
    currentPlayer: findTwoOfClubs(players),
    heartsBroken: false,
    roundNumber,
    trickNumber: 0,
    message: passDir === 'none' ? 'No passing this round. Play!' : `Select 3 cards to pass ${passDir}`,
  };
}

function MiniCard({ card, selected, onClick, dimmed }: { card: Card; selected?: boolean; onClick?: () => void; dimmed?: boolean }) {
  const color = suitColor(card.suit);
  return (
    <div
      onClick={onClick}
      className={`w-[44px] h-[62px] rounded-[2px] border bg-white cursor-pointer select-none flex-shrink-0 relative font-[family-name:var(--win98-font)] transition-transform ${
        selected ? '-translate-y-2 ring-2 ring-yellow-300' : ''
      } ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
      style={{ borderColor: selected ? '#cc0' : '#999' }}
    >
      <div className="absolute top-[1px] left-[2px] text-[8px] leading-tight font-bold" style={{ color }}>
        <div>{rankLabel(card.rank)}</div>
        <div className="-mt-[1px]">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-[16px]" style={{ color }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="w-[44px] h-[62px] rounded-[2px] border border-[#333] bg-[#1a5276] flex-shrink-0"
      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)' }}
    />
  );
}

function TrickCard({ card, name }: { card: Card | null; name: string }) {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <span className="text-[9px] text-white font-bold drop-shadow">{name}</span>
      {card ? <MiniCard card={card} /> : <div className="w-[44px] h-[62px]" />}
    </div>
  );
}

export default function Hearts({ windowId }: AppComponentProps) {
  const [game, setGame] = useState<HeartsState>(() => initRound());
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGame(initRound());
  }, []);

  // AI plays automatically
  useEffect(() => {
    if (game.phase !== 'playing') return;
    if (game.currentPlayer === 0) return; // Human turn
    if (game.players[game.currentPlayer].hand.length === 0) return;

    aiTimerRef.current = setTimeout(() => {
      setGame((prev) => {
        const card = aiChooseCard(prev.currentPlayer, prev);
        return playCard(prev, prev.currentPlayer, card);
      });
    }, 500);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [game.phase, game.currentPlayer, game.trickNumber]);

  // Auto-advance after trick completes
  useEffect(() => {
    if (game.phase !== 'trick-done') return;
    aiTimerRef.current = setTimeout(() => {
      setGame((prev) => {
        const winner = getTrickWinner(prev.currentTrick, prev.leadPlayer);
        const pts = trickPoints(prev.currentTrick);
        const newPlayers = prev.players.map((p, i) => {
          if (i === winner) {
            return { ...p, roundScore: p.roundScore + pts, tricks: [...p.tricks, prev.currentTrick.filter(Boolean) as Card[]] };
          }
          return { ...p };
        });

        const heartsBroken = prev.heartsBroken || prev.currentTrick.some((c) => c?.suit === 'hearts');
        const trickNumber = prev.trickNumber + 1;

        // Check if round is over
        if (trickNumber === 13) {
          // Check for shoot the moon
          const moonShooter = newPlayers.findIndex((p) => p.roundScore === 26);
          if (moonShooter >= 0) {
            for (let i = 0; i < 4; i++) {
              if (i === moonShooter) newPlayers[i].roundScore = 0;
              else newPlayers[i].roundScore = 26;
            }
          }
          const finalPlayers = newPlayers.map((p) => ({ ...p, score: p.score + p.roundScore }));
          const gameOver = finalPlayers.some((p) => p.score >= 100);
          return {
            ...prev,
            players: finalPlayers,
            phase: gameOver ? 'game-over' : 'round-over',
            heartsBroken,
            trickNumber,
            message: moonShooter >= 0
              ? `${newPlayers[moonShooter].name} shot the moon!`
              : `Round over. ${newPlayers[winner].name} takes the last trick.`,
          };
        }

        return {
          ...prev,
          players: newPlayers,
          phase: 'playing',
          currentTrick: [null, null, null, null],
          leadPlayer: winner,
          currentPlayer: winner,
          heartsBroken,
          trickNumber,
          message: winner === 0 ? 'Your lead!' : `${newPlayers[winner].name} leads`,
        };
      });
    }, 800);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [game.phase, game.trickNumber]);

  const handlePassCards = useCallback(() => {
    setGame((prev) => {
      if (prev.passCards.length !== 3) return prev;
      const dirMap: Record<PassDirection, number> = { left: 1, right: 3, across: 2, none: 0 };
      const offset = dirMap[prev.passDirection];

      const newPlayers = prev.players.map((p) => ({ ...p, hand: [...p.hand] }));

      // Human passes
      const humanTarget = (0 + offset) % 4;
      const humanPassed = prev.passCards;
      newPlayers[0].hand = newPlayers[0].hand.filter((c) => !humanPassed.some((pc) => sameCard(c, pc)));

      // AI passes
      const aiPassed: Card[][] = [[], [], [], []];
      aiPassed[0] = humanPassed;
      for (let i = 1; i < 4; i++) {
        aiPassed[i] = aiChoosePassCards(newPlayers[i].hand);
        newPlayers[i].hand = newPlayers[i].hand.filter((c) => !aiPassed[i].some((pc) => sameCard(c, pc)));
      }

      // Receive cards
      for (let i = 0; i < 4; i++) {
        const from = (i + 4 - offset) % 4;
        newPlayers[i].hand = sortHand([...newPlayers[i].hand, ...aiPassed[from]]);
      }

      const lead = findTwoOfClubs(newPlayers);
      return {
        ...prev,
        players: newPlayers,
        phase: 'playing',
        passCards: [],
        currentTrick: [null, null, null, null],
        leadPlayer: lead,
        currentPlayer: lead,
        message: lead === 0 ? 'Your lead! Play the 2 of clubs.' : `${newPlayers[lead].name} leads with 2 of clubs.`,
      };
    });
  }, []);

  const handleCardClick = useCallback((card: Card) => {
    if (game.phase === 'passing') {
      setGame((prev) => {
        const already = prev.passCards.findIndex((c) => sameCard(c, card));
        if (already >= 0) {
          return { ...prev, passCards: prev.passCards.filter((_, i) => i !== already) };
        }
        if (prev.passCards.length >= 3) return prev;
        return { ...prev, passCards: [...prev.passCards, card] };
      });
      return;
    }

    if (game.phase === 'playing' && game.currentPlayer === 0) {
      if (!isLegalPlay(card, game.players[0].hand, game.currentTrick, game.leadPlayer, 0, game.heartsBroken, game.trickNumber)) return;
      setGame((prev) => playCard(prev, 0, card));
    }
  }, [game]);

  const nextRound = useCallback(() => {
    setGame((prev) => initRound(prev.players, prev.roundNumber + 1));
  }, []);

  const menus: MenuDefinition[] = [
    { label: 'Game', items: [
      { label: 'New Game', onClick: newGame },
    ]},
    { label: 'Help', items: [
      { label: 'About Hearts...', onClick: () => {} },
    ]},
  ];

  const humanHand = game.players[0].hand;
  const scores = game.players.map((p) => `${p.name}: ${p.score}`).join('  |  ');

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="flex-1 bg-[#006400] relative overflow-hidden">
        {/* Message */}
        <div className="absolute top-2 left-0 right-0 text-center text-white text-[11px] font-bold drop-shadow z-10">
          {game.message}
        </div>

        {/* Opponents */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
          {[2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[9px] text-white mb-1">{game.players[i].name} ({game.players[i].roundScore}pts)</span>
              <div className="flex gap-[-4px]">
                {game.players[i].hand.slice(0, 6).map((_, j) => (
                  <div key={j} className="w-[12px]"><CardBack /></div>
                ))}
                {game.players[i].hand.length > 6 && <div className="w-[12px]"><CardBack /></div>}
              </div>
            </div>
          ))}
        </div>

        {/* Left opponent */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-[9px] text-white mb-1">{game.players[1].name} ({game.players[1].roundScore}pts)</span>
          <div className="flex flex-col">
            {game.players[1].hand.slice(0, 5).map((_, j) => (
              <div key={j} className="h-[10px]"><CardBack /></div>
            ))}
          </div>
        </div>

        {/* Right opponent */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-[9px] text-white mb-1">{game.players[3].name} ({game.players[3].roundScore}pts)</span>
          <div className="flex flex-col">
            {game.players[3].hand.slice(0, 5).map((_, j) => (
              <div key={j} className="h-[10px]"><CardBack /></div>
            ))}
          </div>
        </div>

        {/* Current trick in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="grid grid-cols-3 gap-1 items-center justify-items-center" style={{ gridTemplateRows: 'auto auto auto' }}>
            <div />
            <TrickCard card={game.currentTrick[2]} name={game.players[2].name} />
            <div />
            <TrickCard card={game.currentTrick[1]} name={game.players[1].name} />
            <div className="w-[50px] h-[50px]" />
            <TrickCard card={game.currentTrick[3]} name={game.players[3].name} />
            <div />
            <TrickCard card={game.currentTrick[0]} name="You" />
            <div />
          </div>
        </div>

        {/* Human hand */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex">
          {humanHand.map((card, i) => (
            <div key={`${card.suit}-${card.rank}`} className="-ml-[8px] first:ml-0">
              <MiniCard
                card={card}
                selected={game.passCards.some((c) => sameCard(c, card))}
                onClick={() => handleCardClick(card)}
                dimmed={game.phase === 'playing' && game.currentPlayer === 0 && !isLegalPlay(card, humanHand, game.currentTrick, game.leadPlayer, 0, game.heartsBroken, game.trickNumber)}
              />
            </div>
          ))}
        </div>

        {/* Pass button */}
        {game.phase === 'passing' && game.passCards.length === 3 && (
          <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2">
            <Button98 onClick={handlePassCards}>Pass Cards {game.passDirection}</Button98>
          </div>
        )}

        {/* Round over */}
        {(game.phase === 'round-over' || game.phase === 'game-over') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] p-4 min-w-[200px]">
              <div className="font-bold mb-2 text-center">{game.phase === 'game-over' ? 'Game Over!' : 'Round Over'}</div>
              <div className="mb-2 text-center">{game.message}</div>
              <table className="w-full mb-3 text-[11px]">
                <thead><tr className="border-b"><th className="text-left py-1">Player</th><th className="text-right py-1">Round</th><th className="text-right py-1">Total</th></tr></thead>
                <tbody>
                  {game.players.map((p) => (
                    <tr key={p.name}><td className="py-[2px]">{p.name}</td><td className="text-right">{p.roundScore}</td><td className="text-right font-bold">{p.score}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-center">
                <Button98 onClick={game.phase === 'game-over' ? newGame : nextRound}>
                  {game.phase === 'game-over' ? 'New Game' : 'Next Round'}
                </Button98>
              </div>
            </div>
          </div>
        )}
      </div>

      <StatusBar98 panels={[
        { content: scores },
        { content: `Round ${game.roundNumber + 1}`, width: 60 },
      ]} />
    </div>
  );
}

function playCard(prev: HeartsState, playerIdx: number, card: Card): HeartsState {
  const newPlayers = prev.players.map((p, i) => {
    if (i === playerIdx) return { ...p, hand: p.hand.filter((c) => !sameCard(c, card)) };
    return { ...p };
  });

  const newTrick = [...prev.currentTrick];
  newTrick[playerIdx] = card;

  const heartsBroken = prev.heartsBroken || card.suit === 'hearts';

  // Check if trick is complete
  const cardsPlayed = newTrick.filter(Boolean).length;
  if (cardsPlayed === 4) {
    const winner = getTrickWinner(newTrick, prev.leadPlayer);
    return {
      ...prev,
      players: newPlayers,
      currentTrick: newTrick,
      heartsBroken,
      phase: 'trick-done',
      message: `${newPlayers[winner].name} wins the trick`,
    };
  }

  const nextPlayer = (playerIdx + 1) % 4;
  return {
    ...prev,
    players: newPlayers,
    currentTrick: newTrick,
    currentPlayer: nextPlayer,
    heartsBroken,
    message: nextPlayer === 0 ? 'Your turn' : `${newPlayers[nextPlayer].name} is thinking...`,
  };
}
