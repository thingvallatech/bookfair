# MASH Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a notebook-paper styled MASH fortune-telling game as a shelf toy.

**Architecture:** Single Svelte 5 component with local state, multi-phase gameplay (setup → spiral → elimination → result), CSS-only animations for the notebook paper aesthetic.

**Tech Stack:** SvelteKit 2, Svelte 5 runes ($state, $derived, $props), CSS animations, Google Fonts (Patrick Hand)

---

## Task 1: Create Basic Component Structure

**Files:**
- Create: `src/lib/toys/MASH.svelte`

**Step 1: Create the component scaffold**

Create `src/lib/toys/MASH.svelte`:

```svelte
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

  let { onClose }: Props = $props();

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

    <div class="paper-content">
      <h1 class="title">M.A.S.H.</h1>
      <p class="subtitle">Mansion • Apartment • Shack • House</p>

      {#if phase === 'setup'}
        <p>Setup phase coming soon...</p>
      {:else if phase === 'spiral'}
        <p>Spiral phase coming soon...</p>
      {:else if phase === 'elimination'}
        <p>Elimination phase coming soon...</p>
      {:else if phase === 'result'}
        <p>Result phase coming soon...</p>
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

  @media (max-width: 500px) {
    .notebook-paper {
      min-height: auto;
      padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    }

    .title {
      font-size: 2rem;
    }
  }
</style>
```

**Step 2: Verify component renders**

Run: `npm run dev`
Navigate to: `http://localhost:5173`
Expected: Dev server starts (component not yet on shelf)

**Step 3: Commit scaffold**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): add component scaffold with notebook paper styling"
```

---

## Task 2: Add MASH to Shelf

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add import statement**

In `src/routes/+page.svelte`, add after line 24 (after SlimeVolleyball import):

```typescript
import MASH from '$lib/toys/MASH.svelte';
```

**Step 2: Add to shelfObjects array**

Add to the `shelfObjects` array (after slimevolleyball entry, around line 47):

```typescript
{ id: 'mash', name: 'MASH', icon: '📝', desc: 'Predict your future' },
```

**Step 3: Add conditional render block**

Add after the slimevolleyball render block (around line 361):

```svelte
{:else if activeObject === 'mash'}
  <div class="object-view" role="dialog" aria-label="MASH">
    <MASH onClose={closeObject} />
  </div>
```

**Step 4: Verify on shelf**

Run: `npm run dev`
Navigate to: `http://localhost:5173`
Expected: MASH appears on shelf page 3, clicking opens notebook paper view

**Step 5: Commit shelf integration**

```bash
git add src/routes/+page.svelte
git commit -m "feat(mash): add MASH game to shelf"
```

---

## Task 3: Implement Category Data and State

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add category types and defaults**

Add after the Props interface in the script section:

```typescript
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
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no new errors

**Step 3: Commit state implementation**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): add category data structure and game state"
```

---

## Task 4: Implement Setup Phase UI

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add editing state**

Add after the existing state declarations:

```typescript
// Which option is being edited (null = none)
let editingCell = $state<{ cat: number; opt: number } | null>(null);
let editValue = $state('');

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
```

**Step 2: Replace setup phase markup**

Replace the `{#if phase === 'setup'}` block with:

```svelte
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
```

**Step 3: Add setup phase styles**

Add to the style section:

```css
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
```

**Step 4: Verify setup phase works**

Run: `npm run dev`
Navigate to: `http://localhost:5173/#mash`
Expected: See editable categories, can tap to edit options, Reset and Draw Spiral buttons work

**Step 5: Commit setup phase**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): implement setup phase with editable categories"
```

---

## Task 5: Implement Spiral Phase

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add spiral animation state**

Add to state declarations:

```typescript
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
```

**Step 2: Replace spiral phase markup**

Replace the spiral phase placeholder with:

```svelte
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
```

**Step 3: Add spiral path generator function**

Add to script section:

```typescript
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
```

**Step 4: Add spiral phase styles**

Add to styles:

```css
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

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

**Step 5: Add placeholder startElimination function**

Add to script:

```typescript
function startElimination() {
  // Will be implemented in next task
  console.log('Starting elimination with magic number:', magicNumber);
}
```

**Step 6: Verify spiral phase**

Run: `npm run dev`
Navigate to: `http://localhost:5173/#mash`
Expected: After clicking Draw Spiral, see animated spiral drawing, loop count, then transitions to elimination

**Step 7: Commit spiral phase**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): implement spiral drawing animation phase"
```

---

## Task 6: Implement Elimination Phase

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add elimination state and logic**

Replace the placeholder `startElimination` function and add elimination logic:

```typescript
// Elimination animation state
let currentHighlight = $state<{ cat: number; opt: number } | null>(null);
let eliminationSpeed = $state(300); // ms between steps

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
```

**Step 2: Replace elimination phase markup**

Replace the elimination phase placeholder with:

```svelte
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
```

**Step 3: Add elimination phase styles**

Add to styles:

```css
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
```

**Step 4: Verify elimination phase**

Run: `npm run dev`
Navigate to: `http://localhost:5173/#mash`
Expected: After spiral, options highlight and get crossed out one by one, then transitions to result

**Step 5: Commit elimination phase**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): implement elimination phase with animated strikethroughs"
```

---

## Task 7: Implement Result Phase

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add result generation**

Add function to script:

```typescript
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
```

**Step 2: Replace result phase markup**

Replace the result phase placeholder with:

```svelte
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
```

**Step 3: Add result phase styles**

Add to styles:

```css
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
```

**Step 4: Verify complete game flow**

Run: `npm run dev`
Navigate to: `http://localhost:5173/#mash`
Expected: Complete flow works - setup → spiral → elimination → result → play again

**Step 5: Commit result phase**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): implement result phase with fortune display"
```

---

## Task 8: Add Margin Doodles

**Files:**
- Modify: `src/lib/toys/MASH.svelte`

**Step 1: Add doodle elements to paper**

Add inside `.notebook-paper`, after `.paper-holes`:

```svelte
<div class="margin-doodles">
  <span class="doodle doodle-star">★</span>
  <span class="doodle doodle-heart">♥</span>
  <span class="doodle doodle-spiral">@</span>
  <span class="doodle doodle-cool-s">𝕊</span>
</div>
```

**Step 2: Add doodle styles**

Add to styles:

```css
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

@media (max-width: 400px) {
  .margin-doodles {
    display: none;
  }
}
```

**Step 3: Verify doodles appear**

Run: `npm run dev`
Expected: Faint doodles visible in right margin on larger screens

**Step 4: Commit doodles**

```bash
git add src/lib/toys/MASH.svelte
git commit -m "feat(mash): add decorative margin doodles"
```

---

## Task 9: Final Polish and Build Verification

**Files:**
- Modify: `src/lib/toys/MASH.svelte` (if needed)

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds

**Step 2: Test complete flow on multiple screen sizes**

Run: `npm run dev`
Test at:
- Desktop (1200px wide)
- Tablet (768px wide)
- Mobile (375px wide)

Expected: All phases work, layout adapts appropriately

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(mash): complete MASH fortune-telling game

- Notebook paper aesthetic with lined paper, holes, margin doodles
- Editable categories with nostalgic defaults
- Animated spiral drawing to determine magic number
- Elimination phase with strikethrough animations
- Result phase with fortune narrative
- Beanie hiding spot integration
- Mobile responsive"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Component scaffold | `MASH.svelte` |
| 2 | Add to shelf | `+page.svelte` |
| 3 | Category data/state | `MASH.svelte` |
| 4 | Setup phase UI | `MASH.svelte` |
| 5 | Spiral phase | `MASH.svelte` |
| 6 | Elimination phase | `MASH.svelte` |
| 7 | Result phase | `MASH.svelte` |
| 8 | Margin doodles | `MASH.svelte` |
| 9 | Final polish | All |

Total: 9 commits, ~400 lines of code
