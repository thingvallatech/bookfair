# PokeDOOM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a first-person raycaster game inside BadOS XP where players explore a dungeon throwing Pokeballs at wild Pokemon.

**Architecture:** Custom Canvas 2D raycaster using Lode's algorithm, integrated as a new XP window content type in BadOS.svelte. Pokemon sprites loaded from PokeAPI CDN. Wall textures extracted from ArMM1998 CC0 tileset (already downloaded to `/tmp/armm_tiles/`). Game state managed locally with Svelte 5 runes.

**Tech Stack:** Canvas 2D API, TypeScript, Svelte 5, PokeAPI sprite CDN, ArMM1998 tileset (CC0)

---

### Task 1: Copy tileset assets into project and create texture extraction utility

**Files:**
- Copy: `/tmp/armm_tiles/Overworld.png` → `static/textures/overworld.png`
- Copy: `/tmp/armm_tiles/cave.png` → `static/textures/cave.png`
- Create: `src/lib/toys/pokedoom/textures.ts`

**Step 1: Copy tileset PNGs into static/textures/**

```bash
cp /tmp/armm_tiles/Overworld.png /Users/sean/Projects/fun/static/textures/overworld.png
cp /tmp/armm_tiles/cave.png /Users/sean/Projects/fun/static/textures/cave.png
```

**Step 2: Create the texture extraction module**

Create `src/lib/toys/pokedoom/textures.ts` that loads the tileset PNGs and extracts individual 16x16 tiles into ImageData objects for the raycaster.

```typescript
// src/lib/toys/pokedoom/textures.ts

export const TILE_SIZE = 16;
export const TEXTURE_SIZE = 64; // Upscaled for raycaster

export interface WallTexture {
  name: string;
  data: ImageData;
}

// Tile coordinates in each tileset (col, row) - 16x16 grid
const TILE_DEFS = {
  // From overworld.png
  stoneBrick:  { src: 'overworld', col: 5, row: 1 },
  stoneWall:   { src: 'overworld', col: 6, row: 1 },
  woodPlank:   { src: 'overworld', col: 1, row: 5 },
  grass:       { src: 'overworld', col: 0, row: 0 },
  door:        { src: 'overworld', col: 3, row: 5 },
  // From cave.png
  caveWall:    { src: 'cave', col: 1, row: 0 },
  caveDark:    { src: 'cave', col: 2, row: 0 },
} as const;

export type TextureName = keyof typeof TILE_DEFS;

/**
 * Load tileset image and extract tiles, scaling each 16x16 tile to TEXTURE_SIZE.
 */
export async function loadTextures(): Promise<Map<TextureName, ImageData>> {
  const textures = new Map<TextureName, ImageData>();

  // Load source images
  const sources: Record<string, HTMLImageElement> = {};
  const srcNames = [...new Set(Object.values(TILE_DEFS).map(d => d.src))];

  await Promise.all(srcNames.map(name => new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { sources[name] = img; resolve(); };
    img.onerror = reject;
    img.src = `/textures/${name}.png`;
  })));

  // Extract and upscale each tile
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling

  for (const [name, def] of Object.entries(TILE_DEFS)) {
    const img = sources[def.src];
    if (!img) continue;

    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.drawImage(
      img,
      def.col * TILE_SIZE, def.row * TILE_SIZE, TILE_SIZE, TILE_SIZE,
      0, 0, TEXTURE_SIZE, TEXTURE_SIZE
    );
    textures.set(name as TextureName, ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE));
  }

  return textures;
}
```

**Step 3: Verify the tile coordinates are correct**

The tile coordinates above are best-guesses from the tileset layout. After copying assets, open `static/textures/overworld.png` in a viewer to verify:
- Row 1, Col 5-6 should be stone/brick wall tiles
- Row 5, Col 1 should be wood plank
- Row 0, Col 0 should be grass

Adjust coordinates in the `TILE_DEFS` if they don't match. The overworld tileset is arranged in a grid of 16x16 tiles. Open the image, count tiles from top-left (0,0).

**Step 4: Commit**

```bash
git add static/textures/ src/lib/toys/pokedoom/
git commit -m "feat(pokedoom): add tileset assets and texture extraction utility"
```

---

### Task 2: Build the raycaster engine core

**Files:**
- Create: `src/lib/toys/pokedoom/raycaster.ts`

This is the heart of the game — a textured raycaster based on Lode's algorithm.

**Step 1: Create the raycaster module**

```typescript
// src/lib/toys/pokedoom/raycaster.ts

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  pos: Vec2;
  dir: Vec2;
  plane: Vec2; // Camera plane (FOV)
}

export interface Sprite {
  id: string;
  pos: Vec2;
  textureId: string; // Pokemon sprite identifier
  active: boolean;
}

export interface RaycastConfig {
  width: number;
  height: number;
}

/**
 * Core raycasting engine.
 * Renders textured walls and sprites onto a canvas.
 */
export class Raycaster {
  private config: RaycastConfig;
  private zBuffer: Float64Array; // Per-column depth for sprite sorting

  constructor(config: RaycastConfig) {
    this.config = config;
    this.zBuffer = new Float64Array(config.width);
  }

  resize(width: number, height: number) {
    this.config.width = width;
    this.config.height = height;
    this.zBuffer = new Float64Array(width);
  }

  /**
   * Render walls using DDA raycasting with textured columns.
   * Writes directly to the provided ImageData buffer.
   */
  renderWalls(
    buf: ImageData,
    player: Player,
    map: number[][],
    textures: Map<number, ImageData>
  ): void {
    const { width, height } = this.config;
    const data = buf.data;

    // Clear buffer — dark floor, darker ceiling
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (y < height / 2) {
          // Ceiling — dark gray
          data[idx] = 40;
          data[idx + 1] = 40;
          data[idx + 2] = 50;
        } else {
          // Floor — gradient from dark to slightly lighter
          const floorShade = 30 + ((y - height / 2) / (height / 2)) * 30;
          data[idx] = floorShade;
          data[idx + 1] = floorShade + 5;
          data[idx + 2] = floorShade;
        }
        data[idx + 3] = 255;
      }
    }

    // Cast one ray per screen column
    for (let x = 0; x < width; x++) {
      const cameraX = (2 * x) / width - 1; // -1 to +1
      const rayDirX = player.dir.x + player.plane.x * cameraX;
      const rayDirY = player.dir.y + player.plane.y * cameraX;

      // Current map cell
      let mapX = Math.floor(player.pos.x);
      let mapY = Math.floor(player.pos.y);

      // Delta distances
      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(1 / rayDirY);

      let stepX: number, stepY: number;
      let sideDistX: number, sideDistY: number;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.pos.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1 - player.pos.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.pos.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1 - player.pos.y) * deltaDistY;
      }

      // DDA step
      let hit = false;
      let side = 0; // 0 = X side, 1 = Y side
      while (!hit) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[0].length) {
          if (map[mapY][mapX] > 0) hit = true;
        } else {
          hit = true; // Out of bounds
        }
      }

      // Perpendicular distance (avoid fisheye)
      const perpWallDist = side === 0
        ? (mapX - player.pos.x + (1 - stepX) / 2) / rayDirX
        : (mapY - player.pos.y + (1 - stepY) / 2) / rayDirY;

      this.zBuffer[x] = perpWallDist;

      // Wall strip height
      const lineHeight = Math.floor(height / perpWallDist);
      let drawStart = Math.max(0, Math.floor(-lineHeight / 2 + height / 2));
      let drawEnd = Math.min(height - 1, Math.floor(lineHeight / 2 + height / 2));

      // Texture mapping
      const wallType = (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[0].length)
        ? map[mapY][mapX] : 1;
      const tex = textures.get(wallType);

      // Where exactly the wall was hit (0-1)
      let wallX: number;
      if (side === 0) {
        wallX = player.pos.y + perpWallDist * rayDirY;
      } else {
        wallX = player.pos.x + perpWallDist * rayDirX;
      }
      wallX -= Math.floor(wallX);

      if (tex) {
        const texWidth = tex.width;
        const texHeight = tex.height;
        let texX = Math.floor(wallX * texWidth);
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
          texX = texWidth - texX - 1;
        }

        const step = texHeight / lineHeight;
        let texPos = (drawStart - height / 2 + lineHeight / 2) * step;

        for (let y = drawStart; y <= drawEnd; y++) {
          const texY = Math.floor(texPos) & (texHeight - 1);
          texPos += step;
          const texIdx = (texY * texWidth + texX) * 4;
          const bufIdx = (y * width + x) * 4;

          let r = tex.data[texIdx];
          let g = tex.data[texIdx + 1];
          let b = tex.data[texIdx + 2];

          // Darken Y-side walls for depth effect
          if (side === 1) {
            r = (r >> 1);
            g = (g >> 1);
            b = (b >> 1);
          }

          // Distance fog
          const fog = Math.min(1, perpWallDist / 12);
          r = Math.floor(r * (1 - fog) + 20 * fog);
          g = Math.floor(g * (1 - fog) + 20 * fog);
          b = Math.floor(b * (1 - fog) + 25 * fog);

          data[bufIdx] = r;
          data[bufIdx + 1] = g;
          data[bufIdx + 2] = b;
        }
      }
    }
  }

  /**
   * Render billboard sprites (Pokemon) sorted by distance.
   */
  renderSprites(
    buf: ImageData,
    player: Player,
    sprites: Sprite[],
    spriteTextures: Map<string, HTMLImageElement>
  ): void {
    const { width, height } = this.config;
    const data = buf.data;

    // Sort by distance (far to near)
    const sorted = sprites
      .filter(s => s.active)
      .map(s => ({
        ...s,
        dist: (player.pos.x - s.pos.x) ** 2 + (player.pos.y - s.pos.y) ** 2
      }))
      .sort((a, b) => b.dist - a.dist);

    // Temp canvas for reading sprite pixel data
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d')!;

    for (const sprite of sorted) {
      const tex = spriteTextures.get(sprite.textureId);
      if (!tex) continue;

      // Translate position relative to camera
      const spriteX = sprite.pos.x - player.pos.x;
      const spriteY = sprite.pos.y - player.pos.y;

      // Inverse camera matrix
      const invDet = 1 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);
      const transformX = invDet * (player.dir.y * spriteX - player.dir.x * spriteY);
      const transformY = invDet * (-player.plane.y * spriteX + player.plane.x * spriteY);

      if (transformY <= 0.1) continue; // Behind camera

      const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));
      const spriteHeight = Math.abs(Math.floor(height / transformY));
      const spriteWidth = spriteHeight; // Square sprites

      const drawStartY = Math.max(0, Math.floor(-spriteHeight / 2 + height / 2));
      const drawEndY = Math.min(height - 1, Math.floor(spriteHeight / 2 + height / 2));
      const drawStartX = Math.max(0, Math.floor(-spriteWidth / 2 + spriteScreenX));
      const drawEndX = Math.min(width - 1, Math.floor(spriteWidth / 2 + spriteScreenX));

      // Read sprite pixels
      const texSize = Math.max(tex.width, tex.height);
      tmpCanvas.width = texSize;
      tmpCanvas.height = texSize;
      tmpCtx.clearRect(0, 0, texSize, texSize);
      tmpCtx.drawImage(tex, 0, 0);
      const texData = tmpCtx.getImageData(0, 0, texSize, texSize);

      for (let x = drawStartX; x <= drawEndX; x++) {
        const texX = Math.floor(((x - (-spriteWidth / 2 + spriteScreenX)) * texSize) / spriteWidth);

        // Only draw if in front of wall
        if (transformY < this.zBuffer[x]) {
          for (let y = drawStartY; y <= drawEndY; y++) {
            const texY = Math.floor(((y - (-spriteHeight / 2 + height / 2)) * texSize) / spriteHeight);
            const texIdx = (texY * texSize + texX) * 4;
            const alpha = texData.data[texIdx + 3];

            if (alpha > 128) { // Only draw non-transparent pixels
              const bufIdx = (y * width + x) * 4;

              // Distance fog on sprites too
              const dist = Math.sqrt(sprite.dist);
              const fog = Math.min(0.7, dist / 12);

              data[bufIdx] = Math.floor(texData.data[texIdx] * (1 - fog) + 20 * fog);
              data[bufIdx + 1] = Math.floor(texData.data[texIdx + 1] * (1 - fog) + 20 * fog);
              data[bufIdx + 2] = Math.floor(texData.data[texIdx + 2] * (1 - fog) + 25 * fog);
              data[bufIdx + 3] = 255;
            }
          }
        }
      }
    }
  }

  getZBuffer(): Float64Array {
    return this.zBuffer;
  }
}
```

**Step 2: Verify the module compiles**

```bash
cd /Users/sean/Projects/fun && npx svelte-check --threshold warning 2>&1 | grep -E "pokedoom|Error"
```

**Step 3: Commit**

```bash
git add src/lib/toys/pokedoom/raycaster.ts
git commit -m "feat(pokedoom): add raycaster engine with textured walls and sprite rendering"
```

---

### Task 3: Build the game map and Pokemon data

**Files:**
- Create: `src/lib/toys/pokedoom/map.ts`
- Create: `src/lib/toys/pokedoom/pokemon.ts`

**Step 1: Create the dungeon map**

```typescript
// src/lib/toys/pokedoom/map.ts

// Map legend:
// 0 = open space
// 1 = stone brick wall
// 2 = cave wall
// 3 = wood plank wall
// 4 = door/special wall

// 32x32 dungeon with rooms and corridors
export const DUNGEON_MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1],
  [1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,0,1,1,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,2,2,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Player start position (in the entry room, top-left area)
export const PLAYER_START = { x: 2.5, y: 2.5 };
export const PLAYER_START_DIR = { x: 1, y: 0 };
export const PLAYER_START_PLANE = { x: 0, y: 0.66 };

// Spawn points for Pokemon (map coordinates)
export interface SpawnPoint {
  x: number;
  y: number;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const SPAWN_POINTS: SpawnPoint[] = [
  // Entry room area (commons)
  { x: 4.5, y: 3.5, tier: 'common' },
  { x: 1.5, y: 9.5, tier: 'common' },
  // Corridors (commons)
  { x: 9.5, y: 5.5, tier: 'common' },
  { x: 3.5, y: 21.5, tier: 'common' },
  { x: 10.5, y: 11.5, tier: 'common' },
  // Mid rooms (uncommons)
  { x: 6.5, y: 17.5, tier: 'uncommon' },
  { x: 22.5, y: 6.5, tier: 'uncommon' },
  { x: 16.5, y: 15.5, tier: 'uncommon' },
  { x: 23.5, y: 21.5, tier: 'uncommon' },
  { x: 28.5, y: 12.5, tier: 'uncommon' },
  // Deep rooms (rares)
  { x: 14.5, y: 27.5, tier: 'rare' },
  { x: 6.5, y: 25.5, tier: 'rare' },
  { x: 28.5, y: 3.5, tier: 'rare' },
  // Deepest room (legendary)
  { x: 29.5, y: 29.5, tier: 'legendary' },
];
```

**Step 2: Create the Pokemon data module**

```typescript
// src/lib/toys/pokedoom/pokemon.ts

export interface PokemonDef {
  id: number;       // PokeAPI national dex number
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  catchRate: number; // 0-1 probability per throw
}

export const POKEMON: PokemonDef[] = [
  // Common (high catch rate)
  { id: 16,  name: 'Pidgey',    tier: 'common',    catchRate: 0.8 },
  { id: 19,  name: 'Rattata',   tier: 'common',    catchRate: 0.8 },
  { id: 41,  name: 'Zubat',     tier: 'common',    catchRate: 0.75 },
  { id: 10,  name: 'Caterpie',  tier: 'common',    catchRate: 0.85 },
  { id: 13,  name: 'Weedle',    tier: 'common',    catchRate: 0.85 },

  // Uncommon
  { id: 25,  name: 'Pikachu',    tier: 'uncommon',  catchRate: 0.5 },
  { id: 1,   name: 'Bulbasaur',  tier: 'uncommon',  catchRate: 0.45 },
  { id: 4,   name: 'Charmander', tier: 'uncommon',  catchRate: 0.45 },
  { id: 7,   name: 'Squirtle',   tier: 'uncommon',  catchRate: 0.45 },
  { id: 39,  name: 'Jigglypuff', tier: 'uncommon',  catchRate: 0.5 },

  // Rare (low catch rate)
  { id: 143, name: 'Snorlax',   tier: 'rare',      catchRate: 0.2 },
  { id: 94,  name: 'Gengar',    tier: 'rare',      catchRate: 0.15 },
  { id: 149, name: 'Dragonite', tier: 'rare',      catchRate: 0.1 },

  // Legendary (very low)
  { id: 150, name: 'Mewtwo',    tier: 'legendary',  catchRate: 0.05 },
];

/**
 * Get sprite URL for a Pokemon from PokeAPI CDN.
 * Uses the 96x96 pixel art sprites (retro-fitting).
 */
export function getSpriteUrl(pokeId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;
}

/**
 * Assign random Pokemon to spawn points.
 * Each tier spawns from its matching pool.
 */
export function assignPokemon(spawnPoints: { tier: string }[]): PokemonDef[] {
  const pools: Record<string, PokemonDef[]> = {
    common: POKEMON.filter(p => p.tier === 'common'),
    uncommon: POKEMON.filter(p => p.tier === 'uncommon'),
    rare: POKEMON.filter(p => p.tier === 'rare'),
    legendary: POKEMON.filter(p => p.tier === 'legendary'),
  };

  return spawnPoints.map(sp => {
    const pool = pools[sp.tier] || pools.common;
    return pool[Math.floor(Math.random() * pool.length)];
  });
}

/**
 * Preload all Pokemon sprite images.
 * Returns a map of "pokemon-{id}" → HTMLImageElement.
 */
export async function preloadSprites(): Promise<Map<string, HTMLImageElement>> {
  const sprites = new Map<string, HTMLImageElement>();
  const uniqueIds = [...new Set(POKEMON.map(p => p.id))];

  await Promise.all(uniqueIds.map(id => new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { sprites.set(`pokemon-${id}`, img); resolve(); };
    img.onerror = () => resolve(); // Skip failed loads
    img.src = getSpriteUrl(id);
  })));

  return sprites;
}
```

**Step 3: Commit**

```bash
git add src/lib/toys/pokedoom/map.ts src/lib/toys/pokedoom/pokemon.ts
git commit -m "feat(pokedoom): add dungeon map layout and Pokemon data with sprite loading"
```

---

### Task 4: Build the game state manager

**Files:**
- Create: `src/lib/toys/pokedoom/game.ts`

This module ties together the raycaster, map, and Pokemon into a playable game loop.

**Step 1: Create the game state manager**

```typescript
// src/lib/toys/pokedoom/game.ts

import { Raycaster, type Player, type Sprite, type Vec2 } from './raycaster';
import { DUNGEON_MAP, PLAYER_START, PLAYER_START_DIR, PLAYER_START_PLANE, SPAWN_POINTS } from './map';
import { assignPokemon, preloadSprites, type PokemonDef } from './pokemon';
import { loadTextures, type TextureName } from './textures';

export type GamePhase = 'loading' | 'title' | 'playing' | 'catching' | 'result';

export interface CatchAttempt {
  pokemonDef: PokemonDef;
  spriteId: string;
  wobbles: number; // 1-3
  caught: boolean;
  timer: number;   // Countdown frames
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  sprites: Sprite[];
  pokemonAssignments: PokemonDef[]; // Parallel to sprites
  pokeballs: number;
  caught: PokemonDef[];
  totalPokemon: number;
  catchAttempt: CatchAttempt | null;
  badosInterrupt: string | null; // Error message to show
  interruptTimer: number;
}

const MOVE_SPEED = 0.06;
const ROT_SPEED = 0.04;
const MAX_POKEBALLS = 20;
const CATCH_RANGE = 3.0; // Max distance to throw a ball
const BADOS_INTERRUPT_CHANCE = 0.002; // Per frame chance (~every 8 seconds avg)

const BADOS_MESSAGES = [
  'Error: Pokemon.dll not found. Continuing anyway.',
  'Warning: Your Pokeballs may contain nuts.',
  'Critical: Game is having too much fun. Throttling.',
  'Error: Pokemon refused to load. Said it was "on break".',
  'Warning: Rendering at maximum potato quality.',
  'Fatal: Fun.exe has stopped working.',
];

export class Game {
  state: GameState;
  raycaster: Raycaster;
  private wallTextures: Map<number, ImageData> = new Map();
  private spriteTextures: Map<string, HTMLImageElement> = new Map();
  private keys: Set<string> = new Set();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private buf: ImageData | null = null;
  private animFrame: number | null = null;
  private onStateChange: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.raycaster = new Raycaster({ width, height });
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'loading',
      player: {
        pos: { ...PLAYER_START },
        dir: { ...PLAYER_START_DIR },
        plane: { ...PLAYER_START_PLANE },
      },
      sprites: [],
      pokemonAssignments: [],
      pokeballs: MAX_POKEBALLS,
      caught: [],
      totalPokemon: SPAWN_POINTS.length,
      catchAttempt: null,
      badosInterrupt: null,
      interruptTimer: 0,
    };
  }

  setStateChangeCallback(cb: () => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    this.onStateChange?.();
  }

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.buf = this.ctx.createImageData(canvas.width, canvas.height);

    // Load textures
    const texMap = await loadTextures();
    // Map texture names to wall type numbers
    const nameToWallType: Record<string, number> = {
      stoneBrick: 1,
      caveWall: 2,
      woodPlank: 3,
      door: 4,
    };
    for (const [name, data] of texMap.entries()) {
      const wallType = nameToWallType[name];
      if (wallType !== undefined) {
        this.wallTextures.set(wallType, data);
      }
    }

    // Load Pokemon sprites
    this.spriteTextures = await preloadSprites();

    // Assign Pokemon to spawn points
    const assignments = assignPokemon(SPAWN_POINTS);
    this.state.pokemonAssignments = assignments;
    this.state.sprites = SPAWN_POINTS.map((sp, i) => ({
      id: `pokemon-${i}`,
      pos: { x: sp.x, y: sp.y },
      textureId: `pokemon-${assignments[i].id}`,
      active: true,
    }));

    this.state.phase = 'title';
    this.notifyChange();
  }

  startGame() {
    this.state.phase = 'playing';
    this.notifyChange();
    this.startLoop();
  }

  restart() {
    this.stopLoop();
    const newState = this.createInitialState();
    const assignments = assignPokemon(SPAWN_POINTS);
    newState.pokemonAssignments = assignments;
    newState.sprites = SPAWN_POINTS.map((sp, i) => ({
      id: `pokemon-${i}`,
      pos: { x: sp.x, y: sp.y },
      textureId: `pokemon-${assignments[i].id}`,
      active: true,
    }));
    newState.phase = 'playing';
    this.state = newState;
    this.notifyChange();
    this.startLoop();
  }

  private startLoop() {
    const loop = () => {
      this.update();
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  private update() {
    if (this.state.phase !== 'playing' && this.state.phase !== 'catching') return;

    // Handle catch animation
    if (this.state.phase === 'catching' && this.state.catchAttempt) {
      this.state.catchAttempt.timer--;
      if (this.state.catchAttempt.timer <= 0) {
        this.finishCatch();
      }
      return; // No movement during catch
    }

    // Movement
    const { player } = this.state;
    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.tryMove(player.dir.x * MOVE_SPEED, player.dir.y * MOVE_SPEED);
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.tryMove(-player.dir.x * MOVE_SPEED, -player.dir.y * MOVE_SPEED);
    }
    if (this.keys.has('a')) {
      this.tryMove(player.dir.y * MOVE_SPEED, -player.dir.x * MOVE_SPEED);
    }
    if (this.keys.has('d')) {
      this.tryMove(-player.dir.y * MOVE_SPEED, player.dir.x * MOVE_SPEED);
    }

    // Rotation
    if (this.keys.has('arrowleft') || this.keys.has('q')) {
      this.rotate(ROT_SPEED);
    }
    if (this.keys.has('arrowright') || this.keys.has('e')) {
      this.rotate(-ROT_SPEED);
    }

    // BadOS interrupts
    if (!this.state.badosInterrupt && Math.random() < BADOS_INTERRUPT_CHANCE) {
      this.state.badosInterrupt = BADOS_MESSAGES[Math.floor(Math.random() * BADOS_MESSAGES.length)];
      this.state.interruptTimer = 180; // 3 seconds at 60fps
      this.notifyChange();
    }
    if (this.state.interruptTimer > 0) {
      this.state.interruptTimer--;
      if (this.state.interruptTimer <= 0) {
        this.state.badosInterrupt = null;
        this.notifyChange();
      }
    }
  }

  private tryMove(dx: number, dy: number) {
    const { player } = this.state;
    const newX = player.pos.x + dx;
    const newY = player.pos.y + dy;
    const margin = 0.2;

    // Collision with walls (with sliding)
    if (DUNGEON_MAP[Math.floor(player.pos.y)][Math.floor(newX + margin * Math.sign(dx))] === 0) {
      player.pos.x = newX;
    }
    if (DUNGEON_MAP[Math.floor(newY + margin * Math.sign(dy))][Math.floor(player.pos.x)] === 0) {
      player.pos.y = newY;
    }
  }

  private rotate(angle: number) {
    const { dir, plane } = this.state.player;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const oldDirX = dir.x;
    dir.x = dir.x * cos - dir.y * sin;
    dir.y = oldDirX * sin + dir.y * cos;

    const oldPlaneX = plane.x;
    plane.x = plane.x * cos - plane.y * sin;
    plane.y = oldPlaneX * sin + plane.y * cos;
  }

  throwBall(): boolean {
    if (this.state.phase !== 'playing') return false;
    if (this.state.pokeballs <= 0) return false;

    this.state.pokeballs--;

    // Find nearest active Pokemon in front of player
    let nearest: { sprite: Sprite; def: PokemonDef; dist: number; idx: number } | null = null;
    const { player } = this.state;

    for (let i = 0; i < this.state.sprites.length; i++) {
      const s = this.state.sprites[i];
      if (!s.active) continue;

      const dx = s.pos.x - player.pos.x;
      const dy = s.pos.y - player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > CATCH_RANGE) continue;

      // Check if roughly in front of player (dot product)
      const dot = dx * player.dir.x + dy * player.dir.y;
      if (dot <= 0) continue;

      // Check if within view cone
      const angle = Math.atan2(dy, dx) - Math.atan2(player.dir.y, player.dir.x);
      const normalizedAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (Math.abs(normalizedAngle) > Math.PI / 4) continue; // ~45 degree cone

      if (!nearest || dist < nearest.dist) {
        nearest = { sprite: s, def: this.state.pokemonAssignments[i], dist, idx: i };
      }
    }

    if (!nearest) {
      // Missed — no Pokemon in range/view
      this.notifyChange();
      this.checkGameEnd();
      return false;
    }

    // Start catch attempt
    const wobbles = 1 + Math.floor(Math.random() * 3);
    const caught = Math.random() < nearest.def.catchRate;

    this.state.catchAttempt = {
      pokemonDef: nearest.def,
      spriteId: nearest.sprite.id,
      wobbles,
      caught,
      timer: wobbles * 30 + 30, // ~0.5s per wobble + result
    };
    this.state.phase = 'catching';
    this.notifyChange();
    return true;
  }

  private finishCatch() {
    const attempt = this.state.catchAttempt;
    if (!attempt) return;

    if (attempt.caught) {
      // Remove Pokemon from map
      const sprite = this.state.sprites.find(s => s.id === attempt.spriteId);
      if (sprite) sprite.active = false;
      this.state.caught.push(attempt.pokemonDef);
    } else {
      // Pokemon flees — move to new random open position
      const sprite = this.state.sprites.find(s => s.id === attempt.spriteId);
      if (sprite) {
        const newPos = this.findRandomOpenPos();
        if (newPos) {
          sprite.pos = newPos;
        }
      }
    }

    this.state.catchAttempt = null;
    this.state.phase = 'playing';
    this.notifyChange();
    this.checkGameEnd();
  }

  private findRandomOpenPos(): Vec2 | null {
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = 1 + Math.random() * 30;
      const y = 1 + Math.random() * 30;
      if (DUNGEON_MAP[Math.floor(y)]?.[Math.floor(x)] === 0) {
        // Not too close to player
        const dx = x - this.state.player.pos.x;
        const dy = y - this.state.player.pos.y;
        if (dx * dx + dy * dy > 9) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private checkGameEnd() {
    const activeCount = this.state.sprites.filter(s => s.active).length;
    if (activeCount === 0 || this.state.pokeballs <= 0) {
      this.state.phase = 'result';
      this.stopLoop();
      this.notifyChange();
    }
  }

  dismissInterrupt() {
    this.state.badosInterrupt = null;
    this.state.interruptTimer = 0;
    this.notifyChange();
  }

  private render() {
    if (!this.ctx || !this.buf || !this.canvas) return;

    this.raycaster.renderWalls(this.buf, this.state.player, DUNGEON_MAP, this.wallTextures);
    this.raycaster.renderSprites(this.buf, this.state.player, this.state.sprites, this.spriteTextures);
    this.ctx.putImageData(this.buf, 0, 0);
  }

  // Input handling
  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());

    if (key === ' ' || key === 'Space') {
      if (this.state.phase === 'title') {
        this.startGame();
      } else if (this.state.phase === 'playing') {
        this.throwBall();
      }
    }

    if (key === 'Escape' && this.state.badosInterrupt) {
      this.dismissInterrupt();
    }
  }

  handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
  }

  resize(width: number, height: number) {
    this.raycaster.resize(width, height);
    if (this.ctx && this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.buf = this.ctx.createImageData(width, height);
    }
  }

  destroy() {
    this.stopLoop();
    this.keys.clear();
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/toys/pokedoom/game.ts
git commit -m "feat(pokedoom): add game state manager with movement, catching, and BadOS interrupts"
```

---

### Task 5: Build the PokeDOOM Svelte component

**Files:**
- Create: `src/lib/toys/pokedoom/PokeDoom.svelte`

This is the Svelte component that wraps the game canvas and provides the UI overlay (HUD, title screen, result screen, catch animation, BadOS interrupts).

**Step 1: Create the PokeDOOM component**

```svelte
<!-- src/lib/toys/pokedoom/PokeDoom.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Game, type GamePhase } from './game';
  import { playSound } from '$lib/stores/audio';

  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 320;

  let canvas: HTMLCanvasElement;
  let game: Game;
  let phase = $state<GamePhase>('loading');
  let pokeballs = $state(20);
  let caughtCount = $state(0);
  let totalPokemon = $state(14);
  let caughtList = $state<{ name: string; id: number }[]>([]);
  let catchAnimState = $state<'wobble' | 'caught' | 'fled' | null>(null);
  let catchPokemonName = $state('');
  let badosMessage = $state<string | null>(null);
  let loadingProgress = $state(0);

  function syncState() {
    if (!game) return;
    const s = game.state;
    phase = s.phase;
    pokeballs = s.pokeballs;
    caughtCount = s.caught.length;
    totalPokemon = s.totalPokemon;
    caughtList = s.caught.map(p => ({ name: p.name, id: p.id }));
    badosMessage = s.badosInterrupt;

    if (s.catchAttempt) {
      catchPokemonName = s.catchAttempt.pokemonDef.name;
      catchAnimState = s.catchAttempt.timer > 30 ? 'wobble' : (s.catchAttempt.caught ? 'caught' : 'fled');
    } else {
      catchAnimState = null;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!game) return;
    // Prevent default for game keys to avoid scrolling
    if (['w', 'a', 's', 'd', 'q', 'e', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
    game.handleKeyDown(e.key);

    if (e.key === ' ') {
      if (phase === 'playing') {
        playSound('whoosh');
      } else if (phase === 'title') {
        playSound('powerup');
      }
    }
    if (e.key === 'Escape' && badosMessage) {
      playSound('click');
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (!game) return;
    game.handleKeyUp(e.key);
  }

  function handleRestart() {
    if (!game) return;
    game.restart();
    playSound('powerup');
  }

  onMount(async () => {
    game = new Game(GAME_WIDTH, GAME_HEIGHT);
    game.setStateChangeCallback(syncState);

    // Fake loading bar
    const loadInterval = setInterval(() => {
      loadingProgress = Math.min(90, loadingProgress + 2);
    }, 50);

    await game.init(canvas);

    clearInterval(loadInterval);
    loadingProgress = 100;
    syncState();

    // Sound effects for catch results
    const origFinish = (game as any).finishCatch.bind(game);
    // We'll handle sounds in syncState via phase changes instead
  });

  onDestroy(() => {
    game?.destroy();
  });

  // Play sounds on catch result
  $effect(() => {
    if (catchAnimState === 'caught') {
      playSound('success');
      playSound('coin');
    } else if (catchAnimState === 'fled') {
      playSound('error');
    }
  });
</script>

<div class="pokedoom-container" role="application" aria-label="PokeDOOM Game">
  <canvas
    bind:this={canvas}
    width={GAME_WIDTH}
    height={GAME_HEIGHT}
    class="pokedoom-canvas"
  ></canvas>

  <!-- Title Screen Overlay -->
  {#if phase === 'title'}
    <div class="pokedoom-overlay title-screen">
      <div class="title-logo">
        <span class="title-poke">Poké</span><span class="title-doom">DOOM</span>
      </div>
      <div class="title-subtitle">Gotta Catch 'Em All... in a dungeon</div>
      <div class="title-prompt">Press SPACE to start</div>
      <div class="title-controls">
        WASD / Arrows = Move &nbsp; Q/E = Turn &nbsp; SPACE = Throw Ball
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if phase === 'loading'}
    <div class="pokedoom-overlay loading-screen">
      <div class="loading-text">Loading PokeDOOM.exe...</div>
      <div class="loading-bar-track">
        <div class="loading-bar-fill" style="width: {loadingProgress}%"></div>
      </div>
      <div class="loading-tip">Tip: Don't waste Pokeballs on distant targets</div>
    </div>
  {/if}

  <!-- HUD -->
  {#if phase === 'playing' || phase === 'catching'}
    <div class="pokedoom-hud">
      <div class="hud-left">
        <div class="hud-pokeballs">
          <span class="hud-ball-icon">●</span>
          <span class="hud-ball-count">{pokeballs}</span>
        </div>
      </div>
      <div class="hud-center">
        {#if phase === 'playing'}
          <div class="crosshair">+</div>
        {/if}
      </div>
      <div class="hud-right">
        <div class="hud-caught">
          Caught: {caughtCount}/{totalPokemon}
        </div>
      </div>
    </div>

    <!-- Caught Pokemon strip at bottom -->
    {#if caughtList.length > 0}
      <div class="hud-caught-strip">
        {#each caughtList as pokemon}
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokemon.id}.png"
            alt={pokemon.name}
            class="hud-caught-sprite"
            width="32"
            height="32"
          />
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Catch Animation Overlay -->
  {#if catchAnimState}
    <div class="catch-overlay">
      {#if catchAnimState === 'wobble'}
        <div class="catch-ball wobbling">●</div>
        <div class="catch-text">...</div>
      {:else if catchAnimState === 'caught'}
        <div class="catch-ball caught-ball">●</div>
        <div class="catch-text caught-text">Caught {catchPokemonName}!</div>
      {:else}
        <div class="catch-text fled-text">{catchPokemonName} broke free!</div>
      {/if}
    </div>
  {/if}

  <!-- BadOS Interrupt -->
  {#if badosMessage}
    <div class="bados-interrupt">
      <div class="bados-interrupt-titlebar">
        <span>PokeDOOM Error</span>
        <button onclick={() => game?.dismissInterrupt()} class="bados-interrupt-close">×</button>
      </div>
      <div class="bados-interrupt-body">
        <span class="bados-interrupt-icon">⚠️</span>
        <span>{badosMessage}</span>
      </div>
      <div class="bados-interrupt-footer">
        <button onclick={() => { game?.dismissInterrupt(); playSound('click'); }}>OK</button>
      </div>
    </div>
  {/if}

  <!-- Result Screen -->
  {#if phase === 'result'}
    <div class="pokedoom-overlay result-screen">
      <div class="result-title">
        {caughtCount === totalPokemon ? 'You caught them all!' : 'Game Over'}
      </div>
      <div class="result-stats">
        Caught: {caughtCount} / {totalPokemon}
      </div>
      <div class="result-pokemon-grid">
        {#each caughtList as pokemon}
          <div class="result-pokemon">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokemon.id}.png"
              alt={pokemon.name}
              width="48"
              height="48"
            />
            <span class="result-pokemon-name">{pokemon.name}</span>
          </div>
        {/each}
      </div>
      <button class="result-restart" onclick={handleRestart}>Play Again</button>
    </div>
  {/if}
</div>

<!-- Keyboard capture: only when this component is mounted -->
<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<style>
  .pokedoom-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .pokedoom-canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Overlays */
  .pokedoom-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  /* Title screen */
  .title-screen {
    background: rgba(0, 0, 0, 0.85);
  }
  .title-logo {
    font-size: 48px;
    font-weight: 900;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 20px rgba(255, 0, 0, 0.5), 0 4px 0 #300;
  }
  .title-poke { color: #ffcb05; }
  .title-doom { color: #cc0000; }
  .title-subtitle {
    color: #aaa;
    font-size: 14px;
    margin-top: 8px;
    font-family: 'Courier New', monospace;
  }
  .title-prompt {
    color: #fff;
    font-size: 18px;
    margin-top: 32px;
    animation: blink 1s ease-in-out infinite;
    font-family: 'Courier New', monospace;
  }
  .title-controls {
    color: #666;
    font-size: 11px;
    margin-top: 16px;
    font-family: 'Courier New', monospace;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Loading */
  .loading-screen {
    background: #000;
  }
  .loading-text {
    color: #0f0;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    margin-bottom: 16px;
  }
  .loading-bar-track {
    width: 200px;
    height: 12px;
    border: 1px solid #0f0;
    background: #001100;
  }
  .loading-bar-fill {
    height: 100%;
    background: #0f0;
    transition: width 0.1s;
  }
  .loading-tip {
    color: #060;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    margin-top: 16px;
  }

  /* HUD */
  .pokedoom-hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }
  .hud-left, .hud-right {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hud-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }
  .crosshair {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.6);
    text-shadow: none;
  }
  .hud-pokeballs {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .hud-ball-icon {
    color: #ff3333;
    font-size: 18px;
  }
  .hud-ball-count {
    font-size: 16px;
    font-weight: bold;
  }
  .hud-caught-strip {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    z-index: 5;
    background: rgba(0, 0, 0, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .hud-caught-sprite {
    image-rendering: pixelated;
    opacity: 0.9;
  }

  /* Catch animation */
  .catch-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 8;
    pointer-events: none;
  }
  .catch-ball {
    font-size: 32px;
    color: #ff3333;
  }
  .wobbling {
    animation: wobble 0.4s ease-in-out infinite;
  }
  .caught-ball {
    animation: shrink 0.3s ease-out forwards;
  }
  .catch-text {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    color: #fff;
    text-shadow: 1px 1px 2px #000;
    margin-top: 8px;
  }
  .caught-text { color: #4caf50; }
  .fled-text { color: #f44336; }

  @keyframes wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
  }
  @keyframes shrink {
    to { transform: scale(0); opacity: 0; }
  }

  /* BadOS interrupt */
  .bados-interrupt {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 15;
    background: #ece9d8;
    border: 2px solid #0054e3;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
    min-width: 280px;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    font-size: 12px;
  }
  .bados-interrupt-titlebar {
    background: linear-gradient(180deg, #0058e6 0%, #3a8cf4 30%, #0058e6 100%);
    color: white;
    padding: 3px 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: bold;
  }
  .bados-interrupt-close {
    background: #c83232;
    color: white;
    border: 1px solid #fff;
    border-radius: 3px;
    width: 18px;
    height: 18px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }
  .bados-interrupt-body {
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .bados-interrupt-icon {
    font-size: 24px;
  }
  .bados-interrupt-footer {
    padding: 8px 16px 12px;
    text-align: center;
  }
  .bados-interrupt-footer button {
    background: #ece9d8;
    border: 1px solid #003c74;
    padding: 3px 20px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
  }
  .bados-interrupt-footer button:hover {
    background: #d4d0c8;
  }

  /* Result screen */
  .result-screen {
    background: rgba(0, 0, 0, 0.9);
  }
  .result-title {
    font-size: 32px;
    font-weight: 900;
    color: #ffcb05;
    font-family: 'Courier New', monospace;
    text-shadow: 0 2px 0 #300;
  }
  .result-stats {
    color: #aaa;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    margin-top: 8px;
  }
  .result-pokemon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 16px;
    max-width: 400px;
  }
  .result-pokemon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .result-pokemon img {
    image-rendering: pixelated;
  }
  .result-pokemon-name {
    color: #ccc;
    font-size: 10px;
    font-family: 'Courier New', monospace;
  }
  .result-restart {
    margin-top: 24px;
    background: #cc0000;
    color: white;
    border: 2px solid #ff3333;
    padding: 8px 24px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    transition: background 0.15s;
  }
  .result-restart:hover {
    background: #ff0000;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/lib/toys/pokedoom/PokeDoom.svelte
git commit -m "feat(pokedoom): add PokeDOOM Svelte component with HUD, overlays, and catch animations"
```

---

### Task 6: Integrate PokeDOOM into BadOS desktop

**Files:**
- Modify: `src/lib/toys/BadOS.svelte`

Add a "PokeDOOM.exe" icon to the BadOS desktop that opens a PokeDOOM game window.

**Step 1: Add the PokeDOOM import and icon**

At the top of the `<script>` tag (after existing imports), add:

```typescript
import PokeDoom from './pokedoom/PokeDoom.svelte';
```

Add to the `ICON_DEFS` array (alongside the existing icons):

```typescript
{ id: 'pokedoom', label: 'PokeDOOM.exe', icon: '🎮' },
```

**Step 2: Add the icon click handler**

In the `handleIconClick` switch statement, add a case:

```typescript
case 'pokedoom':
  openWindow('pokedoom', 'PokeDOOM.exe', 'pokedoom', 520, 400);
  break;
```

**Step 3: Add the window content rendering**

In the template section where window content is rendered (the `{#if win.content === 'empty'}` block), add a new branch:

```svelte
{:else if win.content === 'pokedoom'}
  <div class="pokedoom-window-body">
    <PokeDoom />
  </div>
```

**Step 4: Add minimal CSS for the PokeDOOM window body**

```css
.pokedoom-window-body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}
```

**Step 5: Verify it builds**

```bash
cd /Users/sean/Projects/fun && npm run build 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add src/lib/toys/BadOS.svelte
git commit -m "feat(pokedoom): integrate PokeDOOM as launchable app in BadOS XP desktop"
```

---

### Task 7: Test, fix tile coordinates, and polish

**Files:**
- May modify: `src/lib/toys/pokedoom/textures.ts` (tile coordinate fixes)
- May modify: `src/lib/toys/pokedoom/game.ts` (gameplay tuning)
- May modify: `src/lib/toys/pokedoom/PokeDoom.svelte` (visual polish)

**Step 1: Run the dev server and test in browser**

```bash
cd /Users/sean/Projects/fun && npm run dev
```

Open `http://localhost:5173`, click BadOS XP, then double-click the PokeDOOM.exe icon.

**Step 2: Verify and fix tile coordinates**

Open `static/textures/overworld.png` in a viewer. Count tiles from (0,0) at top-left. Each tile is 16x16 pixels. Verify:
- `stoneBrick` at col 5, row 1 — should be a stone/brick looking tile
- `stoneWall` at col 6, row 1 — should be another stone variant
- `woodPlank` at col 1, row 5 — should be wood planks
- `grass` at col 0, row 0 — should be grass

Open `static/textures/cave.png` similarly for cave tiles.

If any coordinates are wrong, update the `TILE_DEFS` in `textures.ts`.

**Step 3: Gameplay testing checklist**

- [ ] Loading screen shows, then transitions to title
- [ ] Title screen shows "PokeDOOM" logo and "Press SPACE"
- [ ] WASD movement works with wall collision
- [ ] Arrow keys / Q/E rotation works
- [ ] Walls are textured (not solid colors)
- [ ] Pokemon sprites visible as billboards
- [ ] SPACE throws Pokeball with wobble animation
- [ ] Catch success/fail works
- [ ] HUD shows pokeball count and caught count
- [ ] Caught Pokemon sprites show in bottom strip
- [ ] BadOS error interrupts appear occasionally
- [ ] Game ends when out of Pokeballs or all caught
- [ ] Result screen with "Play Again" works
- [ ] Keyboard input doesn't propagate to BadOS behind the window

**Step 4: Fix any issues found during testing**

Common things that may need adjustment:
- Tile coordinates in `textures.ts`
- Movement speed (`MOVE_SPEED` in game.ts)
- Pokemon placement on the map (spawn points that land inside walls)
- Canvas sizing within the XP window
- Keyboard event propagation (ensure `stopPropagation` on key events)

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix(pokedoom): fix tile coordinates and gameplay polish from testing"
```

---

### Task 8: Final build verification and commit

**Step 1: Run production build**

```bash
cd /Users/sean/Projects/fun && npm run build 2>&1 | tail -20
```

**Step 2: Run type checking**

```bash
cd /Users/sean/Projects/fun && npm run check 2>&1 | tail -30
```

**Step 3: Fix any build/type errors**

Address any TypeScript or Svelte errors.

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "feat(pokedoom): final build verification and type fixes"
```
