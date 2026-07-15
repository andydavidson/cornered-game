<script lang="ts">
  import { wallsForSize } from '@cornered/engine';
  import type { SessionConfig, ModeType } from '@cornered/modes';

  interface Props {
    onstart: (cfg: SessionConfig) => void;
  }

  let { onstart }: Props = $props();

  let size = $state(9);
  let mode = $state<ModeType>('vs-ai');
  let aiAggression = $state(0.4);
  let aiDepth = $state(2);
  let timerEnabled = $state(false);
  let timerSeconds = $state(30);
  let timeoutBehaviour = $state<'miss' | 'forfeit'>('miss');

  let wallsPerPlayer = $derived(wallsForSize(size));

  // Ensure size stays odd
  function clampSize(raw: number): number {
    const clamped = Math.max(5, Math.min(13, raw));
    return clamped % 2 === 0 ? clamped + 1 : clamped;
  }

  function handleSizeInput(e: Event) {
    size = clampSize(Number((e.target as HTMLInputElement).value));
  }

  function handleStart() {
    onstart({
      gameConfig: {
        size,
        wallsPerPlayer,
        timerEnabled,
        timerSeconds,
        timeoutBehaviour,
      },
      mode,
      aiAggression,
      aiDepth,
    });
  }

  const aggressionLabel = $derived(
    aiAggression < 0.2 ? 'Passive racer' :
    aiAggression < 0.5 ? 'Balanced' :
    aiAggression < 0.8 ? 'Aggressive blocker' : 'Wall obsessed'
  );
</script>

<div class="setup">
  <h1>Cornered</h1>
  <p class="subtitle">Place walls. Race to the far side.</p>

  <div class="card">
    <section>
      <h2>Board</h2>

      <label for="size-slider">
        Board size: <strong>{size}×{size}</strong>
        &nbsp;·&nbsp; {wallsPerPlayer} walls per player
      </label>
      <input
        id="size-slider"
        type="range" min="5" max="13" step="2"
        value={size}
        oninput={handleSizeInput}
      />
      <div class="range-hints"><span>5×5</span><span>9×9</span><span>13×13</span></div>
    </section>

    <section>
      <h2>Mode</h2>
      <div class="radio-group">
        <label>
          <input type="radio" bind:group={mode} value="vs-ai" />
          vs AI
        </label>
        <label>
          <input type="radio" bind:group={mode} value="hotseat" />
          Hotseat (2 players, same device)
        </label>
      </div>
    </section>

    {#if mode === 'vs-ai'}
      <section>
        <h2>AI</h2>
        <label for="aggr-slider">
          Aggression: <strong>{aggressionLabel}</strong> ({aiAggression.toFixed(1)})
        </label>
        <input
          id="aggr-slider"
          type="range" min="0" max="1" step="0.05"
          bind:value={aiAggression}
        />
        <div class="range-hints"><span>Racer</span><span>Blocker</span></div>

        <label for="depth-select" style="margin-top:0.75rem">Difficulty:</label>
        <select id="depth-select" bind:value={aiDepth}>
          <option value={1}>Easy (depth 1)</option>
          <option value={2}>Medium (depth 2)</option>
          <option value={3}>Hard (depth 3)</option>
        </select>
      </section>
    {/if}

    <section>
      <h2>Turn timer</h2>
      <label class="toggle-label">
        <input type="checkbox" bind:checked={timerEnabled} />
        Enable turn timer
      </label>

      {#if timerEnabled}
        <div class="timer-options">
          <label for="timer-dur">Time per turn (seconds):</label>
          <select id="timer-dur" bind:value={timerSeconds}>
            <option value={15}>15 s</option>
            <option value={30}>30 s</option>
            <option value={60}>60 s</option>
            <option value={120}>120 s</option>
          </select>

          <span class="field-label">On timeout:</span>
          <div class="radio-group">
            <label>
              <input type="radio" bind:group={timeoutBehaviour} value="miss" />
              Miss a turn
            </label>
            <label>
              <input type="radio" bind:group={timeoutBehaviour} value="forfeit" />
              Forfeit the game
            </label>
          </div>
        </div>
      {/if}
    </section>

    <button class="start-btn" onclick={handleStart}>Start game</button>
  </div>
</div>

<style>
  .setup {
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.03em;
  }

  .subtitle {
    color: #64748b;
    font-size: 1rem;
    margin-top: -0.5rem;
  }

  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 0.25rem;
  }

  label {
    color: #cbd5e1;
    font-size: 0.9rem;
    display: block;
  }

  strong {
    color: #f1f5f9;
  }

  input[type="range"] {
    width: 100%;
    margin: 0.25rem 0;
  }

  .range-hints {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #475569;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    /* Minimum touch target height */
    min-height: 44px;
    padding: 0.25rem 0;
  }

  .field-label {
    color: #cbd5e1;
    font-size: 0.9rem;
    display: block;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .timer-options {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1rem;
    border-left: 2px solid #334155;
  }

  .start-btn {
    background: #2563eb;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    width: 100%;
    margin-top: 0.5rem;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: #1d4ed8;
  }
</style>
