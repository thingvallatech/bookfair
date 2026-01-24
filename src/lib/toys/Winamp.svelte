<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Hidden beanie behind player
  const hidingSpots: HidingSpot[] = [{ id: 'behind-player' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let gainNode: GainNode | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let dataArray: Uint8Array;

  let isPlaying = $state(false);
  let isLoading = $state(false);
  let currentSkin = $state(0);
  let visualizerMode = $state<'bars' | 'wave' | 'circle'>('bars');
  let volume = $state(75);
  let trackTime = $state(0);
  let trackDuration = $state(150);

  const skins = [
    { name: 'Classic', bg: '#232323', accent: '#00ff00', text: '#00ff00' },
    { name: 'Blue Steel', bg: '#1a1a3e', accent: '#00aaff', text: '#88ccff' },
    { name: 'Hot Pink', bg: '#2a0a2a', accent: '#ff00ff', text: '#ff88ff' },
    { name: 'Matrix', bg: '#000a00', accent: '#00ff41', text: '#00ff41' },
  ];

  // Free royalty-free music from various sources
  const playlist = [
    {
      title: 'Lofi Study Beats',
      duration: '2:30',
      // Free lofi from Pixabay
      url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3'
    },
    {
      title: 'Chill Synthwave',
      duration: '2:15',
      url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3'
    },
    {
      title: 'Retro Gaming',
      duration: '1:45',
      url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749d484.mp3'
    },
    {
      title: '8-Bit Adventure',
      duration: '2:00',
      url: 'https://cdn.pixabay.com/audio/2021/11/01/audio_5fc1f1e8c4.mp3'
    },
    {
      title: 'Peaceful Piano',
      duration: '3:00',
      url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3'
    },
  ];

  let currentTrack = $state(0);

  // Volume changes
  $effect(() => {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
    if (gainNode) {
      gainNode.gain.value = volume / 100;
    }
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function togglePlay() {
    if (!audioContext) {
      await initAudio();
    }

    if (isPlaying) {
      audioElement?.pause();
      isPlaying = false;
    } else {
      await loadAndPlayTrack(currentTrack);
    }
  }

  async function prevTrack() {
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
    trackTime = 0;
    if (isPlaying) {
      await loadAndPlayTrack(currentTrack);
    }
  }

  async function nextTrack() {
    currentTrack = (currentTrack + 1) % playlist.length;
    trackTime = 0;
    if (isPlaying) {
      await loadAndPlayTrack(currentTrack);
    }
  }

  async function initAudio() {
    try {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      gainNode = audioContext.createGain();
      gainNode.gain.value = volume / 100;

      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.error('Audio init failed:', e);
      dataArray = new Uint8Array(128);
    }
  }

  async function loadAndPlayTrack(index: number) {
    if (!audioContext || !analyser || !gainNode) return;

    isLoading = true;
    const track = playlist[index];

    try {
      // Stop existing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }

      // Create new audio element
      audioElement = new Audio();
      audioElement.crossOrigin = 'anonymous';
      audioElement.src = track.url;
      audioElement.volume = volume / 100;

      // Connect to analyser
      if (sourceNode) {
        sourceNode.disconnect();
      }
      sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(analyser);

      // Handle track end
      audioElement.onended = () => {
        nextTrack();
      };

      // Update duration when metadata loads
      audioElement.onloadedmetadata = () => {
        trackDuration = Math.floor(audioElement!.duration);
      };

      // Update time display
      audioElement.ontimeupdate = () => {
        trackTime = Math.floor(audioElement!.currentTime);
      };

      await audioElement.play();
      isPlaying = true;
      isLoading = false;
    } catch (e) {
      console.error('Failed to play track:', e);
      isLoading = false;
      // Fall back to visualizer-only mode
      isPlaying = true;
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
    // Register hiding spot
    registerSpots('winamp', hidingSpots);
    const beanies = getBeaniesForArea('winamp');
    hiddenBeanie = beanies.get('behind-player') || null;

    ctx = canvas.getContext('2d')!;
    canvas.width = 275;
    canvas.height = 100;
    dataArray = new Uint8Array(128);
    draw();
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    if (audioContext) audioContext.close();
  });
</script>

<div class="winamp-wrapper">
  {#if hiddenBeanie}
    <HidingBeanie beanie={hiddenBeanie} class="winamp-beanie" />
  {/if}
  <div class="winamp" style="--bg: {skins[currentSkin].bg}; --accent: {skins[currentSkin].accent}; --text: {skins[currentSkin].text}">
    <CloseButton {onClose} />

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
      <button class="ctrl-btn play" onclick={togglePlay} disabled={isLoading}>
        {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
      </button>
      <button class="ctrl-btn" onclick={() => { if (audioElement) { audioElement.pause(); audioElement.currentTime = 0; } isPlaying = false; trackTime = 0; }}>⏹</button>
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
</div>

<style>
  .winamp-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
  }

  /* Beanie peeking from behind player */
  :global(.winamp-beanie) {
    bottom: 60px;
    right: calc(50% - 180px);
    z-index: 5;
  }

  :global(.winamp-beanie.discovered) {
    z-index: 15 !important;
  }

  .winamp {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 10; /* Player in front of beanie */
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
    width: 44px;
    height: 44px;
    background: linear-gradient(180deg, #555 0%, #333 100%);
    border: 2px outset #666;
    color: var(--text);
    font-size: 1rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .ctrl-btn:active {
    border-style: inset;
  }

  .ctrl-btn.play {
    width: 52px;
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
