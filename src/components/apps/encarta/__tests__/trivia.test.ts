import { ARTICLES } from '../articles';
import {
  buildQuestions,
  startGame,
  answerQuestion,
  advance,
  currentQuestion,
  lastAnswerCorrect,
  TRIVIA_LENGTH,
} from '../trivia';

describe('buildQuestions', () => {
  it('draws a full round of questions', () => {
    expect(buildQuestions(ARTICLES, 123)).toHaveLength(TRIVIA_LENGTH);
  });

  it('is deterministic for a given seed', () => {
    const a = buildQuestions(ARTICLES, 42).map((q) => q.articleId);
    const b = buildQuestions(ARTICLES, 42).map((q) => q.articleId);
    expect(a).toEqual(b);
  });

  it('gives four options with the answer index pointing at the right one', () => {
    for (const q of buildQuestions(ARTICLES, 7)) {
      expect(q.options).toHaveLength(4);
      const source = ARTICLES.find((a) => a.id === q.articleId)!;
      expect(q.options[q.answerIndex]).toBe(source.quiz!.answer);
      expect(new Set(q.options).size).toBe(4);
    }
  });
});

describe('the trivia state machine', () => {
  it('starts in play at the first question with no score', () => {
    const s = startGame(ARTICLES, 1);
    expect(s.phase).toBe('playing');
    expect(s.index).toBe(0);
    expect(s.score).toBe(0);
    expect(currentQuestion(s)).toBe(s.questions[0]);
  });

  it('awards a point for a correct answer and reveals it', () => {
    const s = startGame(ARTICLES, 1);
    const correct = s.questions[0].answerIndex;
    const next = answerQuestion(s, correct);
    expect(next.phase).toBe('reveal');
    expect(next.selected).toBe(correct);
    expect(next.score).toBe(1);
    expect(lastAnswerCorrect(next)).toBe(true);
  });

  it('withholds the point for a wrong answer', () => {
    const s = startGame(ARTICLES, 1);
    const wrong = (s.questions[0].answerIndex + 1) % 4;
    const next = answerQuestion(s, wrong);
    expect(next.score).toBe(0);
    expect(lastAnswerCorrect(next)).toBe(false);
  });

  it('does not score twice if answered again during reveal', () => {
    const s = startGame(ARTICLES, 1);
    const correct = s.questions[0].answerIndex;
    const revealed = answerQuestion(s, correct);
    const again = answerQuestion(revealed, correct);
    expect(again).toBe(revealed);
    expect(again.score).toBe(1);
  });

  it('advances to the next question and finally finishes', () => {
    let s = startGame(ARTICLES, 1);
    s = answerQuestion(s, s.questions[0].answerIndex);
    s = advance(s);
    expect(s.phase).toBe('playing');
    expect(s.index).toBe(1);
    expect(s.selected).toBeNull();
  });

  it('scores a full perfect playthrough', () => {
    let s = startGame(ARTICLES, 99);
    for (let i = 0; i < TRIVIA_LENGTH; i++) {
      const q = currentQuestion(s)!;
      s = answerQuestion(s, q.answerIndex);
      s = advance(s);
    }
    expect(s.phase).toBe('finished');
    expect(s.score).toBe(TRIVIA_LENGTH);
    expect(currentQuestion(s)).toBeNull();
  });
});
