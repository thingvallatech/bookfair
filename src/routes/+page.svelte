<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import RetroBackground from '$lib/components/RetroBackground.svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import ToyLoader from '$lib/components/ToyLoader.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import CRTBoot from '$lib/components/CRTBoot.svelte';
  import { playSound } from '$lib/stores/audio';
  import { initializeHunt, registerSpots, getBeaniesForArea, getDiscoveryStats, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';
  import BeanieGallery from '$lib/components/BeanieGallery.svelte';
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
  import SlimeVolleyball from '$lib/toys/SlimeVolleyball.svelte';
  import MASH from '$lib/toys/MASH.svelte';
  import CootieCatcher from '$lib/toys/CootieCatcher.svelte';
  import BadOS from '$lib/toys/BadOS.svelte';
  import BopIt from '$lib/toys/BopIt.svelte';
  import MarbleMaze from '$lib/toys/MarbleMaze.svelte';
  import Napster from '$lib/toys/Napster.svelte';
  import LiteBrite from '$lib/toys/LiteBrite.svelte';
  import ScholasticOrder from '$lib/toys/ScholasticOrder.svelte';
  import Furby from '$lib/toys/Furby.svelte';
  import AskJeeves from '$lib/toys/AskJeeves.svelte';

  // CRT boot animation overlay
  let showCRTBoot = $state(true);

  // Which object is currently "open" (fullscreen experience)
  let activeObject = $state<string | null>(null);
  let isLoading = $state(false);
  let loadingToy = $state<string | null>(null);

  // Heavy toys that benefit from themed loading states
  const heavyToys: Record<string, string> = {
    bados: 'bados',
    winamp: 'winamp',
  };
  let focusedIndex = $state(0);
  let showGallery = $state(false);
  let discoveryStats = $state({ discovered: 0, total: 39 });

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
    { id: 'slimevolleyball', name: 'Slime Volleyball', icon: '🏐', desc: 'Beat the AI' },
    { id: 'mash', name: 'MASH', icon: '📝', desc: 'Predict your future' },
    { id: 'cootiecatcher', name: 'Cootie Catcher', icon: '🔮', desc: 'Pick your fortune' },
    { id: 'bados', name: 'BadOS XP', icon: '🖥️', desc: 'Worst desktop ever' },
    { id: 'bopit', name: 'Bop It', icon: '🔴', desc: 'Bop twist pull!' },
    { id: 'marblemaze', name: 'Marble Maze', icon: '🔵', desc: 'Tilt and roll' },
    { id: 'napster', name: 'LimeWire', icon: '🎵', desc: 'Totally legal downloads' },
    { id: 'litebrite', name: 'Lite-Brite', icon: '💡', desc: 'Create with light' },
    { id: 'scholastic', name: 'Book Order', icon: '📚', desc: 'Circle your picks' },
    { id: 'furby', name: 'Furby', icon: '🧸', desc: 'Dah boo-loo!' },
    { id: 'askjeeves', name: 'Ask Jeeves', icon: '🎩', desc: 'Ask the butler' },
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
    loadingToy = heavyToys[id] || null;

    setTimeout(() => {
      activeObject = id;
      isLoading = false;
      loadingToy = null;
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

  let shareTooltip = $state('\u{1F517}');

  function copyShareLink() {
    const url = `${window.location.origin}/#${activeObject}`;
    navigator.clipboard.writeText(url).then(() => {
      shareTooltip = '\u2713 Copied!';
      playSound('success');
      setTimeout(() => { shareTooltip = '\u{1F517}'; }, 2000);
    }).catch(() => {
      shareTooltip = '\u2717 Failed';
      setTimeout(() => { shareTooltip = '\u{1F517}'; }, 2000);
    });
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

  // Deterministic visitor count: base + days since Jan 1, 2025 * multiplier
  const visitorNumber = $derived.by(() => {
    const base = 12847;
    const refDate = new Date('2025-01-01T00:00:00Z');
    const now = new Date();
    const daysSinceRef = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return base + daysSinceRef * 37;
  });

  function openRandomToy() {
    playSound('coin', 0.3);
    const randomIndex = Math.floor(Math.random() * shelfObjects.length);
    const randomToy = shelfObjects[randomIndex];
    openObject(randomToy.id);
  }

  onMount(() => {
    // Initialize hunt and register shelf spots
    initializeHunt();
    registerSpots('shelf', shelfHidingSpots);
    const beanies = getBeaniesForArea('shelf');
    shelfBeanie = beanies.get('behind-wood') || null;
    discoveryStats = getDiscoveryStats();

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
      <p class="tagline">25 interactive toys from the Scholastic shelf of your childhood. Click one, lose an hour.</p>
      <button class="collection-btn" onclick={() => { playSound('collect', 0.3); showGallery = true; }}>
        🎒 {discoveryStats.discovered}/{discoveryStats.total}
      </button>
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

        <div class="shelf-items" role="grid" aria-label="Toy shelf">
          {#each getCurrentPageItems() as obj, i}
            <button
              class="shelf-item nes-pointer toy-{obj.id}"
              class:focused={focusedIndex === i && !activeObject}
              onclick={() => openObject(obj.id)}
              title={obj.desc}
              tabindex={focusedIndex === i ? 0 : -1}
              style="animation-delay: {i * 0.08}s"
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

    <p class="hint nes-text is-disabled" aria-live="polite">
      {#if activeObject}
        swipe down or press ESC to close
      {:else}
        click an object to explore · use arrow keys to navigate
      {/if}
    </p>

    {#if !activeObject}
      <button class="lucky-btn" onclick={openRandomToy}>
        <span class="lucky-icon">&#9733;</span> I'm Feeling Lucky
      </button>

      <footer class="retro-footer">
        <div class="footer-separator"></div>
        <div class="footer-content">
          <div class="footer-row">
            <span class="footer-credit">
              Built by <a href="https://github.com/sean" target="_blank" rel="noopener noreferrer">Sean</a>
            </span>
            <span class="footer-divider">|</span>
            <a href="https://github.com/sean/fun" target="_blank" rel="noopener noreferrer" class="footer-link">
              View Source
            </a>
          </div>
          <div class="footer-badges">
            <span class="tech-badge">SvelteKit</span>
            <span class="tech-badge">TypeScript</span>
            <span class="tech-badge">Howler.js</span>
            <span class="tech-badge">Three.js</span>
            <span class="tech-badge">p5.js</span>
          </div>
          <p class="footer-flavor">Best viewed in Netscape Navigator 4.0 at 800x600</p>

          <!-- Retro Hit Counter -->
          <div class="hit-counter">
            <span class="hit-counter-label">You are visitor</span>
            <div class="hit-counter-digits">
              {#each String(visitorNumber).padStart(6, '0') as digit}
                <span class="hit-digit">{digit}</span>
              {/each}
            </div>
            <span class="hit-counter-since">since 1997</span>
          </div>
        </div>
      </footer>
    {/if}
  </main>
</div>

{#if isLoading}
  {#if loadingToy}
    <div class="loading-overlay">
      <ToyLoader toy={loadingToy} />
    </div>
  {:else}
    <div class="loading-overlay">
      <LoadingState message="Loading..." />
    </div>
  {/if}
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
{:else if activeObject === 'slimevolleyball'}
  <div class="object-view" role="dialog" aria-label="Slime Volleyball">
    <SlimeVolleyball onClose={closeObject} />
  </div>
{:else if activeObject === 'mash'}
  <div class="object-view" role="dialog" aria-label="MASH">
    <MASH onClose={closeObject} />
  </div>
{:else if activeObject === 'cootiecatcher'}
  <div class="object-view" role="dialog" aria-label="Cootie Catcher">
    <CootieCatcher onClose={closeObject} />
  </div>
{:else if activeObject === 'bados'}
  <div class="object-view" role="dialog" aria-label="BadOS XP">
    <BadOS onClose={closeObject} />
  </div>
{:else if activeObject === 'bopit'}
  <div class="object-view" role="dialog" aria-label="Bop It">
    <BopIt onClose={closeObject} />
  </div>
{:else if activeObject === 'marblemaze'}
  <div class="object-view" role="dialog" aria-label="Marble Maze">
    <MarbleMaze onClose={closeObject} />
  </div>
{:else if activeObject === 'napster'}
  <div class="object-view" role="dialog" aria-label="LimeWire">
    <Napster onClose={closeObject} />
  </div>
{:else if activeObject === 'litebrite'}
  <div class="object-view" role="dialog" aria-label="Lite-Brite">
    <LiteBrite onClose={closeObject} />
  </div>
{:else if activeObject === 'scholastic'}
  <div class="object-view" role="dialog" aria-label="Scholastic Book Order">
    <ScholasticOrder onClose={closeObject} />
  </div>
{:else if activeObject === 'furby'}
  <div class="object-view" role="dialog" aria-label="Furby">
    <Furby onClose={closeObject} />
  </div>
{:else if activeObject === 'askjeeves'}
  <div class="object-view" role="dialog" aria-label="Ask Jeeves">
    <AskJeeves onClose={closeObject} />
  </div>
{/if}

{#if activeObject}
  <button
    class="share-btn"
    onclick={copyShareLink}
    title="Copy link to this toy"
  >
    {shareTooltip}
  </button>
{/if}

{#if showGallery}
  <BeanieGallery onClose={() => { showGallery = false; discoveryStats = getDiscoveryStats(); }} />
{/if}

{#if showCRTBoot}
  <CRTBoot onComplete={() => { showCRTBoot = false; }} />
{/if}

<style>
  .crt-container {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    overflow-x: hidden;
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

  .tagline {
    font-size: 0.5rem;
    color: #aaa;
    max-width: 400px;
    margin: 0.5rem auto 0;
    text-align: center;
  }

  .collection-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.6rem;
    padding: 0.3rem 0.7rem;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid #555;
    border-radius: 6px;
    color: #ccc;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .collection-btn:hover {
    border-color: #f7d51d;
    color: #f7d51d;
    background: rgba(247, 213, 29, 0.1);
    transform: scale(1.05);
  }

  .collection-btn:active {
    transform: scale(0.97);
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
    opacity: 0;
    animation: shelfItemEnter 0.4s ease-out forwards;
  }

  @keyframes shelfItemEnter {
    0% {
      opacity: 0;
      transform: translateY(20px) scale(0.9);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
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

  .share-btn {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 600;
    background: rgba(33, 37, 41, 0.9);
    border: 2px solid #555;
    color: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-family: 'Press Start 2P', monospace;
    transition: all 0.2s;
    min-width: 40px;
    text-align: center;
  }

  .share-btn:hover {
    border-color: #f7d51d;
    background: rgba(33, 37, 41, 1);
  }

  @media (max-width: 600px) {
    .main-content {
      padding: 1rem;
      padding-top: calc(1rem + env(safe-area-inset-top, 0));
    }

    .site-header {
      margin-bottom: 1rem;
    }

    .site-header h1 {
      font-size: 1.1rem;
    }

    .tagline {
      max-width: 90vw;
      padding: 0 0.5rem;
    }

    .shelf-container {
      padding: 1rem !important;
    }

    .item-icon {
      font-size: 2rem;
    }

    .share-btn {
      bottom: calc(12px + env(safe-area-inset-bottom, 0));
      left: 12px;
      padding: 10px 14px;
      min-width: 44px;
      min-height: 44px;
    }
  }

  /* ── Idle micro-animations per toy ── */

  @keyframes idle-wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(2.5deg); }
    75% { transform: rotate(-2.5deg); }
  }

  @keyframes idle-hue {
    0%, 100% { filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.5)) hue-rotate(0deg); }
    50% { filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.5)) hue-rotate(30deg); }
  }

  @keyframes idle-slither {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(2px); }
    75% { transform: translateX(-2px); }
  }

  @keyframes idle-pulse {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.08); }
  }

  @keyframes idle-nod {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(3deg); }
    60% { transform: rotate(-2deg); }
  }

  @keyframes idle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes idle-plod {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(2px); }
  }

  @keyframes idle-swim {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(2px) rotate(1.5deg); }
    75% { transform: translateX(-2px) rotate(-1.5deg); }
  }

  @keyframes idle-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes idle-flutter {
    0%, 100% { transform: rotate(0deg) skewX(0deg); }
    25% { transform: rotate(0.8deg) skewX(0.5deg); }
    75% { transform: rotate(-0.8deg) skewX(-0.5deg); }
  }

  @keyframes idle-flicker {
    0%, 100% { opacity: 1; }
    48% { opacity: 1; }
    50% { opacity: 0.7; }
    52% { opacity: 1; }
    80% { opacity: 1; }
    82% { opacity: 0.75; }
    84% { opacity: 1; }
  }

  @keyframes idle-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }

  @keyframes idle-blink {
    0%, 40%, 60%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.15); }
  }

  @keyframes idle-rainbow {
    0% { filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.5)) hue-rotate(0deg); }
    100% { filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.5)) hue-rotate(360deg); }
  }

  @keyframes idle-jiggle {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-1px, 1px); }
    40% { transform: translate(1px, -1px); }
    60% { transform: translate(-1px, 0); }
    80% { transform: translate(1px, 1px); }
  }

  @keyframes idle-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes idle-ring {
    0%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(2deg); }
    20% { transform: rotate(-2deg); }
    30% { transform: rotate(1.5deg); }
    40% { transform: rotate(-1.5deg); }
    50%, 100% { transform: rotate(0deg); }
  }

  @keyframes idle-glitch {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-1px, 0); }
    40% { transform: translate(1px, 1px); }
    60% { transform: translate(0, -1px); }
    80% { transform: translate(1px, 0); }
  }

  /* Tamagotchi - gentle wobble */
  .toy-tamagotchi .item-icon { animation: idle-wobble 3s ease-in-out infinite; animation-delay: 0s; }
  /* Kid Pix - hue shift */
  .toy-kidpix .item-icon { animation: idle-hue 5s ease-in-out infinite; animation-delay: 0.4s; }
  /* Snake - slither wave */
  .toy-snake .item-icon { animation: idle-slither 3.5s ease-in-out infinite; animation-delay: 0.8s; }
  /* Winamp - EQ pulse */
  .toy-winamp .item-icon { animation: idle-pulse 2.5s ease-in-out infinite; animation-delay: 1.2s; }
  /* Clippy - tiny nod */
  .toy-clippy .item-icon { animation: idle-nod 4s ease-in-out infinite; animation-delay: 0.3s; }
  /* AIM - float */
  .toy-aim .item-icon { animation: idle-float 4s ease-in-out infinite; animation-delay: 1.5s; }
  /* Oregon Trail - slow plod */
  .toy-oregontrail .item-icon { animation: idle-plod 5s ease-in-out infinite; animation-delay: 0.7s; }
  /* Fish Tank - swim drift */
  .toy-fishtank .item-icon { animation: idle-swim 4.5s ease-in-out infinite; animation-delay: 0.2s; }
  /* Pogs - slow spin */
  .toy-pogs .item-icon { animation: idle-spin 8s linear infinite; animation-delay: 1s; }
  /* MASH - paper flutter */
  .toy-mash .item-icon { animation: idle-flutter 4s ease-in-out infinite; animation-delay: 0.6s; }
  /* BadOS - screen flicker */
  .toy-bados .item-icon { animation: idle-flicker 5s step-end infinite; animation-delay: 2s; }
  /* Cootie Catcher - breathe pulse */
  .toy-cootiecatcher .item-icon { animation: idle-breathe 4s ease-in-out infinite; animation-delay: 1.3s; }
  /* Magic Eye - slow blink */
  .toy-magiceye .item-icon { animation: idle-blink 6s ease-in-out infinite; animation-delay: 0.9s; }
  /* Lisa Frank - rainbow cycle */
  .toy-lisafrank .item-icon { animation: idle-rainbow 6s linear infinite; animation-delay: 0.5s; }
  /* Koosh Ball - jiggle */
  .toy-koosh .item-icon { animation: idle-jiggle 3s ease-in-out infinite; animation-delay: 1.8s; }
  /* Slime Volleyball - gentle bounce */
  .toy-slimevolleyball .item-icon { animation: idle-bounce 3s ease-in-out infinite; animation-delay: 0.1s; }
  /* Dial-Up Modem - ring vibrate */
  .toy-modem .item-icon { animation: idle-ring 4s ease-in-out infinite; animation-delay: 1.6s; }
  /* Screensaver - flicker */
  .toy-screensaver .item-icon { animation: idle-flicker 6s step-end infinite; animation-delay: 2.5s; }
  /* Bop It - bouncing */
  .toy-bopit .item-icon { animation: idle-bounce 2.5s ease-in-out infinite; animation-delay: 0.4s; }
  /* Marble Maze - slow roll */
  .toy-marblemaze .item-icon { animation: idle-spin 10s linear infinite; animation-delay: 1.8s; }
  /* LimeWire - pulse */
  .toy-napster .item-icon { animation: idle-pulse 3s ease-in-out infinite; animation-delay: 0.9s; }
  /* Lite-Brite - glow flicker */
  .toy-litebrite .item-icon { animation: idle-flicker 4s step-end infinite; animation-delay: 1.2s; }
  /* Scholastic Book Order - paper flutter */
  .toy-scholastic .item-icon { animation: idle-flutter 4s ease-in-out infinite; animation-delay: 2.0s; }
  /* Furby - wobble */
  .toy-furby .item-icon { animation: idle-wobble 3s ease-in-out infinite; animation-delay: 0.6s; }
  /* Ask Jeeves - nod */
  .toy-askjeeves .item-icon { animation: idle-nod 4s ease-in-out infinite; animation-delay: 1.5s; }

  @media (prefers-reduced-motion: reduce) {
    .shelf-item {
      animation: none;
      opacity: 1;
    }

    .shelf-item .item-icon {
      animation: none !important;
      filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5)) !important;
    }

    .shelf-item:hover,
    .shelf-item.focused {
      transform: none;
    }

    .object-view {
      animation: none;
    }
  }

  /* Retro Footer */
  .retro-footer {
    width: 100%;
    max-width: 700px;
    margin-top: 2rem;
    padding-bottom: 1rem;
  }

  .footer-separator {
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #555 20%, #666 50%, #555 80%, transparent 100%);
    margin-bottom: 1.2rem;
  }

  .footer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }

  .footer-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.4rem;
    color: #666;
  }

  .footer-credit a,
  .footer-link {
    color: #888;
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-credit a:hover,
  .footer-link:hover {
    color: #f7d51d;
    text-decoration: underline;
  }

  .footer-divider {
    color: #444;
    user-select: none;
  }

  .footer-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }

  .tech-badge {
    font-size: 0.35rem;
    color: #777;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid #444;
    padding: 0.15rem 0.4rem;
    border-radius: 2px;
    letter-spacing: 0.5px;
  }

  .footer-flavor {
    font-size: 0.35rem;
    color: #555;
    text-align: center;
    margin: 0;
    font-style: italic;
  }

  /* "I'm Feeling Lucky" Button */
  .lucky-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.8rem;
    padding: 0.5rem 1.2rem;
    background: linear-gradient(180deg, #3a3a5c 0%, #2a2a3e 100%);
    border: 3px solid #f7d51d;
    border-radius: 6px;
    color: #f7d51d;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.45rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
    box-shadow: 0 4px 0 #1a1a2e, 0 6px 12px rgba(0, 0, 0, 0.3);
  }

  .lucky-btn:hover {
    background: linear-gradient(180deg, #4a4a6c 0%, #3a3a4e 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #1a1a2e, 0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .lucky-btn:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #1a1a2e, 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .lucky-icon {
    font-size: 0.6rem;
    animation: luckySpin 3s linear infinite;
  }

  @keyframes luckySpin {
    0%, 100% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(15deg) scale(1.1); }
    50% { transform: rotate(0deg) scale(1); }
    75% { transform: rotate(-15deg) scale(1.1); }
  }

  /* Retro Hit Counter */
  .hit-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.4rem;
  }

  .hit-counter-label {
    font-size: 0.3rem;
    color: #666;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .hit-counter-digits {
    display: flex;
    gap: 2px;
    background: #0a0a0a;
    border: 2px solid #333;
    border-radius: 3px;
    padding: 0.3rem 0.4rem;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .hit-digit {
    font-family: 'Press Start 2P', 'Courier New', monospace;
    font-size: 0.5rem;
    color: #33ff33;
    text-shadow: 0 0 6px rgba(51, 255, 51, 0.6), 0 0 12px rgba(51, 255, 51, 0.3);
    min-width: 0.6rem;
    text-align: center;
    line-height: 1;
  }

  .hit-counter-since {
    font-size: 0.25rem;
    color: #555;
    letter-spacing: 1px;
    font-style: italic;
  }

  @media (max-width: 600px) {
    .retro-footer {
      margin-top: 1.5rem;
      padding: 0 0.5rem 1rem;
    }

    .footer-row {
      font-size: 0.35rem;
    }

    .tech-badge {
      font-size: 0.3rem;
    }

    .footer-flavor {
      font-size: 0.3rem;
    }

    .lucky-btn {
      font-size: 0.4rem;
      padding: 0.45rem 1rem;
    }

    .hit-digit {
      font-size: 0.4rem;
      min-width: 0.5rem;
    }

    .hit-counter-label {
      font-size: 0.25rem;
    }

    .hit-counter-since {
      font-size: 0.22rem;
    }
  }
</style>
