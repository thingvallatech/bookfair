<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  interface Category {
    name: string;
    options: string[];
    defaults: string[];
  }

  const DEFAULT_CATEGORIES: Category[] = [
    {
      name: 'Live in a...',
      options: ['Mansion', 'Apartment', 'Shack', 'House'],
      defaults: ['Mansion', 'Apartment', 'Shack', 'House']
    },
    {
      name: 'Marry',
      options: ['JTT', 'Devon Sawa', 'Leo DiCaprio', 'Your crush'],
      defaults: ['JTT', 'Devon Sawa', 'Leo DiCaprio', 'Your crush']
    },
    {
      name: 'Drive a',
      options: ['Lamborghini', 'Geo Metro', 'VW Bug', 'Minivan'],
      defaults: ['Lamborghini', 'Geo Metro', 'VW Bug', 'Minivan']
    },
    {
      name: 'Work as a',
      options: ['Veterinarian', 'Movie Star', 'Teacher', 'Garbage Collector'],
      defaults: ['Veterinarian', 'Movie Star', 'Teacher', 'Garbage Collector']
    },
    {
      name: 'Have kids',
      options: ['0', '2', '7', '15'],
      defaults: ['0', '2', '7', '15']
    },
    {
      name: 'Live in',
      options: ['Hollywood', 'Paris', 'Your hometown', 'The Moon'],
      defaults: ['Hollywood', 'Paris', 'Your hometown', 'The Moon']
    },
  ];

  let { onClose }: Props = $props();

  // Game state
  let categories = $state<Category[]>(
    DEFAULT_CATEGORIES.map(c => ({ ...c, options: [...c.options] }))
  );

  // Track which options are eliminated (categoryIndex -> Set of optionIndices)
  let eliminated = $state<Map<number, Set<number>>>(new Map());

  // Final results (categoryIndex -> winning optionIndex)
  let results = $state<Map<number, number>>(new Map());

  // Magic number from spiral
  let magicNumber = $state(0);

  // Which option is being edited (null = none)
  let editingCell = $state<{ cat: number; opt: number } | null>(null);
  let editValue = $state('');

  // Elimination animation state
  let currentHighlight = $state<{ cat: number; opt: number } | null>(null);
  let eliminationSpeed = $state(300); // ms between steps

  function startEditing(catIndex: number, optIndex: number) {
    editingCell = { cat: catIndex, opt: optIndex };
    editValue = categories[catIndex].options[optIndex];
    playSound('click', 0.2);
  }

  function saveEdit() {
    if (editingCell && editValue.trim()) {
      categories[editingCell.cat].options[editingCell.opt] = editValue.trim();
    }
    editingCell = null;
    editValue = '';
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      editingCell = null;
      editValue = '';
    }
  }

  function resetCategories() {
    categories = DEFAULT_CATEGORIES.map(c => ({ ...c, options: [...c.options] }));
    playSound('pop', 0.3);
  }

  function startGame() {
    eliminated = new Map();
    results = new Map();
    phase = 'spiral';
    playSound('whoosh', 0.3);
  }

  // Spiral animation
  let spiralProgress = $state(0);
  let spiralLoops = $state(0);
  let isDrawingSpiral = $state(false);

  function drawSpiral() {
    isDrawingSpiral = true;
    spiralProgress = 0;
    spiralLoops = 0;

    // Random number of loops (3-10)
    const targetLoops = Math.floor(Math.random() * 8) + 3;
    magicNumber = targetLoops;

    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      spiralProgress = progress;
      spiralLoops = Math.floor(progress * targetLoops);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isDrawingSpiral = false;
        playSound('ding', 0.5);
        // Short delay then start elimination
        setTimeout(() => {
          phase = 'elimination';
          startElimination();
        }, 800);
      }
    }

    playSound('draw', 0.3);
    requestAnimationFrame(animate);
  }

  function generateSpiralPath(progress: number): string {
    if (progress === 0) return '';

    const centerX = 100;
    const centerY = 100;
    const maxRadius = 80;
    const totalRotations = magicNumber || 5;
    const points: string[] = [];

    const steps = Math.floor(progress * totalRotations * 50);

    for (let i = 0; i <= steps; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const radius = (i / (totalRotations * 50)) * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }

    return points.join(' ');
  }

  function startElimination() {
    // Initialize eliminated sets for each category
    eliminated = new Map();
    for (let i = 0; i < categories.length; i++) {
      eliminated.set(i, new Set());
    }
    results = new Map();

    runEliminationStep(0, 0, 1);
  }

  function getNextPosition(catIndex: number, optIndex: number): { cat: number; opt: number } | null {
    // Find next non-eliminated option
    let cat = catIndex;
    let opt = optIndex;

    // Try to find next valid position
    for (let attempts = 0; attempts < categories.length * 4 + 1; attempts++) {
      opt++;
      if (opt >= 4) {
        opt = 0;
        cat++;
        if (cat >= categories.length) {
          cat = 0;
        }
      }

      // Check if this category still has options to eliminate
      const catEliminated = eliminated.get(cat) || new Set();
      if (catEliminated.size < 3 && !catEliminated.has(opt)) {
        return { cat, opt };
      }
    }

    return null;
  }

  function countRemainingOptions(): number {
    let count = 0;
    for (let i = 0; i < categories.length; i++) {
      const catEliminated = eliminated.get(i) || new Set();
      count += 4 - catEliminated.size;
    }
    return count;
  }

  function runEliminationStep(catIndex: number, optIndex: number, count: number) {
    // Check if elimination is complete (each category has exactly 1 remaining)
    let allDone = true;
    for (let i = 0; i < categories.length; i++) {
      const catEliminated = eliminated.get(i) || new Set();
      if (catEliminated.size < 3) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      // Find winners for each category
      for (let i = 0; i < categories.length; i++) {
        const catEliminated = eliminated.get(i) || new Set();
        for (let j = 0; j < 4; j++) {
          if (!catEliminated.has(j)) {
            results.set(i, j);
            break;
          }
        }
      }
      currentHighlight = null;
      playSound('victory', 0.5);
      setTimeout(() => {
        phase = 'result';
      }, 500);
      return;
    }

    // Highlight current position
    currentHighlight = { cat: catIndex, opt: optIndex };

    // Check if we should eliminate this option
    const catEliminated = eliminated.get(catIndex) || new Set();
    const isEliminated = catEliminated.has(optIndex);
    const categoryFull = catEliminated.size >= 3;

    if (count === magicNumber && !isEliminated && !categoryFull) {
      // Eliminate this option
      setTimeout(() => {
        playSound('hit', 0.3);
        catEliminated.add(optIndex);
        eliminated.set(catIndex, catEliminated);
        eliminated = new Map(eliminated); // Trigger reactivity

        // Speed up as we progress
        eliminationSpeed = Math.max(100, eliminationSpeed - 10);

        // Find next position and continue
        const next = getNextPosition(catIndex, optIndex);
        if (next) {
          setTimeout(() => runEliminationStep(next.cat, next.opt, 1), eliminationSpeed);
        } else {
          // Shouldn't happen, but just in case
          runEliminationStep(catIndex, optIndex, 1);
        }
      }, eliminationSpeed);
    } else {
      // Move to next position
      setTimeout(() => {
        playSound('click', 0.1);
        const next = getNextPosition(catIndex, optIndex);
        if (next) {
          runEliminationStep(next.cat, next.opt, isEliminated || categoryFull ? count : count + 1);
        }
      }, eliminationSpeed / 2);
    }
  }

  function getResultText(): string {
    const home = categories[0].options[results.get(0) || 0];
    const spouse = categories[1].options[results.get(1) || 0];
    const car = categories[2].options[results.get(2) || 0];
    const job = categories[3].options[results.get(3) || 0];
    const kids = categories[4].options[results.get(4) || 0];
    const location = categories[5].options[results.get(5) || 0];

    return `You will live in a ${home} in ${location}, married to ${spouse}. You'll drive a ${car}, work as a ${job}, and have ${kids} kids!`;
  }

  function playAgain() {
    phase = 'setup';
    eliminated = new Map();
    results = new Map();
    spiralProgress = 0;
    eliminationSpeed = 300;
    playSound('pop', 0.3);
  }

  // Game phases
  type Phase = 'setup' | 'spiral' | 'elimination' | 'result';
  let phase = $state<Phase>('setup');

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'paper-corner' }];
  let beanie = $state<Beanie | null>(null);

  onMount(() => {
    registerSpots('mash', hidingSpots);
    const beanies = getBeaniesForArea('mash');
    beanie = beanies.get('paper-corner') || null;
  });
</script>

<div class="mash-container">
  <CloseButton {onClose} variant="dark" />

  <div class="notebook-paper">
    <div class="paper-holes">
      <div class="hole"></div>
      <div class="hole"></div>
      <div class="hole"></div>
    </div>

    <div class="margin-doodles">
      <span class="doodle doodle-star">★</span>
      <span class="doodle doodle-heart">♥</span>
      <span class="doodle doodle-spiral">@</span>
      <span class="doodle doodle-cool-s">𝕊</span>
    </div>

    <div class="paper-content">
      <h1 class="title">M.A.S.H.</h1>
      <p class="subtitle">Mansion • Apartment • Shack • House</p>

      {#if phase === 'setup'}
        <div class="categories">
          {#each categories as category, catIndex}
            <div class="category-row">
              <span class="category-label">{category.name}</span>
              <div class="options">
                {#each category.options as option, optIndex}
                  {#if editingCell?.cat === catIndex && editingCell?.opt === optIndex}
                    <input
                      type="text"
                      class="option-input"
                      bind:value={editValue}
                      onblur={saveEdit}
                      onkeydown={handleEditKeydown}
                      autofocus
                    />
                  {:else}
                    <button
                      class="option-btn"
                      onclick={() => startEditing(catIndex, optIndex)}
                    >
                      {option}
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <div class="setup-actions">
          <button class="reset-btn" onclick={resetCategories}>
            Reset to Defaults
          </button>
          <button class="start-btn" onclick={startGame}>
            Draw Spiral ✏️
          </button>
        </div>
      {:else if phase === 'spiral'}
        <div class="spiral-phase">
          <p class="instruction">Drawing your spiral...</p>

          <div class="spiral-container">
            <svg viewBox="0 0 200 200" class="spiral-svg">
              <path
                d={generateSpiralPath(spiralProgress)}
                fill="none"
                stroke="#2c5aa0"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <p class="loop-count">
            {#if isDrawingSpiral}
              Loops: {spiralLoops}
            {:else}
              Your number is: <strong>{magicNumber}</strong>
            {/if}
          </p>

          {#if !isDrawingSpiral && spiralProgress === 0}
            <button class="draw-btn" onclick={drawSpiral}>
              Tap to Draw!
            </button>
          {/if}
        </div>
      {:else if phase === 'elimination'}
        <div class="elimination-phase">
          <p class="counting-label">Counting by {magicNumber}...</p>

          <div class="categories elimination-view">
            {#each categories as category, catIndex}
              <div class="category-row">
                <span class="category-label">{category.name}</span>
                <div class="options">
                  {#each category.options as option, optIndex}
                    {@const isElim = eliminated.get(catIndex)?.has(optIndex)}
                    {@const isHighlighted = currentHighlight?.cat === catIndex && currentHighlight?.opt === optIndex}
                    <span
                      class="option-display"
                      class:eliminated={isElim}
                      class:highlighted={isHighlighted}
                    >
                      {option}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else if phase === 'result'}
        <div class="result-phase">
          <h2 class="result-title">Your Future! ✨</h2>

          <div class="result-categories">
            {#each categories as category, catIndex}
              {@const winnerIndex = results.get(catIndex) || 0}
              <div class="result-row">
                <span class="result-label">{category.name}</span>
                <span class="result-value">{category.options[winnerIndex]}</span>
              </div>
            {/each}
          </div>

          <div class="fortune-text">
            <p>{getResultText()}</p>
          </div>

          <button class="play-again-btn" onclick={playAgain}>
            Play Again! 🔮
          </button>
        </div>
      {/if}
    </div>

    {#if beanie}
      <HidingBeanie {beanie} class="mash-beanie" />
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

  .mash-container {
    position: fixed;
    inset: 0;
    background: #8b7355;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Patrick Hand', cursive;
  }

  .notebook-paper {
    position: relative;
    width: 100%;
    max-width: 500px;
    min-height: 600px;
    background:
      repeating-linear-gradient(
        transparent,
        transparent 31px,
        #9dd3e5 31px,
        #9dd3e5 32px
      ),
      linear-gradient(to right, #fef8e8, #faf3dc);
    border-radius: 4px;
    box-shadow:
      2px 2px 8px rgba(0, 0, 0, 0.3),
      inset 0 0 60px rgba(0, 0, 0, 0.05);
    padding: 1rem 1rem 1rem 3rem;
  }

  .paper-holes {
    position: absolute;
    left: 12px;
    top: 40px;
    bottom: 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hole {
    width: 16px;
    height: 16px;
    background: #8b7355;
    border-radius: 50%;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.3);
  }

  .margin-doodles {
    position: absolute;
    right: 10px;
    top: 60px;
    display: flex;
    flex-direction: column;
    gap: 40px;
    opacity: 0.3;
    pointer-events: none;
  }

  .doodle {
    font-size: 1.5rem;
    color: #2c5aa0;
    transform: rotate(var(--rotation, 0deg));
  }

  .doodle-star {
    --rotation: 15deg;
    color: #f1c40f;
  }

  .doodle-heart {
    --rotation: -10deg;
    color: #e74c3c;
  }

  .doodle-spiral {
    --rotation: 5deg;
  }

  .doodle-cool-s {
    --rotation: -5deg;
    font-family: serif;
  }

  .paper-content {
    position: relative;
    padding-left: 20px;
    border-left: 2px solid #f5989d;
  }

  .title {
    font-size: 2.5rem;
    color: #2c5aa0;
    margin: 0 0 0.25rem 0;
    text-decoration: underline;
  }

  .subtitle {
    font-size: 1rem;
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  :global(.mash-beanie) {
    position: absolute;
    bottom: -20px;
    right: 20px;
    z-index: 5;
  }

  .categories {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .category-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .category-label {
    font-size: 1.1rem;
    color: #2c5aa0;
    font-weight: bold;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .option-btn {
    font-family: 'Patrick Hand', cursive;
    font-size: 1rem;
    background: transparent;
    border: none;
    color: #333;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .option-btn:hover {
    background: rgba(44, 90, 160, 0.1);
  }

  .option-input {
    font-family: 'Patrick Hand', cursive;
    font-size: 1rem;
    background: rgba(255, 255, 255, 0.8);
    border: 2px dashed #2c5aa0;
    color: #333;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    width: 120px;
  }

  .option-input:focus {
    outline: none;
    border-style: solid;
  }

  .setup-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px dashed #ccc;
  }

  .reset-btn {
    font-family: 'Patrick Hand', cursive;
    font-size: 1rem;
    background: transparent;
    border: 2px solid #999;
    color: #666;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    border-color: #666;
    color: #333;
  }

  .start-btn {
    font-family: 'Patrick Hand', cursive;
    font-size: 1.2rem;
    background: #2c5aa0;
    border: none;
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .start-btn:hover {
    background: #1e4080;
    transform: scale(1.05);
  }

  .spiral-phase {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
  }

  .instruction {
    font-size: 1.3rem;
    color: #2c5aa0;
    margin: 0;
  }

  .spiral-container {
    width: 180px;
    height: 180px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    padding: 10px;
  }

  .spiral-svg {
    width: 100%;
    height: 100%;
  }

  .loop-count {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .loop-count strong {
    color: #c41e3a;
    font-size: 2rem;
  }

  .draw-btn {
    font-family: 'Patrick Hand', cursive;
    font-size: 1.5rem;
    background: #4a9c5d;
    border: none;
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .draw-btn:hover {
    background: #3a8c4d;
    transform: scale(1.05);
  }

  .elimination-phase {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .counting-label {
    font-size: 1.3rem;
    color: #c41e3a;
    text-align: center;
    margin: 0;
    animation: pulse 0.5s ease-in-out infinite;
  }

  .elimination-view .option-display {
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative;
  }

  .option-display.highlighted {
    background: rgba(44, 90, 160, 0.3);
    transform: scale(1.1);
  }

  .option-display.eliminated {
    color: #999;
    text-decoration: line-through;
    text-decoration-color: #c41e3a;
    text-decoration-thickness: 2px;
  }

  .option-display.eliminated::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    background: #c41e3a;
    transform: rotate(-5deg);
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .result-phase {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .result-title {
    font-size: 2rem;
    color: #c41e3a;
    margin: 0;
    text-align: center;
  }

  .result-categories {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
  }

  .result-label {
    color: #666;
    font-size: 0.9rem;
  }

  .result-value {
    color: #2c5aa0;
    font-size: 1.2rem;
    font-weight: bold;
  }

  .fortune-text {
    background: rgba(44, 90, 160, 0.1);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #2c5aa0;
    margin: 0.5rem 0;
  }

  .fortune-text p {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.6;
    color: #333;
  }

  .play-again-btn {
    font-family: 'Patrick Hand', cursive;
    font-size: 1.3rem;
    background: #9b59b6;
    border: none;
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .play-again-btn:hover {
    background: #8e44ad;
    transform: scale(1.05);
  }

  @media (max-width: 500px) {
    .notebook-paper {
      min-height: auto;
      padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    }

    .title {
      font-size: 2rem;
    }
  }

  @media (max-width: 400px) {
    .margin-doodles {
      display: none;
    }
  }
</style>
