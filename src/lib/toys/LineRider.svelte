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
  let eraserMode = $state(false);

  // Sound throttle counters
  let drawSoundCounter = 0;
  let whooshFrameCounter = 0;
  let wasOnGround = false;

  // Auto-reset counter
  let fellOffFrames = 0;

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
  let riderFellOff = $state(false);

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
    fellOffFrames = 0;
    wasOnGround = false;
    whooshFrameCounter = 0;
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
    drawSoundCounter = 0;
    const p = toCanvas(e.clientX, e.clientY);

    if (eraserMode) {
      eraseNear(p.x, p.y);
    } else {
      currentDrawStart = p;
    }
  }

  function eraseNear(px: number, py: number) {
    const ERASE_RADIUS = 20;
    const before = lines.length;
    lines = lines.filter((seg) => {
      const cp = closestPointOnSegment(px, py, seg);
      const dx = px - cp.x;
      const dy = py - cp.y;
      return Math.sqrt(dx * dx + dy * dy) > ERASE_RADIUS;
    });
    if (lines.length < before) {
      playSound('erase', 0.15);
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDrawing || mode !== 'draw') return;
    const p = toCanvas(e.clientX, e.clientY);

    if (eraserMode) {
      eraseNear(p.x, p.y);
      return;
    }

    if (!currentDrawStart) return;
    const dx = p.x - currentDrawStart.x;
    const dy = p.y - currentDrawStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      lines = [...lines, { x1: currentDrawStart.x, y1: currentDrawStart.y, x2: p.x, y2: p.y }];
      currentDrawStart = p;
      drawSoundCounter++;
      if (drawSoundCounter % 10 === 0) {
        playSound('draw', 0.15);
      }
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
      // Auto-reset after ~60 frames
      fellOffFrames++;
      if (fellOffFrames >= 60) {
        resetRider();
      }
      return;
    }

    const prevOnGround = wasOnGround;

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

    // Jump sound: transition from ground to airborne
    if (prevOnGround && !riderOnGround) {
      playSound('jump', 0.3);
    }
    wasOnGround = riderOnGround;

    // Whoosh sound when moving fast
    const speed = Math.sqrt(riderVX * riderVX + riderVY * riderVY);
    whooshFrameCounter++;
    if (speed > 8 && whooshFrameCounter % 30 === 0) {
      playSound('whoosh', 0.2);
    }

    if (!riderOnGround) {
      // Gradually return angle to 0 in air
      riderAngle *= 0.95;
    }

    // Fall off screen check
    if (canvas && riderY > cameraY + canvas.height + 200) {
      riderFellOff = true;
      fellOffFrames = 0;
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
      eraserMode = false;
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
      <button
        class="tool-btn nes-btn"
        class:is-warning={eraserMode}
        onclick={() => { eraserMode = !eraserMode; playSound('click', 0.2); }}
      >
        {eraserMode ? '✏ Draw' : '🧹 Eraser'}
      </button>
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
    class:drawing={mode === 'draw' && !eraserMode}
    class:erasing={mode === 'draw' && eraserMode}
  ></canvas>

  {#if mode === 'draw' && lines.length === 0}
    <div class="hint-overlay">
      <p>Draw lines for the rider to sled on!</p>
      <p class="sub-hint">Click and drag to draw. Press SPACE to play.</p>
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

  canvas.erasing {
    cursor: not-allowed;
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

</style>
