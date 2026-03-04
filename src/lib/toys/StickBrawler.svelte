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
      ctx.fillText(i < player.hp ? '\u2764\uFE0F' : '\u{1F5A4}', 12 + i * 28, 36);
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
          <p class="instruction">Arrow keys to move &middot; Z to punch &middot; X to kick</p>
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
        <p class="final-score">KOs: {score} &middot; Wave {wave}</p>
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
        >&#9664;</button>
        <button
          class="touch-btn"
          ontouchstart={() => touchMove(1)}
          ontouchend={touchStopMove}
          aria-label="Move right"
        >&#9654;</button>
      </div>
      <div class="touch-actions">
        <button class="touch-btn punch-btn" ontouchstart={touchPunch} aria-label="Punch">
          &#x1F44A;
        </button>
        <button class="touch-btn kick-btn" ontouchstart={touchKick} aria-label="Kick">
          &#x1F9B5;
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
