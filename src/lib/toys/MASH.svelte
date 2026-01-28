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

  // Game phases
  type Phase = 'setup' | 'spiral' | 'elimination' | 'result';
  let phase = $state<Phase>('setup');

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'paper-corner' }];
  let beanie = $state<Beanie | null>(null);

  onMount(() => {
    registerSpots('mash', hidingSpots);
    const beanies = getBeaniesForArea('mash');
    beanie = beanies.get('paper-corner') || null;
  });
</script>

<div class="mash-container">
  <CloseButton {onClose} variant="dark" />

  <div class="notebook-paper">
    <div class="paper-holes">
      <div class="hole"></div>
      <div class="hole"></div>
      <div class="hole"></div>
    </div>

    <div class="paper-content">
      <h1 class="title">M.A.S.H.</h1>
      <p class="subtitle">Mansion • Apartment • Shack • House</p>

      {#if phase === 'setup'}
        <p>Setup phase coming soon...</p>
      {:else if phase === 'spiral'}
        <p>Spiral phase coming soon...</p>
      {:else if phase === 'elimination'}
        <p>Elimination phase coming soon...</p>
      {:else if phase === 'result'}
        <p>Result phase coming soon...</p>
      {/if}
    </div>

    {#if beanie}
      <HidingBeanie {beanie} class="mash-beanie" />
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

  .mash-container {
    position: fixed;
    inset: 0;
    background: #8b7355;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Patrick Hand', cursive;
  }

  .notebook-paper {
    position: relative;
    width: 100%;
    max-width: 500px;
    min-height: 600px;
    background:
      repeating-linear-gradient(
        transparent,
        transparent 31px,
        #9dd3e5 31px,
        #9dd3e5 32px
      ),
      linear-gradient(to right, #fef8e8, #faf3dc);
    border-radius: 4px;
    box-shadow:
      2px 2px 8px rgba(0, 0, 0, 0.3),
      inset 0 0 60px rgba(0, 0, 0, 0.05);
    padding: 1rem 1rem 1rem 3rem;
  }

  .paper-holes {
    position: absolute;
    left: 12px;
    top: 40px;
    bottom: 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hole {
    width: 16px;
    height: 16px;
    background: #8b7355;
    border-radius: 50%;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.3);
  }

  .paper-content {
    position: relative;
    padding-left: 20px;
    border-left: 2px solid #f5989d;
  }

  .title {
    font-size: 2.5rem;
    color: #2c5aa0;
    margin: 0 0 0.25rem 0;
    text-decoration: underline;
  }

  .subtitle {
    font-size: 1rem;
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  :global(.mash-beanie) {
    position: absolute;
    bottom: -20px;
    right: 20px;
    z-index: 5;
  }

  @media (max-width: 500px) {
    .notebook-paper {
      min-height: auto;
      padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    }

    .title {
      font-size: 2rem;
    }
  }
</style>
