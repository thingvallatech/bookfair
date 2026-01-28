<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Game constants
  const GRAVITY = 0.4;
  const FRICTION = 0.99;
  const BOUNCE = 0.7;
  const SLIME_RADIUS = 50;
  const BALL_RADIUS = 20;
  const NET_HEIGHT = 80;
  const NET_WIDTH = 8;
  const WINNING_SCORE = 7;
  const SLIME_JUMP_FORCE = -12;
  const SLIME_MOVE_SPEED = 6;

  // Canvas and game state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let gameWidth = 600;
  let gameHeight = 400;

  // Game state
  let gameState = $state<'ready' | 'playing' | 'point' | 'gameover'>('ready');
  let playerScore = $state(0);
  let aiScore = $state(0);
  let winner = $state<'player' | 'ai' | null>(null);
  let pointMessage = $state('');

  // Touch device detection
  let isTouchDevice = $state(false);

  // Player slime (left side, green)
  let player = {
    x: 150,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: true,
    color: '#4ade80',
  };

  // AI slime (right side, red)
  let ai = {
    x: 450,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: true,
    color: '#f87171',
  };

  // Ball
  let ball = {
    x: 150,
    y: 100,
    vx: 0,
    vy: 0,
    lastHitBy: 'player' as 'player' | 'ai',
  };

  // Input state
  let keys = {
    left: false,
    right: false,
    up: false,
  };

  function resetBall(servingPlayer: 'player' | 'ai') {
    ball.x = servingPlayer === 'player' ? gameWidth * 0.25 : gameWidth * 0.75;
    ball.y = gameHeight * 0.3;
    ball.vx = 0;
    ball.vy = 0;
    ball.lastHitBy = servingPlayer;
  }

  function resetPositions() {
    player.x = gameWidth * 0.25;
    player.y = gameHeight - SLIME_RADIUS;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;

    ai.x = gameWidth * 0.75;
    ai.y = gameHeight - SLIME_RADIUS;
    ai.vx = 0;
    ai.vy = 0;
    ai.grounded = true;
  }

  function startGame() {
    playerScore = 0;
    aiScore = 0;
    winner = null;
    resetPositions();
    resetBall('player');
    gameState = 'playing';
    playSound('powerup', 0.4);
  }

  function scorePoint(scorer: 'player' | 'ai') {
    if (scorer === 'player') {
      playerScore++;
      pointMessage = 'You scored!';
      playSound('coin', 0.5);
    } else {
      aiScore++;
      pointMessage = 'AI scored!';
      playSound('hit', 0.5);
    }

    if (playerScore >= WINNING_SCORE) {
      winner = 'player';
      gameState = 'gameover';
      playSound('victory', 0.5);
    } else if (aiScore >= WINNING_SCORE) {
      winner = 'ai';
      gameState = 'gameover';
      playSound('death', 0.5);
    } else {
      gameState = 'point';
      setTimeout(() => {
        resetPositions();
        resetBall(scorer === 'player' ? 'player' : 'ai');
        gameState = 'playing';
      }, 1000);
    }
  }

  function updatePlayer() {
    // Horizontal movement
    if (keys.left) {
      player.vx = -SLIME_MOVE_SPEED;
    } else if (keys.right) {
      player.vx = SLIME_MOVE_SPEED;
    } else {
      player.vx *= 0.8;
    }

    // Jumping
    if (keys.up && player.grounded) {
      player.vy = SLIME_JUMP_FORCE;
      player.grounded = false;
      playSound('jump', 0.3);
    }

    // Apply gravity
    if (!player.grounded) {
      player.vy += GRAVITY;
    }

    // Update position
    player.x += player.vx;
    player.y += player.vy;

    // Boundaries - player stays on left side
    if (player.x < SLIME_RADIUS) player.x = SLIME_RADIUS;
    if (player.x > gameWidth / 2 - NET_WIDTH / 2 - SLIME_RADIUS) {
      player.x = gameWidth / 2 - NET_WIDTH / 2 - SLIME_RADIUS;
    }

    // Ground collision
    if (player.y >= gameHeight - SLIME_RADIUS) {
      player.y = gameHeight - SLIME_RADIUS;
      player.vy = 0;
      player.grounded = true;
    }
  }

  function updateAI() {
    // Simple AI: track the ball when it's on AI's side
    const targetX = ball.x > gameWidth / 2 ? ball.x : gameWidth * 0.75;
    const diffX = targetX - ai.x;

    // Move towards target
    if (Math.abs(diffX) > 10) {
      ai.vx = Math.sign(diffX) * SLIME_MOVE_SPEED * 0.85;
    } else {
      ai.vx *= 0.8;
    }

    // Jump logic - jump when ball is coming down and close
    const ballComingDown = ball.vy > 0;
    const ballClose = Math.abs(ball.x - ai.x) < SLIME_RADIUS * 2;
    const ballAbove = ball.y < ai.y - SLIME_RADIUS;

    if (ai.grounded && ballComingDown && ballClose && ballAbove && ball.x > gameWidth / 2) {
      ai.vy = SLIME_JUMP_FORCE;
      ai.grounded = false;
    }

    // Also jump if ball is high and on AI's side
    if (ai.grounded && ball.y < gameHeight * 0.4 && ball.x > gameWidth / 2 && Math.abs(ball.x - ai.x) < SLIME_RADIUS * 3) {
      ai.vy = SLIME_JUMP_FORCE * 0.9;
      ai.grounded = false;
    }

    // Apply gravity
    if (!ai.grounded) {
      ai.vy += GRAVITY;
    }

    // Update position
    ai.x += ai.vx;
    ai.y += ai.vy;

    // Boundaries - AI stays on right side
    if (ai.x < gameWidth / 2 + NET_WIDTH / 2 + SLIME_RADIUS) {
      ai.x = gameWidth / 2 + NET_WIDTH / 2 + SLIME_RADIUS;
    }
    if (ai.x > gameWidth - SLIME_RADIUS) ai.x = gameWidth - SLIME_RADIUS;

    // Ground collision
    if (ai.y >= gameHeight - SLIME_RADIUS) {
      ai.y = gameHeight - SLIME_RADIUS;
      ai.vy = 0;
      ai.grounded = true;
    }
  }

  function updateBall() {
    // Apply gravity
    ball.vy += GRAVITY;
    ball.vx *= FRICTION;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.vx *= -BOUNCE;
    }
    if (ball.x > gameWidth - BALL_RADIUS) {
      ball.x = gameWidth - BALL_RADIUS;
      ball.vx *= -BOUNCE;
    }

    // Ceiling collision
    if (ball.y < BALL_RADIUS) {
      ball.y = BALL_RADIUS;
      ball.vy *= -BOUNCE;
    }

    // Net collision
    const netLeft = gameWidth / 2 - NET_WIDTH / 2;
    const netRight = gameWidth / 2 + NET_WIDTH / 2;
    const netTop = gameHeight - NET_HEIGHT;

    if (ball.y + BALL_RADIUS > netTop && ball.y < gameHeight) {
      // Ball hitting top of net
      if (ball.y - BALL_RADIUS < netTop && ball.y + BALL_RADIUS > netTop) {
        if (ball.x > netLeft - BALL_RADIUS && ball.x < netRight + BALL_RADIUS) {
          ball.y = netTop - BALL_RADIUS;
          ball.vy *= -BOUNCE;
          playSound('hit', 0.2);
        }
      }
      // Ball hitting side of net
      if (ball.x > netLeft - BALL_RADIUS && ball.x < gameWidth / 2 && ball.vx > 0) {
        ball.x = netLeft - BALL_RADIUS;
        ball.vx *= -BOUNCE;
      }
      if (ball.x < netRight + BALL_RADIUS && ball.x > gameWidth / 2 && ball.vx < 0) {
        ball.x = netRight + BALL_RADIUS;
        ball.vx *= -BOUNCE;
      }
    }

    // Slime collisions
    checkSlimeCollision(player, 'player');
    checkSlimeCollision(ai, 'ai');

    // Ground collision = point scored
    if (ball.y > gameHeight - BALL_RADIUS) {
      if (ball.x < gameWidth / 2) {
        scorePoint('ai');
      } else {
        scorePoint('player');
      }
    }
  }

  function checkSlimeCollision(slime: typeof player, slimeType: 'player' | 'ai') {
    const dx = ball.x - slime.x;
    const dy = ball.y - slime.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = SLIME_RADIUS + BALL_RADIUS;

    // Only collide with top half of slime (it's a semicircle)
    if (dist < minDist && dy < 0) {
      // Normalize collision vector
      const nx = dx / dist;
      const ny = dy / dist;

      // Move ball outside slime
      ball.x = slime.x + nx * minDist;
      ball.y = slime.y + ny * minDist;

      // Calculate relative velocity
      const dvx = ball.vx - slime.vx;
      const dvy = ball.vy - slime.vy;

      // Calculate velocity component along collision normal
      const dvn = dvx * nx + dvy * ny;

      // Only bounce if moving towards slime
      if (dvn < 0) {
        // Apply bounce with slime's velocity influence
        const bounceForce = 1.2;
        ball.vx = ball.vx - 2 * dvn * nx * bounceForce + slime.vx * 0.5;
        ball.vy = ball.vy - 2 * dvn * ny * bounceForce + slime.vy * 0.3;

        // Add some upward force
        ball.vy = Math.min(ball.vy, -8);

        // Limit ball speed
        const maxSpeed = 15;
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > maxSpeed) {
          ball.vx = (ball.vx / speed) * maxSpeed;
          ball.vy = (ball.vy / speed) * maxSpeed;
        }

        ball.lastHitBy = slimeType;
        playSound('pop', 0.4);
      }
    }
  }

  function gameLoop() {
    if (gameState === 'playing') {
      updatePlayer();
      updateAI();
      updateBall();
    }

    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  function draw() {
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Draw ground
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, gameHeight - 10, gameWidth, 10);

    // Draw net
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gameWidth / 2 - NET_WIDTH / 2, gameHeight - NET_HEIGHT, NET_WIDTH, NET_HEIGHT);

    // Draw player slime (green, left)
    drawSlime(player.x, player.y, player.color, '◕‿◕');

    // Draw AI slime (red, right)
    drawSlime(ai.x, ai.y, ai.color, '◕‿◕');

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw scores
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = player.color;
    ctx.fillText(String(playerScore), gameWidth * 0.25, 50);
    ctx.fillStyle = ai.color;
    ctx.fillText(String(aiScore), gameWidth * 0.75, 50);

    // Draw center line
    ctx.strokeStyle = '#ffffff33';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(gameWidth / 2, 0);
    ctx.lineTo(gameWidth / 2, gameHeight - NET_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawSlime(x: number, y: number, color: string, face: string) {
    // Draw semicircle body
    ctx.beginPath();
    ctx.arc(x, y, SLIME_RADIUS, Math.PI, 0);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw face
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(face, x, y - 15);
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
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          keys.right = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          e.preventDefault();
          keys.up = true;
          break;
      }
    }
  }

  function handleKeyup(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        keys.right = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        keys.up = false;
        break;
    }
  }

  // D-pad handlers for mobile
  function handleDpadDown(dir: 'left' | 'right' | 'up') {
    if (gameState === 'ready' || gameState === 'gameover') {
      startGame();
      return;
    }
    keys[dir] = true;
  }

  function handleDpadUp(dir: 'left' | 'right' | 'up') {
    keys[dir] = false;
  }

  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const maxWidth = Math.min(600, container.clientWidth - 20);
    const maxHeight = isTouchDevice ? 280 : 400;
    const aspectRatio = 3 / 2;

    if (maxWidth / aspectRatio <= maxHeight) {
      gameWidth = maxWidth;
      gameHeight = maxWidth / aspectRatio;
    } else {
      gameHeight = maxHeight;
      gameWidth = maxHeight * aspectRatio;
    }

    canvas.width = gameWidth;
    canvas.height = gameHeight;

    // Adjust positions based on new size
    resetPositions();
    if (gameState === 'ready') {
      resetBall('player');
    }
  }

  // Prevent browser gestures on canvas
  function preventGesture(e: TouchEvent) {
    e.preventDefault();
  }

  onMount(() => {
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    ctx = canvas.getContext('2d')!;
    resizeCanvas();
    resetPositions();
    resetBall('player');

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('touchstart', preventGesture, { passive: false });
    canvas.addEventListener('touchmove', preventGesture, { passive: false });

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', preventGesture);
      canvas.removeEventListener('touchmove', preventGesture);
      cancelAnimationFrame(animationId);
    };
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
  });
</script>

<div class="game-container" class:touch-device={isTouchDevice}>
  <CloseButton {onClose} />

  <div class="game-header">
    <h1 class="title">🏐 Slime Volleyball</h1>
    <p class="subtitle">First to {WINNING_SCORE} wins!</p>
  </div>

  <div class="canvas-wrapper">
    <canvas bind:this={canvas}></canvas>

    {#if gameState === 'ready'}
      <div class="overlay">
        <div class="overlay-content">
          {#if isTouchDevice}
            <p class="instruction">Use the D-pad to move and jump</p>
          {:else}
            <p class="instruction">Arrow keys or WASD to move</p>
            <p class="instruction">UP or SPACE to jump</p>
          {/if}
          <button class="start-btn nes-btn is-success" onclick={startGame}>
            START
          </button>
        </div>
      </div>
    {:else if gameState === 'point'}
      <div class="overlay point-overlay">
        <div class="overlay-content">
          <h2>{pointMessage}</h2>
        </div>
      </div>
    {:else if gameState === 'gameover'}
      <div class="overlay" class:winner={winner === 'player'}>
        <div class="overlay-content">
          <h2>{winner === 'player' ? '🎉 YOU WIN!' : '😢 AI WINS'}</h2>
          <p class="final-score">{playerScore} - {aiScore}</p>
          <button class="start-btn nes-btn is-primary" onclick={startGame}>
            PLAY AGAIN
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if isTouchDevice}
    <div class="controls-container">
      <div class="dpad-horizontal">
        <button
          class="dpad-btn"
          ontouchstart={() => handleDpadDown('left')}
          ontouchend={() => handleDpadUp('left')}
          aria-label="Move left"
        >
          ◀
        </button>
        <button
          class="dpad-btn"
          ontouchstart={() => handleDpadDown('right')}
          ontouchend={() => handleDpadUp('right')}
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
      <button
        class="jump-btn"
        ontouchstart={() => handleDpadDown('up')}
        ontouchend={() => handleDpadUp('up')}
        aria-label="Jump"
      >
        JUMP
      </button>
    </div>
  {:else}
    <div class="controls-hint">
      <span>← → to move · ↑ or SPACE to jump · ESC to exit</span>
    </div>
  {/if}
</div>

<style>
  .game-container {
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
    overscroll-behavior: contain;
    user-select: none;
    -webkit-user-select: none;
  }

  .game-header {
    text-align: center;
    margin-bottom: 12px;
  }

  .title {
    font-size: 1.3rem;
    color: #fbbf24;
    margin: 0;
    text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
  }

  .subtitle {
    font-size: 0.5rem;
    color: #888;
    margin: 4px 0 0 0;
  }

  .canvas-wrapper {
    position: relative;
    border: 4px solid #fbbf24;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
  }

  canvas {
    display: block;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .point-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .overlay-content {
    text-align: center;
    color: #fff;
  }

  .overlay-content h2 {
    font-size: 1.3rem;
    margin: 0 0 12px 0;
    color: #fbbf24;
  }

  .overlay.winner .overlay-content h2 {
    color: #4ade80;
  }

  .instruction {
    font-size: 0.55rem;
    margin: 6px 0;
    color: #aaa;
  }

  .start-btn {
    margin: 12px 0 0 0;
    font-size: 0.65rem !important;
    padding: 6px 20px !important;
  }

  .final-score {
    font-size: 1.2rem;
    margin: 8px 0;
    color: #fff;
  }

  .controls-hint {
    margin-top: 12px;
    font-size: 0.45rem;
    color: #666;
  }

  /* Touch controls */
  .controls-container {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .dpad-horizontal {
    display: flex;
    gap: 8px;
  }

  .dpad-btn {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(145deg, #2a2a4a, #1a1a2e);
    color: #4ade80;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .dpad-btn:active {
    transform: scale(0.95);
    background: linear-gradient(145deg, #1a1a2e, #2a2a4a);
  }

  .jump-btn {
    width: 80px;
    height: 60px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(145deg, #4a2a2a, #2e1a1a);
    color: #fbbf24;
    font-size: 0.6rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .jump-btn:active {
    transform: scale(0.95);
    background: linear-gradient(145deg, #2e1a1a, #4a2a2a);
  }

  /* Touch device adjustments */
  .touch-device .game-header {
    margin-bottom: 8px;
  }

  .touch-device .title {
    font-size: 1.1rem;
  }

  @media (max-width: 500px) {
    .game-container {
      padding: 10px;
    }

    .title {
      font-size: 1rem;
    }

    .dpad-btn {
      width: 56px;
      height: 56px;
    }

    .jump-btn {
      width: 70px;
      height: 56px;
    }
  }
</style>
