<script lang="ts">
  import { onMount } from 'svelte';
  import Setup from '$lib/Setup.svelte';
  import Board from '$lib/Board.svelte';
  import Timer from '$lib/Timer.svelte';
  import { game } from '$lib/gameStore.svelte.js';
  import type { Move, Player } from '@cornered/engine';
  import type { SessionConfig } from '@cornered/modes';
  import { isAITurn, applyAIMove } from '@cornered/modes';

  let aiThinking = $state(false);

  function handleStart(cfg: SessionConfig) {
    game.init(cfg);
  }

  function handleMove(move: Move) {
    if (!game.state || !game.session) return;
    const ok = game.dispatch(move);
    if (!ok) return;
    // After a human move, possibly trigger AI.
    scheduleAI();
  }

  function handleTimeout(player: Player) {
    game.declareTimeout(player);
    scheduleAI();
  }

  function scheduleAI() {
    const s = game.state;
    const sess = game.session;
    if (!s || !sess || sess.mode !== 'vs-ai') return;
    if (!isAITurn(s)) return;

    aiThinking = true;
    // Use setTimeout so the UI updates before the (potentially blocking) AI call.
    setTimeout(() => {
      const current = game.state;
      if (!current || !game.session) { aiThinking = false; return; }
      if (!isAITurn(current)) { aiThinking = false; return; }
      const next = applyAIMove(current, game.session.aiAggression, game.session.aiDepth ?? 2);
      game.setState(next);
      aiThinking = false;
    }, 80);
  }

  // On mount, kick off AI if it goes first (not the case in default config — p1 is human).
  onMount(() => {
    if (game.state && game.session) scheduleAI();
  });

  // Whenever state changes and it becomes AI's turn, schedule AI move.
  $effect(() => {
    const s = game.state;
    const sess = game.session;
    if (s && sess && sess.mode === 'vs-ai' && isAITurn(s) && !aiThinking) {
      scheduleAI();
    }
  });

  let humanPlayer = $derived(
    !game.session ? 'both' as const :
    game.session.mode === 'hotseat' ? 'both' as const : 'p1' as const
  );

  let statusMsg = $derived((() => {
    const s = game.state;
    const sess = game.session;
    if (!s) return '';
    if (s.winner) return s.winner === 'p1' ? 'Player 1 wins!' : (sess?.mode === 'vs-ai' ? 'AI wins!' : 'Player 2 wins!');
    if (aiThinking) return 'AI is thinking…';
    const whose = s.turn === 'p1' ? 'Player 1' : (sess?.mode === 'vs-ai' ? 'AI' : 'Player 2');
    return `${whose}'s turn`;
  })());

  let p1WallsLeft = $derived(game.state?.wallsLeft[0] ?? 0);
  let p2WallsLeft = $derived(game.state?.wallsLeft[1] ?? 0);
</script>

{#if !game.state}
  <Setup onstart={handleStart} />
{:else}
  <div class="game">
    <!-- Status bar -->
    <header class="status-bar">
      <div class="player-info p1" class:active={game.state.turn === 'p1' && !game.state.winner}>
        <span class="dot"></span>
        <span>P1</span>
        <span class="walls">{p1WallsLeft} walls</span>
      </div>

      <div class="center">
        <div class="status-msg" class:winner={!!game.state.winner}>
          {statusMsg}
        </div>
        {#if game.session?.timerEnabled && !game.state.winner}
          <Timer
            turn={game.state.turn}
            seconds={game.session.gameConfig.timerSeconds}
            enabled={game.session.gameConfig.timerEnabled}
            winner={game.state.winner}
            ontimeout={handleTimeout}
          />
        {/if}
      </div>

      <div class="player-info p2" class:active={game.state.turn === 'p2' && !game.state.winner}>
        <span class="walls">{p2WallsLeft} walls</span>
        <span>{game.session?.mode === 'vs-ai' ? 'AI' : 'P2'}</span>
        <span class="dot"></span>
      </div>
    </header>

    <!-- Board -->
    <main class="board-area">
      <Board
        gs={game.state}
        {humanPlayer}
        onmove={handleMove}
      />
    </main>

    <!-- Footer -->
    <footer class="footer">
      {#if game.state.winner}
        <button class="btn-primary" onclick={() => game.init(game.session!)}>Play again</button>
      {/if}
      <button class="btn-secondary" onclick={() => game.reset()}>New game</button>
    </footer>
  </div>
{/if}

<style>
  .game {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 640px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #64748b;
    transition: color 0.15s;
  }

  .player-info.active {
    color: #f1f5f9;
    font-weight: 600;
  }

  .player-info.p1 .dot { background: #60a5fa; }
  .player-info.p2 .dot { background: #f87171; }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #475569;
    transition: background 0.15s;
  }

  .player-info.p1.active .dot { background: #60a5fa; box-shadow: 0 0 6px #60a5fa; }
  .player-info.p2.active .dot { background: #f87171; box-shadow: 0 0 6px #f87171; }

  .walls {
    font-size: 0.75rem;
    color: #475569;
    background: #0f172a;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
  }

  .player-info.active .walls {
    color: #94a3b8;
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    flex: 1;
  }

  .status-msg {
    font-size: 0.9rem;
    color: #94a3b8;
    font-weight: 500;
    text-align: center;
  }

  .status-msg.winner {
    color: #f59e0b;
    font-size: 1rem;
    font-weight: 700;
  }

  .board-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .footer {
    display: flex;
    gap: 0.75rem;
    padding-bottom: 1rem;
  }

  .btn-primary {
    background: #2563eb;
    color: #fff;
    font-weight: 600;
    padding: 0.5rem 1.25rem;
  }

  .btn-primary:hover { background: #1d4ed8; }

  .btn-secondary {
    background: #334155;
    color: #94a3b8;
    padding: 0.5rem 1.25rem;
  }

  .btn-secondary:hover { background: #475569; color: #f1f5f9; }
</style>
