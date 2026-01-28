<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Game constants
  const GRID_SIZE = 20;
  const INITIAL_SPEED = 150;
  const SPEED_INCREASE = 5;
  const MIN_SPEED = 50;

  // Game state
  let gameState = $state<'ready' | 'playing' | 'paused' | 'gameover'>('ready');
  let score = $state(0);
  let highScore = $state(0);
  let speed = $state(INITIAL_SPEED);

  // Grid dimensions (calculated on mount)
  let gridWidth = $state(20);
  let gridHeight = $state(15);

  // Snake state
  let snake = $state<Array<{ x: number; y: number }>>([]);
  let direction = $state<'up' | 'down' | 'left' | 'right'>('right');
  let nextDirection = $state<'up' | 'down' | 'left' | 'right'>('right');

  // Apple position
  let apple = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  let gameLoop: number;
  let gameContainer: HTMLDivElement;

  function initGame() {
    // Start snake in the middle
    const startX = Math.floor(gridWidth / 2);
    const startY = Math.floor(gridHeight / 2);

    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];

    direction = 'right';
    nextDirection = 'right';
    score = 0;
    speed = INITIAL_SPEED;

    spawnApple();
  }

  function spawnApple() {
    let newApple: { x: number; y: number };
    do {
      newApple = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight),
      };
    } while (snake.some(segment => segment.x === newApple.x && segment.y === newApple.y));

    apple = newApple;
  }

  function startGame() {
    initGame();
    gameState = 'playing';
    playSound('powerup', 0.4);
    runGameLoop();
  }

  function runGameLoop() {
    if (gameState !== 'playing') return;

    gameLoop = window.setTimeout(() => {
      update();
      runGameLoop();
    }, speed);
  }

  function update() {
    if (gameState !== 'playing') return;

    // Apply the queued direction
    direction = nextDirection;

    // Calculate new head position
    const head = snake[0];
    let newHead: { x: number; y: number };

    switch (direction) {
      case 'up':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'down':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'left':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'right':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= gridWidth || newHead.y < 0 || newHead.y >= gridHeight) {
      gameOver();
      return;
    }

    // Check self collision
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      gameOver();
      return;
    }

    // Move snake
    snake = [newHead, ...snake];

    // Check apple collision
    if (newHead.x === apple.x && newHead.y === apple.y) {
      score += 10;
      playSound('coin', 0.5);
      spawnApple();

      // Speed up
      if (speed > MIN_SPEED) {
        speed = Math.max(MIN_SPEED, speed - SPEED_INCREASE);
      }
    } else {
      // Remove tail if no apple eaten
      snake = snake.slice(0, -1);
    }
  }

  function gameOver() {
    gameState = 'gameover';
    clearTimeout(gameLoop);
    playSound('death', 0.5);

    if (score > highScore) {
      highScore = score;
      // Save high score
      try {
        localStorage.setItem('snake-highscore', String(highScore));
      } catch (e) {}
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (gameState === 'ready' || gameState === 'gameover') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (gameState === 'playing') {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (direction !== 'down') nextDirection = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (direction !== 'up') nextDirection = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (direction !== 'right') nextDirection = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (direction !== 'left') nextDirection = 'right';
          break;
        case ' ':
          e.preventDefault();
          gameState = 'paused';
          clearTimeout(gameLoop);
          break;
      }
    } else if (gameState === 'paused') {
      if (e.key === ' ') {
        e.preventDefault();
        gameState = 'playing';
        runGameLoop();
      }
    }
  }

  // Touch controls
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (gameState === 'ready' || gameState === 'gameover') {
      startGame();
      return;
    }

    if (gameState !== 'playing') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    const minSwipe = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > minSwipe && direction !== 'left') {
        nextDirection = 'right';
      } else if (deltaX < -minSwipe && direction !== 'right') {
        nextDirection = 'left';
      }
    } else {
      // Vertical swipe
      if (deltaY > minSwipe && direction !== 'up') {
        nextDirection = 'down';
      } else if (deltaY < -minSwipe && direction !== 'down') {
        nextDirection = 'up';
      }
    }
  }

  function calculateGrid() {
    if (!gameContainer) return;

    const rect = gameContainer.getBoundingClientRect();
    const padding = 40;
    const availableWidth = rect.width - padding;
    const availableHeight = rect.height - padding - 100; // Account for header/score

    gridWidth = Math.floor(availableWidth / GRID_SIZE);
    gridHeight = Math.floor(availableHeight / GRID_SIZE);

    // Ensure minimum size
    gridWidth = Math.max(15, Math.min(30, gridWidth));
    gridHeight = Math.max(10, Math.min(20, gridHeight));
  }

  onMount(() => {
    // Load high score
    try {
      const saved = localStorage.getItem('snake-highscore');
      if (saved) highScore = parseInt(saved, 10);
    } catch (e) {}

    calculateGrid();
    initGame();

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', calculateGrid);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', calculateGrid);
      clearTimeout(gameLoop);
    };
  });

  onDestroy(() => {
    clearTimeout(gameLoop);
  });
</script>

<div
  class="snake-container"
  bind:this={gameContainer}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
>
  <CloseButton {onClose} />

  <div class="game-header">
    <h1 class="title">🐍 SNAKE</h1>
    <div class="scores">
      <span class="score">Score: {score}</span>
      <span class="high-score">Best: {highScore}</span>
    </div>
  </div>

  <div
    class="game-board"
    style="width: {gridWidth * GRID_SIZE}px; height: {gridHeight * GRID_SIZE}px;"
  >
    <!-- Grid background -->
    <div class="grid-bg">
      {#each Array(gridHeight) as _, y}
        {#each Array(gridWidth) as _, x}
          <div
            class="grid-cell"
            class:checker={(x + y) % 2 === 0}
          ></div>
        {/each}
      {/each}
    </div>

    <!-- Apple -->
    <div
      class="apple"
      style="left: {apple.x * GRID_SIZE}px; top: {apple.y * GRID_SIZE}px;"
    >
      🍎
    </div>

    <!-- Snake -->
    {#each snake as segment, i}
      <div
        class="snake-segment"
        class:head={i === 0}
        class:tail={i === snake.length - 1}
        style="left: {segment.x * GRID_SIZE}px; top: {segment.y * GRID_SIZE}px;"
      >
        {#if i === 0}
          <span class="eyes">
            {#if direction === 'up'}👀{:else if direction === 'down'}👀{:else if direction === 'left'}👀{:else}👀{/if}
          </span>
        {/if}
      </div>
    {/each}

    <!-- Overlays -->
    {#if gameState === 'ready'}
      <div class="overlay">
        <div class="overlay-content">
          <p class="instruction">Use arrow keys or WASD to move</p>
          <p class="instruction">Swipe on mobile</p>
          <button class="start-btn nes-btn is-success" onclick={startGame}>
            START
          </button>
          <p class="hint">or press SPACE</p>
        </div>
      </div>
    {:else if gameState === 'paused'}
      <div class="overlay">
        <div class="overlay-content">
          <h2>PAUSED</h2>
          <p class="hint">Press SPACE to continue</p>
        </div>
      </div>
    {:else if gameState === 'gameover'}
      <div class="overlay gameover">
        <div class="overlay-content">
          <h2>GAME OVER</h2>
          <p class="final-score">Score: {score}</p>
          {#if score === highScore && score > 0}
            <p class="new-record">🎉 NEW HIGH SCORE! 🎉</p>
          {/if}
          <button class="start-btn nes-btn is-primary" onclick={startGame}>
            PLAY AGAIN
          </button>
          <p class="hint">or press SPACE</p>
        </div>
      </div>
    {/if}
  </div>

  <div class="controls-hint">
    {#if gameState === 'playing'}
      <span>SPACE to pause · ESC to exit</span>
    {:else}
      <span>ESC to exit</span>
    {/if}
  </div>
</div>

<style>
  .snake-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
    touch-action: none;
  }

  .game-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .title {
    font-size: 1.5rem;
    color: #4ade80;
    margin: 0 0 10px 0;
    text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
  }

  .scores {
    display: flex;
    gap: 24px;
    justify-content: center;
    font-size: 0.7rem;
  }

  .score {
    color: #fff;
  }

  .high-score {
    color: #f7d51d;
  }

  .game-board {
    position: relative;
    background: #0a0a15;
    border: 4px solid #4ade80;
    border-radius: 4px;
    box-shadow:
      0 0 20px rgba(74, 222, 128, 0.3),
      inset 0 0 20px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .grid-bg {
    display: grid;
    grid-template-columns: repeat(var(--cols), 20px);
    position: absolute;
    inset: 0;
  }

  .grid-cell {
    width: 20px;
    height: 20px;
    background: #0d1117;
  }

  .grid-cell.checker {
    background: #0f1419;
  }

  .apple {
    position: absolute;
    width: 20px;
    height: 20px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 0.5s ease-in-out infinite alternate;
    z-index: 5;
  }

  @keyframes pulse {
    from { transform: scale(0.9); }
    to { transform: scale(1.1); }
  }

  .snake-segment {
    position: absolute;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    border-radius: 4px;
    z-index: 10;
    transition: left 0.05s linear, top 0.05s linear;
  }

  .snake-segment.head {
    background: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
    border-radius: 6px;
    z-index: 11;
  }

  .snake-segment.tail {
    border-radius: 4px 4px 8px 8px;
  }

  .eyes {
    font-size: 10px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    line-height: 1;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .overlay-content {
    text-align: center;
    color: #fff;
  }

  .overlay-content h2 {
    font-size: 1.5rem;
    margin: 0 0 16px 0;
    color: #4ade80;
  }

  .gameover .overlay-content h2 {
    color: #ef4444;
  }

  .instruction {
    font-size: 0.6rem;
    margin: 8px 0;
    color: #aaa;
  }

  .start-btn {
    margin: 16px 0 8px 0;
    font-size: 0.7rem !important;
    padding: 8px 24px !important;
  }

  .hint {
    font-size: 0.45rem;
    color: #666;
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
  }

  @keyframes flash {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }

  .controls-hint {
    margin-top: 16px;
    font-size: 0.45rem;
    color: #666;
  }

  @media (max-width: 500px) {
    .snake-container {
      padding: 10px;
    }

    .title {
      font-size: 1.2rem;
    }

    .scores {
      font-size: 0.6rem;
    }
  }
</style>
