<script lang="ts">
  interface Props {
    toy?: string;
  }

  let { toy = 'default' }: Props = $props();

  // Toy-specific loading messages
  const toyMessages: Record<string, string[]> = {
    bados: [
      'Loading Windows XP...',
      'Checking system files...',
      'Installing drivers...',
      'Not responding...',
      'Searching for updates...',
      'Initializing desktop...',
      'Loading critical services...',
      'Please wait...',
    ],
    winamp: [
      'Buffering...',
      'Loading visualization engine...',
      'Initializing Milkdrop...',
      'Whipping the llama\'s ass...',
      'Loading presets...',
      'Connecting to audio...',
      'Decoding MP3...',
    ],
    pokedoom: [
      'Loading WAD files...',
      'Initializing engine...',
      'Spawning Pokemon...',
      'Building map...',
      'Loading textures...',
      'Calibrating Pokeballs...',
      'Gotta frag \'em all...',
    ],
    retro: [
      'Loading...',
      'Initializing graphics...',
      'Drawing stars...',
      'Rendering background...',
      'Powering up CRT...',
    ],
    default: [
      'Loading...',
      'Please wait...',
      'Almost there...',
      'Warming up...',
      'Booting up...',
    ],
  };

  let messages = $derived(toyMessages[toy] || toyMessages.default);
  let messageIndex = $state(0);
  let dotCount = $state(0);

  // Cycle through messages
  $effect(() => {
    const msgs = messages;
    const msgInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % msgs.length;
    }, 1800);

    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
    }, 400);

    return () => {
      clearInterval(msgInterval);
      clearInterval(dotInterval);
    };
  });

  let dots = $derived('.'.repeat(dotCount));

  // Toy-specific accent colors
  const toyColors: Record<string, { bg: string; accent: string; glow: string }> = {
    bados: { bg: '#000078', accent: '#fff', glow: 'rgba(0, 120, 215, 0.4)' },
    winamp: { bg: '#1a1a1a', accent: '#00ff00', glow: 'rgba(0, 255, 0, 0.3)' },
    pokedoom: { bg: '#000', accent: '#33ff33', glow: 'rgba(51, 255, 51, 0.3)' },
    retro: { bg: '#0a0a2e', accent: '#f7d51d', glow: 'rgba(247, 213, 29, 0.3)' },
    default: { bg: '#111', accent: '#0f0', glow: 'rgba(0, 255, 0, 0.2)' },
  };

  let colors = $derived(toyColors[toy] || toyColors.default);
</script>

<div
  class="toy-loader"
  style="--loader-bg: {colors.bg}; --loader-accent: {colors.accent}; --loader-glow: {colors.glow}"
>
  <div class="scanlines"></div>

  <div class="loader-content">
    {#if toy === 'bados'}
      <div class="loader-icon bados-icon">
        <span class="xp-flag">&#127987;&#65039;</span>
      </div>
    {:else if toy === 'winamp'}
      <div class="loader-icon winamp-icon">
        <span class="winamp-bolt">&#9889;</span>
      </div>
    {:else if toy === 'pokedoom'}
      <div class="loader-icon doom-icon">
        <span class="doom-skull">&#128128;</span>
      </div>
    {:else}
      <div class="loader-icon default-icon">
        <span class="floppy">&#128190;</span>
      </div>
    {/if}

    <div class="loader-message">
      {messages[messageIndex]}{dots}
    </div>

    <div class="loader-bar-track">
      <div class="loader-bar-fill"></div>
    </div>

    <div class="loader-sub">
      <span class="blink-cursor">_</span>
    </div>
  </div>
</div>

<style>
  .toy-loader {
    position: absolute;
    inset: 0;
    background: var(--loader-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    overflow: hidden;
  }

  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 4px
    );
    pointer-events: none;
    z-index: 2;
    animation: scanMove 0.1s steps(2) infinite;
  }

  @keyframes scanMove {
    0% { transform: translateY(0); }
    100% { transform: translateY(4px); }
  }

  .loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    z-index: 1;
    padding: 32px;
  }

  .loader-icon {
    font-size: 48px;
    animation: pulse 1.5s ease-in-out infinite;
    filter: drop-shadow(0 0 12px var(--loader-glow));
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }

  .bados-icon {
    animation: pulse 1.5s ease-in-out infinite;
  }

  .winamp-icon {
    animation: pulse 1s ease-in-out infinite, glowPulse 2s ease-in-out infinite;
  }

  .doom-icon {
    animation: pulse 0.8s ease-in-out infinite;
  }

  @keyframes glowPulse {
    0%, 100% { filter: drop-shadow(0 0 8px var(--loader-glow)); }
    50% { filter: drop-shadow(0 0 24px var(--loader-glow)); }
  }

  .loader-message {
    font-family: 'Press Start 2P', monospace;
    font-size: 11px;
    color: var(--loader-accent);
    text-align: center;
    min-height: 2em;
    line-height: 1.6;
    text-shadow: 0 0 8px var(--loader-glow);
    max-width: 300px;
  }

  .loader-bar-track {
    width: 200px;
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--loader-accent);
    border-radius: 1px;
    overflow: hidden;
  }

  .loader-bar-fill {
    height: 100%;
    width: 30%;
    background: var(--loader-accent);
    animation: barSlide 1.2s ease-in-out infinite;
    box-shadow: 0 0 6px var(--loader-glow);
  }

  @keyframes barSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  .loader-sub {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: var(--loader-accent);
    opacity: 0.5;
  }

  .blink-cursor {
    animation: cursorBlink 0.6s steps(1) infinite;
  }

  @keyframes cursorBlink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
</style>
