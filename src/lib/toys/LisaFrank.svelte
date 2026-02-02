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

  // Hidden beanie behind rainbow
  const hidingSpots: HidingSpot[] = [{ id: 'behind-rainbow' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;

  let pattern = $state<'dolphins' | 'rainbows' | 'hearts' | 'stars' | 'sparkles'>('dolphins');
  let speed = $state(1);
  let density = $state(50);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    rotation: number;
    rotationSpeed: number;
    type: string;
  }

  let particles: Particle[] = [];

  const emojis: Record<string, string[]> = {
    dolphins: ['🐬', '🐋', '🌊', '💙', '✨'],
    rainbows: ['🌈', '☁️', '⭐', '💜', '💖'],
    hearts: ['💖', '💜', '💙', '💚', '💛', '🧡', '❤️'],
    stars: ['⭐', '🌟', '✨', '💫', '🌙'],
    sparkles: ['✨', '💎', '🦋', '🌸', '💕'],
  };

  function initParticles() {
    particles = [];
    for (let i = 0; i < density; i++) {
      addParticle();
    }
  }

  function addParticle() {
    const types = emojis[pattern];
    particles.push({
      x: Math.random() * (canvas?.width || 800),
      y: Math.random() * (canvas?.height || 600),
      vx: (Math.random() - 0.5) * 2 * speed,
      vy: (Math.random() - 0.5) * 2 * speed,
      size: 20 + Math.random() * 30,
      hue: Math.random() * 360,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      type: types[Math.floor(Math.random() * types.length)],
    });
  }

  function draw() {
    if (!ctx || !canvas) return;

    // Rainbow gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const time = Date.now() * 0.001;
    gradient.addColorStop(0, `hsl(${(time * 30) % 360}, 100%, 80%)`);
    gradient.addColorStop(0.25, `hsl(${(time * 30 + 60) % 360}, 100%, 80%)`);
    gradient.addColorStop(0.5, `hsl(${(time * 30 + 120) % 360}, 100%, 80%)`);
    gradient.addColorStop(0.75, `hsl(${(time * 30 + 180) % 360}, 100%, 80%)`);
    gradient.addColorStop(1, `hsl(${(time * 30 + 240) % 360}, 100%, 80%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw particles
    for (const p of particles) {
      // Update position
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.rotation += p.rotationSpeed;

      // Wrap around
      if (p.x < -50) p.x = canvas.width + 50;
      if (p.x > canvas.width + 50) p.x = -50;
      if (p.y < -50) p.y = canvas.height + 50;
      if (p.y > canvas.height + 50) p.y = -50;

      // Draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow effect
      ctx.shadowColor = `hsl(${(p.hue + time * 50) % 360}, 100%, 50%)`;
      ctx.shadowBlur = 20;

      ctx.fillText(p.type, 0, 0);
      ctx.restore();
    }

    // Draw sparkle overlay
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
      ctx.fill();
    }

    animationId = requestAnimationFrame(draw);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resize();
    initParticles();
    draw();

    window.addEventListener('resize', resize);

    // Register hiding spot
    registerSpots('lisafrank', hidingSpots);
    const beanies = getBeaniesForArea('lisafrank');
    hiddenBeanie = beanies.get('behind-rainbow') || null;
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
  });

  $effect(() => {
    // Reinitialize when pattern or density changes
    if (canvas && ctx) {
      initParticles();
    }
  });
</script>

<div class="lisa-frank">
  <CloseButton {onClose} variant="light" />

  {#if hiddenBeanie}
    <HidingBeanie beanie={hiddenBeanie} class="rainbow-beanie" />
  {/if}

  <canvas bind:this={canvas}></canvas>

  <div class="controls">
    <div class="brand">
      <span class="brand-text">✨ LISA FRANK ✨</span>
      <span class="brand-sub">Pattern Generator</span>
    </div>

    <div class="control-group">
      <label>Pattern:</label>
      <select bind:value={pattern} onchange={() => playSound('pop', 0.3)}>
        <option value="dolphins">🐬 Dolphins</option>
        <option value="rainbows">🌈 Rainbows</option>
        <option value="hearts">💖 Hearts</option>
        <option value="stars">⭐ Stars</option>
        <option value="sparkles">✨ Sparkles</option>
      </select>
    </div>

    <div class="control-group">
      <label>Speed:</label>
      <input type="range" min="0.5" max="3" step="0.5" bind:value={speed} />
    </div>

    <div class="control-group">
      <label>Density:</label>
      <input type="range" min="20" max="100" step="10" bind:value={density} />
    </div>
  </div>
</div>

<style>
  .lisa-frank {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    border: 2px solid white;
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }

  canvas {
    display: block;
  }

  .controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 16px 24px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    flex-wrap: wrap;
    justify-content: center;
    max-width: 90%;
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .brand-text {
    font-family: 'Comic Sans MS', cursive;
    font-size: 1rem;
    font-weight: bold;
    background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 2s linear infinite;
  }

  @keyframes shimmer {
    0% { background-position: -100%; }
    100% { background-position: 100%; }
  }

  .brand-sub {
    font-size: 0.5rem;
    color: #ff69b4;
    font-family: 'Press Start 2P', monospace;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .control-group label {
    font-family: 'Comic Sans MS', cursive;
    font-size: 0.7rem;
    color: #ff69b4;
    font-weight: bold;
  }

  .control-group select {
    padding: 12px 16px;
    min-height: 44px;
    border-radius: 10px;
    border: 2px solid #ff69b4;
    background: white;
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .control-group input[type="range"] {
    width: 80px;
    accent-color: #ff69b4;
  }

  :global(.rainbow-beanie) {
    position: absolute;
    top: 60px;
    right: 20px;
    z-index: 5;
  }

  :global(.rainbow-beanie.discovered) {
    z-index: 15 !important;
  }

  @media (max-width: 600px) {
    .controls {
      padding: 12px 16px;
      gap: 12px;
    }

    .brand-text {
      font-size: 0.8rem;
    }
  }
</style>
