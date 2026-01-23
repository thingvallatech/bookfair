<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface Pog {
    id: number;
    name: string;
    design: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    color: string;
  }

  // Collection of 90s themed pogs
  const allPogs: Pog[] = [
    { id: 1, name: '8-Ball', design: '🎱', rarity: 'common', color: '#1a1a1a' },
    { id: 2, name: 'Alien', design: '👽', rarity: 'rare', color: '#4ade80' },
    { id: 3, name: 'Skull', design: '💀', rarity: 'epic', color: '#9333ea' },
    { id: 4, name: 'Fire', design: '🔥', rarity: 'common', color: '#f97316' },
    { id: 5, name: 'Lightning', design: '⚡', rarity: 'rare', color: '#facc15' },
    { id: 6, name: 'Yin Yang', design: '☯️', rarity: 'epic', color: '#64748b' },
    { id: 7, name: 'Dragon', design: '🐉', rarity: 'legendary', color: '#dc2626' },
    { id: 8, name: 'Poison', design: '☠️', rarity: 'rare', color: '#84cc16' },
    { id: 9, name: 'Peace', design: '✌️', rarity: 'common', color: '#ec4899' },
    { id: 10, name: 'Star', design: '⭐', rarity: 'common', color: '#eab308' },
    { id: 11, name: 'Moon', design: '🌙', rarity: 'rare', color: '#6366f1' },
    { id: 12, name: 'Sun', design: '☀️', rarity: 'common', color: '#f59e0b' },
    { id: 13, name: 'Dice', design: '🎲', rarity: 'common', color: '#ef4444' },
    { id: 14, name: 'Rocket', design: '🚀', rarity: 'epic', color: '#3b82f6' },
    { id: 15, name: 'UFO', design: '🛸', rarity: 'legendary', color: '#8b5cf6' },
    { id: 16, name: 'Ghost', design: '👻', rarity: 'rare', color: '#f8fafc' },
  ];

  let collection = $state<Pog[]>([...allPogs.slice(0, 6)]);
  let mode = $state<'collection' | 'game'>('collection');
  let selectedPog = $state<Pog | null>(null);

  // Game state
  let gameStack = $state<Pog[]>([]);
  let flippedPogs = $state<Pog[]>([]);
  let slamPower = $state(0);
  let isSlammed = $state(false);
  let gameMessage = $state('');

  const rarityColors: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#9333ea',
    legendary: '#f59e0b'
  };

  function startGame() {
    mode = 'game';
    // Create a random stack of pogs
    const shuffled = [...allPogs].sort(() => Math.random() - 0.5);
    gameStack = shuffled.slice(0, 8);
    flippedPogs = [];
    isSlammed = false;
    slamPower = 0;
    gameMessage = 'Hold SPACE or tap to charge your slammer!';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (mode !== 'game' || isSlammed) return;
    if (e.code === 'Space') {
      e.preventDefault();
      slamPower = Math.min(100, slamPower + 3);
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (mode !== 'game' || isSlammed) return;
    if (e.code === 'Space' && slamPower > 0) {
      executeSlam();
    }
  }

  function handleTouchStart() {
    if (mode !== 'game' || isSlammed) return;
    const interval = setInterval(() => {
      slamPower = Math.min(100, slamPower + 3);
    }, 50);

    const handleEnd = () => {
      clearInterval(interval);
      if (slamPower > 0) executeSlam();
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
    };

    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mouseup', handleEnd);
  }

  function executeSlam() {
    isSlammed = true;
    playSound('slam');

    // Calculate flipped pogs based on power
    const flipChance = slamPower / 100;
    const newFlipped: Pog[] = [];

    for (const pog of gameStack) {
      if (Math.random() < flipChance * 0.7) {
        newFlipped.push(pog);
      }
    }

    flippedPogs = newFlipped;

    // Add flipped pogs to collection
    for (const pog of newFlipped) {
      if (!collection.find(p => p.id === pog.id)) {
        collection = [...collection, pog];
      }
    }

    if (newFlipped.length === 0) {
      gameMessage = 'No pogs flipped! Try charging more power.';
    } else if (newFlipped.length === gameStack.length) {
      gameMessage = `PERFECT SLAM! You flipped all ${newFlipped.length} pogs!`;
    } else {
      gameMessage = `You flipped ${newFlipped.length} pogs! They're yours now.`;
    }
  }

  function resetGame() {
    isSlammed = false;
    slamPower = 0;
    const shuffled = [...allPogs].sort(() => Math.random() - 0.5);
    gameStack = shuffled.slice(0, 8);
    flippedPogs = [];
    gameMessage = 'Hold SPACE or tap to charge your slammer!';
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });
</script>

<div class="pog-tube">
  <CloseButton {onClose} />

  <header class="header">
    <h1>POG COLLECTION</h1>
    <div class="mode-tabs">
      <button
        class="tab"
        class:active={mode === 'collection'}
        onclick={() => mode = 'collection'}
      >My Pogs ({collection.length})</button>
      <button
        class="tab"
        class:active={mode === 'game'}
        onclick={startGame}
      >Play Slammer!</button>
    </div>
  </header>

  {#if mode === 'collection'}
    <div class="collection-view">
      <div class="pog-grid">
        {#each collection as pog}
          <button
            class="pog"
            style="--pog-color: {pog.color}; --rarity-color: {rarityColors[pog.rarity]}"
            onclick={() => selectedPog = selectedPog?.id === pog.id ? null : pog}
            class:selected={selectedPog?.id === pog.id}
          >
            <div class="pog-face">
              <span class="pog-design">{pog.design}</span>
            </div>
            <div class="pog-rarity"></div>
          </button>
        {/each}

        {#each Array(16 - collection.length) as _}
          <div class="pog empty">
            <div class="pog-face">
              <span class="pog-design">?</span>
            </div>
          </div>
        {/each}
      </div>

      {#if selectedPog}
        <div class="pog-details">
          <div class="detail-pog" style="--pog-color: {selectedPog.color}">
            <span>{selectedPog.design}</span>
          </div>
          <div class="detail-info">
            <h3>{selectedPog.name}</h3>
            <span class="rarity-badge" style="background: {rarityColors[selectedPog.rarity]}">
              {selectedPog.rarity.toUpperCase()}
            </span>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="game-view"
      onmousedown={handleTouchStart}
      ontouchstart={handleTouchStart}
    >
      <div class="game-arena">
        <!-- Pog Stack -->
        <div class="pog-stack" class:slammed={isSlammed}>
          {#each gameStack as pog, i}
            <div
              class="stacked-pog"
              class:flipped={flippedPogs.includes(pog)}
              style="
                --pog-color: {pog.color};
                --stack-offset: {i * 4}px;
                --flip-delay: {i * 0.1}s;
                --flip-x: {(Math.random() - 0.5) * 200}px;
                --flip-y: {(Math.random() - 0.5) * 100 - 50}px;
                --flip-rotation: {(Math.random() - 0.5) * 720}deg;
              "
            >
              <div class="pog-face">
                <span class="pog-design">{pog.design}</span>
              </div>
            </div>
          {/each}
        </div>

        <!-- Slammer -->
        <div class="slammer" class:charging={slamPower > 0 && !isSlammed} class:slammed={isSlammed}>
          <div class="slammer-face">💥</div>
        </div>

        <!-- Power meter -->
        <div class="power-meter">
          <div class="power-label">POWER</div>
          <div class="power-bar">
            <div class="power-fill" style="width: {slamPower}%"></div>
          </div>
        </div>
      </div>

      <p class="game-message">{gameMessage}</p>

      {#if isSlammed}
        <button class="play-again-btn" onclick={resetGame}>
          Slam Again!
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .pog-tube {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
    position: relative;
    display: flex;
    flex-direction: column;
    font-family: 'Press Start 2P', monospace;
    overflow: hidden;
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
  }

  .header {
    padding: 20px;
    text-align: center;
  }

  .header h1 {
    font-size: 1.2rem;
    color: #fbbf24;
    text-shadow: 3px 3px 0 #000;
    margin-bottom: 16px;
  }

  .mode-tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .tab {
    padding: 8px 16px;
    font-family: inherit;
    font-size: 0.6rem;
    background: #374151;
    border: 3px solid #1f2937;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #4b5563;
  }

  .tab.active {
    background: #fbbf24;
    color: #1f2937;
    border-color: #f59e0b;
  }

  /* Collection View */
  .collection-view {
    flex: 1;
    padding: 0 20px 20px;
    overflow-y: auto;
  }

  .pog-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    max-width: 500px;
    margin: 0 auto;
  }

  .pog {
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--pog-color, #333);
    border: 4px solid #1f2937;
    box-shadow:
      inset 0 -4px 8px rgba(0, 0, 0, 0.4),
      inset 0 4px 8px rgba(255, 255, 255, 0.2),
      0 4px 8px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
    padding: 0;
  }

  .pog:hover:not(.empty) {
    transform: translateY(-4px) scale(1.05);
    box-shadow:
      inset 0 -4px 8px rgba(0, 0, 0, 0.4),
      inset 0 4px 8px rgba(255, 255, 255, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.5);
  }

  .pog.selected {
    transform: scale(1.1);
    border-color: var(--rarity-color);
    box-shadow:
      0 0 20px var(--rarity-color),
      inset 0 -4px 8px rgba(0, 0, 0, 0.4);
  }

  .pog.empty {
    background: rgba(255, 255, 255, 0.1);
    border-style: dashed;
    cursor: default;
  }

  .pog-face {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .pog-design {
    font-size: 2rem;
  }

  .pog.empty .pog-design {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .pog-rarity {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rarity-color);
    box-shadow: 0 0 6px var(--rarity-color);
  }

  .pog-details {
    margin-top: 20px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .detail-pog {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--pog-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    border: 4px solid #1f2937;
    box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.4);
  }

  .detail-info h3 {
    color: white;
    font-size: 0.8rem;
    margin-bottom: 8px;
  }

  .rarity-badge {
    font-size: 0.5rem;
    padding: 4px 8px;
    border-radius: 4px;
    color: white;
  }

  /* Game View */
  .game-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    cursor: pointer;
    user-select: none;
  }

  .game-arena {
    position: relative;
    width: 300px;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pog-stack {
    position: relative;
    width: 100px;
    height: 100px;
  }

  .stacked-pog {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--pog-color);
    border: 3px solid #1f2937;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    bottom: var(--stack-offset);
    transition: all 0.5s ease-out;
    transition-delay: var(--flip-delay);
  }

  .stacked-pog .pog-face {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
  }

  .stacked-pog.flipped {
    transform: translate(var(--flip-x), var(--flip-y)) rotate(var(--flip-rotation));
    opacity: 0.8;
  }

  .slammer {
    position: absolute;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(145deg, #c0c0c0 0%, #808080 50%, #404040 100%);
    border: 4px solid #2f2f2f;
    box-shadow:
      inset 0 -4px 8px rgba(0, 0, 0, 0.5),
      0 8px 16px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    top: -60px;
    transition: all 0.1s;
  }

  .slammer.charging {
    animation: charge 0.1s infinite alternate;
  }

  .slammer.slammed {
    top: 20px;
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(255, 200, 0, 0.5);
  }

  @keyframes charge {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
  }

  .slammer-face {
    font-size: 2rem;
  }

  .power-meter {
    position: absolute;
    bottom: 0;
    width: 200px;
    text-align: center;
  }

  .power-label {
    font-size: 0.5rem;
    color: #fbbf24;
    margin-bottom: 4px;
  }

  .power-bar {
    height: 16px;
    background: #1f2937;
    border: 2px solid #374151;
    border-radius: 4px;
    overflow: hidden;
  }

  .power-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%);
    transition: width 0.05s;
  }

  .game-message {
    font-size: 0.6rem;
    color: #fbbf24;
    text-align: center;
    margin-top: 20px;
    min-height: 40px;
  }

  .play-again-btn {
    margin-top: 16px;
    padding: 12px 24px;
    font-family: inherit;
    font-size: 0.7rem;
    background: #fbbf24;
    color: #1f2937;
    border: 3px solid #f59e0b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .play-again-btn:hover {
    background: #f59e0b;
    transform: scale(1.05);
  }

  @media (max-width: 500px) {
    .pog-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .pog-design {
      font-size: 1.5rem;
    }
  }
</style>
