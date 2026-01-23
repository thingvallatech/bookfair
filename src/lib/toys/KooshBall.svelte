<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;

  // Koosh ball state
  let ball = $state({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
    squish: 1,
    squishVel: 0,
  });

  // Tendrils
  let tendrils: Array<{
    angle: number;
    length: number;
    targetLength: number;
    hue: number;
    wave: number;
  }> = [];

  const TENDRIL_COUNT = 32;
  const BASE_TENDRIL_LENGTH = 60;
  const BALL_RADIUS = 25;
  const GRAVITY = 0.3;
  const FRICTION = 0.98;
  const BOUNCE = 0.7;
  const SPRING = 0.08;

  let isDragging = $state(false);
  let dragOffset = { x: 0, y: 0 };

  function initTendrils() {
    tendrils = [];
    for (let i = 0; i < TENDRIL_COUNT; i++) {
      tendrils.push({
        angle: (i / TENDRIL_COUNT) * Math.PI * 2,
        length: BASE_TENDRIL_LENGTH,
        targetLength: BASE_TENDRIL_LENGTH,
        hue: (i / TENDRIL_COUNT) * 360,
        wave: Math.random() * Math.PI * 2,
      });
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Center ball if not initialized
    if (ball.x === 0 && ball.y === 0) {
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.targetX = ball.x;
      ball.targetY = ball.y;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dist = Math.hypot(mx - ball.x, my - ball.y);
    if (dist < BASE_TENDRIL_LENGTH + BALL_RADIUS) {
      isDragging = true;
      dragOffset.x = ball.x - mx;
      dragOffset.y = ball.y - my;
      ball.vx = 0;
      ball.vy = 0;

      // Squish on grab
      ball.squishVel = -0.3;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    ball.targetX = e.clientX - rect.left + dragOffset.x;
    ball.targetY = e.clientY - rect.top + dragOffset.y;
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging) return;
    isDragging = false;

    // Calculate throw velocity based on recent movement
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + dragOffset.x;
    const my = e.clientY - rect.top + dragOffset.y;

    ball.vx = (mx - ball.x) * 0.3;
    ball.vy = (my - ball.y) * 0.3;

    // Squish on release
    ball.squishVel = 0.2;
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  function handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  function update() {
    if (!canvas) return;

    const time = Date.now() * 0.001;

    if (isDragging) {
      // Spring towards target
      ball.vx += (ball.targetX - ball.x) * SPRING * 2;
      ball.vy += (ball.targetY - ball.y) * SPRING * 2;
    } else {
      // Apply gravity
      ball.vy += GRAVITY;
    }

    // Apply velocity
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Apply friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    // Bounce off walls
    const margin = BASE_TENDRIL_LENGTH + BALL_RADIUS;

    if (ball.x < margin) {
      ball.x = margin;
      ball.vx *= -BOUNCE;
      ball.squishVel = Math.abs(ball.vx) * 0.1;
      if (Math.abs(ball.vx) > 3) playSound('pop', 0.3);
    }
    if (ball.x > canvas.width - margin) {
      ball.x = canvas.width - margin;
      ball.vx *= -BOUNCE;
      ball.squishVel = Math.abs(ball.vx) * 0.1;
      if (Math.abs(ball.vx) > 3) playSound('pop', 0.3);
    }
    if (ball.y < margin) {
      ball.y = margin;
      ball.vy *= -BOUNCE;
      ball.squishVel = Math.abs(ball.vy) * 0.1;
      if (Math.abs(ball.vy) > 3) playSound('pop', 0.3);
    }
    if (ball.y > canvas.height - margin) {
      ball.y = canvas.height - margin;
      ball.vy *= -BOUNCE;
      ball.squishVel = Math.abs(ball.vy) * 0.1;
      if (Math.abs(ball.vy) > 3) playSound('pop', 0.3);
    }

    // Squish spring
    ball.squishVel += (1 - ball.squish) * 0.2;
    ball.squishVel *= 0.8;
    ball.squish += ball.squishVel;
    ball.squish = Math.max(0.3, Math.min(1.7, ball.squish)); // Clamp to valid range

    // Update tendrils
    const speed = Math.hypot(ball.vx, ball.vy);
    const moveAngle = Math.atan2(ball.vy, ball.vx);

    for (const tendril of tendrils) {
      // Wave animation
      tendril.wave += 0.1;

      // Tendrils stretch in direction of movement
      const angleDiff = Math.abs(Math.sin(tendril.angle - moveAngle));
      tendril.targetLength = BASE_TENDRIL_LENGTH + speed * angleDiff * 2;

      // Spring towards target length
      tendril.length += (tendril.targetLength - tendril.length) * 0.1;

      // Add some wave motion
      tendril.length += Math.sin(tendril.wave + tendril.angle * 2) * 3;
    }
  }

  function draw() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw shadow
    ctx.beginPath();
    ctx.ellipse(
      ball.x,
      canvas.height - 20,
      40 * ball.squish,
      10,
      0, 0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    // Draw tendrils
    for (const tendril of tendrils) {
      const startX = ball.x + Math.cos(tendril.angle) * BALL_RADIUS * ball.squish;
      const startY = ball.y + Math.sin(tendril.angle) * BALL_RADIUS * (2 - ball.squish);
      const endX = ball.x + Math.cos(tendril.angle) * (BALL_RADIUS + tendril.length) * ball.squish;
      const endY = ball.y + Math.sin(tendril.angle) * (BALL_RADIUS + tendril.length) * (2 - ball.squish);

      // Gradient for tendril
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `hsla(${tendril.hue}, 80%, 50%, 1)`);
      gradient.addColorStop(1, `hsla(${tendril.hue}, 80%, 50%, 0.6)`);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Wavy tendril with bezier curve
      const midX = (startX + endX) / 2 + Math.sin(tendril.wave) * 10;
      const midY = (startY + endY) / 2 + Math.cos(tendril.wave) * 10;
      ctx.quadraticCurveTo(midX, midY, endX, endY);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Tendril tip (bulb)
      ctx.beginPath();
      ctx.arc(endX, endY, 4, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${tendril.hue}, 80%, 60%)`;
      ctx.fill();
    }

    // Draw center ball
    const ballGradient = ctx.createRadialGradient(
      ball.x - 10, ball.y - 10, 0,
      ball.x, ball.y, BALL_RADIUS
    );
    ballGradient.addColorStop(0, '#ff9999');
    ballGradient.addColorStop(0.5, '#ff6666');
    ballGradient.addColorStop(1, '#cc3333');

    ctx.beginPath();
    ctx.ellipse(
      ball.x,
      ball.y,
      BALL_RADIUS * ball.squish,
      BALL_RADIUS * (2 - ball.squish),
      0, 0, Math.PI * 2
    );
    ctx.fillStyle = ballGradient;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(
      ball.x - 8,
      ball.y - 8,
      8 * ball.squish,
      6 * (2 - ball.squish),
      -0.5, 0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  }

  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    initTendrils();
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    gameLoop();
  });

  onDestroy(() => {
    window.removeEventListener('resize', resizeCanvas);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<div class="koosh-experience">
  <CloseButton {onClose} />

  <canvas
    bind:this={canvas}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  ></canvas>

  <div class="hint">
    {#if isDragging}
      <span>Release to throw!</span>
    {:else}
      <span>Click and drag to play</span>
    {/if}
  </div>
</div>

<style>
  .koosh-experience {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #2d3436 0%, #636e72 100%);
    position: relative;
    overflow: hidden;
  }

  .close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  canvas {
    display: block;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .hint {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.5);
    font-size: 16px;
    pointer-events: none;
  }
</style>
