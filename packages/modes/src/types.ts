import type { GameConfig } from '@cornered/engine';

export type ModeType = 'vs-ai' | 'hotseat';

export interface SessionConfig {
  gameConfig: GameConfig;
  mode: ModeType;
  /** AI aggression 0–1, only relevant in 'vs-ai' mode. */
  aiAggression: number;
  /** Minimax search depth (2–3 is fast; higher is stronger but slower). */
  aiDepth?: number;
}
