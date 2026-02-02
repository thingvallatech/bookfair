<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onComplete: () => void;
  }

  let { onComplete }: Props = $props();

  let currentStep = $state(0);
  let visible = $state(false);
  let direction = $state<'next' | 'prev'>('next');
  let transitioning = $state(false);
  let reducedMotion = $state(false);

  const TOTAL_STEPS = 3;

  // Touch swipe tracking
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const steps = [
    {
      title: 'Welcome to The Book Fair',
      icon: '📚',
      body: 'A shelf of 90s toys at the end of the internet.',
    },
    {
      title: 'Tap a toy to play',
      icon: '👆',
      body: 'Each one is a tiny interactive world. Go ahead, pick one.',
    },
    {
      title: 'Find hidden Beanie Babies',
      icon: '🧸',
      body: '39 beanies are hiding. Can you find them all?\nTap 🎒 to track your collection.',
    },
  ];

  function finish() {
    if (browser) {
      localStorage.setItem('bookfair_onboarded', '1');
    }
    playSound('success', 0.3);
    onComplete();
  }

  function skip() {
    playSound('whoosh', 0.2);
    finish();
  }

  function next() {
    if (transitioning) return;
    if (currentStep >= TOTAL_STEPS - 1) {
      finish();
      return;
    }
    playSound('click', 0.2);
    direction = 'next';
    transitioning = true;
    setTimeout(() => {
      currentStep++;
      transitioning = false;
    }, reducedMotion ? 0 : 200);
  }

  function prev() {
    if (transitioning) return;
    if (currentStep <= 0) return;
    playSound('click', 0.2);
    direction = 'prev';
    transitioning = true;
    setTimeout(() => {
      currentStep--;
      transitioning = false;
    }, reducedMotion ? 0 : 200);
  }

  function goToStep(step: number) {
    if (transitioning || step === currentStep) return;
    playSound('click', 0.2);
    direction = step > currentStep ? 'next' : 'prev';
    transitioning = true;
    setTimeout(() => {
      currentStep = step;
      transitioning = false;
    }, reducedMotion ? 0 : 200);
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const elapsed = Date.now() - touchStartTime;

    // Require minimum 50px horizontal swipe, more horizontal than vertical, within 300ms
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 500) {
      if (deltaX < 0) {
        // Swipe left -> next
        next();
      } else {
        // Swipe right -> prev
        prev();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      skip();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  }

  onMount(() => {
    if (browser) {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    // Small delay so the fade-in feels intentional after CRT boot
    const timer = setTimeout(() => {
      visible = true;
    }, reducedMotion ? 0 : 150);

    return () => clearTimeout(timer);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="onboarding-backdrop"
    class:reduced={reducedMotion}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="dialog"
    aria-label="Welcome to The Book Fair"
    aria-modal="true"
  >
    <button class="skip-btn" onclick={skip}>Skip</button>

    <div class="onboarding-card">
      {#each steps as step, i}
        {#if i === currentStep}
          <div
            class="step-content"
            class:slide-out-left={transitioning && direction === 'next'}
            class:slide-out-right={transitioning && direction === 'prev'}
            class:reduced={reducedMotion}
          >
            <div class="step-icon" class:pulse-hint={i === 1}>
              {step.icon}
            </div>
            <h2 class="step-title">{step.title}</h2>
            <p class="step-body">{@html step.body.replace('\n', '<br>')}</p>
          </div>
        {/if}
      {/each}

      <div class="card-footer">
        <div class="dots" role="tablist" aria-label="Onboarding steps">
          {#each steps as _, i}
            <button
              class="dot"
              class:active={i === currentStep}
              onclick={() => goToStep(i)}
              role="tab"
              aria-selected={i === currentStep}
              aria-label={`Step ${i + 1} of ${TOTAL_STEPS}`}
            ></button>
          {/each}
        </div>

        <button class="next-btn" onclick={next}>
          {currentStep === TOTAL_STEPS - 1 ? "Let's go!" : 'Next'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .onboarding-backdrop {
    position: fixed;
    inset: 0;
    z-index: 8000;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: backdropFadeIn 0.4s ease-out;
  }

  .onboarding-backdrop.reduced {
    animation: none;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .skip-btn {
    position: absolute;
    top: max(16px, env(safe-area-inset-top, 16px));
    right: max(16px, env(safe-area-inset-right, 16px));
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    cursor: pointer;
    padding: 12px 16px;
    min-width: 44px;
    min-height: 44px;
    transition: color 0.2s;
    z-index: 1;
  }

  .skip-btn:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  .onboarding-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 3px solid #f7d51d;
    border-radius: 16px;
    padding: 2rem 1.5rem 1.5rem;
    max-width: 320px;
    width: 100%;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 30px rgba(247, 213, 29, 0.15),
      0 20px 60px rgba(0, 0, 0, 0.5);
    animation: cardSlideUp 0.4s ease-out;
  }

  .onboarding-backdrop.reduced .onboarding-card {
    animation: none;
  }

  @keyframes cardSlideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .step-content {
    text-align: center;
    animation: stepFadeIn 0.25s ease-out;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .step-content.reduced {
    animation: none;
  }

  .step-content.slide-out-left {
    animation: slideOutLeft 0.2s ease-in forwards;
  }

  .step-content.slide-out-right {
    animation: slideOutRight 0.2s ease-in forwards;
  }

  .step-content.reduced.slide-out-left,
  .step-content.reduced.slide-out-right {
    animation: none;
  }

  @keyframes stepFadeIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutLeft {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-30px);
    }
  }

  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(30px);
    }
  }

  .step-icon {
    font-size: 3rem;
    margin-bottom: 0.75rem;
    line-height: 1;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }

  .step-icon.pulse-hint {
    animation: pulseHint 2s ease-in-out infinite;
  }

  @keyframes pulseHint {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }

  .step-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.65rem;
    color: #f7d51d;
    margin: 0 0 0.75rem;
    line-height: 1.6;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  }

  .step-body {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.45rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 2;
    margin: 0;
    padding: 0 0.25rem;
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .dots {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 0;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* The visible dot is smaller; the tap target is the full 44px button */
  .dot::after {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    transition: all 0.2s;
  }

  .dot {
    background: transparent;
    border: none;
  }

  .dot.active::after {
    background: #f7d51d;
    box-shadow: 0 0 8px rgba(247, 213, 29, 0.5);
  }

  .dot:hover::after {
    background: rgba(255, 255, 255, 0.5);
  }

  .dot.active:hover::after {
    background: #f7d51d;
  }

  .next-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    color: #1a1a2e;
    background: #f7d51d;
    border: none;
    border-radius: 8px;
    padding: 14px 28px;
    cursor: pointer;
    min-width: 140px;
    min-height: 48px;
    transition: all 0.2s;
    text-shadow: none;
    box-shadow: 0 4px 0 #c4a800, 0 6px 12px rgba(0, 0, 0, 0.3);
  }

  .next-btn:hover {
    background: #ffe44d;
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #c4a800, 0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .next-btn:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #c4a800, 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 400px) {
    .onboarding-card {
      padding: 1.5rem 1rem 1.25rem;
    }

    .step-icon {
      font-size: 2.5rem;
    }

    .step-title {
      font-size: 0.55rem;
    }

    .step-body {
      font-size: 0.4rem;
    }

    .step-content {
      min-height: 160px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .onboarding-backdrop,
    .onboarding-card,
    .step-content,
    .step-icon.pulse-hint {
      animation: none !important;
    }

    .step-content.slide-out-left,
    .step-content.slide-out-right {
      animation: none !important;
    }
  }
</style>
