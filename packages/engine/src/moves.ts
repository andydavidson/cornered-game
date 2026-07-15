import type { GameState, Move, Player, Pos } from './types.js';
import { isEdgeBlocked } from './graph.js';

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

/**
 * All legal pawn destinations for the current player.
 *
 * Jumping rules (per spec):
 *  - Walls between the two pawns do NOT block the jump trigger.
 *  - If the cell beyond the opponent is on-board and not wall-blocked, jump there.
 *  - Otherwise, diagonal moves to cells beside the opponent (perpendicular to approach).
 */
export function legalPawnMoves(state: GameState): Pos[] {
  const { size, pawns, walls, turn } = state;
  const pi = turn === 'p1' ? 0 : 1;
  const oi = 1 - pi;
  const pos = pawns[pi];
  const opp = pawns[oi];
  const results: Pos[] = [];

  for (const [dr, dc] of DIRS) {
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

    if (nr === opp.r && nc === opp.c) {
      // Opponent is in the neighbouring cell — jump mechanics activate regardless of walls between pawns.
      const jr = nr + dr;
      const jc = nc + dc;
      const beyondOnBoard = jr >= 0 && jr < size && jc >= 0 && jc < size;
      const beyondBlocked = beyondOnBoard && isEdgeBlocked(walls, opp, { r: jr, c: jc });

      if (beyondOnBoard && !beyondBlocked) {
        results.push({ r: jr, c: jc });
      } else {
        // Diagonal: cells beside the opponent, perpendicular to jump direction.
        const perps: readonly [number, number][] = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
        for (const [pr, pc] of perps) {
          const diagR = nr + pr;
          const diagC = nc + pc;
          if (diagR < 0 || diagR >= size || diagC < 0 || diagC >= size) continue;
          // Don't allow moving back onto own cell.
          if (diagR === pos.r && diagC === pos.c) continue;
          if (!isEdgeBlocked(walls, opp, { r: diagR, c: diagC })) {
            results.push({ r: diagR, c: diagC });
          }
        }
      }
    } else {
      // Normal move — check for wall.
      if (!isEdgeBlocked(walls, pos, { r: nr, c: nc })) {
        results.push({ r: nr, c: nc });
      }
    }
  }

  return results;
}

export function checkWin(state: GameState): Player | null {
  if (state.pawns[0].r === 0) return 'p1';
  if (state.pawns[1].r === state.size - 1) return 'p2';
  return null;
}

export function applyMove(state: GameState, move: Move): GameState {
  if (state.winner) return state;

  const pi = state.turn === 'p1' ? 0 : 1;
  const nextTurn: Player = state.turn === 'p1' ? 'p2' : 'p1';

  if (move.type === 'move') {
    const newPawns: [Pos, Pos] = [state.pawns[0], state.pawns[1]];
    newPawns[pi] = move.to;
    const next: GameState = { ...state, pawns: newPawns, turn: nextTurn };
    return { ...next, winner: checkWin(next) };
  }

  // Wall move
  const newWallsLeft: [number, number] = [state.wallsLeft[0], state.wallsLeft[1]];
  newWallsLeft[pi]--;
  return {
    ...state,
    walls: [...state.walls, { r: move.r, c: move.c, o: move.o }],
    wallsLeft: newWallsLeft,
    turn: nextTurn,
  };
}

export function applyTimeout(state: GameState, player: Player): GameState {
  if (state.timeoutBehaviour === 'forfeit') {
    return { ...state, winner: player === 'p1' ? 'p2' : 'p1' };
  }
  // Miss a turn: just advance the turn.
  return { ...state, turn: player === 'p1' ? 'p2' : 'p1' };
}
