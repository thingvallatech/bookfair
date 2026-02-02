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

  // ========================
  // DESKTOP ICONS
  // ========================
  interface DesktopIcon {
    id: string;
    label: string;
    icon: string;
    x: number;
    y: number;
  }

  const ICON_DEFS = [
    { id: 'computer', label: 'My Computer', icon: '🖥️' },
    { id: 'ie', label: 'Internet\nExplorer', icon: '🌐' },
    { id: 'virus', label: 'Definitely Not\nA Virus.exe', icon: '💀' },
    { id: 'homework', label: 'homework\n(real).pdf', icon: '📄' },
    { id: 'folder', label: 'New Folder (37)', icon: '📁' },
    { id: 'notepad', label: 'Notepad', icon: '📝' },
    { id: 'recycle', label: 'Recycle Bin', icon: '🗑️' },
    { id: 'login', label: 'Login', icon: '🔐' },
  ];

  let icons = $state<DesktopIcon[]>(
    ICON_DEFS.map((def, i) => ({
      ...def,
      x: 20,
      y: 20 + i * 80,
    }))
  );

  let recycleAttempts = $state(0);
  let recycleGaveUp = $state(false);

  function shuffleIcons() {
    const maxX = Math.max(100, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 80);
    const maxY = Math.max(100, (typeof window !== 'undefined' ? window.innerHeight : 768) - 120);
    for (const icon of icons) {
      icon.x = 10 + Math.random() * (maxX - 10);
      icon.y = 10 + Math.random() * (maxY - 10);
    }
  }

  function handleIconClick(id: string) {
    playSound('scatter');
    shuffleIcons();

    setTimeout(() => {
      switch (id) {
        case 'computer':
          openWindow('computer', 'My Computer', 'empty');
          break;
        case 'ie':
          openWindow('ie', 'Internet Explorer', 'ie');
          break;
        case 'virus':
          openWindow('virus', 'Error', 'empty');
          break;
        case 'homework':
          openWindow('homework', 'homework (real).pdf', 'homework');
          break;
        case 'folder':
          openWindow('folder', 'New Folder (37)', 'empty');
          break;
        case 'notepad':
          openWindow('notepad', 'Untitled - Notepad', 'notepad', 500, 350);
          break;
        case 'recycle':
          openWindow('recycle', 'Recycle Bin', 'recycle');
          break;
        case 'login':
          openWindow('login', 'Login', 'empty');
          break;
      }
    }, 500);
  }

  function getIconShadow(icon: DesktopIcon): string {
    const iconCenterX = icon.x + 36;
    const iconCenterY = icon.y + 32;
    const cursorX = mx * (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const cursorY = my * (typeof window !== 'undefined' ? window.innerHeight : 768);
    const dx = iconCenterX - cursorX;
    const dy = iconCenterY - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))';
    const normDx = dx / dist;
    const normDy = dy / dist;
    const shadowLen = Math.min(dist * 0.04, 12);
    return `drop-shadow(${normDx * shadowLen}px ${normDy * shadowLen}px ${2 + shadowLen * 0.3}px rgba(0,0,0,0.35))`;
  }

  function checkRecycleFlee(cursorX: number, cursorY: number) {
    if (recycleGaveUp) return;
    const recycleIcon = icons.find(i => i.id === 'recycle');
    if (!recycleIcon) return;

    const iconCenterX = recycleIcon.x + 36;
    const iconCenterY = recycleIcon.y + 40;
    const dx = iconCenterX - cursorX;
    const dy = iconCenterY - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) {
      recycleAttempts++;
      if (recycleAttempts >= 6) {
        recycleGaveUp = true;
        playSound('whoosh', 0.2);
        return;
      }
      // Flee in opposite direction
      const fleeDist = 120 + Math.random() * 60;
      const angle = Math.atan2(dy, dx);
      let newX = recycleIcon.x + Math.cos(angle) * fleeDist;
      let newY = recycleIcon.y + Math.sin(angle) * fleeDist;

      // Clamp to desktop bounds
      const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1024) - 80;
      const maxY = (typeof window !== 'undefined' ? window.innerHeight : 768) - 120;
      newX = Math.max(10, Math.min(maxX, newX));
      newY = Math.max(10, Math.min(maxY, newY));

      recycleIcon.x = newX;
      recycleIcon.y = newY;
      playSound('whoosh', 0.2);
    }
  }

  // ========================
  // WELCOME DIALOG (swapping buttons gag)
  // ========================
  let welcomeVisible = $state(false);
  let buttonsSwapped = $state(false);
  let swapCount = $state(0);

  function handleButtonAreaEnter() {
    if (swapCount < 4) {
      buttonsSwapped = !buttonsSwapped;
      swapCount++;
      playSound('pop', 0.2);
    }
  }

  function dismissWelcome() {
    welcomeVisible = false;
    playSound('click');
  }

  function cancelWelcome() {
    welcomeVisible = false;
    playSound('click');
    setTimeout(() => {
      welcomeVisible = true;
      playSound('error');
    }, 800);
  }

  // ========================
  // NOTEPAD (backwards typing gag)
  // ========================
  let notepadText = $state(".gniklaw er'uoY .SOdaB ot emocleW");
  let notepadTitleStretch = $state(0);

  function handleNotepadKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLTextAreaElement;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      notepadText = e.key + notepadText;
      playSound('click', 0.05);
      requestAnimationFrame(() => {
        target.setSelectionRange(0, 0);
      });
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (notepadText.length > 0) {
        notepadText = notepadText.slice(1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      notepadText = '\n' + notepadText;
      requestAnimationFrame(() => {
        target.setSelectionRange(0, 0);
      });
    }
  }

  function handleNotepadTitlebarMove(e: MouseEvent) {
    const titlebar = (e.currentTarget as HTMLElement);
    const rect = titlebar.getBoundingClientRect();
    const distFromRight = rect.right - e.clientX;
    if (distFromRight < 100) {
      // The closer to the right edge, the more stretch (max 0.2 factor = 20% extra)
      notepadTitleStretch = Math.min(0.2, (100 - distFromRight) / 500);
    } else {
      notepadTitleStretch = 0;
    }
  }

  function handleNotepadTitlebarLeave() {
    notepadTitleStretch = 0;
  }

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

  // ========================
  // XP WINDOW SYSTEM
  // ========================
  interface XPWindow {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    visible: boolean;
    content: string;
    sulking: boolean;
    originalTitle: string;
  }

  let windows = $state<XPWindow[]>([]);
  let nextZ = $state(10);
  let dragState = $state<{
    id: string;
    offsetX: number;
    offsetY: number;
    targetX: number;
    targetY: number;
  } | null>(null);
  let dragAnimFrame: number | null = null;

  function openWindow(id: string, title: string, content: string, width = 400, height = 300) {
    const existing = windows.find(w => w.id === id);
    if (existing) {
      existing.visible = true;
      bringToFront(id);
      return;
    }
    const x = Math.max(20, (window.innerWidth - width) / 2 + (Math.random() - 0.5) * 80);
    const y = Math.max(20, (window.innerHeight - height - 36) / 2 + (Math.random() - 0.5) * 60);
    windows.push({
      id,
      title,
      x,
      y,
      width,
      height,
      zIndex: nextZ++,
      visible: true,
      content,
      sulking: false,
      originalTitle: title
    });
  }

  function closeWindow(id: string) {
    const win = windows.find(w => w.id === id);
    if (win) win.visible = false;
    playSound('click');
  }

  function bringToFront(id: string) {
    const win = windows.find(w => w.id === id);
    if (win) {
      win.zIndex = nextZ++;
    }
  }

  function startDrag(e: MouseEvent, id: string) {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    bringToFront(id);
    dragState = {
      id,
      offsetX: e.clientX - win.x,
      offsetY: e.clientY - win.y,
      targetX: win.x,
      targetY: win.y
    };
    if (!dragAnimFrame) {
      dragAnimFrame = requestAnimationFrame(dragLerp);
    }
    e.preventDefault();
  }

  function dragLerp() {
    if (!dragState) {
      dragAnimFrame = null;
      return;
    }
    const win = windows.find(w => w.id === dragState!.id);
    if (win) {
      const lerpFactor = 0.15;
      win.x += (dragState.targetX - win.x) * lerpFactor;
      win.y += (dragState.targetY - win.y) * lerpFactor;
    }
    dragAnimFrame = requestAnimationFrame(dragLerp);
  }

  function endDrag() {
    if (dragState) {
      const win = windows.find(w => w.id === dragState!.id);
      if (win) {
        win.x = dragState.targetX;
        win.y = dragState.targetY;
      }
      dragState = null;
    }
    if (dragAnimFrame) {
      cancelAnimationFrame(dragAnimFrame);
      dragAnimFrame = null;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;

    // Update drag target position
    if (dragState) {
      dragState.targetX = e.clientX - dragState.offsetX;
      dragState.targetY = Math.max(0, e.clientY - dragState.offsetY);
    }

    // Check recycle bin flee
    checkRecycleFlee(e.clientX, e.clientY);
  }

  function handleStartClick() {
    playSound('click');
  }

  onMount(() => {
    playSound('powerup', 0.4);
    updateClock();
    clockInterval = setInterval(updateClock, 10000);
    setTimeout(() => {
      welcomeVisible = true;
    }, 1500);
  });

  onDestroy(() => {
    clearInterval(clockInterval);
    if (dragAnimFrame) {
      cancelAnimationFrame(dragAnimFrame);
    }
  });
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={endDrag} />

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

  <!-- Desktop area with windows -->
  <div class="desktop-area">
    <!-- Desktop Icons -->
    {#each icons as icon (icon.id)}
      <button
        class="desktop-icon"
        class:gave-up={icon.id === 'recycle' && recycleGaveUp}
        style="left: {icon.x}px; top: {icon.y}px; filter: {getIconShadow(icon)}"
        onclick={() => handleIconClick(icon.id)}
      >
        <span class="icon-emoji">{icon.icon}</span>
        <span class="icon-label">{icon.label}</span>
      </button>
    {/each}

    {#each windows.filter(w => w.visible) as win (win.id)}
      <div
        class="xp-window"
        style="left: {win.x}px; top: {win.y}px; width: {win.id === 'notepad' ? `calc(${win.width}px + ${notepadTitleStretch * 100}px)` : `${win.width}px`}; height: {win.height}px; z-index: {win.zIndex}"
        onmousedown={() => bringToFront(win.id)}
        role="dialog"
        tabindex="-1"
        aria-label={win.title}
      >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="xp-titlebar"
          onmousedown={(e) => startDrag(e, win.id)}
          onmousemove={win.id === 'notepad' ? handleNotepadTitlebarMove : undefined}
          onmouseleave={win.id === 'notepad' ? handleNotepadTitlebarLeave : undefined}
        >
          <span class="xp-title-text">{win.sulking ? win.title + ' ...fine.' : win.title}</span>
          <div class="xp-titlebar-buttons">
            <button class="xp-btn xp-btn-minimize" aria-label="Minimize">_</button>
            <button class="xp-btn xp-btn-maximize" aria-label="Maximize">□</button>
            <button
              class="xp-btn xp-btn-close"
              class:xp-btn-tiny={win.id === 'notepad'}
              onclick={() => closeWindow(win.id)}
              aria-label="Close"
            >×</button>
          </div>
        </div>
        <div class="xp-window-body">
          {#if win.content === 'empty'}
            <p style="padding: 20px; color: #666;">This folder is empty.</p>
          {:else if win.content === 'ie'}
            <div style="padding: 20px; text-align: center;">
              <p style="font-size: 14px; font-weight: bold; color: #333;">This page cannot be displayed</p>
              <p style="color: #666; margin-top: 8px;">The page you are looking for is currently unavailable.</p>
            </div>
          {:else if win.content === 'homework'}
            <p style="padding: 20px; color: #333; font-size: 18px; text-align: center; font-style: italic;">Nice try.</p>
          {:else if win.content === 'recycle'}
            <p style="padding: 20px; color: #666;">This folder is empty. Just like my soul.</p>
          {:else if win.content === 'notepad'}
            <div class="notepad-container">
              <div class="notepad-menubar">
                <span class="notepad-menu-item">File</span>
                <span class="notepad-menu-item">Edit</span>
                <span class="notepad-menu-item">Format</span>
                <span class="notepad-menu-item">View</span>
                <span class="notepad-menu-item">Help</span>
              </div>
              <textarea
                class="notepad-textarea"
                bind:value={notepadText}
                onkeydown={handleNotepadKeydown}
                spellcheck="false"
              ></textarea>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Welcome Dialog (swapping buttons gag) -->
  {#if welcomeVisible}
    <div class="welcome-overlay">
      <div class="welcome-dialog" role="alertdialog" aria-label="Welcome to BadOS XP">
        <div class="welcome-titlebar">
          <span class="welcome-title-text">Welcome to BadOS XP</span>
          <button class="xp-btn xp-btn-close" onclick={dismissWelcome} aria-label="Close">×</button>
        </div>
        <div class="welcome-body">
          <div class="welcome-content">
            <span class="welcome-icon">&#9888;&#65039;</span>
            <div class="welcome-text">
              <p class="welcome-heading">Welcome to BadOS XP!</p>
              <p class="welcome-quote">"Where every click is an adventure<br>and every adventure is a mistake."</p>
            </div>
          </div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="welcome-buttons"
            style="flex-direction: {buttonsSwapped ? 'row-reverse' : 'row'}"
            onmouseenter={handleButtonAreaEnter}
          >
            <button class="welcome-btn" onclick={dismissWelcome}>OK</button>
            <button class="welcome-btn" onclick={cancelWelcome}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

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

  /* ========================
     XP WINDOW SYSTEM
     ======================== */
  .xp-window {
    position: absolute;
    border-radius: 8px 8px 0 0;
    border: 1px solid #0054e3;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .xp-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    min-height: 28px;
    padding: 0 4px 0 8px;
    background: linear-gradient(
      180deg,
      #0058e6 0%,
      #1a6ff5 20%,
      #3a8cf4 50%,
      #1a6ff5 80%,
      #0058e6 100%
    );
    border-radius: 8px 8px 0 0;
    cursor: move;
    user-select: none;
  }

  .xp-title-text {
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .xp-titlebar-buttons {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 8px;
  }

  .xp-btn {
    width: 21px;
    height: 21px;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15),
      inset 1px 0 0 rgba(255, 255, 255, 0.2),
      inset -1px 0 0 rgba(0, 0, 0, 0.1);
  }

  .xp-btn-minimize,
  .xp-btn-maximize {
    background: linear-gradient(
      180deg,
      #d8e6f7 0%,
      #c2d5ef 25%,
      #a8c0e0 50%,
      #94b0d4 75%,
      #88a4c8 100%
    );
    color: #1a3a6e;
  }

  .xp-btn-minimize:hover,
  .xp-btn-maximize:hover {
    background: linear-gradient(
      180deg,
      #e4eefa 0%,
      #d2e1f5 25%,
      #bcd0ec 50%,
      #a8c0e0 75%,
      #9cb4d6 100%
    );
  }

  .xp-btn-minimize:active,
  .xp-btn-maximize:active {
    background: linear-gradient(
      180deg,
      #94b0d4 0%,
      #88a4c8 50%,
      #7a96ba 100%
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.3),
      inset 1px 0 1px rgba(0, 0, 0, 0.15);
  }

  .xp-btn-close {
    background: linear-gradient(
      180deg,
      #e08a8a 0%,
      #e36868 25%,
      #d45050 50%,
      #c75050 75%,
      #b84545 100%
    );
    color: white;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  }

  .xp-btn-close:hover {
    background: linear-gradient(
      180deg,
      #eca0a0 0%,
      #f07878 25%,
      #e86060 50%,
      #d85858 75%,
      #c84e4e 100%
    );
  }

  .xp-btn-close:active {
    background: linear-gradient(
      180deg,
      #b84545 0%,
      #a83c3c 50%,
      #983535 100%
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.3),
      inset 1px 0 1px rgba(0, 0, 0, 0.15);
  }

  .xp-window-body {
    flex: 1;
    background: #fff;
    box-shadow:
      inset 1px 1px 2px rgba(0, 0, 0, 0.15),
      inset -1px -1px 0 rgba(255, 255, 255, 0.5);
    overflow: auto;
    font-size: 12px;
    color: #000;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  /* ========================
     DESKTOP ICONS
     ======================== */
  .desktop-icon {
    position: absolute;
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 2px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    z-index: 5;
    transition:
      left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
      top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.1s ease-out;
  }

  .desktop-icon:hover {
    background: rgba(49, 106, 197, 0.4);
    border: 1px dashed rgba(49, 106, 197, 0.8);
  }

  .desktop-icon:active {
    background: rgba(49, 106, 197, 0.6);
    border: 1px solid rgba(49, 106, 197, 0.9);
  }

  .icon-emoji {
    font-size: 32px;
    line-height: 1;
    pointer-events: none;
  }

  .icon-label {
    font-size: 11px;
    color: white;
    text-align: center;
    text-shadow:
      1px 1px 2px rgba(0, 0, 0, 0.9),
      -1px -1px 2px rgba(0, 0, 0, 0.9),
      1px -1px 2px rgba(0, 0, 0, 0.9),
      -1px 1px 2px rgba(0, 0, 0, 0.9);
    white-space: pre-line;
    line-height: 1.2;
    pointer-events: none;
  }

  .desktop-icon.gave-up {
    animation: icon-shake 0.4s ease-in-out;
  }

  @keyframes icon-shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-4px) rotate(-2deg); }
    30% { transform: translateX(4px) rotate(2deg); }
    45% { transform: translateX(-3px) rotate(-1deg); }
    60% { transform: translateX(3px) rotate(1deg); }
    75% { transform: translateX(-2px); }
    90% { transform: translateX(2px); }
  }

  /* ========================
     WELCOME DIALOG
     ======================== */
  .welcome-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.15);
  }

  .welcome-dialog {
    width: 420px;
    border-radius: 8px 8px 0 0;
    border: 1px solid #0054e3;
    box-shadow:
      2px 2px 15px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: welcome-appear 0.3s ease-out;
  }

  @keyframes welcome-appear {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .welcome-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    min-height: 28px;
    padding: 0 4px 0 8px;
    background: linear-gradient(
      180deg,
      #0058e6 0%,
      #1a6ff5 20%,
      #3a8cf4 50%,
      #1a6ff5 80%,
      #0058e6 100%
    );
    border-radius: 8px 8px 0 0;
  }

  .welcome-title-text {
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
    flex: 1;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .welcome-body {
    background: #ece9d8;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .welcome-content {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .welcome-icon {
    font-size: 32px;
    line-height: 1;
    flex-shrink: 0;
  }

  .welcome-text {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .welcome-heading {
    font-size: 13px;
    font-weight: bold;
    color: #000;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    margin: 0;
  }

  .welcome-quote {
    font-size: 12px;
    color: #444;
    font-style: italic;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    margin: 0;
    line-height: 1.5;
  }

  .welcome-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .welcome-btn {
    min-width: 80px;
    height: 26px;
    padding: 0 16px;
    border: 1px solid #003c74;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    cursor: pointer;
    background: linear-gradient(
      180deg,
      #fff 0%,
      #f0f0ea 40%,
      #e4e0d8 70%,
      #d6d2c6 100%
    );
    color: #000;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 1px 2px rgba(0, 0, 0, 0.15);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .welcome-btn:hover {
    background: linear-gradient(
      180deg,
      #fff 0%,
      #f5f5f0 40%,
      #ebe8e0 70%,
      #e0dcd4 100%
    );
    border-color: #0055cc;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 0 3px rgba(0, 85, 204, 0.4);
  }

  .welcome-btn:active {
    background: linear-gradient(
      180deg,
      #d6d2c6 0%,
      #e0dcd4 50%,
      #d6d2c6 100%
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* ========================
     NOTEPAD
     ======================== */
  .notepad-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .notepad-menubar {
    display: flex;
    align-items: center;
    gap: 0;
    height: 22px;
    min-height: 22px;
    background: #ece9d8;
    border-bottom: 1px solid #c0c0c0;
    padding: 0 2px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    font-size: 11px;
    color: #000;
  }

  .notepad-menu-item {
    padding: 2px 8px;
    cursor: default;
  }

  .notepad-menu-item:hover {
    background: #316ac5;
    color: white;
  }

  .notepad-textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    padding: 4px 6px;
    font-family: 'Lucida Console', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.4;
    background: #fff;
    color: #000;
    width: 100%;
    box-sizing: border-box;
  }

  /* ========================
     TINY CLOSE BUTTON (notepad)
     ======================== */
  .xp-btn-tiny {
    width: 6px !important;
    min-width: 6px !important;
    overflow: hidden;
    padding: 0 !important;
    font-size: 8px !important;
    transition: width 0.2s ease;
  }

  .xp-btn-tiny:hover {
    width: 6px !important;
  }
</style>
