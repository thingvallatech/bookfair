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
  let selectedColorIndex = $state<number | null>(null);
  let animationCount = $state(0);
  let isAnimating = $state(false);
  let openState = $state<'closed' | 'horizontal' | 'vertical'>('closed');

  function selectTheme(theme: Theme) {
    selectedTheme = theme;
    phase = 'color';
    playSound('click');
  }

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

    {#if phase === 'theme'}
      <div class="theme-buttons">
        {#each THEMES as theme}
          <button class="theme-btn" onclick={() => selectTheme(theme)}>
            {theme.name}
          </button>
        {/each}
      </div>
    {/if}

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

    <div class="catcher-wrapper">
      <div class="catcher-3d">
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
    border-bottom: 86px solid var(--flap-color, #fff8e7);
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
    border-left: 86px solid var(--flap-color, #fff8e7);
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
    border-top: 86px solid var(--flap-color, #fff8e7);
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
    border-right: 86px solid var(--flap-color, #fff8e7);
    transform-origin: right center;
  }

  .flap-left .flap-outer {
    top: -10px;
    right: -60px;
    color: #2ecc71;
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

  .instruction {
    font-size: 1.3rem;
    color: white;
    text-align: center;
    margin: 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  }

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
