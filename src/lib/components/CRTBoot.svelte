<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onComplete: () => void;
  }

  let { onComplete }: Props = $props();

  let phase = $state<'black' | 'line' | 'expand' | 'static' | 'glow' | 'fade' | 'done'>('black');
  let noiseCanvas = $state<HTMLCanvasElement | null>(null);
  let animationFrame = 0;

  function drawNoise(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    animationFrame = requestAnimationFrame(() => drawNoise(canvas));
  }

  onMount(() => {
    if (!browser) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      phase = 'done';
      onComplete();
      return;
    }

    // Check if already played this session
    if (sessionStorage.getItem('crt-boot-played')) {
      phase = 'done';
      onComplete();
      return;
    }

    // Mark as played
    sessionStorage.setItem('crt-boot-played', '1');

    // Phase 1: Black screen (100ms)
    phase = 'black';

    setTimeout(() => {
      // Phase 2: Thin white line appears
      phase = 'line';

      setTimeout(() => {
        // Phase 3: Line expands vertically
        phase = 'expand';
        playSound('pop', 0.15);

        setTimeout(() => {
          // Phase 4: Static noise burst
          phase = 'static';
          if (noiseCanvas) {
            noiseCanvas.width = Math.floor(window.innerWidth / 4);
            noiseCanvas.height = Math.floor(window.innerHeight / 4);
            drawNoise(noiseCanvas);
          }

          setTimeout(() => {
            // Phase 5: Phosphor glow
            cancelAnimationFrame(animationFrame);
            phase = 'glow';

            setTimeout(() => {
              // Phase 6: Fade out
              phase = 'fade';

              setTimeout(() => {
                phase = 'done';
                onComplete();
              }, 250);
            }, 200);
          }, 150);
        }, 350);
      }, 80);
    }, 100);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  });
</script>

{#if phase !== 'done'}
  <div
    class="crt-boot"
    class:phase-black={phase === 'black'}
    class:phase-line={phase === 'line'}
    class:phase-expand={phase === 'expand'}
    class:phase-static={phase === 'static'}
    class:phase-glow={phase === 'glow'}
    class:phase-fade={phase === 'fade'}
    aria-hidden="true"
  >
    <!-- The expanding white line -->
    <div class="scanline"></div>

    <!-- Canvas for static noise -->
    <canvas
      bind:this={noiseCanvas}
      class="noise-canvas"
      class:visible={phase === 'static'}
    ></canvas>

    <!-- Phosphor green glow overlay -->
    <div class="phosphor-glow"></div>
  </div>
{/if}

<style>
  .crt-boot {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    overflow: hidden;
  }

  /* Scanline: the expanding white bar */
  .scanline {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    background: #fff;
    transform: translateY(-50%) scaleY(0);
    opacity: 0;
    box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.4);
    will-change: transform, opacity;
  }

  .phase-line .scanline {
    opacity: 1;
    transform: translateY(-50%) scaleY(1);
    transition: opacity 0.06s ease-in;
  }

  .phase-expand .scanline {
    opacity: 1;
    animation: lineExpand 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes lineExpand {
    0% {
      height: 2px;
      transform: translateY(-50%) scaleY(1);
      box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.4);
    }
    60% {
      height: 110vh;
      transform: translateY(-50%) scaleY(1);
      box-shadow: 0 0 40px 10px rgba(255, 255, 255, 0.6);
    }
    100% {
      height: 110vh;
      transform: translateY(-50%) scaleY(1);
      box-shadow: 0 0 60px 20px rgba(255, 255, 255, 0.3);
    }
  }

  .phase-static .scanline,
  .phase-glow .scanline,
  .phase-fade .scanline {
    opacity: 0;
  }

  /* Noise canvas */
  .noise-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    image-rendering: pixelated;
    pointer-events: none;
  }

  .noise-canvas.visible {
    opacity: 0.85;
    animation: noiseFlicker 0.15s steps(2) infinite;
  }

  @keyframes noiseFlicker {
    0% { opacity: 0.7; }
    50% { opacity: 0.9; }
    100% { opacity: 0.75; }
  }

  /* Phosphor green glow */
  .phosphor-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      rgba(50, 255, 100, 0.12) 0%,
      rgba(30, 200, 80, 0.06) 50%,
      transparent 80%
    );
    opacity: 0;
    pointer-events: none;
  }

  .phase-glow .phosphor-glow {
    opacity: 1;
    transition: opacity 0.15s ease-in;
  }

  .phase-glow {
    background: #0a0a0a;
    transition: background 0.2s ease;
  }

  /* Fade out to reveal content */
  .phase-fade {
    opacity: 0;
    transition: opacity 0.25s ease-out;
  }
</style>
