// The "MindMaze"-style trivia game. Questions are drawn from the articles' own
// quiz fields, so every answer can be found in the encyclopedia itself. The
// state machine (playing → reveal → …→ finished) and question building are pure
// and seeded, so scoring and progression are fully unit-testable.

import type { Article } from './articles';
import { mulberry32, seededShuffle } from './rng';

export interface TriviaQuestion {
  articleId: string;
  articleTitle: string;
  prompt: string;
  options: string[];
  answerIndex: number;
}

export type TriviaPhase = 'playing' | 'reveal' | 'finished';

export interface TriviaState {
  questions: TriviaQuestion[];
  index: number;
  score: number;
  phase: TriviaPhase;
  /** The option the player chose while in the 'reveal' phase, else null. */
  selected: number | null;
}

export const TRIVIA_LENGTH = 10;

/** Build up to `count` shuffled multiple-choice questions for a given seed. */
export function buildQuestions(articles: Article[], seed: number, count = TRIVIA_LENGTH): TriviaQuestion[] {
  const rng = mulberry32(seed);
  const withQuiz = articles.filter((a) => a.quiz);
  const picked = seededShuffle(withQuiz, rng).slice(0, count);

  return picked.map((a) => {
    const quiz = a.quiz!;
    const options = seededShuffle([quiz.answer, ...quiz.distractors], rng);
    return {
      articleId: a.id,
      articleTitle: a.title,
      prompt: quiz.question,
      options,
      answerIndex: options.indexOf(quiz.answer),
    };
  });
}

export function startGame(articles: Article[], seed: number, count = TRIVIA_LENGTH): TriviaState {
  const questions = buildQuestions(articles, seed, count);
  return {
    questions,
    index: 0,
    score: 0,
    phase: questions.length > 0 ? 'playing' : 'finished',
    selected: null,
  };
}

/** Answer the current question. Moves to 'reveal' and updates the score once. */
export function answerQuestion(state: TriviaState, optionIndex: number): TriviaState {
  if (state.phase !== 'playing') return state;
  const q = state.questions[state.index];
  const correct = optionIndex === q.answerIndex;
  return {
    ...state,
    phase: 'reveal',
    selected: optionIndex,
    score: correct ? state.score + 1 : state.score,
  };
}

/** Advance from a revealed answer to the next question, or to the finish. */
export function advance(state: TriviaState): TriviaState {
  if (state.phase !== 'reveal') return state;
  const nextIndex = state.index + 1;
  if (nextIndex >= state.questions.length) {
    return { ...state, phase: 'finished', selected: null };
  }
  return { ...state, index: nextIndex, phase: 'playing', selected: null };
}

export function currentQuestion(state: TriviaState): TriviaQuestion | null {
  if (state.phase === 'finished') return null;
  return state.questions[state.index] ?? null;
}

/** True while a revealed answer was the correct one. */
export function lastAnswerCorrect(state: TriviaState): boolean {
  if (state.phase !== 'reveal' || state.selected === null) return false;
  return state.selected === state.questions[state.index].answerIndex;
}
