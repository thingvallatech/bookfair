<script lang="ts">
  import { onMount } from 'svelte';
  import { getStamps } from '$lib/stores/passport';
  import { playSound } from '$lib/stores/audio';
  import CloseButton from './CloseButton.svelte';

  interface Props { onClose: () => void; }
  let { onClose }: Props = $props();

  // All 27 stampable toys matching shelfObjects in +page.svelte
  const ALL_TOYS = [
    { id: 'modem', name: 'Dial-Up Modem', icon: '\u{1F4E0}' },
    { id: 'koosh', name: 'Koosh Ball', icon: '\u{1F534}' },
    { id: 'kidpix', name: 'Kid Pix', icon: '\u{1F3A8}' },
    { id: 'pogs', name: 'Pog Tube', icon: '\u{1FA99}' },
    { id: 'winamp', name: 'Winamp', icon: '\u{1F3B5}' },
    { id: 'aim', name: 'AIM', icon: '\u{1F4AC}' },
    { id: 'tamagotchi', name: 'Tamagotchi', icon: '\u{1F423}' },
    { id: 'magiceye', name: 'Magic Eye', icon: '\u{1F441}\u{FE0F}' },
    { id: 'clippy', name: 'Clippy', icon: '\u{1F4CE}' },
    { id: 'oregontrail', name: 'Oregon Trail', icon: '\u{1F920}' },
    { id: 'lisafrank', name: 'Lisa Frank', icon: '\u{1F984}' },
    { id: 'screensaver', name: 'Screensaver', icon: '\u{1F5A5}\u{FE0F}' },
    { id: 'fishtank', name: 'Fish Tank', icon: '\u{1F420}' },
    { id: 'snake', name: 'Snake', icon: '\u{1F40D}' },
    { id: 'slimevolleyball', name: 'Slime V-Ball', icon: '\u{1F3D0}' },
    { id: 'mash', name: 'MASH', icon: '\u{1F4DD}' },
    { id: 'cootiecatcher', name: 'Cootie Catcher', icon: '\u{1F52E}' },
    { id: 'bados', name: 'BadOS XP', icon: '\u{1F5A5}\u{FE0F}' },
    { id: 'bopit', name: 'Bop It', icon: '\u{1F534}' },
    { id: 'marblemaze', name: 'Marble Maze', icon: '\u{1F535}' },
    { id: 'napster', name: 'LimeWire', icon: '\u{1F3B5}' },
    { id: 'litebrite', name: 'Lite-Brite', icon: '\u{1F4A1}' },
    { id: 'scholastic', name: 'Book Order', icon: '\u{1F4DA}' },
    { id: 'furby', name: 'Furby', icon: '\u{1F9F8}' },
    { id: 'askjeeves', name: 'Ask Jeeves', icon: '\u{1F3A9}' },
    { id: 'carmen', name: 'Carmen Sandiego', icon: '\u{1F50D}' },
    { id: 'encarta', name: 'Encarta', icon: '\u{1F4C0}' },
  ];

  const TOTAL = ALL_TOYS.length;

  let stamped = $state<Set<string>>(new Set());
  let stampCount = $state(0);

  // Deterministic pseudo-random rotation/offset per toy for stamp effect
  function seedRandom(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function getStampRotation(id: string): number {
    const seed = seedRandom(id);
    return ((seed % 25) - 12); // -12 to +12 degrees
  }

  function getStampOffsetX(id: string): number {
    const seed = seedRandom(id + 'x');
    return ((seed % 7) - 3); // -3 to +3 px
  }

  function getStampOffsetY(id: string): number {
    const seed = seedRandom(id + 'y');
    return ((seed % 5) - 2); // -2 to +2 px
  }

  // Stamp ink colors - deterministic per toy
  const STAMP_COLORS = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
    '#1e88e5', '#00897b', '#43a047', '#f4511e',
    '#6d4c41', '#3949ab', '#00acc1', '#7cb342',
  ];

  function getStampColor(id: string): string {
    const seed = Math.abs(seedRandom(id + 'c'));
    return STAMP_COLORS[seed % STAMP_COLORS.length];
  }

  onMount(() => {
    stamped = getStamps();
    stampCount = stamped.size;
    playSound('pop', 0.3);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="passport-overlay" role="dialog" aria-modal="true" aria-label="Visitor Passport">
  <div class="passport-book">
    <CloseButton {onClose} />

    <!-- Cover / Header -->
    <div class="passport-header">
      <div class="passport-crest">&#9733;</div>
      <h2 class="passport-title">Visitor Passport</h2>
      <p class="passport-subtitle">The Book Fair</p>
      <div class="passport-progress">
        <span class="stamp-count">{stampCount}</span>
        <span class="stamp-sep">/</span>
        <span class="stamp-total">{TOTAL}</span>
        <span class="stamp-label">stamps collected</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(stampCount / TOTAL) * 100}%"></div>
      </div>
      {#if stampCount === TOTAL}
        <div class="complete-badge">ALL STAMPS COLLECTED!</div>
      {/if}
    </div>

    <!-- Stamp Pages -->
    <div class="passport-pages">
      <div class="stamp-grid">
        {#each ALL_TOYS as toy}
          {@const isStamped = stamped.has(toy.id)}
          <div
            class="stamp-slot"
            class:stamped={isStamped}
            aria-label={isStamped ? `${toy.name} - stamped` : `${toy.name} - not yet visited`}
          >
            <div class="stamp-border">
              {#if isStamped}
                <div
                  class="stamp-ink"
                  style="
                    transform: rotate({getStampRotation(toy.id)}deg)
                      translate({getStampOffsetX(toy.id)}px, {getStampOffsetY(toy.id)}px);
                    --stamp-color: {getStampColor(toy.id)};
                  "
                >
                  <span class="stamp-emoji">{toy.icon}</span>
                  <span class="stamp-ring"></span>
                </div>
              {:else}
                <div class="stamp-empty">
                  <span class="stamp-silhouette">{toy.icon}</span>
                </div>
              {/if}
            </div>
            <span class="stamp-name" class:stamped={isStamped}>{toy.name}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .passport-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: passportFadeIn 0.25s ease-out;
    padding: 1rem;
  }

  @keyframes passportFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .passport-book {
    position: relative;
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    background: linear-gradient(180deg, #1a2744 0%, #152038 60%, #0f1a2e 100%);
    border: 3px solid #c5a44e;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 0 0 1px #8b7530,
      0 8px 32px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(197, 164, 78, 0.2);
  }

  /* Header - passport cover feel */
  .passport-header {
    text-align: center;
    padding: 1.5rem 3.5rem 1rem;
    border-bottom: 2px solid #c5a44e;
    flex-shrink: 0;
    background: linear-gradient(180deg, rgba(197, 164, 78, 0.08) 0%, transparent 100%);
  }

  .passport-crest {
    font-size: 1.5rem;
    color: #c5a44e;
    margin-bottom: 0.25rem;
    text-shadow: 0 0 8px rgba(197, 164, 78, 0.4);
    line-height: 1;
  }

  .passport-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.75rem;
    color: #c5a44e;
    margin: 0 0 0.25rem;
    text-shadow: 1px 1px 0 #000;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .passport-subtitle {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #8b7530;
    margin: 0 0 0.75rem;
    letter-spacing: 1px;
  }

  .passport-progress {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.2rem;
    margin-bottom: 0.5rem;
  }

  .stamp-count {
    font-family: 'Press Start 2P', monospace;
    font-size: 1.1rem;
    color: #c5a44e;
  }

  .stamp-sep {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #5a4a20;
  }

  .stamp-total {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #8b7530;
  }

  .stamp-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #5a4a20;
    margin-left: 0.3rem;
  }

  .progress-bar {
    width: 100%;
    max-width: 280px;
    height: 6px;
    background: #0f1a2e;
    border: 1px solid #3a3a5a;
    border-radius: 3px;
    margin: 0 auto;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #c5a44e, #e8d48b);
    border-radius: 3px;
    transition: width 0.5s ease-out;
  }

  .complete-badge {
    margin-top: 0.6rem;
    display: inline-block;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid #ffd700;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    animation: completePulse 2s ease-in-out infinite;
  }

  @keyframes completePulse {
    0%, 100% { box-shadow: 0 0 4px rgba(255, 215, 0, 0.3); }
    50% { box-shadow: 0 0 12px rgba(255, 215, 0, 0.6); }
  }

  /* Pages area */
  .passport-pages {
    overflow-y: auto;
    padding: 1rem 1.25rem 1.5rem;
    flex: 1;
    /* Faint lined paper background */
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 31px,
        rgba(197, 164, 78, 0.06) 31px,
        rgba(197, 164, 78, 0.06) 32px
      );
  }

  .stamp-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  /* Individual stamp slot */
  .stamp-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .stamp-border {
    width: 72px;
    height: 72px;
    border: 2px dashed #2a3a5a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: rgba(15, 26, 46, 0.5);
    transition: border-color 0.2s;
  }

  .stamp-slot.stamped .stamp-border {
    border-color: var(--stamp-color, #c5a44e);
    border-style: solid;
    background: rgba(197, 164, 78, 0.04);
  }

  /* Stamped ink effect */
  .stamp-ink {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .stamp-emoji {
    font-size: 1.8rem;
    filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.4));
    z-index: 1;
  }

  .stamp-ring {
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    border: 2px solid var(--stamp-color, #c5a44e);
    opacity: 0.5;
  }

  /* Unstamped greyed silhouette */
  .stamp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .stamp-silhouette {
    font-size: 1.8rem;
    filter: grayscale(1) brightness(0.3);
    opacity: 0.4;
  }

  .stamp-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.3rem;
    color: #3a4a6a;
    text-align: center;
    line-height: 1.3;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stamp-name.stamped {
    color: #c5a44e;
  }

  /* Mobile: 3 columns */
  @media (max-width: 560px) {
    .passport-overlay {
      padding: 0.5rem;
    }

    .passport-book {
      max-height: 95vh;
    }

    .passport-header {
      padding: 1rem 1rem 0.75rem;
      padding-top: calc(1rem + 40px);
    }

    .passport-title {
      font-size: 0.6rem;
    }

    .passport-crest {
      font-size: 1.2rem;
    }

    .passport-pages {
      padding: 0.75rem 0.75rem 1rem;
      -webkit-overflow-scrolling: touch;
    }

    .stamp-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
    }

    .stamp-border {
      width: 60px;
      height: 60px;
    }

    .stamp-emoji,
    .stamp-silhouette {
      font-size: 1.5rem;
    }

    .stamp-name {
      font-size: 0.25rem;
      max-width: 65px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .passport-overlay {
      animation: none;
    }

    .progress-fill {
      transition: none;
    }

    .complete-badge {
      animation: none;
    }

    .stamp-border {
      transition: none;
    }
  }
</style>
