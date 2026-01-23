# The Book Fair at the End of the Internet

## Design Document

---

## Vision

A website that feels like you've stumbled onto something that shouldn't still exist. It looks like 2003. It feels like walking into the Scholastic book fair. Bright, handmade, earnest. No irony. No feed. No algorithm.

You land on a shelf. On the shelf are objects. Each object is a door to an experience. Some are toys. Some are tools. Some are worlds. You click, you explore, you discover. Getting lost is the point.

**The nostalgia is real because:**
- It's not referencing the old web—it IS the old web, rebuilt with modern tools
- Canvas and WebGL behind the scenes, GeoCities energy on the surface
- The feeling isn't performed. It's constructed.

**The emotional target:**
- Bright possibility, not dark mystery
- Earnest discovery, not ironic distance
- Childhood wonder at what's behind the next click
- The Scholastic book fair + 2000-2006 internet, combined

---

## Core Concept

### The Shelf

The central metaphor is a shelf full of objects. Like a kid's bedroom shelf, a classroom shelf, the display at a book fair. Objects sit there waiting to be picked up.

Each object is clickable. Each click takes you somewhere:
- Inside a WebGL snow globe
- Into a Kid Pix-style drawing tool
- Playing a game of pogs
- Watching a Winamp visualizer
- Generating your own Got Milk? ad
- Caring for a virtual pet

### Objects Are Promises

Like book covers at the fair. You don't know what's inside until you click. Some experiences are tiny (30 seconds). Some are deep (you could spend an hour). All of them are made with earnest, try-hard energy.

### Shelves Connect to Shelves

Click through an object far enough and you might find a door. Through the door is another room with another shelf. Different objects. Different worlds. The whole site is rooms full of objects, and objects full of worlds.

### No Map, No Search

You navigate by clicking and wandering. Webrings at the bottom of some pages connect thematic clusters. Some pages are dead ends—you hit back or start over. Getting lost is the point. Discovery happens through browsing, not intent.

---

## The First Build: Bedroom Shelf, 1997

The landing page is a shelf in a kid's bedroom. Warm afternoon light through blinds. Wood-grain texture. Slightly messy—objects look collected, not arranged. Maybe a poster edge visible at the top of the screen.

### Object 1: Koosh Ball

**What it is:** A physics-based fidget toy.

**Experience:** Click and drag to throw it. It sticks to surfaces, wobbles, bounces. Pull it back. Squish it. Watch it settle.

**Purpose:** Immediate proof that things here DO something. Pure tactile satisfaction.

**Technical:** WebGL or Canvas physics simulation. Simple spring/particle system.

**Build time:** 2-3 days

---

### Object 2: Dial-Up Modem

**What it is:** A chunky external modem, circa 1998.

**Experience:** Click it. The 30-second dial-up handshake sound plays. That's it. That's the whole thing.

**Purpose:** Pure nostalgia hit. People will listen to the whole thing. They'll send it to friends.

**Technical:** Audio file, simple click interaction. Maybe some LED lights blink in sync.

**Build time:** 1 day

---

### Object 3: Kid Pix

**What it is:** A drawing tool inspired by the classic software.

**Experience:**
- Canvas with drawing tools
- Stamp library (stars, animals, shapes)
- Sound effects on every action
- The "Oh no!" undo button with the guy screaming
- Save to a public gallery
- Browse what others have made

**Purpose:** The creative tool. Highly shareable output. People will screenshot their drawings and post them.

**Technical:** Canvas-based drawing app. Backend for saving/loading gallery images.

**Build time:** 1-2 weeks

---

### Object 4: Magic Eye Poster

**What it is:** A framed autostereogram poster on the shelf.

**Experience:**
- Click to zoom in
- It's a real, working Magic Eye image
- When you "see" the hidden image, a secret link appears
- The link takes you somewhere hidden in the site

**Purpose:** Proves the site has secrets. Rewards patience and curiosity. The first hint that there's more than what's visible.

**Technical:** Autostereogram generation (can use existing algorithms). Hidden interaction triggered by... time spent? A click in the right spot? Some way to "prove" you saw it.

**Build time:** 3-5 days

---

### Object 5: Pog Tube

**What it is:** A clear tube full of pogs (milk caps) with a slammer on top.

**Experience:**
- Open the tube, pogs spill out
- Play a game: stack pogs, slam them, keep what flips
- Play against "the site" (AI opponent)
- Your collection persists between visits
- Win rare pogs. Lose pogs you bet.

**Purpose:** First taste of progression and stakes. A reason to return—your collection grows (or shrinks).

**Technical:** Physics simulation for the slam/flip. Persistent storage (localStorage or account). Pog designs (procedural + hand-designed).

**Build time:** 1-2 weeks

---

### Object 6: Lunchables Tray

**What it is:** An empty Lunchables tray.

**Experience:**
- Select your cracker type
- Select your meat
- Select your cheese
- Select your dessert (Oreos? Kit-Kat? Capri Sun?)
- Arrange them on the tray
- "Seal" your Lunchable
- Download as image

**Purpose:** Completely pointless. People will spend way too long on it. Highly shareable. "Look at my perfect Lunchable."

**Technical:** Simple component picker + canvas composition. Image export.

**Build time:** 4-5 days

---

### Object 7: The Pet

**What it is:** A Tamagotchi-style virtual pet that lives in the corner of the screen.

**Experience:**
- Small, pixelated creature
- Feed it, play with it, clean up after it
- Evolves based on how often you visit and what you do
- Neglect it and it changes (doesn't die—transforms into something sadder)
- Each person's pet is different based on their behavior

**Purpose:** THE return hook. The reason people check back daily. Emotional investment in a tiny creature.

**Technical:** State machine for evolution. Persistent storage tied to user. Multiple evolution paths and sprites.

**Build time:** 2-3 weeks

---

## Design Language

### Visual Aesthetic

**Era:** 1997-2003

**Palette:**
- Warm, saturated colors
- Not vaporwave (too late, too ironic)
- Not synthwave (too dark)
- Think: Lisa Frank, Nickelodeon, Scholastic book covers
- Bright yellows, teals, magentas, lime greens
- Comfortable beiges and wood tones for "shelf" areas

**Typography:**
- Chunky, rounded fonts for headers
- Comic Sans is not off the table (used earnestly)
- Pixelated fonts for game UI elements
- That specific Scholastic book fair font energy

**Texture:**
- Tiled backgrounds (subtle)
- Wood grain
- Soft gradients
- Gentle noise/grain

**Animation:**
- Animated GIFs where appropriate
- Subtle idle animations (things breathe, shift, blink)
- Satisfying interaction feedback
- Nothing smooth/modern—slightly chunky, slightly janky

### Interaction Principles

**Click, don't scroll.** The site is rooms, not a feed.

**Sound matters.** Each object has audio. Music, effects, ambient loops. A mute button exists but sound is part of the experience.

**Loading is part of it.** Fake loading bars. "Please wait" messages. The slow reveal of entering a space.

**Cursor changes.** Custom cursors. Hand on hover. Special cursors in special places.

**No instructions.** Figure it out by clicking. Tooltips are a last resort.

---

## Why People Come Back

### Daily Variance

- Not everything is visible every day
- Some objects only appear on certain days (weekends, specific dates)
- The pet needs daily attention
- Pog opponent has daily challenges

### Growth Without Announcement

- New objects appear on shelves silently
- New rooms become accessible
- Regular visitors notice; newcomers stumble into abundance
- No changelog, no "NEW!" badges—just more stuff

### Collection & Progress

- Pogs collected
- Pet evolution stage
- Secrets discovered
- Kid Pix gallery contributions
- Beanie Babies found (future feature)

### Social Discovery

- "You have to see this thing I found"
- Everyone's path through the site is different
- Deep links work—share any page directly
- Shareable outputs (drawings, Lunchables, generated images)

---

## Why People Share

### Outputs Are Sharable

- Kid Pix drawings export as images
- Lunchables builder creates downloadable image
- Future: Got Milk? generator, Blockbuster card generator, etc.

### Discoveries Are Unique

- "I found a secret room through the Magic Eye"
- "My pog collection has this rare one"
- "Look what my pet evolved into"

### The Site Itself Is Remarkable

- "This website exists and it's insane"
- The aesthetic alone is worth sharing
- Nostalgia triggers urge to tag friends

---

## Technical Architecture

### Framework: SvelteKit

**Why SvelteKit:**
- Compiles away at build time—ships ~2KB runtime vs React's 42KB
- Built-in transitions and animations perfect for nostalgic/playful UI
- File-based routing handles room navigation without page reloads
- Canvas/WebGL integration is clean (`bind:this={canvas}`, simple `onMount`/`onDestroy`)
- Each "toy" is a self-contained Svelte component
- Best-in-class DX for building many small interactive pieces

**Alternative:** Astro + Svelte islands if rooms have significant static content with interactive modules.

**Project Structure:**
```
src/
├── routes/
│   ├── +layout.svelte          # Shared room chrome, navigation
│   ├── +page.svelte            # Landing shelf (Bedroom 1997)
│   ├── secret-room/
│   │   └── +page.svelte        # Hidden room via Magic Eye
│   └── [room]/
│       └── +page.svelte        # Dynamic room routing
├── lib/
│   ├── components/
│   │   ├── Shelf.svelte        # Shelf renderer
│   │   ├── ShelfObject.svelte  # Clickable object wrapper
│   │   └── RoomTransition.svelte
│   └── toys/                   # Self-contained interactive modules
│       ├── KooshBall.svelte
│       ├── DialUpModem.svelte
│       ├── KidPix.svelte
│       ├── MagicEye.svelte
│       ├── PogGame.svelte
│       ├── LunchablesBuilder.svelte
│       └── VirtualPet.svelte
├── stores/
│   └── gameState.js            # Shared state (collections, pet, progress)
└── assets/
    ├── sounds/
    ├── sprites/
    └── textures/
```

---

### Physics Libraries

**Soft Body Physics (Koosh Ball):**
- **Primary: Ammo.js** — WebAssembly port of Bullet Physics, only mainstream JS library with true soft body support
- Configurable internal pressure, stiffness, damping
- [Three.js integration examples](https://threejs.org/examples/physics_ammo_cloth.html)
- ~1.5MB WASM bundle (load on-demand for Koosh Ball only)

```javascript
// Soft body config for squishy feel
const config = softBody.get_m_cfg();
config.set_kPR(pressure);     // Internal pressure - key for squish
config.set_kDF(0.1);          // Dynamic friction
config.set_kDP(0.01);         // Damping

const material = softBody.get_m_materials().at(0);
material.set_m_kLST(0.4);     // Linear stiffness (lower = squishier)
```

**Rigid Body Physics (Pogs):**
- **Primary: Rapier** — Rust compiled to WASM, fastest JS physics engine
- ~500KB bundle, SIMD-optimized
- Excellent for coin flip physics with realistic collision

```javascript
import RAPIER from '@dimforge/rapier3d';

// Pog/coin collider
const colliderDesc = RAPIER.ColliderDesc.cylinder(0.02, 0.15)
  .setRestitution(0.6)    // Bounce
  .setFriction(0.3)       // Surface grip
  .setDensity(7.8);       // Steel-like weight

// Slam impulse
rigidBody.applyTorqueImpulse({ x: 10, y: 2, z: 10 }, true);
```

---

### Drawing Tools (Kid Pix)

**Primary: Konva.js + perfect-freehand**

- **Konva.js** — Best performance (60 FPS vs 9 FPS for Fabric.js), native layer system, built-in undo/redo via state serialization
- **perfect-freehand** — Best-in-class pressure-sensitive stroke algorithm (used by tldraw, Excalidraw)
- 473K weekly npm downloads, actively maintained

```javascript
import { getStroke } from 'perfect-freehand';

const stroke = getStroke(points, {
  size: 16,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
});
```

**Stamp library:** Konva's native Image support for draggable stamps with sound-on-place.

**"Oh no!" undo:** Konva's `stage.toJSON()` / `stage.fromJSON()` for state snapshots.

**Export:** `stage.toDataURL()` for PNG export to gallery.

---

### Audio

**Sound Effects & Music: Howler.js**
- 7KB gzipped, zero dependencies
- Audio sprites for UI sounds (combine multiple effects into one file)
- HTML5 Audio mode for streaming longer files (dial-up sound)

```javascript
const sounds = new Howl({
  src: ['ui-sounds.webm', 'ui-sounds.mp3'],
  sprite: {
    click: [0, 500],
    stamp: [1000, 300],
    ohno: [2000, 1500],
    dialup: [4000, 30000]
  }
});

sounds.play('dialup');
```

**Chiptune Synthesis: Tone.js**
- For dynamic 8-bit sounds (pet sounds, game feedback)
- PulseOscillator for NES-style waveforms

**Retro Sound Effects: jsfxr**
- Procedural 8-bit sound generation
- Presets: `pickupCoin`, `laserShoot`, `jump`, `powerUp`
- [Online editor at sfxr.me](https://sfxr.me/)

**Visualizers: Butterchurn**
- WebGL implementation of Winamp's Milkdrop visualizer
- Thousands of community presets
- For the Winamp skin / music player object

---

### Retro Visual Effects

**CRT Scanlines:**
- **CRTFilter.js** — Dedicated WebGL library
- Barrel distortion, chromatic aberration, scanline intensity, flicker

```javascript
const crtEffect = new CRTFilterWebGL(canvas, {
  barrelDistortion: 0.001,
  chromaticAberration: 0.0005,
  scanlineIntensity: 0.6,
  flicker: 0.01
});
```

**Pixel Art Scaling:**
```css
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```
```javascript
ctx.imageSmoothingEnabled = false;
```

**Dithering: DitherJS**
- Atkinson algorithm (classic Mac style)
- Floyd-Steinberg error diffusion
- Custom color palettes (Game Boy, CGA, NES)

**Magic Eye: MagicEye.js / Stereogram.js**
- Generate autostereograms from depth maps
- TextDepthMapper for text-based hidden images

```javascript
const magicEye = new MagicEye({
  el: "stereogram-canvas",
  width: 500,
  height: 400,
  numColors: 10,
  depthMap: depthMapArray
}).render();
```

---

### Virtual Pet System

**State Machine: XState v5**
- Visual editor at [state.new](https://state.new) for designing evolution paths
- Actor model perfect for pet that receives events and changes behavior
- Guards for conditional evolution based on care quality

```javascript
import { setup, createActor, assign } from 'xstate';

const petMachine = setup({
  guards: {
    canEvolve: ({ context }) =>
      context.age >= context.evolutionAge &&
      context.careMistakes <= 3,
  },
}).createMachine({
  id: 'pet',
  initial: 'egg',
  context: {
    hunger: 5,
    happiness: 5,
    age: 0,
    careMistakes: 0,
    evolutionAge: 24,
  },
  states: {
    egg: { after: { 60000: 'baby' } },
    baby: {
      on: { EVOLVE: { target: 'child', guard: 'canEvolve' } }
    },
    child: { /* branching paths based on care */ },
    teen: { /* ... */ },
    adult: { /* ... */ },
  },
});
```

**Sprite Animation: PixiJS**
- AnimatedSprite for pixel art character animations
- Spritesheet support (export from Aseprite)
- 60 FPS rendering, handles state-based animation switching

**Offline Time Calculation:**
```javascript
// When app loads, calculate what happened while away
const elapsed = Date.now() - savedState.lastUpdate;
const ticksPassed = Math.floor(elapsed / TICK_INTERVAL);
const hungerDecay = ticksPassed * HUNGER_DECAY_RATE;
const newHunger = Math.max(0, savedState.hunger - hungerDecay);

// Care mistakes: if hunger was 0 for 10+ ticks
const ticksAtZero = Math.max(0, ticksPassed - savedState.hunger);
const careMistakes = Math.floor(ticksAtZero / 10);
```

---

### Persistent Storage

**Primary: Dexie.js (IndexedDB)**
- Clean Promise-based API over IndexedDB
- Handles complex data (pet state, evolution history, collections)
- Survives browser restarts, larger quota than localStorage

```javascript
import Dexie from 'dexie';

const db = new Dexie('BookFairDB');
db.version(1).stores({
  pets: '++id, name, stage, lastUpdate',
  collections: '++id, type, itemId, foundAt',
  gallery: '++id, imageData, createdAt',
});
```

**Quick State: localStorage**
- Last visit timestamp
- Sound preference
- Simple flags

---

### Backend (Minimal)

**Gallery Storage:** Cloudflare R2 or similar for Kid Pix image saves

**API:** SvelteKit API routes or Cloudflare Workers for:
- Gallery image upload/fetch
- Pog leaderboards
- Anonymous visitor counts

**Hosting:** Cloudflare Pages or Vercel
- Static site with edge functions
- Global CDN for assets

---

### Dependencies Summary

```json
{
  "dependencies": {
    "svelte": "^5.x",
    "@sveltejs/kit": "^2.x",
    "three": "^0.170.x",
    "konva": "^9.x",
    "perfect-freehand": "^1.x",
    "howler": "^2.x",
    "tone": "^15.x",
    "xstate": "^5.x",
    "pixi.js": "^8.x",
    "dexie": "^4.x"
  },
  "devDependencies": {
    "@dimforge/rapier3d": "^0.14.x"
  },
  "optionalDependencies": {
    "ammo.js": "latest"
  }
}
```

**Load Strategy:**
- Core (Svelte, Howler, Dexie): Always loaded (~50KB)
- Per-object (Rapier, Ammo, Konva, PixiJS): Dynamic import when object is opened
- Keeps initial load fast, loads heavy libraries on demand

---

### Content Pipeline

Each object is a self-contained Svelte component:

```
src/lib/toys/KooshBall/
├── KooshBall.svelte      # Main component
├── physics.js            # Ammo.js soft body setup
├── assets/
│   ├── koosh-texture.png
│   └── squish.mp3
└── README.md             # Object documentation
```

Standard interface:
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // All objects emit 'close' to return to shelf
  // All objects can emit 'navigate' to go somewhere
  // All objects receive 'active' prop
  export let active = false;
</script>
```

This makes it easy to add new objects without touching core code.

---

## Growth Roadmap

### Phase 1: Prove the Concept

**Build:** Bedroom shelf with 7 objects (described above)

**Goal:** Does this feel like the thing? Do people stay? Do they come back?

**Success metrics:**
- Time on site > 5 minutes average
- Return visits within 7 days > 30%
- Social shares happen organically

### Phase 2: Expand the World

**Build:**
- Second shelf (accessible through Magic Eye secret)
- 5-7 new objects
- First "world" object (enter the snow globe, explore inside)

**New objects might include:**
- Got Milk? generator
- Lisa Frank coloring tool
- Hit Clips player
- Furby that talks back
- Goosebumps choose-your-own-adventure

### Phase 3: Collecting Layer

**Build:**
- Beanie Baby hunting (hidden across the site)
- Collection page showing what you've found
- Rare objects that only appear occasionally
- Trading? (maybe)

### Phase 4: Community

**Build:**
- See other visitors' pets (anonymously)
- Shared galleries for creations
- Guestbook pages in old web style
- Webrings to external sites that share the vibe

---

## What This Is NOT

**Not a museum.** Objects aren't exhibits. They're alive. They do things.

**Not ironic.** The nostalgia is earnest. We're not making fun of this era. We loved it.

**Not a feed.** No infinite scroll. No algorithmic suggestions. You click, you choose, you discover.

**Not monetized.** No ads. No premium tier. No data harvesting. This is a gift.

**Not a game with a goal.** There's no winning. No completion. Just exploration.

---

## Open Questions

1. **Accounts vs. anonymous:** localStorage is simpler but loses progress if you clear browser. Optional accounts add friction but enable cross-device. Decision: Start anonymous, add optional accounts later.

2. **Mobile:** The shelf metaphor works on desktop. Mobile needs thought. Possibly a different but related experience? Or just "best on desktop" for now?

3. **Naming:** "The Book Fair at the End of the Internet" is a working title. Need something that captures the vibe but is shorter/more memorable.

4. **How secret are the secrets?** If a secret room exists, do we ever hint at it? Or pure discovery? Probably: no hints on site, but community will map it.

5. **Collaboration:** Is this a solo project or should others contribute objects? If others, what's the quality bar and format?

---

## The Feeling We're Chasing

You're 9 years old. You walk into the school gym and it's been transformed. Tables everywhere, covered in books. Bright colors. That new book smell. You have $10 from your mom. You can pick ANYTHING.

You wander. You pick things up. You flip through pages. Some books have holograms on the cover. Some have raised letters you can feel. You don't know what any of them are about, really. But they all feel like possibilities.

That feeling. That's what we're building.

---

## Next Steps

1. Set up project structure
2. Design the shelf (visual mockup)
3. Build the Koosh ball (prove WebGL physics)
4. Build the dial-up modem (prove audio, prove vibe)
5. Build Kid Pix (prove drawing tool, prove sharing)
6. Build remaining objects
7. Connect everything
8. Ship it
9. Tell no one
10. Let people find it

---

*Document created: 2026-01-23*
