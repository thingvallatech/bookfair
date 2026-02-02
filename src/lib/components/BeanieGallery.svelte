<script lang="ts">
  import { onMount } from 'svelte';
  import { ALL_BEANIES, type Beanie } from '$lib/stores/beanies';
  import { getAllTimeDiscovered, getDiscoveryStats } from '$lib/stores/beanieHunt';
  import { playSound } from '$lib/stores/audio';
  import CloseButton from './CloseButton.svelte';

  interface Props { onClose: () => void; }
  let { onClose }: Props = $props();

  let discovered = $state<Set<string>>(new Set());
  let stats = $state({ discovered: 0, total: 39 });

  const RARITY_ORDER: Beanie['rarity'][] = ['common', 'uncommon', 'rare', 'ultra-rare', 'legendary'];
  const RARITY_COLORS: Record<string, string> = {
    common: '#aaa', uncommon: '#4caf50', rare: '#2196f3', 'ultra-rare': '#9c27b0', legendary: '#ffd700',
  };
  const RARITY_LABELS: Record<string, string> = {
    common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'ultra-rare': 'Ultra-Rare', legendary: 'Legendary',
  };

  const groups = new Map<string, Beanie[]>();
  for (const rarity of RARITY_ORDER) {
    const list = ALL_BEANIES.filter(b => b.rarity === rarity);
    if (list.length > 0) groups.set(rarity, list);
  }

  onMount(() => {
    discovered = new Set(getAllTimeDiscovered());
    stats = getDiscoveryStats();
    playSound('pop', 0.3);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="gallery-overlay" role="dialog" aria-label="Beanie Baby Collection">
  <div class="gallery-inner">
    <CloseButton {onClose} />
    <div class="gallery-header">
      <h2 class="gallery-title">Beanie Baby Collection</h2>
      <div class="progress-counter">
        <span class="found-count">{stats.discovered}</span>
        <span class="sep">/</span>
        <span class="total-count">{stats.total}</span>
        <span class="found-label">Found</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(stats.discovered / stats.total) * 100}%"></div>
      </div>
    </div>
    <div class="gallery-scroll">
      {#each RARITY_ORDER as rarity}
        {@const beanies = groups.get(rarity)}
        {#if beanies && beanies.length > 0}
          <div class="rarity-section">
            <h3 class="rarity-header" style="color: {RARITY_COLORS[rarity]}">
              {RARITY_LABELS[rarity]}
              <span class="rarity-count">({beanies.filter(b => discovered.has(b.name)).length}/{beanies.length})</span>
            </h3>
            <div class="beanie-grid">
              {#each beanies as beanie}
                {@const isFound = discovered.has(beanie.name)}
                <div class="beanie-card" class:discovered={isFound} style="--rc: {RARITY_COLORS[beanie.rarity]}">
                  <div class="img-wrap">
                    <img src={beanie.image} alt={isFound ? beanie.name : 'Unknown beanie'} class="beanie-img" class:silhouette={!isFound} />
                  </div>
                  <span class="beanie-name">{isFound ? beanie.name : '???'}</span>
                  {#if isFound}<span class="beanie-animal">{beanie.animal}</span>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .gallery-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.2s ease-out; padding: 1rem;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .gallery-inner {
    position: relative; width: 100%; max-width: 800px; max-height: 90vh;
    background: #1a1a2e; border: 3px solid #333; border-radius: 12px;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .gallery-header {
    text-align: center; padding: 1.5rem 3.5rem 1rem;
    border-bottom: 2px solid #2a2a4a; flex-shrink: 0;
  }
  .gallery-title {
    font-family: 'Press Start 2P', monospace; font-size: 0.85rem;
    color: #f7d51d; margin: 0 0 0.75rem; text-shadow: 2px 2px 0 #000;
  }
  .progress-counter {
    display: flex; align-items: baseline; justify-content: center;
    gap: 0.25rem; margin-bottom: 0.5rem;
  }
  .found-count { font-family: 'Press Start 2P', monospace; font-size: 1.2rem; color: #4caf50; }
  .sep { font-family: 'Press Start 2P', monospace; font-size: 0.7rem; color: #666; }
  .total-count { font-family: 'Press Start 2P', monospace; font-size: 0.7rem; color: #888; }
  .found-label { font-family: 'Press Start 2P', monospace; font-size: 0.5rem; color: #666; margin-left: 0.25rem; }
  .progress-bar {
    width: 100%; max-width: 300px; height: 8px;
    background: #2a2a4a; border-radius: 4px; margin: 0 auto; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a);
    border-radius: 4px; transition: width 0.5s ease-out;
  }
  .gallery-scroll { overflow-y: auto; padding: 1rem 1.5rem 1.5rem; flex: 1; }
  .rarity-section { margin-bottom: 1.5rem; }
  .rarity-section:last-child { margin-bottom: 0; }
  .rarity-header {
    font-family: 'Press Start 2P', monospace; font-size: 0.55rem;
    margin: 0 0 0.75rem; padding-bottom: 0.4rem;
    border-bottom: 1px solid #2a2a4a; display: flex; align-items: baseline; gap: 0.5rem;
  }
  .rarity-count { font-size: 0.45rem; opacity: 0.6; }
  .beanie-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem;
  }
  .beanie-card {
    display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
    padding: 0.6rem 0.4rem; background: rgba(255, 255, 255, 0.03);
    border: 2px solid #2a2a4a; border-radius: 8px; transition: all 0.2s ease;
  }
  .beanie-card.discovered {
    border-color: var(--rc);
    box-shadow: 0 0 12px color-mix(in srgb, var(--rc) 30%, transparent);
  }
  .img-wrap { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }
  .beanie-img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .beanie-img.silhouette { filter: brightness(0); opacity: 0.3; }
  .beanie-name {
    font-family: 'Press Start 2P', monospace; font-size: 0.4rem;
    color: #ddd; text-align: center; line-height: 1.3;
  }
  .beanie-card:not(.discovered) .beanie-name { color: #555; }
  .beanie-animal { font-size: 0.6rem; color: #888; text-align: center; }

  @media (max-width: 500px) {
    .gallery-header { padding: 1rem 3rem 0.75rem; }
    .gallery-title { font-size: 0.65rem; }
    .gallery-scroll { padding: 0.75rem 1rem 1rem; }
    .beanie-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; }
    .img-wrap { width: 48px; height: 48px; }
    .beanie-name { font-size: 0.35rem; }
  }
</style>
