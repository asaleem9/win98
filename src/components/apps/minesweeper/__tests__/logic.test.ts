import {
  createEmptyBoard,
  computeAdjacents,
  createBoard,
  floodReveal,
  revealAllMines,
  checkWin,
  flagAllMines,
  countAdjacentFlags,
  chordReveal,
  cycleMark,
  validateCustomConfig,
} from '../logic';

function place(board: ReturnType<typeof createEmptyBoard>, coords: [number, number][]) {
  for (const [r, c] of coords) board[r][c].mine = true;
  return computeAdjacents(board);
}

describe('computeAdjacents', () => {
  it('counts orthogonal and diagonal neighbors correctly', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0]]);
    expect(board[0][1].adjacent).toBe(1);
    expect(board[1][0].adjacent).toBe(1);
    expect(board[1][1].adjacent).toBe(1);
    expect(board[2][2].adjacent).toBe(0);
  });

  it('sums multiple surrounding mines', () => {
    const board = place(createEmptyBoard(3, 3), [
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(board[1][1].adjacent).toBe(3);
  });

  it('does not compute a count for mine cells themselves', () => {
    const board = place(createEmptyBoard(3, 3), [[1, 1]]);
    expect(board[1][1].adjacent).toBe(0);
    expect(board[1][1].mine).toBe(true);
  });
});

describe('createBoard', () => {
  it('places the requested number of mines', () => {
    const board = createBoard(9, 9, 10);
    const mineCount = board.flat().filter((c) => c.mine).length;
    expect(mineCount).toBe(10);
  });

  it('keeps the safe zone around the first click free of mines', () => {
    const board = createBoard(9, 9, 20, 4, 4);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        expect(board[4 + dr][4 + dc].mine).toBe(false);
      }
    }
  });

  it('is deterministic when given a seeded rng', () => {
    let calls = 0;
    const seq = [0.01, 0.9, 0.5, 0.2, 0.7, 0.3];
    const rng = () => seq[calls++ % seq.length];
    const a = createBoard(4, 4, 3, undefined, undefined, rng);
    calls = 0;
    const b = createBoard(4, 4, 3, undefined, undefined, rng);
    expect(a.map((row) => row.map((c) => c.mine))).toEqual(b.map((row) => row.map((c) => c.mine)));
  });
});

describe('floodReveal', () => {
  it('reveals a single cell with adjacent mines without spreading', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0]]);
    const revealed = floodReveal(board, 1, 1);
    expect(revealed[1][1].revealed).toBe(true);
    expect(revealed[2][2].revealed).toBe(false);
  });

  it('spreads across a contiguous zero region and stops at numbered cells', () => {
    // Single mine in a corner of a 5x5 board — most of the board is a zero region.
    const board = place(createEmptyBoard(5, 5), [[0, 0]]);
    const revealed = floodReveal(board, 4, 4);
    // Far corner region reveals out
    expect(revealed[4][4].revealed).toBe(true);
    expect(revealed[3][3].revealed).toBe(true);
    // Cells bordering the mine get revealed (they have adjacent > 0) but don't spread past themselves
    expect(revealed[0][1].revealed).toBe(true);
    expect(revealed[1][0].revealed).toBe(true);
    // The mine itself is never auto-revealed by flood fill
    expect(revealed[0][0].revealed).toBe(false);
  });

  it('does not reveal flagged cells', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0]]);
    board[2][2].flagged = true;
    const revealed = floodReveal(board, 1, 1);
    expect(revealed[2][2].revealed).toBe(false);
    expect(revealed[2][2].flagged).toBe(true);
  });

  it('does not mutate the input board', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0]]);
    floodReveal(board, 2, 2);
    expect(board[2][2].revealed).toBe(false);
  });
});

describe('checkWin / flagAllMines / revealAllMines', () => {
  it('is not won while safe cells remain covered', () => {
    const board = place(createEmptyBoard(2, 2), [[0, 0]]);
    expect(checkWin(board)).toBe(false);
  });

  it('is won once every non-mine cell is revealed', () => {
    let board = place(createEmptyBoard(2, 2), [[0, 0]]);
    board = floodReveal(board, 1, 1);
    board = floodReveal(board, 0, 1);
    board = floodReveal(board, 1, 0);
    expect(checkWin(board)).toBe(true);
  });

  it('flagAllMines flags every mine and nothing else', () => {
    const board = place(createEmptyBoard(2, 2), [[0, 0]]);
    const flagged = flagAllMines(board);
    expect(flagged[0][0].flagged).toBe(true);
    expect(flagged[0][1].flagged).toBe(false);
  });

  it('revealAllMines reveals every mine and nothing else', () => {
    const board = place(createEmptyBoard(2, 2), [[0, 0]]);
    const revealed = revealAllMines(board);
    expect(revealed[0][0].revealed).toBe(true);
    expect(revealed[0][1].revealed).toBe(false);
  });
});

describe('countAdjacentFlags / chordReveal', () => {
  it('counts flagged neighbors', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0], [0, 1]]);
    board[0][0].flagged = true;
    board[0][1].flagged = true;
    expect(countAdjacentFlags(board, 1, 1)).toBe(2);
  });

  it('does nothing when flag count does not match the cell number', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0], [0, 1]]);
    let revealed = floodReveal(board, 1, 1);
    // Only flag one of the two mines
    revealed = revealed.map((row) => row.map((c) => ({ ...c })));
    revealed[0][0].flagged = true;
    const result = chordReveal(revealed, 1, 1);
    expect(result.changed).toBe(false);
    expect(result.hitMine).toBe(false);
  });

  it('reveals unflagged neighbors when flag count matches', () => {
    const board = place(createEmptyBoard(3, 3), [[0, 0]]);
    // Reveal only the "1" cell at (1,1); its neighbors stay covered.
    let revealed = floodReveal(board, 1, 1);
    revealed = revealed.map((row) => row.map((c) => ({ ...c })));
    revealed[0][0].flagged = true;
    const result = chordReveal(revealed, 1, 1);
    expect(result.hitMine).toBe(false);
    expect(result.changed).toBe(true);
    // Its non-mine, non-flagged neighbors should now be revealed
    expect(result.board[1][2].revealed).toBe(true);
    expect(result.board[2][1].revealed).toBe(true);
  });

  it('reports a loss when a mis-flagged neighbor hides a mine', () => {
    // Mines at (0,0) and (0,2); cell (1,1) sits between them with adjacent count 2.
    const board = place(createEmptyBoard(3, 3), [[0, 0], [0, 2]]);
    let revealed = floodReveal(board, 1, 1); // adjacent=2, so only (1,1) itself gets revealed
    revealed = revealed.map((row) => row.map((c) => ({ ...c })));
    // Flag the real mine at (0,0) plus a wrong, non-mine cell to reach the required count of 2.
    revealed[0][0].flagged = true;
    revealed[1][0].flagged = true; // not a mine
    const result = chordReveal(revealed, 1, 1);
    expect(result.hitMine).toBe(true);
    // The unflagged real mine at (0,2) should now be revealed, exposing the loss.
    expect(result.board[0][2].revealed).toBe(true);
  });
});

describe('cycleMark', () => {
  it('cycles flag -> question -> clear when marks are enabled', () => {
    const base = { mine: false, revealed: false, flagged: false, question: false, adjacent: 0 };
    const flagged = cycleMark(base, true);
    expect(flagged.flagged).toBe(true);
    const questioned = cycleMark(flagged, true);
    expect(questioned.flagged).toBe(false);
    expect(questioned.question).toBe(true);
    const cleared = cycleMark(questioned, true);
    expect(cleared.flagged).toBe(false);
    expect(cleared.question).toBe(false);
  });

  it('cycles flag -> clear when marks are disabled', () => {
    const base = { mine: false, revealed: false, flagged: false, question: false, adjacent: 0 };
    const flagged = cycleMark(base, false);
    expect(flagged.flagged).toBe(true);
    const cleared = cycleMark(flagged, false);
    expect(cleared.flagged).toBe(false);
    expect(cleared.question).toBe(false);
  });

  it('leaves revealed cells untouched', () => {
    const revealedCell = { mine: false, revealed: true, flagged: false, question: false, adjacent: 2 };
    expect(cycleMark(revealedCell, true)).toEqual(revealedCell);
  });
});

describe('validateCustomConfig', () => {
  it('accepts a sensible board', () => {
    expect(validateCustomConfig(16, 16, 40)).toBeNull();
  });

  it('rejects too many mines', () => {
    expect(validateCustomConfig(9, 9, 81)).not.toBeNull();
  });

  it('rejects out-of-range dimensions', () => {
    expect(validateCustomConfig(5, 16, 10)).not.toBeNull();
    expect(validateCustomConfig(16, 40, 10)).not.toBeNull();
  });

  it('rejects non-integer input', () => {
    expect(validateCustomConfig(16.5, 16, 10)).not.toBeNull();
  });
});
