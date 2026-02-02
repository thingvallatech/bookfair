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

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'behind-bopit' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Game constants
  const INITIAL_TIME = 2000;
  const TIME_DECREASE = 100;
  const MIN_TIME = 600;
  const FLICK_UNLOCK_SCORE = 15;
  const SPIN_UNLOCK_SCORE = 25;

  type Action = 'bop' | 'twist' | 'pull' | 'flick' | 'spin';

  interface ActionDef {
    label: string;
    color: string;
    glow: string;
    sound: string;
    volume: number;
  }

  const ACTIONS: Record<Action, ActionDef> = {
    bop: { label: 'BOP IT!', color: '#e53935', glow: 'rgba(229, 57, 53, 0.6)', sound: 'click', volume: 0.3 },
    twist: { label: 'TWIST IT!', color: '#fdd835', glow: 'rgba(253, 216, 53, 0.6)', sound: 'whoosh', volume: 0.3 },
    pull: { label: 'PULL IT!', color: '#1e88e5', glow: 'rgba(30, 136, 229, 0.6)', sound: 'pop', volume: 0.3 },
    flick: { label: 'FLICK IT!', color: '#43a047', glow: 'rgba(67, 160, 71, 0.6)', sound: 'coin', volume: 0.3 },
    spin: { label: 'SPIN IT!', color: '#ab47bc', glow: 'rgba(171, 71, 188, 0.6)', sound: 'whoosh', volume: 0.3 },
  };

  // Game state
  let gameState = $state<'idle' | 'playing' | 'gameover'>('idle');
  let score = $state(0);
  let highScore = $state(0);
  let currentAction = $state<Action | null>(null);
  let timeLimit = $state(INITIAL_TIME);
  let timeRemaining = $state(INITIAL_TIME);
  let lastCorrectAction = $state<Action | null>(null);
  let showFlash = $state(false);
  let flashColor = $state('');
  let isNewHighScore = $state(false);

  // Timers
  let commandTimeout: ReturnType<typeof setTimeout> | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let nextCommandTimeout: ReturnType<typeof setTimeout> | null = null;

  // Animation state
  let commandPulse = $state(false);
  let wobbleIdle = $state(true);

  // Derived
  let availableActions = $derived.by(() => {
    const actions: Action[] = ['bop', 'twist', 'pull'];
    if (score >= FLICK_UNLOCK_SCORE) actions.push('flick');
    if (score >= SPIN_UNLOCK_SCORE) actions.push('spin');
    return actions;
  });

  let timerPercent = $derived(
    currentAction ? (timeRemaining / timeLimit) * 100 : 100
  );

  let scoreMessage = $derived.by(() => {
    if (score >= 50) return 'LEGENDARY!';
    if (score >= 35) return 'UNSTOPPABLE!';
    if (score >= 25) return 'Bop It Master!';
    if (score >= 15) return 'On Fire!';
    if (score >= 10) return 'Not bad!';
    if (score >= 5) return 'Getting started...';
    return 'Keep trying!';
  });

  function loadHighScore() {
    try {
      const saved = localStorage.getItem('bopit-highscore');
      if (saved) highScore = parseInt(saved, 10);
    } catch {
      // ignore
    }
  }

  function saveHighScore() {
    try {
      localStorage.setItem('bopit-highscore', String(highScore));
    } catch {
      // ignore
    }
  }

  function startGame() {
    playSound('coin', 0.2);
    gameState = 'playing';
    score = 0;
    timeLimit = INITIAL_TIME;
    isNewHighScore = false;
    wobbleIdle = false;

    // Short delay before first command
    nextCommandTimeout = setTimeout(() => {
      issueCommand();
    }, 800);
  }

  function issueCommand() {
    // Pick random action, avoid repeating same one
    let next: Action;
    const pool = availableActions;
    do {
      next = pool[Math.floor(Math.random() * pool.length)];
    } while (next === currentAction && pool.length > 1);

    currentAction = next;
    timeRemaining = timeLimit;
    commandPulse = true;

    // Start countdown timer
    const tick = 16; // ~60fps
    timerInterval = setInterval(() => {
      timeRemaining = Math.max(0, timeRemaining - tick);
      if (timeRemaining <= 0) {
        // Timeout - game over
        clearTimers();
        gameOver();
      }
    }, tick);

    // Also set a hard timeout as backup
    commandTimeout = setTimeout(() => {
      clearTimers();
      gameOver();
    }, timeLimit + 50);
  }

  function handleAction(action: Action) {
    if (gameState !== 'playing' || !currentAction) return;

    if (action === currentAction) {
      // Correct
      clearTimers();
      const actionDef = ACTIONS[action];
      playSound(actionDef.sound as any, actionDef.volume);
      lastCorrectAction = action;
      score++;

      // Flash feedback
      flashColor = actionDef.color;
      showFlash = true;
      setTimeout(() => { showFlash = false; }, 200);

      // Milestone sounds
      if (score > 0 && score % 10 === 0) {
        playSound('powerup', 0.3);
      }

      // Increase difficulty
      timeLimit = Math.max(MIN_TIME, timeLimit - TIME_DECREASE);

      // Announce new actions
      if (score === FLICK_UNLOCK_SCORE || score === SPIN_UNLOCK_SCORE) {
        playSound('powerup', 0.3);
      }

      // Short delay then next command
      currentAction = null;
      commandPulse = false;
      nextCommandTimeout = setTimeout(() => {
        if (gameState === 'playing') {
          issueCommand();
        }
      }, 350);
    } else {
      // Wrong action
      clearTimers();
      gameOver();
    }
  }

  function gameOver() {
    playSound('error', 0.4);
    gameState = 'gameover';
    currentAction = null;
    commandPulse = false;
    wobbleIdle = true;

    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      saveHighScore();
      // Delayed victory sound
      setTimeout(() => playSound('victory', 0.4), 500);
    }
  }

  function clearTimers() {
    if (commandTimeout) { clearTimeout(commandTimeout); commandTimeout = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (nextCommandTimeout) { clearTimeout(nextCommandTimeout); nextCommandTimeout = null; }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (gameState !== 'playing' || !currentAction) return;

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'b':
        e.preventDefault();
        handleAction('bop');
        break;
      case 'arrowleft':
      case 't':
        e.preventDefault();
        handleAction('twist');
        break;
      case 'arrowright':
      case 'p':
        e.preventDefault();
        handleAction('pull');
        break;
      case 'arrowup':
      case 'f':
        e.preventDefault();
        handleAction('flick');
        break;
      case 'arrowdown':
      case 's':
        e.preventDefault();
        handleAction('spin');
        break;
    }
  }

  onMount(() => {
    loadHighScore();
    registerSpots('bopit', hidingSpots);
    const beanies = getBeaniesForArea('bopit');
    hiddenBeanie = beanies.get('behind-bopit') || null;

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  onDestroy(() => {
    clearTimers();
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="bopit-container">
  <CloseButton {onClose} />

  <!-- Command Display -->
  <div class="command-area">
    {#if gameState === 'idle'}
      <div class="title-text">BOP IT!</div>
      <div class="subtitle-text">The Classic Reaction Game</div>
    {:else if gameState === 'playing' && currentAction}
      <div
        class="command-text"
        class:pulse={commandPulse}
        style="color: {ACTIONS[currentAction].color}; text-shadow: 0 0 20px {ACTIONS[currentAction].glow}, 0 0 40px {ACTIONS[currentAction].glow};"
      >
        {ACTIONS[currentAction].label}
      </div>
    {:else if gameState === 'playing'}
      <div class="command-text ready-text">GET READY...</div>
    {:else if gameState === 'gameover'}
      <div class="gameover-title">GAME OVER</div>
    {/if}
  </div>

  <!-- Score Display -->
  <div class="score-bar">
    <div class="score-item">
      <span class="score-label">SCORE</span>
      <span class="score-value">{score}</span>
    </div>
    {#if highScore > 0}
      <div class="score-item">
        <span class="score-label">BEST</span>
        <span class="score-value hi">{highScore}</span>
      </div>
    {/if}
  </div>

  <!-- Timer Bar -->
  {#if gameState === 'playing' && currentAction}
    <div class="timer-bar-container">
      <div
        class="timer-bar"
        class:danger={timerPercent < 30}
        class:warning={timerPercent < 60 && timerPercent >= 30}
        style="width: {timerPercent}%;"
      ></div>
    </div>
  {/if}

  <!-- The Bop It Device -->
  <div class="device-wrapper" class:wobble={wobbleIdle}>
    <div class="device">
      <!-- Twist Zone (Left) -->
      <button
        class="action-zone twist-zone"
        class:active={currentAction === 'twist'}
        class:glow={currentAction === 'twist'}
        onclick={() => handleAction('twist')}
        disabled={gameState !== 'playing'}
        aria-label="Twist It"
      >
        <div class="zone-inner twist-inner">
          <div class="twist-knob">
            <div class="twist-grip"></div>
            <div class="twist-grip"></div>
            <div class="twist-grip"></div>
          </div>
          <span class="zone-label">TWIST</span>
        </div>
      </button>

      <!-- Center Body with Bop button -->
      <div class="device-body">
        <div class="device-top-ridge"></div>
        <div class="speaker-holes">
          {#each Array(5) as _}
            <div class="speaker-dot"></div>
          {/each}
        </div>

        <!-- Bop Zone -->
        <button
          class="action-zone bop-zone"
          class:active={currentAction === 'bop'}
          class:glow={currentAction === 'bop'}
          onclick={() => handleAction('bop')}
          disabled={gameState !== 'playing'}
          aria-label="Bop It"
        >
          <div class="bop-pad">
            <span class="bop-text">BOP!</span>
          </div>
        </button>

        <div class="device-logo">BOP IT</div>

        <!-- Extra Actions Row -->
        {#if score >= FLICK_UNLOCK_SCORE || gameState === 'gameover'}
          <div class="extra-actions">
            <button
              class="action-zone mini-zone flick-zone"
              class:active={currentAction === 'flick'}
              class:glow={currentAction === 'flick'}
              onclick={() => handleAction('flick')}
              disabled={gameState !== 'playing'}
              aria-label="Flick It"
            >
              <span class="mini-label">FLICK</span>
            </button>

            {#if score >= SPIN_UNLOCK_SCORE || gameState === 'gameover'}
              <button
                class="action-zone mini-zone spin-zone"
                class:active={currentAction === 'spin'}
                class:glow={currentAction === 'spin'}
                onclick={() => handleAction('spin')}
                disabled={gameState !== 'playing'}
                aria-label="Spin It"
              >
                <span class="mini-label">SPIN</span>
              </button>
            {/if}
          </div>
        {/if}

        <div class="device-bottom-ridge"></div>
      </div>

      <!-- Pull Zone (Right) -->
      <button
        class="action-zone pull-zone"
        class:active={currentAction === 'pull'}
        class:glow={currentAction === 'pull'}
        onclick={() => handleAction('pull')}
        disabled={gameState !== 'playing'}
        aria-label="Pull It"
      >
        <div class="zone-inner pull-inner">
          <div class="pull-handle">
            <div class="pull-grip"></div>
          </div>
          <span class="zone-label">PULL</span>
        </div>
      </button>
    </div>
  </div>

  <!-- Flash overlay on correct action -->
  {#if showFlash}
    <div class="flash-overlay" style="background: {flashColor};"></div>
  {/if}

  <!-- Start / Game Over overlay -->
  {#if gameState === 'idle'}
    <div class="overlay-panel">
      <button class="start-btn" onclick={startGame}>
        START GAME
      </button>
      <div class="instructions">
        <p><span class="key-hint">Space/B</span> = Bop &middot; <span class="key-hint">Left/T</span> = Twist &middot; <span class="key-hint">Right/P</span> = Pull</p>
        <p class="instructions-sub">Or just click/tap the zones!</p>
      </div>
    </div>
  {/if}

  {#if gameState === 'gameover'}
    <div class="overlay-panel gameover-panel">
      <div class="final-score">
        <div class="final-score-number">{score}</div>
        <div class="final-score-label">{scoreMessage}</div>
      </div>
      {#if isNewHighScore}
        <div class="new-highscore-badge">NEW HIGH SCORE!</div>
      {/if}
      {#if score >= FLICK_UNLOCK_SCORE}
        <div class="unlocks-note">
          Actions unlocked: {score >= SPIN_UNLOCK_SCORE ? 'Flick + Spin' : 'Flick'}
        </div>
      {/if}
      <button class="start-btn" onclick={startGame}>
        PLAY AGAIN
      </button>
    </div>
  {/if}

  <!-- Beanie hiding spot -->
  {#if hiddenBeanie}
    <div class="beanie-spot">
      <HidingBeanie beanie={hiddenBeanie} />
    </div>
  {/if}
</div>

<style>
  .bopit-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: 'Press Start 2P', monospace;
    user-select: none;
  }

  /* Command area */
  .command-area {
    position: absolute;
    top: 8%;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
    width: 90%;
  }

  .title-text {
    font-size: 2.2rem;
    color: #e53935;
    text-shadow: 0 0 20px rgba(229, 57, 53, 0.5), 3px 3px 0 #000;
    letter-spacing: 4px;
  }

  .subtitle-text {
    font-size: 0.55rem;
    color: #888;
    margin-top: 0.8rem;
    letter-spacing: 2px;
  }

  .command-text {
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 3px;
    animation: commandShake 0.1s ease-in-out infinite;
  }

  .command-text.pulse {
    animation: commandShake 0.1s ease-in-out infinite, commandPulse 0.4s ease-in-out infinite;
  }

  .ready-text {
    color: #aaa !important;
    text-shadow: none !important;
    font-size: 1.2rem;
    animation: none;
  }

  .gameover-title {
    font-size: 1.8rem;
    color: #e53935;
    text-shadow: 0 0 20px rgba(229, 57, 53, 0.5), 3px 3px 0 #000;
    animation: commandPulse 1s ease-in-out infinite;
  }

  @keyframes commandShake {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-2px, 1px); }
    50% { transform: translate(2px, -1px); }
    75% { transform: translate(-1px, -1px); }
  }

  @keyframes commandPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }

  /* Score bar */
  .score-bar {
    position: absolute;
    top: 22%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2rem;
    z-index: 10;
  }

  .score-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .score-label {
    font-size: 0.4rem;
    color: #666;
    letter-spacing: 2px;
  }

  .score-value {
    font-size: 1.2rem;
    color: #fff;
    text-shadow: 2px 2px 0 #000;
  }

  .score-value.hi {
    color: #fdd835;
  }

  /* Timer bar */
  .timer-bar-container {
    position: absolute;
    top: 32%;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    max-width: 300px;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    z-index: 10;
  }

  .timer-bar {
    height: 100%;
    background: #43a047;
    border-radius: 4px;
    transition: width 16ms linear, background-color 0.3s;
  }

  .timer-bar.warning {
    background: #fdd835;
  }

  .timer-bar.danger {
    background: #e53935;
    animation: timerFlash 0.3s ease-in-out infinite;
  }

  @keyframes timerFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* Device Wrapper */
  .device-wrapper {
    position: relative;
    z-index: 5;
    margin-top: 2rem;
  }

  .device-wrapper.wobble {
    animation: idleWobble 4s ease-in-out infinite;
  }

  @keyframes idleWobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(0.8deg); }
    75% { transform: rotate(-0.8deg); }
  }

  /* Device layout */
  .device {
    display: flex;
    align-items: center;
    gap: 0;
    position: relative;
  }

  /* Center body */
  .device-body {
    width: 180px;
    min-height: 280px;
    background: linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 30%, #b8b8b8 100%);
    border-radius: 30px;
    border: 4px solid #888;
    box-shadow:
      inset 0 2px 4px rgba(255, 255, 255, 0.4),
      inset 0 -4px 8px rgba(0, 0, 0, 0.2),
      0 8px 24px rgba(0, 0, 0, 0.5),
      0 2px 0 #666;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 12px;
    gap: 8px;
    position: relative;
    z-index: 2;
  }

  .device-top-ridge {
    width: 80%;
    height: 4px;
    background: linear-gradient(90deg, transparent, #999, transparent);
    border-radius: 2px;
  }

  .device-bottom-ridge {
    width: 80%;
    height: 4px;
    background: linear-gradient(90deg, transparent, #999, transparent);
    border-radius: 2px;
    margin-top: auto;
  }

  .speaker-holes {
    display: flex;
    gap: 6px;
    margin: 4px 0;
  }

  .speaker-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #888;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.4);
  }

  .device-logo {
    font-size: 0.5rem;
    color: #666;
    letter-spacing: 3px;
    margin: 4px 0;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  /* Action zones - shared styles */
  .action-zone {
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    outline: none;
  }

  .action-zone:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .action-zone:not(:disabled):active {
    transform: scale(0.92);
  }

  .action-zone.glow::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: inherit;
    animation: zoneGlow 0.5s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes zoneGlow {
    0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; opacity: 0.6; }
    50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; opacity: 1; }
  }

  /* Bop Zone (center button) */
  .bop-zone {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #ff6659, #e53935 60%, #b71c1c);
    box-shadow:
      0 6px 0 #b71c1c,
      0 8px 16px rgba(0, 0, 0, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
    color: #e53935;
  }

  .bop-zone:not(:disabled):hover {
    background: radial-gradient(circle at 40% 35%, #ff8a80, #ef5350 60%, #c62828);
  }

  .bop-zone:not(:disabled):active {
    box-shadow:
      0 2px 0 #b71c1c,
      0 3px 8px rgba(0, 0, 0, 0.4),
      inset 0 2px 4px rgba(0, 0, 0, 0.2);
    transform: translateY(4px) scale(0.96);
  }

  .bop-zone.active {
    animation: bopBounce 0.5s ease-in-out infinite;
  }

  @keyframes bopBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  .bop-pad {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .bop-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.65rem;
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  /* Twist Zone (left) */
  .twist-zone {
    width: 90px;
    height: 140px;
    background: linear-gradient(180deg, #fff176, #fdd835 40%, #f9a825);
    border-radius: 20px 8px 8px 20px;
    box-shadow:
      -3px 4px 0 #f57f17,
      -4px 6px 12px rgba(0, 0, 0, 0.4),
      inset 1px 2px 3px rgba(255, 255, 255, 0.4);
    margin-right: -10px;
    z-index: 1;
    color: #fdd835;
  }

  .twist-zone:not(:disabled):hover {
    background: linear-gradient(180deg, #fff59d, #ffee58 40%, #fdd835);
  }

  .twist-zone:not(:disabled):active {
    transform: rotate(-15deg) scale(0.95);
    box-shadow:
      -1px 2px 0 #f57f17,
      -2px 3px 8px rgba(0, 0, 0, 0.4);
  }

  .twist-zone.active {
    animation: twistWiggle 0.4s ease-in-out infinite;
  }

  @keyframes twistWiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-8deg); }
    75% { transform: rotate(8deg); }
  }

  .zone-inner {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .zone-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: rgba(0, 0, 0, 0.5);
    letter-spacing: 1px;
    pointer-events: none;
  }

  .twist-knob {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #fff9c4, #fbc02d);
    border: 3px solid #f57f17;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    pointer-events: none;
  }

  .twist-grip {
    width: 18px;
    height: 2px;
    background: #f57f17;
    border-radius: 1px;
  }

  /* Pull Zone (right) */
  .pull-zone {
    width: 90px;
    height: 140px;
    background: linear-gradient(180deg, #64b5f6, #1e88e5 40%, #1565c0);
    border-radius: 8px 20px 20px 8px;
    box-shadow:
      3px 4px 0 #0d47a1,
      4px 6px 12px rgba(0, 0, 0, 0.4),
      inset -1px 2px 3px rgba(255, 255, 255, 0.3);
    margin-left: -10px;
    z-index: 1;
    color: #1e88e5;
  }

  .pull-zone:not(:disabled):hover {
    background: linear-gradient(180deg, #90caf9, #42a5f5 40%, #1e88e5);
  }

  .pull-zone:not(:disabled):active {
    transform: translateY(8px) scale(0.95);
    box-shadow:
      1px 1px 0 #0d47a1,
      2px 2px 6px rgba(0, 0, 0, 0.4);
  }

  .pull-zone.active {
    animation: pullBob 0.4s ease-in-out infinite;
  }

  @keyframes pullBob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  .pull-handle {
    width: 30px;
    height: 50px;
    border-radius: 6px;
    background: linear-gradient(180deg, #bbdefb, #1e88e5);
    border: 3px solid #0d47a1;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .pull-grip {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #e3f2fd, #64b5f6);
    border: 2px solid #0d47a1;
  }

  /* Extra mini action zones */
  .extra-actions {
    display: flex;
    gap: 12px;
    margin: 4px 0;
  }

  .mini-zone {
    width: 54px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 3px 0 rgba(0, 0, 0, 0.3),
      0 4px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
  }

  .mini-zone:not(:disabled):active {
    transform: translateY(2px) scale(0.95);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .flick-zone {
    background: linear-gradient(180deg, #66bb6a, #43a047 50%, #2e7d32);
    color: #43a047;
  }

  .flick-zone.active {
    animation: flickShake 0.2s ease-in-out infinite;
  }

  @keyframes flickShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }

  .spin-zone {
    background: linear-gradient(180deg, #ce93d8, #ab47bc 50%, #7b1fa2);
    color: #ab47bc;
  }

  .spin-zone.active {
    animation: spinRotate 0.6s linear infinite;
  }

  @keyframes spinRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .mini-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.3rem;
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
    pointer-events: none;
    letter-spacing: 1px;
  }

  /* Flash overlay */
  .flash-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.15;
    pointer-events: none;
    z-index: 20;
    animation: flashFade 0.2s ease-out forwards;
  }

  @keyframes flashFade {
    0% { opacity: 0.25; }
    100% { opacity: 0; }
  }

  /* Overlays */
  .overlay-panel {
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    z-index: 15;
    width: 90%;
    max-width: 400px;
  }

  .gameover-panel {
    bottom: 6%;
  }

  .start-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.7rem;
    padding: 14px 32px;
    background: linear-gradient(180deg, #43a047, #2e7d32);
    color: #fff;
    border: 3px solid #1b5e20;
    border-radius: 8px;
    cursor: pointer;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
    box-shadow:
      0 4px 0 #1b5e20,
      0 6px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.15s ease;
    letter-spacing: 2px;
  }

  .start-btn:hover {
    background: linear-gradient(180deg, #4caf50, #388e3c);
    transform: translateY(-2px);
    box-shadow:
      0 6px 0 #1b5e20,
      0 8px 16px rgba(0, 0, 0, 0.5);
  }

  .start-btn:active {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 #1b5e20,
      0 2px 4px rgba(0, 0, 0, 0.4);
  }

  .instructions {
    text-align: center;
  }

  .instructions p {
    font-size: 0.35rem;
    color: #777;
    line-height: 1.8;
    margin: 0;
  }

  .instructions-sub {
    margin-top: 0.4rem !important;
    color: #555 !important;
  }

  .key-hint {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #555;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 0.3rem;
    color: #aaa;
  }

  /* Game Over panel */
  .final-score {
    text-align: center;
  }

  .final-score-number {
    font-size: 3rem;
    color: #fff;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 3px 3px 0 #000;
  }

  .final-score-label {
    font-size: 0.6rem;
    color: #fdd835;
    margin-top: 0.4rem;
    letter-spacing: 2px;
  }

  .new-highscore-badge {
    font-size: 0.5rem;
    color: #fdd835;
    text-shadow: 0 0 10px rgba(253, 216, 53, 0.6);
    animation: highscorePulse 0.8s ease-in-out infinite;
    letter-spacing: 2px;
  }

  @keyframes highscorePulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }

  .unlocks-note {
    font-size: 0.35rem;
    color: #888;
    text-align: center;
  }

  /* Beanie spot */
  .beanie-spot {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 2;
  }

  /* Responsive */
  @media (max-width: 500px) {
    .command-area {
      top: 5%;
    }

    .title-text {
      font-size: 1.5rem;
    }

    .command-text {
      font-size: 1.4rem;
    }

    .gameover-title {
      font-size: 1.3rem;
    }

    .score-bar {
      top: 17%;
    }

    .score-value {
      font-size: 0.9rem;
    }

    .timer-bar-container {
      top: 25%;
      width: 75%;
    }

    .device-body {
      width: 140px;
      min-height: 220px;
      padding: 12px 8px;
    }

    .bop-zone {
      width: 78px;
      height: 78px;
    }

    .twist-zone, .pull-zone {
      width: 70px;
      height: 110px;
    }

    .twist-knob {
      width: 32px;
      height: 32px;
    }

    .pull-handle {
      width: 24px;
      height: 40px;
    }

    .mini-zone {
      width: 44px;
      height: 30px;
    }

    .mini-label {
      font-size: 0.25rem;
    }

    .final-score-number {
      font-size: 2.2rem;
    }

    .start-btn {
      font-size: 0.55rem;
      padding: 12px 24px;
    }

    .instructions p {
      font-size: 0.3rem;
    }

    .overlay-panel {
      bottom: 4%;
    }
  }

  @media (max-height: 600px) {
    .command-area {
      top: 2%;
    }

    .score-bar {
      top: 14%;
    }

    .timer-bar-container {
      top: 22%;
    }

    .device-wrapper {
      margin-top: 0;
      transform: scale(0.85);
    }

    .overlay-panel {
      bottom: 2%;
      gap: 0.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .device-wrapper.wobble,
    .bop-zone.active,
    .twist-zone.active,
    .pull-zone.active,
    .flick-zone.active,
    .spin-zone.active,
    .command-text,
    .command-text.pulse,
    .new-highscore-badge,
    .gameover-title,
    .timer-bar.danger {
      animation: none;
    }
  }
</style>
