<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';
  import { haptic } from '$lib/stores/haptics';

  interface Props {
    onDelayOpen?: (id: string) => void;
  }

  const { onDelayOpen }: Props = $props();

  const STORAGE_KEY = 'bookfair_secrets';
  const COMBO_TIMEOUT = 5000;
  const REWARD_DURATION = 3000;

  interface SecretCombo {
    id: string;
    name: string;
    sequence: string[];
    reward: {
      title: string;
      subtitle: string;
      emojis: string[];
      bgColor: string;
      textColor: string;
    };
  }

  const COMBOS: SecretCombo[] = [
    {
      id: 'internet',
      name: 'The Internet Combo',
      sequence: ['modem', 'aim', 'napster'],
      reward: {
        title: "Welcome!",
        subtitle: "You've Got Mail",
        emojis: ['📧', '💻', '🌐', '📨', '☎️', '📡'],
        bgColor: '#1a3a6e',
        textColor: '#ffcc00',
      },
    },
    {
      id: 'nerd',
      name: 'The Nerd Combo',
      sequence: ['oregontrail', 'encarta', 'carmen'],
      reward: {
        title: 'REPORT CARD',
        subtitle: 'A+ in Everything',
        emojis: ['📝', '🎓', '⭐', '📚', '🏆', '💯'],
        bgColor: '#f5f0d0',
        textColor: '#2a2a2a',
      },
    },
    {
      id: 'pets',
      name: 'The Pet Combo',
      sequence: ['tamagotchi', 'fishtank', 'furby'],
      reward: {
        title: 'PET STORE',
        subtitle: 'GRAND OPENING!',
        emojis: ['🐶', '🐱', '🐠', '🐣', '🐰', '🐸', '🦜', '🐹', '🐢', '🐍'],
        bgColor: '#ff69b4',
        textColor: '#ffffff',
      },
    },
  ];

  // Click history buffer
  interface ClickEntry {
    id: string;
    time: number;
  }

  let clickBuffer: ClickEntry[] = $state([]);
  let activeReward = $state<SecretCombo | null>(null);
  let showReward = $state(false);
  let discoveredSecrets = $state<Set<string>>(new Set());
  let fallingEmojis = $state<Array<{ emoji: string; left: number; delay: number; duration: number }>>([]);
  let rewardDismissTimer: ReturnType<typeof setTimeout> | null = null;

  // Load discovered secrets from localStorage
  onMount(() => {
    if (!browser) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        discoveredSecrets = new Set(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  });

  function saveDiscovered() {
    if (!browser) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...discoveredSecrets]));
  }

  function generateFallingEmojis(emojis: string[]): typeof fallingEmojis {
    const result: typeof fallingEmojis = [];
    for (let i = 0; i < 30; i++) {
      result.push({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
      });
    }
    return result;
  }

  function checkCombos(): SecretCombo | null {
    if (clickBuffer.length < 3) return null;

    const now = Date.now();
    // Only consider the last 3 clicks
    const recent = clickBuffer.slice(-3);

    // All 3 must be within the timeout window
    if (now - recent[0].time > COMBO_TIMEOUT) return null;

    const ids = recent.map(c => c.id);

    for (const combo of COMBOS) {
      if (
        ids[0] === combo.sequence[0] &&
        ids[1] === combo.sequence[1] &&
        ids[2] === combo.sequence[2]
      ) {
        return combo;
      }
    }

    return null;
  }

  /**
   * Called by the parent shelf when a toy is clicked.
   * Returns true if a combo was triggered (parent should delay opening the toy).
   */
  export function onToyClick(toyId: string): boolean {
    const now = Date.now();

    // Add to buffer, keep only last 3
    clickBuffer = [...clickBuffer, { id: toyId, time: now }].slice(-3);

    const matched = checkCombos();
    if (matched) {
      triggerReward(matched, toyId);
      return true;
    }

    return false;
  }

  /**
   * Returns the set of discovered secret IDs for shelf glow effects.
   */
  export function getDiscoveredSecrets(): Set<string> {
    return discoveredSecrets;
  }

  /**
   * Returns which combo IDs involve a given toy, for glow effect.
   */
  export function getSecretCombosForToy(toyId: string): string[] {
    return COMBOS.filter(c => c.sequence.includes(toyId) && discoveredSecrets.has(c.id)).map(c => c.id);
  }

  function triggerReward(combo: SecretCombo, lastToyId: string) {
    // Clear buffer
    clickBuffer = [];

    // Sound + haptics
    playSound('success', 0.6);
    haptic('success');

    // Mark as discovered
    discoveredSecrets = new Set([...discoveredSecrets, combo.id]);
    saveDiscovered();

    // Set up reward display
    activeReward = combo;
    fallingEmojis = generateFallingEmojis(combo.reward.emojis);
    showReward = true;

    // Dispatch event so shelf items can update glow
    if (browser) {
      window.dispatchEvent(new CustomEvent('secret-discovered', { detail: { comboId: combo.id } }));
    }

    // Auto-dismiss and then open the toy
    rewardDismissTimer = setTimeout(() => {
      showReward = false;
      activeReward = null;
      fallingEmojis = [];

      // Open the toy after the reward fades
      if (onDelayOpen) {
        onDelayOpen(lastToyId);
      }
    }, REWARD_DURATION);
  }

  // Check if a toy is part of any discovered combo
  export function isToyInDiscoveredCombo(toyId: string): boolean {
    return COMBOS.some(c => c.sequence.includes(toyId) && discoveredSecrets.has(c.id));
  }
</script>

{#if showReward && activeReward}
  <div
    class="secret-overlay"
    style="background: {activeReward.reward.bgColor}"
    role="alert"
    aria-live="assertive"
  >
    <!-- Falling emojis -->
    <div class="emoji-rain" aria-hidden="true">
      {#each fallingEmojis as emoji}
        <span
          class="falling-emoji"
          style="
            left: {emoji.left}%;
            animation-delay: {emoji.delay}s;
            animation-duration: {emoji.duration}s;
          "
        >{emoji.emoji}</span>
      {/each}
    </div>

    <!-- Reward content -->
    <div class="reward-content">
      {#if activeReward.id === 'internet'}
        <!-- AOL-style "You've Got Mail" -->
        <div class="aol-envelope">📧</div>
        <h2 class="reward-title aol-title" style="color: {activeReward.reward.textColor}">
          {activeReward.reward.title}
        </h2>
        <p class="reward-subtitle aol-subtitle" style="color: {activeReward.reward.textColor}">
          {activeReward.reward.subtitle}
        </p>
        <div class="aol-triangle"></div>
      {:else if activeReward.id === 'nerd'}
        <!-- Report card style -->
        <div class="report-card">
          <div class="report-header">
            <span class="report-school">SCHOLASTIC ELEMENTARY</span>
            <h2 class="reward-title report-title">
              {activeReward.reward.title}
            </h2>
          </div>
          <div class="report-grades">
            <div class="grade-row"><span>Math</span><span class="grade">A+</span></div>
            <div class="grade-row"><span>Science</span><span class="grade">A+</span></div>
            <div class="grade-row"><span>History</span><span class="grade">A+</span></div>
            <div class="grade-row"><span>Geography</span><span class="grade">A+</span></div>
            <div class="grade-row"><span>Computers</span><span class="grade">A+</span></div>
          </div>
          <p class="report-comment">
            {activeReward.reward.subtitle}
          </p>
        </div>
      {:else if activeReward.id === 'pets'}
        <!-- Pet store grand opening -->
        <div class="pet-banner">
          <span class="pet-star">&#11088;</span>
          <h2 class="reward-title pet-title" style="color: {activeReward.reward.textColor}">
            {activeReward.reward.title}
          </h2>
          <p class="reward-subtitle pet-subtitle" style="color: {activeReward.reward.textColor}">
            {activeReward.reward.subtitle}
          </p>
          <span class="pet-star">&#11088;</span>
        </div>
      {/if}
    </div>

    <!-- Combo name badge -->
    <div class="combo-badge">
      {activeReward.name}
    </div>
  </div>
{/if}

<style>
  /* ── Overlay ── */
  .secret-overlay {
    position: fixed;
    inset: 0;
    z-index: 1500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: secret-fade-in 0.3s ease-out;
    overflow: hidden;
  }

  @keyframes secret-fade-in {
    from { opacity: 0; transform: scale(1.05); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ── Emoji rain ── */
  .emoji-rain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .falling-emoji {
    position: absolute;
    top: -40px;
    font-size: 1.5rem;
    animation: emoji-fall linear forwards;
    opacity: 0.8;
  }

  @keyframes emoji-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 0.8;
    }
    100% {
      transform: translateY(calc(100vh + 60px)) rotate(360deg);
      opacity: 0.3;
    }
  }

  /* ── Reward content ── */
  .reward-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    animation: reward-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes reward-pop {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .reward-title {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(1.2rem, 6vw, 2.5rem);
    margin: 0;
    text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
    letter-spacing: 2px;
  }

  .reward-subtitle {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.5rem, 2.5vw, 0.9rem);
    margin: 0;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  /* ── AOL Style ── */
  .aol-envelope {
    font-size: 4rem;
    animation: envelope-bounce 0.5s ease-out;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  @keyframes envelope-bounce {
    0% { transform: translateY(-30px) scale(0); }
    60% { transform: translateY(5px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }

  .aol-title {
    font-size: clamp(1.5rem, 8vw, 3rem);
    animation: aol-glow 1s ease-in-out infinite alternate;
  }

  @keyframes aol-glow {
    from { text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4), 0 0 10px rgba(255, 204, 0, 0.3); }
    to { text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 204, 0, 0.6); }
  }

  .aol-subtitle {
    opacity: 0.9;
    letter-spacing: 3px;
  }

  .aol-triangle {
    width: 0;
    height: 0;
    border-left: 20px solid transparent;
    border-right: 20px solid transparent;
    border-bottom: 20px solid rgba(255, 255, 255, 0.15);
    margin-top: 1rem;
  }

  /* ── Report Card Style ── */
  .report-card {
    background: #fffef5;
    border: 3px solid #8b7355;
    border-radius: 4px;
    padding: 1.5rem;
    max-width: 320px;
    width: 90vw;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(139, 115, 85, 0.1);
    animation: card-flip 0.5s ease-out;
  }

  @keyframes card-flip {
    0% { transform: rotateY(90deg) scale(0.8); opacity: 0; }
    100% { transform: rotateY(0deg) scale(1); opacity: 1; }
  }

  .report-header {
    text-align: center;
    border-bottom: 2px solid #8b7355;
    padding-bottom: 0.5rem;
    margin-bottom: 0.8rem;
  }

  .report-school {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.3rem;
    color: #666;
    letter-spacing: 2px;
    display: block;
    margin-bottom: 0.3rem;
  }

  .report-title {
    color: #2a2a2a;
    font-size: clamp(0.7rem, 3vw, 1rem);
    text-shadow: none;
  }

  .report-grades {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.8rem;
  }

  .grade-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #333;
    border-bottom: 1px dotted #ccc;
    padding-bottom: 0.2rem;
  }

  .grade {
    color: #d4380d;
    font-weight: bold;
    font-size: 0.45rem;
  }

  .report-comment {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #d4380d;
    text-align: center;
    margin: 0;
    animation: grade-flash 0.5s ease-in-out 3;
  }

  @keyframes grade-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* ── Pet Store Style ── */
  .pet-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .pet-title {
    font-size: clamp(1.2rem, 6vw, 2rem);
    animation: pet-bounce 0.6s ease-out;
  }

  @keyframes pet-bounce {
    0% { transform: translateY(-20px); opacity: 0; }
    50% { transform: translateY(8px); }
    100% { transform: translateY(0); opacity: 1; }
  }

  .pet-subtitle {
    font-size: clamp(0.6rem, 3vw, 1rem);
    animation: pet-flash 0.4s ease-in-out 4;
  }

  @keyframes pet-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .pet-star {
    font-size: 2rem;
    animation: star-spin 1s linear infinite;
  }

  @keyframes star-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Combo badge ── */
  .combo-badge {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.4);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    white-space: nowrap;
    z-index: 3;
    letter-spacing: 1px;
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .secret-overlay {
      animation: none;
    }

    .reward-content {
      animation: none;
    }

    .falling-emoji {
      animation: none;
      display: none;
    }

    .aol-envelope {
      animation: none;
    }

    .aol-title {
      animation: none;
    }

    .report-card {
      animation: none;
    }

    .report-comment {
      animation: none;
    }

    .pet-title {
      animation: none;
    }

    .pet-subtitle {
      animation: none;
    }

    .pet-star {
      animation: none;
    }
  }

  /* ── Mobile ── */
  @media (max-width: 600px) {
    .falling-emoji {
      font-size: 1.2rem;
    }

    .aol-envelope {
      font-size: 3rem;
    }

    .report-card {
      padding: 1rem;
    }

    .combo-badge {
      bottom: calc(16px + env(safe-area-inset-bottom, 0));
      font-size: 0.35rem;
    }
  }
</style>
