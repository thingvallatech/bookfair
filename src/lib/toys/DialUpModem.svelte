<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Howl } from 'howler';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let isConnecting = $state(false);
  let isConnected = $state(false);
  let connectionPhase = $state('');
  let progress = $state(0);

  // LED states
  let ledPower = $state(true);
  let ledTx = $state(false);
  let ledRx = $state(false);
  let ledCarrier = $state(false);

  let sound: Howl | null = null;
  let connectionTimeout: ReturnType<typeof setTimeout>;
  let progressInterval: ReturnType<typeof setInterval> | null = null;

  // The dial-up connection phases
  const phases = [
    { time: 0, label: 'Dialing...', tx: true, rx: false },
    { time: 3000, label: 'Connecting to ISP...', tx: true, rx: true },
    { time: 8000, label: 'Negotiating...', tx: true, rx: true },
    { time: 15000, label: 'Authenticating...', tx: false, rx: true },
    { time: 22000, label: 'Connected at 56.6 Kbps!', tx: false, rx: false, connected: true },
  ];

  function startConnection() {
    if (isConnecting || isConnected) return;

    isConnecting = true;
    progress = 0;

    // Create and play the dial-up sound
    // Using a publicly available dial-up sound
    sound = new Howl({
      src: ['https://www.soundjay.com/communication/sounds/dial-up-modem-01.mp3'],
      html5: true,
      volume: 0.7,
      onend: () => {
        if (!isConnected) {
          isConnected = true;
          isConnecting = false;
          ledCarrier = true;
        }
      }
    });

    sound.play();

    // Animate through phases
    phases.forEach((phase) => {
      setTimeout(() => {
        if (!isConnecting && !isConnected) return;
        connectionPhase = phase.label;
        ledTx = phase.tx;
        ledRx = phase.rx;
        if (phase.connected) {
          isConnected = true;
          isConnecting = false;
          ledCarrier = true;
        }
      }, phase.time);
    });

    // Progress bar animation
    progressInterval = setInterval(() => {
      if (progress < 100) {
        progress += 0.5;
      } else {
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = null;
      }
    }, 120);
  }

  function disconnect() {
    if (sound) {
      sound.stop();
      sound.unload();
      sound = null;
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    isConnecting = false;
    isConnected = false;
    connectionPhase = '';
    progress = 0;
    ledTx = false;
    ledRx = false;
    ledCarrier = false;
  }

  function handleClose() {
    disconnect();
    onClose();
  }

  onDestroy(() => {
    disconnect();
  });
</script>

<div class="modem-experience">
  <CloseButton onClose={handleClose} />

  <div class="modem-container">
    <!-- Big chunky modem -->
    <div class="modem-unit">
      <div class="modem-top">
        <div class="brand">US Robotics</div>
        <div class="model">Sportster 56K</div>
      </div>

      <div class="led-panel">
        <div class="led-group">
          <div class="led" class:on={ledPower} style="--color: green">
            <span class="led-light"></span>
            <span class="led-label">PWR</span>
          </div>
          <div class="led" class:on={ledTx} class:blink={ledTx} style="--color: yellow">
            <span class="led-light"></span>
            <span class="led-label">TX</span>
          </div>
          <div class="led" class:on={ledRx} class:blink={ledRx} style="--color: yellow">
            <span class="led-light"></span>
            <span class="led-label">RX</span>
          </div>
          <div class="led" class:on={ledCarrier} style="--color: green">
            <span class="led-light"></span>
            <span class="led-label">CD</span>
          </div>
        </div>
      </div>

      <div class="modem-bottom">
        <div class="vent-holes">
          {#each Array(12) as _}
            <div class="vent"></div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Connection status display -->
    <div class="status-display">
      <div class="crt-screen">
        <div class="scanlines"></div>
        <div class="screen-content">
          {#if !isConnecting && !isConnected}
            <p class="prompt">Click modem to connect</p>
            <p class="blink-cursor">_</p>
          {:else if isConnecting}
            <p class="status-text">{connectionPhase}</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {progress}%"></div>
            </div>
            <p class="noise-text">
              {#each Array(3) as _}
                <span>{Math.random().toString(36).substring(2, 8)}</span>
              {/each}
            </p>
          {:else if isConnected}
            <p class="connected-text">✓ CONNECTED</p>
            <p class="speed-text">56,600 bps</p>
            <p class="welcome-text">Welcome to the Internet!</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Click to connect button (the modem itself) -->
    {#if !isConnecting && !isConnected}
      <button class="connect-area" onclick={startConnection}>
        <span class="connect-hint">Click to dial</span>
      </button>
    {:else if isConnected}
      <button class="disconnect-btn" onclick={disconnect}>
        Hang Up
      </button>
    {/if}
  </div>

  <p class="nostalgia-text">
    {#if isConnected}
      "You've got mail!"
    {:else if isConnecting}
      "Get off the phone, I'm using the internet!"
    {:else}
      Remember when this sound meant possibility?
    {/if}
  </p>
</div>

<style>
  .modem-experience {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  .modem-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  /* The physical modem unit */
  .modem-unit {
    width: 400px;
    height: 80px;
    background: linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 50%, #a0a0a0 100%);
    border: 3px solid #606060;
    border-radius: 8px;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    display: flex;
    flex-direction: column;
    padding: 8px 16px;
  }

  .modem-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    font-family: 'Arial Black', sans-serif;
    font-size: 14px;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .model {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    color: #666;
  }

  .led-panel {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .led-group {
    display: flex;
    gap: 24px;
  }

  .led {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .led-light {
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    border: 1px solid #222;
    transition: all 0.1s;
  }

  .led.on .led-light {
    background: var(--color);
    box-shadow: 0 0 8px var(--color), 0 0 16px var(--color);
  }

  .led.blink .led-light {
    animation: ledBlink 0.2s infinite;
  }

  @keyframes ledBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .led-label {
    font-family: 'Arial', sans-serif;
    font-size: 8px;
    color: #444;
    font-weight: bold;
  }

  .modem-bottom {
    display: flex;
    justify-content: flex-end;
  }

  .vent-holes {
    display: flex;
    gap: 4px;
  }

  .vent {
    width: 3px;
    height: 12px;
    background: #888;
    border-radius: 1px;
  }

  /* CRT-style status display */
  .status-display {
    width: 350px;
    height: 150px;
  }

  .crt-screen {
    width: 100%;
    height: 100%;
    background: #001100;
    border: 4px solid #333;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    box-shadow:
      inset 0 0 50px rgba(0, 255, 0, 0.1),
      0 0 20px rgba(0, 0, 0, 0.5);
  }

  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.2) 0px,
      rgba(0, 0, 0, 0.2) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
  }

  .screen-content {
    position: relative;
    z-index: 1;
    padding: 16px;
    font-family: 'VT323', 'Courier New', monospace;
    color: #00ff00;
    text-shadow: 0 0 5px #00ff00;
  }

  .prompt {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .blink-cursor {
    animation: cursorBlink 1s infinite;
  }

  @keyframes cursorBlink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  .status-text {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .progress-bar {
    width: 100%;
    height: 16px;
    background: #002200;
    border: 1px solid #00ff00;
    margin-bottom: 12px;
  }

  .progress-fill {
    height: 100%;
    background: #00ff00;
    transition: width 0.1s linear;
  }

  .noise-text {
    font-size: 12px;
    opacity: 0.5;
    display: flex;
    gap: 8px;
  }

  .noise-text span {
    animation: noise 0.1s infinite;
  }

  @keyframes noise {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  .connected-text {
    font-size: 24px;
    margin-bottom: 8px;
    animation: pulse 1s ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .speed-text {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .welcome-text {
    font-size: 16px;
    margin-top: 16px;
  }

  /* Interaction */
  .connect-area {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    height: 80px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 100px;
  }

  .connect-hint {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .connect-area:hover .connect-hint {
    opacity: 1;
  }

  .disconnect-btn {
    background: linear-gradient(180deg, #ff6b6b 0%, #c0392b 100%);
    color: white;
    border: 3px solid #922b21;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 4px 4px 0 #333;
    transition: all 0.1s;
  }

  .disconnect-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #333;
  }

  .disconnect-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #333;
  }

  .nostalgia-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
    font-style: italic;
    text-align: center;
    max-width: 400px;
  }
</style>
