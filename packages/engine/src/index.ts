export type {
  Player,
  WallOrientation,
  Pos,
  WallId,
  PawnMove,
  WallMove,
  Move,
  GameState,
  GameConfig,
} from './types.js';

export { wallsForSize, initialState, defaultConfig } from './config.js';
export { isEdgeBlocked, shortestPath, goalRow } from './graph.js';
export { legalPawnMoves, checkWin, applyMove, applyTimeout } from './moves.js';
export { wallsConflict, isWallLegal, legalWallMoves, legalMoves } from './walls.js';
