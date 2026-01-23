<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // All possible beanie babies with rarity - using real images from beaniepedia.com
  const ALL_BEANIES = [
    // Common (50% chance)
    { name: 'Spot', animal: 'Dog', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2023/02/spotwpotbboc.jpg?fit=300%2C300&ssl=1', birthday: 'January 3, 1993', poem: 'See Spot run, see Spot play / See Spot brighten up your day', rarity: 'common' },
    { name: 'Squealer', animal: 'Pig', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/41TP0C93AYL._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'April 23, 1993', poem: 'Squealer likes to oink and roll / Around the farm and in the bowl', rarity: 'common' },
    { name: 'Legs', animal: 'Frog', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/legs.jpg?fit=350%2C350&ssl=1', birthday: 'April 25, 1993', poem: 'Legs lives in a lily pad / The cutest little frog you ever had', rarity: 'common' },
    { name: 'Flash', animal: 'Dolphin', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/flash.jpg?fit=350%2C350&ssl=1', birthday: 'May 13, 1993', poem: 'Flash the dolphin swims so fast / She always comes in first not last', rarity: 'common' },
    { name: 'Chocolate', animal: 'Moose', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/41Uh6b0cn1L._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'April 27, 1993', poem: 'Licorice, candy and you know what? / Chocolate is the name of this cute moose', rarity: 'common' },
    { name: 'Pinky', animal: 'Flamingo', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2019/01/pinky-1.jpg?fit=300%2C300&ssl=1', birthday: 'February 13, 1995', poem: 'Pinky loves the Everglades / From the hottest pink she never fades', rarity: 'common' },

    // Uncommon (30% chance)
    { name: 'Patti', animal: 'Platypus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/patti.jpg?fit=352%2C352&ssl=1', birthday: 'January 6, 1993', poem: 'Ran into Patti one day while walking / Believe me she is not much for talking', rarity: 'uncommon' },
    { name: 'Mystic', animal: 'Unicorn', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/10/mystic.jpg?fit=300%2C300&ssl=1', birthday: 'May 21, 1994', poem: 'Once upon a time so far away / A unicorn was born one magical day', rarity: 'uncommon' },
    { name: 'Stripes', animal: 'Tiger', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2013/02/71rxb-lg0UL._AA1500_.jpg?fit=300%2C300&ssl=1', birthday: 'June 11, 1995', poem: 'Stripes was never fierce nor strong / So with tigers he didn\'t get along', rarity: 'uncommon' },
    { name: 'Goldie', animal: 'Goldfish', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/03/goldie.jpg?fit=300%2C300&ssl=1', birthday: 'November 14, 1994', poem: 'She\'s got the rhythm she\'s got the soul / What more could you want in a fish bowl?', rarity: 'uncommon' },

    // Rare (15% chance)
    { name: 'Rex', animal: 'Tyrannosaurus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/10/rex.jpg?fit=300%2C300&ssl=1', birthday: 'January 1, 1995', poem: 'Rex has a temper, watch out beware / Cross him wrong and you\'re in for a scare', rarity: 'rare' },
    { name: 'Steg', animal: 'Stegosaurus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/11/steg.jpeg?fit=225%2C225&ssl=1', birthday: 'January 1, 1995', poem: 'No Jurassic Park for Steg / He prefers to eat a drumstick leg', rarity: 'rare' },
    { name: 'Garcia', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/02/garcia.jpg?fit=300%2C300&ssl=1', birthday: 'August 1, 1995', poem: 'The Grateful Dead inspired this bear / Peace, love and happiness he\'s ready to share', rarity: 'rare' },

    // Ultra Rare (4% chance)
    { name: 'Peanut', animal: 'Elephant', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2013/01/51AMQPG4cHL._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'January 25, 1995', poem: 'Peanut the royal blue elephant / Such a rare find, she\'s heaven sent', rarity: 'ultra-rare' },
    { name: 'Nana', animal: 'Monkey', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2019/01/nana.jpg?fit=352%2C352&ssl=1', birthday: 'August 1, 1995', poem: 'Named after Nana in "The Gong Show" / The rarest monkey that you\'ll ever know', rarity: 'ultra-rare' },

    // Legendary (1% chance)
    { name: 'Princess', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2025/06/princessbud.jpg?fit=400%2C400&ssl=1', birthday: 'October 1, 1997', poem: 'Like an angel she came from heaven above / She shared her compassion, her pain, and her love', rarity: 'legendary' },
  ];

  // State
  let collection = $state<typeof ALL_BEANIES>([]);
  let isRaffling = $state(false);
  let currentPrize = $state<typeof ALL_BEANIES[0] | null>(null);
  let showPrize = $state(false);
  let isDuplicate = $state(false);
  let tickets = $state(3);
  let lastTicketTime = $state(0);
  let spinAngle = $state(0);
  let showCollection = $state(false);

  // Rarity colors for display
  const RARITY_COLORS: Record<string, string> = {
    'common': '#9e9e9e',
    'uncommon': '#4caf50',
    'rare': '#2196f3',
    'ultra-rare': '#9c27b0',
    'legendary': '#ff9800'
  };

  const RARITY_GLOW: Record<string, string> = {
    'common': 'none',
    'uncommon': '0 0 10px #4caf50',
    'rare': '0 0 15px #2196f3',
    'ultra-rare': '0 0 20px #9c27b0, 0 0 40px #9c27b0',
    'legendary': '0 0 30px #ff9800, 0 0 60px #ffd700, 0 0 90px #ff9800'
  };

  function loadState() {
    if (!browser) return;
    const saved = localStorage.getItem('bookfair-beaniebaby');
    if (saved) {
      const data = JSON.parse(saved);
      collection = data.collection || [];
      tickets = data.tickets ?? 3;
      lastTicketTime = data.lastTicketTime || Date.now();
    }

    // Regenerate tickets (1 per hour, max 10)
    const now = Date.now();
    const hoursPassed = Math.floor((now - lastTicketTime) / (1000 * 60 * 60));
    if (hoursPassed > 0) {
      tickets = Math.min(10, tickets + hoursPassed);
      lastTicketTime = now;
      saveState();
    }
  }

  function saveState() {
    if (!browser) return;
    localStorage.setItem('bookfair-beaniebaby', JSON.stringify({
      collection,
      tickets,
      lastTicketTime
    }));
  }

  function pickBeanie(): typeof ALL_BEANIES[0] {
    const roll = Math.random() * 100;
    let rarity: string;

    if (roll < 1) rarity = 'legendary';
    else if (roll < 5) rarity = 'ultra-rare';
    else if (roll < 20) rarity = 'rare';
    else if (roll < 50) rarity = 'uncommon';
    else rarity = 'common';

    const pool = ALL_BEANIES.filter(b => b.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function doRaffle() {
    if (tickets <= 0 || isRaffling) return;

    playSound('click');
    tickets--;
    isRaffling = true;
    showPrize = false;

    // Spin animation
    const spins = 3 + Math.random() * 2;
    const duration = 3000;
    const startAngle = spinAngle;
    const endAngle = startAngle + (spins * 360);
    const startTime = Date.now();

    // Play spinning sound
    playSound('whoosh', 0.3);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      spinAngle = startAngle + (endAngle - startAngle) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Pick prize
        currentPrize = pickBeanie();
        isDuplicate = collection.some(b => b.name === currentPrize!.name);

        if (!isDuplicate) {
          collection = [...collection, currentPrize];
        }

        playSound('powerup');
        showPrize = true;
        isRaffling = false;
        saveState();
      }
    };

    requestAnimationFrame(animate);
  }

  function closePrize() {
    showPrize = false;
    currentPrize = null;
  }

  function getTimeUntilTicket(): string {
    const now = Date.now();
    const nextTicket = lastTicketTime + (60 * 60 * 1000);
    const remaining = Math.max(0, nextTicket - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onMount(() => {
    loadState();

    // Tick to update timer
    const interval = setInterval(() => {
      // Force reactivity update for timer
      lastTicketTime = lastTicketTime;
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div class="beanie-container">
  <button class="close-btn" onclick={onClose}>X</button>

  <div class="beanie-content">
    <h1 class="title">Beanie Baby Raffle</h1>
    <p class="subtitle">Try your luck! Collect them all!</p>

    {#if !showCollection}
      <!-- Raffle Machine -->
      <div class="raffle-machine">
        <div class="machine-top">
          <div class="light-bulb" class:on={isRaffling}></div>
          <div class="light-bulb" class:on={isRaffling}></div>
          <div class="light-bulb" class:on={isRaffling}></div>
        </div>

        <div class="machine-window">
          <div class="spinner" style="transform: rotate({spinAngle}deg)">
            {#each ['common', 'uncommon', 'rare', 'ultra-rare', 'legendary', 'common', 'uncommon', 'rare'] as rarity, i}
              <div
                class="spinner-segment"
                style="
                  transform: rotate({i * 45}deg);
                  background: {RARITY_COLORS[rarity]};
                "
              >
                <span class="segment-label">{rarity === 'ultra-rare' ? 'ULTRA' : rarity.toUpperCase()}</span>
              </div>
            {/each}
          </div>
          <div class="spinner-pointer">▼</div>
        </div>

        <div class="machine-base">
          <div class="ticket-display">
            <span class="ticket-icon">🎟️</span>
            <span class="ticket-count">{tickets}</span>
          </div>

          {#if tickets < 10}
            <div class="next-ticket">
              Next ticket: {getTimeUntilTicket()}
            </div>
          {/if}

          <button
            class="raffle-btn nes-btn is-warning"
            onclick={doRaffle}
            disabled={tickets <= 0 || isRaffling}
          >
            {isRaffling ? 'SPINNING...' : tickets > 0 ? 'SPIN!' : 'NO TICKETS'}
          </button>
        </div>
      </div>

      <!-- Collection summary -->
      <div class="collection-summary">
        <p>Collection: {collection.length} / {ALL_BEANIES.length}</p>
        <div class="rarity-counts">
          {#each ['common', 'uncommon', 'rare', 'ultra-rare', 'legendary'] as rarity}
            {@const count = collection.filter(b => b.rarity === rarity).length}
            {@const total = ALL_BEANIES.filter(b => b.rarity === rarity).length}
            <span class="rarity-count" style="color: {RARITY_COLORS[rarity]}">
              {rarity === 'ultra-rare' ? 'U-R' : rarity[0].toUpperCase()}: {count}/{total}
            </span>
          {/each}
        </div>
        <button class="view-collection-btn" onclick={() => showCollection = true}>
          View Collection
        </button>
      </div>
    {:else}
      <!-- Collection View -->
      <div class="collection-view">
        <button class="back-btn" onclick={() => showCollection = false}>← Back to Raffle</button>

        <div class="collection-grid">
          {#each ALL_BEANIES as beanie}
            {@const owned = collection.some(b => b.name === beanie.name)}
            <div
              class="collection-item"
              class:owned={owned}
              style="
                --beanie-color: {beanie.color};
                --beanie-accent: {beanie.accent};
                --rarity-color: {RARITY_COLORS[beanie.rarity]};
                --rarity-glow: {owned ? RARITY_GLOW[beanie.rarity] : 'none'};
              "
            >
              <div class="beanie-plush" class:mystery={!owned}>
                {#if owned}
                  <img src={beanie.image} alt={beanie.name} class="plush-image" />
                  <div class="plush-tag">TY</div>
                {:else}
                  <div class="mystery-silhouette">?</div>
                {/if}
              </div>
              <div class="beanie-name">{owned ? beanie.name : '???'}</div>
              <div class="beanie-rarity" style="color: {RARITY_COLORS[beanie.rarity]}">
                {beanie.rarity}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Prize popup -->
  {#if showPrize && currentPrize}
    <div class="prize-overlay" onclick={closePrize}>
      <div class="prize-popup" onclick={(e) => e.stopPropagation()}>
        <div
          class="prize-plush"
          style="
            --rarity-glow: {RARITY_GLOW[currentPrize.rarity]};
          "
        >
          <img src={currentPrize.image} alt={currentPrize.name} class="prize-image" />
          <div class="prize-plush-tag">TY</div>
        </div>

        <h2 class="prize-name" style="color: {RARITY_COLORS[currentPrize.rarity]}">
          {currentPrize.name}!
        </h2>
        <p class="prize-animal">{currentPrize.animal}</p>
        <p class="prize-rarity" style="color: {RARITY_COLORS[currentPrize.rarity]}">
          ★ {currentPrize.rarity.toUpperCase()} ★
        </p>

        {#if isDuplicate}
          <p class="duplicate-msg">You already have this one!</p>
        {:else}
          <p class="new-msg">NEW! Added to collection!</p>
        {/if}

        <div class="prize-tag">
          <div class="tag-heart">♥</div>
          <p class="tag-birthday">Birthday: {currentPrize.birthday}</p>
          <p class="tag-poem">"{currentPrize.poem}"</p>
        </div>

        <button class="nes-btn is-primary" onclick={closePrize}>
          {isDuplicate ? 'Try Again' : 'Awesome!'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .beanie-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    overflow-y: auto;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: #ff6b6b;
    color: white;
    border: 3px solid #c0392b;
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    cursor: pointer;
    z-index: 100;
  }

  .beanie-content {
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .title {
    font-size: 1.5rem;
    color: #c0392b;
    text-shadow: 2px 2px 0 #fff;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #8e44ad;
    font-size: 0.7rem;
    margin-bottom: 1rem;
  }

  /* Raffle Machine */
  .raffle-machine {
    background: linear-gradient(180deg, #e74c3c 0%, #c0392b 100%);
    border: 4px solid #922b21;
    border-radius: 20px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .machine-top {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .light-bulb {
    width: 20px;
    height: 20px;
    background: #444;
    border-radius: 50%;
    border: 2px solid #222;
    transition: all 0.2s;
  }

  .light-bulb.on {
    background: #f1c40f;
    box-shadow: 0 0 10px #f1c40f, 0 0 20px #f39c12;
    animation: blink 0.3s infinite alternate;
  }

  @keyframes blink {
    from { opacity: 1; }
    to { opacity: 0.7; }
  }

  .machine-window {
    background: #2c3e50;
    border: 4px solid #1a252f;
    border-radius: 50%;
    width: 200px;
    height: 200px;
    margin: 0 auto 1rem;
    position: relative;
    overflow: hidden;
  }

  .spinner {
    width: 100%;
    height: 100%;
    position: relative;
    transition: transform 0.1s linear;
  }

  .spinner-segment {
    position: absolute;
    width: 50%;
    height: 50%;
    left: 50%;
    top: 0;
    transform-origin: 0 100%;
    clip-path: polygon(0 100%, 100% 0, 0 0);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .segment-label {
    font-size: 0.35rem;
    color: white;
    text-shadow: 1px 1px 0 #000;
    transform: rotate(22deg) translateX(-20px);
  }

  .spinner-pointer {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    font-size: 2rem;
    color: #f1c40f;
    text-shadow: 2px 2px 0 #000;
    z-index: 10;
  }

  .machine-base {
    background: #922b21;
    border-radius: 10px;
    padding: 1rem;
  }

  .ticket-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .ticket-icon {
    font-size: 1.5rem;
  }

  .ticket-count {
    font-size: 1.5rem;
    color: #f1c40f;
    text-shadow: 2px 2px 0 #000;
  }

  .next-ticket {
    font-size: 0.5rem;
    color: #ecf0f1;
    margin-bottom: 0.5rem;
  }

  .raffle-btn {
    width: 100%;
    font-size: 1rem !important;
  }

  .raffle-btn:disabled {
    opacity: 0.5;
  }

  /* Collection Summary */
  .collection-summary {
    background: rgba(255, 255, 255, 0.8);
    border: 3px solid #8e44ad;
    border-radius: 10px;
    padding: 1rem;
  }

  .collection-summary p {
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }

  .rarity-counts {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .rarity-count {
    font-size: 0.5rem;
    font-weight: bold;
  }

  .view-collection-btn {
    background: #8e44ad;
    color: white;
    border: 2px solid #6c3483;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.6rem;
  }

  /* Collection View */
  .collection-view {
    width: 100%;
  }

  .back-btn {
    background: #3498db;
    color: white;
    border: 2px solid #2980b9;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.6rem;
    margin-bottom: 1rem;
  }

  .collection-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .collection-item {
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 0.5rem;
    opacity: 0.4;
    filter: grayscale(1);
    transition: all 0.3s;
  }

  .collection-item.owned {
    opacity: 1;
    filter: none;
    border-color: var(--rarity-color);
    box-shadow: var(--rarity-glow);
  }

  /* Plush toy display - collection */
  .beanie-plush {
    width: 60px;
    height: 60px;
    margin: 0 auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .beanie-plush.mystery {
    background: linear-gradient(135deg, #e0e0e0 0%, #b0b0b0 100%);
    border-radius: 12px;
  }

  .mystery-silhouette {
    font-size: 2.5rem;
    color: #888;
    font-weight: bold;
  }

  .plush-image {
    width: 55px;
    height: 55px;
    object-fit: contain;
    filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
  }

  .plush-tag {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 18px;
    height: 12px;
    background: linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%);
    border-radius: 2px;
    color: white;
    font-size: 0.35rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    border: 1px solid #fff;
  }

  .beanie-name {
    font-size: 0.45rem;
    color: #2c3e50;
    margin-top: 0.25rem;
    font-weight: bold;
  }

  .beanie-rarity {
    font-size: 0.35rem;
    text-transform: uppercase;
  }

  /* Prize Popup */
  .prize-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .prize-popup {
    background: linear-gradient(180deg, #fff 0%, #fef9e7 100%);
    border: 4px solid #f39c12;
    border-radius: 20px;
    padding: 2rem;
    text-align: center;
    max-width: 350px;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes popIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }

  /* Prize plush - large SVG display */
  .prize-plush {
    width: 140px;
    height: 140px;
    margin: 0 auto 1rem;
    position: relative;
    animation: bounce 0.5s infinite alternate;
  }

  .prize-image {
    width: 130px;
    height: 130px;
    object-fit: contain;
    filter: drop-shadow(var(--rarity-glow)) drop-shadow(3px 4px 5px rgba(0, 0, 0, 0.4));
  }

  .prize-plush-tag {
    position: absolute;
    bottom: 0;
    right: 5px;
    width: 32px;
    height: 20px;
    background: linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%);
    border-radius: 3px;
    color: white;
    font-size: 0.55rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    border: 2px solid #fff;
    animation: tagSwing 1s ease-in-out infinite;
  }

  @keyframes tagSwing {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
  }

  .prize-name {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .prize-animal {
    color: #7f8c8d;
    font-size: 0.6rem;
    margin-bottom: 0.5rem;
  }

  .prize-rarity {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .duplicate-msg {
    color: #e74c3c;
    font-size: 0.6rem;
    margin-bottom: 0.5rem;
  }

  .new-msg {
    color: #27ae60;
    font-size: 0.6rem;
    margin-bottom: 0.5rem;
    animation: pulse 0.5s infinite alternate;
  }

  @keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
  }

  .prize-tag {
    background: #fff;
    border: 2px solid #e74c3c;
    border-radius: 10px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    position: relative;
  }

  .tag-heart {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    color: #e74c3c;
    font-size: 1.2rem;
    background: #fff;
    padding: 0 0.5rem;
  }

  .tag-birthday {
    font-size: 0.5rem;
    color: #e74c3c;
    margin-bottom: 0.5rem;
  }

  .tag-poem {
    font-size: 0.45rem;
    color: #2c3e50;
    font-style: italic;
    line-height: 1.4;
  }

  @media (max-width: 400px) {
    .collection-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
