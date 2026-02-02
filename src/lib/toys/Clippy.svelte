<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Hidden beanie behind taskbar
  const hidingSpots: HidingSpot[] = [{ id: 'behind-taskbar' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  let currentTip = $state(0);
  let isAnimating = $state(false);
  let userInput = $state('');
  let clipbyResponse = $state('');
  let showResponse = $state(false);

  const tips = [
    "It looks like you're writing a letter. Would you like help?",
    "Did you know you can press Ctrl+S to save? I bet you didn't!",
    "I see you're trying to close me. That's not very nice!",
    "Would you like me to search the web for that? Just kidding, I can't.",
    "It looks like you're procrastinating. Would you like to continue?",
    "I noticed you haven't blinked in a while. Maybe take a break?",
    "Fun fact: I was created in 1997 and nobody asked for me!",
    "Would you like me to animate while you work? Too late, I'm doing it anyway!",
    "It seems like you're having fun. Should I make it less fun?",
    "I'm not just a paperclip. I'm YOUR paperclip. Forever.",
    "Did you mean to click that? Because I can undo it... or can I?",
    "I see you're breathing. Would you like tips on breathing more efficiently?",
  ];

  const responses: Record<string, string[]> = {
    help: [
      "I'm here to help! But mostly I'm here to watch.",
      "Help? I thought you'd never ask! *stares intensely*",
      "Of course I can help! I just choose not to.",
    ],
    hello: [
      "Oh hello there! I've been waiting for you...",
      "Hi! Did you miss me? I missed you. I always miss you.",
      "Greetings, human! I mean... friend!",
    ],
    goodbye: [
      "Goodbye? But I live here now.",
      "You can close the window, but I'll always be in your heart.",
      "See you later! (I'll be watching)",
    ],
    why: [
      "Why? Because Microsoft thought you needed me. They were wrong.",
      "Why not? That's the real question.",
      "I ask myself that every day.",
    ],
    default: [
      "I don't understand, but I'm nodding along anyway.",
      "Interesting! Tell me more while I pretend to listen.",
      "That's nice. Have you tried turning it off and on again?",
      "I'm going to file that under 'things I'll forget immediately'.",
      "Mm-hmm, mm-hmm. *writes down nothing*",
    ],
  };

  function nextTip() {
    isAnimating = true;
    playSound('pop', 0.2);
    setTimeout(() => {
      currentTip = (currentTip + 1) % tips.length;
      isAnimating = false;
    }, 300);
  }

  function getResponse(input: string): string {
    const lower = input.toLowerCase();
    let pool = responses.default;

    if (lower.includes('help')) pool = responses.help;
    else if (lower.includes('hello') || lower.includes('hi')) pool = responses.hello;
    else if (lower.includes('bye') || lower.includes('goodbye')) pool = responses.goodbye;
    else if (lower.includes('why')) pool = responses.why;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  function submitQuestion() {
    if (!userInput.trim()) return;

    playSound('ding', 0.3);
    clipbyResponse = getResponse(userInput);
    showResponse = true;
    userInput = '';

    setTimeout(() => {
      showResponse = false;
    }, 5000);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      submitQuestion();
    }
  }

  onMount(() => {
    // Register hiding spot
    registerSpots('clippy', hidingSpots);
    const beanies = getBeaniesForArea('clippy');
    hiddenBeanie = beanies.get('behind-taskbar') || null;

    // Random tip changes
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        nextTip();
      }
    }, 8000);

    return () => clearInterval(interval);
  });
</script>

<div class="clippy-land">
  <CloseButton {onClose} />

  <div class="desktop">
    <div class="desktop-icons">
      <div class="icon">
        <div class="icon-img">📁</div>
        <span>My Documents</span>
      </div>
      <div class="icon">
        <div class="icon-img">🗑️</div>
        <span>Recycle Bin</span>
      </div>
      <div class="icon">
        <div class="icon-img">🌐</div>
        <span>Internet Explorer</span>
      </div>
      <div class="icon">
        <div class="icon-img">📧</div>
        <span>Outlook Express</span>
      </div>
    </div>

    <!-- Clippy -->
    <div class="clippy-container">
      <div class="clippy" class:animating={isAnimating}>
        <div class="clippy-body">
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="eyebrow left"></div>
          <div class="eyebrow right"></div>
        </div>
        <div class="clippy-base"></div>
      </div>

      <div class="speech-bubble" class:response={showResponse}>
        {#if showResponse}
          <p>{clipbyResponse}</p>
        {:else}
          <p>{tips[currentTip]}</p>
        {/if}

        <div class="bubble-buttons">
          {#if !showResponse}
            <button onclick={nextTip}>Next Tip</button>
            <button onclick={() => { showResponse = false; playSound('whoosh', 0.2); }}>Go Away</button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Ask Clippy -->
    <div class="ask-clippy">
      <div class="ask-header">Ask Clippy</div>
      <div class="ask-body">
        <p>Type a question for your helpful assistant!</p>
        <input
          type="text"
          bind:value={userInput}
          onkeydown={handleKeydown}
          placeholder="What do you need help with?"
        />
        <button onclick={submitQuestion}>Ask</button>
      </div>
    </div>

    <!-- Taskbar with beanie peeking from behind -->
    <div class="taskbar-wrapper">
      {#if hiddenBeanie}
        <HidingBeanie beanie={hiddenBeanie} class="taskbar-beanie" />
      {/if}
      <div class="taskbar">
        <button class="start-btn">
          <span class="windows-logo">🪟</span>
          Start
        </button>
        <div class="taskbar-items">
          <div class="taskbar-item active">📎 Clippy Helper</div>
        </div>
        <div class="system-tray">
          <span>🔊</span>
          <span class="time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .clippy-land {
    width: 100%;
    height: 100%;
    position: relative;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    overflow: visible;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
  }

  .desktop {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #008080 0%, #003030 100%);
    position: relative;
    overflow: hidden;
  }

  .desktop-icons {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .icon-img {
    font-size: 32px;
  }

  .icon span {
    font-size: 11px;
    color: white;
    text-shadow: 1px 1px 2px black;
  }

  /* Clippy Character */
  .clippy-container {
    position: absolute;
    bottom: 80px;
    right: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .clippy {
    width: 80px;
    height: 120px;
    position: relative;
    transition: transform 0.3s;
    animation: idle 2s ease-in-out infinite;
  }

  .clippy.animating {
    animation: bounce 0.3s ease-out;
  }

  @keyframes idle {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-2px) rotate(-2deg); }
    75% { transform: translateY(-2px) rotate(2deg); }
  }

  @keyframes bounce {
    0% { transform: scale(1); }
    50% { transform: scale(1.1) rotate(10deg); }
    100% { transform: scale(1); }
  }

  .clippy-body {
    width: 60px;
    height: 80px;
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
    border: 3px solid #404040;
    border-radius: 30px 30px 10px 10px;
    position: relative;
    margin: 0 auto;
  }

  .eye {
    position: absolute;
    width: 16px;
    height: 20px;
    background: white;
    border: 2px solid #333;
    border-radius: 50%;
    top: 25px;
  }

  .eye::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: #333;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: look 4s ease-in-out infinite;
  }

  .eye.left { left: 8px; }
  .eye.right { right: 8px; }

  @keyframes look {
    0%, 100% { transform: translate(-50%, -50%); }
    25% { transform: translate(-80%, -50%); }
    50% { transform: translate(-50%, -80%); }
    75% { transform: translate(-20%, -50%); }
  }

  .eyebrow {
    position: absolute;
    width: 14px;
    height: 4px;
    background: #333;
    border-radius: 2px;
    top: 18px;
    transform: rotate(-10deg);
  }

  .eyebrow.left { left: 10px; }
  .eyebrow.right {
    right: 10px;
    transform: rotate(10deg);
  }

  .clippy-base {
    width: 40px;
    height: 30px;
    background: linear-gradient(180deg, #808080 0%, #606060 100%);
    border: 3px solid #404040;
    border-radius: 0 0 20px 20px;
    margin: -5px auto 0;
  }

  /* Speech Bubble */
  .speech-bubble {
    background: #ffffcc;
    border: 2px solid #333;
    border-radius: 12px;
    padding: 16px;
    max-width: 250px;
    margin-bottom: 10px;
    position: relative;
    box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
  }

  .speech-bubble::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    border: 10px solid transparent;
    border-top-color: #ffffcc;
  }

  .speech-bubble p {
    font-size: 12px;
    margin: 0 0 12px 0;
    color: #333;
    line-height: 1.4;
  }

  .speech-bubble.response {
    background: #ccffcc;
  }

  .speech-bubble.response::after {
    border-top-color: #ccffcc;
  }

  .bubble-buttons {
    display: flex;
    gap: 8px;
  }

  .bubble-buttons button {
    padding: 10px 16px;
    min-height: 44px;
    font-size: 12px;
    background: #e0e0e0;
    border: 2px solid #999;
    cursor: pointer;
  }

  .bubble-buttons button:hover {
    background: #d0d0d0;
  }

  /* Ask Clippy Panel */
  .ask-clippy {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    background: #ece9d8;
    border: 2px solid #0054e3;
    border-radius: 8px 8px 0 0;
    box-shadow: 3px 3px 15px rgba(0, 0, 0, 0.4);
  }

  .ask-header {
    background: linear-gradient(180deg, #0a246a 0%, #a6caf0 5%, #0a246a 95%);
    color: white;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 6px 6px 0 0;
  }

  .ask-body {
    padding: 16px;
  }

  .ask-body p {
    font-size: 11px;
    margin-bottom: 12px;
    color: #333;
  }

  .ask-body input {
    width: 100%;
    padding: 12px;
    min-height: 44px;
    border: 2px solid #999;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .ask-body button {
    padding: 12px 24px;
    min-height: 44px;
    font-size: 12px;
    background: #e0e0e0;
    border: 2px solid #999;
    cursor: pointer;
  }

  .ask-body button:hover {
    background: #d0d0d0;
  }

  /* Taskbar */
  .taskbar-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }

  .taskbar {
    height: 32px;
    background: linear-gradient(180deg, #245edb 0%, #3168d8 3%, #4e8ad8 95%, #245edb 100%);
    display: flex;
    align-items: center;
    padding: 0 4px;
    position: relative;
    z-index: 10; /* Taskbar in front of beanie */
  }

  /* Beanie peeking from behind taskbar */
  :global(.taskbar-beanie) {
    top: -45px;
    left: 120px;
    z-index: 5;
  }

  :global(.taskbar-beanie.discovered) {
    z-index: 15 !important;
  }

  .start-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: linear-gradient(180deg, #3b9c3b 0%, #2d7d2d 50%, #1e6b1e 100%);
    border: none;
    border-radius: 0 8px 8px 0;
    color: white;
    font-weight: bold;
    font-size: 12px;
    cursor: pointer;
    height: 26px;
  }

  .windows-logo {
    font-size: 16px;
  }

  .taskbar-items {
    flex: 1;
    display: flex;
    padding: 0 8px;
  }

  .taskbar-item {
    background: linear-gradient(180deg, #3c81e0 0%, #2b6dd6 100%);
    border: 1px solid #1a4c9c;
    padding: 2px 12px;
    font-size: 11px;
    color: white;
    border-radius: 2px;
  }

  .taskbar-item.active {
    background: linear-gradient(180deg, #2b6dd6 0%, #1a4c9c 100%);
  }

  .system-tray {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    font-size: 11px;
    color: white;
  }

  .time {
    background: rgba(0, 0, 0, 0.2);
    padding: 2px 8px;
    border-radius: 2px;
  }
</style>
