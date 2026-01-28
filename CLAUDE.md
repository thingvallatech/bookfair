# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"The Book Fair" - A nostalgia-driven interactive web experience recreating 90s/2000s childhood memories. Users navigate a virtual shelf of retro toys/apps, each opening into immersive mini-experiences. Hidden Beanie Babies are scattered throughout as collectibles.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # TypeScript type checking
npm run check:watch  # Type checking in watch mode
```

## Tech Stack

- **Framework:** SvelteKit 2 with Svelte 5 (uses runes: `$state`, `$derived`, `$props`)
- **Build:** Vite 7
- **Language:** TypeScript (strict mode)
- **Deployment:** DigitalOcean App Platform via Node adapter
- **Key Libraries:**
  - `howler` - Audio/sound effects
  - `three` - 3D graphics (MagicEye, Winamp visualizer)
  - `p5` - Creative coding (KidPix drawing, RetroBackground)
  - `butterchurn` - Milkdrop visualizer (Winamp)
  - `nes.css` - NES-style UI components

## Architecture

### Main Components

- `src/routes/+page.svelte` - Main shelf UI with paginated grid of 13 toys, keyboard/touch navigation
- `src/routes/+layout.svelte` - Root layout with audio prompt and global sound toggle

### Toy Components (`src/lib/toys/`)

Each toy is a full-screen Svelte component with:
- `onClose` prop for returning to shelf
- Local state using Svelte 5 runes
- Optional beanie hiding spots (via `registerSpots()` and `HidingBeanie` component)

**Persistent toys** (save to localStorage): `Tamagotchi.svelte`, `FishTank.svelte`

### State Management (`src/lib/stores/`)

- `audio.ts` - Sound effects via Howler.js (lazily loaded from CDN)
- `beanies.ts` - Beanie Baby database (39 items with rarity tiers)
- `beanieHunt.ts` - Session-based discovery system with rarity-weighted random selection

### Beanie Hunt System

1. On page load, `initializeHunt()` picks 3-4 random beanies weighted by rarity
2. Each toy registers hiding spots via `registerSpots(areaId, spots[])`
3. System assigns beanies to spots (70% chance per area, 100% for shelf)
4. Discovery tracked in localStorage across sessions

### Shared Components (`src/lib/components/`)

- `HidingBeanie.svelte` - Clickable beanie with z-index layering
- `BeanieTagPopup.svelte` - Discovery notification modal
- `RetroBackground.svelte` - CRT effects with p5.js animation
- `CloseButton.svelte` - Standard close button for toys
- `LoadingState.svelte` - Loading spinner

## Conventions

### Adding a New Toy

1. Create component in `src/lib/toys/NewToy.svelte`
2. Accept `onClose: () => void` prop
3. Add to `shelfObjects` array in `+page.svelte`
4. Add conditional render block in `+page.svelte`
5. Optionally add beanie hiding spots using `registerSpots()` and `HidingBeanie`

### Sound Effects

```typescript
import { playSound } from '$lib/stores/audio';
playSound('click');  // Available: click, pop, whoosh, ding, error, success, coin, jump, hit, powerup, happy, sad, eat, draw, spray, stamp, erase, explode, slam, scatter, collect, wagon, death, victory
```

### Beanie Integration

```typescript
import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
import HidingBeanie from '$lib/components/HidingBeanie.svelte';

const spots: HidingSpot[] = [{ id: 'corner' }, { id: 'behind-item' }];
onMount(() => {
  registerSpots('toyname', spots);
  const beanies = getBeaniesForArea('toyname');
  // beanies is Map<spotId, Beanie>
});
```
