import type { GameConfig, GameState, Move, Pos, WallId } from './types.js';
import { legalPawnMoves, applyMove } from './moves.js';
import { isWallLegal } from './walls.js';

/**
 * Validation for anything crossing a trust boundary (UI input today, a
 * WebSocket peer later). These checks assume nothing about the input's shape:
 * values may be the wrong type, fractional, NaN or out of range.
 */

export const MIN_SIZE = 5;
export const MAX_SIZE = 13;
export const MAX_TIMER_SECONDS = 3600;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
}

export function isValidSize(size: unknown): size is number {
  return isIntInRange(size, MIN_SIZE, MAX_SIZE) && size % 2 === 1;
}

export function isValidConfig(config: unknown): config is GameConfig {
  if (!isObject(config)) return false;
  const { size, wallsPerPlayer, timerEnabled, timerSeconds, timeoutBehaviour } = config;
  if (!isValidSize(size)) return false;
  // Walls can't exceed the number of wall slots on the board.
  if (!isIntInRange(wallsPerPlayer, 0, (size - 1) * (size - 1))) return false;
  if (typeof timerEnabled !== 'boolean') return false;
  if (!isIntInRange(timerSeconds, 1, MAX_TIMER_SECONDS)) return false;
  return timeoutBehaviour === 'miss' || timeoutBehaviour === 'forfeit';
}

function isValidPos(p: unknown, size: number): p is Pos {
  return isObject(p) && isIntInRange(p.r, 0, size - 1) && isIntInRange(p.c, 0, size - 1);
}

/** Structural check only: a well-formed wall id that fits on a board of `size`. */
export function isValidWallId(w: unknown, size: number): w is WallId {
  return isObject(w) &&
    isIntInRange(w.r, 0, size - 2) &&
    isIntInRange(w.c, 0, size - 2) &&
    (w.o === 'h' || w.o === 'v');
}

/** Structural check only: a well-formed move for a board of `size`. */
export function isValidMoveShape(move: unknown, size: number): move is Move {
  if (!isObject(move)) return false;
  if (move.type === 'move') return isValidPos(move.to, size);
  if (move.type === 'wall') return isValidWallId(move, size);
  return false;
}

/** True if `move` is well-formed and legal for the player to move in `state`. */
export function isMoveLegal(state: GameState, move: unknown): move is Move {
  if (state.winner !== null) return false;
  if (!isValidMoveShape(move, state.size)) return false;

  if (move.type === 'move') {
    return legalPawnMoves(state).some(p => p.r === move.to.r && p.c === move.to.c);
  }

  const pi = state.turn === 'p1' ? 0 : 1;
  if (state.wallsLeft[pi] <= 0) return false;
  // Always includes the path-exists check.
  return isWallLegal(state, { r: move.r, c: move.c, o: move.o });
}

/**
 * Checked move application: returns the next state, or null if the move is
 * malformed or illegal. Use this for every move that originates outside the
 * engine/AI (human input, network). `applyMove` is the unchecked primitive.
 */
export function tryApplyMove(state: GameState, move: unknown): GameState | null {
  if (!isMoveLegal(state, move)) return null;
  // Copy only the known fields so stray properties never enter the state.
  const clean: Move = move.type === 'move'
    ? { type: 'move', to: { r: move.to.r, c: move.to.c } }
    : { type: 'wall', r: move.r, c: move.c, o: move.o };
  return applyMove(state, clean);
}
