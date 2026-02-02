<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';
  import PokeDoom from './pokedoom/PokeDoom.svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // ========================
  // XP BOOT SEQUENCE
  // ========================
  let booting = $state(true);
  let bootProgress = $state(0);

  // Beanie integration
  const hidingSpots: HidingSpot[] = [
    { id: 'behind-start' },
    { id: 'in-tray' },
  ];
  let areaBeanies = $state<Map<string, Beanie>>(new Map());

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
    { id: 'pokedoom', label: 'PokeDOOM.exe', icon: '🎮' },
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
          openWindow('progress', 'Installing Updates...', 'progress', 420, 180);
          break;
        case 'ie':
          openWindow('ie', 'Internet Explorer', 'ie');
          break;
        case 'virus':
          spawnError();
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
        case 'pokedoom':
          openWindow('pokedoom', 'PokeDOOM.exe', 'pokedoom', 520, 400);
          break;
        case 'login':
          loginPassword = '';
          loginFailed = false;
          openWindow('login', 'Log In to BadOS', 'login', 360, 340);
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

  // ========================
  // PASSWORD ROAST (Gag 10)
  // ========================
  const ROASTS: [number, string, string][] = [
    [0, 'Type something, coward.', '#888'],
    [1, 'Pathetic.', '#ff0000'],
    [3, 'My grandma could guess this.', '#ff3300'],
    [5, 'Is this a password or a cry for help?', '#ff6600'],
    [8, 'Getting warmer... still terrible.', '#ff9900'],
    [10, 'Your cat walked on the keyboard and did better.', '#cc9900'],
    [12, "Fine. It's acceptable. Barely.", '#99cc00'],
    [15, 'Wait... this is actually good. Are you a hacker?', '#33cc00'],
    [20, 'FBI OPEN UP', '#0066ff'],
  ];

  let loginPassword = $state('');
  let loginFailed = $state(false);
  let lastRoastThreshold = $state(0);

  function getCurrentRoast(): { text: string; color: string; width: number } {
    const len = loginPassword.length;
    let current = ROASTS[0];
    for (const r of ROASTS) {
      if (len >= r[0]) current = r;
    }
    // Play ding when crossing a new threshold
    if (current[0] !== lastRoastThreshold && len > 0) {
      lastRoastThreshold = current[0];
      playSound('ding', 0.2);
    }
    return {
      text: current[1],
      color: current[2],
      width: Math.min(100, (len / 20) * 100)
    };
  }

  // ========================
  // START MENU ROULETTE (Gag 11) + INFINITE SUBMENUS (Gag 4)
  // ========================
  type MenuEdge = 'bottom-left' | 'top-left' | 'top-right' | 'bottom-right';
  let startMenuOpen = $state(false);
  let startMenuEdge = $state<MenuEdge>('bottom-left');
  const MENU_EDGES: MenuEdge[] = ['bottom-left', 'top-left', 'top-right', 'bottom-right'];

  interface MenuItem {
    icon: string;
    label: string;
    hasSubmenu?: boolean;
    isSeparator?: boolean;
    isShutdown?: boolean;
    submenuId?: string;
  }

  const START_MENU_ITEMS: MenuItem[] = [
    { icon: '📁', label: 'My Documents' },
    { icon: '🖥️', label: 'My Computer' },
    { icon: '🎮', label: 'Games', hasSubmenu: true, submenuId: 'games' },
    { icon: '⚙️', label: 'Control Panel', hasSubmenu: true, submenuId: 'control' },
    { icon: '📂', label: 'All Programs', hasSubmenu: true, submenuId: 'programs' },
    { icon: '', label: '', isSeparator: true },
    { icon: '🔌', label: 'Shut Down', isShutdown: true },
  ];

  interface SubmenuDef {
    items: { label: string; nextSubmenu?: string }[];
  }

  const SUBMENUS: Record<string, SubmenuDef> = {
    games: {
      items: [
        { label: 'Solitaire' },
        { label: 'Minesweeper' },
        { label: 'Pinball' },
        { label: 'More Games', nextSubmenu: 'games2' },
      ],
    },
    games2: {
      items: [
        { label: 'Even More Games', nextSubmenu: 'games3' },
      ],
    },
    games3: {
      items: [
        { label: 'So Many Games', nextSubmenu: 'games4' },
      ],
    },
    games4: {
      items: [
        { label: 'All Games', nextSubmenu: 'games' },
      ],
    },
    control: {
      items: [
        { label: 'Display' },
        { label: 'Sound' },
        { label: 'Advanced', nextSubmenu: 'control2' },
      ],
    },
    control2: {
      items: [
        { label: 'Even More Advanced', nextSubmenu: 'control3' },
      ],
    },
    control3: {
      items: [
        { label: 'Way Too Advanced', nextSubmenu: 'control' },
      ],
    },
    programs: {
      items: [
        { label: 'Calculator' },
        { label: 'Paint' },
        { label: 'More Programs', nextSubmenu: 'programs2' },
      ],
    },
    programs2: {
      items: [
        { label: 'Even More Programs', nextSubmenu: 'programs3' },
      ],
    },
    programs3: {
      items: [
        { label: 'So Many Programs', nextSubmenu: 'programs4' },
      ],
    },
    programs4: {
      items: [
        { label: 'All Programs', nextSubmenu: 'programs' },
      ],
    },
  };

  // Track submenu chain: each entry is a submenuId at that depth
  let submenuChain = $state<string[]>([]);

  function toggleStartMenu() {
    if (startMenuOpen) {
      startMenuOpen = false;
      submenuChain = [];
    } else {
      startMenuEdge = MENU_EDGES[Math.floor(Math.random() * MENU_EDGES.length)];
      startMenuOpen = true;
      submenuChain = [];
    }
    playSound('pop');
  }

  function closeStartMenu() {
    startMenuOpen = false;
    submenuChain = [];
  }

  function handleStartMenuItemClick(item: MenuItem) {
    if (item.isShutdown) {
      closeStartMenu();
      onClose();
      return;
    }
    if (!item.hasSubmenu && !item.isSeparator) {
      playSound('error');
      closeStartMenu();
    }
  }

  function handleSubmenuItemClick(subItem: { label: string; nextSubmenu?: string }) {
    if (!subItem.nextSubmenu) {
      playSound('error');
      closeStartMenu();
    }
  }

  function openSubmenuAtDepth(depth: number, submenuId: string) {
    // Truncate chain to depth, then add
    submenuChain = [...submenuChain.slice(0, depth), submenuId];
  }

  function closeSubmenusFromDepth(depth: number) {
    if (submenuChain.length > depth) {
      submenuChain = submenuChain.slice(0, depth);
    }
  }

  // Fast-forward clock (3x speed)
  let clockDate = $state(new Date());
  let clockInterval: ReturnType<typeof setInterval>;

  let clockDisplay = $derived(
    clockDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );

  // ========================
  // ERROR HYDRA (Gag 8)
  // ========================
  const ERROR_MESSAGES = [
    'Error: Success has failed successfully.',
    'Warning: This warning is a warning.',
    'Fatal error: Not enough errors found.',
    'Error 404: Error message not found.',
    'Warning: Your computer has too many warnings.',
    'Error: Task failed successfully.',
    'Critical: Everything is fine. (This is not fine.)',
    'Error: An error occurred while displaying the previous error.',
    'Warning: Shutting down... just kidding.',
    'Error: Keyboard not found. Press F1 to continue.',
    'Fatal: The operation completed. Somehow.',
    'Error: The file is too happy to be opened.',
  ];

  interface ErrorDialog {
    id: number;
    msg: string;
    x: number;
    y: number;
  }

  let errors = $state<ErrorDialog[]>([]);
  let errorIdCounter = $state(0);
  let bsodFlash = $state(false);

  function spawnError() {
    const cx = (typeof window !== 'undefined' ? window.innerWidth : 1024) / 2;
    const cy = (typeof window !== 'undefined' ? window.innerHeight : 768) / 2;
    const x = cx - 150 + (Math.random() - 0.5) * 100;
    const y = cy - 60 + (Math.random() - 0.5) * 100;
    const msg = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
    errors.push({ id: errorIdCounter++, msg, x, y });
    playSound('error', 0.3);
  }

  function closeError(id: number) {
    const idx = errors.findIndex(e => e.id === id);
    if (idx === -1) return;

    if (errors.length >= 8) {
      // Trigger BSOD flash then clear all
      bsodFlash = true;
      playSound('hit');
      playSound('death', 0.4);
      setTimeout(() => {
        bsodFlash = false;
        errors = [];
      }, 400);
    } else {
      errors.splice(idx, 1);
      // Spawn 2 more
      setTimeout(() => spawnError(), 50);
      setTimeout(() => spawnError(), 150);
    }
  }

  // ========================
  // QUANTUM PROGRESS BAR (Gag 9)
  // ========================
  let progressValue = $state(0);
  let isWatchingProgress = $state(false);
  let progressComplete = $state(false);
  let watchingMsgIndex = $state(0);
  let watchingMsgTimer = $state(0);

  const WATCHING_MESSAGES = [
    'Stop watching me.',
    "I can't perform under pressure.",
    'Please look away.',
    'This is your fault.',
  ];

  $effect(() => {
    if (!progressComplete) {
      const interval = setInterval(() => {
        if (isWatchingProgress) {
          progressValue = Math.max(0, progressValue - 1);
          watchingMsgTimer++;
          if (watchingMsgTimer >= 20) {
            // 20 * 100ms = 2s
            watchingMsgTimer = 0;
            watchingMsgIndex = (watchingMsgIndex + 1) % WATCHING_MESSAGES.length;
          }
        } else {
          progressValue = Math.min(100, progressValue + 0.5);
        }
        if (progressValue >= 100) {
          progressComplete = true;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  });

  // ========================
  // REVERSE VOLUME SLIDER (Gag 2)
  // ========================
  let volumeValue = $state(50);
  let volumeOpen = $state(false);

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const rawVal = parseInt(target.value);
    volumeValue = rawVal;
    // Play sound: display value is 100 - rawVal, so volume is proportional to display
    // Display high = quiet, display low = loud => invert for playSound
    const displayVal = 100 - rawVal;
    playSound('ding', displayVal / 200);
  }

  function handleVolumeClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.volume-popup') && !target.closest('.volume-btn')) {
      volumeOpen = false;
    }
    if (!target.closest('.start-menu') && !target.closest('.start-button')) {
      if (startMenuOpen) {
        closeStartMenu();
      }
    }
    if (contextMenuOpen && !target.closest('.context-menu')) {
      closeContextMenu();
    }
  }

  // ========================
  // CONTEXT MENU FROM HELL (Gag 9)
  // ========================
  let contextMenuOpen = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let desktopSpinning = $state(false);
  let desktopHidden = $state(false);

  interface ContextItem {
    label?: string;
    icon?: string;
    action?: string;
    type?: 'separator';
  }

  const CONTEXT_ITEMS: ContextItem[] = [
    { label: 'Refresh', icon: '\u21BB', action: 'refresh' },
    { label: 'Refresh (spiritually)', icon: '\u21BB', action: 'none' },
    { label: 'Refresh (but angrier)', icon: '\u21BB', action: 'none' },
    { type: 'separator' },
    { label: 'Paste', icon: '\uD83D\uDCCB', action: 'none' },
    { label: 'Paste (but worse)', icon: '\uD83D\uDCCB', action: 'none' },
    { label: 'Paste (judgmentally)', icon: '\uD83D\uDCCB', action: 'none' },
    { type: 'separator' },
    { label: 'Undo', icon: '\u21A9', action: 'none' },
    { label: 'Undo undo', icon: '\u21A9', action: 'none' },
    { label: 'Undo undo undo', icon: '\u21A9', action: 'none' },
    { label: 'Redo (just kidding)', icon: '\u21AA', action: 'none' },
    { type: 'separator' },
    { label: 'Properties (emotional)', icon: '\u2699', action: 'none' },
    { label: 'Properties (physical)', icon: '\u2699', action: 'none' },
    { label: 'Properties (metaphysical)', icon: '\u2699', action: 'none' },
    { type: 'separator' },
    { label: 'New Folder', icon: '\uD83D\uDCC1', action: 'none' },
    { label: 'New Regret', icon: '\uD83D\uDCC1', action: 'none' },
    { label: 'New Existential Crisis', icon: '\uD83D\uDCC1', action: 'none' },
    { label: 'New Spreadsheet of Lies', icon: '\uD83D\uDCC1', action: 'none' },
    { type: 'separator' },
    { label: 'Sort by Name', icon: '\uD83D\uDCCA', action: 'none' },
    { label: 'Sort by Date', icon: '\uD83D\uDCCA', action: 'none' },
    { label: 'Sort by Existential Dread', icon: '\uD83D\uDCCA', action: 'none' },
    { label: 'Sort by Vibes', icon: '\uD83D\uDCCA', action: 'none' },
    { label: 'Sort by Aura', icon: '\uD83D\uDCCA', action: 'none' },
    { type: 'separator' },
    { label: 'Delete Desktop', icon: '\uD83D\uDDD1\uFE0F', action: 'delete-desktop' },
    { label: 'Delete System32 (joke)', icon: '\uD83D\uDC80', action: 'none' },
    { type: 'separator' },
    { label: 'Open Task Manager', icon: '\uD83D\uDCCA', action: 'none' },
    { label: "Open Task Manager's Manager", icon: '\uD83D\uDCCA', action: 'none' },
    { type: 'separator' },
    { label: 'Screen Resolution: Bad', icon: '\uD83D\uDDA5\uFE0F', action: 'none' },
    { label: 'Screen Resolution: Worse', icon: '\uD83D\uDDA5\uFE0F', action: 'none' },
    { label: 'Screen Resolution: Potato', icon: '\uD83E\uDD54', action: 'none' },
    { type: 'separator' },
    { label: 'Help', icon: '\u2753', action: 'none' },
    { label: 'Help (but louder)', icon: '\uD83D\uDCE2', action: 'none' },
    { label: 'Scream into the void', icon: '\uD83D\uDD73\uFE0F', action: 'none' },
  ];

  function handleDesktopContextMenu(e: MouseEvent) {
    if (pokedoomFocused) { e.preventDefault(); return; }
    // Only open if clicking on the desktop area itself, not on icons/windows/taskbar
    const target = e.target as HTMLElement;
    if (target.closest('.desktop-icon') || target.closest('.xp-window') || target.closest('.taskbar') || target.closest('.context-menu')) {
      return;
    }
    e.preventDefault();
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuOpen = true;
    playSound('click', 0.2);
  }

  function handleContextAction(action: string) {
    contextMenuOpen = false;
    if (action === 'refresh') {
      desktopSpinning = true;
      setTimeout(() => { desktopSpinning = false; }, 600);
    } else if (action === 'delete-desktop') {
      desktopHidden = true;
      setTimeout(() => { desktopHidden = false; }, 2000);
    } else {
      playSound('error');
    }
  }

  function closeContextMenu() {
    contextMenuOpen = false;
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
  let pokedoomFocused = $state(false);
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
    if (win) {
      win.visible = false;
      if (win.content === 'pokedoom') pokedoomFocused = false;
    }
    playSound('click');
  }

  function bringToFront(id: string) {
    const win = windows.find(w => w.id === id);
    if (win) {
      win.zIndex = nextZ++;
    }
    // Track PokeDOOM focus — suppress BadOS overlays when game is active
    pokedoomFocused = win?.content === 'pokedoom';
    if (pokedoomFocused) {
      startMenuOpen = false;
      submenuChain = [];
      contextMenuOpen = false;
      volumeOpen = false;
    }
    // Jealous windows: all other visible windows sulk
    for (const w of windows) {
      if (w.id !== id && w.visible) {
        w.sulking = true;
        w.title = w.originalTitle + ' ...fine.';
      } else if (w.id === id) {
        w.sulking = false;
        w.title = w.originalTitle;
      }
    }
  }

  function getSulkTransform(win: XPWindow): string {
    if (!win.sulking) return 'translate(0, 0)';
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winCenterX = win.x + win.width / 2;
    if (winCenterX < screenW / 2) {
      return 'translate(-30px, 0)';
    } else {
      return 'translate(30px, 0)';
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
    if (pokedoomFocused) return;
    toggleStartMenu();
  }

  onMount(() => {
    // Beanie registration
    registerSpots('bados', hidingSpots);
    areaBeanies = getBeaniesForArea('bados');

    // Boot sequence: fill progress bar over 2s
    const bootInterval = setInterval(() => {
      bootProgress = Math.min(100, bootProgress + 2);
      if (bootProgress >= 100) {
        clearInterval(bootInterval);
      }
    }, 40); // 40ms * 50 steps = 2s

    setTimeout(() => {
      booting = false;
      playSound('powerup', 0.4);
      // Welcome dialog 0.5s after desktop appears
      setTimeout(() => {
        welcomeVisible = true;
      }, 500);
    }, 2000);

    clockInterval = setInterval(() => {
      clockDate = new Date(clockDate.getTime() + 3000);
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(clockInterval);
    if (dragAnimFrame) {
      cancelAnimationFrame(dragAnimFrame);
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window onmousemove={handleMouseMove} onmouseup={endDrag} onclick={handleVolumeClickOutside} />

<div
  class="bados-desktop"
  style="--mx: {mx}; --my: {my}"
>
  {#if booting}
    <!-- XP Boot Screen -->
    <div class="boot-screen">
      <div class="boot-content">
        <div class="boot-logo">
          <span class="boot-flag">&#127987;&#65039;</span>
          <span class="boot-title">Windows<span class="boot-xp">XP</span></span>
        </div>
        <div class="boot-bar-track">
          <div class="boot-bar-fill" style="width: {bootProgress}%"></div>
        </div>
      </div>
    </div>
  {:else}
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="desktop-area" oncontextmenu={handleDesktopContextMenu}>
    <!-- Desktop Icons -->
    {#each icons as icon (icon.id)}
      <button
        class="desktop-icon"
        class:gave-up={icon.id === 'recycle' && recycleGaveUp}
        class:icon-spinning={desktopSpinning}
        class:icon-hidden={desktopHidden}
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
        style="left: {win.x}px; top: {win.y}px; width: {win.id === 'notepad' ? `calc(${win.width}px + ${notepadTitleStretch * 100}px)` : `${win.width}px`}; height: {win.height}px; z-index: {win.content === 'pokedoom' && pokedoomFocused ? 1000 : win.zIndex}; transform: {getSulkTransform(win)}"
        onmousedown={() => bringToFront(win.id)}
        onmouseenter={win.content === 'progress' ? () => { isWatchingProgress = true; } : undefined}
        onmouseleave={win.content === 'progress' ? () => { isWatchingProgress = false; } : undefined}
        role="dialog"
        tabindex="-1"
        aria-label={win.content === 'progress' && progressComplete ? 'Update complete!' : win.title}
      >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="xp-titlebar"
          onmousedown={(e) => startDrag(e, win.id)}
          onmousemove={win.id === 'notepad' ? handleNotepadTitlebarMove : undefined}
          onmouseleave={win.id === 'notepad' ? handleNotepadTitlebarLeave : undefined}
        >
          <span class="xp-title-text">{win.content === 'progress' && progressComplete ? 'Update complete!' : win.title}</span>
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
          {:else if win.content === 'login'}
            {@const roast = getCurrentRoast()}
            <div class="login-container">
              <div class="login-form">
                <label class="login-label">
                  Username:
                  <input type="text" class="login-input" placeholder="Admin" />
                </label>
                <label class="login-label">
                  Password:
                  <input type="password" class="login-input" bind:value={loginPassword} placeholder="" />
                </label>
                <div class="strength-meter">
                  <div class="strength-bar-track">
                    <div
                      class="strength-bar-fill"
                      style="width: {roast.width}%; background-color: {roast.color}"
                    ></div>
                  </div>
                  <div class="strength-text" style="color: {roast.color}">{roast.text}</div>
                </div>
                <button class="login-btn" onclick={() => { loginFailed = true; playSound('error'); }}>
                  Log In
                </button>
                {#if loginFailed}
                  <div class="login-error">Incorrect password. (We didn't even check.)</div>
                {/if}
              </div>
            </div>
          {:else if win.content === 'pokedoom'}
            <div class="pokedoom-window-body">
              <PokeDoom />
            </div>
          {:else if win.content === 'progress'}
            <div class="progress-container">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  class:progress-complete={progressComplete}
                  style="width: {progressValue}%"
                ></div>
              </div>
              <div class="progress-pct">{Math.round(progressValue)}%</div>
              <div class="progress-status">
                {#if progressComplete}
                  Just kidding. Updates will restart in 5 seconds.
                {:else if isWatchingProgress}
                  {WATCHING_MESSAGES[watchingMsgIndex]}
                {:else}
                  Installing update 1 of 347...
                {/if}
              </div>
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

  <!-- Error Hydra dialogs -->
  {#each errors as err, i (err.id)}
    <div
      class="error-dialog"
      style="left: {err.x}px; top: {err.y}px; z-index: {200 + i}"
      role="alertdialog"
      aria-label="Error"
    >
      <div class="error-titlebar">
        <span class="error-title-text">{err.msg.startsWith('Warning') ? 'Warning' : 'Error'}</span>
        <button class="xp-btn xp-btn-close" onclick={() => closeError(err.id)} aria-label="Close">×</button>
      </div>
      <div class="error-body">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <span class="error-msg">{err.msg}</span>
        </div>
        <div class="error-buttons">
          <button class="error-ok-btn" onclick={() => closeError(err.id)}>OK</button>
        </div>
      </div>
    </div>
  {/each}

  <!-- BSOD Flash -->
  {#if bsodFlash}
    <div class="bsod-overlay">
      <div class="bsod-text">
        <p>A problem has been detected and BadOS has been shut down to prevent damage to your computer.</p>
        <p>IRQL_NOT_LESS_OR_EQUAL</p>
        <p>*** STOP: 0x0000000A (0x00000000, 0x00000002, 0x00000000, 0x804E3B2C)</p>
      </div>
    </div>
  {/if}

  <!-- Start Menu -->
  {#if startMenuOpen}
    <div class="start-menu start-menu-{startMenuEdge}" role="menu">
      <div class="start-menu-sidebar">
        <span class="start-menu-sidebar-text">BadOS XP</span>
      </div>
      <div class="start-menu-content">
        {#each START_MENU_ITEMS as item, i}
          {#if item.isSeparator}
            <div class="start-menu-separator"></div>
          {:else}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="start-menu-item"
              class:start-menu-item-shutdown={item.isShutdown}
              onclick={() => handleStartMenuItemClick(item)}
              onmouseenter={() => {
                if (item.hasSubmenu && item.submenuId) {
                  openSubmenuAtDepth(0, item.submenuId);
                } else {
                  closeSubmenusFromDepth(0);
                }
              }}
              role="menuitem"
              tabindex="-1"
            >
              <span class="start-menu-item-icon">{item.icon}</span>
              <span class="start-menu-item-label">{item.label}</span>
              {#if item.hasSubmenu}
                <span class="start-menu-item-arrow">&#9656;</span>
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      <!-- Submenu cascade -->
      {#each submenuChain as submenuId, depth}
        {@const submenu = SUBMENUS[submenuId]}
        {#if submenu}
          <!-- svelte-ignore a11y_no_static_element_interactions a11y_interactive_supports_focus -->
          <div
            class="start-submenu"
            style="--depth: {depth + 1}; --offset: {(depth + 1) * 200}px"
            onmouseleave={() => closeSubmenusFromDepth(depth + 1)}
            role="menu"
          >
            {#each submenu.items as subItem}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="start-menu-item"
                onclick={() => handleSubmenuItemClick(subItem)}
                onmouseenter={() => {
                  if (subItem.nextSubmenu) {
                    openSubmenuAtDepth(depth + 1, subItem.nextSubmenu);
                  } else {
                    closeSubmenusFromDepth(depth + 1);
                  }
                }}
                role="menuitem"
                tabindex="-1"
              >
                <span class="start-menu-item-label">{subItem.label}</span>
                {#if subItem.nextSubmenu}
                  <span class="start-menu-item-arrow">&#9656;</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Context Menu from Hell -->
  {#if contextMenuOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="context-menu"
      style="left: {contextMenuX}px; top: {contextMenuY}px"
      role="menu"
    >
      {#each CONTEXT_ITEMS as item}
        {#if item.type === 'separator'}
          <div class="context-separator"></div>
        {:else}
          <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
          <div
            class="context-item"
            onclick={() => handleContextAction(item.action ?? 'none')}
            role="menuitem"
            tabindex="-1"
          >
            <span class="context-icon">{item.icon}</span>
            <span class="context-label">{item.label}</span>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Close button -->
  <CloseButton onClose={onClose} variant="light" />

  <!-- Beanie hiding spots -->
  {#if areaBeanies.has('behind-start')}
    <div class="beanie-behind-start">
      <HidingBeanie beanie={areaBeanies.get('behind-start')!} />
    </div>
  {/if}
  {#if areaBeanies.has('in-tray')}
    <div class="beanie-in-tray">
      <HidingBeanie beanie={areaBeanies.get('in-tray')!} />
    </div>
  {/if}

  <!-- Taskbar -->
  <div class="taskbar" style:display={pokedoomFocused ? 'none' : ''}>
    <button class="start-button" onclick={handleStartClick}>
      <span class="start-logo">&#8862;</span>
      <span class="start-text">start</span>
    </button>

    <div class="taskbar-middle"></div>

    <div class="system-tray">
      <div class="volume-wrapper">
        <button class="volume-btn" onclick={() => { volumeOpen = !volumeOpen; }} aria-label="Volume">
          🔊
        </button>
        {#if volumeOpen}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="volume-popup" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
            <div class="volume-display">{100 - volumeValue}</div>
            <input
              type="range"
              min="0"
              max="100"
              value={volumeValue}
              class="volume-slider"
              oninput={handleVolumeChange}
            />
          </div>
        {/if}
      </div>
      <span class="tray-clock">{clockDisplay}</span>
    </div>
  </div>
  {/if}
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
    transition: transform 1.5s ease-in-out;
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

  /* ========================
     ERROR HYDRA DIALOGS
     ======================== */
  .error-dialog {
    position: fixed;
    width: 300px;
    border-radius: 8px 8px 0 0;
    border: 1px solid #0054e3;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    animation: error-appear 0.2s ease-out;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  @keyframes error-appear {
    0% { transform: scale(0.6); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .error-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    min-height: 26px;
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

  .error-title-text {
    font-size: 11px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.4);
    flex: 1;
  }

  .error-body {
    background: #ece9d8;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .error-content {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .error-icon {
    font-size: 28px;
    line-height: 1;
    flex-shrink: 0;
  }

  .error-msg {
    font-size: 11px;
    color: #000;
    line-height: 1.4;
  }

  .error-buttons {
    display: flex;
    justify-content: center;
  }

  .error-ok-btn {
    min-width: 75px;
    height: 24px;
    padding: 0 16px;
    border: 1px solid #003c74;
    border-radius: 3px;
    font-size: 11px;
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
  }

  .error-ok-btn:hover {
    background: linear-gradient(
      180deg,
      #fff 0%,
      #f5f5f0 40%,
      #ebe8e0 70%,
      #e0dcd4 100%
    );
    border-color: #0055cc;
  }

  .error-ok-btn:active {
    background: linear-gradient(
      180deg,
      #d6d2c6 0%,
      #e0dcd4 50%,
      #d6d2c6 100%
    );
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* ========================
     BSOD FLASH
     ======================== */
  .bsod-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #0000aa;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: bsod-flash 0.4s ease-out forwards;
  }

  @keyframes bsod-flash {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .bsod-text {
    color: white;
    font-family: 'Lucida Console', 'Courier New', monospace;
    font-size: 14px;
    max-width: 600px;
    text-align: left;
    line-height: 1.6;
    padding: 40px;
  }

  .bsod-text p {
    margin: 0 0 12px 0;
  }

  /* ========================
     QUANTUM PROGRESS BAR
     ======================== */
  .progress-container {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    box-sizing: border-box;
  }

  .progress-track {
    width: 100%;
    height: 20px;
    background: #fff;
    border: 1px solid #888;
    box-shadow:
      inset 1px 1px 2px rgba(0, 0, 0, 0.2),
      inset -1px -1px 0 rgba(255, 255, 255, 0.5);
    border-radius: 1px;
    overflow: hidden;
    padding: 2px;
  }

  .progress-fill {
    height: 100%;
    background: repeating-linear-gradient(
      90deg,
      #3169c6 0px,
      #3169c6 8px,
      #4a8cf5 8px,
      #4a8cf5 9px,
      #3169c6 9px,
      #3169c6 10px
    );
    background-size: 10px 100%;
    border-radius: 1px;
    transition: width 0.1s linear;
  }

  .progress-fill.progress-complete {
    background: repeating-linear-gradient(
      90deg,
      #3a9634 0px,
      #3a9634 8px,
      #4cbf45 8px,
      #4cbf45 9px,
      #3a9634 9px,
      #3a9634 10px
    );
  }

  .progress-pct {
    font-size: 11px;
    color: #333;
    text-align: center;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .progress-status {
    font-size: 11px;
    color: #666;
    text-align: center;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    min-height: 16px;
  }

  /* ========================
     REVERSE VOLUME SLIDER
     ======================== */
  .volume-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .volume-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 3px;
    color: white;
  }

  .volume-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .volume-popup {
    position: absolute;
    bottom: 36px;
    right: -10px;
    width: 120px;
    background: #ece9d8;
    border: 1px solid #888;
    border-radius: 3px;
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 300;
    animation: volume-appear 0.15s ease-out;
  }

  @keyframes volume-appear {
    0% { transform: translateY(4px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  .volume-display {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .volume-slider {
    width: 100%;
    height: 18px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    direction: rtl;
  }

  .volume-slider::-webkit-slider-track {
    height: 6px;
    background: #fff;
    border: 1px solid #888;
    border-radius: 2px;
    box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.15);
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 18px;
    background: linear-gradient(
      180deg,
      #f0f0ea 0%,
      #e4e0d8 40%,
      #d6d2c6 100%
    );
    border: 1px solid #888;
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 1px 2px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    margin-top: -6px;
  }

  .volume-slider::-moz-range-track {
    height: 6px;
    background: #fff;
    border: 1px solid #888;
    border-radius: 2px;
    box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.15);
  }

  .volume-slider::-moz-range-thumb {
    width: 12px;
    height: 18px;
    background: linear-gradient(
      180deg,
      #f0f0ea 0%,
      #e4e0d8 40%,
      #d6d2c6 100%
    );
    border: 1px solid #888;
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 1px 2px rgba(0, 0, 0, 0.15);
    cursor: pointer;
  }

  /* ========================
     LOGIN FORM (Gag 10)
     ======================== */
  .login-container {
    padding: 20px;
    background: #ece9d8;
    height: 100%;
    box-sizing: border-box;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .login-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    font-weight: bold;
    color: #000;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  .login-input {
    height: 24px;
    padding: 2px 6px;
    border: 1px solid #7f9db9;
    font-size: 12px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    background: #fff;
    color: #000;
    box-shadow:
      inset 1px 1px 2px rgba(0, 0, 0, 0.2),
      inset -1px -1px 0 rgba(255, 255, 255, 0.5);
    outline: none;
  }

  .login-input:focus {
    border-color: #3169c6;
    box-shadow:
      inset 1px 1px 2px rgba(0, 0, 0, 0.2),
      0 0 2px rgba(49, 105, 198, 0.4);
  }

  .strength-meter {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .strength-bar-track {
    width: 100%;
    height: 8px;
    background: #ddd;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #bbb;
  }

  .strength-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease, background-color 0.3s ease;
  }

  .strength-text {
    font-size: 11px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    font-style: italic;
    min-height: 16px;
    transition: color 0.3s ease;
  }

  .login-btn {
    align-self: center;
    min-width: 90px;
    height: 26px;
    padding: 0 20px;
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
    margin-top: 4px;
  }

  .login-btn:hover {
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

  .login-btn:active {
    background: linear-gradient(
      180deg,
      #d6d2c6 0%,
      #e0dcd4 50%,
      #d6d2c6 100%
    );
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .login-error {
    color: #cc0000;
    font-size: 11px;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    text-align: center;
    font-weight: bold;
  }

  /* ========================
     START MENU (Gag 11)
     ======================== */
  .start-menu {
    position: fixed;
    width: 240px;
    z-index: 600;
    background: #fff;
    border: 2px solid #1f3f8e;
    box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: row;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    overflow: visible;
  }

  /* Edge positioning */
  .start-menu-bottom-left {
    bottom: 36px;
    left: 0;
    animation: start-slide-up 0.2s ease-out;
  }

  .start-menu-top-left {
    top: 0;
    left: 0;
    animation: start-slide-down 0.2s ease-out;
  }

  .start-menu-top-right {
    top: 0;
    right: 0;
    animation: start-slide-down 0.2s ease-out;
  }

  .start-menu-bottom-right {
    bottom: 36px;
    right: 0;
    animation: start-slide-up 0.2s ease-out;
  }

  @keyframes start-slide-up {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes start-slide-down {
    0% { transform: translateY(-20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  .start-menu-sidebar {
    width: 28px;
    min-width: 28px;
    background: linear-gradient(180deg, #1f3f8e 0%, #2b5fc4 100%);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 8px 0;
    position: relative;
  }

  .start-menu-sidebar-text {
    color: white;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
  }

  .start-menu-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }

  .start-menu-item {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 12px 0 8px;
    cursor: pointer;
    gap: 8px;
    font-size: 12px;
    color: #000;
    position: relative;
  }

  .start-menu-item:hover {
    background: #316ac5;
    color: white;
  }

  .start-menu-item-shutdown {
    font-weight: bold;
  }

  .start-menu-item-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    line-height: 1;
    flex-shrink: 0;
  }

  .start-menu-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .start-menu-item-arrow {
    font-size: 10px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .start-menu-separator {
    height: 1px;
    background: #c0c0c0;
    margin: 3px 8px;
  }

  /* Submenus */
  .start-submenu {
    position: absolute;
    top: 0;
    left: calc(100% + var(--offset, 0px) - 200px);
    width: 200px;
    background: #fff;
    border: 2px solid #1f3f8e;
    box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.4);
    padding: 4px 0;
    z-index: 650;
    animation: submenu-slide-in 0.15s ease-out;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
  }

  /* For right-side menus, submenus go left */
  .start-menu-top-right .start-submenu,
  .start-menu-bottom-right .start-submenu {
    left: auto;
    right: calc(100% + var(--offset, 0px) - 200px);
    animation: submenu-slide-in-left 0.15s ease-out;
  }

  @keyframes submenu-slide-in {
    0% { transform: translateX(-8px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes submenu-slide-in-left {
    0% { transform: translateX(8px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  /* ========================
     CONTEXT MENU FROM HELL
     ======================== */
  .context-menu {
    position: fixed;
    z-index: 300;
    background: #fff;
    border: 1px solid #404040;
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);
    padding: 2px 0;
    min-width: 220px;
    max-height: 60vh;
    overflow-y: auto;
    font-family: 'Tahoma', 'Segoe UI', sans-serif;
    font-size: 12px;
    animation: context-appear 0.1s ease-out;
  }

  @keyframes context-appear {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }

  .context-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 24px 4px 8px;
    cursor: default;
    color: #000;
    white-space: nowrap;
  }

  .context-item:hover {
    background: #316ac5;
    color: #fff;
  }

  .context-icon {
    width: 18px;
    text-align: center;
    font-size: 13px;
    flex-shrink: 0;
  }

  .context-label {
    flex: 1;
  }

  .context-separator {
    height: 1px;
    background: #c0c0c0;
    margin: 3px 4px;
  }

  /* ========================
     XP BOOT SCREEN
     ======================== */
  .boot-screen {
    position: absolute;
    inset: 0;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .boot-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .boot-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .boot-flag {
    font-size: 40px;
    line-height: 1;
  }

  .boot-title {
    font-size: 36px;
    font-weight: bold;
    color: #fff;
    font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
    letter-spacing: -1px;
  }

  .boot-xp {
    color: #ff8c00;
    font-style: italic;
    margin-left: 4px;
  }

  .boot-bar-track {
    width: 200px;
    height: 14px;
    background: #000;
    border: 1px solid #333;
    border-radius: 2px;
    overflow: hidden;
    padding: 2px;
  }

  .boot-bar-fill {
    height: 100%;
    background: repeating-linear-gradient(
      90deg,
      #3169c6 0px,
      #3169c6 6px,
      transparent 6px,
      transparent 8px
    );
    border-radius: 1px;
    transition: width 0.04s linear;
  }

  /* ========================
     ICON CONTEXT MENU EFFECTS
     ======================== */
  .desktop-icon.icon-spinning {
    animation: icon-spin 0.6s ease-in-out;
  }

  @keyframes icon-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .desktop-icon.icon-hidden {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* ========================
     BEANIE HIDING SPOTS
     ======================== */
  .beanie-behind-start {
    position: absolute;
    bottom: 28px;
    left: 8px;
    z-index: 95;
    pointer-events: auto;
  }

  .beanie-in-tray {
    position: absolute;
    bottom: 28px;
    right: 100px;
    z-index: 95;
    pointer-events: auto;
  }

  .pokedoom-window-body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
  }
</style>
