<script lang="ts">
  import type { GameState, Move, WallId, WallOrientation } from '@cornered/engine';
  import { legalPawnMoves, isWallLegal } from '@cornered/engine';

  interface Props {
    gs: GameState;
    /** Which player the local human controls. 'both' for hotseat. */
    humanPlayer: 'p1' | 'p2' | 'both';
    onmove: (move: Move) => void;
  }

  let { gs, humanPlayer, onmove }: Props = $props();

  // SVG coordinate constants (internal units — CSS scales the whole SVG)
  const CELL = 56;
  const GAP = 10;
  const STEP = CELL + GAP;
  const PAD = 2;
  // Extra pixels we extend the wall hit area into the adjacent cells on each side.
  // Keeps tap targets large (~46 internal units = finger-friendly after CSS scale).
  const WALL_PAD = 18;

  // Wall placement UI state
  let wallOrient = $state<WallOrientation>('h');
  // Hovered wall (desktop only — no hover on touch, but click/tap still works)
  let hoveredWall = $state<WallId | null>(null);

  // Derived values
  let legalTargets = $derived(
    (isHumanTurn() && !gs.winner)
      ? legalPawnMoves(gs).map(p => `${p.r},${p.c}`)
      : []
  );
  const svgSize = $derived(PAD * 2 + gs.size * CELL + (gs.size - 1) * GAP);

  function isHumanTurn(): boolean {
    return humanPlayer === 'both' || gs.turn === humanPlayer;
  }
  function isLegalTarget(r: number, c: number): boolean {
    return legalTargets.includes(`${r},${c}`);
  }
  function hasWallsLeft(): boolean {
    const pi = gs.turn === 'p1' ? 0 : 1;
    return gs.wallsLeft[pi] > 0;
  }
  function cx(c: number) { return PAD + c * STEP; }
  function cy(r: number) { return PAD + r * STEP; }

  function wallIsPlaced(r: number, c: number, o: WallOrientation): boolean {
    return gs.walls.some(w => w.r === r && w.c === c && w.o === o);
  }

  // Wall rect geometry (internal SVG units)
  function hWallRect(r: number, c: number) {
    return { x: cx(c), y: cy(r) + CELL, w: CELL * 2 + GAP, h: GAP };
  }
  function vWallRect(r: number, c: number) {
    return { x: cx(c) + CELL, y: cy(r), w: GAP, h: CELL * 2 + GAP };
  }

  // How far a wall's hit area may extend into the cells on a given side.
  // Zeroed out when a neighboring cell is a legal pawn-move target, so the
  // wall's tap target never steals area from a square the player can move to.
  function hWallPad(r: number, c: number) {
    const before = isLegalTarget(r, c) || isLegalTarget(r, c + 1);
    const after = isLegalTarget(r + 1, c) || isLegalTarget(r + 1, c + 1);
    return { before: before ? 0 : WALL_PAD, after: after ? 0 : WALL_PAD };
  }
  function vWallPad(r: number, c: number) {
    const before = isLegalTarget(r, c) || isLegalTarget(r + 1, c);
    const after = isLegalTarget(r, c + 1) || isLegalTarget(r + 1, c + 1);
    return { before: before ? 0 : WALL_PAD, after: after ? 0 : WALL_PAD };
  }

  // ── Interaction handlers ─────────────────────────────────────────────────
  function handleCellClick(r: number, c: number) {
    if (!isHumanTurn() || gs.winner) return;
    if (isLegalTarget(r, c)) onmove({ type: 'move', to: { r, c } });
  }

  function handleWallClick(r: number, c: number, o: WallOrientation) {
    if (!isHumanTurn() || gs.winner || !hasWallsLeft()) return;
    const w: WallId = { r, c, o };
    if (isWallLegal(gs, w)) {
      onmove({ type: 'wall', r, c, o });
      hoveredWall = null;
    }
  }

  // Desktop hover preview (no-ops on touch — onclick still works independently)
  function handleWallEnter(r: number, c: number, o: WallOrientation) {
    if (!isHumanTurn() || gs.winner || !hasWallsLeft()) return;
    const w: WallId = { r, c, o };
    hoveredWall = isWallLegal(gs, w) ? w : null;
  }
  function handleWallLeave() { hoveredWall = null; }

  function hoverFill(o: WallOrientation) {
    return gs.turn === 'p1' ? '#3b82f6' : '#ef4444';
  }
</script>

<!--
  .board-wrap constrains the width; the SVG has no width/height attrs so
  it scales via CSS (width:100%; height:auto) while the viewBox holds coords.
-->
<div class="board-wrap">
  {#if isHumanTurn() && hasWallsLeft() && !gs.winner}
    <div class="wall-toolbar">
      <span class="toolbar-label">Place wall:</span>
      <button
        class="orient-btn"
        class:active={wallOrient === 'h'}
        onclick={() => { wallOrient = 'h'; hoveredWall = null; }}
        aria-pressed={wallOrient === 'h'}
      >— Horizontal</button>
      <button
        class="orient-btn"
        class:active={wallOrient === 'v'}
        onclick={() => { wallOrient = 'v'; hoveredWall = null; }}
        aria-pressed={wallOrient === 'v'}
      >| Vertical</button>
    </div>
  {/if}

  <svg
    viewBox="0 0 {svgSize} {svgSize}"
    class="board-svg"
    style="max-width: {svgSize}px"
    aria-label="Game board"
    role="img"
  >
    <!-- ── Cells ─────────────────────────────────────────────────────────── -->
    {#each Array.from({ length: gs.size }, (_, r) => r) as r}
      {#each Array.from({ length: gs.size }, (_, c) => c) as c}
        {@const legal = isLegalTarget(r, c)}
        {@const p1here = gs.pawns[0].r === r && gs.pawns[0].c === c}
        {@const p2here = gs.pawns[1].r === r && gs.pawns[1].c === c}

        <rect
          x={cx(c)} y={cy(r)}
          width={CELL} height={CELL}
          rx="4"
          fill={legal ? 'rgba(96,165,250,0.18)' : '#1e293b'}
          stroke={legal ? '#60a5fa' : '#334155'}
          stroke-width={legal ? 1.5 : 1}
          style="cursor:{legal ? 'pointer' : 'default'}"
          role={legal ? 'button' : undefined}
          tabindex={legal ? 0 : -1}
          aria-label={legal ? `Move to row ${r} column ${c}` : undefined}
          onclick={() => handleCellClick(r, c)}
          onkeydown={(e) => e.key === 'Enter' && handleCellClick(r, c)}
        />

        <!-- Goal row stripe: blue at top (p1 goal), red at bottom (p2 goal) -->
        {#if r === 0}
          <rect x={cx(c)} y={cy(r)} width={CELL} height={3} rx="1" fill="#3b82f680" pointer-events="none"/>
        {/if}
        {#if r === gs.size - 1}
          <rect x={cx(c)} y={cy(r) + CELL - 3} width={CELL} height={3} rx="1" fill="#ef444480" pointer-events="none"/>
        {/if}

        <!-- Pawns -->
        {#if p1here}
          <circle cx={cx(c) + CELL / 2} cy={cy(r) + CELL / 2} r={CELL * 0.32}
            fill="#60a5fa" stroke="#1e3a5f" stroke-width="2" pointer-events="none"/>
          <text x={cx(c) + CELL / 2} y={cy(r) + CELL / 2 + 5}
            text-anchor="middle" fill="#fff" font-size="14" font-weight="700"
            pointer-events="none">1</text>
        {/if}
        {#if p2here}
          <circle cx={cx(c) + CELL / 2} cy={cy(r) + CELL / 2} r={CELL * 0.32}
            fill="#f87171" stroke="#5f1d1d" stroke-width="2" pointer-events="none"/>
          <text x={cx(c) + CELL / 2} y={cy(r) + CELL / 2 + 5}
            text-anchor="middle" fill="#fff" font-size="14" font-weight="700"
            pointer-events="none">2</text>
        {/if}
      {/each}
    {/each}

    <!-- ── Placed walls ─────────────────────────────────────────────────── -->
    {#each gs.walls as w}
      {@const rect = w.o === 'h' ? hWallRect(w.r, w.c) : vWallRect(w.r, w.c)}
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h}
        rx="2" fill="#f59e0b" pointer-events="none"/>
    {/each}

    <!-- ── Hover preview (desktop only — invisible on touch, click still works) -->
    {#if hoveredWall}
      {@const rect = hoveredWall.o === 'h'
        ? hWallRect(hoveredWall.r, hoveredWall.c)
        : vWallRect(hoveredWall.r, hoveredWall.c)}
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h}
        rx="2" fill={hoverFill(hoveredWall.o)} opacity="0.65" pointer-events="none"/>
    {/if}

    <!-- ── Wall slot hit areas ──────────────────────────────────────────── -->
    <!--
      IMPORTANT: pointer-events="all" is required for iOS Safari to fire click
      events on SVG elements that have no visible fill.
      Hit areas extend WALL_PAD units into each adjacent cell so they're large
      enough to tap reliably on touch screens — except on a side whose
      neighboring cell is a legal pawn-move target, where padding is zeroed
      so the wall's tap target can't steal a move square (see hWallPad/vWallPad).
    -->
    {#if isHumanTurn() && hasWallsLeft() && !gs.winner}
      {#each Array.from({ length: gs.size - 1 }, (_, i) => i) as r}
        {#each Array.from({ length: gs.size - 1 }, (_, i) => i) as c}
          {#if wallOrient === 'h' && !wallIsPlaced(r, c, 'h')}
            {@const rect = hWallRect(r, c)}
            {@const pad = hWallPad(r, c)}
            <rect
              x={rect.x}
              y={rect.y - pad.before}
              width={rect.w}
              height={rect.h + pad.before + pad.after}
              fill="rgba(0,0,0,0.001)"
              pointer-events="all"
              style="cursor:pointer"
              role="button"
              tabindex="0"
              aria-label="Place horizontal wall at row {r}, column {c}"
              onmouseenter={() => handleWallEnter(r, c, 'h')}
              onmouseleave={handleWallLeave}
              onclick={() => handleWallClick(r, c, 'h')}
              onkeydown={(e) => e.key === 'Enter' && handleWallClick(r, c, 'h')}
            />
          {/if}
          {#if wallOrient === 'v' && !wallIsPlaced(r, c, 'v')}
            {@const rect = vWallRect(r, c)}
            {@const pad = vWallPad(r, c)}
            <rect
              x={rect.x - pad.before}
              y={rect.y}
              width={rect.w + pad.before + pad.after}
              height={rect.h}
              fill="rgba(0,0,0,0.001)"
              pointer-events="all"
              style="cursor:pointer"
              role="button"
              tabindex="0"
              aria-label="Place vertical wall at row {r}, column {c}"
              onmouseenter={() => handleWallEnter(r, c, 'v')}
              onmouseleave={handleWallLeave}
              onclick={() => handleWallClick(r, c, 'v')}
              onkeydown={(e) => e.key === 'Enter' && handleWallClick(r, c, 'v')}
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
    width: 100%;
  }

  /* SVG has no width/height attrs — CSS drives the display size.
     max-width is set inline to the native viewBox size so it never
     renders larger than designed, but shrinks freely on small screens. */
  .board-svg {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
    background: #0f172a;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    /* Prevent browser default touch behaviours (pan/zoom) inside the SVG */
    touch-action: none;
  }

  .wall-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toolbar-label {
    font-size: 0.8rem;
    color: #64748b;
  }

  .orient-btn {
    background: #334155;
    color: #94a3b8;
    /* Min 44×44pt touch target per Apple HIG */
    min-width: 44px;
    min-height: 44px;
    padding: 0 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid #475569;
  }

  .orient-btn.active {
    background: #1e40af;
    color: #fff;
    border-color: #3b82f6;
  }

  @media (hover: hover) {
    .orient-btn:hover:not(.active) {
      background: #475569;
    }
  }
</style>
