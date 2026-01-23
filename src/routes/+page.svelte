<script lang="ts">
  import RetroBackground from '$lib/components/RetroBackground.svelte';
  import DialUpModem from '$lib/toys/DialUpModem.svelte';
  import KooshBall from '$lib/toys/KooshBall.svelte';

  // Which object is currently "open" (fullscreen experience)
  let activeObject = $state<string | null>(null);

  // Shelf objects - will grow over time
  const shelfObjects = [
    { id: 'modem', name: 'Dial-Up Modem', icon: '📠' },
    { id: 'koosh', name: 'Koosh Ball', icon: '🔴' },
    { id: 'kidpix', name: 'Kid Pix', icon: '🎨', comingSoon: true },
    { id: 'pogs', name: 'Pog Tube', icon: '🪙', comingSoon: true },
  ];

  function openObject(id: string) {
    const obj = shelfObjects.find(o => o.id === id);
    if (obj?.comingSoon) return;
    activeObject = id;
  }

  function closeObject() {
    activeObject = null;
  }
</script>

<div class="crt-container">
  <!-- Animated background -->
  <RetroBackground />

  <!-- CRT Effects overlay -->
  <div class="crt-effects"></div>

  <!-- Main content -->
  <main class="main-content">
    <!-- Title -->
    <header class="site-header">
      <h1 class="nes-text is-warning">The Book Fair</h1>
      <p class="subtitle">at the end of the internet</p>
    </header>

    <!-- The Shelf -->
    <section class="shelf-section">
      <div class="nes-container is-dark with-title shelf-container">
        <p class="title">~ the shelf ~</p>

        <div class="shelf-items">
          {#each shelfObjects as obj}
            <button
              class="shelf-item nes-pointer"
              class:disabled={obj.comingSoon}
              onclick={() => openObject(obj.id)}
              title={obj.comingSoon ? `${obj.name} (coming soon)` : obj.name}
            >
              <div class="item-icon">{obj.icon}</div>
              <span class="item-label">{obj.name}</span>
              {#if obj.comingSoon}
                <span class="nes-badge"><span class="is-error">SOON</span></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Wood shelf visual -->
      <div class="shelf-wood">
        <div class="shelf-shadow"></div>
      </div>
    </section>

    <!-- Hint text -->
    <p class="hint nes-text is-disabled">click an object to explore</p>
  </main>
</div>

<!-- Active object overlay -->
{#if activeObject === 'modem'}
  <div class="object-view">
    <DialUpModem onClose={closeObject} />
  </div>
{:else if activeObject === 'koosh'}
  <div class="object-view">
    <KooshBall onClose={closeObject} />
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
  }

  /* Header */
  .site-header {
    text-align: center;
    margin-bottom: 3rem;
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

  /* Shelf Section */
  .shelf-section {
    width: 100%;
    max-width: 800px;
    margin: auto 0;
  }

  .shelf-container {
    background: rgba(33, 37, 41, 0.9) !important;
    padding: 2rem !important;
  }

  .shelf-items {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 1.5rem;
    min-height: 120px;
    padding-top: 1rem;
  }

  .shelf-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 1rem;
    transition: transform 0.2s ease-out;
    position: relative;
  }

  .shelf-item:hover:not(.disabled) {
    transform: translateY(-12px) scale(1.1);
  }

  .shelf-item:active:not(.disabled) {
    transform: translateY(-6px) scale(1.05);
  }

  .shelf-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .item-icon {
    font-size: 3rem;
    line-height: 1;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }

  .item-label {
    font-size: 0.5rem;
    color: #fff;
    text-shadow: 1px 1px 0 #000;
    white-space: nowrap;
  }

  .shelf-item .nes-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    transform: scale(0.7);
  }

  /* Wood shelf */
  .shelf-wood {
    height: 24px;
    background: linear-gradient(180deg, #d4a574 0%, #b8956a 50%, #8b6914 100%);
    border: 4px solid #5c4a1f;
    border-top: none;
    margin: 0 1rem;
    position: relative;
  }

  .shelf-shadow {
    position: absolute;
    bottom: -16px;
    left: 10%;
    right: 10%;
    height: 12px;
    background: rgba(0, 0, 0, 0.3);
    filter: blur(8px);
    border-radius: 50%;
  }

  /* Hint */
  .hint {
    margin-top: auto;
    font-size: 0.5rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  /* Object overlay */
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
</style>
