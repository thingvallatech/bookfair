<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = 'Loading...' }: Props = $props();

  const loadingEmojis = ['📀', '💾', '📼', '🖥️', '⌨️', '🖱️'];
  let emojiIndex = $state(0);

  $effect(() => {
    const interval = setInterval(() => {
      emojiIndex = (emojiIndex + 1) % loadingEmojis.length;
    }, 300);

    return () => clearInterval(interval);
  });
</script>

<div class="loading-state">
  <div class="loading-emoji">{loadingEmojis[emojiIndex]}</div>
  <div class="loading-text">{message}</div>
  <div class="loading-bar">
    <div class="loading-progress"></div>
  </div>
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px;
    min-height: 200px;
  }

  .loading-emoji {
    font-size: 48px;
    animation: bounce 0.5s ease-in-out infinite alternate;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
  }

  .loading-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #888;
    animation: blink 1s steps(1) infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
  }

  .loading-bar {
    width: 150px;
    height: 12px;
    background: #333;
    border: 2px solid #666;
    border-radius: 2px;
    overflow: hidden;
  }

  .loading-progress {
    height: 100%;
    width: 30%;
    background: linear-gradient(90deg, #00ff00, #00cc00);
    animation: loadingSlide 1s ease-in-out infinite;
  }

  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
</style>
