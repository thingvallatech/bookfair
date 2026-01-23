<script lang="ts">
  import { browser } from '$app/environment';

  interface Props {
    beanie: {
      name: string;
      animal: string;
      image: string;
      birthday: string;
      poem: string;
      rarity: string;
    };
    onClose: () => void;
  }

  let { beanie, onClose }: Props = $props();

  const RARITY_COLORS: Record<string, string> = {
    'common': '#9e9e9e',
    'uncommon': '#4caf50',
    'rare': '#2196f3',
    'ultra-rare': '#9c27b0',
    'legendary': '#ff9800'
  };

  // Mark as discovered
  $effect(() => {
    if (browser && beanie) {
      const saved = localStorage.getItem('bookfair-beanie-discovered');
      const discovered: string[] = saved ? JSON.parse(saved) : [];
      if (!discovered.includes(beanie.name)) {
        discovered.push(beanie.name);
        localStorage.setItem('bookfair-beanie-discovered', JSON.stringify(discovered));
      }
    }
  });
</script>

<div class="beanie-tag-view">
  <button class="close-btn" onclick={onClose}>×</button>

  <div class="tag-content">
    <img src={beanie.image} alt={beanie.name} class="beanie-image" />

    <div class="ty-tag">
      <div class="tag-header">
        <span class="ty-logo">ty</span>
        <span class="tag-heart">♥</span>
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
  </div>
</div>

<style>
  .beanie-tag-view {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    width: 50px;
    height: 50px;
    font-size: 2rem;
    cursor: pointer;
    border-radius: 8px;
    z-index: 100;
    line-height: 1;
  }

  .close-btn:hover {
    background: rgba(255, 107, 107, 0.8);
  }

  .tag-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 400px;
  }

  .beanie-image {
    width: 200px;
    height: 200px;
    object-fit: contain;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
    margin-bottom: 1.5rem;
  }

  .ty-tag {
    background: #fff;
    border: 4px solid #e74c3c;
    border-radius: 15px;
    padding: 1.5rem;
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
    font-size: 2rem;
    font-weight: bold;
    font-style: italic;
    color: #e74c3c;
  }

  .tag-heart {
    color: #e74c3c;
    font-size: 1.5rem;
  }

  .tag-name {
    font-size: 1.5rem;
    color: #2c3e50;
    margin: 0;
    font-family: 'Comic Neue', cursive;
  }

  .tag-animal {
    font-size: 0.9rem;
    color: #7f8c8d;
    margin: 0.25rem 0 0.75rem;
  }

  .tag-divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, #e74c3c, transparent);
    margin: 0.75rem 0;
  }

  .tag-birthday {
    font-size: 0.75rem;
    color: #e74c3c;
    margin: 0 0 0.75rem;
  }

  .tag-poem {
    font-size: 0.7rem;
    color: #2c3e50;
    font-style: italic;
    line-height: 1.8;
    white-space: pre-line;
    margin: 0 0 0.75rem;
  }

  .tag-rarity {
    font-size: 0.8rem;
    font-weight: bold;
  }

  @media (max-width: 500px) {
    .beanie-image {
      width: 150px;
      height: 150px;
    }

    .ty-tag {
      padding: 1rem;
    }

    .tag-name {
      font-size: 1.2rem;
    }
  }
</style>
