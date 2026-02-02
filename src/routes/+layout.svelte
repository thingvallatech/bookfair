<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initializeHunt, tagPopupStore } from '$lib/stores/beanieHunt';
  import BeanieTagPopup from '$lib/components/BeanieTagPopup.svelte';

  let { children } = $props();

  let audioEnabled = $state(false);
  let showAudioPrompt = $state(true);

  function enableAudio() {
    audioEnabled = true;
    showAudioPrompt = false;
    localStorage.setItem('audioEnabled', 'true');
  }

  function disableAudio() {
    audioEnabled = false;
    showAudioPrompt = false;
    localStorage.setItem('audioEnabled', 'false');
  }

  onMount(() => {
    const stored = localStorage.getItem('audioEnabled');
    if (stored !== null) {
      audioEnabled = stored === 'true';
      showAudioPrompt = false;
    }

    // Initialize the beanie hunt for this session
    initializeHunt();
  });
</script>

<svelte:head>
  <title>The Book Fair</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>">

  <!-- Description -->
  <meta name="description" content="A shelf of interactive 90s toys at the end of the internet. 18 nostalgic experiences, from Tamagotchi to Kid Pix to Oregon Trail.">

  <!-- Open Graph -->
  <meta property="og:title" content="The Book Fair">
  <meta property="og:description" content="A shelf of interactive 90s toys at the end of the internet. 18 nostalgic experiences, from Tamagotchi to Kid Pix to Oregon Trail.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://thebookfair.thingvalla.tech">
  <!-- TODO: Create an actual og-preview.png (1200x630) and place it in static/ -->
  <meta property="og:image" content="/og-preview.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="The Book Fair">
  <meta name="twitter:description" content="A shelf of interactive 90s toys at the end of the internet. 18 nostalgic experiences, from Tamagotchi to Kid Pix to Oregon Trail.">
  <meta name="twitter:image" content="/og-preview.png">
</svelte:head>

<div class="app">
  {#if showAudioPrompt}
    <div class="audio-prompt">
      <div class="prompt-box">
        <h2>🔊 This site has sound!</h2>
        <p>For the full experience, turn on audio.</p>
        <div class="prompt-buttons">
          <button onclick={enableAudio}>Sound ON</button>
          <button onclick={disableAudio} class="secondary">No thanks</button>
        </div>
      </div>
    </div>
  {/if}

  <main>
    {@render children()}
  </main>

  {#if !showAudioPrompt}
    <div class="sound-toggle">
      <button
        onclick={() => audioEnabled = !audioEnabled}
        class="icon-button"
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  {/if}

  <!-- Beanie tag popup (global) -->
  {#if $tagPopupStore}
    <BeanieTagPopup beanie={$tagPopupStore} />
  {/if}
</div>

<style>
  .app {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  main {
    width: 100%;
    height: 100%;
  }

  .audio-prompt {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .prompt-box {
    background: linear-gradient(180deg, #fff9e6 0%, #f5e6d3 100%);
    border: 4px solid #2d3436;
    border-radius: 16px;
    padding: 32px 48px;
    text-align: center;
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.3);
    animation: popIn 0.3s ease-out;
  }

  @keyframes popIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .prompt-box h2 {
    font-size: 24px;
    margin-bottom: 12px;
  }

  .prompt-box p {
    margin-bottom: 24px;
    color: #636e72;
  }

  .prompt-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
  }

  .prompt-buttons .secondary {
    background: linear-gradient(180deg, #dfe6e9 0%, #b2bec3 100%);
  }

  .sound-toggle {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 100;
  }

  .icon-button {
    font-size: 24px;
    padding: 8px 12px;
    background: linear-gradient(180deg, #fff 0%, #dfe6e9 100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .prompt-box {
      animation: none;
    }
  }
</style>
