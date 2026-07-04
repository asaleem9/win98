'use client';

// The MindMaze trivia challenge — a castle of ten doors, one question behind
// each. All questions are drawn from the encyclopedia's own articles. The pure
// state machine lives in trivia.ts; this file is only the presentation.

import { useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { playSound } from '@/lib/sounds';
import { cn } from '@/lib/cn';
import { ARTICLES } from './articles';
import {
  startGame,
  answerQuestion,
  advance,
  currentQuestion,
  lastAnswerCorrect,
  TRIVIA_LENGTH,
  type TriviaState,
} from './trivia';

const BEST_KEY = 'encyclopedia98:mindmaze-best';

export function TriviaGame({
  onOpenArticle,
  onExit,
}: {
  windowId: string;
  onOpenArticle: (id: string) => void;
  onExit: () => void;
}) {
  const [game, setGame] = useState<TriviaState | null>(null);
  const [best, setBest] = useLocalStorage<number>(BEST_KEY, 0);

  const begin = useCallback(() => {
    setGame(startGame(ARTICLES, Date.now(), TRIVIA_LENGTH));
    playSound('aimDoorOpen');
  }, []);

  const choose = useCallback(
    (optionIndex: number) => {
      setGame((g) => {
        if (!g || g.phase !== 'playing') return g;
        const next = answerQuestion(g, optionIndex);
        playSound(lastAnswerCorrect(next) ? 'ding' : 'error');
        return next;
      });
    },
    [],
  );

  const next = useCallback(() => {
    setGame((g) => {
      if (!g) return g;
      const advanced = advance(g);
      if (advanced.phase === 'finished') {
        setBest((b) => Math.max(b, advanced.score));
        playSound(advanced.score >= 7 ? 'chord' : 'exclamation');
      }
      return advanced;
    });
  }, [setBest]);

  // --- Intro gate ----------------------------------------------------------
  if (!game) {
    return (
      <Castle>
        <div className="text-[46px] leading-none mb-1" aria-hidden>&#127983;</div>
        <h2 className="font-serif text-[22px] text-[#e8c874]">The MindMaze</h2>
        <p className="text-[11px] text-[#c8b8e8] max-w-[300px] mx-auto mt-2 leading-relaxed">
          Ten doors bar your way through the castle. Behind each waits a question
          drawn from the pages of Encyclopedia 98. Answer well, and you shall pass.
        </p>
        <div className="text-[10px] text-[#9a8ac8] mt-3">Best escape so far: {best} / {TRIVIA_LENGTH}</div>
        <div className="mt-4 flex gap-2 justify-center">
          <DoorButton onClick={begin}>Enter the Maze</DoorButton>
          <PlainButton onClick={onExit}>Turn Back</PlainButton>
        </div>
      </Castle>
    );
  }

  // --- Results -------------------------------------------------------------
  if (game.phase === 'finished') {
    const perfect = game.score === TRIVIA_LENGTH;
    const strong = game.score >= 7;
    return (
      <Castle>
        <div className="text-[46px] leading-none mb-1" aria-hidden>{perfect ? '\u{1F451}' : strong ? '\u{1F6AA}' : '\u{1F5FF}'}</div>
        <h2 className="font-serif text-[22px] text-[#e8c874]">
          {perfect ? 'A Perfect Escape!' : strong ? 'You Escaped the Maze!' : 'The Maze Holds You Yet'}
        </h2>
        <div className="font-serif text-[34px] text-white mt-2">{game.score} / {TRIVIA_LENGTH}</div>
        <p className="text-[11px] text-[#c8b8e8] mt-1">
          {perfect
            ? 'Not a single door defeated you. The castle is yours.'
            : strong
              ? 'A fine showing, scholar. The gate swings open.'
              : 'Study the encyclopedia and try the doors again.'}
        </p>
        <div className="text-[10px] text-[#9a8ac8] mt-2">Best escape: {Math.max(best, game.score)} / {TRIVIA_LENGTH}</div>
        <div className="mt-4 flex gap-2 justify-center">
          <DoorButton onClick={begin}>Play Again</DoorButton>
          <PlainButton onClick={onExit}>Leave the Castle</PlainButton>
        </div>
      </Castle>
    );
  }

  // --- A question ----------------------------------------------------------
  const q = currentQuestion(game)!;
  const revealing = game.phase === 'reveal';
  return (
    <Castle align="top">
      <div className="flex items-center justify-between w-full max-w-[440px] mb-2">
        <span className="text-[10px] text-[#c8b8e8]">Door {game.index + 1} of {TRIVIA_LENGTH}</span>
        <span className="text-[10px] text-[#e8c874]">Score: {game.score}</span>
      </div>

      <div className="w-full max-w-[440px] bg-[#f6f2e2] text-[#2a2a2a] border border-[#c0a060] p-3 shadow-[3px_3px_0_rgba(0,0,0,0.35)]">
        <div className="font-serif text-[15px] text-[#1a2a5a] leading-snug mb-3">{q.prompt}</div>
        <div className="grid grid-cols-1 gap-[6px]">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answerIndex;
            const isChosen = game.selected === i;
            return (
              <button
                key={i}
                onClick={() => !revealing && choose(i)}
                disabled={revealing}
                className={cn(
                  'flex items-center gap-2 text-left px-2 py-[6px] text-[12px] border-2 border-solid transition-colors',
                  !revealing &&
                    'bg-white border-t-[#e0d8c0] border-l-[#e0d8c0] border-b-[#a89860] border-r-[#a89860] hover:bg-[#efe8d0] cursor-pointer',
                  revealing && isAnswer && 'bg-[#c8f0c8] border-[#3a9a3a] font-bold',
                  revealing && isChosen && !isAnswer && 'bg-[#f0c8c8] border-[#b03a3a] line-through',
                  revealing && !isAnswer && !isChosen && 'bg-white border-[#d0d0c0] text-[#888]',
                )}
              >
                <span
                  className={cn(
                    'shrink-0 w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] font-bold',
                    revealing && isAnswer ? 'bg-[#3a9a3a] text-white' : revealing && isChosen ? 'bg-[#b03a3a] text-white' : 'bg-[#c0a060] text-white',
                  )}
                  aria-hidden
                >
                  {revealing && isAnswer ? '✓' : revealing && isChosen ? '✗' : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {revealing && (
          <div className="mt-3 pt-2 border-t border-[#d8c890] flex items-center justify-between gap-2">
            <button
              onClick={() => onOpenArticle(q.articleId)}
              className="text-[10px] text-[#1a3a8a] underline cursor-pointer"
            >
              {lastAnswerCorrect(game) ? 'Correct!' : 'Learn more'} &mdash; read &ldquo;{q.articleTitle}&rdquo; &rsaquo;
            </button>
            <DoorButton small onClick={next}>
              {game.index + 1 >= TRIVIA_LENGTH ? 'See Results' : 'Next Door'}
            </DoorButton>
          </div>
        )}
      </div>
    </Castle>
  );
}

// --- presentational shells --------------------------------------------------

function Castle({ children, align = 'center' }: { children: React.ReactNode; align?: 'center' | 'top' }) {
  return (
    <div
      className={cn('min-h-full w-full flex flex-col items-center p-5 text-center', align === 'center' ? 'justify-center' : 'justify-start')}
      style={{ background: 'radial-gradient(circle at 50% 0%, #3a2a5a 0%, #201636 55%, #100b1e 100%)' }}
    >
      {children}
    </div>
  );
}

function DoorButton({ children, onClick, small }: { children: React.ReactNode; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'font-serif bg-gradient-to-b from-[#7a5a2a] to-[#4a3418] text-[#f0e0b0] border-2 border-[#2a1c0a] cursor-pointer',
        'shadow-[inset_1px_1px_0_rgba(255,220,150,0.4),2px_2px_0_rgba(0,0,0,0.4)] hover:from-[#8a6a3a] hover:to-[#5a4020]',
        small ? 'px-3 py-[3px] text-[11px]' : 'px-4 py-[5px] text-[13px]',
      )}
    >
      {children}
    </button>
  );
}

function PlainButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-[5px] text-[12px] text-[#c8b8e8] border border-[#6a5a9a] hover:bg-[#3a2a5a] cursor-pointer"
    >
      {children}
    </button>
  );
}
