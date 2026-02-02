<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'in-book-box' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Book catalog data
  interface Book {
    id: number;
    title: string;
    author: string;
    price: number;
    color: string;
    textColor: string;
    section: 'arrow' | 'tab' | 'trumpet';
    isNew?: boolean;
    teachersPick?: boolean;
    series?: string;
  }

  const books: Book[] = [
    // Arrow Book Club (younger readers)
    { id: 1, title: 'Dinosaurs Before Dark', author: 'Mary Pope Osborne', price: 2.95, color: '#2d8a4e', textColor: '#fff', section: 'arrow', series: 'Magic Tree House #1' },
    { id: 2, title: 'Junie B. Jones and the Stupid Smelly Bus', author: 'Barbara Park', price: 2.50, color: '#e8a0bf', textColor: '#333', section: 'arrow', isNew: true },
    { id: 3, title: 'The Boxcar Children', author: 'Gertrude Chandler Warner', price: 3.50, color: '#8b4513', textColor: '#fff', section: 'arrow' },
    { id: 4, title: 'Amelia Bedelia', author: 'Peggy Parish', price: 1.99, color: '#f5c242', textColor: '#333', section: 'arrow' },
    { id: 5, title: 'The Adventures of Captain Underpants', author: 'Dav Pilkey', price: 3.95, color: '#fff', textColor: '#333', section: 'arrow', isNew: true, teachersPick: true },
    { id: 6, title: 'Clifford the Big Red Dog', author: 'Norman Bridwell', price: 2.25, color: '#cc2222', textColor: '#fff', section: 'arrow' },

    // Tab Book Club (middle readers)
    { id: 7, title: 'Say Cheese and Die!', author: 'R.L. Stine', price: 3.50, color: '#1a1a2e', textColor: '#4ade80', section: 'tab', series: 'Goosebumps #4' },
    { id: 8, title: 'Monster Blood', author: 'R.L. Stine', price: 3.50, color: '#0d2b0d', textColor: '#22ee22', section: 'tab', series: 'Goosebumps #3' },
    { id: 9, title: 'Night of the Living Dummy', author: 'R.L. Stine', price: 3.50, color: '#2d1b4e', textColor: '#c084fc', section: 'tab', series: 'Goosebumps #7' },
    { id: 10, title: 'The Invasion', author: 'K.A. Applegate', price: 3.99, color: '#1e3a5f', textColor: '#60a5fa', section: 'tab', series: 'Animorphs #1', isNew: true },
    { id: 11, title: 'The Visitor', author: 'K.A. Applegate', price: 3.99, color: '#1a4a1a', textColor: '#4ade80', section: 'tab', series: 'Animorphs #2' },
    { id: 12, title: 'The Baby-Sitters Club #1', author: 'Ann M. Martin', price: 3.25, color: '#ff69b4', textColor: '#fff', section: 'tab' },
    { id: 13, title: 'Scary Stories to Tell in the Dark', author: 'Alvin Schwartz', price: 3.95, color: '#111', textColor: '#dc2626', section: 'tab' },

    // Trumpet Book Club (older readers)
    { id: 14, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling', price: 4.99, color: '#7c2d12', textColor: '#fbbf24', section: 'trumpet', isNew: true, teachersPick: false },
    { id: 15, title: 'The Bad Beginning', author: 'Lemony Snicket', price: 3.99, color: '#292524', textColor: '#e7e5e4', section: 'trumpet', series: 'A Series of Unfortunate Events #1', isNew: true },
    { id: 16, title: 'Holes', author: 'Louis Sachar', price: 3.95, color: '#ca8a04', textColor: '#fff', section: 'trumpet' },
    { id: 17, title: 'Hatchet', author: 'Gary Paulsen', price: 3.50, color: '#365314', textColor: '#d9f99d', section: 'trumpet' },
    { id: 18, title: 'Bridge to Terabithia', author: 'Katherine Paterson', price: 2.99, color: '#0e7490', textColor: '#ecfeff', section: 'trumpet' },
    { id: 19, title: 'Number the Stars', author: 'Lois Lowry', price: 3.25, color: '#1e3a5f', textColor: '#fde68a', section: 'trumpet' },
    { id: 20, title: 'Walk Two Moons', author: 'Sharon Creech', price: 3.50, color: '#7e22ce', textColor: '#e9d5ff', section: 'trumpet' },
  ];

  // State
  let circledBooks = $state<Set<number>>(new Set());
  let orderPhase = $state<'browsing' | 'collecting' | 'waiting' | 'arriving' | 'opening' | 'celebrating'>('browsing');
  let currentPage = $state<0 | 1 | 2>(0);
  let calendarDays = $state(0);
  let boxLidOpen = $state(false);

  // Sections for each page
  const sections = ['arrow', 'tab', 'trumpet'] as const;
  const sectionNames: Record<string, string> = {
    arrow: 'Arrow Book Club',
    tab: 'Tab Book Club',
    trumpet: 'Trumpet Book Club',
  };
  const sectionSubtitles: Record<string, string> = {
    arrow: 'Grades K-3',
    tab: 'Grades 3-5',
    trumpet: 'Grades 5-8',
  };

  let currentSection = $derived(sections[currentPage]);
  let currentBooks = $derived(books.filter(b => b.section === currentSection));

  let orderTotal = $derived(
    books.filter(b => circledBooks.has(b.id)).reduce((sum, b) => sum + b.price, 0)
  );

  let orderedBooks = $derived(books.filter(b => circledBooks.has(b.id)));
  let hasOrder = $derived(circledBooks.size > 0);
  let freePosters = $derived(orderTotal >= 10);

  function toggleCircle(bookId: number) {
    if (orderPhase !== 'browsing') return;
    const next = new Set(circledBooks);
    if (next.has(bookId)) {
      next.delete(bookId);
    } else {
      next.add(bookId);
      playSound('click', 0.2);
    }
    circledBooks = next;
  }

  function submitOrder() {
    if (!hasOrder || orderPhase !== 'browsing') return;
    playSound('success', 0.3);
    orderPhase = 'collecting';

    setTimeout(() => {
      orderPhase = 'waiting';
      calendarDays = 0;
      // Animate calendar days
      const calInterval = setInterval(() => {
        calendarDays += 1;
        if (calendarDays >= 42) {
          clearInterval(calInterval);
          setTimeout(() => {
            orderPhase = 'arriving';
            playSound('whoosh', 0.3);
            setTimeout(() => {
              orderPhase = 'opening';
            }, 1500);
          }, 400);
        }
      }, 40);
    }, 2500);
  }

  function openBox() {
    if (orderPhase !== 'opening') return;
    boxLidOpen = true;
    playSound('pop', 0.4);
    setTimeout(() => {
      orderPhase = 'celebrating';
      playSound('success', 0.5);
    }, 800);
  }

  function resetOrder() {
    orderPhase = 'browsing';
    circledBooks = new Set();
    boxLidOpen = false;
    calendarDays = 0;
    currentPage = 0;
  }

  onMount(() => {
    registerSpots('scholastic', hidingSpots);
    const beanies = getBeaniesForArea('scholastic');
    const beanieEntry = beanies.get('in-book-box');
    if (beanieEntry) {
      hiddenBeanie = beanieEntry;
    }
  });
</script>

<div class="scholastic-wrapper">
  <CloseButton onClose={onClose} variant="dark" />

  {#if orderPhase === 'browsing'}
    <!-- Main catalog view -->
    <div class="catalog">
      <!-- Red Scholastic header -->
      <div class="catalog-header">
        <div class="header-accent-bar"></div>
        <div class="header-content">
          <div class="scholastic-logo">
            <span class="logo-text">SCHOLASTIC</span>
            <span class="logo-sub">BOOK CLUBS</span>
          </div>
          <div class="header-tagline">Monthly Book Order Form</div>
        </div>
        <div class="header-accent-bar"></div>
      </div>

      <!-- Free poster banner -->
      <div class="promo-banner" class:earned={freePosters}>
        {#if freePosters}
          FREE POSTER EARNED! Your order is over $10!
        {:else}
          FREE POSTER with any order over $10!
        {/if}
      </div>

      <!-- Section tabs -->
      <div class="section-tabs">
        {#each sections as section, i}
          <button
            class="section-tab"
            class:active={currentPage === i}
            onclick={() => { currentPage = i as 0 | 1 | 2; }}
          >
            <span class="tab-name">{sectionNames[section]}</span>
            <span class="tab-grades">{sectionSubtitles[section]}</span>
          </button>
        {/each}
      </div>

      <!-- Section header -->
      <div class="section-header">
        <h2>{sectionNames[currentSection]}</h2>
        <span class="section-grade">{sectionSubtitles[currentSection]}</span>
      </div>

      <!-- Book grid -->
      <div class="book-grid">
        {#each currentBooks as book (book.id)}
          <button
            class="book-item"
            class:circled={circledBooks.has(book.id)}
            onclick={() => toggleCircle(book.id)}
            aria-label="{book.title} by {book.author} - ${book.price.toFixed(2)}{circledBooks.has(book.id) ? ' (selected)' : ''}"
          >
            <!-- Pencil circle overlay -->
            {#if circledBooks.has(book.id)}
              <svg class="pencil-circle" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="100" cy="100" rx="90" ry="85" fill="none" stroke="#444" stroke-width="2.5"
                  stroke-dasharray="800"
                  stroke-dashoffset="0"
                  transform="rotate(-5, 100, 100)"
                  style="filter: url(#pencil-rough)"
                />
                <ellipse cx="100" cy="100" rx="92" ry="82" fill="none" stroke="#555" stroke-width="1"
                  stroke-dasharray="12 8"
                  transform="rotate(3, 100, 100)"
                  opacity="0.4"
                />
              </svg>
            {/if}

            <!-- Badges -->
            <div class="badges">
              {#if book.isNew}
                <span class="badge badge-new">NEW!</span>
              {/if}
              {#if book.teachersPick}
                <span class="badge badge-teacher">Teacher's Pick</span>
              {/if}
            </div>

            <!-- Book cover -->
            <div class="book-cover" style="background-color: {book.color}; color: {book.textColor};">
              <div class="cover-inner">
                {#if book.series}
                  <span class="cover-series">{book.series}</span>
                {/if}
                <span class="cover-title">{book.title}</span>
                <span class="cover-author">{book.author}</span>
              </div>
            </div>

            <!-- Book info -->
            <div class="book-info">
              <div class="book-title">{book.title}</div>
              <div class="book-author">by {book.author}</div>
              <div class="book-price">${book.price.toFixed(2)}</div>
            </div>

            <!-- Circle-to-order area -->
            <div class="order-circle-area">
              <div class="order-circle" class:filled={circledBooks.has(book.id)}>
                {#if circledBooks.has(book.id)}
                  <span class="checkmark">&#10003;</span>
                {/if}
              </div>
              <span class="order-label">Circle to order</span>
            </div>
          </button>
        {/each}
      </div>

      <!-- Fold crease overlays -->
      <div class="fold-crease fold-crease-h"></div>
      <div class="fold-crease fold-crease-v"></div>

      <!-- SVG filter for pencil roughness -->
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <filter id="pencil-rough">
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
          </filter>
        </defs>
      </svg>
    </div>

    <!-- Order total bar -->
    <div class="order-bar">
      <div class="order-bar-inner">
        <div class="order-summary">
          <span class="order-count">{circledBooks.size} item{circledBooks.size !== 1 ? 's' : ''} selected</span>
          <span class="order-total">ORDER TOTAL: <strong>${orderTotal.toFixed(2)}</strong></span>
        </div>
        <button
          class="submit-button"
          class:active={hasOrder}
          onclick={submitOrder}
          disabled={!hasOrder}
        >
          Turn In Order
        </button>
      </div>
    </div>

  {:else if orderPhase === 'collecting'}
    <!-- Teacher collecting orders -->
    <div class="delivery-scene">
      <div class="scene-content collecting">
        <div class="teacher-desk">
          <div class="desk-surface"></div>
          <div class="paper-stack">
            {#each Array(5) as _, i}
              <div class="paper-sheet" style="transform: rotate({(i - 2) * 3}deg); animation-delay: {i * 0.2}s;"></div>
            {/each}
          </div>
        </div>
        <p class="scene-text">Your teacher is collecting orders...</p>
        <p class="scene-subtext">Make sure your name is on it!</p>
      </div>
    </div>

  {:else if orderPhase === 'waiting'}
    <!-- Waiting 4-6 weeks -->
    <div class="delivery-scene">
      <div class="scene-content waiting">
        <div class="calendar">
          <div class="calendar-header">
            <span>WAITING...</span>
          </div>
          <div class="calendar-grid">
            {#each Array(42) as _, i}
              <div
                class="calendar-day"
                class:passed={i < calendarDays}
                class:today={i === calendarDays}
              >
                {i + 1}
              </div>
            {/each}
          </div>
        </div>
        <p class="scene-text">4-6 weeks delivery time...</p>
        <div class="waiting-dots">
          <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
        </div>
      </div>
    </div>

  {:else if orderPhase === 'arriving' || orderPhase === 'opening'}
    <!-- Box arriving / ready to open -->
    <div class="delivery-scene">
      <div class="scene-content arriving">
        <div class="box-wrapper" class:clickable={orderPhase === 'opening'}>
          <button
            class="cardboard-box"
            class:arrived={orderPhase === 'opening'}
            class:lid-open={boxLidOpen}
            onclick={openBox}
            disabled={orderPhase !== 'opening'}
            aria-label="Click to open your book order"
          >
            <div class="box-lid">
              <div class="box-lid-front">SCHOLASTIC</div>
            </div>
            <div class="box-body">
              <div class="box-label">
                <span class="box-to">TO:</span>
                <span class="box-name">YOUR NAME</span>
                <span class="box-class">Mrs. Johnson's Class</span>
              </div>
            </div>
            <div class="box-shadow"></div>
          </button>
          {#if orderPhase === 'opening' && !boxLidOpen}
            <p class="tap-hint">Click to open!</p>
          {/if}
        </div>
        {#if orderPhase === 'arriving'}
          <p class="scene-text arriving-text">A box is here for you!</p>
        {/if}
      </div>
    </div>

  {:else if orderPhase === 'celebrating'}
    <!-- Books revealed! -->
    <div class="delivery-scene celebration">
      <div class="scene-content celebrate">
        <div class="confetti-container">
          {#each Array(30) as _, i}
            <div
              class="confetti"
              style="
                left: {Math.random() * 100}%;
                animation-delay: {Math.random() * 2}s;
                background-color: hsl({Math.random() * 360}, 80%, 60%);
                width: {4 + Math.random() * 8}px;
                height: {4 + Math.random() * 8}px;
              "
            ></div>
          {/each}
        </div>

        <h2 class="celebrate-title">Your books are here!</h2>

        <div class="revealed-books">
          {#each orderedBooks as book, i}
            <div class="revealed-book" style="animation-delay: {i * 0.15}s;">
              <div class="revealed-cover" style="background-color: {book.color}; color: {book.textColor};">
                <span class="revealed-cover-title">{book.title}</span>
              </div>
            </div>
          {/each}
        </div>

        {#if freePosters}
          <div class="free-poster-reveal">
            + Your FREE poster!
          </div>
        {/if}

        <!-- Beanie hiding spot: inside the book box -->
        {#if hiddenBeanie}
          <div class="beanie-spot">
            <HidingBeanie beanie={hiddenBeanie} class="box-beanie" />
          </div>
        {/if}

        <button class="order-again-btn" onclick={resetOrder}>
          Order Again
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ======== Base Layout ======== */
  .scholastic-wrapper {
    position: fixed;
    inset: 0;
    background: #3a3632;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100;
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  /* ======== Catalog ======== */
  .catalog {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background:
      /* Newsprint texture */
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.015) 2px,
        rgba(0,0,0,0.015) 4px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 3px,
        rgba(0,0,0,0.01) 3px,
        rgba(0,0,0,0.01) 6px
      ),
      /* Slight warmth variation */
      radial-gradient(ellipse at 30% 20%, #f5ecd5 0%, #efe4c9 40%, #e8dbb8 100%);
    position: relative;
    padding-bottom: 80px;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M3 21l1.5-4.5L17.5 3.5c.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8L7.5 19.5z' fill='%23f4c542' stroke='%23333' stroke-width='1'/%3E%3Cpath d='M3 21l1.5-4.5 3 3z' fill='%23e8a0a0'/%3E%3Cline x1='16' y1='5' x2='19' y2='8' stroke='%23333' stroke-width='0.5'/%3E%3C/svg%3E") 2 22, crosshair;
  }

  /* Fold creases */
  .fold-crease {
    position: fixed;
    pointer-events: none;
    z-index: 5;
  }
  .fold-crease-h {
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0,0,0,0.06) 20%,
      rgba(0,0,0,0.08) 50%,
      rgba(0,0,0,0.06) 80%,
      transparent 100%
    );
  }
  .fold-crease-v {
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0,0,0,0.05) 20%,
      rgba(0,0,0,0.07) 50%,
      rgba(0,0,0,0.05) 80%,
      transparent 100%
    );
  }

  /* ======== Header ======== */
  .catalog-header {
    background: #cc1c1c;
    padding: 0;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .header-accent-bar {
    height: 4px;
    background: linear-gradient(90deg, #f7d51d, #fff, #f7d51d, #fff, #f7d51d);
  }
  .header-content {
    padding: 10px 16px;
  }
  .scholastic-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  .logo-text {
    font-family: 'Arial Black', 'Helvetica', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 6px;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
    line-height: 1;
  }
  .logo-sub {
    font-family: 'Arial', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #fde68a;
    letter-spacing: 8px;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .header-tagline {
    font-family: 'Arial', sans-serif;
    font-size: 10px;
    color: rgba(255,255,255,0.7);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  /* ======== Promo Banner ======== */
  .promo-banner {
    background: #fff3cd;
    border: 2px dashed #cc1c1c;
    color: #cc1c1c;
    text-align: center;
    padding: 6px 16px;
    font-family: 'Arial', sans-serif;
    font-size: 13px;
    font-weight: 700;
    margin: 8px 12px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
  }
  .promo-banner.earned {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
    animation: banner-pulse 1s ease-in-out 2;
  }
  @keyframes banner-pulse {
    50% { transform: scale(1.03); }
  }

  /* ======== Section Tabs ======== */
  .section-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 12px 0;
    background: #efe4c9;
    border-bottom: 2px solid #d4c9a8;
  }
  .section-tab {
    flex: 1;
    padding: 8px 6px 6px;
    border: 2px solid #bbb;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    background: #e0d5b8;
    cursor: pointer;
    text-align: center;
    font-family: 'Arial', sans-serif;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .section-tab.active {
    background: #f5ecd5;
    border-color: #999;
    margin-bottom: -2px;
    padding-bottom: 8px;
    z-index: 1;
  }
  .section-tab:hover:not(.active) {
    background: #e8ddc0;
  }
  .tab-name {
    font-size: 11px;
    font-weight: 700;
    color: #333;
    line-height: 1.2;
  }
  .tab-grades {
    font-size: 9px;
    color: #777;
  }

  /* ======== Section Header ======== */
  .section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 16px 4px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    margin: 0 12px;
  }
  .section-header h2 {
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 18px;
    color: #333;
    margin: 0;
  }
  .section-grade {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    color: #888;
    font-style: italic;
  }

  /* ======== Book Grid ======== */
  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 12px 16px 20px;
  }

  .book-item {
    background: rgba(255,255,255,0.3);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 4px;
    padding: 10px 8px 8px;
    cursor: pointer;
    position: relative;
    text-align: left;
    font-family: inherit;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .book-item:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    background: rgba(255,255,255,0.5);
  }
  .book-item:active {
    transform: scale(0.98);
  }
  .book-item.circled {
    background: rgba(255, 255, 200, 0.5);
  }

  /* ======== Pencil Circle ======== */
  .pencil-circle {
    position: absolute;
    inset: -8px;
    width: calc(100% + 16px);
    height: calc(100% + 16px);
    pointer-events: none;
    z-index: 4;
    animation: draw-circle 0.4s ease-out forwards;
  }
  @keyframes draw-circle {
    from {
      opacity: 0;
      transform: scale(0.8) rotate(-10deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }

  /* ======== Badges ======== */
  .badges {
    position: absolute;
    top: -4px;
    right: -4px;
    display: flex;
    gap: 3px;
    z-index: 3;
  }
  .badge {
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Arial', sans-serif;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.2;
  }
  .badge-new {
    background: #ff3333;
    color: #fff;
    animation: badge-bounce 2s ease-in-out infinite;
  }
  .badge-teacher {
    background: #f7d51d;
    color: #333;
  }
  .badge-teacher::before {
    content: '\2605 ';
  }
  @keyframes badge-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  /* ======== Book Cover ======== */
  .book-cover {
    width: 90px;
    height: 120px;
    border-radius: 2px;
    box-shadow: 2px 2px 6px rgba(0,0,0,0.25), inset -1px -1px 0 rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 6px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .book-cover::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: rgba(0,0,0,0.15);
  }
  .cover-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
    width: 100%;
  }
  .cover-series {
    font-size: 7px;
    font-family: 'Arial', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
  }
  .cover-title {
    font-size: 9px;
    font-weight: 700;
    line-height: 1.2;
    word-break: break-word;
  }
  .cover-author {
    font-size: 7px;
    opacity: 0.7;
    font-style: italic;
  }

  /* ======== Book Info ======== */
  .book-info {
    width: 100%;
    text-align: center;
  }
  .book-title {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #222;
    line-height: 1.3;
    margin-bottom: 2px;
  }
  .book-author {
    font-family: 'Arial', sans-serif;
    font-size: 9px;
    color: #666;
    margin-bottom: 3px;
    font-style: italic;
  }
  .book-price {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 700;
    color: #cc1c1c;
  }

  /* ======== Circle-to-Order ======== */
  .order-circle-area {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .order-circle {
    width: 20px;
    height: 20px;
    border: 2px dashed #999;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .order-circle.filled {
    border-style: solid;
    border-color: #333;
    background: rgba(0,0,0,0.05);
  }
  .checkmark {
    font-size: 12px;
    color: #333;
    line-height: 1;
  }
  .order-label {
    font-family: 'Arial', sans-serif;
    font-size: 8px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  /* ======== Order Bar (Bottom) ======== */
  .order-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #2d2926;
    border-top: 3px solid #cc1c1c;
    padding: 10px 16px;
    z-index: 20;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .order-bar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 800px;
    margin: 0 auto;
  }
  .order-summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .order-count {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    color: #aaa;
  }
  .order-total {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    color: #f7d51d;
  }
  .order-total strong {
    font-size: 20px;
  }
  .submit-button {
    background: #666;
    color: #999;
    border: 2px solid #555;
    border-radius: 6px;
    padding: 10px 20px;
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 14px;
    cursor: not-allowed;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .submit-button.active {
    background: #cc1c1c;
    color: #fff;
    border-color: #a01515;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(204, 28, 28, 0.4);
  }
  .submit-button.active:hover {
    background: #dd2222;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(204, 28, 28, 0.5);
  }
  .submit-button.active:active {
    transform: translateY(0);
  }

  /* ======== Delivery Scenes ======== */
  .delivery-scene {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5ecd5;
    padding: 24px;
  }
  .scene-content {
    text-align: center;
    max-width: 400px;
    width: 100%;
  }
  .scene-text {
    font-family: 'Georgia', serif;
    font-size: 22px;
    color: #333;
    margin: 16px 0 4px;
    animation: fade-in 0.5s ease;
  }
  .scene-subtext {
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    color: #888;
    font-style: italic;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ======== Teacher's Desk Scene ======== */
  .teacher-desk {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  .desk-surface {
    width: 200px;
    height: 12px;
    background: linear-gradient(180deg, #8b6914, #a07828, #8b6914);
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  .paper-stack {
    position: relative;
    width: 120px;
    height: 80px;
    margin-top: -40px;
  }
  .paper-sheet {
    position: absolute;
    width: 80px;
    height: 60px;
    background: #fff;
    border: 1px solid #ddd;
    left: 50%;
    top: 50%;
    margin-left: -40px;
    margin-top: -30px;
    box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
    animation: paper-land 0.5s ease-out both;
  }
  @keyframes paper-land {
    from { opacity: 0; transform: translateY(-30px) rotate(0deg); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ======== Calendar Scene ======== */
  .calendar {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    overflow: hidden;
    margin: 0 auto 16px;
    max-width: 320px;
  }
  .calendar-header {
    background: #cc1c1c;
    color: #fff;
    padding: 10px;
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 16px;
    text-align: center;
    letter-spacing: 2px;
  }
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    padding: 8px;
  }
  .calendar-day {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    color: #999;
    border-radius: 4px;
    transition: all 0.1s ease;
  }
  .calendar-day.passed {
    background: #cc1c1c;
    color: #fff;
    font-weight: 700;
  }
  .calendar-day.today {
    background: #f7d51d;
    color: #333;
    font-weight: 700;
    transform: scale(1.15);
    box-shadow: 0 0 6px rgba(247, 213, 29, 0.5);
  }

  .waiting-dots {
    font-size: 32px;
    color: #999;
  }
  .dot {
    animation: dot-blink 1.4s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-blink {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  /* ======== Box Scene ======== */
  .box-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .box-wrapper.clickable {
    cursor: pointer;
  }
  .cardboard-box {
    position: relative;
    width: 220px;
    height: 160px;
    cursor: default;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    animation: box-arrive 0.6s ease-out;
  }
  .cardboard-box.arrived {
    cursor: pointer;
  }
  @keyframes box-arrive {
    from {
      opacity: 0;
      transform: translateY(-60px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .box-body {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(180deg, #c8a06e 0%, #b58d56 50%, #a37b44 100%);
    border: 2px solid #8b6914;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .box-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,0.85);
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 2px;
  }
  .box-to {
    font-family: 'Arial', sans-serif;
    font-size: 9px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .box-name {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }
  .box-class {
    font-family: 'Arial', sans-serif;
    font-size: 10px;
    color: #666;
    font-style: italic;
  }

  .box-lid {
    position: absolute;
    top: 0;
    left: -2px;
    right: -2px;
    height: 50px;
    background: linear-gradient(180deg, #d4aa7a 0%, #c49a68 100%);
    border: 2px solid #8b6914;
    border-radius: 4px 4px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: top center;
    transition: transform 0.6s ease;
    z-index: 2;
  }
  .box-lid-front {
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 12px;
    color: #8b6914;
    letter-spacing: 3px;
    opacity: 0.5;
  }

  .cardboard-box.lid-open .box-lid {
    transform: rotateX(-120deg);
  }

  .box-shadow {
    position: absolute;
    bottom: -8px;
    left: 10%;
    right: 10%;
    height: 8px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%);
  }

  .tap-hint {
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    color: #cc1c1c;
    animation: hint-bounce 1s ease-in-out infinite;
  }
  @keyframes hint-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  .arriving-text {
    animation: fade-in 0.5s ease 0.3s both;
  }

  /* ======== Celebration Scene ======== */
  .celebration {
    overflow: hidden;
    position: relative;
  }
  .celebrate-title {
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 28px;
    color: #cc1c1c;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    margin: 0 0 20px;
    animation: celebrate-pop 0.5s ease-out;
  }
  @keyframes celebrate-pop {
    from { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); }
    to { transform: scale(1); opacity: 1; }
  }

  .revealed-books {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-bottom: 16px;
  }
  .revealed-book {
    animation: book-pop 0.4s ease-out both;
  }
  @keyframes book-pop {
    from {
      transform: translateY(20px) scale(0.5);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
  .revealed-cover {
    width: 70px;
    height: 95px;
    border-radius: 3px;
    box-shadow: 2px 3px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    text-align: center;
  }
  .revealed-cover-title {
    font-size: 8px;
    font-weight: 700;
    line-height: 1.3;
    word-break: break-word;
  }

  .free-poster-reveal {
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 16px;
    color: #28a745;
    margin: 12px 0;
    animation: book-pop 0.5s ease-out 0.5s both;
  }

  /* Confetti */
  .confetti-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .confetti {
    position: absolute;
    top: -10px;
    border-radius: 2px;
    animation: confetti-fall 3s ease-in-out infinite;
  }
  @keyframes confetti-fall {
    0% {
      transform: translateY(-10px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(calc(100vh + 10px)) rotate(720deg);
      opacity: 0;
    }
  }

  /* Beanie spot */
  .beanie-spot {
    position: relative;
    width: 70px;
    height: 70px;
    margin: 8px auto;
  }
  .beanie-spot :global(.box-beanie) {
    top: 0;
    left: 0;
  }

  /* Order Again button */
  .order-again-btn {
    margin-top: 16px;
    background: #cc1c1c;
    color: #fff;
    border: 2px solid #a01515;
    border-radius: 8px;
    padding: 12px 32px;
    font-family: 'Arial Black', 'Arial', sans-serif;
    font-size: 16px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.2s ease;
    animation: book-pop 0.4s ease-out 0.8s both;
  }
  .order-again-btn:hover {
    background: #dd2222;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(204, 28, 28, 0.4);
  }
  .order-again-btn:active {
    transform: translateY(0);
  }

  /* ======== Responsive ======== */
  @media (max-width: 480px) {
    .book-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 8px 10px 16px;
    }
    .book-cover {
      width: 75px;
      height: 100px;
    }
    .logo-text {
      font-size: 22px;
      letter-spacing: 4px;
    }
    .logo-sub {
      font-size: 10px;
      letter-spacing: 5px;
    }
    .order-total {
      font-size: 14px;
    }
    .order-total strong {
      font-size: 16px;
    }
    .submit-button {
      padding: 8px 14px;
      font-size: 12px;
    }
    .section-header h2 {
      font-size: 15px;
    }
    .celebrate-title {
      font-size: 22px;
    }
    .calendar {
      max-width: 280px;
    }
    .calendar-day {
      font-size: 9px;
    }
    .scene-text {
      font-size: 18px;
    }
  }

  @media (min-width: 768px) {
    .book-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
      padding: 16px 24px 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    .book-cover {
      width: 100px;
      height: 135px;
    }
    .catalog-header {
      padding: 0;
    }
    .header-content {
      padding: 14px 24px;
    }
    .logo-text {
      font-size: 36px;
      letter-spacing: 10px;
    }
    .logo-sub {
      font-size: 15px;
      letter-spacing: 12px;
    }
  }
</style>
