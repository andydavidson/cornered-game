import type { Pos, WallId } from './types.js';

/**
 * Returns true if a wall blocks movement from `from` to `to`.
 * `from` and `to` must be orthogonally adjacent (differ by 1 in exactly one axis).
 *
 * Horizontal wall at (r,c): blocks (r,c)↔(r+1,c) and (r,c+1)↔(r+1,c+1).
 * Vertical wall at (r,c): blocks (r,c)↔(r,c+1) and (r+1,c)↔(r+1,c+1).
 */
export function isEdgeBlocked(walls: WallId[], from: Pos, to: Pos): boolean {
  const dr = to.r - from.r;
  const dc = to.c - from.c;

  for (const w of walls) {
    if (dr === 1 && dc === 0) {
      // Moving down: blocked by H wall at (from.r, from.c) or (from.r, from.c-1)
      if (w.o === 'h' && w.r === from.r && (w.c === from.c || w.c === from.c - 1)) return true;
    } else if (dr === -1 && dc === 0) {
      // Moving up: blocked by H wall at (to.r, from.c) or (to.r, from.c-1)
      if (w.o === 'h' && w.r === to.r && (w.c === from.c || w.c === from.c - 1)) return true;
    } else if (dr === 0 && dc === 1) {
      // Moving right: blocked by V wall at (from.r, from.c) or (from.r-1, from.c)
      if (w.o === 'v' && w.c === from.c && (w.r === from.r || w.r === from.r - 1)) return true;
    } else if (dr === 0 && dc === -1) {
      // Moving left: blocked by V wall at (from.r, to.c) or (from.r-1, to.c)
      if (w.o === 'v' && w.c === to.c && (w.r === from.r || w.r === from.r - 1)) return true;
    }
  }
  return false;
}

/**
 * BFS shortest path from `start` to any cell in `goalRow`.
 * Ignores pawn positions (for path-blocking legality check).
 * Returns the number of steps, or null if no path exists.
 */
export function shortestPath(
  size: number,
  walls: WallId[],
  start: Pos,
  goalRow: number,
): number | null {
  if (start.r === goalRow) return 0;

  const visited = new Uint8Array(size * size);
  const queue: Array<{ pos: Pos; dist: number }> = [{ pos: start, dist: 0 }];

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    const idx = pos.r * size + pos.c;
    if (visited[idx]) continue;
    visited[idx] = 1;

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = pos.r + dr;
      const nc = pos.c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (isEdgeBlocked(walls, pos, { r: nr, c: nc })) continue;
      if (nr === goalRow) return dist + 1;
      if (!visited[nr * size + nc]) {
        queue.push({ pos: { r: nr, c: nc }, dist: dist + 1 });
      }
    }
  }

  return null;
}

/** Goal row for each player. */
export function goalRow(player: 'p1' | 'p2', size: number): number {
  return player === 'p1' ? 0 : size - 1;
}
