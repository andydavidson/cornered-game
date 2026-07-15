import { describe, it, expect } from 'vitest';
import { bestMove, evaluate } from '../index.js';
import { initialState, defaultConfig, applyMove, goalRow, shortestPath } from '@cornered/engine';
import type { GameState } from '@cornered/engine';

function state9(): GameState {
  return initialState(defaultConfig(9));
}

describe('evaluate', () => {
  it('returns a winning score for a player who has won', () => {
    const s: GameState = {
      ...state9(),
      winner: 'p1',
    };
    expect(evaluate(s, 'p1', 0.5)).toBeGreaterThan(10_000);
    expect(evaluate(s, 'p2', 0.5)).toBeLessThan(-10_000);
  });

  it('at aggression=0: scores solely on own path length (shorter is better)', () => {
    const s = state9();
    // p1 at (8,4), goal row 0 — dist = 8.
    const baseScore = evaluate(s, 'p1', 0);

    // Move p1 one step closer.
    const closer: GameState = { ...s, pawns: [{ r: 7, c: 4 }, s.pawns[1]] };
    const closerScore = evaluate(closer, 'p1', 0);
    expect(closerScore).toBeGreaterThan(baseScore);
  });

  it('at aggression=1: scores solely on opponent path length (longer opp path is better)', () => {
    const s = state9();
    const base = evaluate(s, 'p1', 1);
    // Add a wall that lengthens p2's path.
    const walled: GameState = {
      ...s,
      walls: [{ r: 0, c: 3, o: 'h' }],
    };
    const blockedScore = evaluate(walled, 'p1', 1);
    expect(blockedScore).toBeGreaterThan(base);
  });
});

describe('bestMove', () => {
  it('returns a legal move object', () => {
    const s = state9();
    const m = bestMove(s, 0.5, 1);
    expect(m).toBeDefined();
    expect(['move', 'wall']).toContain(m.type);
  });

  it('at aggression=0 and depth=1, prefers pawn moves toward goal', () => {
    // Simple one-depth look: the move that minimises own distance should be preferred.
    const s = state9();
    const m = bestMove(s, 0, 1);
    // The best greedy race move for p1 (goal row 0) is to move up: (7,4).
    expect(m.type).toBe('move');
    if (m.type === 'move') {
      expect(m.to.r).toBeLessThan(s.pawns[0].r); // moved toward row 0
    }
  });

  it('takes the winning move immediately', () => {
    // Place p1 one step from goal.
    const s: GameState = {
      ...state9(),
      pawns: [{ r: 1, c: 4 }, { r: 8, c: 4 }],
    };
    const m = bestMove(s, 0, 1);
    expect(m.type).toBe('move');
    if (m.type === 'move') {
      expect(m.to).toEqual({ r: 0, c: 4 });
    }
  });
});
