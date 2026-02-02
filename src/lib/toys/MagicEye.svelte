<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const hidingSpots: HidingSpot[] = [{ id: 'behind-frame' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  let currentShape = $state(0);
  let patternSeed = $state(Date.now());
  let showHint = $state(false);
  let difficulty = $state<'easy' | 'medium' | 'hard'>('easy');

  const shapes = [
    { name: 'Star', fn: drawStar },
    { name: 'Heart', fn: drawHeart },
    { name: 'Diamond', fn: drawDiamond },
    { name: 'Circle', fn: drawCircle },
    { name: 'Smile', fn: drawSmile },
  ];

  const difficultySettings = {
    easy: { depth: 20, patternWidth: 100 },
    medium: { depth: 15, patternWidth: 80 },
    hard: { depth: 10, patternWidth: 60 },
  };

  function seededRandom(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  function generateStereogram() {
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const settings = difficultySettings[difficulty];
    const stripWidth = settings.patternWidth;
    const maxShift = settings.depth;

    const random = seededRandom(patternSeed);

    // Create depth map by drawing shape
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, width, height);
    tempCtx.fillStyle = 'white';

    shapes[currentShape].fn(tempCtx, width / 2, height / 2, Math.min(width, height) * 0.3);

    const depthData = tempCtx.getImageData(0, 0, width, height).data;

    // Generate random pattern strip for each row
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let y = 0; y < height; y++) {
      // Create a random pattern strip for this row
      const strip: number[][] = [];
      for (let x = 0; x < stripWidth; x++) {
        const hue = random() * 360;
        const sat = 0.6 + random() * 0.4;
        const lum = 0.3 + random() * 0.4;
        strip.push(hslToRgb(hue / 360, sat, lum));
      }

      // For each pixel, determine its color based on depth-shifted pattern
      for (let x = 0; x < width; x++) {
        const depthIdx = (y * width + x) * 4;
        const depth = depthData[depthIdx] / 255; // 0 = background, 1 = foreground

        // Calculate horizontal shift based on depth
        // Objects "closer" (white in depth map) shift the pattern
        const shift = Math.round(depth * maxShift);

        // Get pattern position with shift
        const patternX = ((x + shift) % stripWidth + stripWidth) % stripWidth;
        const [r, g, b] = strip[patternX];

        const i = (y * width + x) * 4;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI / spikes) - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy, cx - size, cy, cx - size, cy + size * 0.3);
    ctx.bezierCurveTo(cx - size, cy + size * 0.7, cx, cy + size, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.7, cx + size, cy + size * 0.3);
    ctx.bezierCurveTo(cx + size, cy, cx, cy, cx, cy + size * 0.3);
    ctx.fill();
  }

  function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.7, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.7, cy);
    ctx.closePath();
    ctx.fill();
  }

  function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSmile(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    // Face
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (cut out)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx - size * 0.35, cy - size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.35, cy - size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Smile (cut out)
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.1, size * 0.5, 0.2, Math.PI - 0.2);
    ctx.lineWidth = size * 0.12;
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
  }

  function nextShape() {
    playSound('click', 0.3);
    currentShape = (currentShape + 1) % shapes.length;
    patternSeed = Date.now();
    generateStereogram();
  }

  function newPattern() {
    playSound('whoosh', 0.3);
    patternSeed = Date.now();
    generateStereogram();
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 300;
    generateStereogram();

    registerSpots('magiceye', hidingSpots);
    const beanies = getBeaniesForArea('magiceye');
    hiddenBeanie = beanies.get('behind-frame') || null;
  });

  $effect(() => {
    if (ctx) {
      generateStereogram();
    }
  });
</script>

<div class="magic-eye">
  <CloseButton {onClose} />

  <div class="container">
    <h1>MAGIC EYE</h1>
    <p class="subtitle">Can you see it?</p>

    <div class="stereogram-frame">
      <canvas bind:this={canvas}></canvas>

      {#if showHint}
        <div class="hint-overlay">
          <p>Hidden shape: {shapes[currentShape].name}</p>
        </div>
      {/if}

      {#if hiddenBeanie}
        <div class="beanie-behind-frame">
          <HidingBeanie beanie={hiddenBeanie} />
        </div>
      {/if}
    </div>

    <div class="instructions">
      <p><strong>How to see it:</strong></p>
      <p>1. Hold your face close to the screen (~6 inches)</p>
      <p>2. Relax your eyes and look "through" the screen</p>
      <p>3. Slowly move back while keeping your eyes relaxed</p>
      <p>4. The hidden <strong>{shapes[currentShape].name}</strong> will pop out in 3D!</p>
      <p class="tip">💡 Tip: Some people find it easier to cross their eyes slightly</p>
    </div>

    <div class="controls">
      <div class="control-group">
        <label>Difficulty:</label>
        <select bind:value={difficulty}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div class="buttons">
        <button onclick={nextShape}>Next Shape</button>
        <button onclick={newPattern}>New Pattern</button>
        <button onclick={() => showHint = !showHint}>
          {showHint ? 'Hide' : 'Show'} Hint
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .magic-eye {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    font-family: 'Press Start 2P', monospace;
    padding: 20px;
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

  .container {
    text-align: center;
    max-width: 500px;
  }

  h1 {
    font-size: 1.5rem;
    color: #00ff88;
    text-shadow: 0 0 20px #00ff88;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 0.6rem;
    color: #888;
    margin-bottom: 20px;
  }

  .stereogram-frame {
    background: #000;
    border: 4px solid #333;
    border-radius: 8px;
    padding: 8px;
    position: relative;
    display: inline-block;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.2);
  }

  canvas {
    display: block;
    border-radius: 4px;
    image-rendering: pixelated;
  }

  .beanie-behind-frame {
    position: absolute;
    top: -12px;
    left: -16px;
    z-index: 5;
  }

  :global(.beanie-behind-frame .discovered) {
    z-index: 15 !important;
  }

  .hint-overlay {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid #00ff88;
  }

  .hint-overlay p {
    font-size: 0.5rem;
    color: #00ff88;
    margin: 0;
  }

  .instructions {
    margin: 20px 0;
    text-align: left;
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .instructions p {
    font-size: 0.45rem;
    color: #aaa;
    margin: 8px 0;
    line-height: 1.6;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .control-group label {
    font-size: 0.5rem;
    color: #888;
  }

  .control-group select {
    padding: 8px 12px;
    font-family: inherit;
    font-size: 0.5rem;
    background: #1a1a2e;
    color: #00ff88;
    border: 2px solid #00ff88;
    cursor: pointer;
  }

  .buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .buttons button {
    padding: 12px 20px;
    min-height: 44px;
    font-family: inherit;
    font-size: 0.55rem;
    background: transparent;
    color: #00ff88;
    border: 2px solid #00ff88;
    cursor: pointer;
    transition: all 0.2s;
  }

  .buttons button:hover {
    background: #00ff88;
    color: #0d1b2a;
  }

  @media (max-width: 500px) {
    canvas {
      width: 300px;
      height: 225px;
    }
  }
</style>
