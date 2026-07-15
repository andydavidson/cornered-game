import type { GameState, Player } from '@cornered/engine';
import { shortestPath, goalRow } from '@cornered/engine';

/**
 * Heuristic evaluation from the perspective of `player`.
 *
 * aggression ∈ [0, 1]:
 *   - 0 → pure racer: only cares about minimising own path to goal.
 *   - 1 → pure blocker: only cares about maximising opponent's path to goal.
 *
 * Score is higher = better for `player`.
 */
export function evaluate(state: GameState, player: Player, aggression: number): number {
  if (state.winner === player) return 100_000;
  if (state.winner !== null) return -100_000;

  const pi = player === 'p1' ? 0 : 1;
  const oi = 1 - pi;
  const opp: Player = player === 'p1' ? 'p2' : 'p1';

  const myGoal = goalRow(player, state.size);
  const oppGoal = goalRow(opp, state.size);

  const myDist = shortestPath(state.size, state.walls, state.pawns[pi], myGoal) ?? 999;
  const oppDist = shortestPath(state.size, state.walls, state.pawns[oi], oppGoal) ?? 999;

  const raceScore = -myDist;            // shorter own path → better
  const blockScore = oppDist;           // longer opp path → better
  const wallBonus = state.wallsLeft[pi] * 0.5; // small bonus for wall reserves

  return (1 - aggression) * raceScore + aggression * blockScore + wallBonus;
}
