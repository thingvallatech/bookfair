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
  type Phase = 'theme' | 'color' | 'number' | 'fortune';
  let phase = $state<Phase>('theme');

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'behind-catcher' }];
  let beanie = $state<Beanie | null>(null);

  onMount(() => {
    registerSpots('cootiecatcher', hidingSpots);
    const beanies = getBeaniesForArea('cootiecatcher');
    beanie = beanies.get('behind-catcher') || null;
  });
</script>

<div class="cootie-container">
  <CloseButton {onClose} variant="light" />

  <div class="game-area">
    <h1 class="title">Cootie Catcher</h1>

    <div class="catcher-wrapper">
      <div class="catcher-3d">
        <div class="catcher">
          <div class="flap flap-top">
            <div class="flap-outer">1</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-right">
            <div class="flap-outer">2</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-bottom">
            <div class="flap-outer">3</div>
            <div class="flap-inner">?</div>
          </div>
          <div class="flap flap-left">
            <div class="flap-outer">4</div>
            <div class="flap-inner">?</div>
          </div>
        </div>
      </div>
    </div>

    <p class="instruction">
      {#if phase === 'theme'}
        Pick a theme to begin
      {:else if phase === 'color'}
        Pick a color
      {:else if phase === 'number'}
        Pick a number
      {:else}
        Your fortune awaits...
      {/if}
    </p>
  </div>

  {#if beanie}
    <HidingBeanie {beanie} class="cootie-beanie" />
  {/if}
</div>

<style>
  .cootie-container {
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Patrick Hand', cursive;
  }

  .game-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .title {
    font-size: 2rem;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    margin: 0;
  }

  .catcher-wrapper {
    perspective: 800px;
  }

  .catcher-3d {
    transform-style: preserve-3d;
    width: 200px;
    height: 200px;
  }

  .catcher {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transform: rotateX(15deg);
  }

  .flap {
    position: absolute;
    width: 0;
    height: 0;
    transform-style: preserve-3d;
    transition: transform 0.3s ease;
  }

  .flap-outer,
  .flap-inner {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    backface-visibility: hidden;
  }

  /* Triangle flaps using borders */
  .flap-top {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 86px solid #fff8e7;
    transform-origin: bottom center;
  }

  .flap-top .flap-outer {
    top: 30px;
    left: -10px;
    color: #e74c3c;
  }

  .flap-right {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 86px solid #fff8e7;
    transform-origin: left center;
  }

  .flap-right .flap-outer {
    top: -10px;
    left: -60px;
    color: #3498db;
  }

  .flap-bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-top: 86px solid #fff8e7;
    transform-origin: top center;
  }

  .flap-bottom .flap-outer {
    bottom: 30px;
    left: -10px;
    color: #f1c40f;
  }

  .flap-left {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-right: 86px solid #fff8e7;
    transform-origin: right center;
  }

  .flap-left .flap-outer {
    top: -10px;
    right: -60px;
    color: #2ecc71;
  }

  .instruction {
    font-size: 1.3rem;
    color: white;
    text-align: center;
    margin: 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  }

  :global(.cootie-beanie) {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 5;
  }

  @media (max-width: 400px) {
    .catcher-3d {
      width: 160px;
      height: 160px;
    }

    .title {
      font-size: 1.5rem;
    }
  }
</style>
