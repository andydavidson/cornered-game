<script lang="ts">
  import type { GameState, Move, WallId, WallOrientation, Pos } from '@cornered/engine';
  import { legalPawnMoves, isWallLegal } from '@cornered/engine';

  interface Props {
    gs: GameState;
    /** Which player the local human controls. 'both' for hotseat. */
    humanPlayer: 'p1' | 'p2' | 'both';
    onmove: (move: Move) => void;
  }

  let { gs, humanPlayer, onmove }: Props = $props();

  // Layout constants
  const CELL = 56;
  const GAP = 10;
  const STEP = CELL + GAP;
  const PAD = 1;

  // Wall placement UI state
  let wallOrient = $state<WallOrientation>('h');
  let hoveredWall = $state<WallId | null>(null);

  // Derived from state
  let legalTargets = $derived(
    (isHumanTurn() && !gs.winner) ? legalPawnMoves(state).map(p => `${p.r},${p.c}`) : []
  );

  function isHumanTurn(): boolean {
    return humanPlayer === 'both' || gs.turn === humanPlayer;
  }

  function isLegalTarget(r: number, c: number): boolean {
    return legalTargets.includes(`${r},${c}`);
  }

  function playerIndex(): number {
    return gs.turn === 'p1' ? 0 : 1;
  }

  function hasWallsLeft(): boolean {
    return gs.wallsLeft[playerIndex()] > 0;
  }

  // ── SVG coordinate helpers ────────────────────────────────────────────────
  function cx(c: number) { return PAD + c * STEP; }
  function cy(r: number) { return PAD + r * STEP; }

  const svgSize = $derived(PAD * 2 + gs.size * CELL + (gs.size - 1) * GAP);

  // ── Interaction ──────────────────────────────────────────────────────────
  function handleCellClick(r: number, c: number) {
    if (!isHumanTurn() || gs.winner) return;
    if (isLegalTarget(r, c)) {
      onmove({ type: 'move', to: { r, c } });
    }
  }

  function handleWallSlotEnter(r: number, c: number, o: WallOrientation) {
    if (!isHumanTurn() || gs.winner || !hasWallsLeft()) { hoveredWall = null; return; }
    const w: WallId = { r, c, o };
    hoveredWall = isWallLegal(gs, w) ? w : null;
  }

  function handleWallSlotLeave() {
    hoveredWall = null;
  }

  function handleWallSlotClick(r: number, c: number, o: WallOrientation) {
    if (!isHumanTurn() || gs.winner || !hasWallsLeft()) return;
    const w: WallId = { r, c, o };
    if (isWallLegal(gs, w)) {
      onmove({ type: 'wall', r, c, o });
      hoveredWall = null;
    }
  }

  function wallIsPlaced(r: number, c: number, o: WallOrientation): boolean {
    return gs.walls.some(w => w.r === r && w.c === c && w.o === o);
  }

  // Wall rect geometry
  function hWallRect(r: number, c: number) {
    return { x: cx(c), y: cy(r) + CELL, w: CELL * 2 + GAP, h: GAP };
  }
  function vWallRect(r: number, c: number) {
    return { x: cx(c) + CELL, y: cy(r), w: GAP, h: CELL * 2 + GAP };
  }

  function wallColor(turn: 'p1' | 'p2') {
    return turn === 'p1' ? '#3b82f6' : '#ef4444';
  }

  function isHovered(r: number, c: number, o: WallOrientation): boolean {
    return hoveredWall !== null && hoveredWall.r === r && hoveredWall.c === c && hoveredWall.o === o;
  }

  // Wall orientation toggle label
  let orientLabel = $derived(wallOrient === 'h' ? 'Horizontal wall' : 'Vertical wall');
</script>

<div class="board-wrap">
  <!-- Wall orientation toggle (only shown when it's human's turn and they have walls) -->
  {#if isHumanTurn() && hasWallsLeft() && !gs.winner}
    <div class="wall-toolbar">
      <span class="label">Wall:</span>
      <button
        class="orient-btn"
        class:active={wallOrient === 'h'}
        onclick={() => { wallOrient = 'h'; hoveredWall = null; }}
      >— H</button>
      <button
        class="orient-btn"
        class:active={wallOrient === 'v'}
        onclick={() => { wallOrient = 'v'; hoveredWall = null; }}
      >| V</button>
    </div>
  {/if}

  <svg
    width={svgSize}
    height={svgSize}
    viewBox="0 0 {svgSize} {svgSize}"
    class="board-svg"
    aria-label="Game board"
    role="img"
  >
    <!-- ── Cells ───────────────────────────────────────────────────────── -->
    {#each Array.from({ length: gs.size }, (_, r) => r) as r}
      {#each Array.from({ length: gs.size }, (_, c) => c) as c}
        {@const legal = isLegalTarget(r, c)}
        {@const p1here = gs.pawns[0].r === r && gs.pawns[0].c === c}
        {@const p2here = gs.pawns[1].r === r && gs.pawns[1].c === c}
        <!-- Cell background -->
        <rect
          x={cx(c)} y={cy(r)}
          width={CELL} height={CELL}
          rx="4"
          fill={legal ? 'rgba(96,165,250,0.18)' : '#1e293b'}
          stroke={legal ? '#60a5fa' : '#334155'}
          stroke-width={legal ? 1.5 : 1}
          style="cursor: {legal ? 'pointer' : 'default'}"
          role="button"
          tabindex={legal ? 0 : -1}
          aria-label={legal ? `Move to row ${r} col ${c}` : `Cell ${r},${c}`}
          onclick={() => handleCellClick(r, c)}
          onkeydown={(e) => e.key === 'Enter' && handleCellClick(r, c)}
        />
        <!-- Goal row indicators -->
        {#if r === 0}
          <rect x={cx(c)} y={cy(r)} width={CELL} height={3} rx="1" fill="#3b82f680"/>
        {/if}
        {#if r === gs.size - 1}
          <rect x={cx(c)} y={cy(r) + CELL - 3} width={CELL} height={3} rx="1" fill="#ef444480"/>
        {/if}
        <!-- Pawns -->
        {#if p1here}
          <circle cx={cx(c) + CELL / 2} cy={cy(r) + CELL / 2} r={CELL * 0.32} fill="#60a5fa" stroke="#1e3a5f" stroke-width="2"/>
          <text x={cx(c) + CELL / 2} y={cy(r) + CELL / 2 + 5} text-anchor="middle" fill="#fff" font-size="14" font-weight="700" pointer-events="none">1</text>
        {/if}
        {#if p2here}
          <circle cx={cx(c) + CELL / 2} cy={cy(r) + CELL / 2} r={CELL * 0.32} fill="#f87171" stroke="#5f1d1d" stroke-width="2"/>
          <text x={cx(c) + CELL / 2} y={cy(r) + CELL / 2 + 5} text-anchor="middle" fill="#fff" font-size="14" font-weight="700" pointer-events="none">2</text>
        {/if}
      {/each}
    {/each}

    <!-- ── Placed walls ────────────────────────────────────────────────── -->
    {#each gs.walls as w}
      {#if w.o === 'h'}
        {@const rect = hWallRect(w.r, w.c)}
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="2" fill="#f59e0b"/>
      {:else}
        {@const rect = vWallRect(w.r, w.c)}
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="2" fill="#f59e0b"/>
      {/if}
    {/each}

    <!-- ── Hovered wall preview ────────────────────────────────────────── -->
    {#if hoveredWall}
      {#if hoveredWall.o === 'h'}
        {@const rect = hWallRect(hoveredWall.r, hoveredWall.c)}
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="2" fill={wallColor(gs.turn)} opacity="0.7"/>
      {:else}
        {@const rect = vWallRect(hoveredWall.r, hoveredWall.c)}
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="2" fill={wallColor(gs.turn)} opacity="0.7"/>
      {/if}
    {/if}

    <!-- ── Wall slot hit areas ────────────────────────────────────────── -->
    {#if isHumanTurn() && hasWallsLeft() && !gs.winner}
      {#each Array.from({ length: gs.size - 1 }, (_, i) => i) as r}
        {#each Array.from({ length: gs.size - 1 }, (_, i) => i) as c}
          {#if wallOrient === 'h' && !wallIsPlaced(r, c, 'h')}
            {@const rect = hWallRect(r, c)}
            <rect
              x={rect.x} y={rect.y - 4}
              width={rect.w} height={rect.h + 8}
              fill="transparent"
              style="cursor: pointer"
              role="button"
              tabindex="0"
              aria-label="Place horizontal wall at {r},{c}"
              onmouseenter={() => handleWallSlotEnter(r, c, 'h')}
              onmouseleave={handleWallSlotLeave}
              onclick={() => handleWallSlotClick(r, c, 'h')}
              onkeydown={(e) => e.key === 'Enter' && handleWallSlotClick(r, c, 'h')}
            />
          {/if}
          {#if wallOrient === 'v' && !wallIsPlaced(r, c, 'v')}
            {@const rect = vWallRect(r, c)}
            <rect
              x={rect.x - 4} y={rect.y}
              width={rect.w + 8} height={rect.h}
              fill="transparent"
              style="cursor: pointer"
              role="button"
              tabindex="0"
              aria-label="Place vertical wall at {r},{c}"
              onmouseenter={() => handleWallSlotEnter(r, c, 'v')}
              onmouseleave={handleWallSlotLeave}
              onclick={() => handleWallSlotClick(r, c, 'v')}
              onkeydown={(e) => e.key === 'Enter' && handleWallSlotClick(r, c, 'v')}
            />
          {/if}
        {/each}
      {/each}
    {/if}
  </svg>
</div>

<style>
  .board-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .board-svg {
    display: block;
    border-radius: 8px;
    background: #0f172a;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }

  .wall-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .orient-btn {
    background: #334155;
    color: #94a3b8;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    border: 1px solid #475569;
  }

  .orient-btn.active {
    background: #1e40af;
    color: #fff;
    border-color: #3b82f6;
  }

  .orient-btn:hover:not(.active) {
    background: #475569;
  }

  .label {
    font-size: 0.8rem;
    color: #64748b;
  }
</style>
