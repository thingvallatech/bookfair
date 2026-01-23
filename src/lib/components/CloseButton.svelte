<script lang="ts">
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
    variant?: 'light' | 'dark';
  }

  let { onClose, variant = 'dark' }: Props = $props();

  function handleClose() {
    playSound('whoosh', 0.3);
    onClose();
  }
</script>

<button
  class="close-button"
  class:light={variant === 'light'}
  onclick={handleClose}
  aria-label="Close"
>
  <span class="close-icon">✕</span>
</button>

<style>
  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    border: 3px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    /* Ensure it's always clickable even near notches */
    margin-top: env(safe-area-inset-top, 0);
    margin-right: env(safe-area-inset-right, 0);
  }

  .close-button:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.6);
    transform: scale(1.1);
  }

  .close-button:active {
    transform: scale(0.95);
  }

  .close-button.light {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.2);
    color: #333;
  }

  .close-button.light:hover {
    background: white;
    border-color: rgba(0, 0, 0, 0.4);
  }

  .close-icon {
    line-height: 1;
    font-weight: bold;
  }

  /* Extra large touch target for mobile */
  @media (max-width: 768px) {
    .close-button {
      width: 56px;
      height: 56px;
      font-size: 24px;
    }
  }
</style>
