<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'behind-pegboard' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Grid dimensions
  const COLS = 30;
  const ROWS = 22;

  // Lite-Brite colors
  const COLORS = [
    { name: 'Red', hex: '#ff2020', glow: '#ff4040' },
    { name: 'Orange', hex: '#ff8c00', glow: '#ffaa00' },
    { name: 'Yellow', hex: '#ffe600', glow: '#ffff44' },
    { name: 'Green', hex: '#00dd44', glow: '#44ff66' },
    { name: 'Blue', hex: '#2266ff', glow: '#4488ff' },
    { name: 'Purple', hex: '#aa22ff', glow: '#cc66ff' },
    { name: 'Pink', hex: '#ff44aa', glow: '#ff77cc' },
    { name: 'White', hex: '#eeeeff', glow: '#ffffff' },
  ];

  // Board state: null = empty, string = color hex
  let board = $state<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
  );

  // Current selected color index
  let selectedColor = $state(0);
  let eraserMode = $state(false);
  let isPainting = $state(false);

  // Template system
  type Template = { name: string; pegs: [number, number][] };

  const templates: Template[] = [
    {
      name: 'Heart',
      pegs: (() => {
        const p: [number, number][] = [];
        const cx = 15, cy = 10;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const x = (c - cx) / 6;
            const y = (r - cy) / 6;
            const eq = (x * x + y * y - 1);
            if (eq * eq * eq - x * x * y * y * y < 0.04 && eq * eq * eq - x * x * y * y * y > -0.3) {
              p.push([r, c]);
            }
          }
        }
        return p;
      })(),
    },
    {
      name: 'Star',
      pegs: (() => {
        const p: [number, number][] = [];
        const cx = 15, cy = 11;
        const outerR = 9;
        const innerR = 4;
        const points = 5;
        // Generate star outline points
        const starPoints: [number, number][] = [];
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          starPoints.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
        }
        // Draw lines between star points
        for (let i = 0; i < starPoints.length; i++) {
          const [x1, y1] = starPoints[i];
          const [x2, y2] = starPoints[(i + 1) % starPoints.length];
          const steps = 20;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const col = Math.round(x1 + (x2 - x1) * t);
            const row = Math.round(y1 + (y2 - y1) * t);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
              if (!p.some(([pr, pc]) => pr === row && pc === col)) {
                p.push([row, col]);
              }
            }
          }
        }
        return p;
      })(),
    },
    {
      name: 'Flower',
      pegs: (() => {
        const p: [number, number][] = [];
        const cx = 15, cy = 11;
        // Center
        for (let r = -1; r <= 1; r++) {
          for (let c = -1; c <= 1; c++) {
            if (Math.abs(r) + Math.abs(c) <= 1) {
              p.push([cy + r, cx + c]);
            }
          }
        }
        // Petals
        const petalAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
        for (const angle of petalAngles) {
          const petalCx = cx + Math.cos(angle) * 5;
          const petalCy = cy + Math.sin(angle) * 5;
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const dx = c - petalCx;
              const dy = r - petalCy;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist >= 2.2 && dist <= 3.2) {
                if (!p.some(([pr, pc]) => pr === r && pc === c)) {
                  p.push([r, c]);
                }
              }
            }
          }
        }
        // Stem
        for (let r = cy + 2; r <= cy + 8; r++) {
          if (r >= 0 && r < ROWS) {
            p.push([r, cx]);
          }
        }
        // Leaves
        p.push([cy + 5, cx - 1]);
        p.push([cy + 5, cx - 2]);
        p.push([cy + 6, cx - 2]);
        p.push([cy + 6, cx + 1]);
        p.push([cy + 6, cx + 2]);
        p.push([cy + 7, cx + 2]);
        return p;
      })(),
    },
  ];

  let activeTemplate = $state<number | null>(null);

  let guideSet = $derived<Set<string>>(
    activeTemplate !== null
      ? new Set(templates[activeTemplate].pegs.map(([r, c]) => `${r}-${c}`))
      : new Set()
  );

  function selectColor(index: number) {
    selectedColor = index;
    eraserMode = false;
    playSound('click', 0.15);
  }

  function toggleEraser() {
    eraserMode = !eraserMode;
    playSound('click', 0.15);
  }

  function placePeg(row: number, col: number) {
    if (eraserMode) {
      if (board[row][col] !== null) {
        board[row][col] = null;
        playSound('pop', 0.2);
      }
    } else {
      const color = COLORS[selectedColor].hex;
      if (board[row][col] !== color) {
        board[row][col] = color;
        playSound('click', 0.15);
      }
    }
  }

  function handlePegDown(row: number, col: number, e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isPainting = true;
    placePeg(row, col);
  }

  function handlePegEnter(row: number, col: number) {
    if (isPainting) {
      placePeg(row, col);
    }
  }

  function handlePointerUp() {
    isPainting = false;
  }

  function handleContextMenu(e: MouseEvent, row: number, col: number) {
    e.preventDefault();
    if (board[row][col] !== null) {
      board[row][col] = null;
      playSound('pop', 0.2);
    }
  }

  function clearAll() {
    playSound('pop', 0.3);
    board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  }

  function selectTemplate(index: number) {
    if (activeTemplate === index) {
      activeTemplate = null;
    } else {
      activeTemplate = index;
    }
    playSound('click', 0.15);
  }

  function getGlowColor(hex: string): string {
    const entry = COLORS.find((c) => c.hex === hex);
    return entry ? entry.glow : hex;
  }

  onMount(() => {
    registerSpots('litebrite', hidingSpots);
    const beanies = getBeaniesForArea('litebrite');
    hiddenBeanie = beanies.get('behind-pegboard') || null;

    // Global pointer up handler
    const onUp = () => (isPainting = false);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  });
</script>

<div class="litebrite" onmouseup={handlePointerUp} ontouchend={handlePointerUp} role="application" aria-label="Lite-Brite pegboard">
  <CloseButton {onClose} />

  <!-- Classic Lite-Brite header -->
  <div class="header">
    <div class="logo">
      <span class="logo-lite">LITE</span>
      <span class="logo-dash">-</span>
      <span class="logo-brite">BRITE</span>
    </div>
    <div class="header-subtitle">Create with Light!</div>
  </div>

  <!-- Template buttons -->
  <div class="template-bar">
    <span class="template-label">Templates:</span>
    {#each templates as template, i}
      <button
        class="template-btn"
        class:active={activeTemplate === i}
        onclick={() => selectTemplate(i)}
      >
        {template.name}
      </button>
    {/each}
    <button class="clear-btn" onclick={clearAll}>Clear All</button>
  </div>

  <!-- Pegboard -->
  <div class="pegboard-container">
    <div class="pegboard-frame">
      <div
        class="pegboard"
        style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);"
      >
        {#each board as row, r}
          {#each row as peg, c}
            {@const isOffset = r % 2 === 1}
            {@const isGuide = guideSet.has(`${r}-${c}`)}
            <button
              class="peg-hole"
              class:filled={peg !== null}
              class:guide={isGuide && peg === null}
              class:offset={isOffset}
              style={peg !== null
                ? `--peg-color: ${peg}; --peg-glow: ${getGlowColor(peg)};`
                : ''}
              onmousedown={(e) => handlePegDown(r, c, e)}
              onmouseenter={() => handlePegEnter(r, c)}
              ontouchstart={(e) => handlePegDown(r, c, e)}
              oncontextmenu={(e) => handleContextMenu(e, r, c)}
              aria-label={peg !== null
                ? `Peg at row ${r + 1}, column ${c + 1}, color ${peg}`
                : `Empty hole at row ${r + 1}, column ${c + 1}`}
            >
              {#if peg !== null}
                <div class="peg-light"></div>
              {/if}
            </button>
          {/each}
        {/each}
      </div>
    </div>

    {#if hiddenBeanie}
      <div class="beanie-spot">
        <HidingBeanie beanie={hiddenBeanie} class="litebrite-beanie" />
      </div>
    {/if}
  </div>

  <!-- Color palette tray -->
  <div class="palette-tray">
    <div class="palette-colors">
      {#each COLORS as color, i}
        <button
          class="color-peg"
          class:selected={selectedColor === i && !eraserMode}
          style="--color: {color.hex}; --glow: {color.glow};"
          onclick={() => selectColor(i)}
          aria-label="Select {color.name}"
          title={color.name}
        >
          <div class="color-peg-inner"></div>
        </button>
      {/each}
    </div>
    <button
      class="eraser-btn"
      class:active={eraserMode}
      onclick={toggleEraser}
      aria-label="Toggle eraser"
      title="Eraser (or right-click to remove)"
    >
      <span class="eraser-icon">&#x2715;</span>
      <span class="eraser-text">Erase</span>
    </button>
  </div>
</div>

<style>
  .litebrite {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #0a0a0a;
    position: relative;
    font-family: 'Press Start 2P', monospace;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  /* Header / Logo */
  .header {
    text-align: center;
    padding: 10px 8px 4px;
    flex-shrink: 0;
  }

  .logo {
    font-size: clamp(16px, 3.5vw, 32px);
    font-weight: bold;
    letter-spacing: 4px;
  }

  .logo-lite {
    color: #ff4444;
    text-shadow:
      0 0 10px #ff4444,
      0 0 20px #ff4444,
      0 0 40px #ff000088;
  }

  .logo-dash {
    color: #ffff44;
    text-shadow:
      0 0 10px #ffff44,
      0 0 20px #ffff4488;
  }

  .logo-brite {
    color: #44ff44;
    text-shadow:
      0 0 10px #44ff44,
      0 0 20px #44ff44,
      0 0 40px #00ff0088;
  }

  .header-subtitle {
    font-size: clamp(6px, 1.2vw, 10px);
    color: #887744;
    margin-top: 2px;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  /* Template bar */
  .template-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 12px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .template-label {
    color: #666;
    font-size: 7px;
    letter-spacing: 1px;
  }

  .template-btn {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #888;
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.15s;
  }

  .template-btn:hover {
    border-color: #555;
    color: #aaa;
  }

  .template-btn.active {
    border-color: #ffcc00;
    color: #ffcc00;
    text-shadow: 0 0 6px #ffcc0088;
    box-shadow: 0 0 6px #ffcc0044;
  }

  .clear-btn {
    background: #1a1a1a;
    border: 1px solid #442222;
    color: #ff4444;
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 3px;
    margin-left: 8px;
    transition: all 0.15s;
  }

  .clear-btn:hover {
    border-color: #ff4444;
    text-shadow: 0 0 6px #ff444488;
    box-shadow: 0 0 6px #ff444444;
  }

  /* Pegboard */
  .pegboard-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    min-height: 0;
    position: relative;
  }

  .pegboard-frame {
    border: 3px solid #222;
    border-radius: 6px;
    background: #080808;
    box-shadow:
      inset 0 0 30px rgba(0, 0, 0, 0.8),
      0 0 20px rgba(0, 0, 0, 0.5);
    padding: 6px;
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
  }

  .pegboard {
    display: grid;
    gap: 1px;
    width: min(calc(100vw - 40px), calc((100vh - 200px) * 1.36));
    height: min(calc(100vh - 200px), calc((100vw - 40px) * 0.733));
    max-width: 780px;
    max-height: 572px;
  }

  /* Individual peg hole */
  .peg-hole {
    position: relative;
    border: none;
    border-radius: 50%;
    background: #111;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.05s;
    aspect-ratio: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .peg-hole::before {
    content: '';
    position: absolute;
    inset: 25%;
    border-radius: 50%;
    background: #181818;
    border: 1px solid #0e0e0e;
    pointer-events: none;
  }

  .peg-hole:hover:not(.filled) {
    background: #1a1a1a;
  }

  .peg-hole:hover:not(.filled)::before {
    background: #222;
    border-color: #333;
  }

  /* Guide dots for templates */
  .peg-hole.guide::before {
    background: #1f1f14;
    border-color: #2a2a18;
  }

  /* Filled peg with glow */
  .peg-hole.filled {
    background: transparent;
  }

  .peg-hole.filled::before {
    display: none;
  }

  .peg-light {
    position: absolute;
    inset: 10%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 35%,
      white 0%,
      var(--peg-glow) 20%,
      var(--peg-color) 50%,
      transparent 70%
    );
    box-shadow:
      0 0 3px var(--peg-color),
      0 0 6px var(--peg-color),
      0 0 12px var(--peg-glow),
      0 0 20px var(--peg-glow),
      0 0 35px color-mix(in srgb, var(--peg-glow) 50%, transparent);
    animation: peg-flicker 4s ease-in-out infinite alternate;
  }

  @keyframes peg-flicker {
    0% {
      opacity: 0.92;
      filter: brightness(0.95);
    }
    50% {
      opacity: 1;
      filter: brightness(1.05);
    }
    100% {
      opacity: 0.95;
      filter: brightness(1);
    }
  }

  /* Beanie hiding spot */
  .beanie-spot {
    position: absolute;
    bottom: 4px;
    left: 16px;
    z-index: 5;
  }

  :global(.litebrite-beanie) {
    bottom: 0;
    left: 0;
    z-index: 5;
  }

  :global(.litebrite-beanie.discovered) {
    z-index: 15 !important;
  }

  /* Palette tray */
  .palette-tray {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 12px 12px;
    flex-shrink: 0;
    background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
    border-top: 1px solid #1a1a1a;
  }

  .palette-colors {
    display: flex;
    gap: 6px;
    padding: 6px 12px;
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
  }

  .color-peg {
    width: clamp(28px, 5vw, 44px);
    height: clamp(28px, 5vw, 44px);
    border-radius: 50%;
    border: 2px solid #333;
    background: #111;
    cursor: pointer;
    padding: 3px;
    transition: all 0.15s;
    position: relative;
  }

  .color-peg-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 35%,
      white 0%,
      var(--glow) 25%,
      var(--color) 55%,
      color-mix(in srgb, var(--color) 70%, black) 100%
    );
    box-shadow:
      0 0 4px var(--color),
      0 0 8px color-mix(in srgb, var(--glow) 60%, transparent);
  }

  .color-peg:hover {
    transform: scale(1.15);
    border-color: #555;
  }

  .color-peg.selected {
    border-color: #fff;
    transform: scale(1.2);
    box-shadow:
      0 0 8px var(--glow),
      0 0 16px color-mix(in srgb, var(--glow) 40%, transparent);
  }

  .color-peg.selected .color-peg-inner {
    box-shadow:
      0 0 6px var(--color),
      0 0 12px var(--glow),
      0 0 24px color-mix(in srgb, var(--glow) 50%, transparent);
  }

  .eraser-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: #1a1a1a;
    border: 2px solid #333;
    color: #888;
    font-family: 'Press Start 2P', monospace;
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .eraser-icon {
    font-size: clamp(12px, 2.5vw, 18px);
    line-height: 1;
  }

  .eraser-text {
    font-size: 6px;
    letter-spacing: 1px;
  }

  .eraser-btn:hover {
    border-color: #666;
    color: #ccc;
  }

  .eraser-btn.active {
    border-color: #ff4444;
    color: #ff4444;
    background: #1a0808;
    text-shadow: 0 0 6px #ff444488;
    box-shadow: 0 0 8px #ff444444;
  }

  /* Mobile tweaks */
  @media (max-width: 600px) {
    .header {
      padding: 6px 8px 2px;
    }

    .palette-colors {
      gap: 4px;
      padding: 4px 8px;
    }

    .template-bar {
      gap: 4px;
      padding: 2px 8px;
    }

    .template-btn,
    .clear-btn {
      font-size: 6px;
      padding: 3px 6px;
    }

    .pegboard-container {
      padding: 2px 4px;
    }

    .pegboard-frame {
      padding: 3px;
    }

    .palette-tray {
      gap: 8px;
      padding: 6px 8px 10px;
    }

    .eraser-btn {
      padding: 4px 8px;
    }
  }

  @media (max-height: 600px) {
    .header {
      padding: 4px 8px 2px;
    }

    .header-subtitle {
      display: none;
    }

    .template-bar {
      padding: 2px 8px;
    }

    .palette-tray {
      padding: 4px 8px 6px;
    }
  }
</style>
