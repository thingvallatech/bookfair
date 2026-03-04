<script lang="ts">
  import { browser } from '$app/environment';
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    visible: boolean;
    onOutroEnd: () => void;
    children: Snippet;
  }

  let { visible, onOutroEnd, children }: Props = $props();

  let phase = $state<'hidden' | 'flash' | 'scanline' | 'reveal' | 'shown' | 'shrink' | 'dot'>('hidden');
  let reducedMotion = $state(false);

  // Track all active timeouts for cleanup
  let timeouts: ReturnType<typeof setTimeout>[] = [];

  function clearAllTimeouts() {
    for (const t of timeouts) clearTimeout(t);
    timeouts = [];
  }

  function scheduleTimeout(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timeouts.push(t);
    return t;
  }

  $effect(() => {
    if (browser) {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  });

  $effect(() => {
    if (!browser) return;

    // Only track `visible` as a dependency — read `phase` inside untrack
    // to prevent the effect from re-running (and canceling timeouts) when
    // phase changes during the animation sequence.
    const currentPhase = untrack(() => phase);

    if (visible && currentPhase === 'hidden') {
      clearAllTimeouts();

      // Opening sequence
      if (reducedMotion) {
        phase = 'shown';
        return;
      }

      // 1. White flash (50ms)
      phase = 'flash';
      scheduleTimeout(() => {
        // 2. Scanline expanding from center (100ms)
        phase = 'scanline';
        scheduleTimeout(() => {
          // 3. Content fades in (150ms)
          phase = 'reveal';
          scheduleTimeout(() => {
            phase = 'shown';
          }, 150);
        }, 100);
      }, 50);

      return () => clearAllTimeouts();
    }

    if (!visible && (currentPhase === 'shown' || currentPhase === 'reveal')) {
      clearAllTimeouts();

      // Closing sequence
      if (reducedMotion) {
        phase = 'hidden';
        onOutroEnd();
        return;
      }

      // 1. Content shrinks to horizontal line (150ms)
      phase = 'shrink';
      scheduleTimeout(() => {
        // 2. White dot fades out (100ms)
        phase = 'dot';
        scheduleTimeout(() => {
          phase = 'hidden';
          onOutroEnd();
        }, 100);
      }, 150);

      return () => clearAllTimeouts();
    }
  });
</script>

{#if phase !== 'hidden'}
  <div
    class="toy-transition"
    class:phase-flash={phase === 'flash'}
    class:phase-scanline={phase === 'scanline'}
    class:phase-reveal={phase === 'reveal'}
    class:phase-shown={phase === 'shown'}
    class:phase-shrink={phase === 'shrink'}
    class:phase-dot={phase === 'dot'}
    aria-hidden="true"
  >
    <!-- CRT scan line (opening) -->
    <div class="crt-scanline"></div>

    <!-- White dot (closing) -->
    <div class="crt-dot"></div>

    <!-- Content wrapper -->
    <div class="crt-content">
      {#if phase === 'reveal' || phase === 'shown' || phase === 'shrink'}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .toy-transition {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: #000;
    overflow: hidden;
    will-change: transform;
  }

  /* -- Opening: white flash -- */
  .phase-flash {
    background: #fff;
    animation: crtFlash 0.05s ease-out forwards;
  }

  @keyframes crtFlash {
    0% { background: #fff; }
    100% { background: #000; }
  }

  /* -- Opening: scan line expanding from center -- */
  .crt-scanline {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-50%) scaleY(0);
    opacity: 0;
    box-shadow: 0 0 15px 4px rgba(200, 220, 255, 0.5);
    pointer-events: none;
    will-change: transform, opacity;
  }

  .phase-scanline .crt-scanline {
    animation: scanExpand 0.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes scanExpand {
    0% {
      opacity: 1;
      height: 2px;
      transform: translateY(-50%) scaleY(1);
      box-shadow: 0 0 15px 4px rgba(200, 220, 255, 0.5);
    }
    100% {
      opacity: 1;
      height: 110vh;
      transform: translateY(-50%) scaleY(1);
      box-shadow: 0 0 40px 10px rgba(200, 220, 255, 0.2);
    }
  }

  .phase-reveal .crt-scanline,
  .phase-shown .crt-scanline,
  .phase-shrink .crt-scanline,
  .phase-dot .crt-scanline {
    opacity: 0;
  }

  /* -- Opening: content fades in -- */
  .crt-content {
    position: absolute;
    inset: 0;
    opacity: 0;
    will-change: opacity, transform;
  }

  .phase-reveal .crt-content {
    animation: contentIn 0.15s ease-out forwards;
  }

  @keyframes contentIn {
    0% {
      opacity: 0;
      filter: brightness(1.3) saturate(0.5);
    }
    100% {
      opacity: 1;
      filter: brightness(1) saturate(1);
    }
  }

  .phase-shown .crt-content {
    opacity: 1;
  }

  /* -- Closing: shrink to horizontal line -- */
  .phase-shrink {
    animation: crtOff 0.15s cubic-bezier(0.7, 0, 1, 0.5) forwards;
  }

  .phase-shrink .crt-content {
    opacity: 1;
  }

  @keyframes crtOff {
    0% {
      transform: scaleY(1) scaleX(1);
      filter: brightness(1);
    }
    60% {
      transform: scaleY(0.01) scaleX(1.02);
      filter: brightness(2);
    }
    100% {
      transform: scaleY(0.005) scaleX(0.8);
      filter: brightness(3);
    }
  }

  /* -- Closing: white dot fades out -- */
  .crt-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    will-change: opacity;
  }

  .phase-dot {
    background: #000;
    transform: none;
  }

  .phase-dot .crt-content {
    opacity: 0;
  }

  .phase-dot .crt-dot {
    animation: dotFade 0.1s ease-out forwards;
  }

  @keyframes dotFade {
    0% {
      opacity: 1;
      box-shadow: 0 0 20px 8px rgba(200, 220, 255, 0.8),
                  0 0 40px 16px rgba(200, 220, 255, 0.3);
    }
    100% {
      opacity: 0;
      box-shadow: 0 0 4px 2px rgba(200, 220, 255, 0.2),
                  0 0 8px 4px rgba(200, 220, 255, 0.05);
    }
  }

  /* -- Reduced motion: instant transitions -- */
  @media (prefers-reduced-motion: reduce) {
    .toy-transition {
      animation: none !important;
    }

    .crt-scanline,
    .crt-dot {
      display: none;
    }

    .crt-content {
      opacity: 1;
      animation: none !important;
      filter: none !important;
    }

    .phase-flash {
      background: #1a1a2e;
      animation: none;
    }

    .phase-shrink {
      animation: none;
    }
  }
</style>
