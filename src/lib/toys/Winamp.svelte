<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array;

  let isPlaying = $state(false);
  let currentSkin = $state(0);
  let visualizerMode = $state<'bars' | 'wave' | 'circle'>('bars');
  let volume = $state(75);
  let trackTime = $state(0);
  let trackDuration = $state(180); // Fake 3 min track

  const skins = [
    { name: 'Classic', bg: '#232323', accent: '#00ff00', text: '#00ff00' },
    { name: 'Blue Steel', bg: '#1a1a3e', accent: '#00aaff', text: '#88ccff' },
    { name: 'Hot Pink', bg: '#2a0a2a', accent: '#ff00ff', text: '#ff88ff' },
    { name: 'Matrix', bg: '#000a00', accent: '#00ff41', text: '#00ff41' },
  ];

  const playlist = [
    { title: 'Smash Mouth - All Star', duration: '3:21' },
    { title: 'Chumbawamba - Tubthumping', duration: '3:32' },
    { title: 'Len - Steal My Sunshine', duration: '4:01' },
    { title: 'Third Eye Blind - Semi-Charmed', duration: '4:27' },
    { title: 'Fastball - The Way', duration: '4:18' },
  ];

  let currentTrack = $state(0);

  $effect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        trackTime = (trackTime + 1) % trackDuration;
      }, 1000);
      return () => clearInterval(interval);
    }
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    isPlaying = !isPlaying;

    if (isPlaying && !audioContext) {
      initAudio();
    }
  }

  function prevTrack() {
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
    trackTime = 0;
  }

  function nextTrack() {
    currentTrack = (currentTrack + 1) % playlist.length;
    trackTime = 0;
  }

  function initAudio() {
    try {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      // Create oscillator for demo sound (very quiet)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.01; // Very quiet

      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);

      // Frequency modulation for variation
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 110;
      oscillator.start();

      // Modulate for visual interest
      setInterval(() => {
        if (isPlaying && oscillator) {
          oscillator.frequency.value = 80 + Math.random() * 200;
        }
      }, 200);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      // Audio not supported, use fake data
      dataArray = new Uint8Array(128);
    }
  }

  function draw() {
    if (!ctx || !canvas) return;

    const skin = skins[currentSkin];
    ctx.fillStyle = skin.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get audio data or generate fake data
    if (analyser && isPlaying) {
      analyser.getByteFrequencyData(dataArray);
    } else if (isPlaying) {
      // Fake visualizer data when no audio
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.random() * 128 + Math.sin(Date.now() * 0.01 + i * 0.2) * 64 + 64;
      }
    } else {
      dataArray.fill(0);
    }

    const barCount = 32;
    const barWidth = canvas.width / barCount - 2;

    if (visualizerMode === 'bars') {
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * dataArray.length / barCount);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, skin.accent);
        gradient.addColorStop(1, skin.text);

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * (barWidth + 2) + 1,
          canvas.height - barHeight,
          barWidth,
          barHeight
        );
      }
    } else if (visualizerMode === 'wave') {
      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * dataArray.length / barCount);
        const value = dataArray[dataIndex];
        const y = canvas.height / 2 + ((value - 128) / 128) * canvas.height * 0.4;
        const x = (i / barCount) * canvas.width;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    } else if (visualizerMode === 'circle') {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.25;

      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i <= barCount; i++) {
        const dataIndex = Math.floor((i % barCount) * dataArray.length / barCount);
        const value = dataArray[dataIndex];
        const radius = baseRadius + (value / 255) * baseRadius;
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    animationId = requestAnimationFrame(draw);
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    canvas.width = 275;
    canvas.height = 100;
    dataArray = new Uint8Array(128);
    draw();
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (audioContext) audioContext.close();
  });
</script>

<div class="winamp" style="--bg: {skins[currentSkin].bg}; --accent: {skins[currentSkin].accent}; --text: {skins[currentSkin].text}">
  <button class="close-btn" onclick={onClose}>✕</button>

  <!-- Title bar -->
  <div class="title-bar">
    <span class="title">WINAMP</span>
    <span class="llama">it really whips the llama's ass!</span>
  </div>

  <!-- Main window -->
  <div class="main-window">
    <!-- Visualizer -->
    <div class="visualizer-container">
      <canvas bind:this={canvas}></canvas>
      <div class="viz-modes">
        <button class:active={visualizerMode === 'bars'} onclick={() => visualizerMode = 'bars'}>▮▮▮</button>
        <button class:active={visualizerMode === 'wave'} onclick={() => visualizerMode = 'wave'}>∿</button>
        <button class:active={visualizerMode === 'circle'} onclick={() => visualizerMode = 'circle'}>◯</button>
      </div>
    </div>

    <!-- Track info -->
    <div class="track-info">
      <div class="track-title">{playlist[currentTrack].title}</div>
      <div class="track-time">
        <span>{formatTime(trackTime)}</span>
        <span>/</span>
        <span>{playlist[currentTrack].duration}</span>
      </div>
    </div>

    <!-- Seek bar -->
    <div class="seek-bar">
      <div class="seek-progress" style="width: {(trackTime / trackDuration) * 100}%"></div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="ctrl-btn" onclick={prevTrack}>⏮</button>
      <button class="ctrl-btn play" onclick={togglePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button class="ctrl-btn" onclick={() => { isPlaying = false; trackTime = 0; }}>⏹</button>
      <button class="ctrl-btn" onclick={nextTrack}>⏭</button>

      <div class="volume-control">
        <span>🔊</span>
        <input type="range" min="0" max="100" bind:value={volume} class="volume-slider" />
      </div>
    </div>

    <!-- Skin selector -->
    <div class="skin-selector">
      <span>Skin:</span>
      {#each skins as skin, i}
        <button
          class="skin-btn"
          class:active={currentSkin === i}
          style="background: {skin.accent}"
          onclick={() => currentSkin = i}
        ></button>
      {/each}
    </div>
  </div>

  <!-- Playlist -->
  <div class="playlist">
    <div class="playlist-title">Playlist</div>
    <div class="playlist-items">
      {#each playlist as track, i}
        <button
          class="playlist-item"
          class:active={currentTrack === i}
          onclick={() => { currentTrack = i; trackTime = 0; }}
        >
          <span class="track-num">{i + 1}.</span>
          <span class="track-name">{track.title}</span>
          <span class="track-dur">{track.duration}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .winamp {
    width: 100%;
    height: 100%;
    background: #1a1a1a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Press Start 2P', monospace;
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
  }

  .title-bar {
    background: linear-gradient(90deg, var(--accent) 0%, var(--bg) 100%);
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 300px;
    border: 2px solid #444;
    border-bottom: none;
  }

  .title {
    font-size: 0.6rem;
    color: var(--text);
    font-weight: bold;
  }

  .llama {
    font-size: 0.35rem;
    color: var(--text);
    opacity: 0.7;
  }

  .main-window {
    background: var(--bg);
    border: 2px solid #444;
    padding: 8px;
    width: 100%;
    max-width: 300px;
  }

  .visualizer-container {
    position: relative;
    background: #000;
    border: 2px inset #333;
    margin-bottom: 8px;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100px;
  }

  .viz-modes {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
  }

  .viz-modes button {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--accent);
    color: var(--text);
    font-size: 0.5rem;
    padding: 2px 4px;
    cursor: pointer;
    opacity: 0.5;
  }

  .viz-modes button.active {
    opacity: 1;
    background: var(--accent);
    color: var(--bg);
  }

  .track-info {
    margin-bottom: 8px;
  }

  .track-title {
    font-size: 0.5rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: scroll 10s linear infinite;
  }

  @keyframes scroll {
    0%, 20% { transform: translateX(0); }
    80%, 100% { transform: translateX(-50%); }
  }

  .track-time {
    font-size: 0.5rem;
    color: var(--accent);
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .seek-bar {
    height: 8px;
    background: #111;
    border: 1px solid #333;
    margin-bottom: 8px;
    cursor: pointer;
  }

  .seek-progress {
    height: 100%;
    background: var(--accent);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
  }

  .ctrl-btn {
    width: 32px;
    height: 24px;
    background: linear-gradient(180deg, #555 0%, #333 100%);
    border: 2px outset #666;
    color: var(--text);
    font-size: 0.6rem;
    cursor: pointer;
  }

  .ctrl-btn:active {
    border-style: inset;
  }

  .ctrl-btn.play {
    width: 40px;
    background: linear-gradient(180deg, var(--accent) 0%, #333 100%);
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    font-size: 0.6rem;
  }

  .volume-slider {
    width: 60px;
    height: 8px;
    cursor: pointer;
  }

  .skin-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.4rem;
    color: var(--text);
  }

  .skin-btn {
    width: 16px;
    height: 16px;
    border: 2px solid #444;
    cursor: pointer;
  }

  .skin-btn.active {
    border-color: #fff;
  }

  .playlist {
    background: var(--bg);
    border: 2px solid #444;
    border-top: none;
    width: 100%;
    max-width: 300px;
    padding: 4px;
  }

  .playlist-title {
    font-size: 0.4rem;
    color: var(--text);
    padding: 4px;
    border-bottom: 1px solid #333;
  }

  .playlist-items {
    max-height: 120px;
    overflow-y: auto;
  }

  .playlist-item {
    display: flex;
    gap: 8px;
    padding: 4px;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    color: var(--text);
    font-family: inherit;
    font-size: 0.4rem;
  }

  .playlist-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .playlist-item.active {
    background: var(--accent);
    color: var(--bg);
  }

  .track-num {
    width: 16px;
  }

  .track-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-dur {
    opacity: 0.7;
  }
</style>
