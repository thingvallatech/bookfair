# Flash Games Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three Flash-era games (Helicopter Game, Line Rider, Stick Brawler) as shelf toys in The Book Fair.

**Architecture:** Each game is a standalone Svelte 5 component in `src/lib/toys/` using canvas rendering and `requestAnimationFrame` game loops. They follow the existing toy pattern: accept `onClose` prop, use CloseButton, integrate with beanieHunt, and play sound effects. All three are registered in the shelf grid on `+page.svelte`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, HTML5 Canvas, TypeScript

---

### Task 1: Helicopter Game — Component Shell

**Files:**
- Create: `src/lib/toys/HelicopterGame.svelte`

**Step 1: Create the component with game states and canvas setup**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { haptic } from '$lib/stores/haptics';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie
  const hidingSpots: HidingSpot[] = [{ id: 'behind-replay' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Canvas
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animFrame: number;
  let containerEl: HTMLDivElement;

  // Game config
  const GRAVITY = 0.35;
  const LIFT = -0.6;
  const SCROLL_SPEED_INITIAL = 2.5;
  const GAP_MIN = 120;
  const GAP_SHRINK_RATE = 0.15; // gap shrinks per column
  const HELICOPTER_X = 80;
  const HELI_WIDTH = 32;
  const HELI_HEIGHT = 20;

  // Game state
  let gameState = $state<'title' | 'playing' | 'dead'>('title');
  let score = $state(0);
  let highScore = $state(0);
  let pressing = $state(false);

  // Physics
  let heliY = 0;
  let heliVY = 0;
  let scrollSpeed = SCROLL_SPEED_INITIAL;
  let frameCount = 0;

  // Cave columns: each has { top: number, bottom: number }
  let caveColumns: Array<{ top: number; bottom: number }> = [];
  let caveOffset = 0; // sub-pixel scroll offset

  // Particles (engine trail)
  let particles: Array<{ x: number; y: number; life: number; vx: number; vy: number }> = [];

  // Screen shake
  let shakeX = 0;
  let shakeY = 0;
  let shakeFrames = 0;

  function initCave(w: number, h: number) {
    caveColumns = [];
    const gap = Math.max(GAP_MIN, h * 0.45);
    const centerY = h / 2;
    // Generate enough columns to fill screen + buffer
    const cols = Math.ceil(w / 4) + 60;
    for (let i = 0; i < cols; i++) {
      const gapHere = Math.max(GAP_MIN, gap - i * GAP_SHRINK_RATE);
      const drift = Math.sin(i * 0.03) * (h * 0.2) + (Math.random() - 0.5) * 30;
      const center = Math.max(gapHere / 2 + 10, Math.min(h - gapHere / 2 - 10, centerY + drift));
      caveColumns.push({
        top: center - gapHere / 2,
        bottom: center + gapHere / 2,
      });
    }
    caveOffset = 0;
  }

  function addCaveColumn(h: number) {
    const prev = caveColumns[caveColumns.length - 1];
    const prevCenter = (prev.top + prev.bottom) / 2;
    const prevGap = prev.bottom - prev.top;
    const gap = Math.max(GAP_MIN, prevGap - GAP_SHRINK_RATE);
    const drift = (Math.random() - 0.5) * 40;
    const center = Math.max(gap / 2 + 10, Math.min(h - gap / 2 - 10, prevCenter + drift));
    caveColumns.push({ top: center - gap / 2, bottom: center + gap / 2 });
  }

  function startGame() {
    const h = canvas.height;
    heliY = h / 2;
    heliVY = 0;
    scrollSpeed = SCROLL_SPEED_INITIAL;
    frameCount = 0;
    score = 0;
    particles = [];
    shakeFrames = 0;
    initCave(canvas.width, h);
    gameState = 'playing';
    playSound('powerup', 0.4);
  }

  function die() {
    gameState = 'dead';
    shakeFrames = 12;
    playSound('death', 0.5);
    haptic('error');
    if (score > highScore) {
      highScore = score;
      playSound('victory', 0.4);
      try { localStorage.setItem('helicopter-highscore', String(highScore)); } catch {}
    }
  }

  // --- Drawing helpers ---

  function drawHelicopter(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(0, 0, HELI_WIDTH / 2, HELI_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.ellipse(8, -2, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-HELI_WIDTH / 2 - 8, -3, 12, 6);

    // Tail fin
    ctx.fillRect(-HELI_WIDTH / 2 - 6, -10, 4, 8);

    // Rotor (animated)
    const rotorPhase = (frameCount * 0.5) % Math.PI;
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rotorLen = 24 * Math.cos(rotorPhase);
    ctx.moveTo(-rotorLen, -HELI_HEIGHT / 2 - 2);
    ctx.lineTo(rotorLen, -HELI_HEIGHT / 2 - 2);
    ctx.stroke();

    // Rotor mast
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(-1, -HELI_HEIGHT / 2 - 2, 2, 4);

    // Skids
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, HELI_HEIGHT / 2);
    ctx.lineTo(-10, HELI_HEIGHT / 2 + 4);
    ctx.lineTo(10, HELI_HEIGHT / 2 + 4);
    ctx.lineTo(10, HELI_HEIGHT / 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawCave(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const startCol = Math.floor(caveOffset / 4);
    const subOffset = caveOffset % 4;

    // Top wall
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= Math.ceil(w / 4) + 1; i++) {
      const col = caveColumns[startCol + i];
      if (!col) break;
      ctx.lineTo(i * 4 - subOffset, col.top);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();

    // Top wall edge highlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= Math.ceil(w / 4) + 1; i++) {
      const col = caveColumns[startCol + i];
      if (!col) break;
      if (i === 0) ctx.moveTo(i * 4 - subOffset, col.top);
      else ctx.lineTo(i * 4 - subOffset, col.top);
    }
    ctx.stroke();

    // Bottom wall
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= Math.ceil(w / 4) + 1; i++) {
      const col = caveColumns[startCol + i];
      if (!col) break;
      ctx.lineTo(i * 4 - subOffset, col.bottom);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Bottom wall edge highlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= Math.ceil(w / 4) + 1; i++) {
      const col = caveColumns[startCol + i];
      if (!col) break;
      if (i === 0) ctx.moveTo(i * 4 - subOffset, col.bottom);
      else ctx.lineTo(i * 4 - subOffset, col.bottom);
    }
    ctx.stroke();
  }

  function drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of particles) {
      const alpha = p.life / 20;
      ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Main loop ---

  function gameLoop() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    if (gameState === 'playing') {
      frameCount++;

      // Physics
      heliVY += GRAVITY;
      if (pressing) heliVY += LIFT;
      heliVY = Math.max(-8, Math.min(8, heliVY));
      heliY += heliVY;

      // Scroll
      scrollSpeed = SCROLL_SPEED_INITIAL + frameCount * 0.001;
      caveOffset += scrollSpeed;

      // Generate new cave columns as needed
      const neededCols = Math.ceil(caveOffset / 4) + Math.ceil(w / 4) + 10;
      while (caveColumns.length < neededCols) {
        addCaveColumn(h);
      }

      // Score
      score = Math.floor(frameCount / 3);

      // Milestone sounds
      if (score > 0 && score % 100 === 0) {
        playSound('coin', 0.3);
      }

      // Particles
      if (frameCount % 2 === 0) {
        particles.push({
          x: HELICOPTER_X - HELI_WIDTH / 2 - 5,
          y: heliY + (Math.random() - 0.5) * 6,
          life: 20,
          vx: -scrollSpeed * 0.5 + (Math.random() - 0.5),
          vy: (Math.random() - 0.5) * 2,
        });
      }
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Collision check
      const colIndex = Math.floor((caveOffset + HELICOPTER_X) / 4);
      for (let dx = -Math.ceil(HELI_WIDTH / 8); dx <= Math.ceil(HELI_WIDTH / 8); dx++) {
        const col = caveColumns[colIndex + dx];
        if (col) {
          if (heliY - HELI_HEIGHT / 2 < col.top || heliY + HELI_HEIGHT / 2 > col.bottom) {
            die();
            break;
          }
        }
      }

      // Off screen
      if (heliY < 0 || heliY > h) {
        die();
      }
    }

    // Shake
    if (shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * shakeFrames * 1.5;
      shakeY = (Math.random() - 0.5) * shakeFrames * 1.5;
      shakeFrames--;
    } else {
      shakeX = 0;
      shakeY = 0;
    }

    // --- Render ---
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -10, w + 20, h + 20);

    // Draw cave
    drawCave(ctx, w, h);

    // Draw particles
    drawParticles(ctx);

    // Draw helicopter
    if (gameState === 'playing' || gameState === 'dead') {
      drawHelicopter(ctx, HELICOPTER_X, heliY);
    }

    ctx.restore();

    // --- UI overlays (not affected by shake) ---

    // Score during gameplay
    if (gameState === 'playing') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(score), w - 20, 40);
    }

    animFrame = requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    if (!canvas || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function handlePointerDown(e: PointerEvent | KeyboardEvent) {
    if (gameState === 'title') {
      startGame();
      pressing = true;
      return;
    }
    if (gameState === 'dead') {
      startGame();
      pressing = true;
      return;
    }
    pressing = true;
  }

  function handlePointerUp() {
    pressing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      handlePointerDown(e);
    }
  }

  function handleKeyup(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      pressing = false;
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;

    try {
      const saved = localStorage.getItem('helicopter-highscore');
      if (saved) highScore = parseInt(saved, 10);
    } catch {}

    registerSpots('helicopter', hidingSpots);
    const beanies = getBeaniesForArea('helicopter');
    hiddenBeanie = beanies.get('behind-replay') || null;

    resizeCanvas();
    animFrame = requestAnimationFrame(gameLoop);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    window.removeEventListener('resize', resizeCanvas);
  });
</script>

<div
  class="helicopter-container"
  bind:this={containerEl}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerUp}
  role="application"
  aria-label="Helicopter Game"
>
  <CloseButton {onClose} />
  <canvas bind:this={canvas}></canvas>

  {#if gameState === 'title'}
    <div class="overlay">
      <div class="overlay-content">
        <h1 class="title">HELICOPTER</h1>
        <p class="instruction">Hold to fly up, release to drop</p>
        <button class="start-btn nes-btn is-success" onclick={() => { startGame(); pressing = true; }}>
          PLAY
        </button>
        <p class="hint">or click / press SPACE</p>
        {#if highScore > 0}
          <p class="high-score-display">Best: {highScore}</p>
        {/if}
      </div>
    </div>
  {:else if gameState === 'dead'}
    <div class="overlay gameover">
      <div class="overlay-content">
        <h2>CRASH!</h2>
        <p class="final-score">Distance: {score}</p>
        {#if score === highScore && score > 0}
          <p class="new-record">NEW HIGH SCORE!</p>
        {/if}
        <div class="replay-wrapper">
          {#if hiddenBeanie}
            <HidingBeanie beanie={hiddenBeanie} class="replay-beanie" />
          {/if}
          <button class="start-btn nes-btn is-primary" onclick={() => { startGame(); pressing = true; }}>
            PLAY AGAIN
          </button>
        </div>
        <p class="hint">or click anywhere / press SPACE</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .helicopter-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #0f172a;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .overlay-content {
    text-align: center;
    color: #fff;
    pointer-events: auto;
  }

  .title {
    font-size: 2.5rem;
    color: #4ade80;
    margin: 0 0 12px 0;
    text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
    letter-spacing: 4px;
  }

  .overlay-content h2 {
    font-size: 2rem;
    margin: 0 0 16px 0;
    color: #ef4444;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
  }

  .instruction {
    font-size: 0.7rem;
    margin: 8px 0 16px 0;
    color: #94a3b8;
  }

  .start-btn {
    margin: 16px 0 8px 0;
    font-size: 0.7rem !important;
    padding: 8px 24px !important;
    pointer-events: auto;
  }

  .hint {
    font-size: 0.45rem;
    color: #475569;
    margin: 4px 0;
  }

  .final-score {
    font-size: 1.2rem;
    margin: 8px 0;
    color: #f7d51d;
  }

  .new-record {
    font-size: 0.7rem;
    color: #f7d51d;
    animation: flash 0.5s ease-in-out infinite alternate;
    margin: 4px 0 8px;
  }

  .high-score-display {
    font-size: 0.6rem;
    color: #f7d51d;
    margin-top: 12px;
  }

  .replay-wrapper {
    position: relative;
    display: inline-block;
  }

  :global(.replay-beanie) {
    position: absolute;
    top: -10px;
    right: -25px;
    z-index: 5;
  }

  @keyframes flash {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }
</style>
```

**Step 2: Verify it runs**

Run: `npm run dev`

Open browser to `http://localhost:5173`, manually test by clicking helicopter on shelf (after Task 4 integrates it). For now, verify no TypeScript errors:

Run: `npm run check`
Expected: No errors in HelicopterGame.svelte

**Step 3: Commit**

```bash
git add src/lib/toys/HelicopterGame.svelte
git commit -m "feat: add Helicopter Game toy component"
```

---

### Task 2: Line Rider — Component

**Files:**
- Create: `src/lib/toys/LineRider.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { haptic } from '$lib/stores/haptics';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie
  const hidingSpots: HidingSpot[] = [{ id: 'behind-eraser' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Canvas
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animFrame: number;
  let containerEl: HTMLDivElement;

  // Mode
  let mode = $state<'draw' | 'play'>('draw');
  let isDrawing = $state(false);

  // Lines: array of segments
  type Line = { x1: number; y1: number; x2: number; y2: number };
  let lines = $state<Line[]>([]);
  let currentDrawStart: { x: number; y: number } | null = null;

  // Camera
  let cameraX = 0;
  let cameraY = 0;
  let targetCameraX = 0;
  let targetCameraY = 0;

  // Rider physics
  const RIDER_GRAVITY = 0.4;
  const RIDER_RADIUS = 8;
  const FRICTION = 0.98;
  const BOUNCE = 0.3;
  let riderX = 0;
  let riderY = 0;
  let riderVX = 0;
  let riderVY = 0;
  let riderAngle = 0; // lean angle
  let riderOnGround = false;
  let riderFellOff = false;

  // Sled parts for ragdoll
  let sledParts: Array<{ x: number; y: number; vx: number; vy: number; angle: number }> = [];

  function resetRider() {
    riderX = 60;
    riderY = 50;
    riderVX = 1;
    riderVY = 0;
    riderAngle = 0;
    riderOnGround = false;
    riderFellOff = false;
    sledParts = [];
    cameraX = 0;
    cameraY = 0;
    targetCameraX = 0;
    targetCameraY = 0;
  }

  function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) + cameraX,
      y: (clientY - rect.top) * (canvas.height / rect.height) + cameraY,
    };
  }

  // --- Drawing handlers ---

  function onPointerDown(e: PointerEvent) {
    if (mode !== 'draw') return;
    isDrawing = true;
    const p = toCanvas(e.clientX, e.clientY);
    currentDrawStart = p;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDrawing || mode !== 'draw' || !currentDrawStart) return;
    const p = toCanvas(e.clientX, e.clientY);
    const dx = p.x - currentDrawStart.x;
    const dy = p.y - currentDrawStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      lines = [...lines, { x1: currentDrawStart.x, y1: currentDrawStart.y, x2: p.x, y2: p.y }];
      currentDrawStart = p;
    }
  }

  function onPointerUp() {
    isDrawing = false;
    currentDrawStart = null;
  }

  // --- Physics ---

  function closestPointOnSegment(px: number, py: number, seg: Line): { x: number; y: number; t: number } {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: seg.x1, y: seg.y1, t: 0 };
    let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: seg.x1 + t * dx, y: seg.y1 + t * dy, t };
  }

  function updateRider() {
    if (riderFellOff) {
      // Ragdoll sledParts
      for (const p of sledParts) {
        p.vy += RIDER_GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vx * 0.05;
      }
      return;
    }

    // Gravity
    riderVY += RIDER_GRAVITY;

    // Move
    riderX += riderVX;
    riderY += riderVY;

    // Collide with lines
    riderOnGround = false;
    for (const seg of lines) {
      const cp = closestPointOnSegment(riderX, riderY, seg);
      const dx = riderX - cp.x;
      const dy = riderY - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RIDER_RADIUS && dist > 0) {
        // Normal direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Only collide if approaching from above (dot product with velocity)
        const velDot = riderVX * nx + riderVY * ny;
        if (velDot < 0) {
          // Push out
          riderX = cp.x + nx * RIDER_RADIUS;
          riderY = cp.y + ny * RIDER_RADIUS;

          // Reflect velocity
          riderVX -= (1 + BOUNCE) * velDot * nx;
          riderVY -= (1 + BOUNCE) * velDot * ny;

          // Friction along surface
          const tx = -ny;
          const ty = nx;
          const tangentVel = riderVX * tx + riderVY * ty;
          riderVX = tangentVel * FRICTION * tx;
          riderVY = tangentVel * FRICTION * ty;

          // Lean angle from surface
          const segDx = seg.x2 - seg.x1;
          const segDy = seg.y2 - seg.y1;
          riderAngle = Math.atan2(segDy, segDx);

          riderOnGround = true;

          // Add a bit of forward momentum when sliding
          if (Math.abs(riderVX) < 0.5 && Math.abs(segDy) > 5) {
            riderVX += Math.sign(segDx) * 0.3;
          }
        }
      }
    }

    if (!riderOnGround) {
      // Gradually return angle to 0 in air
      riderAngle *= 0.95;
    }

    // Fall off screen check
    if (canvas && riderY > cameraY + canvas.height + 200) {
      riderFellOff = true;
      playSound('death', 0.4);
      // Create ragdoll parts
      sledParts = [
        { x: riderX, y: riderY - 20, vx: riderVX + (Math.random() - 0.5) * 3, vy: riderVY - 3, angle: 0 },
        { x: riderX, y: riderY, vx: riderVX + (Math.random() - 0.5) * 3, vy: riderVY - 2, angle: Math.random() },
      ];
    }
  }

  // --- Drawing ---

  function drawRider(ctx: CanvasRenderingContext2D) {
    if (riderFellOff) {
      // Draw ragdoll parts
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      for (const p of sledParts) {
        ctx.save();
        ctx.translate(p.x - cameraX, p.y - cameraY);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    const sx = riderX - cameraX;
    const sy = riderY - cameraY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(riderAngle);

    // Sled
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(12, 4);
    ctx.quadraticCurveTo(16, 4, 14, 0);
    ctx.stroke();

    // Body
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    // Torso
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-2, -10);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(-2, -15, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(6, -4);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(6, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-6, 5);
    ctx.stroke();

    ctx.restore();
  }

  function drawLines(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const seg of lines) {
      ctx.beginPath();
      ctx.moveTo(seg.x1 - cameraX, seg.y1 - cameraY);
      ctx.lineTo(seg.x2 - cameraX, seg.y2 - cameraY);
      ctx.stroke();
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetX = -(cameraX % gridSize);
    const offsetY = -(cameraY % gridSize);

    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // Flag marker at rider start
  function drawFlag(ctx: CanvasRenderingContext2D) {
    const fx = 60 - cameraX;
    const fy = 50 - cameraY;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(fx, fy - 30, 16, 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 30);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }

  // --- Game loop ---

  function loop() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    if (mode === 'play') {
      updateRider();

      // Camera follows rider
      targetCameraX = riderX - w * 0.3;
      targetCameraY = riderY - h * 0.5;
      cameraX += (targetCameraX - cameraX) * 0.08;
      cameraY += (targetCameraY - cameraY) * 0.08;
    }

    // Clear
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Grid
    drawGrid(ctx, w, h);

    // Lines
    drawLines(ctx);

    // Flag
    drawFlag(ctx);

    // Rider (play mode only)
    if (mode === 'play') {
      drawRider(ctx);
    }

    // Draw mode: show cursor preview line
    if (mode === 'draw' && isDrawing && currentDrawStart) {
      // We don't have the current mouse pos here, but the live line
      // is drawn via pointermove adding segments continuously
    }

    animFrame = requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    if (!canvas || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function togglePlay() {
    if (mode === 'draw') {
      mode = 'play';
      resetRider();
      playSound('powerup', 0.3);
    } else {
      mode = 'draw';
      cameraX = 0;
      cameraY = 0;
      playSound('click', 0.2);
    }
  }

  function undoLine() {
    if (lines.length === 0) return;
    // Remove last ~10 segments (one stroke)
    const removeCount = Math.min(10, lines.length);
    lines = lines.slice(0, lines.length - removeCount);
    playSound('erase', 0.3);
  }

  function clearAll() {
    lines = [];
    playSound('erase', 0.4);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      undoLine();
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resizeCanvas();

    registerSpots('linerider', hidingSpots);
    const beanies = getBeaniesForArea('linerider');
    hiddenBeanie = beanies.get('behind-eraser') || null;

    animFrame = requestAnimationFrame(loop);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', resizeCanvas);
  });
</script>

<div
  class="linerider-container"
  bind:this={containerEl}
  role="application"
  aria-label="Line Rider"
>
  <CloseButton {onClose} />

  <div class="toolbar">
    <button
      class="tool-btn nes-btn"
      class:is-primary={mode === 'play'}
      class:is-success={mode === 'draw'}
      onclick={togglePlay}
    >
      {mode === 'draw' ? '▶ Play' : '✏ Draw'}
    </button>

    {#if mode === 'draw'}
      <button class="tool-btn nes-btn" onclick={undoLine} disabled={lines.length === 0}>
        ↩ Undo
      </button>
      <button class="tool-btn nes-btn is-error" onclick={clearAll} disabled={lines.length === 0}>
        ✕ Clear
      </button>
    {:else}
      <button class="tool-btn nes-btn" onclick={() => { mode = 'play'; resetRider(); }}>
        ↻ Restart
      </button>
    {/if}

    <div class="toolbar-spacer"></div>

    <div class="eraser-wrapper">
      {#if hiddenBeanie}
        <HidingBeanie beanie={hiddenBeanie} class="eraser-beanie" />
      {/if}
    </div>
  </div>

  <canvas
    bind:this={canvas}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointerleave={onPointerUp}
    class:drawing={mode === 'draw'}
  ></canvas>

  {#if mode === 'draw' && lines.length === 0}
    <div class="hint-overlay">
      <p>Draw lines for the rider to sled on!</p>
      <p class="sub-hint">Click and drag to draw. Press SPACE to play.</p>
    </div>
  {/if}

  {#if mode === 'play' && riderFellOff}
    <div class="fell-overlay">
      <p>Rider wiped out!</p>
      <button class="nes-btn is-primary" onclick={() => { resetRider(); }}>
        Restart
      </button>
      <button class="nes-btn" onclick={() => { mode = 'draw'; cameraX = 0; cameraY = 0; }}>
        Edit Track
      </button>
    </div>
  {/if}
</div>

<style>
  .linerider-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 52px 8px 12px;
    background: #e2e8f0;
    border-bottom: 2px solid #cbd5e1;
    z-index: 10;
    flex-shrink: 0;
  }

  .tool-btn {
    font-size: 0.55rem !important;
    padding: 4px 12px !important;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .eraser-wrapper {
    position: relative;
    width: 24px;
    height: 24px;
  }

  :global(.eraser-beanie) {
    position: absolute;
    top: -8px;
    right: -8px;
    z-index: 15;
  }

  canvas {
    flex: 1;
    display: block;
    width: 100%;
  }

  canvas.drawing {
    cursor: crosshair;
  }

  .hint-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #64748b;
    font-size: 0.8rem;
    pointer-events: none;
  }

  .sub-hint {
    font-size: 0.5rem;
    margin-top: 8px;
    color: #94a3b8;
  }

  .fell-overlay {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    background: rgba(15, 23, 42, 0.85);
    padding: 16px 24px;
    border-radius: 8px;
    color: #fff;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .fell-overlay p {
    margin: 0 0 8px;
    font-size: 0.7rem;
  }

  .fell-overlay .nes-btn {
    font-size: 0.5rem !important;
    padding: 4px 12px !important;
  }
</style>
```

**Step 2: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/toys/LineRider.svelte
git commit -m "feat: add Line Rider toy component"
```

---

### Task 3: Stick Brawler — Component

**Files:**
- Create: `src/lib/toys/StickBrawler.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { haptic } from '$lib/stores/haptics';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie
  const hidingSpots: HidingSpot[] = [{ id: 'behind-corpses' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Canvas
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animFrame: number;
  let containerEl: HTMLDivElement;

  // Touch
  let isTouchDevice = $state(false);

  // Game config
  const PLAYER_SPEED = 4;
  const PUNCH_RANGE = 40;
  const KICK_RANGE = 55;
  const PUNCH_DURATION = 8;
  const KICK_DURATION = 14;
  const PUNCH_COOLDOWN = 12;
  const KICK_COOLDOWN = 20;
  const ENEMY_SPEED_BASE = 1.2;
  const ENEMY_ATTACK_RANGE = 30;
  const ENEMY_ATTACK_COOLDOWN = 40;

  // Game state
  let gameState = $state<'ready' | 'playing' | 'waveclear' | 'dead'>('ready');
  let wave = $state(1);
  let score = $state(0);
  let highScore = $state(0);
  let waveTimer = 0;

  // Player
  type Fighter = {
    x: number;
    y: number;
    hp: number;
    facing: 1 | -1;
    attackType: 'none' | 'punch' | 'kick';
    attackFrame: number;
    cooldown: number;
    hitThisAttack: boolean;
  };

  let player: Fighter = {
    x: 200, y: 0, hp: 3, facing: 1,
    attackType: 'none', attackFrame: 0, cooldown: 0, hitThisAttack: false,
  };

  // Enemies
  type Enemy = {
    x: number;
    y: number;
    hp: number;
    facing: 1 | -1;
    speed: number;
    attackFrame: number;
    cooldown: number;
    hitStun: number;
  };

  let enemies: Enemy[] = [];

  // Corpses (ragdoll parts)
  type Corpse = {
    parts: Array<{ x: number; y: number; vx: number; vy: number; len: number; angle: number }>;
    life: number;
  };
  let corpses: Corpse[] = [];

  // Screen shake
  let shakeX = 0;
  let shakeY = 0;
  let shakeFrames = 0;

  // Input state
  let keys: Record<string, boolean> = {};

  // Ground Y (computed from canvas height)
  let groundY = 0;

  function spawnWave() {
    const count = wave + 1;
    const w = canvas?.width || 800;
    enemies = [];
    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      enemies.push({
        x: side > 0 ? w + 40 + i * 60 : -40 - i * 60,
        y: groundY,
        hp: 1,
        facing: side > 0 ? -1 : 1,
        speed: ENEMY_SPEED_BASE + wave * 0.15 + Math.random() * 0.3,
        attackFrame: 0,
        cooldown: Math.floor(Math.random() * 20),
        hitStun: 0,
      });
    }
  }

  function startGame() {
    wave = 1;
    score = 0;
    player = {
      x: (canvas?.width || 800) / 2, y: groundY, hp: 3, facing: 1,
      attackType: 'none', attackFrame: 0, cooldown: 0, hitThisAttack: false,
    };
    corpses = [];
    gameState = 'playing';
    spawnWave();
    playSound('powerup', 0.4);
  }

  function playerAttack(type: 'punch' | 'kick') {
    if (player.attackType !== 'none' || player.cooldown > 0) return;
    player.attackType = type;
    player.attackFrame = type === 'punch' ? PUNCH_DURATION : KICK_DURATION;
    player.hitThisAttack = false;
    playSound('whoosh', 0.3);
  }

  function createCorpse(x: number, y: number, facing: number) {
    const parts = [
      // head
      { x, y: y - 40, vx: facing * (2 + Math.random() * 3), vy: -(5 + Math.random() * 4), len: 8, angle: Math.random() * 2 },
      // torso
      { x, y: y - 25, vx: facing * (1 + Math.random() * 2), vy: -(3 + Math.random() * 3), len: 16, angle: Math.random() },
      // arm
      { x: x + facing * 5, y: y - 30, vx: facing * (3 + Math.random() * 4), vy: -(4 + Math.random() * 3), len: 14, angle: Math.random() * 3 },
      // leg
      { x, y: y - 8, vx: facing * (2 + Math.random() * 2), vy: -(2 + Math.random() * 3), len: 16, angle: Math.random() },
    ];
    corpses.push({ parts, life: 120 });
  }

  function update() {
    if (gameState !== 'playing' && gameState !== 'waveclear') return;

    const w = canvas.width;

    // Wave clear transition
    if (gameState === 'waveclear') {
      waveTimer--;
      if (waveTimer <= 0) {
        wave++;
        spawnWave();
        gameState = 'playing';
      }
      // Still update corpses
      updateCorpses();
      return;
    }

    // Player movement
    let moveX = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveX = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX = 1;
    player.x += moveX * PLAYER_SPEED;
    player.x = Math.max(20, Math.min(w - 20, player.x));
    if (moveX !== 0) player.facing = moveX as 1 | -1;

    // Attack input
    if (keys['z'] || keys['Z'] || keys['j'] || keys['J']) {
      playerAttack('punch');
    }
    if (keys['x'] || keys['X'] || keys['k'] || keys['K']) {
      playerAttack('kick');
    }

    // Player attack progress
    if (player.attackFrame > 0) {
      player.attackFrame--;

      // Hit detection (only once per attack)
      if (!player.hitThisAttack) {
        const range = player.attackType === 'punch' ? PUNCH_RANGE : KICK_RANGE;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x;
          if (Math.abs(dx) < range && Math.sign(dx) === player.facing) {
            e.hp--;
            player.hitThisAttack = true;
            shakeFrames = 6;
            playSound('hit', 0.5);
            haptic('tap');

            if (e.hp <= 0) {
              score++;
              playSound('explode', 0.4);
              createCorpse(e.x, e.y, player.facing);
            } else {
              e.hitStun = 10;
            }
            break;
          }
        }
      }

      if (player.attackFrame === 0) {
        player.cooldown = player.attackType === 'punch' ? PUNCH_COOLDOWN : KICK_COOLDOWN;
        player.attackType = 'none';
      }
    }

    if (player.cooldown > 0) player.cooldown--;

    // Enemy AI
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (e.hitStun > 0) { e.hitStun--; continue; }

      const dx = player.x - e.x;
      e.facing = dx > 0 ? 1 : -1;

      if (Math.abs(dx) > ENEMY_ATTACK_RANGE) {
        e.x += e.facing * e.speed;
      } else {
        // Attack
        if (e.cooldown <= 0 && e.attackFrame === 0) {
          e.attackFrame = 15;
          e.cooldown = ENEMY_ATTACK_COOLDOWN + Math.floor(Math.random() * 20);
        }
      }

      if (e.attackFrame > 0) {
        e.attackFrame--;
        // Hit player at peak of attack
        if (e.attackFrame === 8) {
          const hitDist = Math.abs(player.x - e.x);
          if (hitDist < ENEMY_ATTACK_RANGE + 10) {
            player.hp--;
            shakeFrames = 8;
            playSound('slam', 0.5);
            haptic('error');

            if (player.hp <= 0) {
              gameState = 'dead';
              playSound('death', 0.5);
              if (score > highScore) {
                highScore = score;
                playSound('victory', 0.4);
                try { localStorage.setItem('stickbrawl-highscore', String(highScore)); } catch {}
              }
              return;
            }
          }
        }
      }

      if (e.cooldown > 0) e.cooldown--;
    }

    // Remove dead enemies
    enemies = enemies.filter(e => e.hp > 0);

    // Check wave clear
    if (enemies.length === 0) {
      gameState = 'waveclear';
      waveTimer = 90;
      playSound('victory', 0.4);
    }

    updateCorpses();
  }

  function updateCorpses() {
    for (const c of corpses) {
      c.life--;
      for (const p of c.parts) {
        p.vy += 0.4;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vx * 0.03;
        // Floor bounce
        if (p.y > groundY) {
          p.y = groundY;
          p.vy *= -0.3;
          p.vx *= 0.7;
        }
      }
    }
    corpses = corpses.filter(c => c.life > 0);
  }

  // --- Drawing ---

  function drawStickFigure(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    facing: 1 | -1,
    color: string,
    attackType: 'none' | 'punch' | 'kick' = 'none',
    attackFrame: number = 0,
    isEnemy: boolean = false,
  ) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const attackProgress = attackType !== 'none'
      ? Math.sin((attackFrame / (attackType === 'punch' ? PUNCH_DURATION : KICK_DURATION)) * Math.PI)
      : 0;

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 40, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - 32);
    ctx.lineTo(x, y - 12);
    ctx.stroke();

    // Arms
    if (attackType === 'punch') {
      // Punching arm extends forward
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x + facing * (12 + attackProgress * 30), y - 26 - attackProgress * 4);
      ctx.stroke();
      // Other arm
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x - facing * 12, y - 20);
      ctx.stroke();
    } else if (attackType === 'kick') {
      // Arms up for balance
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x + facing * 10, y - 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x - facing * 14, y - 30);
      ctx.stroke();
    } else {
      // Idle arms
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x + facing * 12, y - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x - facing * 12, y - 20);
      ctx.stroke();
    }

    // Legs
    if (attackType === 'kick') {
      // Kicking leg extends forward
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x + facing * (10 + attackProgress * 35), y - 8 - attackProgress * 6);
      ctx.stroke();
      // Standing leg
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x - facing * 8, y);
      ctx.stroke();
    } else {
      // Idle legs
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x + facing * 8, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x - facing * 8, y);
      ctx.stroke();
    }

    // Enemy indicator (red headband)
    if (isEnemy) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 42);
      ctx.lineTo(x + 8 + facing * 6, y - 42);
      ctx.stroke();
    }
  }

  function drawCorpses(ctx: CanvasRenderingContext2D) {
    for (const c of corpses) {
      const alpha = Math.min(1, c.life / 30);
      ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`;
      ctx.lineWidth = 2;
      for (const p of c.parts) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-p.len / 2, 0);
        ctx.lineTo(p.len / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Shake
    if (shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * shakeFrames * 2;
      shakeY = (Math.random() - 0.5) * shakeFrames * 2;
      shakeFrames--;
    } else {
      shakeX = 0;
      shakeY = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -10, w + 20, h + 20);

    // Floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Corpses
    drawCorpses(ctx);

    // Enemies
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const eColor = e.hitStun > 0 ? '#fca5a5' : '#94a3b8';
      const eAttack = e.attackFrame > 0 ? 'punch' as const : 'none' as const;
      drawStickFigure(ctx, e.x, e.y, e.facing, eColor, eAttack, e.attackFrame, true);
    }

    // Player
    if (gameState !== 'dead') {
      const pColor = player.attackType !== 'none' ? '#fbbf24' : '#fff';
      drawStickFigure(ctx, player.x, player.y, player.facing, pColor, player.attackType, player.attackFrame);
    }

    ctx.restore();

    // HUD
    // Hearts
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      ctx.fillText(i < player.hp ? '❤️' : '🖤', 12 + i * 28, 36);
    }

    // Wave & Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Wave ${wave}`, w - 16, 28);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`KOs: ${score}`, w - 16, 48);
  }

  function gameLoop() {
    update();
    render();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    if (!canvas || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    groundY = canvas.height - 60;
    player.y = groundY;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    keys[e.key] = true;

    if ((gameState === 'ready' || gameState === 'dead') && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      startGame();
    }
  }

  function handleKeyup(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  // Touch controls
  function touchMove(dir: -1 | 1) {
    // Simulate key hold
    if (dir === -1) {
      keys['ArrowLeft'] = true;
      keys['ArrowRight'] = false;
    } else {
      keys['ArrowRight'] = true;
      keys['ArrowLeft'] = false;
    }
    player.facing = dir;
  }

  function touchStopMove() {
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
  }

  function touchPunch() {
    if (gameState === 'ready' || gameState === 'dead') { startGame(); return; }
    playerAttack('punch');
  }

  function touchKick() {
    if (gameState === 'ready' || gameState === 'dead') { startGame(); return; }
    playerAttack('kick');
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    try {
      const saved = localStorage.getItem('stickbrawl-highscore');
      if (saved) highScore = parseInt(saved, 10);
    } catch {}

    registerSpots('stickbrawl', hidingSpots);
    const beanies = getBeaniesForArea('stickbrawl');
    hiddenBeanie = beanies.get('behind-corpses') || null;

    resizeCanvas();
    groundY = canvas.height - 60;
    player.y = groundY;
    animFrame = requestAnimationFrame(gameLoop);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    window.removeEventListener('resize', resizeCanvas);
  });
</script>

<div
  class="brawler-container"
  class:touch-device={isTouchDevice}
  bind:this={containerEl}
  role="application"
  aria-label="Stick Brawler"
>
  <CloseButton {onClose} />
  <canvas bind:this={canvas}></canvas>

  {#if gameState === 'ready'}
    <div class="overlay">
      <div class="overlay-content">
        <h1 class="title">STICK BRAWLER</h1>
        <p class="subtitle">Xiao Xiao vibes</p>
        {#if isTouchDevice}
          <p class="instruction">Use D-pad to move, buttons to attack</p>
        {:else}
          <p class="instruction">Arrow keys to move · Z to punch · X to kick</p>
        {/if}
        <button class="start-btn nes-btn is-success" onclick={startGame}>
          FIGHT
        </button>
        {#if !isTouchDevice}
          <p class="hint">or press SPACE</p>
        {/if}
        {#if highScore > 0}
          <p class="high-score-display">Best KOs: {highScore}</p>
        {/if}
      </div>
    </div>
  {:else if gameState === 'waveclear'}
    <div class="wave-banner">
      <span>WAVE {wave} CLEARED!</span>
    </div>
  {:else if gameState === 'dead'}
    <div class="overlay gameover">
      <div class="overlay-content">
        <h2>DEFEATED</h2>
        <p class="final-score">KOs: {score} · Wave {wave}</p>
        {#if score === highScore && score > 0}
          <p class="new-record">NEW HIGH SCORE!</p>
        {/if}
        <div class="replay-wrapper">
          {#if hiddenBeanie && wave >= 3}
            <HidingBeanie beanie={hiddenBeanie} class="corpse-beanie" />
          {/if}
          <button class="start-btn nes-btn is-primary" onclick={startGame}>
            FIGHT AGAIN
          </button>
        </div>
        {#if !isTouchDevice}
          <p class="hint">or press SPACE</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Touch controls -->
  {#if isTouchDevice && (gameState === 'playing' || gameState === 'waveclear')}
    <div class="touch-controls">
      <div class="touch-dpad">
        <button
          class="touch-btn"
          ontouchstart={() => touchMove(-1)}
          ontouchend={touchStopMove}
          aria-label="Move left"
        >◀</button>
        <button
          class="touch-btn"
          ontouchstart={() => touchMove(1)}
          ontouchend={touchStopMove}
          aria-label="Move right"
        >▶</button>
      </div>
      <div class="touch-actions">
        <button class="touch-btn punch-btn" ontouchstart={touchPunch} aria-label="Punch">
          👊
        </button>
        <button class="touch-btn kick-btn" ontouchstart={touchKick} aria-label="Kick">
          🦵
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .brawler-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #0f172a;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .overlay-content {
    text-align: center;
    color: #fff;
  }

  .title {
    font-size: 2.2rem;
    color: #fbbf24;
    margin: 0;
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
    letter-spacing: 3px;
  }

  .subtitle {
    font-size: 0.6rem;
    color: #94a3b8;
    margin: 4px 0 16px;
    font-style: italic;
  }

  .overlay-content h2 {
    font-size: 2rem;
    margin: 0 0 12px 0;
    color: #ef4444;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
  }

  .instruction {
    font-size: 0.6rem;
    color: #94a3b8;
    margin: 8px 0 16px;
  }

  .start-btn {
    margin: 12px 0 8px 0;
    font-size: 0.7rem !important;
    padding: 8px 24px !important;
  }

  .hint {
    font-size: 0.45rem;
    color: #475569;
    margin: 4px 0;
  }

  .final-score {
    font-size: 1rem;
    margin: 8px 0;
    color: #f7d51d;
  }

  .new-record {
    font-size: 0.7rem;
    color: #f7d51d;
    animation: flash 0.5s ease-in-out infinite alternate;
    margin: 4px 0 8px;
  }

  .high-score-display {
    font-size: 0.6rem;
    color: #f7d51d;
    margin-top: 12px;
  }

  .replay-wrapper {
    position: relative;
    display: inline-block;
  }

  :global(.corpse-beanie) {
    position: absolute;
    top: -12px;
    right: -25px;
    z-index: 5;
  }

  .wave-banner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    color: #4ade80;
    text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
    z-index: 50;
    animation: bannerPulse 0.5s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes bannerPulse {
    from { transform: translate(-50%, -50%) scale(1); }
    to { transform: translate(-50%, -50%) scale(1.05); }
  }

  /* Touch controls */
  .touch-controls {
    position: absolute;
    bottom: 16px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 20;
    pointer-events: none;
  }

  .touch-dpad, .touch-actions {
    display: flex;
    gap: 12px;
    pointer-events: auto;
  }

  .touch-btn {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    background: rgba(30, 41, 59, 0.8);
    color: #fff;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    -webkit-tap-highlight-color: transparent;
  }

  .touch-btn:active {
    transform: scale(0.9);
    background: rgba(30, 41, 59, 0.95);
  }

  .punch-btn {
    background: rgba(251, 191, 36, 0.3);
    border: 2px solid rgba(251, 191, 36, 0.5);
  }

  .kick-btn {
    background: rgba(239, 68, 68, 0.3);
    border: 2px solid rgba(239, 68, 68, 0.5);
  }

  @keyframes flash {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }

  @media (max-width: 500px) {
    .touch-btn {
      width: 52px;
      height: 52px;
      font-size: 20px;
    }
  }
</style>
```

**Step 2: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/toys/StickBrawler.svelte
git commit -m "feat: add Stick Brawler toy component"
```

---

### Task 4: Integrate All Three Games into Shelf

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add imports at the top of the script section (after the existing toy imports around line 45)**

Add these imports alongside the other toy imports:

```typescript
import HelicopterGame from '$lib/toys/HelicopterGame.svelte';
import LineRider from '$lib/toys/LineRider.svelte';
import StickBrawler from '$lib/toys/StickBrawler.svelte';
```

**Step 2: Add to `shelfObjects` array (around line 110, before `guestbook`)**

Add these entries before the guestbook entry:

```typescript
    { id: 'helicopter', name: 'Helicopter Game', icon: '🚁', desc: "Don't crash!" },
    { id: 'linerider', name: 'Line Rider', icon: '🛷', desc: 'Draw the ride' },
    { id: 'stickbrawl', name: 'Stick Brawler', icon: '🥊', desc: 'Xiao Xiao vibes' },
```

**Step 3: Add conditional render blocks (after the last `{:else if displayObject === 'guestbook'}` block, around line 624)**

Add these render blocks in the `{#if displayObject === ...}` chain, before guestbook:

```svelte
  {:else if displayObject === 'helicopter'}
  <div class="object-view" role="dialog" aria-label="Helicopter Game">
    <HelicopterGame onClose={closeObject} />
  </div>
  {:else if displayObject === 'linerider'}
  <div class="object-view" role="dialog" aria-label="Line Rider">
    <LineRider onClose={closeObject} />
  </div>
  {:else if displayObject === 'stickbrawl'}
  <div class="object-view" role="dialog" aria-label="Stick Brawler">
    <StickBrawler onClose={closeObject} />
  </div>
```

**Step 4: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors

**Step 5: Manual test**

Run: `npm run dev`

Open browser to `http://localhost:5173`. Navigate to the shelf pages and verify:
- All three new games appear on the shelf with correct icons
- Clicking each opens the full-screen game
- Each game's core mechanic works
- CloseButton returns to shelf
- Sounds play appropriately

**Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: integrate helicopter, line rider, stick brawler into shelf"
```

---

### Task 5: Polish & Final Verification

**Step 1: Run full type check**

Run: `npm run check`
Expected: No errors

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Test each game end-to-end**

1. **Helicopter Game:** Click to play, hold to fly up, release to fall. Crash into a wall. Verify score displays, high score saves, play again works.
2. **Line Rider:** Draw several lines sloping down. Press play. Watch rider sled. Verify camera follows. Press draw to go back and edit.
3. **Stick Brawler:** Start game. Move with arrows, punch with Z, kick with X. Defeat wave 1. Verify wave 2 spawns with more enemies. Die and verify game over screen.

**Step 4: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "fix: polish flash games after testing"
```
