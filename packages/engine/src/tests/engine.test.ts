import { describe, it, expect } from 'vitest';
import {
  initialState, defaultConfig, wallsForSize,
  legalPawnMoves, legalMoves, applyMove, checkWin, isWallLegal,
  shortestPath, goalRow, isEdgeBlocked, applyTimeout,
} from '../index.js';
import type { GameState, WallId } from '../index.js';

function state9(): GameState {
  return initialState(defaultConfig(9));
}

// Helper: apply a sequence of moves without legality checks (for test setup).
function applySeq(s: GameState, moves: Parameters<typeof applyMove>[1][]): GameState {
  return moves.reduce((st, m) => applyMove(st, m), s);
}

describe('wallsForSize', () => {
  it('returns 10 for a 9×9 board', () => expect(wallsForSize(9)).toBe(10));
  it('scales linearly', () => {
    expect(wallsForSize(5)).toBe(6);
    expect(wallsForSize(13)).toBe(14);
  });
});

describe('initialState', () => {
  it('places p1 bottom-centre and p2 top-centre on 9×9', () => {
    const s = state9();
    expect(s.pawns[0]).toEqual({ r: 8, c: 4 });
    expect(s.pawns[1]).toEqual({ r: 0, c: 4 });
  });

  it('starts with p1 to move', () => expect(state9().turn).toBe('p1'));
  it('gives each player 10 walls', () => expect(state9().wallsLeft).toEqual([10, 10]));
});

describe('legalPawnMoves — start position', () => {
  it('p1 can move up or left/right (not down off board)', () => {
    const s = state9();
    const moves = legalPawnMoves(s);
    // From (8,4): up=(7,4), left=(8,3), right=(8,5). Down would be row 9 — off board.
    expect(moves).toContainEqual({ r: 7, c: 4 });
    expect(moves).toContainEqual({ r: 8, c: 3 });
    expect(moves).toContainEqual({ r: 8, c: 5 });
    expect(moves).not.toContainEqual({ r: 9, c: 4 });
    expect(moves).toHaveLength(3);
  });
});

describe('isEdgeBlocked', () => {
  it('H wall at (3,4) blocks downward move from (3,4) to (4,4)', () => {
    const walls: WallId[] = [{ r: 3, c: 4, o: 'h' }];
    expect(isEdgeBlocked(walls, { r: 3, c: 4 }, { r: 4, c: 4 })).toBe(true);
  });

  it('H wall at (3,4) blocks downward move from (3,5) to (4,5)', () => {
    const walls: WallId[] = [{ r: 3, c: 4, o: 'h' }];
    expect(isEdgeBlocked(walls, { r: 3, c: 5 }, { r: 4, c: 5 })).toBe(true);
  });

  it('H wall at (3,4) does NOT block move from (3,6) to (4,6)', () => {
    const walls: WallId[] = [{ r: 3, c: 4, o: 'h' }];
    expect(isEdgeBlocked(walls, { r: 3, c: 6 }, { r: 4, c: 6 })).toBe(false);
  });

  it('V wall at (3,4) blocks rightward move from (3,4) to (3,5)', () => {
    const walls: WallId[] = [{ r: 3, c: 4, o: 'v' }];
    expect(isEdgeBlocked(walls, { r: 3, c: 4 }, { r: 3, c: 5 })).toBe(true);
  });

  it('V wall at (3,4) blocks rightward move from (4,4) to (4,5)', () => {
    const walls: WallId[] = [{ r: 3, c: 4, o: 'v' }];
    expect(isEdgeBlocked(walls, { r: 4, c: 4 }, { r: 4, c: 5 })).toBe(true);
  });
});

describe('isWallLegal — conflict detection', () => {
  it('rejects an exact duplicate wall', () => {
    const s: GameState = {
      ...state9(),
      walls: [{ r: 3, c: 3, o: 'h' }],
    };
    expect(isWallLegal(s, { r: 3, c: 3, o: 'h' })).toBe(false);
  });

  it('rejects H wall adjacent (same row, c+1 overlaps)', () => {
    const s: GameState = { ...state9(), walls: [{ r: 3, c: 3, o: 'h' }] };
    expect(isWallLegal(s, { r: 3, c: 4, o: 'h' })).toBe(false);
    expect(isWallLegal(s, { r: 3, c: 2, o: 'h' })).toBe(false);
  });

  it('rejects crossing H and V at same position', () => {
    const s: GameState = { ...state9(), walls: [{ r: 3, c: 3, o: 'h' }] };
    expect(isWallLegal(s, { r: 3, c: 3, o: 'v' })).toBe(false);
  });

  it('allows H and V at different positions', () => {
    const s: GameState = { ...state9(), walls: [{ r: 3, c: 3, o: 'h' }] };
    expect(isWallLegal(s, { r: 3, c: 5, o: 'v' })).toBe(true);
  });
});

describe('isWallLegal — path-blocking check', () => {
  it('rejects a wall that fully seals off p2 from goal (5×5 board)', () => {
    // On a 5×5 board: p2 at (0,2), goal row 4.
    // H(0,0) blocks downward exits at cols 0,1.
    // H(0,2) blocks downward exits at cols 2,3.
    // The only remaining exit is via (0,3)→(0,4)→(1,4)→...
    // Adding V(0,3) seals that exit — p2 cannot reach row 4.
    const s5 = initialState({ size: 5, wallsPerPlayer: 6, timerEnabled: false, timerSeconds: 30, timeoutBehaviour: 'miss' });
    const s: GameState = {
      ...s5,
      walls: [
        { r: 0, c: 0, o: 'h' }, // blocks (0,0)↔(1,0) and (0,1)↔(1,1)
        { r: 0, c: 2, o: 'h' }, // blocks (0,2)↔(1,2) and (0,3)↔(1,3)
      ],
    };
    // V(0,3) blocks (0,3)↔(0,4) and (1,3)↔(1,4) — seals the last exit for p2.
    expect(isWallLegal(s, { r: 0, c: 3, o: 'v' })).toBe(false);
  });

  it('allows a wall that leaves both players a path', () => {
    const s = state9();
    expect(isWallLegal(s, { r: 4, c: 4, o: 'h' })).toBe(true);
  });
});

describe('shortestPath', () => {
  it('returns 0 when already at goal', () => {
    const s = state9();
    // p2 starts at row 0; their goal is row 8 (size-1). So not 0.
    // p1 goal is row 0. p1 is at row 8 — not at goal.
    expect(shortestPath(9, [], { r: 0, c: 4 }, 0)).toBe(0);
  });

  it('returns correct distance on empty board', () => {
    // p1 at (8,4), goal row 0 = 8 steps.
    expect(shortestPath(9, [], { r: 8, c: 4 }, 0)).toBe(8);
  });

  it('returns null when fully walled off (5×5 trap)', () => {
    // On a 5×5 board, these three walls seal (0,2) from row 4:
    // H(0,0): blocks downward exits at cols 0,1
    // H(0,2): blocks downward exits at cols 2,3
    // V(0,3): blocks rightward exit (0,3)→(0,4) (and row-1 equivalent)
    // The only reachable cells from (0,2) are {(0,0),(0,1),(0,2),(0,3)} — none connect to row 1+.
    const walls: WallId[] = [
      { r: 0, c: 0, o: 'h' },
      { r: 0, c: 2, o: 'h' },
      { r: 0, c: 3, o: 'v' },
    ];
    expect(shortestPath(5, walls, { r: 0, c: 2 }, 4)).toBe(null);
  });
});

describe('checkWin', () => {
  it('detects p1 win when pawn reaches row 0', () => {
    const s: GameState = { ...state9(), pawns: [{ r: 0, c: 4 }, { r: 0, c: 2 }] };
    expect(checkWin(s)).toBe('p1');
  });

  it('detects p2 win when pawn reaches last row', () => {
    const s: GameState = { ...state9(), pawns: [{ r: 4, c: 4 }, { r: 8, c: 4 }] };
    expect(checkWin(s)).toBe('p2');
  });

  it('returns null mid-game', () => {
    expect(checkWin(state9())).toBe(null);
  });
});

describe('applyMove', () => {
  it('advances turn after pawn move', () => {
    const s = state9();
    const next = applyMove(s, { type: 'move', to: { r: 7, c: 4 } });
    expect(next.turn).toBe('p2');
    expect(next.pawns[0]).toEqual({ r: 7, c: 4 });
  });

  it('decrements wallsLeft after wall placement', () => {
    const s = state9();
    const next = applyMove(s, { type: 'wall', r: 4, c: 4, o: 'h' });
    expect(next.wallsLeft[0]).toBe(9);
    expect(next.walls).toHaveLength(1);
  });

  it('sets winner when pawn reaches goal', () => {
    // Move p1 to row 1 then to row 0.
    const s: GameState = { ...state9(), pawns: [{ r: 1, c: 4 }, { r: 8, c: 4 }] };
    const next = applyMove(s, { type: 'move', to: { r: 0, c: 4 } });
    expect(next.winner).toBe('p1');
  });
});

describe('jump mechanics', () => {
  it('allows straight jump over opponent', () => {
    // p1 at (4,4), p2 at (3,4) — p1 can jump to (2,4)
    const s: GameState = {
      ...state9(),
      pawns: [{ r: 4, c: 4 }, { r: 3, c: 4 }],
    };
    const moves = legalPawnMoves(s);
    expect(moves).toContainEqual({ r: 2, c: 4 });
  });

  it('offers diagonal moves when straight jump is blocked by wall', () => {
    // p1 at (4,4), p2 at (3,4), wall between (2,4)↔(3,4) = H wall at r=2,c=4? No.
    // H wall at (r=2,c=4) blocks (2,4)↔(3,4) and (2,5)↔(3,5).
    // But the jump is from (3,4) to (2,4) — that's moving UP from p2's position,
    // so it's blocked by H wall at (r=2, c=4) or (r=2, c=3).
    const walls: WallId[] = [{ r: 2, c: 3, o: 'h' }]; // blocks (2,4)↔(3,4) via c=3 side
    const s: GameState = {
      ...state9(),
      pawns: [{ r: 4, c: 4 }, { r: 3, c: 4 }],
      walls,
    };
    const moves = legalPawnMoves(s);
    expect(moves).not.toContainEqual({ r: 2, c: 4 }); // straight jump blocked
    expect(moves).toContainEqual({ r: 3, c: 3 }); // diagonal left
    expect(moves).toContainEqual({ r: 3, c: 5 }); // diagonal right
  });

  it('wall between the two pawns does NOT block jump activation', () => {
    // p1 at (4,4), p2 at (3,4), wall between them = H wall at (3,4) blocking (3,4)↔(4,4).
    // Jump should still activate (spec: walls don't block jumps between the two pawns).
    const walls: WallId[] = [{ r: 3, c: 4, o: 'h' }]; // blocks (3,4)↔(4,4) and (3,5)↔(4,5)
    const s: GameState = {
      ...state9(),
      pawns: [{ r: 4, c: 4 }, { r: 3, c: 4 }],
      walls,
    };
    const moves = legalPawnMoves(s);
    // The cell above p2 is (2,4) — not blocked by any wall beyond p2. Jump valid.
    expect(moves).toContainEqual({ r: 2, c: 4 });
  });
});

describe('applyTimeout', () => {
  it('miss: advances the turn without a move', () => {
    const s: GameState = { ...state9(), timeoutBehaviour: 'miss' };
    const next = applyTimeout(s, 'p1');
    expect(next.turn).toBe('p2');
    expect(next.winner).toBe(null);
  });

  it('forfeit: sets the opponent as winner', () => {
    const s: GameState = { ...state9(), timeoutBehaviour: 'forfeit' };
    const next = applyTimeout(s, 'p1');
    expect(next.winner).toBe('p2');
  });
});
