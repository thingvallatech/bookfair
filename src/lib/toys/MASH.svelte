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
