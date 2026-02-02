# BadOS XP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fake Windows XP desktop toy where every UI element is a beautifully polished, uniquely terrible UX gag — inspired by r/badUIbattles.

**Architecture:** Single Svelte component (`BadOS.svelte`) containing all 12 gags as self-contained reactive blocks. XP Luna theme built entirely in CSS (no external libraries). All state is local `$state` runes. The component follows the standard toy pattern: accepts `onClose` prop, uses `CloseButton`, and optionally integrates beanie hiding spots.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, pure CSS (no 98.css or external UI libs), existing `playSound()` for audio feedback.

---

## Task 1: Scaffold component and register on shelf

**Files:**
- Create: `src/lib/toys/BadOS.svelte`
- Modify: `src/routes/+page.svelte`

**Step 1: Create minimal BadOS component**

```svelte
<script lang="ts">
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();
</script>

<div class="bados">
  <CloseButton {onClose} variant="dark" />
  <p>BadOS XP — coming soon</p>
</div>

<style>
  .bados {
    width: 100%;
    height: 100%;
    background: #3a6ea5;
    position: relative;
  }
</style>
```

**Step 2: Register on shelf in `+page.svelte`**

Add import at top with other toy imports:
```ts
import BadOS from '$lib/toys/BadOS.svelte';
```

Add to `shelfObjects` array:
```ts
{ id: 'bados', name: 'BadOS XP', icon: '🖥️', desc: 'Worst desktop ever' },
```

Add conditional render block after the last `{:else if}`:
```svelte
{:else if activeObject === 'bados'}
  <div class="object-view" role="dialog" aria-label="BadOS XP">
    <BadOS onClose={closeObject} />
  </div>
```

**Step 3: Verify**

Run: `npm run dev` — click "BadOS XP" on shelf, see blue screen with close button.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte src/routes/+page.svelte
git commit -m "feat(bados): scaffold BadOS XP toy on shelf"
```

---

## Task 2: XP Desktop shell — wallpaper, taskbar, desktop area

Build the visual foundation: CSS Bliss wallpaper, XP-style taskbar with green Start button, desktop icon grid area.

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Build the XP desktop layout**

Replace the entire component with:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Mouse position for parallax wallpaper + cursor spotlight
  let mouseX = $state(0.5);
  let mouseY = $state(0.5);

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  }
</script>

<svelte:window on:mousemove={handleMouseMove} />

<div class="bados">
  <CloseButton {onClose} variant="dark" />

  <!-- Parallax Bliss Wallpaper (Gag 12) -->
  <div
    class="wallpaper"
    style="--mx: {mouseX}; --my: {mouseY}"
  >
    <div class="sky"></div>
    <div class="hills">
      <div class="hill hill-far"></div>
      <div class="hill hill-mid"></div>
      <div class="hill hill-near"></div>
    </div>
    <div class="clouds">
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
    </div>
  </div>

  <!-- Desktop area (icons go here) -->
  <div class="desktop">
    <!-- Icons will be added in Task 4 -->
  </div>

  <!-- Taskbar -->
  <div class="taskbar">
    <button class="start-button">
      <span class="start-logo">⊞</span>
      <span class="start-text">start</span>
    </button>
    <div class="taskbar-middle"></div>
    <div class="system-tray">
      <span class="tray-clock">12:00 PM</span>
    </div>
  </div>
</div>
```

**Step 2: Add XP CSS theme**

Key visual elements:
- Bliss wallpaper as CSS gradients (green rolling hills, blue sky, white clouds) with parallax transform based on `--mx`/`--my` custom properties
- Taskbar: `#245edb` to `#3c8cf4` gradient, 36px height, pinned to bottom
- Start button: green gradient `#3c9b35` to `#358c2e`, bold white "start" text, rounded left corners
- System tray: lighter blue inset area, clock text
- All using `box-shadow` for XP's characteristic beveled/3D look

The wallpaper parallax shifts the hills layer by ±15px based on cursor position — purely aesthetic, completely useless (Gag 12).

**Step 3: Verify**

Run dev server — see XP desktop with Bliss wallpaper, taskbar, Start button. Move mouse to see subtle parallax on the hills.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): XP desktop shell with parallax Bliss wallpaper"
```

---

## Task 3: XP Window component (reusable within BadOS)

Build a reusable XP-style window with blue title bar, min/max/close buttons, and draggable behavior (with intentionally laggy drag for subtle wrongness).

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Add window rendering logic**

Add a window state system to the script block:

```ts
interface XPWindow {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  content: string; // which gag to render inside
}

let windows = $state<XPWindow[]>([]);
let nextZ = $state(10);

function bringToFront(id: string) {
  const win = windows.find(w => w.id === id);
  if (win) {
    win.zIndex = nextZ++;
    // Gag 7: Jealous windows — others sulk
    windows.forEach(w => {
      if (w.id !== id && w.visible) {
        w.sulking = true;
      }
    });
  }
}

function closeWindow(id: string) {
  const win = windows.find(w => w.id === id);
  if (win) win.visible = false;
  playSound('click');
}
```

**Step 2: Build XP window markup and styling**

Each window renders with:
- Blue gradient title bar (`#0054e3` to `#3c8cf4` to `#0054e3`)
- White title text with text-shadow
- Min `_` / Max `□` / Close `×` buttons (rounded, colored: close is red-on-hover)
- White content area with 2px inset border
- Draggable via title bar (drag offset lags 50px behind cursor via lerp — subtle wrongness)

**Step 3: Verify**

Manually spawn a test window. Drag it around — notice it trails your cursor slightly. Click between windows — z-order updates.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): XP window component with laggy drag"
```

---

## Task 4: Desktop icons with shuffle (Gag 3) and cursor spotlight (Gag 10)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Add desktop icon state**

```ts
interface DesktopIcon {
  id: string;
  label: string;
  icon: string; // emoji
  x: number;
  y: number;
}

const ICON_LABELS = [
  { id: 'computer', label: 'My Computer', icon: '🖥️' },
  { id: 'ie', label: 'Internet Explorer', icon: '🌐' },
  { id: 'virus', label: 'Definitely Not\nA Virus.exe', icon: '💀' },
  { id: 'homework', label: 'homework\n(real).pdf', icon: '📄' },
  { id: 'folder', label: 'New Folder (37)', icon: '📁' },
  { id: 'notepad', label: 'Notepad', icon: '📝' },
  { id: 'recycle', label: 'Recycle Bin', icon: '🗑️' },
  { id: 'login', label: 'Login', icon: '🔐' },
];

let icons = $state<DesktopIcon[]>(/* initialize with grid positions */);
```

**Step 2: Shuffle on click**

When any icon is clicked, ALL icons animate to new random positions using CSS transitions (`transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s ...`). The spring easing makes them overshoot and bounce into place — satisfying animation, infuriating result.

The clicked icon opens its associated window/gag after the shuffle completes (500ms delay).

**Step 3: Cursor spotlight (Gag 10)**

Each icon gets a CSS `filter: drop-shadow()` computed from the cursor position. The shadow direction is the vector from cursor to icon, and length is proportional to distance. This makes the cursor feel like a light source casting real-time shadows from every icon.

Use the existing `mouseX`/`mouseY` state and compute per-icon in a `$derived`:

```ts
let iconShadows = $derived(
  icons.map(icon => {
    const dx = (icon.x + 24) / window.innerWidth - mouseX;
    const dy = (icon.y + 24) / window.innerHeight - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const len = Math.min(dist * 30, 15);
    return `drop-shadow(${dx * len}px ${dy * len}px 3px rgba(0,0,0,0.4))`;
  })
);
```

**Step 4: Verify**

Click an icon — all icons scramble with a bouncy animation. Move mouse — shadows shift in real-time from every icon. Both effects work together.

**Step 5: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): shuffling desktop icons with cursor spotlight shadows"
```

---

## Task 5: Fleeing Recycle Bin (Gag 1)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Add flee behavior to recycle bin icon**

The recycle bin icon gets special mouse-proximity detection. When the cursor comes within 80px, the icon accelerates away using spring physics:

```ts
let recycleAttempts = $state(0);
let recycleGaveUp = $state(false);

function fleeFromCursor(iconEl: HTMLElement, cursorX: number, cursorY: number) {
  if (recycleGaveUp) return;

  const rect = iconEl.getBoundingClientRect();
  const iconCX = rect.left + rect.width / 2;
  const iconCY = rect.top + rect.height / 2;
  const dx = iconCX - cursorX;
  const dy = iconCY - cursorY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 80) {
    recycleAttempts++;
    if (recycleAttempts >= 6) {
      recycleGaveUp = true;
      return;
    }
    // Flee in opposite direction, clamped to viewport
    const angle = Math.atan2(dy, dx);
    const fleeDist = 120 + Math.random() * 80;
    // Update icon position with bounds checking
    playSound('whoosh', 0.2);
  }
}
```

After 6 failed attempts, the recycle bin "sighs" (brief shake animation) and stays put. Clicking it then opens an empty folder window with the text "This folder is empty. Just like my soul."

**Step 2: Verify**

Chase the recycle bin with cursor — it flees smoothly. After 6 chases it gives up and becomes clickable.

**Step 3: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): fleeing recycle bin with spring physics"
```

---

## Task 6: Welcome dialog with swapping buttons (Gag 2)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Add welcome dialog state**

The welcome dialog appears 1 second after mount (simulating XP "boot"). It's an XP-style dialog:

```
┌─ Welcome to BadOS XP ─────────────── [×] ┐
│                                            │
│  ⚠️  Welcome to BadOS XP!                  │
│                                            │
│  "Where every click is an adventure        │
│   and every adventure is a mistake."       │
│                                            │
│           [ OK ]    [ Cancel ]             │
│                                            │
└────────────────────────────────────────────┘
```

**Step 2: Implement button swapping**

```ts
let welcomeVisible = $state(false);
let buttonsSwapped = $state(false);
let swapCount = $state(0);

function handleWelcomeHover() {
  if (swapCount < 4) {
    buttonsSwapped = !buttonsSwapped;
    swapCount++;
    playSound('pop', 0.2);
  }
  // After 4 swaps, buttons stop moving — catchable
}

function dismissWelcome() {
  welcomeVisible = false;
  playSound('click');
}

function cancelWelcome() {
  // "Cancel" just re-shows the dialog after a beat
  welcomeVisible = false;
  setTimeout(() => { welcomeVisible = true; }, 800);
  playSound('error');
}
```

Buttons have `transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)` for a smooth, bouncy swap. The swap triggers on `mouseenter` of either button's container area.

**Step 3: Verify**

Dialog appears on load. Hover over OK — buttons swap with animation. After 4 swaps they stop. Cancel dismisses then reopens. OK dismisses permanently.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): welcome dialog with swapping OK/Cancel buttons"
```

---

## Task 7: Backwards Notepad (Gag 4) with tiny close button (Gag 6)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Implement backwards text input**

Notepad window opens when clicking the Notepad desktop icon. Contains a textarea where:
- Every character typed is prepended (inserted at index 0) instead of appended
- The cursor visually stays at position 0 (beginning of text)
- Pre-filled with: `".still gniklat er'uoY .SOdaB ot emocleW"`

```ts
let notepadText = $state(".still gniklat er'uoY .SOdaB ot emocleW");

function handleNotepadKeydown(e: KeyboardEvent) {
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    notepadText = e.key + notepadText;
    playSound('click', 0.1);
    // Force cursor to position 0
    tick().then(() => {
      const el = e.target as HTMLTextAreaElement;
      el.setSelectionRange(0, 0);
    });
  }
}
```

**Step 2: Tiny close button (Gag 6)**

The Notepad window's XP close button `×` is 6px wide instead of the normal size. The title bar has a `transition: width 0.3s` and stretches up to 20% wider when the cursor is in the right 100px of the title bar — pushing the × further away. It maxes out though, so with patience you can hit it.

**Step 3: Verify**

Open Notepad. Type "hello" — see "h" then "eh" then "leh" then "lleh" then "olleh" building from the left. Try to close — the × is tiny and the title bar stretches, but it's achievable.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): backwards notepad with tiny close button"
```

---

## Task 8: Error Hydra (Gag 5)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Add error dialog system**

Clicking "Definitely Not A Virus.exe" spawns the first error dialog. Closing any error spawns two more. Cap at 8.

```ts
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

let errors = $state<{id: number, msg: string, x: number, y: number}[]>([]);
let errorIdCounter = $state(0);
```

Each error dialog is a small XP-style alert with an ⚠️ icon and an OK button. Closing one (clicking OK) removes it and spawns two new ones at slightly offset positions — unless we're at the cap of 8.

When all 8 exist, closing one triggers a "BSOD flash" (blue screen flashes for 300ms) then all errors dissolve with a fade-out. Satisfying resolution.

**Step 2: Verify**

Click virus icon. Close error → 2 more appear. Keep closing → they multiply to 8. Close one more → brief BSOD flash → all clear.

**Step 3: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): error hydra — close one, two appear"
```

---

## Task 9: Quantum Progress Bar (Gag 6) and Reverse Volume (Gag 2)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Quantum Progress Bar**

A window titled "Installing Updates..." with a progress bar. The progress bar:
- Advances ~0.5% per 100ms when the cursor is NOT over the window
- Reverses ~1% per 100ms when the cursor IS over the window
- Text below updates based on state:
  - Normal: "Installing update 1 of 347..."
  - Hovering: "Stop watching me." → "I can't perform under pressure." → "Please look away." → "This is your fault."
- When it reaches 100% (if you're patient enough to leave it alone), the window title changes to "Update complete!" and the bar turns green

```ts
let progress = $state(0);
let isWatchingProgress = $state(false);
let progressPhase = $state(0); // for cycling hover messages

$effect(() => {
  const interval = setInterval(() => {
    if (isWatchingProgress) {
      progress = Math.max(0, progress - 1);
    } else {
      progress = Math.min(100, progress + 0.5);
    }
  }, 100);
  return () => clearInterval(interval);
});
```

**Step 2: Reverse Volume Slider**

In the taskbar system tray, a small speaker icon. Clicking it opens a volume popup above the taskbar. The slider:
- Dragging right decreases the value (shown as 0-100)
- Dragging left increases it
- The visual fill bar goes right-to-left
- Plays a beep (`playSound('ding')`) at intervals so you hear the volume changing — louder when the number shows lower, quieter when it shows higher
- Tooltip shows the real value

```ts
let volume = $state(50);
let volumeOpen = $state(false);

// The slider input's value is inverted: input 0 = volume 100, input 100 = volume 0
let sliderValue = $derived(100 - volume);
```

**Step 3: Verify**

Open progress bar window. Hover over it — bar retreats, text complains. Move cursor away — bar advances. Volume slider in tray behaves backwards with audio feedback.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): quantum progress bar and reverse volume slider"
```

---

## Task 10: Password Roast (Gag 8)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Build login window**

Clicking the Login desktop icon opens a window with:
- Username field (normal — accepts anything)
- Password field with a live "strength" meter that roasts you

```ts
const ROASTS: [number, string, string][] = [
  // [minLength, label, color]
  [0, 'Type something, coward.', '#999'],
  [1, 'Pathetic.', '#ff0000'],
  [3, 'My grandma could guess this.', '#ff3300'],
  [5, 'Is this a password or a cry for help?', '#ff6600'],
  [8, 'Getting warmer... still terrible.', '#ff9900'],
  [10, 'Your cat walked on the keyboard and did better.', '#cc9900'],
  [12, "Fine. It's acceptable. Barely.", '#99cc00'],
  [15, 'Wait... this is actually good. Are you a hacker?', '#33cc00'],
  [20, 'FBI OPEN UP 🚨', '#0066ff'],
];

let password = $state('');

let roast = $derived(() => {
  const len = password.length;
  let current = ROASTS[0];
  for (const r of ROASTS) {
    if (len >= r[0]) current = r;
  }
  return { text: current[1], color: current[2] };
});
```

The strength meter bar animates width and color. A "Login" button exists but clicking it always shows "Incorrect password. (We didn't even check.)"

**Step 2: Verify**

Open login window. Type progressively longer passwords. Watch the roasts escalate. Try to log in — always fails with a snarky message.

**Step 3: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): password strength roaster"
```

---

## Task 11: Start Menu Roulette (Gag 11) and Infinite submenus (Gag 4)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Start menu that opens from random edges**

Clicking the Start button opens the Start menu from a random screen edge (bottom-left, top-left, top-right, bottom-right). The menu slides in from the chosen edge with an XP-style animation.

```ts
type MenuEdge = 'bottom-left' | 'top-left' | 'top-right' | 'bottom-right';
let startMenuOpen = $state(false);
let startMenuEdge = $state<MenuEdge>('bottom-left');

function toggleStartMenu() {
  if (startMenuOpen) {
    startMenuOpen = false;
  } else {
    const edges: MenuEdge[] = ['bottom-left', 'top-left', 'top-right', 'bottom-right'];
    startMenuEdge = edges[Math.floor(Math.random() * edges.length)];
    startMenuOpen = true;
    playSound('pop');
  }
}
```

**Step 2: Infinite submenu cascade**

The menu has items like:
- "All Programs ▸" → opens submenu with "More Programs ▸" → loops
- "Control Panel ▸" → "Advanced Settings ▸" → "Even More Advanced ▸" → "Way Too Advanced ▸" → back to "Control Panel ▸"
- "Shut Down" (actually works — calls `onClose`)

Each submenu slides open with XP's characteristic animation. Submenus cascade rightward (or leftward if near edge). Max 4 deep, then they loop. Clicking outside closes all menus.

**Step 3: Verify**

Click Start — menu appears from a random corner. Hover "All Programs" — submenus cascade and loop. Click outside — closes. Click again — different corner.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): start menu roulette with infinite submenus"
```

---

## Task 12: Jealous Windows (Gag 7) and Context Menu from Hell (Gag 9)

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Jealous window behavior**

When a window is brought to front (clicked), all other visible windows:
- Change their title bar text to append " ...fine."
- Slowly translate toward the nearest screen edge (CSS transition, 2s ease-in-out, ~40px movement)
- When a different window is clicked, previously sulking windows slide back

```ts
// Add to XPWindow interface:
// sulking: boolean;
// originalTitle: string;

$effect(() => {
  // When any window's sulking state changes, animate position offset
});
```

**Step 2: Context menu from hell**

Right-clicking the desktop background opens a massive context menu with 40+ absurd items. The menu is scrollable (max-height 60vh). Items include:

```ts
const CONTEXT_ITEMS = [
  '↻ Refresh',
  '↻ Refresh (spiritually)',
  '↻ Refresh (but angrier)',
  '---', // separator
  'New →|Folder|Regret|Existential Crisis|Spreadsheet of Lies|Shortcut to Nowhere',
  '---',
  '⎘ Paste',
  '⎘ Paste (but worse)',
  '⎘ Paste (judgmentally)',
  '---',
  'Sort by →|Name|Date|Existential Dread|Vibes|Aura|How Much I Care (ascending)',
  '---',
  'Properties (emotional)',
  'Properties (physical)',
  'Properties (metaphysical)',
  '---',
  'Undo',
  'Undo undo',
  'Undo undo undo',
  'Redo (just kidding)',
  '---',
  'Screen Resolution →|Bad|Worse|Potato|"Cinematic"',
  '---',
  'Personalize →|Make it worse|Make it much worse|Give up',
  '---',
  'Open Task Manager',
  'Open Task Manager\'s Manager',
  '---',
  'Delete Desktop',
  'Delete System32 (this is a joke)',
  '---',
  'View →|Large Icons|Small Icons|Icons That Judge You|No Icons (anarchy mode)',
  '---',
  'Help',
  'Help (but louder)',
  'Scream into the void',
];
```

Clicking most items does nothing (or plays `playSound('error')`). "Refresh" makes all desktop icons spin 360deg. "Delete Desktop" temporarily hides all icons for 2 seconds. The context menu closes on any click.

**Step 3: Verify**

Right-click desktop — massive scrollable menu appears. Click "Refresh" — icons spin. Click "Delete Desktop" — icons vanish then reappear. Click window → other windows sulk.

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): jealous windows and context menu from hell"
```

---

## Task 13: Fast-forward clock and beanie integration

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Implement 3x speed clock in system tray**

```ts
let clockTime = $state(new Date());

onMount(() => {
  const interval = setInterval(() => {
    clockTime = new Date(clockTime.getTime() + 3000); // 3x speed
  }, 1000);
  return () => clearInterval(interval);
});

let clockDisplay = $derived(
  clockTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
);
```

**Step 2: Add beanie hiding spots**

```ts
import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
import HidingBeanie from '$lib/components/HidingBeanie.svelte';
import type { Beanie } from '$lib/stores/beanies';

const hidingSpots: HidingSpot[] = [
  { id: 'behind-start' },
  { id: 'in-tray' },
];

let areaBeanie = $state<Map<string, Beanie>>(new Map());

onMount(() => {
  registerSpots('bados', hidingSpots);
  areaBeanie = getBeaniesForArea('bados');
});
```

Place `HidingBeanie` components: one peeking from behind the Start button, one in the system tray area.

**Step 3: Verify**

Clock runs at 3x speed in the system tray. Beanie spots function (may or may not have beanies assigned depending on session RNG).

**Step 4: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): fast-forward clock and beanie hiding spots"
```

---

## Task 14: Polish pass — animations, sounds, mobile support

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

**Step 1: Sound effects throughout**

- Icon shuffle: `playSound('scatter')`
- Recycle bin flee: `playSound('whoosh', 0.2)`
- Button swap: `playSound('pop', 0.2)`
- Error spawn: `playSound('error', 0.3)`
- Error hydra BSOD: `playSound('hit')`
- Context menu open: `playSound('click', 0.2)`
- Start menu: `playSound('pop')`
- Notepad typing: `playSound('click', 0.1)` (throttled)
- Password roast escalation: `playSound('ding', 0.2)` when crossing thresholds

**Step 2: Mobile/touch support**

- Desktop icons: touch to select (highlight), second touch to open — since there's no hover to trigger shuffle, use tap instead
- Start menu: tap Start to toggle
- Context menu: long-press on desktop
- Windows: touch-drag on title bar
- Recycle bin: on touch, flee from the touch point
- Parallax wallpaper: use device orientation API (gyroscope) if available, falls back to touch position
- Minimum touch targets: 44px for all interactive elements

**Step 3: XP boot sequence**

On mount, show a brief (1.5s) XP-style boot screen: black background, Windows XP logo (text-based), a progress bar, then fade to desktop. Then welcome dialog appears 0.5s after desktop.

**Step 4: Verify**

Test all 12 gags. Verify sounds play. Test on mobile viewport. Check the boot sequence.

**Step 5: Final commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(bados): polish — sounds, mobile support, boot sequence"
```

---

## Summary of All 12 Gags

| # | Gag | Location | Interaction |
|---|-----|----------|-------------|
| 1 | Fleeing Recycle Bin | Desktop icon | Dodges cursor, gives up after 6 tries |
| 2 | Reverse Volume | Taskbar tray | Slider goes backwards |
| 3 | Swapping OK/Cancel | Welcome dialog | Buttons swap on hover, stop after 4 |
| 4 | Infinite Start Menu | Start button | Submenus loop endlessly |
| 5 | Shuffling Icons | Desktop | Click one, all rearrange |
| 6 | Tiny Close Button | Notepad window | 6px wide, title bar stretches |
| 7 | Backwards Notepad | Notepad window | Text inserts at beginning |
| 8 | Error Hydra | Virus.exe icon | Close one error, two spawn (cap 8) |
| 9 | Quantum Progress Bar | Window | Only progresses when not watched |
| 10 | Password Roast | Login window | Strength meter insults you |
| 11 | Context Menu from Hell | Right-click desktop | 40+ absurd menu items |
| 12 | Parallax Bliss + Cursor Shadows | Background + icons | Wallpaper shifts, icons cast shadows |

Plus: Jealous Windows, fast-forward clock, Start menu roulette (random edge), laggy window drag, XP boot sequence.
