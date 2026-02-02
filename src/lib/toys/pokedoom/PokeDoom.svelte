<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Game, type GamePhase, type GameState, type CatchAttempt } from './game.js';
  import { getSpriteUrl } from './pokemon.js';
  import { playSound } from '$lib/stores/audio';

  // ---------- Game state (reactive) ----------

  let canvas: HTMLCanvasElement;
  let game: Game;

  let phase = $state<GamePhase>('loading');
  let pokeballs = $state(0);
  let caught = $state<{ name: string; id: number }[]>([]);
  let totalPokemon = $state(0);
  let interrupt = $state<string | null>(null);
  let catchAttempt = $state<CatchAttempt | null>(null);

  // Loading bar animation
  let loadProgress = $state(0);
  let loadInterval: ReturnType<typeof setInterval>;

  // Game keys that should be captured
  const GAME_KEYS = new Set([
    'w', 'a', 's', 'd',
    'W', 'A', 'S', 'D',
    'q', 'e', 'Q', 'E',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ' ', 'Escape',
  ]);

  // ---------- Loading tips ----------

  const TIPS = [
    'Tip: Use WASD to move, Q/E to turn.',
    'Tip: Aim your crosshair at a Pokemon and press SPACE.',
    'Tip: Rare Pokemon have lower catch rates!',
    'Tip: You have limited Pokeballs. Use them wisely.',
    'Tip: Watch out for BadOS popups!',
    'Tip: Closer throws have better accuracy.',
  ];
  const loadingTip = TIPS[Math.floor(Math.random() * TIPS.length)];

  // ---------- State change handler ----------

  function onStateChange(state: GameState) {
    const oldPhase = phase;
    const oldCatch = catchAttempt;

    phase = state.phase;
    pokeballs = state.pokeballs;
    caught = state.caught.map(p => ({ name: p.name, id: p.id }));
    totalPokemon = state.totalPokemon;
    interrupt = state.interrupt;
    catchAttempt = state.catchAttempt;

    // Sound effects based on state transitions
    if (oldPhase === 'title' && state.phase === 'playing') {
      playSound('powerup', 0.5);
    }

    if (oldPhase === 'playing' && state.phase === 'catching') {
      playSound('whoosh', 0.5);
    }

    // Catch resolution: catch attempt just finished, back to playing
    if (oldCatch && oldCatch.timer > 0 && state.phase === 'playing' && !state.catchAttempt) {
      if (oldCatch.caught) {
        playSound('success', 0.5);
        playSound('coin', 0.3);
      } else {
        playSound('error', 0.4);
      }
    }
  }

  // ---------- Keyboard handling ----------

  function handleKeydown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    // Dismiss interrupt with Escape or Space
    if (interrupt && (e.key === 'Escape' || e.key === ' ')) {
      game.dismissInterrupt();
      playSound('click', 0.3);
      return;
    }

    // Start game from title
    if (phase === 'title' && e.key === ' ') {
      game.startGame();
      return;
    }

    // Throw ball during playing phase
    if (phase === 'playing' && e.key === ' ') {
      const hit = game.throwBall();
      if (!hit) {
        playSound('whoosh', 0.3);
      }
      return;
    }

    game.handleKeyDown(e.key);
  }

  function handleKeyup(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    game.handleKeyUp(e.key);
  }

  // ---------- Lifecycle ----------

  onMount(async () => {
    game = new Game();
    game.setStateChangeCallback(onStateChange);

    // Start fake loading bar
    loadInterval = setInterval(() => {
      if (loadProgress < 90) {
        loadProgress += Math.random() * 15;
        if (loadProgress > 90) loadProgress = 90;
      }
    }, 200);

    await game.init(canvas);

    // Finish loading bar
    loadProgress = 100;
    clearInterval(loadInterval);
  });

  onDestroy(() => {
    if (game) game.destroy();
    if (loadInterval) clearInterval(loadInterval);
  });

  // ---------- Derived ----------

  let isPlaying = $derived(phase === 'playing');
  let showHud = $derived(phase === 'playing' || phase === 'catching');
  let allCaught = $derived(caught.length === totalPokemon && totalPokemon > 0);
  let catchWobblePhase = $derived(
    catchAttempt
      ? catchAttempt.timer > 30
        ? 'wobbling'
        : catchAttempt.caught
          ? 'caught'
          : 'fled'
      : null
  );
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="pokedoom-container">
  <canvas
    bind:this={canvas}
    width={480}
    height={320}
    class="game-canvas"
  ></canvas>

  <!-- ========== LOADING SCREEN ========== -->
  {#if phase === 'loading'}
    <div class="overlay loading-overlay">
      <div class="loading-content">
        <div class="loading-text">Loading PokeDOOM.exe...</div>
        <div class="loading-bar-track">
          <div
            class="loading-bar-fill"
            style="width: {loadProgress}%"
          ></div>
        </div>
        <div class="loading-tip">{loadingTip}</div>
      </div>
    </div>
  {/if}

  <!-- ========== TITLE SCREEN ========== -->
  {#if phase === 'title'}
    <div class="overlay title-overlay">
      <div class="title-content">
        <div class="title-logo">
          <span class="title-poke">Poke</span><span class="title-doom">DOOM</span>
        </div>
        <div class="title-subtitle">Gotta Frag 'Em All</div>
        <div class="title-prompt">Press SPACE to start</div>
        <div class="title-controls">
          <div>WASD / Arrows - Move</div>
          <div>Q / E - Turn</div>
          <div>SPACE - Throw Pokeball</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========== HUD OVERLAY ========== -->
  {#if showHud}
    <div class="overlay hud-overlay">
      <!-- Pokeball count -->
      <div class="hud-pokeballs">
        <span class="pokeball-icon"></span>
        <span class="pokeball-count">{pokeballs}</span>
      </div>

      <!-- Caught counter -->
      <div class="hud-caught-count">
        Caught: {caught.length}/{totalPokemon}
      </div>

      <!-- Crosshair -->
      {#if isPlaying && !interrupt}
        <div class="hud-crosshair">+</div>
      {/if}

      <!-- Caught Pokemon strip -->
      {#if caught.length > 0}
        <div class="hud-caught-strip">
          {#each caught as pokemon (pokemon.id + '-' + caught.indexOf(pokemon))}
            <img
              class="caught-sprite"
              src={getSpriteUrl(pokemon.id)}
              alt={pokemon.name}
              width="32"
              height="32"
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ========== CATCH ANIMATION ========== -->
  {#if catchAttempt}
    <div class="overlay catch-overlay">
      {#if catchWobblePhase === 'wobbling'}
        <div class="catch-animation">
          <div class="catch-ball wobble">&#x25CF;</div>
          <div class="catch-dots">...</div>
        </div>
      {:else if catchWobblePhase === 'caught'}
        <div class="catch-animation">
          <div class="catch-result caught-text">Caught {catchAttempt.pokemon.name}!</div>
        </div>
      {:else if catchWobblePhase === 'fled'}
        <div class="catch-animation">
          <div class="catch-result fled-text">{catchAttempt.pokemon.name} broke free!</div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ========== BADOS INTERRUPT DIALOG ========== -->
  {#if interrupt}
    <div class="overlay interrupt-overlay">
      <div class="xp-error-dialog">
        <div class="xp-error-titlebar">
          <span class="xp-error-title">PokeDOOM Error</span>
          <button
            class="xp-error-close"
            onclick={() => { game.dismissInterrupt(); playSound('click', 0.3); }}
            aria-label="Close"
          >&times;</button>
        </div>
        <div class="xp-error-body">
          <div class="xp-error-content">
            <span class="xp-error-icon">&#x26A0;</span>
            <span class="xp-error-message">{interrupt}</span>
          </div>
          <div class="xp-error-buttons">
            <button
              class="xp-error-ok"
              onclick={() => { game.dismissInterrupt(); playSound('click', 0.3); }}
            >OK</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========== RESULT SCREEN ========== -->
  {#if phase === 'result'}
    <div class="overlay result-overlay">
      <div class="result-content">
        <div class="result-title" class:victory={allCaught}>
          {allCaught ? 'VICTORY!' : 'GAME OVER'}
        </div>
        <div class="result-stats">
          Caught {caught.length} of {totalPokemon} Pokemon
        </div>

        {#if caught.length > 0}
          <div class="result-grid">
            {#each caught as pokemon (pokemon.id + '-' + caught.indexOf(pokemon))}
              <div class="result-pokemon">
                <img
                  src={getSpriteUrl(pokemon.id)}
                  alt={pokemon.name}
                  width="48"
                  height="48"
                  class="result-sprite"
                />
                <span class="result-name">{pokemon.name}</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="result-empty">No Pokemon caught. Better luck next time!</div>
        {/if}

        <button
          class="result-btn"
          onclick={() => { game.restart(); playSound('powerup', 0.5); }}
        >Play Again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ========== Container ========== */
  .pokedoom-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }

  .game-canvas {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  /* ========== Overlays (shared) ========== */
  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* ========== LOADING SCREEN ========== */
  .loading-overlay {
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    z-index: 50;
  }

  .loading-content {
    text-align: center;
    padding: 20px;
  }

  .loading-text {
    color: #33ff33;
    font-size: 16px;
    margin-bottom: 16px;
    font-family: 'Courier New', monospace;
  }

  .loading-bar-track {
    width: 280px;
    height: 20px;
    background: #111;
    border: 2px solid #33ff33;
    margin: 0 auto 16px;
  }

  .loading-bar-fill {
    height: 100%;
    background: #33ff33;
    transition: width 0.2s ease-out;
  }

  .loading-tip {
    color: #669966;
    font-size: 11px;
    font-family: 'Courier New', monospace;
  }

  /* ========== TITLE SCREEN ========== */
  .title-overlay {
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    z-index: 40;
  }

  .title-content {
    text-align: center;
  }

  .title-logo {
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 8px;
    letter-spacing: 2px;
    font-family: 'Courier New', monospace;
  }

  .title-poke {
    color: #ffcb05;
    text-shadow:
      2px 2px 0 #b8860b,
      -1px -1px 0 #b8860b;
  }

  .title-doom {
    color: #cc0000;
    text-shadow:
      2px 2px 0 #660000,
      -1px -1px 0 #660000;
  }

  .title-subtitle {
    color: #aaa;
    font-size: 14px;
    margin-bottom: 32px;
    font-family: 'Courier New', monospace;
    font-style: italic;
  }

  .title-prompt {
    color: #fff;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    animation: blink 1s step-end infinite;
    margin-bottom: 24px;
  }

  .title-controls {
    color: #666;
    font-size: 11px;
    line-height: 1.8;
    font-family: 'Courier New', monospace;
  }

  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  /* ========== HUD OVERLAY ========== */
  .hud-overlay {
    z-index: 20;
  }

  .hud-pokeballs {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #fff;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    text-shadow: 1px 1px 2px #000, -1px -1px 2px #000;
  }

  .pokeball-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(
      180deg,
      #ff0000 0%,
      #ff0000 45%,
      #333 45%,
      #333 55%,
      #fff 55%,
      #fff 100%
    );
    border: 2px solid #333;
    flex-shrink: 0;
  }

  .pokeball-count {
    font-weight: bold;
  }

  .hud-caught-count {
    position: absolute;
    top: 8px;
    right: 8px;
    color: #fff;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    text-shadow: 1px 1px 2px #000, -1px -1px 2px #000;
  }

  .hud-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 24px;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 4px #000, 0 0 2px #000;
    opacity: 0.9;
  }

  .hud-caught-strip {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
    max-width: 90%;
    overflow-x: auto;
  }

  .caught-sprite {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  /* ========== CATCH ANIMATION ========== */
  .catch-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 25;
  }

  .catch-animation {
    text-align: center;
  }

  .catch-ball {
    font-size: 48px;
    color: #ff0000;
    text-shadow: 0 0 8px rgba(255, 0, 0, 0.5);
  }

  .catch-ball.wobble {
    animation: wobble 0.4s ease-in-out infinite;
  }

  .catch-dots {
    color: #fff;
    font-size: 24px;
    font-family: 'Courier New', monospace;
    animation: blink 0.6s step-end infinite;
  }

  .catch-result {
    font-size: 20px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    text-shadow: 2px 2px 4px #000;
  }

  .caught-text {
    color: #33ff33;
  }

  .fled-text {
    color: #ff4444;
  }

  @keyframes wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
  }

  /* ========== BADOS INTERRUPT DIALOG ========== */
  .interrupt-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    z-index: 30;
    background: rgba(0, 0, 0, 0.3);
  }

  .xp-error-dialog {
    width: 380px;
    max-width: 90%;
    border-radius: 8px 8px 0 0;
    border: 1px solid #0054e3;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }

  .xp-error-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    padding: 0 4px 0 8px;
    background: linear-gradient(
      180deg,
      #0058e6 0%,
      #1a6ff5 20%,
      #3a8cf4 50%,
      #1a6ff5 80%,
      #0058e6 100%
    );
    border-radius: 8px 8px 0 0;
  }

  .xp-error-title {
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .xp-error-close {
    width: 21px;
    height: 21px;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: white;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    background: linear-gradient(
      180deg,
      #e08a8a 0%,
      #e36868 25%,
      #d45050 50%,
      #c75050 75%,
      #b84545 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15),
      inset 1px 0 0 rgba(255, 255, 255, 0.2),
      inset -1px 0 0 rgba(0, 0, 0, 0.1);
  }

  .xp-error-close:hover {
    background: linear-gradient(
      180deg,
      #eca0a0 0%,
      #f07878 25%,
      #e86060 50%,
      #d85858 75%,
      #c84e4e 100%
    );
  }

  .xp-error-body {
    background: #ece9d8;
    padding: 16px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .xp-error-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .xp-error-icon {
    font-size: 32px;
    line-height: 1;
    flex-shrink: 0;
    color: #daa520;
  }

  .xp-error-message {
    font-size: 12px;
    color: #000;
    line-height: 1.4;
  }

  .xp-error-buttons {
    display: flex;
    justify-content: center;
  }

  .xp-error-ok {
    min-width: 75px;
    height: 23px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(
      180deg,
      #fff 0%,
      #ecebe5 100%
    );
    font-size: 11px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    cursor: pointer;
    color: #000;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .xp-error-ok:hover {
    background: linear-gradient(
      180deg,
      #fff 0%,
      #ddd 100%
    );
  }

  .xp-error-ok:active {
    background: linear-gradient(
      180deg,
      #ddd 0%,
      #ccc 100%
    );
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* ========== RESULT SCREEN ========== */
  .result-overlay {
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    z-index: 40;
  }

  .result-content {
    text-align: center;
    padding: 16px;
    max-height: 100%;
    overflow-y: auto;
  }

  .result-title {
    font-size: 32px;
    font-weight: bold;
    color: #ff4444;
    font-family: 'Courier New', monospace;
    text-shadow: 2px 2px 0 #660000;
    margin-bottom: 8px;
  }

  .result-title.victory {
    color: #ffcb05;
    text-shadow: 2px 2px 0 #b8860b;
  }

  .result-stats {
    color: #ccc;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    margin-bottom: 16px;
  }

  .result-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .result-pokemon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .result-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }

  .result-name {
    color: #aaa;
    font-size: 9px;
    font-family: 'Courier New', monospace;
  }

  .result-empty {
    color: #666;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    margin-bottom: 16px;
    font-style: italic;
  }

  .result-btn {
    background: #cc0000;
    color: #fff;
    border: 2px solid #ff4444;
    padding: 8px 24px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .result-btn:hover {
    background: #ee0000;
    border-color: #ff6666;
  }

  .result-btn:active {
    background: #aa0000;
    transform: translateY(1px);
  }
</style>
