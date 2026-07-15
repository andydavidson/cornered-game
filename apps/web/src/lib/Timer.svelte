<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Player } from '@cornered/engine';

  interface Props {
    turn: Player;
    seconds: number;
    enabled: boolean;
    winner: Player | null;
    ontimeout: (player: Player) => void;
  }

  let { turn, seconds, enabled, winner, ontimeout }: Props = $props();

  let remaining = $state(0);
  let interval: ReturnType<typeof setInterval> | null = null;

  function start() {
    if (interval) clearInterval(interval);
    remaining = seconds;
    if (!enabled || winner !== null) return;
    interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        if (interval) clearInterval(interval);
        interval = null;
        ontimeout(turn);
      }
    }, 1000);
  }

  // Restart timer whenever the turn changes or game ends.
  $effect(() => {
    void turn;
    void winner;
    start();
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  const pct = $derived(Math.max(0, remaining / seconds));
  const urgent = $derived(remaining <= 10 && remaining > 0);
</script>

{#if enabled && winner === null}
  <div class="timer" class:urgent>
    <div class="bar" style="width: {pct * 100}%"></div>
    <span class="label">{remaining}s</span>
  </div>
{/if}

<style>
  .timer {
    position: relative;
    height: 28px;
    border-radius: 6px;
    background: #1e293b;
    border: 1px solid #334155;
    overflow: hidden;
    min-width: 120px;
    display: flex;
    align-items: center;
  }

  .bar {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: #3b82f6;
    transition: width 0.9s linear, background 0.3s;
    border-radius: 6px;
  }

  .urgent .bar {
    background: #ef4444;
  }

  .label {
    position: relative;
    padding: 0 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #f1f5f9;
  }
</style>
