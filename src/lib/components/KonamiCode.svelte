<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';
  import { haptic } from '$lib/stores/haptics';
  import { ALL_BEANIES } from '$lib/stores/beanies';

  const STORAGE_KEY = 'bookfair_konami';

  // The Konami Code sequence labels (shared between keyboard and touch)
  const SEQUENCE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'] as const;
  type InputDir = (typeof SEQUENCE)[number];

  // Keyboard key-to-direction mapping
  const KEY_MAP: Record<string, InputDir> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    b: 'b',
    B: 'b',
    a: 'a',
    A: 'a',
  };

  const TIMEOUT_MS = 3000;
  const SWIPE_THRESHOLD = 50;

  let progress = $state(0);
  let activated = $state(false);
  let showOverlay = $state(false);
  let showReward = $state(false);
  let konamiFound = $state(false);
  let partyHue = $state(0);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let animFrameId: ReturnType<typeof requestAnimationFrame> | null = null;

  // Touch tracking
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function resetSequence() {
    progress = 0;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function startTimeout() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(resetSequence, TIMEOUT_MS);
  }

  function advanceSequence(input: InputDir) {
    if (activated) return;

    const expected = SEQUENCE[progress];
    if (input === expected) {
      progress++;
      startTimeout();

      if (progress === SEQUENCE.length) {
        activate();
      }
    } else {
      // Wrong input - reset
      resetSequence();
      // Check if this wrong input is actually the start of the sequence
      if (input === SEQUENCE[0]) {
        progress = 1;
        startTimeout();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (activated) return;
    const dir = KEY_MAP[e.key];
    if (dir) {
      advanceSequence(dir);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (activated) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e: TouchEvent) {
    if (activated) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const elapsed = Date.now() - touchStartTime;

    // Determine if it's a tap (minimal movement, short duration)
    if (absDx < 15 && absDy < 15 && elapsed < 300) {
      // This is a tap - maps to 'b' or 'a' depending on where we are in the sequence
      const expected = SEQUENCE[progress];
      if (expected === 'b' || expected === 'a') {
        advanceSequence(expected);
      }
      return;
    }

    // Determine swipe direction (must exceed threshold in dominant direction)
    let dir: InputDir | null = null;

    if (absDy > absDx && absDy > SWIPE_THRESHOLD) {
      // Vertical swipe
      dir = dy < 0 ? 'up' : 'down';
    } else if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
      // Horizontal swipe
      dir = dx > 0 ? 'right' : 'left';
    }

    if (dir) {
      advanceSequence(dir);
    }
  }

  function activate() {
    if (timeoutId) clearTimeout(timeoutId);
    activated = true;
    showOverlay = true;

    // Sound + haptics
    playSound('powerup', 0.5);
    haptic('discovery');
    setTimeout(() => playSound('victory', 0.4), 500);

    // Save to localStorage
    if (browser) {
      localStorage.setItem(STORAGE_KEY, 'true');
      konamiFound = true;
    }

    // After initial flash, show reward
    setTimeout(() => {
      showReward = true;
      startPartyMode();
    }, 600);

    // Dispatch custom event for parent to trigger shelf bounce
    if (browser) {
      window.dispatchEvent(new CustomEvent('konami-activated'));
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      showOverlay = false;
      showReward = false;
      activated = false;
      progress = 0;
      stopPartyMode();
    }, 5600);
  }

  function startPartyMode() {
    let start: number | null = null;
    function frame(ts: number) {
      if (!start) start = ts;
      partyHue = ((ts - start) * 0.15) % 360;
      if (showReward) {
        animFrameId = requestAnimationFrame(frame);
      }
    }
    animFrameId = requestAnimationFrame(frame);
  }

  function stopPartyMode() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    partyHue = 0;
  }

  onMount(() => {
    if (!browser) return;

    // Check if already found
    konamiFound = localStorage.getItem(STORAGE_KEY) === 'true';

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      if (timeoutId) clearTimeout(timeoutId);
      stopPartyMode();
    };
  });

  onDestroy(() => {
    if (timeoutId) clearTimeout(timeoutId);
    stopPartyMode();
  });
</script>

<!-- Progress indicator dots (only while entering sequence) -->
{#if progress > 0 && !activated}
  <div class="konami-progress" aria-hidden="true">
    {#each SEQUENCE as _, i}
      <span class="progress-dot" class:filled={i < progress}></span>
    {/each}
  </div>
{/if}

<!-- Found badge -->
{#if konamiFound && !showOverlay}
  <span class="konami-badge" title="Konami Code activated!">&#x1F579;&#xFE0F;</span>
{/if}

<!-- Full-screen reveal overlay -->
{#if showOverlay}
  <div
    class="konami-overlay"
    class:flash={!showReward}
    style={showReward ? `background: hsl(${partyHue}, 60%, 8%)` : ''}
    aria-live="assertive"
  >
    {#if !showReward}
      <!-- Initial white flash -->
      <div class="white-flash"></div>
    {:else}
      <!-- Party mode reward -->
      <div class="reward-container">
        <h2 class="cheat-text">CHEAT CODE ACTIVATED</h2>
        <p class="unlock-text" style="color: hsl({partyHue + 180}, 80%, 70%)">
          You unlocked: PARTY MODE
        </p>

        <!-- Beanie silhouette grid reveal -->
        <div class="beanie-reveal">
          {#each ALL_BEANIES as beanie, i}
            <div
              class="beanie-flash-item"
              style="animation-delay: {i * 40}ms"
            >
              <img
                src={beanie.image}
                alt={beanie.name}
                class="beanie-flash-img"
                loading="eager"
              />
              <span class="beanie-flash-name">{beanie.name}</span>
            </div>
          {/each}
        </div>

        <!-- Rainbow cycling border -->
        <div
          class="party-border"
          style="border-color: hsl({partyHue}, 90%, 60%)"
        ></div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ── Progress dots ── */
  .konami-progress {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    z-index: 900;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 10px;
    pointer-events: none;
  }

  .progress-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: background 0.15s ease, transform 0.15s ease;
  }

  .progress-dot.filled {
    background: #f7d51d;
    transform: scale(1.3);
    box-shadow: 0 0 4px rgba(247, 213, 29, 0.6);
  }

  /* ── Badge ── */
  .konami-badge {
    position: fixed;
    bottom: calc(12px + env(safe-area-inset-bottom, 0));
    right: 12px;
    z-index: 800;
    font-size: 1rem;
    opacity: 0.6;
    pointer-events: none;
    animation: badge-pulse 3s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  /* ── Overlay ── */
  .konami-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0a;
    animation: overlay-in 0.3s ease-out;
  }

  @keyframes overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* White flash */
  .white-flash {
    position: absolute;
    inset: 0;
    background: white;
    animation: flash-pulse 0.6s ease-out forwards;
  }

  @keyframes flash-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.8; }
    100% { opacity: 0; }
  }

  /* ── Reward container ── */
  .reward-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    max-height: 100vh;
    overflow: hidden;
    animation: reward-enter 0.4s ease-out;
  }

  @keyframes reward-enter {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .cheat-text {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.8rem, 4vw, 1.5rem);
    color: #f7d51d;
    text-shadow:
      0 0 10px rgba(247, 213, 29, 0.8),
      0 0 20px rgba(247, 213, 29, 0.4),
      3px 3px 0 #000;
    text-align: center;
    animation: text-flicker 0.3s ease-in-out 3;
    letter-spacing: 2px;
  }

  @keyframes text-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .unlock-text {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.4rem, 2vw, 0.7rem);
    text-align: center;
    transition: color 0.1s linear;
  }

  /* ── Beanie reveal grid ── */
  .beanie-reveal {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    max-width: 90vw;
    max-height: 50vh;
    overflow: hidden;
    padding: 0.5rem;
  }

  .beanie-flash-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    opacity: 0;
    animation: beanie-pop 0.3s ease-out forwards;
  }

  @keyframes beanie-pop {
    0% { opacity: 0; transform: scale(0) rotate(-20deg); }
    60% { transform: scale(1.2) rotate(5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  .beanie-flash-img {
    width: clamp(24px, 6vw, 40px);
    height: clamp(24px, 6vw, 40px);
    object-fit: contain;
    filter: drop-shadow(0 0 4px rgba(247, 213, 29, 0.5));
  }

  .beanie-flash-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.2rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Party border ── */
  .party-border {
    position: fixed;
    inset: 0;
    border: 4px solid transparent;
    pointer-events: none;
    transition: border-color 0.05s linear;
    box-shadow: inset 0 0 30px rgba(247, 213, 29, 0.1);
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .konami-overlay,
    .white-flash,
    .reward-container,
    .cheat-text,
    .beanie-flash-item,
    .konami-badge {
      animation: none !important;
    }

    .beanie-flash-item {
      opacity: 1;
    }
  }

  /* ── Mobile adjustments ── */
  @media (max-width: 600px) {
    .konami-progress {
      bottom: calc(8px + env(safe-area-inset-bottom, 0));
    }

    .beanie-flash-img {
      width: 24px;
      height: 24px;
    }

    .beanie-flash-name {
      font-size: 0.15rem;
    }

    .reward-container {
      padding: 1rem;
    }
  }
</style>
