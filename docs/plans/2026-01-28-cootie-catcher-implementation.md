# Cootie Catcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 3D paper fortune teller with CSS transforms, themed fortune sets, and animated open/close mechanics.

**Architecture:** Single Svelte 5 component with CSS 3D transforms for the paper folding effect, state machine for game phases (theme → color → number → fortune), and pre-defined fortune sets per theme.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, CSS 3D transforms (perspective, rotateX/Y), CSS transitions

---

## Task 1: Create Component Scaffold with 3D Container

**Files:**
- Create: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Create the component with 3D setup**

Create `src/lib/toys/CootieCatcher.svelte`:

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
  type Phase = 'theme' | 'color' | 'number' | 'fortune';
  let phase = $state<Phase>('theme');

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'behind-catcher' }];
  let beanie = $state<Beanie | null>(null);

  onMount(() => {
    registerSpots('cootiecatcher', hidingSpots);
    const beanies = getBeaniesForArea('cootiecatcher');
    beanie = beanies.get('behind-catcher') || null;
  });
</script>

<div class="cootie-container">
  <CloseButton {onClose} variant="light" />

  <div class="game-area">
    <h1 class="title">Cootie Catcher</h1>

    <div class="catcher-wrapper">
      <div class="catcher-3d">
        <div class="catcher">
          <div class="flap flap-top">
            <div class="flap-outer">1</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-right">
            <div class="flap-outer">2</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-bottom">
            <div class="flap-outer">3</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-left">
            <div class="flap-outer">4</div>
            <div class="flap-inner">?</div>
          </div>
        </div>
      </div>
    </div>

    <p class="instruction">
      {#if phase === 'theme'}
        Pick a theme to begin
      {:else if phase === 'color'}
        Pick a color
      {:else if phase === 'number'}
        Pick a number
      {:else}
        Your fortune awaits...
      {/if}
    </p>
  </div>

  {#if beanie}
    <HidingBeanie {beanie} class="cootie-beanie" />
  {/if}
</div>

<style>
  .cootie-container {
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Patrick Hand', cursive;
  }

  .game-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .title {
    font-size: 2rem;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    margin: 0;
  }

  .catcher-wrapper {
    perspective: 800px;
  }

  .catcher-3d {
    transform-style: preserve-3d;
    width: 200px;
    height: 200px;
  }

  .catcher {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transform: rotateX(15deg);
  }

  .flap {
    position: absolute;
    width: 0;
    height: 0;
    transform-style: preserve-3d;
    transition: transform 0.3s ease;
  }

  .flap-outer,
  .flap-inner {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    backface-visibility: hidden;
  }

  /* Triangle flaps using borders */
  .flap-top {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 86px solid #fff8e7;
    transform-origin: bottom center;
  }

  .flap-top .flap-outer {
    top: 30px;
    left: -10px;
    color: #e74c3c;
  }

  .flap-right {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 86px solid #fff8e7;
    transform-origin: left center;
  }

  .flap-right .flap-outer {
    top: -10px;
    left: -60px;
    color: #3498db;
  }

  .flap-bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-top: 86px solid #fff8e7;
    transform-origin: top center;
  }

  .flap-bottom .flap-outer {
    bottom: 30px;
    left: -10px;
    color: #f1c40f;
  }

  .flap-left {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-right: 86px solid #fff8e7;
    transform-origin: right center;
  }

  .flap-left .flap-outer {
    top: -10px;
    right: -60px;
    color: #2ecc71;
  }

  .instruction {
    font-size: 1.3rem;
    color: white;
    text-align: center;
    margin: 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  }

  :global(.cootie-beanie) {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 5;
  }

  @media (max-width: 400px) {
    .catcher-3d {
      width: 160px;
      height: 160px;
    }

    .title {
      font-size: 1.5rem;
    }
  }
</style>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): add component scaffold with 3D CSS structure"
```

---

## Task 2: Add to Shelf

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add import**

Add after the MASH import (around line 26):

```typescript
import CootieCatcher from '$lib/toys/CootieCatcher.svelte';
```

**Step 2: Add shelf entry**

Add to `shelfObjects` array (after mash entry):

```typescript
{ id: 'cootiecatcher', name: 'Cootie Catcher', icon: '🔮', desc: 'Pick your fortune' },
```

**Step 3: Add render block**

Add after the mash render block:

```svelte
{:else if activeObject === 'cootiecatcher'}
  <div class="object-view" role="dialog" aria-label="Cootie Catcher">
    <CootieCatcher onClose={closeObject} />
  </div>
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(cootie): add Cootie Catcher to shelf"
```

---

## Task 3: Add Theme Data and Selection

**Files:**
- Modify: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Add theme data**

Add after the Props interface:

```typescript
interface Theme {
  id: string;
  name: string;
  colors: string[];
  colorNames: string[];
  fortunes: string[];
}

const THEMES: Theme[] = [
  {
    id: 'love',
    name: '💕 Love',
    colors: ['#ff69b4', '#e74c3c', '#ff1493', '#db7093'],
    colorNames: ['Pink', 'Red', 'Hot Pink', 'Rose'],
    fortunes: [
      'Your crush likes you back',
      "You'll get married at 25",
      'Someone is thinking about you right now',
      'A love letter is coming',
      "You'll have 3 kids",
      'Your first kiss is soon',
      'A secret admirer watches',
      'True love will find you'
    ]
  },
  {
    id: 'fortune',
    name: '💰 Fortune',
    colors: ['#ffd700', '#2ecc71', '#c0c0c0', '#4169e1'],
    colorNames: ['Gold', 'Green', 'Silver', 'Blue'],
    fortunes: [
      'You will be rich',
      'Fame awaits you',
      "You'll travel the world",
      'A promotion is coming',
      "You'll live in a mansion",
      'Luck is on your side',
      'Success is near',
      'Your dreams will come true'
    ]
  },
  {
    id: 'silly',
    name: '🤪 Silly',
    colors: ['#32cd32', '#ff8c00', '#00ffff', '#ff00ff'],
    colorNames: ['Lime', 'Orange', 'Cyan', 'Magenta'],
    fortunes: [
      'You smell like cheese',
      'A bird will poop on you',
      "You'll step in gum today",
      'Your face looks funny',
      'You eat boogers secretly',
      'A fart is coming',
      "You'll trip in public",
      'Someone saw you pick your nose'
    ]
  },
  {
    id: '8ball',
    name: '🎱 8-Ball',
    colors: ['#1a1a2e', '#9b59b6', '#1e3a5f', '#4a4a4a'],
    colorNames: ['Black', 'Purple', 'Navy', 'Gray'],
    fortunes: [
      'Yes',
      'No',
      'Ask again later',
      'Outlook good',
      "Don't count on it",
      'Without a doubt',
      'Reply hazy, try again',
      'My sources say no'
    ]
  }
];

// Game state
let selectedTheme = $state<Theme | null>(null);

function selectTheme(theme: Theme) {
  selectedTheme = theme;
  phase = 'color';
  playSound('click');
}
```

**Step 2: Add theme selection UI**

Replace the instruction paragraph and add theme buttons before it:

```svelte
{#if phase === 'theme'}
  <div class="theme-buttons">
    {#each THEMES as theme}
      <button class="theme-btn" onclick={() => selectTheme(theme)}>
        {theme.name}
      </button>
    {/each}
  </div>
{/if}

<p class="instruction">
  {#if phase === 'theme'}
    Pick a theme to begin
  {:else if phase === 'color'}
    Pick a color
  {:else if phase === 'number'}
    Pick a number
  {:else}
    Your fortune awaits...
  {/if}
</p>
```

**Step 3: Add theme button styles**

Add to styles:

```css
.theme-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.theme-btn {
  font-family: 'Patrick Hand', cursive;
  font-size: 1.2rem;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
}

.theme-btn:hover {
  transform: scale(1.05);
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.3);
}
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): add theme data and selection phase"
```

---

## Task 4: Implement Color Selection with Animation

**Files:**
- Modify: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Add color/animation state**

Add after selectedTheme state:

```typescript
let selectedColorIndex = $state<number | null>(null);
let animationCount = $state(0);
let isAnimating = $state(false);
let openState = $state<'closed' | 'horizontal' | 'vertical'>('closed');

function selectColor(index: number) {
  if (isAnimating || !selectedTheme) return;

  selectedColorIndex = index;
  const colorName = selectedTheme.colorNames[index];
  const letterCount = colorName.length;

  isAnimating = true;
  animationCount = 0;

  playSound('pop');
  animateOpenClose(letterCount, () => {
    phase = 'number';
    isAnimating = false;
  });
}

function animateOpenClose(times: number, onComplete: () => void) {
  if (animationCount >= times) {
    openState = 'closed';
    onComplete();
    return;
  }

  // Alternate between horizontal and vertical
  openState = animationCount % 2 === 0 ? 'horizontal' : 'vertical';
  animationCount++;
  playSound('whoosh', 0.2);

  setTimeout(() => {
    animateOpenClose(times, onComplete);
  }, 400);
}
```

**Step 2: Update flaps to use theme colors**

Replace the catcher div with dynamic colors:

```svelte
<div class="catcher" class:open-horizontal={openState === 'horizontal'} class:open-vertical={openState === 'vertical'}>
  {#if selectedTheme}
    <div class="flap flap-top" style="--flap-color: {selectedTheme.colors[0]}">
      <div class="flap-outer">{selectedTheme.colorNames[0]}</div>
      <div class="flap-inner">1</div>
    </div>
    <div class="flap flap-right" style="--flap-color: {selectedTheme.colors[1]}">
      <div class="flap-outer">{selectedTheme.colorNames[1]}</div>
      <div class="flap-inner">2</div>
    </div>
    <div class="flap flap-bottom" style="--flap-color: {selectedTheme.colors[2]}">
      <div class="flap-outer">{selectedTheme.colorNames[2]}</div>
      <div class="flap-inner">3</div>
    </div>
    <div class="flap flap-left" style="--flap-color: {selectedTheme.colors[3]}">
      <div class="flap-outer">{selectedTheme.colorNames[3]}</div>
      <div class="flap-inner">4</div>
    </div>
  {:else}
    <div class="flap flap-top"><div class="flap-outer">?</div></div>
    <div class="flap flap-right"><div class="flap-outer">?</div></div>
    <div class="flap flap-bottom"><div class="flap-outer">?</div></div>
    <div class="flap flap-left"><div class="flap-outer">?</div></div>
  {/if}
</div>
```

**Step 3: Add color selection buttons**

Add after theme buttons, inside the game-area:

```svelte
{#if phase === 'color' && selectedTheme}
  <div class="color-buttons">
    {#each selectedTheme.colors as color, i}
      <button
        class="color-btn"
        style="background: {color}"
        onclick={() => selectColor(i)}
        disabled={isAnimating}
      >
        {selectedTheme.colorNames[i]}
      </button>
    {/each}
  </div>
{/if}
```

**Step 4: Update CSS for animations and colors**

Update flap styles to use CSS variable and add animation classes:

```css
.flap-top {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 86px solid var(--flap-color, #fff8e7);
  transform-origin: bottom center;
}

.flap-right {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  border-top: 50px solid transparent;
  border-bottom: 50px solid transparent;
  border-left: 86px solid var(--flap-color, #fff8e7);
  transform-origin: left center;
}

.flap-bottom {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-top: 86px solid var(--flap-color, #fff8e7);
  transform-origin: top center;
}

.flap-left {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border-top: 50px solid transparent;
  border-bottom: 50px solid transparent;
  border-right: 86px solid var(--flap-color, #fff8e7);
  transform-origin: right center;
}

/* Open animations */
.catcher.open-horizontal .flap-top {
  transform: translateX(-50%) rotateX(-160deg);
}

.catcher.open-horizontal .flap-bottom {
  transform: translateX(-50%) rotateX(160deg);
}

.catcher.open-vertical .flap-left {
  transform: translateY(-50%) rotateY(160deg);
}

.catcher.open-vertical .flap-right {
  transform: translateY(-50%) rotateY(-160deg);
}

.color-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.color-btn {
  font-family: 'Patrick Hand', cursive;
  font-size: 1.1rem;
  padding: 1rem;
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.color-btn:hover:not(:disabled) {
  transform: scale(1.05);
  border-color: white;
}

.color-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): implement color selection with open/close animation"
```

---

## Task 5: Implement Number Selection

**Files:**
- Modify: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Add number selection state and logic**

Add after animateOpenClose function:

```typescript
let selectedNumber = $state<number | null>(null);
let visibleNumbers = $derived(
  openState === 'horizontal' ? [1, 2, 3, 4] : [5, 6, 7, 8]
);

function selectNumber(num: number) {
  if (isAnimating) return;

  selectedNumber = num;
  isAnimating = true;
  animationCount = 0;

  playSound('pop');
  animateOpenClose(num, () => {
    phase = 'fortune';
    isAnimating = false;
    playSound('ding', 0.5);
  });
}
```

**Step 2: Add number selection UI**

Add after color buttons:

```svelte
{#if phase === 'number' && selectedTheme}
  <div class="number-buttons">
    {#each visibleNumbers as num}
      <button
        class="number-btn"
        onclick={() => selectNumber(num)}
        disabled={isAnimating}
      >
        {num}
      </button>
    {/each}
  </div>
{/if}
```

**Step 3: Add number button styles**

```css
.number-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  max-width: 200px;
}

.number-btn {
  font-family: 'Patrick Hand', cursive;
  font-size: 2rem;
  padding: 1rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
}

.number-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.number-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): implement number selection phase"
```

---

## Task 6: Implement Fortune Reveal

**Files:**
- Modify: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Add fortune state and logic**

Add after selectNumber function:

```typescript
let revealedFortune = $state<string | null>(null);

function revealFortune() {
  if (!selectedTheme || selectedNumber === null) return;

  // Fortune index is (selectedNumber - 1) since fortunes are 0-indexed
  const fortuneIndex = selectedNumber - 1;
  revealedFortune = selectedTheme.fortunes[fortuneIndex];
  playSound('ding', 0.5);
}

function playAgain() {
  phase = 'theme';
  selectedTheme = null;
  selectedColorIndex = null;
  selectedNumber = null;
  revealedFortune = null;
  openState = 'closed';
  animationCount = 0;
  playSound('pop');
}

function changeTheme() {
  phase = 'theme';
  selectedColorIndex = null;
  selectedNumber = null;
  revealedFortune = null;
  openState = 'closed';
  animationCount = 0;
  playSound('click');
}
```

**Step 2: Add fortune reveal UI**

Add after number buttons:

```svelte
{#if phase === 'fortune' && selectedTheme}
  <div class="fortune-reveal">
    {#if revealedFortune}
      <div class="fortune-card">
        <p class="fortune-text">{revealedFortune}</p>
      </div>
      <div class="fortune-actions">
        <button class="action-btn" onclick={playAgain}>
          Play Again 🔮
        </button>
        <button class="action-btn secondary" onclick={changeTheme}>
          Change Theme
        </button>
      </div>
    {:else}
      <p class="tap-prompt">Tap the catcher to reveal your fortune!</p>
      <button class="reveal-btn" onclick={revealFortune}>
        ✨ Reveal Fortune ✨
      </button>
    {/if}
  </div>
{/if}
```

**Step 3: Add fortune reveal styles**

```css
.fortune-reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 300px;
}

.tap-prompt {
  font-size: 1.2rem;
  color: white;
  text-align: center;
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

.reveal-btn {
  font-family: 'Patrick Hand', cursive;
  font-size: 1.3rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}

.reveal-btn:hover {
  transform: scale(1.05);
}

.fortune-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.2);
  text-align: center;
  animation: popIn 0.3s ease-out;
}

.fortune-text {
  font-size: 1.5rem;
  color: #333;
  margin: 0;
  line-height: 1.4;
}

.fortune-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.action-btn {
  font-family: 'Patrick Hand', cursive;
  font-size: 1.2rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: #9b59b6;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: scale(1.02);
  background: #8e44ad;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): implement fortune reveal phase"
```

---

## Task 7: Polish and Final Styling

**Files:**
- Modify: `src/lib/toys/CootieCatcher.svelte`

**Step 1: Add Google Font import**

Add at the top of the style section:

```css
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
```

**Step 2: Update flap-outer positioning to show color names**

The flap-outer elements need better positioning for text. Update the flap-outer styles:

```css
.flap-outer {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  backface-visibility: hidden;
  width: 60px;
  text-align: center;
}

.flap-inner {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  backface-visibility: hidden;
}

.flap-top .flap-outer {
  top: 25px;
  left: -30px;
}

.flap-right .flap-outer {
  top: -10px;
  left: -55px;
}

.flap-bottom .flap-outer {
  bottom: 25px;
  left: -30px;
}

.flap-left .flap-outer {
  top: -10px;
  right: -55px;
}
```

**Step 3: Add animation count display during animation**

Update instruction to show animation progress:

```svelte
<p class="instruction">
  {#if phase === 'theme'}
    Pick a theme to begin
  {:else if phase === 'color'}
    {#if isAnimating}
      {animationCount}...
    {:else}
      Pick a color
    {/if}
  {:else if phase === 'number'}
    {#if isAnimating}
      {animationCount}...
    {:else}
      Pick a number
    {/if}
  {:else}
    {#if !revealedFortune}
      Tap to reveal!
    {:else}
      Your fortune:
    {/if}
  {/if}
</p>
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/toys/CootieCatcher.svelte
git commit -m "feat(cootie): add polish and final styling"
```

---

## Task 8: Final Build Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds

**Step 2: Check git status**

```bash
git status
git log --oneline -10
```

Expected: Clean working tree, 7 feature commits

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Component scaffold with 3D CSS | `feat(cootie): add component scaffold...` |
| 2 | Add to shelf | `feat(cootie): add Cootie Catcher to shelf` |
| 3 | Theme data and selection | `feat(cootie): add theme data...` |
| 4 | Color selection with animation | `feat(cootie): implement color selection...` |
| 5 | Number selection | `feat(cootie): implement number selection...` |
| 6 | Fortune reveal | `feat(cootie): implement fortune reveal...` |
| 7 | Polish and styling | `feat(cootie): add polish...` |
| 8 | Final verification | (no commit if clean) |

Total: ~350 lines of code
