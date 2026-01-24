<script lang="ts">
  import type { Beanie } from '$lib/stores/beanies';
  import { showTag, isDiscoveredThisSession } from '$lib/stores/beanieHunt';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    beanie: Beanie;
    class?: string;
  }

  let { beanie, class: className = '' }: Props = $props();

  let discovered = $state(false);
  let wiggling = $state(false);

  // Check if already discovered this session
  $effect(() => {
    discovered = isDiscoveredThisSession(beanie.name);
  });

  function handleInteraction() {
    if (!discovered && !wiggling) {
      // First interaction - reveal and wiggle
      wiggling = true;
      discovered = true;
      playSound('pop');

      setTimeout(() => {
        wiggling = false;
      }, 600);
    } else if (discovered && !wiggling) {
      // Already discovered - show tag popup
      playSound('click');
      showTag(beanie);
    }
  }

  function handleMouseEnter() {
    if (!discovered) {
      handleInteraction();
    }
  }

  function handleClick() {
    handleInteraction();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleInteraction();
    }
  }
</script>

<div
  class="hiding-beanie {className}"
  class:discovered
  class:wiggling
  role="button"
  tabindex="0"
  aria-label={discovered ? `${beanie.name} the ${beanie.animal} - click to view tag` : 'Something is hiding here'}
  onmouseenter={handleMouseEnter}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  <img
    src={beanie.image}
    alt={discovered ? beanie.name : 'Hidden beanie'}
    class="beanie-img"
    draggable="false"
  />
</div>

<style>
  .hiding-beanie {
    position: absolute;
    cursor: pointer;
    transition: transform 0.3s ease-out, z-index 0s;
  }

  .beanie-img {
    width: 70px;
    height: 70px;
    object-fit: contain;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
    pointer-events: none;
  }

  /* Subtle breathing when hidden */
  .hiding-beanie:not(.discovered):not(.wiggling) {
    animation: beanie-breathe 3s ease-in-out infinite;
  }

  /* Wiggle animation on discovery */
  .hiding-beanie.wiggling {
    animation: beanie-wiggle 0.6s ease-out !important;
  }

  /* Hover effect when discovered */
  .hiding-beanie.discovered:hover:not(.wiggling) {
    transform: scale(1.1);
  }

  /* Focus outline */
  .hiding-beanie:focus-visible {
    outline: 3px solid #f7d51d;
    outline-offset: 4px;
    border-radius: 8px;
  }

  @keyframes beanie-wiggle {
    0%, 100% { transform: rotate(0deg) scale(1); }
    15% { transform: rotate(-12deg) scale(1.15); }
    30% { transform: rotate(10deg) scale(1.12); }
    45% { transform: rotate(-8deg) scale(1.08); }
    60% { transform: rotate(6deg) scale(1.04); }
    75% { transform: rotate(-3deg) scale(1.02); }
  }

  @keyframes beanie-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }
</style>
