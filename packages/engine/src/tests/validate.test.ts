import { describe, it, expect } from 'vitest';
import {
  initialState, defaultConfig, applyMove, applyTimeout, isWallLegal,
  isValidConfig, isValidMoveShape, isMoveLegal, tryApplyMove,
} from '../index.js';
import type { GameState, WallId } from '../index.js';

function state9(): GameState {
  return initialState(defaultConfig(9));
}

describe('isValidConfig / initialState', () => {
  it('accepts every odd size 5–13 from defaultConfig', () => {
    for (const n of [5, 7, 9, 11, 13]) expect(isValidConfig(defaultConfig(n))).toBe(true);
  });

  it.each([
    ['even size', { size: 8 }],
    ['too small', { size: 3 }],
    ['too large', { size: 15 }],
    ['fractional size', { size: 9.5 }],
    ['NaN size', { size: NaN }],
    ['string size', { size: '9' }],
    ['negative walls', { wallsPerPlayer: -1 }],
    ['fractional walls', { wallsPerPlayer: 2.5 }],
    ['too many walls', { wallsPerPlayer: 65 }],
    ['zero timer', { timerSeconds: 0 }],
    ['infinite timer', { timerSeconds: Infinity }],
    ['unknown timeout behaviour', { timeoutBehaviour: 'explode' }],
    ['non-boolean timerEnabled', { timerEnabled: 'yes' }],
  ])('rejects %s', (_label: string, override: Record<string, unknown>) => {
    const cfg = { ...defaultConfig(9), ...override };
    expect(isValidConfig(cfg)).toBe(false);
    expect(() => initialState(cfg as never)).toThrow();
  });

  it('rejects non-objects', () => {
    expect(isValidConfig(null)).toBe(false);
    expect(isValidConfig('9')).toBe(false);
  });
});

describe('isValidMoveShape', () => {
  it.each([
    null,
    {},
    { type: 'teleport', to: { r: 0, c: 0 } },
    { type: 'move' },
    { type: 'move', to: { r: -1, c: 4 } },
    { type: 'move', to: { r: 9, c: 4 } },
    { type: 'move', to: { r: 7.5, c: 4 } },
    { type: 'move', to: { r: '7', c: 4 } },
    { type: 'wall', r: 0, c: 0, o: 'x' },
    { type: 'wall', r: 8, c: 0, o: 'h' },
    { type: 'wall', r: NaN, c: 0, o: 'h' },
    { type: 'wall', r: 0.5, c: 0, o: 'v' },
  ])('rejects %j', (m: unknown) => {
    expect(isValidMoveShape(m, 9)).toBe(false);
  });
});

describe('tryApplyMove', () => {
  it('applies a legal pawn move', () => {
    const next = tryApplyMove(state9(), { type: 'move', to: { r: 7, c: 4 } });
    expect(next?.pawns[0]).toEqual({ r: 7, c: 4 });
    expect(next?.turn).toBe('p2');
  });

  it('rejects an illegal pawn move (two squares)', () => {
    expect(tryApplyMove(state9(), { type: 'move', to: { r: 6, c: 4 } })).toBeNull();
  });

  it('rejects an off-board pawn move', () => {
    expect(tryApplyMove(state9(), { type: 'move', to: { r: 9, c: 4 } })).toBeNull();
  });

  it('applies a legal wall and decrements walls left', () => {
    const next = tryApplyMove(state9(), { type: 'wall', r: 3, c: 3, o: 'h' });
    expect(next?.walls).toEqual([{ r: 3, c: 3, o: 'h' }]);
    expect(next?.wallsLeft).toEqual([9, 10]);
  });

  it('rejects an overlapping wall', () => {
    const s = applyMove(state9(), { type: 'wall', r: 3, c: 3, o: 'h' });
    expect(tryApplyMove(s, { type: 'wall', r: 3, c: 4, o: 'h' })).toBeNull();
  });

  it('rejects a wall that seals off a goal (path check)', () => {
    // H walls fence the row 4/5 boundary across columns 1–8; V(4,0) closes the
    // side of (4,0), so H(3,0) would make (4,0) a dead end and seal both goals.
    const walls: WallId[] = [
      { r: 4, c: 1, o: 'h' }, { r: 4, c: 3, o: 'h' },
      { r: 4, c: 5, o: 'h' }, { r: 4, c: 7, o: 'h' },
      { r: 4, c: 0, o: 'v' },
    ];
    const s: GameState = { ...state9(), walls };
    const sealing: WallId = { r: 3, c: 0, o: 'h' };
    expect(isWallLegal(s, sealing)).toBe(false);
    expect(tryApplyMove(s, { type: 'wall', ...sealing })).toBeNull();
    // Sanity: a harmless wall is still accepted on the same board.
    expect(tryApplyMove(s, { type: 'wall', r: 0, c: 0, o: 'h' })).not.toBeNull();
  });

  it('rejects a wall when the player has none left', () => {
    const s: GameState = { ...state9(), wallsLeft: [0, 10] };
    expect(isMoveLegal(s, { type: 'wall', r: 3, c: 3, o: 'h' })).toBe(false);
    expect(tryApplyMove(s, { type: 'wall', r: 3, c: 3, o: 'h' })).toBeNull();
  });

  it('rejects any move once the game is won', () => {
    const s: GameState = { ...state9(), winner: 'p2' };
    expect(tryApplyMove(s, { type: 'move', to: { r: 7, c: 4 } })).toBeNull();
  });

  it('strips unknown properties from the applied move', () => {
    const next = tryApplyMove(state9(), { type: 'wall', r: 3, c: 3, o: 'h', extra: 'x' } as never);
    expect(next?.walls[0]).toEqual({ r: 3, c: 3, o: 'h' });
  });
});

describe('isWallLegal — malformed input', () => {
  it('rejects fractional, NaN and unknown-orientation walls', () => {
    const s = state9();
    expect(isWallLegal(s, { r: 0.5, c: 0, o: 'h' })).toBe(false);
    expect(isWallLegal(s, { r: NaN, c: 0, o: 'h' })).toBe(false);
    expect(isWallLegal(s, { r: 0, c: 0, o: 'x' as 'h' })).toBe(false);
  });
});

describe('applyTimeout — guards', () => {
  it('ignores a timeout for the player not on turn', () => {
    const s = state9();
    expect(applyTimeout(s, 'p2')).toBe(s);
  });

  it('ignores a timeout after the game is won (forfeit cannot overturn it)', () => {
    const s: GameState = { ...state9(), timeoutBehaviour: 'forfeit', winner: 'p1' };
    expect(applyTimeout(s, 'p1')).toBe(s);
  });
});
