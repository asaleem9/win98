'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Button98 } from '@/components/ui/Button98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import {
  Card,
  Trick,
  PassDirection,
  AIDifficulty,
  CompletedTrick,
  SUIT_SYMBOLS,
  PASS_ORDER,
  rankLabel,
  suitColor,
  sameCard,
  sortHand,
  findTwoOfClubs,
  getTrickWinner,
  trickPoints,
  isLegalPlay,
  scoreRound,
  aiChooseCard,
  aiChoosePassCards,
  dealHands,
} from './logic';

type Phase = 'passing' | 'playing' | 'trick-done' | 'round-over' | 'game-over';

interface Player {
  name: string;
  hand: Card[];
  score: number;
  roundScore: number;
  isHuman: boolean;
}

interface RoundHistoryEntry {
  roundNumber: number;
  scores: number[];
  moonShooter: number | null;
}

interface HeartsState {
  players: Player[];
  phase: Phase;
  passDirection: PassDirection;
  passCards: Card[];
  currentTrick: Trick;
  leadPlayer: number;
  currentPlayer: number;
  heartsBroken: boolean;
  roundNumber: number;
  trickNumber: number;
  message: string;
  completedTricks: CompletedTrick[];
  history: RoundHistoryEntry[];
  moonShooter: number | null;
  lastTrickWinner: number | null;
  collecting: boolean;
}

const SEAT_NAMES = ['You', 'Ben', 'Dave', 'Michele'];

function initRound(prevPlayers?: Player[], roundNumber = 0, history: RoundHistoryEntry[] = []): HeartsState {
  const hands = dealHands();
  const players: Player[] = SEAT_NAMES.map((name, i) => ({
    name,
    hand: sortHand(hands[i]),
    score: prevPlayers?.[i]?.score ?? 0,
    roundScore: 0,
    isHuman: i === 0,
  }));

  const passDir = PASS_ORDER[roundNumber % 4];
  const lead = findTwoOfClubs(players);

  return {
    players,
    phase: passDir === 'none' ? 'playing' : 'passing',
    passDirection: passDir,
    passCards: [],
    currentTrick: [null, null, null, null],
    leadPlayer: lead,
    currentPlayer: lead,
    heartsBroken: false,
    roundNumber,
    trickNumber: 0,
    message: passDir === 'none' ? 'No passing this round. Play!' : `Select 3 cards to pass ${passDir}`,
    completedTricks: [],
    history,
    moonShooter: null,
    lastTrickWinner: null,
    collecting: false,
  };
}

function MiniCard({ card, selected, onClick, dimmed, style }: { card: Card; selected?: boolean; onClick?: () => void; dimmed?: boolean; style?: React.CSSProperties }) {
  const color = suitColor(card.suit);
  return (
    <div
      onClick={onClick}
      style={{ borderColor: selected ? '#cc0' : '#999', ...style }}
      className={`w-[44px] h-[62px] rounded-[2px] border bg-white cursor-pointer select-none flex-shrink-0 relative font-[family-name:var(--win98-font)] transition-transform ${
        selected ? '-translate-y-2 ring-2 ring-yellow-300' : ''
      } ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
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

// Seat offsets (relative to the trick center) used for the "collect trick" slide animation. N/E/S/W.
const SEAT_OFFSET: Record<number, { x: number; y: number }> = {
  0: { x: 0, y: 60 },   // You: south
  1: { x: -70, y: 0 },  // Ben: west
  2: { x: 0, y: -60 },  // Dave: north
  3: { x: 70, y: 0 },   // Michele: east
};

function TrickCard({ card, name, collecting, winner, seat }: { card: Card | null; name: string; collecting: boolean; winner: number | null; seat: number }) {
  const isWinner = winner === seat;
  const offset = collecting && card ? (isWinner ? { x: 0, y: 0 } : SEAT_OFFSET[winner ?? seat]) : { x: 0, y: 0 };
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <span className="text-[9px] text-white font-bold drop-shadow">{name}</span>
      {card ? (
        <MiniCard
          card={card}
          style={{
            transition: 'transform 400ms ease, opacity 400ms ease',
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            opacity: collecting && !isWinner ? 0 : 1,
          }}
        />
      ) : (
        <div className="w-[44px] h-[62px]" />
      )}
    </div>
  );
}

const PASS_LABEL: Record<PassDirection, string> = {
  left: 'Passing Left',
  right: 'Passing Right',
  across: 'Passing Across',
  none: 'Hold (No Pass)',
};

export default function Hearts({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();
  const [difficulty, setDifficulty] = useState<AIDifficulty>(() => getAppPref<AIDifficulty>('hearts', 'difficulty', 'medium'));
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMoonDialog, setShowMoonDialog] = useState(false);
  const [game, setGame] = useState<HeartsState>(() => initRound());
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDifficultyPref = useCallback((d: AIDifficulty) => {
    setDifficulty(d);
    setAppPref('hearts', 'difficulty', d);
  }, [setAppPref]);

  const newGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGame(initRound());
    setShowScoreSheet(false);
    setShowMoonDialog(false);
  }, []);

  // AI plays automatically
  useEffect(() => {
    if (game.phase !== 'playing') return;
    if (game.currentPlayer === 0) return; // Human turn
    if (game.players[game.currentPlayer].hand.length === 0) return;

    aiTimerRef.current = setTimeout(() => {
      setGame((prev) => {
        const card = aiChooseCard({
          playerIdx: prev.currentPlayer,
          hand: prev.players[prev.currentPlayer].hand,
          trick: prev.currentTrick,
          leadPlayer: prev.leadPlayer,
          heartsBroken: prev.heartsBroken,
          trickNumber: prev.trickNumber,
          difficulty,
          completedTricks: prev.completedTricks,
        });
        playSound('cardFlip');
        return playCard(prev, prev.currentPlayer, card);
      });
    }, 500);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [game.phase, game.currentPlayer, game.trickNumber, difficulty]);

  // Trick complete: pause with cards visible, then collect them to the winner and advance.
  useEffect(() => {
    if (game.phase !== 'trick-done') return;

    const collectTimer = setTimeout(() => {
      setGame((prev) => (prev.phase === 'trick-done' ? { ...prev, collecting: true } : prev));
    }, 500);

    const advanceTimer = setTimeout(() => {
      setGame((prev) => {
        if (prev.phase !== 'trick-done') return prev;
        const winner = getTrickWinner(prev.currentTrick, prev.leadPlayer);
        const pts = trickPoints(prev.currentTrick);
        const newPlayers = prev.players.map((p, i) => (i === winner ? { ...p, roundScore: p.roundScore + pts } : { ...p }));
        const completedTricks = [...prev.completedTricks, { trick: prev.currentTrick, leadPlayer: prev.leadPlayer, winner }];

        const heartsBroken = prev.heartsBroken || prev.currentTrick.some((c) => c?.suit === 'hearts');
        const trickNumber = prev.trickNumber + 1;

        if (trickNumber === 13) {
          const { scores, moonShooter } = scoreRound(newPlayers.map((p) => p.roundScore));
          const finalPlayers = newPlayers.map((p, i) => ({ ...p, roundScore: scores[i], score: p.score + scores[i] }));
          const gameOver = finalPlayers.some((p) => p.score >= 100);
          const historyEntry: RoundHistoryEntry = { roundNumber: prev.roundNumber, scores, moonShooter };

          playSound(gameOver ? 'chord' : 'ding');
          if (moonShooter !== null) setShowMoonDialog(true);

          return {
            ...prev,
            players: finalPlayers,
            phase: gameOver ? 'game-over' : 'round-over',
            heartsBroken,
            trickNumber,
            completedTricks,
            history: [...prev.history, historyEntry],
            moonShooter,
            message: moonShooter !== null
              ? `${finalPlayers[moonShooter].name} shot the moon!`
              : `Round over. ${newPlayers[winner].name} takes the last trick.`,
            collecting: false,
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
          completedTricks,
          message: winner === 0 ? 'Your lead!' : `${newPlayers[winner].name} leads`,
          collecting: false,
          lastTrickWinner: winner,
        };
      });
    }, 1100);

    return () => { clearTimeout(collectTimer); clearTimeout(advanceTimer); };
  }, [game.phase, game.trickNumber]);

  const handlePassCards = useCallback(() => {
    setGame((prev) => {
      if (prev.passCards.length !== 3) return prev;
      const dirMap: Record<PassDirection, number> = { left: 1, right: 3, across: 2, none: 0 };
      const offset = dirMap[prev.passDirection];

      const newPlayers = prev.players.map((p) => ({ ...p, hand: [...p.hand] }));

      const humanPassed = prev.passCards;
      newPlayers[0].hand = newPlayers[0].hand.filter((c) => !humanPassed.some((pc) => sameCard(c, pc)));

      const aiPassed: Card[][] = [[], [], [], []];
      aiPassed[0] = humanPassed;
      for (let i = 1; i < 4; i++) {
        aiPassed[i] = aiChoosePassCards(newPlayers[i].hand, difficulty);
        newPlayers[i].hand = newPlayers[i].hand.filter((c) => !aiPassed[i].some((pc) => sameCard(c, pc)));
      }

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
  }, [difficulty]);

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
      if (!isLegalPlay(card, game.players[0].hand, game.currentTrick, game.leadPlayer, game.heartsBroken, game.trickNumber)) {
        playSound('error');
        return;
      }
      playSound('cardFlip');
      setGame((prev) => playCard(prev, 0, card));
    }
  }, [game]);

  const nextRound = useCallback(() => {
    setGame((prev) => initRound(prev.players, prev.roundNumber + 1, prev.history));
    setShowMoonDialog(false);
  }, []);

  const menus: MenuDefinition[] = [
    {
      label: 'Game', items: [
        { label: 'New Game', shortcut: 'F2', onClick: newGame },
        { label: '', separator: true },
        { label: 'Score Sheet...', onClick: () => setShowScoreSheet(true), disabled: game.history.length === 0 },
        { label: '', separator: true },
        {
          label: 'AI Difficulty', submenu: [
            { label: 'Easy', checked: difficulty === 'easy', onClick: () => setDifficultyPref('easy') },
            { label: 'Medium', checked: difficulty === 'medium', onClick: () => setDifficultyPref('medium') },
            { label: 'Hard', checked: difficulty === 'hard', onClick: () => setDifficultyPref('hard') },
          ],
        },
      ],
    },
    {
      label: 'Help', items: [
        { label: 'About Hearts...', onClick: () => setShowAbout(true) },
      ],
    },
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

        {/* Pass direction indicator */}
        {game.phase !== 'round-over' && game.phase !== 'game-over' && (
          <div className="absolute top-[16px] right-2 text-[9px] text-yellow-200 font-bold drop-shadow z-10">
            {PASS_LABEL[game.passDirection]}
          </div>
        )}

        {/* North opponent (Dave) */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-white mb-1">{game.players[2].name} ({game.players[2].roundScore}pts)</span>
            <div className="flex gap-[-4px]">
              {game.players[2].hand.slice(0, 6).map((_, j) => (
                <div key={j} className="w-[12px]"><CardBack /></div>
              ))}
              {game.players[2].hand.length > 6 && <div className="w-[12px]"><CardBack /></div>}
            </div>
          </div>
        </div>

        {/* West opponent (Ben) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-[9px] text-white mb-1">{game.players[1].name} ({game.players[1].roundScore}pts)</span>
          <div className="flex flex-col">
            {game.players[1].hand.slice(0, 5).map((_, j) => (
              <div key={j} className="h-[10px]"><CardBack /></div>
            ))}
          </div>
        </div>

        {/* East opponent (Michele) */}
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
            <TrickCard card={game.currentTrick[2]} name={game.players[2].name} collecting={game.collecting} winner={game.lastTrickWinner} seat={2} />
            <div />
            <TrickCard card={game.currentTrick[1]} name={game.players[1].name} collecting={game.collecting} winner={game.lastTrickWinner} seat={1} />
            <div className="w-[50px] h-[50px]" />
            <TrickCard card={game.currentTrick[3]} name={game.players[3].name} collecting={game.collecting} winner={game.lastTrickWinner} seat={3} />
            <div />
            <TrickCard card={game.currentTrick[0]} name="You" collecting={game.collecting} winner={game.lastTrickWinner} seat={0} />
            <div />
          </div>
        </div>

        {/* Human hand */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex">
          {humanHand.map((card) => (
            <div key={`${card.suit}-${card.rank}`} className="-ml-[8px] first:ml-0">
              <MiniCard
                card={card}
                selected={game.passCards.some((c) => sameCard(c, card))}
                onClick={() => handleCardClick(card)}
                dimmed={game.phase === 'playing' && game.currentPlayer === 0 && !isLegalPlay(card, humanHand, game.currentTrick, game.leadPlayer, game.heartsBroken, game.trickNumber)}
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
              <div className="flex justify-center gap-2">
                <Button98 onClick={() => setShowScoreSheet(true)}>Score Sheet</Button98>
                <Button98 onClick={game.phase === 'game-over' ? newGame : nextRound}>
                  {game.phase === 'game-over' ? 'New Game' : 'Next Round'}
                </Button98>
              </div>
            </div>
          </div>
        )}

        {/* Score sheet dialog */}
        {showScoreSheet && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
            <Dialog98
              title="Score Sheet"
              icon="info"
              message={<ScoreSheet players={game.players} history={game.history} />}
              buttons={[{ label: 'Close', onClick: () => setShowScoreSheet(false), default: true }]}
            />
          </div>
        )}

        {/* Shoot the moon dialog */}
        {showMoonDialog && game.moonShooter !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
            <Dialog98
              title="Shoot the Moon!"
              icon="info"
              message={
                <div>
                  <div className="font-bold mb-1">{game.players[game.moonShooter].name} shot the moon!</div>
                  <div>Took every heart and the queen of spades. They score 0 this round, and everyone else takes +26.</div>
                </div>
              }
              buttons={[{ label: 'OK', onClick: () => setShowMoonDialog(false), default: true }]}
            />
          </div>
        )}

        {/* About dialog */}
        {showAbout && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
            <Dialog98
              title="About Hearts"
              icon="info"
              message={
                <div className="max-w-[260px]">
                  <div className="font-bold mb-1">The Microsoft Hearts Network</div>
                  <div className="mb-1">Classic 4-player trick-taking card game. Avoid taking hearts and the queen of spades — unless you can take them all.</div>
                  <div>First to 100 points loses. Lowest score wins.</div>
                </div>
              }
              buttons={[{ label: 'OK', onClick: () => setShowAbout(false), default: true }]}
            />
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

function ScoreSheet({ players, history }: { players: Player[]; history: RoundHistoryEntry[] }) {
  const running = players.map(() => 0);
  return (
    <div className="max-h-[240px] overflow-y-auto">
      <table className="text-[11px] border-collapse">
        <thead>
          <tr>
            <th className="text-left pr-3 pb-1">Round</th>
            {players.map((p) => (
              <th key={p.name} className="text-right pr-3 pb-1">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => {
            entry.scores.forEach((s, i) => { running[i] += s; });
            return (
              <tr key={entry.roundNumber}>
                <td className="pr-3">
                  {entry.roundNumber + 1}
                  {entry.moonShooter !== null && <span className="text-[9px] text-[#800]"> (moon)</span>}
                </td>
                {entry.scores.map((s, i) => (
                  <td key={i} className="text-right pr-3">{s}</td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t border-[#888]">
            <td className="pr-3 font-bold pt-1">Total</td>
            {players.map((p) => (
              <td key={p.name} className="text-right pr-3 font-bold pt-1">{p.score}</td>
            ))}
          </tr>
        </tbody>
      </table>
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
      lastTrickWinner: winner,
      collecting: false,
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
