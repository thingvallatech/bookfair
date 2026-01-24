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

  // Hidden beanie behind device
  const hidingSpots: HidingSpot[] = [{ id: 'behind-device' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  interface Pet {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    age: number;
    stage: 'egg' | 'baby' | 'child' | 'teen' | 'adult';
    born: number;
    lastUpdate: number;
    isDead: boolean;
    poops: number;
    // New mechanics
    weight: number; // 1-10, affects evolution
    discipline: number; // 0-100, affects evolution
    isSick: boolean;
    sickCounter: number; // How long sick (dies if too long)
    careMistakes: number; // Tracks poor care for evolution
    evolutionPath: 'good' | 'neutral' | 'bad'; // Determined by care quality
  }

  const STORAGE_KEY = 'bookfair_tamagotchi';

  let pet = $state<Pet | null>(null);
  let showNaming = $state(false);
  let nameInput = $state('');
  let currentAction = $state<string | null>(null);
  let frame = $state(0);

  // Different sprites based on evolution path
  const stageSprites: Record<string, Record<string, string[]>> = {
    egg: { good: ['🥚', '🥚', '🥚', '💫'], neutral: ['🥚', '🥚', '🥚', '💫'], bad: ['🥚', '🥚', '🥚', '💫'] },
    baby: { good: ['🐣', '🐥'], neutral: ['🐣', '🐥'], bad: ['🐣', '🐥'] },
    child: { good: ['🐤', '🐦'], neutral: ['🐔', '🐓'], bad: ['🦃', '🐧'] },
    teen: { good: ['🦜', '🦚'], neutral: ['🦆', '🦢'], bad: ['🦤', '🐦‍⬛'] },
    adult: { good: ['🦅', '🦉'], neutral: ['🐓', '🦃'], bad: ['🦇', '🐦‍⬛'] },
    dead: { good: ['👻', '💀'], neutral: ['👻', '💀'], bad: ['👻', '💀'] },
  };

  const actionEmojis: Record<string, string> = {
    feed: '🍖',
    play: '⚽',
    sleep: '💤',
    clean: '🧹',
    medicine: '💊',
    discipline: '📢',
  };

  // Mini-game state
  let miniGame = $state<'none' | 'playing' | 'result'>('none');
  let miniGameTarget = $state(0);
  let miniGameGuess = $state(5);
  let miniGameResult = $state('');

  function loadPet() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        pet = JSON.parse(saved);
        updatePetState();
      }
    } catch (e) {
      console.error('Failed to load pet');
    }
  }

  function savePet() {
    if (pet) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    }
  }

  function createPet(name: string) {
    pet = {
      name: name || 'Tama',
      hunger: 100,
      happiness: 100,
      energy: 100,
      age: 0,
      stage: 'egg',
      born: Date.now(),
      lastUpdate: Date.now(),
      isDead: false,
      poops: 0,
      weight: 5,
      discipline: 50,
      isSick: false,
      sickCounter: 0,
      careMistakes: 0,
      evolutionPath: 'neutral',
    };
    showNaming = false;
    savePet();
  }

  function updatePetState() {
    if (!pet || pet.isDead) return;

    const now = Date.now();
    const elapsed = (now - pet.lastUpdate) / 1000; // seconds
    const hours = elapsed / 3600;

    // Decay stats over time
    pet.hunger = Math.max(0, pet.hunger - hours * 2);
    pet.happiness = Math.max(0, pet.happiness - hours * 1);
    pet.energy = Math.min(100, pet.energy + hours * 3);

    // Add poops over time (1 per 3 hours)
    const newPoops = Math.floor(hours / 3);
    if (newPoops > 0) {
      pet.poops = Math.min(5, pet.poops + newPoops);
    }

    // Track care mistakes
    if (pet.hunger < 20) pet.careMistakes++;
    if (pet.happiness < 20) pet.careMistakes++;
    if (pet.poops >= 4) pet.careMistakes++;

    // Random sickness chance (higher if stats are low or poops accumulated)
    if (!pet.isSick && hours > 0.1) {
      const sickChance = (pet.poops * 0.02) + ((100 - pet.hunger) * 0.001) + ((100 - pet.happiness) * 0.001);
      if (Math.random() < sickChance) {
        pet.isSick = true;
        pet.sickCounter = 0;
        playSound('sad');
      }
    }

    // Sickness progression
    if (pet.isSick) {
      pet.sickCounter += hours;
      pet.happiness = Math.max(0, pet.happiness - hours * 3);
      // Dies if sick too long without medicine (12 hours)
      if (pet.sickCounter > 12) {
        pet.isDead = true;
        playSound('sad');
      }
    }

    // Age up and determine evolution path
    const totalHours = (now - pet.born) / 3600000;
    const prevStage = pet.stage;

    if (totalHours < 0.5) pet.stage = 'egg';
    else if (totalHours < 2) pet.stage = 'baby';
    else if (totalHours < 8) pet.stage = 'child';
    else if (totalHours < 24) pet.stage = 'teen';
    else pet.stage = 'adult';

    // Calculate evolution path when evolving
    if (prevStage !== pet.stage && pet.stage !== 'egg') {
      if (pet.careMistakes <= 3 && pet.discipline >= 60) {
        pet.evolutionPath = 'good';
      } else if (pet.careMistakes >= 10 || pet.discipline <= 20) {
        pet.evolutionPath = 'bad';
      } else {
        pet.evolutionPath = 'neutral';
      }
      pet.careMistakes = 0; // Reset for next stage
    }

    pet.age = Math.floor(totalHours / 24);

    // Check death conditions
    if (pet.hunger <= 0 && pet.happiness <= 20) {
      pet.isDead = true;
      playSound('sad');
    } else if (pet.happiness <= 0 && pet.hunger <= 20) {
      pet.isDead = true;
      playSound('sad');
    }

    pet.lastUpdate = now;
    savePet();
  }

  function doAction(action: string) {
    if (!pet || pet.isDead) return;

    currentAction = action;
    setTimeout(() => currentAction = null, 1000);

    switch (action) {
      case 'feed':
        playSound('eat');
        pet.hunger = Math.min(100, pet.hunger + 30);
        pet.energy = Math.max(0, pet.energy - 5);
        // Overfeeding increases weight
        if (pet.hunger > 90) {
          pet.weight = Math.min(10, pet.weight + 1);
        }
        break;
      case 'play':
        // Start mini-game instead of instant happiness
        startMiniGame();
        return; // Don't save yet
      case 'sleep':
        playSound('ding', 0.3);
        pet.energy = Math.min(100, pet.energy + 40);
        break;
      case 'clean':
        playSound('whoosh', 0.4);
        pet.poops = 0;
        pet.happiness = Math.min(100, pet.happiness + 10);
        break;
      case 'medicine':
        if (pet.isSick) {
          playSound('ding', 0.5);
          pet.isSick = false;
          pet.sickCounter = 0;
          pet.happiness = Math.min(100, pet.happiness + 5);
        } else {
          // Giving medicine when not sick is bad
          playSound('error');
          pet.happiness = Math.max(0, pet.happiness - 5);
        }
        break;
      case 'discipline':
        playSound('click', 0.5);
        pet.discipline = Math.min(100, pet.discipline + 15);
        pet.happiness = Math.max(0, pet.happiness - 10);
        break;
    }

    pet.lastUpdate = Date.now();
    savePet();
  }

  function startMiniGame() {
    if (!pet) return;
    miniGame = 'playing';
    miniGameTarget = Math.floor(Math.random() * 10) + 1;
    miniGameGuess = 5;
    miniGameResult = '';
    playSound('click');
  }

  function submitGuess() {
    if (!pet || miniGame !== 'playing') return;

    const diff = Math.abs(miniGameGuess - miniGameTarget);

    if (diff === 0) {
      miniGameResult = '🎉 Perfect! +30 happiness!';
      pet.happiness = Math.min(100, pet.happiness + 30);
      pet.weight = Math.max(1, pet.weight - 1); // Exercise helps weight
      playSound('victory');
    } else if (diff <= 2) {
      miniGameResult = '👍 Close! +20 happiness!';
      pet.happiness = Math.min(100, pet.happiness + 20);
      playSound('happy');
    } else {
      miniGameResult = '😅 Try again! +10 happiness';
      pet.happiness = Math.min(100, pet.happiness + 10);
      playSound('pop');
    }

    pet.energy = Math.max(0, pet.energy - 15);
    pet.hunger = Math.max(0, pet.hunger - 10);
    miniGame = 'result';

    setTimeout(() => {
      miniGame = 'none';
      currentAction = null;
      savePet();
    }, 2000);
  }

  function resetPet() {
    localStorage.removeItem(STORAGE_KEY);
    pet = null;
  }

  function getStatColor(value: number): string {
    if (value > 60) return '#22c55e';
    if (value > 30) return '#eab308';
    return '#ef4444';
  }

  function getMood(): string {
    if (!pet) return '';
    if (pet.isDead) return 'Gone to a better place...';
    if (pet.isSick) return '🤒 Feeling sick! Give medicine!';
    if (pet.hunger < 10 || pet.happiness < 10) return '⚠️ CRITICAL! Need care NOW!';
    if (pet.hunger < 20) return '😰 So hungry...';
    if (pet.happiness < 20) return '😢 Very sad...';
    if (pet.energy < 20) return '😴 Exhausted...';
    if (pet.poops >= 4) return '🤢 It stinks in here!';
    if (pet.poops >= 2) return '💩 Needs cleaning...';
    if (pet.weight >= 8) return '🍔 Feeling heavy...';
    if (pet.discipline < 30) return '😈 Being naughty!';
    if (pet.hunger > 80 && pet.happiness > 80) return '😊 So happy!';
    if (pet.hunger > 60 && pet.happiness > 60) return '🙂 Doing great!';
    return '😐 Doing okay';
  }

  function getSprite(): string {
    if (!pet) return '🥚';
    if (pet.isDead) return stageSprites.dead[pet.evolutionPath][frame];
    if (pet.isSick) return '🤢';
    return stageSprites[pet.stage][pet.evolutionPath][frame];
  }

  let animationInterval: number;

  onMount(() => {
    // Register hiding spot
    registerSpots('tamagotchi', hidingSpots);
    const beanies = getBeaniesForArea('tamagotchi');
    hiddenBeanie = beanies.get('behind-device') || null;

    loadPet();

    // Animation loop
    animationInterval = setInterval(() => {
      frame = (frame + 1) % 2;
    }, 500);

    // Update stats periodically
    const updateInterval = setInterval(updatePetState, 10000);

    return () => {
      clearInterval(animationInterval);
      clearInterval(updateInterval);
    };
  });

  onDestroy(() => {
    if (animationInterval) clearInterval(animationInterval);
  });
</script>

<div class="tamagotchi">
  <CloseButton {onClose} variant="light" />

  <!-- Device with beanie peeking from behind -->
  <div class="device-wrapper">
    {#if hiddenBeanie}
      <HidingBeanie beanie={hiddenBeanie} class="tama-beanie" />
    {/if}
    <div class="device">
      <div class="device-top">
        <div class="device-loop"></div>
      </div>

    <div class="screen-frame">
      <div class="screen">
        {#if !pet && !showNaming}
          <!-- Start screen -->
          <div class="start-screen">
            <div class="pixel-art">🥚</div>
            <p>A new friend awaits!</p>
            <button class="pixel-btn" onclick={() => showNaming = true}>
              Hatch Egg
            </button>
          </div>

        {:else if showNaming}
          <!-- Naming screen -->
          <div class="naming-screen">
            <p>Name your pet:</p>
            <input
              type="text"
              bind:value={nameInput}
              maxlength="10"
              placeholder="Tama"
            />
            <button class="pixel-btn" onclick={() => createPet(nameInput)}>
              OK
            </button>
          </div>

        {:else if pet}
          <!-- Main pet screen -->
          <div class="pet-screen">
            {#if miniGame === 'playing'}
              <!-- Mini-game -->
              <div class="mini-game">
                <p>Guess the number!</p>
                <p class="mini-game-hint">(1-10)</p>
                <div class="guess-display">{miniGameGuess}</div>
                <div class="guess-controls">
                  <button onclick={() => miniGameGuess = Math.max(1, miniGameGuess - 1)}>◀</button>
                  <button onclick={submitGuess}>OK</button>
                  <button onclick={() => miniGameGuess = Math.min(10, miniGameGuess + 1)}>▶</button>
                </div>
              </div>
            {:else if miniGame === 'result'}
              <div class="mini-game-result">
                <p>{miniGameResult}</p>
                <p class="answer">It was {miniGameTarget}!</p>
              </div>
            {:else}
              <!-- Pet display -->
              <div class="pet-area">
                {#if currentAction}
                  <div class="action-emoji">{actionEmojis[currentAction]}</div>
                {/if}

                <div class="pet-sprite" class:dead={pet.isDead} class:sleeping={currentAction === 'sleep'} class:sick={pet.isSick}>
                  {getSprite()}
                </div>

                <!-- Poops -->
                <div class="poop-area">
                  {#each Array(pet.poops) as _}
                    <span class="poop">💩</span>
                  {/each}
                </div>
              </div>

              <!-- Info -->
              <div class="pet-info">
                <div class="pet-name">{pet.name}</div>
                <div class="pet-mood">{getMood()}</div>
                <div class="pet-age">Age: {pet.age}d • {pet.evolutionPath}</div>
              </div>

              <!-- Stats -->
              <div class="stats">
                <div class="stat">
                  <span class="stat-icon">🍖</span>
                  <div class="stat-bar">
                    <div class="stat-fill" style="width: {pet.hunger}%; background: {getStatColor(pet.hunger)}"></div>
                  </div>
                </div>
                <div class="stat">
                  <span class="stat-icon">💖</span>
                  <div class="stat-bar">
                    <div class="stat-fill" style="width: {pet.happiness}%; background: {getStatColor(pet.happiness)}"></div>
                  </div>
                </div>
                <div class="stat">
                  <span class="stat-icon">⚡</span>
                  <div class="stat-bar">
                    <div class="stat-fill" style="width: {pet.energy}%; background: {getStatColor(pet.energy)}"></div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- Buttons -->
    {#if pet && !pet.isDead && miniGame === 'none'}
      <div class="buttons">
        <button class="device-btn" onclick={() => doAction('feed')} title="Feed">
          🍖
        </button>
        <button class="device-btn" onclick={() => doAction('play')} title="Play">
          ⚽
        </button>
        <button class="device-btn" onclick={() => doAction('sleep')} title="Sleep">
          💤
        </button>
      </div>
      <div class="buttons">
        <button class="device-btn" onclick={() => doAction('clean')} title="Clean">
          🧹
        </button>
        <button class="device-btn" onclick={() => doAction('medicine')} title="Medicine" class:alert={pet.isSick}>
          💊
        </button>
        <button class="device-btn" onclick={() => doAction('discipline')} title="Discipline">
          📢
        </button>
      </div>
    {:else if pet?.isDead}
      <div class="buttons">
        <button class="device-btn wide" onclick={resetPet}>
          Try Again
        </button>
      </div>
    {/if}

    <div class="device-bottom"></div>
    </div>
  </div>
</div>

<style>
  .tamagotchi {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #fce7f3 0%, #ddd6fe 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    font-family: 'Press Start 2P', monospace;
  }


  .device-wrapper {
    position: relative;
  }

  .device {
    width: 220px;
    background: linear-gradient(180deg, #f472b6 0%, #db2777 100%);
    border-radius: 100px 100px 120px 120px;
    padding: 20px;
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.3),
      inset 0 2px 10px rgba(255, 255, 255, 0.3);
    position: relative;
    z-index: 10; /* Device in front of beanie */
  }

  /* Beanie peeking from behind device */
  :global(.tama-beanie) {
    bottom: 20px;
    right: -25px;
    z-index: 5;
  }

  :global(.tama-beanie.discovered) {
    z-index: 15 !important;
  }

  .device-top {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
  }

  .device-loop {
    width: 40px;
    height: 20px;
    background: #be185d;
    border-radius: 20px 20px 0 0;
    box-shadow: inset 0 -5px 10px rgba(0, 0, 0, 0.2);
  }

  .screen-frame {
    background: #1f2937;
    border-radius: 20px;
    padding: 8px;
    box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.5);
  }

  .screen {
    background: #a7f3d0;
    border-radius: 12px;
    width: 160px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    image-rendering: pixelated;
  }

  .start-screen, .naming-screen {
    text-align: center;
    padding: 10px;
  }

  .pixel-art {
    font-size: 40px;
    margin-bottom: 8px;
    animation: bounce 1s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  .start-screen p, .naming-screen p {
    font-size: 6px;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .naming-screen input {
    width: 80%;
    padding: 4px;
    font-family: inherit;
    font-size: 8px;
    border: 2px solid #1f2937;
    margin-bottom: 8px;
    text-align: center;
  }

  .pixel-btn {
    background: #1f2937;
    color: #a7f3d0;
    border: none;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 6px;
    cursor: pointer;
  }

  .pixel-btn:hover {
    background: #374151;
  }

  .pet-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
  }

  .pet-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .pet-sprite {
    font-size: 36px;
    animation: idle 1s ease-in-out infinite;
  }

  .pet-sprite.dead {
    animation: float 2s ease-in-out infinite;
    opacity: 0.7;
  }

  .pet-sprite.sleeping {
    animation: sleep 2s ease-in-out infinite;
  }

  @keyframes idle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }

  @keyframes sleep {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .action-emoji {
    position: absolute;
    top: 0;
    font-size: 20px;
    animation: pop 1s ease-out forwards;
  }

  @keyframes pop {
    0% { transform: scale(0); opacity: 1; }
    50% { transform: scale(1.5); opacity: 1; }
    100% { transform: scale(1) translateY(-20px); opacity: 0; }
  }

  .poop-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 2px;
  }

  .poop {
    font-size: 12px;
  }

  .pet-info {
    text-align: center;
    margin-bottom: 4px;
  }

  .pet-name {
    font-size: 8px;
    color: #1f2937;
    font-weight: bold;
  }

  .pet-mood {
    font-size: 5px;
    color: #4b5563;
  }

  .pet-age {
    font-size: 5px;
    color: #6b7280;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .stat-icon {
    font-size: 8px;
    width: 12px;
  }

  .stat-bar {
    flex: 1;
    height: 6px;
    background: #1f2937;
    border-radius: 2px;
    overflow: hidden;
  }

  .stat-fill {
    height: 100%;
    transition: width 0.3s;
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 15px;
  }

  .device-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%);
    border: 3px solid #92400e;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 0 #78350f;
    transition: all 0.1s;
  }

  .device-btn:active {
    box-shadow: 0 2px 0 #78350f;
    transform: translateY(2px);
  }

  .device-btn.wide {
    width: auto;
    border-radius: 20px;
    padding: 0 16px;
    font-size: 8px;
    font-family: inherit;
  }

  .device-bottom {
    height: 30px;
  }

  /* Mini-game styles */
  .mini-game, .mini-game-result {
    text-align: center;
    padding: 10px;
  }

  .mini-game p, .mini-game-result p {
    font-size: 6px;
    color: #1f2937;
    margin: 4px 0;
  }

  .mini-game-hint {
    font-size: 5px !important;
    color: #6b7280 !important;
  }

  .guess-display {
    font-size: 24px;
    font-weight: bold;
    color: #1f2937;
    margin: 8px 0;
  }

  .guess-controls {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .guess-controls button {
    width: 30px;
    height: 24px;
    background: #1f2937;
    color: #a7f3d0;
    border: none;
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
  }

  .mini-game-result .answer {
    font-size: 8px !important;
    color: #059669 !important;
    margin-top: 8px;
  }

  .pet-sprite.sick {
    animation: sick 0.5s ease-in-out infinite;
  }

  @keyframes sick {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }

  .device-btn.alert {
    animation: alertPulse 1s ease-in-out infinite;
  }

  @keyframes alertPulse {
    0%, 100% { box-shadow: 0 4px 0 #78350f; }
    50% { box-shadow: 0 4px 0 #78350f, 0 0 10px #ef4444; }
  }
</style>
