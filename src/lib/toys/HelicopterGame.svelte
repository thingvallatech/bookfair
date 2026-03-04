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
