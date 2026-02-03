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

  interface GuestbookEntry {
    id: string;
    name: string;
    message: string;
    date: string;
    avatar: string;
    color: string;
  }

  const STORAGE_KEY = 'bookfair_guestbook';

  const AVATAR_EMOJIS = [
    '\u{1F60E}', '\u{1F913}', '\u{1F60D}', '\u{1F608}', '\u{1F47B}',
    '\u{1F916}', '\u{1F47D}', '\u{1F920}', '\u{1F92F}', '\u{1F60A}',
    '\u{1F609}', '\u{1F973}', '\u{1F92A}', '\u{1F60B}', '\u{1F47E}'
  ];

  const COLOR_OPTIONS = [
    { label: 'Magenta', value: '#ff00ff' },
    { label: 'Cyber Teal', value: '#00ffff' },
    { label: 'Lime Green', value: '#00ff00' },
    { label: 'Hot Pink', value: '#ff69b4' },
    { label: 'Electric Blue', value: '#0066ff' },
    { label: 'Sunset Orange', value: '#ff6600' },
    { label: 'Royal Purple', value: '#9933ff' },
    { label: 'Goldenrod', value: '#ffd700' },
  ];

  const SEED_ENTRIES: GuestbookEntry[] = [
    {
      id: 'seed-1',
      name: 'SmarterChild',
      message: 'I am an automated buddy. Ask me anything! Type HELP for commands.',
      date: '1999-11-23',
      avatar: '\u{1F916}',
      color: '#0066ff',
    },
    {
      id: 'seed-2',
      name: 'Xx_DragonSlayer_xX',
      message: 'First!!! This site is so cool. Check out MY site at geocities.com/dragonslayer99',
      date: '2000-03-14',
      avatar: '\u{1F608}',
      color: '#ff6600',
    },
    {
      id: 'seed-3',
      name: '~*~PrInCeSs~*~',
      message: 'OMG this site is soooo cool!!! ~*~LoVe AnD LiGhT~*~ sign my guestbook back plzzzz!!',
      date: '2001-06-07',
      avatar: '\u{1F60D}',
      color: '#ff69b4',
    },
    {
      id: 'seed-4',
      name: 'sk8erboi2002',
      message: 'A/S/L? 14/M/CA lol. Anyone wanna chat on AIM? SN: sk8erboi2002',
      date: '2001-09-30',
      avatar: '\u{1F60E}',
      color: '#00ff00',
    },
    {
      id: 'seed-5',
      name: 'xxXNeoXxx',
      message: 'I know kung fu. Follow the white rabbit. The Matrix has you...',
      date: '2002-01-15',
      avatar: '\u{1F576}\u{FE0F}',
      color: '#00ffff',
    },
    {
      id: 'seed-6',
      name: 'AnGeL_BaBi_03',
      message: 'HeY eVeRyOnE!! dOeS aNyOnE kNoW hOw To MaKe A cUrSoR tRaIl?? TyTy <333',
      date: '2003-04-22',
      avatar: '\u{1F47C}',
      color: '#ff00ff',
    },
  ];

  // State
  let entries = $state<GuestbookEntry[]>([]);
  let nameInput = $state('');
  let messageInput = $state('');
  let selectedColor = $state(COLOR_OPTIONS[0].value);
  let showConfetti = $state(false);
  let visitorCount = $state(0);

  // Beanie hiding spots
  const hidingSpots: HidingSpot[] = [
    { id: 'under-counter' },
    { id: 'behind-entries' },
  ];
  let beanieUnderCounter = $state<Beanie | null>(null);
  let beanieBehindEntries = $state<Beanie | null>(null);

  function loadEntries(): GuestbookEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore parse errors
    }
    return [];
  }

  function saveEntries(data: GuestbookEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getVisitorCount(): number {
    const key = 'bookfair_guestbook_visitors';
    let count = parseInt(localStorage.getItem(key) || '0', 10);
    count++;
    localStorage.setItem(key, String(count));
    return count;
  }

  function randomAvatar(): string {
    return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function handleSign() {
    const trimmedName = nameInput.trim();
    const trimmedMessage = messageInput.trim();

    if (!trimmedName || !trimmedMessage) {
      playSound('error');
      return;
    }

    const newEntry: GuestbookEntry = {
      id: `entry-${Date.now()}`,
      name: trimmedName,
      message: trimmedMessage,
      date: new Date().toISOString().split('T')[0],
      avatar: randomAvatar(),
      color: selectedColor,
    };

    entries = [newEntry, ...entries];
    saveEntries(entries);

    nameInput = '';
    messageInput = '';

    playSound('success');
    triggerConfetti();
  }

  function triggerConfetti() {
    showConfetti = true;
    setTimeout(() => {
      showConfetti = false;
    }, 2000);
  }

  // Confetti particles
  interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
    delay: number;
  }

  let confettiParticles = $derived.by(() => {
    if (!showConfetti) return [];
    const particles: Particle[] = [];
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff6600', '#00ff00', '#ff69b4', '#9933ff'];
    for (let i = 0; i < 40; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * -20 - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.5,
      });
    }
    return particles;
  });

  onMount(() => {
    // Load guestbook entries from localStorage
    const userEntries = loadEntries();
    // Combine user entries (newest first) with seed entries
    entries = [...userEntries, ...SEED_ENTRIES];

    visitorCount = getVisitorCount();

    // Beanie integration
    registerSpots('guestbook', hidingSpots);
    const beanies = getBeaniesForArea('guestbook');
    beanieUnderCounter = beanies.get('under-counter') || null;
    beanieBehindEntries = beanies.get('behind-entries') || null;
  });
</script>

<div class="guestbook-container">
  <CloseButton {onClose} />

  <!-- Tiled star background rendered via CSS -->
  <div class="bg-stars"></div>

  <div class="guestbook-content">
    <!-- Under construction banner -->
    <div class="under-construction">
      <span class="construction-icon blink">&#x26A0;</span>
      <span class="construction-text">UNDER CONSTRUCTION</span>
      <span class="construction-icon blink">&#x26A0;</span>
    </div>

    <!-- Header -->
    <h1 class="guestbook-title">Sign My Guestbook!!!</h1>
    <p class="guestbook-subtitle">Leave a message and let the world know you were here!</p>

    <!-- Visitor counter -->
    <div class="visitor-counter">
      <span class="counter-label">You are visitor #</span>
      <span class="counter-number">{String(8342 + visitorCount).padStart(4, '0')}</span>
      <span class="counter-label">!</span>
    </div>

    <!-- Animated badges -->
    <div class="badges-row">
      <span class="badge badge-new">NEW!</span>
      <span class="badge badge-sign">&#9997; Sign here!</span>
      <span class="badge badge-cool">&#9733; Cool Site Award &#9733;</span>
    </div>

    <!-- Divider -->
    <div class="geo-divider">
      <span class="divider-star">&#9733;</span>
      <span class="divider-line"></span>
      <span class="divider-star">&#9733;</span>
    </div>

    <!-- Sign form -->
    <div class="sign-form">
      <h2 class="form-title">&#9997; Sign the Guestbook!</h2>
      <div class="form-row">
        <label class="form-label" for="gb-name">Name:</label>
        <input
          id="gb-name"
          class="form-input"
          type="text"
          bind:value={nameInput}
          maxlength={20}
          placeholder="CoolDude99"
        />
        <span class="char-count">{nameInput.length}/20</span>
      </div>
      <div class="form-row">
        <label class="form-label" for="gb-message">Message:</label>
        <textarea
          id="gb-message"
          class="form-textarea"
          bind:value={messageInput}
          maxlength={200}
          placeholder="OMG this site is SO cool!!!"
          rows={3}
        ></textarea>
        <span class="char-count">{messageInput.length}/200</span>
      </div>
      <div class="form-row">
        <label class="form-label" for="gb-color">Your favorite color:</label>
        <select id="gb-color" class="form-select" bind:value={selectedColor}>
          {#each COLOR_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <span class="color-preview" style="background: {selectedColor};"></span>
      </div>
      <button class="sign-btn" onclick={handleSign}>
        &#9997; Sign!
      </button>
    </div>

    <!-- Divider -->
    <div class="geo-divider">
      <span class="divider-star">&#9733;</span>
      <span class="divider-line"></span>
      <span class="divider-star">&#9733;</span>
    </div>

    <!-- Entries list -->
    <h2 class="entries-title">&#128214; Guestbook Entries ({entries.length})</h2>
    <div class="entries-list">
      {#each entries as entry (entry.id)}
        <div class="entry-card" style="border-color: {entry.color};">
          <div class="entry-header">
            <span class="entry-avatar">{entry.avatar}</span>
            <span class="entry-name" style="color: {entry.color};">{entry.name}</span>
            <span class="entry-date">{formatDate(entry.date)}</span>
          </div>
          <p class="entry-message">{entry.message}</p>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="guestbook-footer">
      <p class="footer-text">&#127760; This page is best viewed with Netscape Navigator 4.0</p>
      <p class="footer-text">&#128231; Email the webmaster: webmaster@geocities.com</p>
      <div class="footer-badges">
        <span class="footer-badge">&#128187; Made with Notepad</span>
        <span class="footer-badge">&#127775; GeoCities Neighborhood: Area51</span>
      </div>
    </div>
  </div>

  <!-- Confetti overlay -->
  {#if showConfetti}
    <div class="confetti-overlay">
      {#each confettiParticles as p (p.id)}
        <div
          class="confetti-piece"
          style="
            left: {p.x}%;
            top: {p.y}%;
            background: {p.color};
            width: {p.size}px;
            height: {p.size}px;
            transform: rotate({p.rotation}deg);
            animation-delay: {p.delay}s;
          "
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Beanie hiding spots -->
  {#if beanieUnderCounter}
    <HidingBeanie beanie={beanieUnderCounter} class="gb-beanie-counter" />
  {/if}
  {#if beanieBehindEntries}
    <HidingBeanie beanie={beanieBehindEntries} class="gb-beanie-entries" />
  {/if}
</div>

<style>
  .guestbook-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
    color: #ffff00;
  }

  /* Tiled star/space background */
  .bg-stars {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-color: #000033;
    background-image:
      radial-gradient(1px 1px at 10% 20%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 30% 60%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 50% 10%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 70% 80%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 90% 40%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 15% 75%, #ffffcc 100%, transparent),
      radial-gradient(2px 2px at 45% 35%, #ffffcc 100%, transparent),
      radial-gradient(2px 2px at 80% 15%, #ffffcc 100%, transparent),
      radial-gradient(1px 1px at 25% 45%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 55% 90%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 85% 55%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 5% 95%, #ccccff 100%, transparent),
      radial-gradient(1px 1px at 65% 25%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 35% 85%, #ffffcc 100%, transparent),
      radial-gradient(1px 1px at 95% 70%, #ffffff 100%, transparent);
    background-size: 200px 200px;
  }

  .guestbook-content {
    position: relative;
    z-index: 1;
    max-width: 650px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }

  /* Under construction banner */
  .under-construction {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: repeating-linear-gradient(
      -45deg,
      #ffcc00,
      #ffcc00 10px,
      #333 10px,
      #333 20px
    );
    padding: 0.5rem 1rem;
    margin-bottom: 1.5rem;
    border-radius: 4px;
  }

  .construction-text {
    font-weight: bold;
    font-size: 0.8rem;
    color: #000;
    background: #ffcc00;
    padding: 0.15rem 0.5rem;
    border-radius: 2px;
    letter-spacing: 2px;
  }

  .construction-icon {
    font-size: 1.2rem;
  }

  .blink {
    animation: blink-anim 1s step-end infinite;
  }

  @keyframes blink-anim {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* Title with rainbow gradient */
  .guestbook-title {
    font-size: 2rem;
    text-align: center;
    margin: 0 0 0.3rem 0;
    background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0088);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: rainbow-shift 3s linear infinite;
  }

  @keyframes rainbow-shift {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  .guestbook-subtitle {
    text-align: center;
    font-size: 0.85rem;
    color: #ccccff;
    margin: 0 0 1rem 0;
  }

  /* Visitor counter */
  .visitor-counter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .counter-label {
    color: #aaaaff;
  }

  .counter-number {
    font-family: 'Press Start 2P', 'Courier New', monospace;
    font-size: 1rem;
    color: #00ff00;
    background: #000;
    padding: 0.2rem 0.5rem;
    border: 2px inset #444;
    text-shadow: 0 0 6px rgba(0, 255, 0, 0.6);
    letter-spacing: 2px;
  }

  /* Badge row */
  .badges-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    font-weight: bold;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .badge-new {
    background: #ff0000;
    color: #fff;
    animation: badge-pulse 0.8s ease-in-out infinite alternate;
    border: 2px solid #ffff00;
  }

  .badge-sign {
    background: #009900;
    color: #ffff00;
    animation: badge-wobble 2s ease-in-out infinite;
    border: 2px solid #00ff00;
  }

  .badge-cool {
    background: linear-gradient(135deg, #ff00ff, #0088ff);
    color: #fff;
    animation: badge-glow 1.5s ease-in-out infinite alternate;
    border: 2px solid #ffff00;
  }

  @keyframes badge-pulse {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
  }

  @keyframes badge-wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(2deg); }
    75% { transform: rotate(-2deg); }
  }

  @keyframes badge-glow {
    from { box-shadow: 0 0 4px #ff00ff; }
    to { box-shadow: 0 0 12px #00ffff, 0 0 24px #ff00ff; }
  }

  /* GeoCities divider */
  .geo-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 1.5rem 0;
  }

  .divider-star {
    color: #ffff00;
    font-size: 1rem;
    animation: spin-star 4s linear infinite;
  }

  .divider-line {
    flex: 1;
    height: 2px;
    max-width: 200px;
    background: linear-gradient(90deg, transparent, #ffff00, #ff00ff, #00ffff, #ffff00, transparent);
  }

  @keyframes spin-star {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Sign form */
  .sign-form {
    background: rgba(0, 0, 50, 0.7);
    border: 3px ridge #8888ff;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .form-title {
    font-size: 1.1rem;
    color: #00ffff;
    margin: 0 0 1rem 0;
    text-align: center;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }

  .form-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .form-label {
    width: 100%;
    font-size: 0.85rem;
    color: #ffcc00;
    font-weight: bold;
  }

  .form-input,
  .form-textarea,
  .form-select {
    flex: 1;
    font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
    font-size: 0.85rem;
    padding: 0.4rem 0.5rem;
    border: 2px inset #8888ff;
    border-radius: 3px;
    background: #ffffcc;
    color: #000;
    min-width: 0;
  }

  .form-textarea {
    resize: vertical;
    min-height: 3rem;
  }

  .form-select {
    cursor: pointer;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: 2px solid #00ffff;
    outline-offset: 1px;
  }

  .char-count {
    font-size: 0.6rem;
    color: #8888aa;
    align-self: flex-end;
    white-space: nowrap;
  }

  .color-preview {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #fff;
    flex-shrink: 0;
    align-self: center;
  }

  .sign-btn {
    display: block;
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.6rem 1rem;
    font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
    font-size: 1.1rem;
    font-weight: bold;
    color: #000;
    background: linear-gradient(180deg, #ffff00 0%, #ffcc00 100%);
    border: 3px outset #ffdd44;
    border-radius: 5px;
    cursor: pointer;
    text-shadow: none;
    transition: all 0.15s;
  }

  .sign-btn:hover {
    background: linear-gradient(180deg, #ffff66 0%, #ffdd33 100%);
    transform: scale(1.03);
  }

  .sign-btn:active {
    border-style: inset;
    transform: scale(0.98);
  }

  /* Entries */
  .entries-title {
    font-size: 1.1rem;
    color: #00ffff;
    text-align: center;
    margin: 0 0 1rem 0;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }

  .entries-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
  }

  .entry-card {
    background: rgba(0, 0, 40, 0.75);
    border: 3px solid #ff00ff;
    border-radius: 6px;
    padding: 0.75rem;
    transition: transform 0.15s;
  }

  .entry-card:hover {
    transform: translateX(4px);
  }

  .entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    flex-wrap: wrap;
  }

  .entry-avatar {
    font-size: 1.5rem;
    line-height: 1;
  }

  .entry-name {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .entry-date {
    font-size: 0.65rem;
    color: #888;
    margin-left: auto;
  }

  .entry-message {
    font-size: 0.8rem;
    color: #ddd;
    margin: 0;
    line-height: 1.4;
    word-break: break-word;
  }

  /* Footer */
  .guestbook-footer {
    margin-top: 2rem;
    text-align: center;
    padding-top: 1rem;
    border-top: 2px dashed #444488;
  }

  .footer-text {
    font-size: 0.65rem;
    color: #6666aa;
    margin: 0.25rem 0;
  }

  .footer-badges {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .footer-badge {
    font-size: 0.55rem;
    color: #888;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #444;
    padding: 0.15rem 0.4rem;
    border-radius: 2px;
  }

  /* Confetti overlay */
  .confetti-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
    overflow: hidden;
  }

  .confetti-piece {
    position: absolute;
    border-radius: 2px;
    animation: confetti-fall 2s ease-out forwards;
  }

  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }

  /* Beanie positions */
  :global(.gb-beanie-counter) {
    bottom: 60px;
    left: 20px;
    z-index: 50;
  }

  :global(.gb-beanie-entries) {
    bottom: 200px;
    right: 10px;
    z-index: 50;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .guestbook-content {
      padding: 1.5rem 1rem 3rem;
    }

    .guestbook-title {
      font-size: 1.4rem;
    }

    .guestbook-subtitle {
      font-size: 0.75rem;
    }

    .entry-date {
      margin-left: 0;
      width: 100%;
      order: 3;
    }

    .badges-row {
      gap: 0.4rem;
    }

    .badge {
      font-size: 0.6rem;
      padding: 0.2rem 0.4rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blink,
    .badge-new,
    .badge-sign,
    .badge-cool,
    .divider-star,
    .guestbook-title {
      animation: none !important;
    }

    .confetti-piece {
      animation: none !important;
      display: none;
    }
  }
</style>
