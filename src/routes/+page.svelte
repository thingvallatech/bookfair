<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import RetroBackground from '$lib/components/RetroBackground.svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { initializeHunt, registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';
  import DialUpModem from '$lib/toys/DialUpModem.svelte';
  import KooshBall from '$lib/toys/KooshBall.svelte';
  import KidPix from '$lib/toys/KidPix.svelte';
  import PogTube from '$lib/toys/PogTube.svelte';
  import Winamp from '$lib/toys/Winamp.svelte';
  import AIM from '$lib/toys/AIM.svelte';
  import Tamagotchi from '$lib/toys/Tamagotchi.svelte';
  import MagicEye from '$lib/toys/MagicEye.svelte';
  import Clippy from '$lib/toys/Clippy.svelte';
  import OregonTrail from '$lib/toys/OregonTrail.svelte';
  import LisaFrank from '$lib/toys/LisaFrank.svelte';
  import Screensaver from '$lib/toys/Screensaver.svelte';
  import FishTank from '$lib/toys/FishTank.svelte';
  import Snake from '$lib/toys/Snake.svelte';

  // Which object is currently "open" (fullscreen experience)
  let activeObject = $state<string | null>(null);
  let isLoading = $state(false);
  let focusedIndex = $state(0);

  // Shelf objects
  const shelfObjects = [
    { id: 'modem', name: 'Dial-Up Modem', icon: '📠', desc: 'Connect to the internet' },
    { id: 'koosh', name: 'Koosh Ball', icon: '🔴', desc: 'Squish and throw' },
    { id: 'kidpix', name: 'Kid Pix', icon: '🎨', desc: 'Draw and create' },
    { id: 'pogs', name: 'Pog Tube', icon: '🪙', desc: 'Slam and collect' },
    { id: 'winamp', name: 'Winamp', icon: '🎵', desc: 'It really whips...' },
    { id: 'aim', name: 'AIM', icon: '💬', desc: 'Chat with buddies' },
    { id: 'tamagotchi', name: 'Tamagotchi', icon: '🐣', desc: 'Care for your pet', persists: true },
    { id: 'magiceye', name: 'Magic Eye', icon: '👁️', desc: 'See the hidden image' },
    { id: 'clippy', name: 'Clippy', icon: '📎', desc: 'Need help?' },
    { id: 'oregontrail', name: 'Oregon Trail', icon: '🤠', desc: 'You have dysentery' },
    { id: 'lisafrank', name: 'Lisa Frank', icon: '🦄', desc: 'Rainbows forever' },
    { id: 'screensaver', name: 'Screensaver', icon: '🖥️', desc: 'Flying toasters' },
    { id: 'fishtank', name: 'Fish Tank', icon: '🐠', desc: 'Watch them grow', persists: true },
    { id: 'snake', name: 'Snake', icon: '🐍', desc: 'Eat apples, grow longer', persists: true },
  ];

  // Single hiding spot behind the wood shelf
  const shelfHidingSpots: HidingSpot[] = [
    { id: 'behind-wood' },
  ];

  // Beanie assigned to shelf
  let shelfBeanie = $state<Beanie | null>(null);

  const ITEMS_PER_PAGE = 6;
  let currentPage = $state(0);
  const totalPages = Math.ceil(shelfObjects.length / ITEMS_PER_PAGE);

  function getCurrentPageItems() {
    return shelfObjects.slice(
      currentPage * ITEMS_PER_PAGE,
      (currentPage + 1) * ITEMS_PER_PAGE
    );
  }

  function openObject(id: string) {
    playSound('click');
    isLoading = true;

    setTimeout(() => {
      activeObject = id;
      isLoading = false;
      if (browser) {
        history.pushState({ object: id }, '', `#${id}`);
      }
    }, 300);
  }

  function closeObject() {
    playSound('whoosh', 0.3);
    activeObject = null;
    if (browser) {
      history.pushState({}, '', '/');
    }
  }

  function nextPage() {
    if (currentPage < totalPages - 1) {
      playSound('whoosh', 0.2);
      currentPage++;
      focusedIndex = 0;
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      playSound('whoosh', 0.2);
      currentPage--;
      focusedIndex = 0;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && activeObject) {
      e.preventDefault();
      closeObject();
      return;
    }

    if (activeObject) return;

    const currentItems = getCurrentPageItems();

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (focusedIndex < currentItems.length - 1) {
          focusedIndex++;
          playSound('click', 0.2);
        } else if (currentPage < totalPages - 1) {
          nextPage();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (focusedIndex > 0) {
          focusedIndex--;
          playSound('click', 0.2);
        } else if (currentPage > 0) {
          prevPage();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (focusedIndex + 3 < currentItems.length) {
          focusedIndex += 3;
          playSound('click', 0.2);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusedIndex - 3 >= 0) {
          focusedIndex -= 3;
          playSound('click', 0.2);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        const item = currentItems[focusedIndex];
        if (item) openObject(item.id);
        break;
    }
  }

  function handlePopState(e: PopStateEvent) {
    if (e.state?.object) {
      activeObject = e.state.object;
    } else {
      activeObject = null;
    }
  }

  // Touch swipe handling
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!activeObject) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
      closeObject();
    }
  }

  onMount(() => {
    // Initialize hunt and register shelf spots
    initializeHunt();
    registerSpots('shelf', shelfHidingSpots);
    const beanies = getBeaniesForArea('shelf');
    shelfBeanie = beanies.get('behind-wood') || null;

    // Check for hash on load
    if (browser && window.location.hash) {
      const id = window.location.hash.slice(1);
      const obj = shelfObjects.find(o => o.id === id);
      if (obj) {
        activeObject = id;
      }
    }

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('popstate', handlePopState);
    };
  });
</script>

<svelte:window on:touchstart={handleTouchStart} on:touchend={handleTouchEnd} />

<div class="crt-container">
  <RetroBackground />
  <div class="crt-effects"></div>

  <main class="main-content">
    <header class="site-header">
      <h1 class="nes-text is-warning">The Book Fair</h1>
      <p class="subtitle">at the end of the internet</p>
    </header>

    <!-- The Shelf - with beanie hiding behind wood plank -->
    <section class="shelf-section">
      <div class="nes-container is-dark with-title shelf-container">
        <p class="title">~ the shelf ~</p>

        <div class="shelf-nav">
          <button
            class="nav-btn"
            onclick={prevPage}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            ◀
          </button>
          <span class="page-indicator">
            {#each Array(totalPages) as _, i}
              <span class="dot" class:active={i === currentPage}></span>
            {/each}
          </span>
          <button
            class="nav-btn"
            onclick={nextPage}
            disabled={currentPage === totalPages - 1}
            aria-label="Next page"
          >
            ▶
          </button>
        </div>

        <div class="shelf-items">
          {#each getCurrentPageItems() as obj, i}
            <button
              class="shelf-item nes-pointer"
              class:focused={focusedIndex === i && !activeObject}
              onclick={() => openObject(obj.id)}
              title={obj.desc}
              tabindex={focusedIndex === i ? 0 : -1}
            >
              <div class="item-icon">{obj.icon}</div>
              <span class="item-label">{obj.name}</span>
              {#if obj.persists}
                <span class="persist-badge" title="Saves your progress">💾</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Wood shelf with beanie peeking from behind -->
      <div class="shelf-wood-wrapper">
        {#if shelfBeanie}
          <HidingBeanie beanie={shelfBeanie} class="shelf-beanie" />
        {/if}
        <div class="shelf-wood">
          <div class="shelf-shadow"></div>
        </div>
      </div>
    </section>

    <p class="hint nes-text is-disabled">
      {#if activeObject}
        swipe down or press ESC to close
      {:else}
        click an object to explore · use arrow keys to navigate
      {/if}
    </p>
  </main>
</div>

{#if isLoading}
  <div class="loading-overlay">
    <LoadingState message="Loading..." />
  </div>
{/if}

{#if activeObject === 'modem'}
  <div class="object-view" role="dialog" aria-label="Dial-Up Modem">
    <DialUpModem onClose={closeObject} />
  </div>
{:else if activeObject === 'koosh'}
  <div class="object-view" role="dialog" aria-label="Koosh Ball">
    <KooshBall onClose={closeObject} />
  </div>
{:else if activeObject === 'kidpix'}
  <div class="object-view" role="dialog" aria-label="Kid Pix">
    <KidPix onClose={closeObject} />
  </div>
{:else if activeObject === 'pogs'}
  <div class="object-view" role="dialog" aria-label="Pog Tube">
    <PogTube onClose={closeObject} />
  </div>
{:else if activeObject === 'winamp'}
  <div class="object-view" role="dialog" aria-label="Winamp">
    <Winamp onClose={closeObject} />
  </div>
{:else if activeObject === 'aim'}
  <div class="object-view" role="dialog" aria-label="AIM">
    <AIM onClose={closeObject} />
  </div>
{:else if activeObject === 'tamagotchi'}
  <div class="object-view" role="dialog" aria-label="Tamagotchi">
    <Tamagotchi onClose={closeObject} />
  </div>
{:else if activeObject === 'magiceye'}
  <div class="object-view" role="dialog" aria-label="Magic Eye">
    <MagicEye onClose={closeObject} />
  </div>
{:else if activeObject === 'clippy'}
  <div class="object-view" role="dialog" aria-label="Clippy">
    <Clippy onClose={closeObject} />
  </div>
{:else if activeObject === 'oregontrail'}
  <div class="object-view" role="dialog" aria-label="Oregon Trail">
    <OregonTrail onClose={closeObject} />
  </div>
{:else if activeObject === 'lisafrank'}
  <div class="object-view" role="dialog" aria-label="Lisa Frank">
    <LisaFrank onClose={closeObject} />
  </div>
{:else if activeObject === 'screensaver'}
  <div class="object-view" role="dialog" aria-label="Screensaver">
    <Screensaver onClose={closeObject} />
  </div>
{:else if activeObject === 'fishtank'}
  <div class="object-view" role="dialog" aria-label="Fish Tank">
    <FishTank onClose={closeObject} />
  </div>
{:else if activeObject === 'snake'}
  <div class="object-view" role="dialog" aria-label="Snake">
    <Snake onClose={closeObject} />
  </div>
{/if}

<style>
  .crt-container {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .main-content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    padding-top: calc(2rem + env(safe-area-inset-top, 0));
  }

  .site-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .site-header h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    text-shadow:
      4px 4px 0 #000,
      -1px -1px 0 #000,
      1px -1px 0 #000,
      -1px 1px 0 #000;
  }

  .subtitle {
    font-size: 0.6rem;
    color: #888;
    letter-spacing: 2px;
  }

  .shelf-section {
    width: 100%;
    max-width: 700px;
    margin: auto 0;
  }

  .shelf-container {
    background: rgba(33, 37, 41, 0.95) !important;
    padding: 1.5rem !important;
    position: relative;
  }

  .shelf-nav {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 1rem;
  }

  .nav-btn {
    background: transparent;
    border: 2px solid #666;
    color: #888;
    width: 44px;
    height: 44px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    border-color: #f7d51d;
    color: #f7d51d;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-indicator {
    display: flex;
    gap: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #444;
    transition: all 0.2s;
  }

  .dot.active {
    background: #f7d51d;
    box-shadow: 0 0 8px rgba(247, 213, 29, 0.5);
  }

  .shelf-items {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    min-height: 200px;
    padding: 1rem 0;
  }

  @media (max-width: 500px) {
    .shelf-items {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .shelf-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 1rem 0.5rem;
    transition: all 0.2s ease-out;
    position: relative;
  }

  .shelf-item:hover,
  .shelf-item.focused {
    transform: translateY(-8px) scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: #f7d51d;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }

  .shelf-item:active {
    transform: translateY(-4px) scale(1.02);
  }

  .item-icon {
    font-size: 2.5rem;
    line-height: 1;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }

  .item-label {
    font-size: 0.45rem;
    color: #fff;
    text-shadow: 1px 1px 0 #000;
    text-align: center;
    line-height: 1.3;
  }

  .persist-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.7rem;
    opacity: 0.7;
  }

  /* Wood shelf with beanie hiding behind it */
  .shelf-wood-wrapper {
    position: relative;
    margin: 0 0.5rem;
  }

  .shelf-wood {
    height: 24px;
    background: linear-gradient(180deg, #d4a574 0%, #b8956a 50%, #8b6914 100%);
    border: 4px solid #5c4a1f;
    border-top: none;
    position: relative;
    z-index: 10; /* Wood sits in front of beanie */
  }

  .shelf-shadow {
    position: absolute;
    bottom: -12px;
    left: 10%;
    right: 10%;
    height: 10px;
    background: rgba(0, 0, 0, 0.3);
    filter: blur(6px);
    border-radius: 50%;
  }

  /* Beanie peeking from behind the wood shelf */
  :global(.shelf-beanie) {
    bottom: -30px; /* Position lower so only head/ears peek above wood */
    left: 30px;
    z-index: 5; /* Behind the wood (z-index: 10) */
  }

  :global(.shelf-beanie.discovered) {
    z-index: 15 !important; /* Pop in front when discovered */
  }

  .hint {
    margin-top: auto;
    font-size: 0.45rem;
    text-align: center;
    padding: 0 1rem;
  }

  .loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(26, 26, 46, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .object-view {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: #1a1a2e;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 600px) {
    .main-content {
      padding: 1rem;
    }

    .site-header h1 {
      font-size: 1.1rem;
    }

    .shelf-container {
      padding: 1rem !important;
    }

    .item-icon {
      font-size: 2rem;
    }
  }
</style>
