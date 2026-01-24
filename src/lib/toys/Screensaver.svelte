<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Hidden beanie behind mode selector
  const hidingSpots: HidingSpot[] = [{ id: 'behind-modes' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;

  let mode = $state<'toasters' | 'pipes' | 'dvd' | 'matrix' | 'starfield'>('toasters');

  // Flying Toasters
  interface Toaster {
    x: number;
    y: number;
    speed: number;
    wingFrame: number;
    size: number;
  }
  let toasters: Toaster[] = [];

  // Pipes
  interface Pipe {
    x: number;
    y: number;
    z: number;
    direction: number;
    hue: number;
    length: number;
  }
  let pipes: Pipe[] = [];
  let pipeTimer = 0;

  // DVD Logo
  let dvd = { x: 100, y: 100, vx: 3, vy: 2, hue: 0 };

  // Matrix
  interface Drop {
    x: number;
    y: number;
    speed: number;
    chars: string[];
  }
  let drops: Drop[] = [];

  // Starfield
  interface Star {
    x: number;
    y: number;
    z: number;
  }
  let stars: Star[] = [];

  function initMode() {
    if (!canvas || !ctx) return;

    toasters = [];
    pipes = [];
    drops = [];
    stars = [];
    pipeTimer = 0;

    // Clear canvas when switching modes
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'toasters') {
      for (let i = 0; i < 8; i++) {
        toasters.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 1 + Math.random() * 2,
          wingFrame: Math.random() * Math.PI * 2,
          size: 40 + Math.random() * 20,
        });
      }
    } else if (mode === 'pipes') {
      // Start with 2 pipes
      addPipe();
      addPipe();
    } else if (mode === 'matrix') {
      const columns = Math.floor(canvas.width / 20);
      for (let i = 0; i < columns; i++) {
        drops.push({
          x: i * 20,
          y: Math.random() * -canvas.height,
          speed: 5 + Math.random() * 10,
          chars: Array(20).fill(0).map(() => getRandomChar()),
        });
      }
    } else if (mode === 'starfield') {
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: (Math.random() - 0.5) * canvas.width * 2,
          y: (Math.random() - 0.5) * canvas.height * 2,
          z: Math.random() * canvas.width,
        });
      }
    }
  }

  function getRandomChar(): string {
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function addPipe() {
    if (!canvas) return;
    pipes.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      z: 0,
      direction: Math.floor(Math.random() * 4),
      hue: Math.random() * 360,
      length: 0,
    });
  }

  function draw() {
    if (!ctx || !canvas) return;

    // Pipes mode doesn't clear - it accumulates trails
    if (mode !== 'pipes') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (mode === 'toasters') {
      drawToasters();
    } else if (mode === 'pipes') {
      drawPipes();
    } else if (mode === 'dvd') {
      drawDVD();
    } else if (mode === 'matrix') {
      drawMatrix();
    } else if (mode === 'starfield') {
      drawStarfield();
    }

    animationId = requestAnimationFrame(draw);
  }

  function drawToasters() {
    for (const t of toasters) {
      t.x -= t.speed;
      t.y += t.speed * 0.5;
      t.wingFrame += 0.2;

      if (t.x < -t.size) t.x = canvas.width + t.size;
      if (t.y > canvas.height + t.size) t.y = -t.size;

      // Draw toaster body
      ctx.font = `${t.size}px serif`;
      ctx.fillText('🍞', t.x, t.y);

      // Draw wings
      const wingY = Math.sin(t.wingFrame) * 10;
      ctx.font = `${t.size * 0.4}px serif`;
      ctx.fillText('🪽', t.x - t.size * 0.3, t.y - t.size * 0.3 + wingY);
      ctx.fillText('🪽', t.x + t.size * 0.3, t.y - t.size * 0.3 - wingY);
    }
  }

  function drawPipes() {
    pipeTimer++;

    // Draw existing pipes
    for (const pipe of pipes) {
      const speed = 4;
      const dx = [speed, -speed, 0, 0][pipe.direction];
      const dy = [0, 0, speed, -speed][pipe.direction];

      const oldX = pipe.x;
      const oldY = pipe.y;

      pipe.x += dx;
      pipe.y += dy;
      pipe.length++;

      // Draw pipe segment with 3D effect
      const pipeWidth = 12;

      // Main pipe body
      ctx.strokeStyle = `hsl(${pipe.hue}, 70%, 45%)`;
      ctx.lineWidth = pipeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(oldX, oldY);
      ctx.lineTo(pipe.x, pipe.y);
      ctx.stroke();

      // Highlight (lighter edge)
      ctx.strokeStyle = `hsl(${pipe.hue}, 70%, 65%)`;
      ctx.lineWidth = pipeWidth * 0.4;
      ctx.beginPath();
      ctx.moveTo(oldX - 2, oldY - 2);
      ctx.lineTo(pipe.x - 2, pipe.y - 2);
      ctx.stroke();

      // Change direction randomly - draw joint at turn
      if (pipe.length > 30 && Math.random() < 0.08) {
        // Draw 3D joint ball
        const gradient = ctx.createRadialGradient(pipe.x, pipe.y, 0, pipe.x, pipe.y, 10);
        gradient.addColorStop(0, `hsl(${pipe.hue}, 70%, 70%)`);
        gradient.addColorStop(0.5, `hsl(${pipe.hue}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${pipe.hue}, 70%, 30%)`);

        ctx.beginPath();
        ctx.arc(pipe.x, pipe.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pick new direction (not reverse)
        const oldDir = pipe.direction;
        do {
          pipe.direction = Math.floor(Math.random() * 4);
        } while (pipe.direction === (oldDir + 1) % 4 + (oldDir % 2 === 0 ? 1 : -1) || pipe.direction === oldDir);

        pipe.length = 0;
      }

      // Reset if out of bounds - start new pipe from random edge
      if (pipe.x < -20 || pipe.x > canvas.width + 20 || pipe.y < -20 || pipe.y > canvas.height + 20) {
        // Start from random position
        pipe.x = Math.random() * canvas.width;
        pipe.y = Math.random() * canvas.height;
        pipe.hue = Math.random() * 360;
        pipe.direction = Math.floor(Math.random() * 4);
        pipe.length = 0;
      }
    }

    // Add new pipes occasionally
    if (pipeTimer % 300 === 0 && pipes.length < 4) {
      addPipe();
    }
  }

  function drawDVD() {
    dvd.x += dvd.vx;
    dvd.y += dvd.vy;

    // Bounce off walls
    if (dvd.x <= 0 || dvd.x >= canvas.width - 100) {
      dvd.vx *= -1;
      dvd.hue = Math.random() * 360;
    }
    if (dvd.y <= 0 || dvd.y >= canvas.height - 50) {
      dvd.vy *= -1;
      dvd.hue = Math.random() * 360;
    }

    // Draw DVD logo
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = `hsl(${dvd.hue}, 100%, 50%)`;
    ctx.fillText('DVD', dvd.x, dvd.y);

    ctx.font = '12px Arial';
    ctx.fillText('VIDEO', dvd.x + 10, dvd.y + 15);
  }

  function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '16px monospace';

    for (const drop of drops) {
      drop.y += drop.speed;

      // Draw trail
      for (let i = 0; i < drop.chars.length; i++) {
        const alpha = 1 - (i / drop.chars.length);
        const y = drop.y - i * 20;

        if (y > 0 && y < canvas.height) {
          ctx.fillStyle = i === 0
            ? '#fff'
            : `rgba(0, 255, 0, ${alpha})`;
          ctx.fillText(drop.chars[i], drop.x, y);
        }
      }

      // Reset drop
      if (drop.y > canvas.height + drop.chars.length * 20) {
        drop.y = 0;
        drop.speed = 5 + Math.random() * 10;
        drop.chars = drop.chars.map(() => getRandomChar());
      }

      // Randomly change characters
      if (Math.random() < 0.02) {
        const idx = Math.floor(Math.random() * drop.chars.length);
        drop.chars[idx] = getRandomChar();
      }
    }
  }

  function drawStarfield() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (const star of stars) {
      star.z -= 5;

      if (star.z <= 0) {
        star.x = (Math.random() - 0.5) * canvas.width * 2;
        star.y = (Math.random() - 0.5) * canvas.height * 2;
        star.z = canvas.width;
      }

      const sx = (star.x / star.z) * canvas.width + cx;
      const sy = (star.y / star.z) * canvas.height + cy;
      const size = (1 - star.z / canvas.width) * 4;

      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - star.z / canvas.width})`;
      ctx.fill();

      // Draw trail
      const px = (star.x / (star.z + 10)) * canvas.width + cx;
      const py = (star.y / (star.z + 10)) * canvas.height + cy;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - star.z / canvas.width / 2})`;
      ctx.lineWidth = size / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initMode();
  }

  onMount(() => {
    // Register hiding spot
    registerSpots('screensaver', hidingSpots);
    const beanies = getBeaniesForArea('screensaver');
    hiddenBeanie = beanies.get('behind-modes') || null;

    ctx = canvas.getContext('2d')!;
    resize();
    draw();

    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
  });

  $effect(() => {
    if (canvas && ctx) {
      initMode();
    }
  });
</script>

<div class="screensaver">
  <CloseButton {onClose} />

  <canvas bind:this={canvas}></canvas>

  <!-- Mode selector with beanie peeking from behind -->
  <div class="mode-wrapper">
    {#if hiddenBeanie}
      <HidingBeanie beanie={hiddenBeanie} class="screensaver-beanie" />
    {/if}
    <div class="mode-selector">
      <button class:active={mode === 'toasters'} onclick={() => { playSound('click', 0.3); mode = 'toasters'; }}>
        🍞 Flying Toasters
      </button>
      <button class:active={mode === 'pipes'} onclick={() => { playSound('click', 0.3); mode = 'pipes'; }}>
        🔧 3D Pipes
      </button>
      <button class:active={mode === 'dvd'} onclick={() => { playSound('click', 0.3); mode = 'dvd'; }}>
        📀 DVD Bounce
      </button>
      <button class:active={mode === 'matrix'} onclick={() => { playSound('click', 0.3); mode = 'matrix'; }}>
        💚 Matrix
      </button>
      <button class:active={mode === 'starfield'} onclick={() => { playSound('click', 0.3); mode = 'starfield'; }}>
        ⭐ Starfield
      </button>
    </div>
  </div>
</div>

<style>
  .screensaver {
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
  }

  canvas {
    display: block;
  }

  .mode-wrapper {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
  }

  /* Beanie peeking from behind mode selector */
  :global(.screensaver-beanie) {
    top: -50px;
    left: 10px;
    z-index: 5;
  }

  :global(.screensaver-beanie.discovered) {
    z-index: 15 !important;
  }

  .mode-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    position: relative;
    z-index: 10; /* Selector in front of beanie */
    border-radius: 10px;
  }

  .mode-selector button {
    padding: 12px 16px;
    min-height: 44px;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.45rem;
    background: transparent;
    color: #888;
    border: 2px solid #444;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .mode-selector button:hover {
    color: #fff;
    border-color: #666;
  }

  .mode-selector button.active {
    color: #0f0;
    border-color: #0f0;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }

  @media (max-width: 600px) {
    .mode-selector button {
      padding: 10px 14px;
      font-size: 0.4rem;
    }
  }
</style>
