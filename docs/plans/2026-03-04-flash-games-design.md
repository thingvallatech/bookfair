# Flash Games Design

Three Flash-era games added as shelf toys: Helicopter Game, Line Rider, and Stick Brawler (Xiao Xiao style).

## Shared Technical Approach

- Pure canvas rendering, no new dependencies
- `requestAnimationFrame` game loop
- Keyboard + touch/click input
- Follow existing toy patterns (onClose prop, CloseButton, beanie spots, sounds)
- Each game gets 1 beanie hiding spot
- High scores saved to localStorage
- Quick & charming scope (~5 min play sessions)

## Game 1: Helicopter Game

**File:** `src/lib/toys/HelicopterGame.svelte`

**Mechanic:** Click/hold/tap to rise, release to fall. Procedurally generated cave walls scroll left. Hit a wall or obstacle = game over.

**Implementation:**
- Canvas fills full viewport
- Helicopter: simple pixel-art drawn via canvas (no assets)
- Particle trail behind helicopter (small dots that fade)
- Cave: two arrays (ceiling/floor heights) that scroll left, new columns generated procedurally with constrained random offsets
- Obstacles: rectangular blocks that appear in the gap after score reaches threshold
- Speed increases gradually over time
- Collision = pixel-level check against cave walls and obstacles
- Score = distance traveled (increments per frame)
- Game states: title → playing → dead → score screen
- High score persisted in localStorage

**Controls:**
- Desktop: click/hold anywhere or hold spacebar
- Mobile: tap/hold anywhere

**Sounds:** whoosh (thrust), hit (crash), coin (score milestones)

**Beanie spot:** Behind the "Play Again" button on death screen

## Game 2: Line Rider

**File:** `src/lib/toys/LineRider.svelte`

**Mechanic:** Draw lines on a canvas, then press play to watch a stick figure sled down them with physics.

**Implementation:**
- Two modes: Draw mode and Play mode
- Draw mode: click-drag creates line segments stored as arrays of {x1,y1,x2,y2}
- Toolbar: Play/Pause/Reset, Undo, Clear, Eraser toggle
- Play mode: rider (stick figure on sled, canvas-drawn) spawns at top-left
- Physics: gravity pulls rider down, line segments act as surfaces
  - Rider has position + velocity
  - On each frame: apply gravity to velocity, move position
  - Check collision with all line segments
  - On collision: project velocity onto line surface, apply friction
  - Rider slides along lines, launches off edges
- Camera follows rider with smooth lerp
- If rider falls off-screen bottom, auto-reset
- No win condition — it's a sandbox/toy

**Controls:**
- Desktop: mouse click-drag to draw, toolbar buttons
- Mobile: touch-drag to draw, toolbar buttons

**Sounds:** draw (while drawing), whoosh (rider moving fast), jump (rider airborne)

**Beanie spot:** Behind the eraser tool in the toolbar

## Game 3: Stick Brawler

**File:** `src/lib/toys/StickBrawler.svelte`

**Mechanic:** Side-scrolling beat-em-up. Move and attack to defeat waves of enemy stick figures.

**Implementation:**
- Canvas fills full viewport
- Player: stick figure (circle head + line body/limbs), centered vertically
- Movement: left/right with arrow keys or A/D
- Attacks: Z or J for punch (fast, short range), X or K for kick (slower, longer range)
- Attack animations: limbs extend outward for a few frames
- Enemies: similar stick figures that walk toward player and attack on contact
- Enemy AI: move toward player, attack when in range, slight random delay
- Player has 3 HP (shown as hearts), enemies have 1 HP
- Waves: wave 1 = 2 enemies, wave 2 = 3, etc. Enemies get faster each wave
- Hit effects: screen shake, defeated enemies ragdoll (limbs separate and fall with gravity)
- Score = total enemies defeated
- Game states: ready → fighting → wave cleared → next wave → dead → score screen
- High score persisted in localStorage

**Controls:**
- Desktop: Arrow keys/WASD to move, Z/X or J/K to attack
- Mobile: on-screen D-pad (left side) + attack buttons (right side)

**Sounds:** hit (punch/kick landing), jump (dodge), death (enemy defeated), slam (screen shake), victory (wave cleared)

**Beanie spot:** Behind a pile of defeated enemy stick figures after wave 3

## Shelf Integration

Add to `shelfObjects` array in `+page.svelte`:
```
{ id: 'helicopter', name: 'Helicopter Game', icon: '🚁', desc: 'Don\'t crash!' }
{ id: 'linerider', name: 'Line Rider', icon: '🛷', desc: 'Draw the ride' }
{ id: 'stickbrawl', name: 'Stick Brawler', icon: '🥊', desc: 'Xiao Xiao vibes' }
```

Add conditional render blocks for each in the display section.
