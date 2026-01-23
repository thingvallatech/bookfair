<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound, playRandomSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  // Drawing state
  let isDrawing = $state(false);
  let lastX = 0;
  let lastY = 0;

  // Tool state
  let currentTool = $state<'pencil' | 'brush' | 'spray' | 'stamp' | 'eraser' | 'fill'>('brush');
  let currentColor = $state('#FF0000');
  let brushSize = $state(12);
  let currentStamp = $state(0);

  // Color palette - Kid Pix style bright colors
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#FF6B00',
    '#FFFF00', '#00FF00', '#00FFFF', '#0000FF',
    '#FF00FF', '#FF69B4', '#8B4513', '#808080',
  ];

  // Stamps - emoji representations of 90s stuff
  const stamps = ['⭐', '❤️', '🌈', '🦋', '🌸', '🐸', '🎈', '🍕', '👽', '🔥', '💎', '🎸'];

  // Wacky brush patterns
  const brushPatterns = [
    'circle', 'square', 'star', 'splatter'
  ];

  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    // Save current drawing
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Fill with white
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Restore drawing if we had one
      if (imageData && imageData.width > 0) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }

  function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    if (currentTool === 'stamp') {
      playSound('stamp');
      const pos = getPos(e);
      drawStamp(pos.x, pos.y);
      return;
    }

    if (currentTool === 'fill') {
      playSound('pop');
      const pos = getPos(e);
      floodFill(Math.floor(pos.x), Math.floor(pos.y));
      return;
    }

    // Play sound based on tool
    if (currentTool === 'spray') {
      playSound('spray', 0.3);
    } else if (currentTool === 'eraser') {
      playSound('erase', 0.2);
    }

    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;

    // Draw a dot at start position
    draw(e);
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return;

    const pos = getPos(e);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = brushSize * 3;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'pencil') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'brush') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'spray') {
      sprayPaint(pos.x, pos.y);
    }

    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function sprayPaint(x: number, y: number) {
    const density = 30;
    const radius = brushSize * 2;

    ctx.fillStyle = currentColor;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  function drawStamp(x: number, y: number) {
    const stamp = stamps[currentStamp];
    ctx.font = `${brushSize * 4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stamp, x, y);
  }

  function floodFill(startX: number, startY: number) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];

    // Parse fill color
    const fillColor = hexToRgb(currentColor);
    if (!fillColor) return;

    // Don't fill if clicking on same color
    if (startR === fillColor.r && startG === fillColor.g && startB === fillColor.b) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const idx = (y * width + x) * 4;
      if (data[idx] !== startR || data[idx + 1] !== startG || data[idx + 2] !== startB) continue;

      visited.add(key);

      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);

      // Limit iterations to prevent hanging
      if (visited.size > 100000) break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function clearCanvas() {
    playSound('explode');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function selectTool(tool: typeof currentTool) {
    playSound('click', 0.3);
    currentTool = tool;
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    window.removeEventListener('resize', resizeCanvas);
  });
</script>

<div class="kidpix">
  <CloseButton {onClose} />

  <!-- Top toolbar -->
  <div class="toolbar top-toolbar">
    <div class="tool-group">
      <button
        class="tool-btn"
        class:active={currentTool === 'pencil'}
        onclick={() => selectTool('pencil')}
        title="Pencil"
      >✏️</button>
      <button
        class="tool-btn"
        class:active={currentTool === 'brush'}
        onclick={() => selectTool('brush')}
        title="Brush"
      >🖌️</button>
      <button
        class="tool-btn"
        class:active={currentTool === 'spray'}
        onclick={() => selectTool('spray')}
        title="Spray Paint"
      >💨</button>
      <button
        class="tool-btn"
        class:active={currentTool === 'fill'}
        onclick={() => selectTool('fill')}
        title="Fill Bucket"
      >🪣</button>
      <button
        class="tool-btn"
        class:active={currentTool === 'stamp'}
        onclick={() => selectTool('stamp')}
        title="Stamps"
      >⭐</button>
      <button
        class="tool-btn eraser"
        class:active={currentTool === 'eraser'}
        onclick={() => selectTool('eraser')}
        title="Eraser - Uh Oh!"
      >🧽</button>
    </div>

    <div class="tool-group">
      <button class="tool-btn danger" onclick={clearCanvas} title="Clear All - Oh No!">💣</button>
    </div>

    <div class="tool-group size-control">
      <span class="size-label">Size:</span>
      <input
        type="range"
        min="4"
        max="40"
        bind:value={brushSize}
        class="size-slider"
      />
      <div class="size-preview" style="width: {brushSize}px; height: {brushSize}px;"></div>
    </div>
  </div>

  <!-- Main canvas area -->
  <div class="canvas-container">
    <canvas
      bind:this={canvas}
      onmousedown={startDrawing}
      onmousemove={draw}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      ontouchstart={startDrawing}
      ontouchmove={draw}
      ontouchend={stopDrawing}
    ></canvas>
  </div>

  <!-- Bottom toolbar - colors and stamps -->
  <div class="toolbar bottom-toolbar">
    <!-- Color palette -->
    <div class="color-palette">
      {#each colors as color}
        <button
          class="color-btn"
          class:active={currentColor === color}
          style="background-color: {color};"
          onclick={() => currentColor = color}
        ></button>
      {/each}
    </div>

    <!-- Stamps (show when stamp tool selected) -->
    {#if currentTool === 'stamp'}
      <div class="stamp-palette">
        {#each stamps as stamp, i}
          <button
            class="stamp-btn"
            class:active={currentStamp === i}
            onclick={() => currentStamp = i}
          >{stamp}</button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .kidpix {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    font-family: 'Press Start 2P', monospace;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
    border: 3px solid #1a1a1a;
    flex-wrap: wrap;
  }

  .top-toolbar {
    border-bottom: none;
    padding-top: 8px;
  }

  .bottom-toolbar {
    border-top: none;
  }

  .tool-group {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: #1a1a1a;
    border-radius: 4px;
  }

  .tool-btn {
    width: 44px;
    height: 44px;
    border: 3px outset #666;
    background: linear-gradient(180deg, #888 0%, #555 100%);
    border-radius: 4px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .tool-btn:hover {
    background: linear-gradient(180deg, #999 0%, #666 100%);
  }

  .tool-btn:active,
  .tool-btn.active {
    border-style: inset;
    background: linear-gradient(180deg, #555 0%, #888 100%);
  }

  .tool-btn.eraser {
    background: linear-gradient(180deg, #ffcccc 0%, #ff9999 100%);
  }

  .tool-btn.danger {
    background: linear-gradient(180deg, #ff6666 0%, #cc3333 100%);
  }

  .size-control {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }

  .size-label {
    color: #ccc;
    font-size: 8px;
  }

  .size-slider {
    width: 80px;
    cursor: pointer;
  }

  .size-preview {
    background: white;
    border-radius: 50%;
    min-width: 8px;
    min-height: 8px;
  }

  .canvas-container {
    flex: 1;
    margin: 0 16px;
    border: 4px solid #1a1a1a;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  canvas {
    display: block;
    cursor: crosshair;
    background: white;
  }

  .color-palette {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: #1a1a1a;
    border-radius: 4px;
  }

  .color-btn {
    width: 32px;
    height: 32px;
    border: 3px outset #666;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .color-btn:hover {
    transform: scale(1.1);
  }

  .color-btn.active {
    border: 3px solid #fff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }

  .stamp-palette {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: #1a1a1a;
    border-radius: 4px;
    margin-left: auto;
  }

  .stamp-btn {
    width: 40px;
    height: 40px;
    border: 3px outset #666;
    background: linear-gradient(180deg, #888 0%, #555 100%);
    border-radius: 4px;
    font-size: 20px;
    cursor: pointer;
  }

  .stamp-btn:hover {
    background: linear-gradient(180deg, #999 0%, #666 100%);
  }

  .stamp-btn.active {
    border-style: inset;
    background: linear-gradient(180deg, #ffeb3b 0%, #ffc107 100%);
  }

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .toolbar {
      padding: 8px;
      gap: 8px;
    }

    .tool-btn {
      width: 44px;
      height: 44px;
      font-size: 18px;
    }

    .color-btn {
      width: 32px;
      height: 32px;
    }

    .size-control {
      display: none;
    }
  }
</style>
