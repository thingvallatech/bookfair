<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Mouse position for parallax (0-1 normalized)
  let mx = $state(0.5);
  let my = $state(0.5);

  // Clock state
  let clockTime = $state('');
  let clockInterval: ReturnType<typeof setInterval>;

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    clockTime = `${hours}:${minutes} ${ampm}`;
  }

  function handleMouseMove(e: MouseEvent) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  }

  function handleStartClick() {
    playSound('click');
  }

  onMount(() => {
    playSound('powerup', 0.4);
    updateClock();
    clockInterval = setInterval(updateClock, 10000);
  });

  onDestroy(() => {
    clearInterval(clockInterval);
  });
</script>

<svelte:window onmousemove={handleMouseMove} />

<div
  class="bados-desktop"
  style="--mx: {mx}; --my: {my}"
>
  <!-- Bliss Wallpaper -->
  <div class="wallpaper">
    <!-- Sky -->
    <div class="sky"></div>

    <!-- Clouds -->
    <div class="clouds">
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
      <div class="cloud cloud-4"></div>
      <div class="cloud cloud-5"></div>
    </div>

    <!-- Hills with parallax -->
    <div class="hills-container">
      <!-- Far hills -->
      <div class="hill hill-far-left"></div>
      <div class="hill hill-far-right"></div>
      <!-- Mid hills -->
      <div class="hill hill-mid-left"></div>
      <div class="hill hill-mid-center"></div>
      <div class="hill hill-mid-right"></div>
      <!-- Near hills -->
      <div class="hill hill-near-left"></div>
      <div class="hill hill-near-center"></div>
      <div class="hill hill-near-right"></div>
      <!-- Ground fill -->
      <div class="ground"></div>
    </div>
  </div>

  <!-- Desktop icon area (empty for now) -->
  <div class="desktop-area"></div>

  <!-- Close button -->
  <CloseButton onClose={onClose} variant="light" />

  <!-- Taskbar -->
  <div class="taskbar">
    <button class="start-button" onclick={handleStartClick}>
      <span class="start-logo">&#8862;</span>
      <span class="start-text">start</span>
    </button>

    <div class="taskbar-middle"></div>

    <div class="system-tray">
      <span class="tray-clock">{clockTime}</span>
    </div>
  </div>
</div>

<style>
  .bados-desktop {
    position: fixed;
    inset: 0;
    overflow: hidden;
    font-family: 'Tahoma', 'Segoe UI', 'Verdana', sans-serif;
    cursor: default;
    user-select: none;
  }

  /* ========================
     BLISS WALLPAPER (CSS-only)
     ======================== */
  .wallpaper {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  /* Sky gradient */
  .sky {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      #2468c8 0%,
      #3b8be0 15%,
      #4da6ff 30%,
      #6db8f2 45%,
      #87ceeb 60%,
      #a8dcf0 100%
    );
  }

  /* Clouds */
  .clouds {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .cloud {
    position: absolute;
    background: white;
    border-radius: 50%;
    opacity: 0.9;
    filter: blur(2px);
  }

  .cloud::before,
  .cloud::after {
    content: '';
    position: absolute;
    background: white;
    border-radius: 50%;
  }

  .cloud-1 {
    width: 140px;
    height: 50px;
    top: 8%;
    left: 15%;
    border-radius: 40px;
    opacity: 0.85;
    filter: blur(3px);
  }
  .cloud-1::before {
    width: 70px;
    height: 70px;
    top: -30px;
    left: 20px;
    filter: blur(2px);
  }
  .cloud-1::after {
    width: 50px;
    height: 50px;
    top: -20px;
    left: 60px;
    filter: blur(2px);
  }

  .cloud-2 {
    width: 180px;
    height: 55px;
    top: 12%;
    left: 55%;
    border-radius: 40px;
    opacity: 0.9;
    filter: blur(2px);
  }
  .cloud-2::before {
    width: 80px;
    height: 80px;
    top: -40px;
    left: 30px;
    filter: blur(3px);
  }
  .cloud-2::after {
    width: 60px;
    height: 60px;
    top: -25px;
    left: 85px;
    filter: blur(2px);
  }

  .cloud-3 {
    width: 100px;
    height: 35px;
    top: 20%;
    left: 80%;
    border-radius: 30px;
    opacity: 0.7;
    filter: blur(4px);
  }
  .cloud-3::before {
    width: 45px;
    height: 45px;
    top: -20px;
    left: 15px;
    filter: blur(3px);
  }
  .cloud-3::after {
    width: 35px;
    height: 35px;
    top: -12px;
    left: 45px;
    filter: blur(3px);
  }

  .cloud-4 {
    width: 160px;
    height: 48px;
    top: 5%;
    left: 38%;
    border-radius: 35px;
    opacity: 0.75;
    filter: blur(3px);
  }
  .cloud-4::before {
    width: 65px;
    height: 65px;
    top: -32px;
    left: 25px;
    filter: blur(2px);
  }
  .cloud-4::after {
    width: 50px;
    height: 50px;
    top: -22px;
    left: 75px;
    filter: blur(2px);
  }

  .cloud-5 {
    width: 120px;
    height: 40px;
    top: 18%;
    left: 5%;
    border-radius: 30px;
    opacity: 0.6;
    filter: blur(5px);
  }
  .cloud-5::before {
    width: 55px;
    height: 55px;
    top: -25px;
    left: 15px;
    filter: blur(3px);
  }
  .cloud-5::after {
    width: 40px;
    height: 40px;
    top: -16px;
    left: 55px;
    filter: blur(3px);
  }

  /* Hills container with parallax */
  .hills-container {
    position: absolute;
    bottom: 0;
    left: -30px;
    right: -30px;
    height: 55%;
    z-index: 2;
    transform: translate(
      calc((var(--mx) - 0.5) * -15px),
      calc((var(--my) - 0.5) * -10px)
    );
    transition: transform 0.15s ease-out;
  }

  .hill {
    position: absolute;
    border-radius: 50%;
  }

  /* Far hills - muted, small */
  .hill-far-left {
    width: 70%;
    height: 45%;
    bottom: 28%;
    left: -15%;
    background: radial-gradient(ellipse at 50% 80%, #6a9f4e 0%, #5a8f3c 40%, #4d7a35 100%);
    z-index: 1;
  }

  .hill-far-right {
    width: 65%;
    height: 40%;
    bottom: 30%;
    right: -20%;
    background: radial-gradient(ellipse at 50% 80%, #6a9f4e 0%, #5a8f3c 40%, #4d7a35 100%);
    z-index: 1;
  }

  /* Mid hills - brighter green */
  .hill-mid-left {
    width: 60%;
    height: 50%;
    bottom: 18%;
    left: -10%;
    background: radial-gradient(ellipse at 50% 70%, #7acc55 0%, #6abf40 40%, #5aad35 100%);
    z-index: 2;
  }

  .hill-mid-center {
    width: 80%;
    height: 48%;
    bottom: 20%;
    left: 15%;
    background: radial-gradient(ellipse at 50% 70%, #72c74a 0%, #6abf40 40%, #5aad35 100%);
    z-index: 2;
  }

  .hill-mid-right {
    width: 55%;
    height: 42%;
    bottom: 22%;
    right: -5%;
    background: radial-gradient(ellipse at 50% 70%, #7acc55 0%, #6abf40 40%, #5aad35 100%);
    z-index: 2;
  }

  /* Near hills - richest green, largest */
  .hill-near-left {
    width: 65%;
    height: 55%;
    bottom: 2%;
    left: -20%;
    background: radial-gradient(ellipse at 50% 60%, #58c035 0%, #4ca82e 40%, #3d9624 100%);
    z-index: 3;
  }

  .hill-near-center {
    width: 90%;
    height: 50%;
    bottom: 0%;
    left: 10%;
    background: radial-gradient(ellipse at 50% 60%, #52bc30 0%, #4ca82e 40%, #3d9624 100%);
    z-index: 3;
  }

  .hill-near-right {
    width: 60%;
    height: 48%;
    bottom: 0%;
    right: -15%;
    background: radial-gradient(ellipse at 50% 60%, #58c035 0%, #4ca82e 40%, #3d9624 100%);
    z-index: 3;
  }

  /* Ground fill at very bottom */
  .ground {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 15%;
    background: linear-gradient(180deg, #4ca82e 0%, #3d9624 50%, #358020 100%);
    z-index: 4;
  }

  /* ========================
     DESKTOP AREA
     ======================== */
  .desktop-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 36px;
    z-index: 10;
  }

  /* ========================
     XP TASKBAR
     ======================== */
  .taskbar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 36px;
    z-index: 100;
    display: flex;
    align-items: stretch;
    background: linear-gradient(
      180deg,
      #3c8cf4 0%,
      #2e7be6 3%,
      #245edb 8%,
      #2463de 40%,
      #1b53c7 85%,
      #1845b0 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 -1px 3px rgba(0, 0, 0, 0.3);
    border-top: 1px solid #0c3899;
  }

  /* Start Button */
  .start-button {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    padding: 0 12px 0 6px;
    border: none;
    cursor: pointer;
    background: linear-gradient(
      180deg,
      #63b94f 0%,
      #4aad36 5%,
      #3c9b35 15%,
      #3c9b35 60%,
      #358c2e 85%,
      #2e7d27 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      1px 0 1px rgba(0, 0, 0, 0.2);
    border-radius: 0 8px 8px 0;
    transition: filter 0.1s;
  }

  .start-button:hover {
    filter: brightness(1.1);
  }

  .start-button:active {
    filter: brightness(0.9);
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.3),
      1px 0 1px rgba(0, 0, 0, 0.2);
  }

  .start-logo {
    font-size: 20px;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
    line-height: 1;
  }

  .start-text {
    font-size: 13px;
    font-weight: bold;
    font-style: italic;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    letter-spacing: 0.5px;
  }

  /* Taskbar middle area */
  .taskbar-middle {
    flex: 1;
    position: relative;
  }

  /* System Tray */
  .system-tray {
    display: flex;
    align-items: center;
    padding: 0 12px;
    background: linear-gradient(
      180deg,
      #1c8dea 0%,
      #1779d4 15%,
      #1567bc 50%,
      #1259a6 85%,
      #0f4e96 100%
    );
    box-shadow:
      inset 1px 0 1px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset -1px 0 0 rgba(255, 255, 255, 0.05);
    border-left: 1px solid #0d3f80;
    min-width: 80px;
    justify-content: flex-end;
  }

  .tray-clock {
    font-size: 11px;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    white-space: nowrap;
  }
</style>
