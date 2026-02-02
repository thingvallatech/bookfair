<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    gesture: 'tap' | 'drag' | 'draw';
    message: string;
    storageKey: string;
  }

  let { gesture, message, storageKey }: Props = $props();

  let visible = $state(false);
  let fading = $state(false);
  let passthrough = $state(false);
  let isTouchDevice = $state(false);

  function dismiss() {
    if (!visible) return;
    fading = true;
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
    setTimeout(() => {
      visible = false;
    }, 400);
  }

  onMount(() => {
    // Detect touch device
    isTouchDevice =
      'ontouchstart' in window ||
      window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) return;

    // Check if already dismissed
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {}

    visible = true;

    // After 2 seconds, allow pointer events to pass through
    const passthroughTimer = setTimeout(() => {
      passthrough = true;
    }, 2000);

    // Auto-dismiss after 3.5 seconds
    const dismissTimer = setTimeout(() => {
      dismiss();
    }, 3500);

    return () => {
      clearTimeout(passthroughTimer);
      clearTimeout(dismissTimer);
    };
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="touch-hint"
    class:fading
    class:passthrough
    onclick={dismiss}
  >
    <div class="hint-content">
      <div class="gesture-icon gesture-{gesture}">
        <span class="hand">&#9995;</span>
        {#if gesture === 'drag'}
          <span class="trail trail-drag"></span>
        {:else if gesture === 'draw'}
          <span class="trail trail-draw"></span>
        {:else}
          <span class="ripple"></span>
        {/if}
      </div>
      <p class="hint-text">{message}</p>
    </div>
  </div>
{/if}

<style>
  .touch-hint {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 900;
    animation: hint-appear 0.4s ease-out;
    pointer-events: auto;
  }

  .touch-hint.passthrough {
    pointer-events: none;
  }

  .touch-hint.fading {
    animation: hint-fade 0.4s ease-in forwards;
  }

  .hint-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 12px;
    padding: 14px 24px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .hint-text {
    margin: 0;
    font-family: 'Press Start 2P', cursive;
    font-size: 9px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    white-space: nowrap;
  }

  .gesture-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hand {
    font-size: 28px;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  }

  /* --- Tap gesture --- */
  .gesture-tap .hand {
    animation: tap-bounce 1.2s ease-in-out infinite;
  }

  .ripple {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: ripple-expand 1.2s ease-out infinite;
    pointer-events: none;
  }

  /* --- Drag gesture --- */
  .gesture-drag .hand {
    animation: drag-slide 1.6s ease-in-out infinite;
  }

  .trail-drag {
    position: absolute;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5));
    border-radius: 2px;
    top: 50%;
    left: 2px;
    transform: translateY(-50%);
    animation: trail-drag-anim 1.6s ease-in-out infinite;
    pointer-events: none;
  }

  /* --- Draw gesture --- */
  .gesture-draw .hand {
    animation: draw-move 2s ease-in-out infinite;
  }

  .trail-draw {
    position: absolute;
    width: 36px;
    height: 36px;
    top: 6px;
    left: 6px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 50% 0 50% 50%;
    border-right-color: transparent;
    border-top-color: transparent;
    animation: trail-draw-anim 2s ease-in-out infinite;
    pointer-events: none;
  }

  /* --- Keyframes --- */

  @keyframes hint-appear {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes hint-fade {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-8px);
    }
  }

  @keyframes tap-bounce {
    0%, 100% {
      transform: scale(1) translateY(0);
    }
    30% {
      transform: scale(0.85) translateY(4px);
    }
    50% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes ripple-expand {
    0% {
      width: 10px;
      height: 10px;
      opacity: 0;
    }
    30% {
      opacity: 0.7;
    }
    50% {
      width: 40px;
      height: 40px;
      opacity: 0;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes drag-slide {
    0%, 100% {
      transform: translateX(-14px);
    }
    50% {
      transform: translateX(14px);
    }
  }

  @keyframes trail-drag-anim {
    0%, 100% {
      opacity: 0;
      width: 0;
    }
    20% {
      opacity: 0.6;
      width: 0;
    }
    50% {
      opacity: 0.6;
      width: 32px;
    }
    80% {
      opacity: 0;
      width: 32px;
    }
  }

  @keyframes draw-move {
    0% {
      transform: translate(-8px, 8px);
    }
    25% {
      transform: translate(8px, -4px);
    }
    50% {
      transform: translate(-4px, -8px);
    }
    75% {
      transform: translate(6px, 6px);
    }
    100% {
      transform: translate(-8px, 8px);
    }
  }

  @keyframes trail-draw-anim {
    0%, 100% {
      opacity: 0.3;
      transform: rotate(0deg);
    }
    50% {
      opacity: 0.6;
      transform: rotate(180deg);
    }
  }

  @media (max-width: 400px) {
    .hint-text {
      font-size: 7px;
    }

    .hint-content {
      padding: 10px 16px;
      gap: 8px;
    }

    .gesture-icon {
      width: 40px;
      height: 40px;
    }

    .hand {
      font-size: 22px;
    }
  }
</style>
