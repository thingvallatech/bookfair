<script lang="ts">
  import type { Beanie } from '$lib/stores/beanies';
  import { closeTag, getDiscoveryStats } from '$lib/stores/beanieHunt';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    beanie: Beanie;
  }

  let { beanie }: Props = $props();

  const RARITY_COLORS: Record<string, string> = {
    'common': '#9e9e9e',
    'uncommon': '#4caf50',
    'rare': '#2196f3',
    'ultra-rare': '#9c27b0',
    'legendary': '#ff9800'
  };

  const stats = getDiscoveryStats();

  function handleClose() {
    playSound('whoosh', 0.3);
    closeTag();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup-backdrop" onclick={handleBackdropClick}>
  <div class="popup-container" role="dialog" aria-label={`${beanie.name} the ${beanie.animal}`}>
    <button class="close-btn" onclick={handleClose} aria-label="Close">×</button>

    <div class="discovery-banner">
      You found a Beanie Baby!
    </div>

    <div class="tag-content">
      <img src={beanie.image} alt={beanie.name} class="beanie-image" />

      <div class="ty-tag">
        <div class="tag-header">
          <span class="ty-logo">ty</span>
          <span class="tag-heart">&#x2665;</span>
        </div>
        <h2 class="tag-name">{beanie.name}™</h2>
        <p class="tag-animal">the {beanie.animal}</p>
        <div class="tag-divider"></div>
        <p class="tag-birthday">Birthday: {beanie.birthday}</p>
        <p class="tag-poem">{beanie.poem}</p>
        <div class="tag-rarity" style="color: {RARITY_COLORS[beanie.rarity]}">
          ★ {beanie.rarity.toUpperCase()} ★
        </div>
      </div>

      <div class="collection-progress">
        {stats.discovered} / {stats.total} discovered
      </div>
    </div>
  </div>
</div>

<style>
  .popup-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1005;
    animation: fadeIn 0.2s ease-out;
    padding: 1rem;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .popup-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: popIn 0.3s ease-out;
  }

  @keyframes popIn {
    from {
      transform: scale(0.8) translateY(20px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .close-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 8px;
    line-height: 1;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 107, 107, 0.8);
  }

  .discovery-banner {
    text-align: center;
    color: #f7d51d;
    font-family: 'Press Start 2P', cursive;
    font-size: 0.6rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .tag-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .beanie-image {
    width: 150px;
    height: 150px;
    object-fit: contain;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
    margin-bottom: 1rem;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .ty-tag {
    background: #fff;
    border: 4px solid #e74c3c;
    border-radius: 15px;
    padding: 1.25rem;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .tag-header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .ty-logo {
    font-family: serif;
    font-size: 1.75rem;
    font-weight: bold;
    font-style: italic;
    color: #e74c3c;
  }

  .tag-heart {
    color: #e74c3c;
    font-size: 1.25rem;
  }

  .tag-name {
    font-size: 1.25rem;
    color: #2c3e50;
    margin: 0;
    font-family: 'Comic Neue', 'Comic Sans MS', cursive;
  }

  .tag-animal {
    font-size: 0.85rem;
    color: #7f8c8d;
    margin: 0.25rem 0 0.75rem;
    font-family: 'Comic Neue', 'Comic Sans MS', cursive;
  }

  .tag-divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, #e74c3c, transparent);
    margin: 0.75rem 0;
  }

  .tag-birthday {
    font-size: 0.7rem;
    color: #e74c3c;
    margin: 0 0 0.75rem;
    font-family: 'Comic Neue', 'Comic Sans MS', cursive;
  }

  .tag-poem {
    font-size: 0.65rem;
    color: #2c3e50;
    font-style: italic;
    line-height: 1.8;
    white-space: pre-line;
    margin: 0 0 0.75rem;
    font-family: 'Comic Neue', 'Comic Sans MS', cursive;
  }

  .tag-rarity {
    font-size: 0.75rem;
    font-weight: bold;
    font-family: 'Press Start 2P', cursive;
  }

  .collection-progress {
    margin-top: 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.5rem;
  }

  @media (max-width: 500px) {
    .popup-container {
      padding: 1.5rem;
    }

    .beanie-image {
      width: 120px;
      height: 120px;
    }

    .ty-tag {
      padding: 1rem;
    }

    .tag-name {
      font-size: 1rem;
    }
  }
</style>
