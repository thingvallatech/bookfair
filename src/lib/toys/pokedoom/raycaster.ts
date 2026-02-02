import { TEXTURE_SIZE } from './textures.js';

// ---------- Public types ----------

export interface Vec2 {
	x: number;
	y: number;
}

export interface Player {
	pos: Vec2;
	dir: Vec2;
	plane: Vec2; // camera plane — determines FOV
}

export interface Sprite {
	id: string;
	pos: Vec2;
	textureId: string;
	active: boolean;
}

export interface RaycastConfig {
	width: number;
	height: number;
}

// ---------- Internal constants ----------

const TEX_MASK = TEXTURE_SIZE - 1; // 63 — for bitwise wrapping
const FOG_MAX_DIST = 12;
const FOG_R = 20;
const FOG_G = 20;
const FOG_B = 25;
const CEILING_R = 40;
const CEILING_G = 40;
const CEILING_B = 50;

// ---------- Raycaster class ----------

export class Raycaster {
	private width: number;
	private height: number;
	private zBuffer: Float64Array;

	// Reusable sprite‑reading canvas (lazily created per texture)
	private spriteCanvasCache: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> =
		new Map();

	constructor(config: RaycastConfig) {
		this.width = config.width;
		this.height = config.height;
		this.zBuffer = new Float64Array(this.width);
	}

	/** Resize internal buffers when the render target changes size. */
	resize(width: number, height: number): void {
		this.width = width;
		this.height = height;
		this.zBuffer = new Float64Array(width);
	}

	/** Returns a copy‑free reference to the current z‑buffer. */
	getZBuffer(): Float64Array {
		return this.zBuffer;
	}

	// ------------------------------------------------------------------
	// Wall rendering — DDA raycaster with textured, fogged, shaded walls
	// ------------------------------------------------------------------

	renderWalls(
		buf: ImageData,
		player: Player,
		map: number[][],
		textures: Map<number, ImageData>
	): void {
		const { width, height } = this;
		const data = buf.data;
		const halfH = height >> 1;

		// --- Clear: dark ceiling + gradient floor ---
		this.clearBackground(data, width, height, halfH);

		const mapH = map.length;
		const mapW = mapH > 0 ? map[0].length : 0;

		for (let x = 0; x < width; x++) {
			// Camera‑space x coordinate: -1 (left) to +1 (right)
			const cameraX = (2 * x) / width - 1;

			// Ray direction
			const rayDirX = player.dir.x + player.plane.x * cameraX;
			const rayDirY = player.dir.y + player.plane.y * cameraX;

			// Current map cell
			let mapX = Math.floor(player.pos.x);
			let mapY = Math.floor(player.pos.y);

			// Delta distances — length of ray from one x/y side to the next
			const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
			const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

			// Step direction and initial side distance
			let stepX: number;
			let sideDistX: number;
			if (rayDirX < 0) {
				stepX = -1;
				sideDistX = (player.pos.x - mapX) * deltaDistX;
			} else {
				stepX = 1;
				sideDistX = (mapX + 1 - player.pos.x) * deltaDistX;
			}

			let stepY: number;
			let sideDistY: number;
			if (rayDirY < 0) {
				stepY = -1;
				sideDistY = (player.pos.y - mapY) * deltaDistY;
			} else {
				stepY = 1;
				sideDistY = (mapY + 1 - player.pos.y) * deltaDistY;
			}

			// DDA loop
			let hit = false;
			let side = 0; // 0 = X‑side (vertical grid line), 1 = Y‑side (horizontal grid line)

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

				// Bounds check — treat out‑of‑bounds as solid to prevent infinite loops
				if (mapX < 0 || mapX >= mapW || mapY < 0 || mapY >= mapH) {
					hit = true; // escape, wall defaults to type 1
					break;
				}

				if (map[mapY][mapX] > 0) {
					hit = true;
				}
			}

			// Perpendicular wall distance (avoid fish‑eye)
			let perpWallDist: number;
			if (side === 0) {
				perpWallDist = sideDistX - deltaDistX;
			} else {
				perpWallDist = sideDistY - deltaDistY;
			}
			if (perpWallDist < 0.001) perpWallDist = 0.001;

			this.zBuffer[x] = perpWallDist;

			// Projected wall line height
			const lineHeight = Math.floor(height / perpWallDist);
			let drawStart = Math.floor(-lineHeight / 2 + halfH);
			if (drawStart < 0) drawStart = 0;
			let drawEnd = Math.floor(lineHeight / 2 + halfH);
			if (drawEnd >= height) drawEnd = height - 1;

			// Texture coordinate: where on the wall face was hit
			let wallX: number; // fractional position along the wall face [0, 1)
			if (side === 0) {
				wallX = player.pos.y + perpWallDist * rayDirY;
			} else {
				wallX = player.pos.x + perpWallDist * rayDirX;
			}
			wallX -= Math.floor(wallX);

			// Texture column
			let texX = Math.floor(wallX * TEXTURE_SIZE);
			// Flip texture for certain sides so it doesn't mirror
			if (side === 0 && rayDirX > 0) texX = TEX_MASK - texX;
			if (side === 1 && rayDirY < 0) texX = TEX_MASK - texX;
			texX = texX & TEX_MASK;

			// Retrieve texture data
			const wallType =
				mapX >= 0 && mapX < mapW && mapY >= 0 && mapY < mapH ? map[mapY][mapX] : 1;
			const texImg = textures.get(wallType);
			const texData = texImg ? texImg.data : null;

			// Texture step and starting position
			const step = TEXTURE_SIZE / lineHeight;
			let texPos = (drawStart - halfH + lineHeight / 2) * step;

			// Fog factor (clamped 0–1)
			const fog = Math.min(1, perpWallDist / FOG_MAX_DIST);
			const invFog = 1 - fog;

			// Draw the vertical wall stripe
			for (let y = drawStart; y <= drawEnd; y++) {
				const texY = Math.floor(texPos) & TEX_MASK;
				texPos += step;

				let r: number, g: number, b: number;

				if (texData) {
					const texOffset = (texY * TEXTURE_SIZE + texX) << 2;
					r = texData[texOffset];
					g = texData[texOffset + 1];
					b = texData[texOffset + 2];
				} else {
					// Fallback: solid gray if no texture found
					r = 128;
					g = 128;
					b = 128;
				}

				// Darken Y‑side walls (shift right by 1 = half brightness)
				if (side === 1) {
					r = r >> 1;
					g = g >> 1;
					b = b >> 1;
				}

				// Apply distance fog
				r = Math.floor(r * invFog + FOG_R * fog);
				g = Math.floor(g * invFog + FOG_G * fog);
				b = Math.floor(b * invFog + FOG_B * fog);

				const bufIdx = (y * width + x) << 2;
				data[bufIdx] = r;
				data[bufIdx + 1] = g;
				data[bufIdx + 2] = b;
				data[bufIdx + 3] = 255;
			}
		}
	}

	// ------------------------------------------------------------------
	// Sprite rendering — billboard sprites sorted far‑to‑near, z‑tested
	// ------------------------------------------------------------------

	renderSprites(
		buf: ImageData,
		player: Player,
		sprites: Sprite[],
		spriteTextures: Map<string, HTMLImageElement>
	): void {
		const { width, height, zBuffer } = this;
		const data = buf.data;
		const halfH = height >> 1;

		// Filter to active sprites only
		const active = sprites.filter((s) => s.active);
		if (active.length === 0) return;

		// Compute distance to player for each sprite and sort far‑to‑near
		const sorted = active
			.map((s) => {
				const dx = s.pos.x - player.pos.x;
				const dy = s.pos.y - player.pos.y;
				return { sprite: s, dist2: dx * dx + dy * dy };
			})
			.sort((a, b) => b.dist2 - a.dist2);

		// Inverse camera matrix determinant (computed once)
		const invDet = 1.0 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);

		for (const entry of sorted) {
			const spr = entry.sprite;
			const tex = spriteTextures.get(spr.textureId);
			if (!tex) continue;

			// Sprite position relative to camera
			const sprX = spr.pos.x - player.pos.x;
			const sprY = spr.pos.y - player.pos.y;

			// Inverse camera transform
			const transformX = invDet * (player.dir.y * sprX - player.dir.x * sprY);
			const transformY = invDet * (-player.plane.y * sprX + player.plane.x * sprY);

			// Sprite is behind camera
			if (transformY <= 0.01) continue;

			// Screen X position of sprite center
			const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));

			// Sprite height and width on screen
			const spriteHeight = Math.abs(Math.floor(height / transformY));
			const spriteWidth = spriteHeight; // square sprites

			let drawStartY = Math.floor(-spriteHeight / 2 + halfH);
			let drawEndY = Math.floor(spriteHeight / 2 + halfH);
			let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
			let drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);

			// Clip to screen bounds
			const clipStartY = Math.max(0, drawStartY);
			const clipEndY = Math.min(height - 1, drawEndY);
			const clipStartX = Math.max(0, drawStartX);
			const clipEndX = Math.min(width - 1, drawEndX);

			// Get sprite pixel data via temporary canvas
			const spritePixels = this.getSpritePixelData(spr.textureId, tex);
			if (!spritePixels) continue;

			const sprTexW = tex.width;
			const sprTexH = tex.height;

			// Fog factor for this sprite
			const spriteDist = transformY;
			const fog = Math.min(1, spriteDist / FOG_MAX_DIST);
			const invFog = 1 - fog;

			for (let stripe = clipStartX; stripe <= clipEndX; stripe++) {
				// Texture X coordinate
				const texX = Math.floor(((stripe - drawStartX) * sprTexW) / spriteWidth);
				if (texX < 0 || texX >= sprTexW) continue;

				// Z‑buffer check: only draw if sprite column is in front of wall
				if (transformY >= zBuffer[stripe]) continue;

				for (let y = clipStartY; y <= clipEndY; y++) {
					const texY = Math.floor(((y - drawStartY) * sprTexH) / spriteHeight);
					if (texY < 0 || texY >= sprTexH) continue;

					const sprOffset = (texY * sprTexW + texX) << 2;
					const alpha = spritePixels[sprOffset + 3];

					// Only draw opaque‑ish pixels
					if (alpha <= 128) continue;

					let r = spritePixels[sprOffset];
					let g = spritePixels[sprOffset + 1];
					let b = spritePixels[sprOffset + 2];

					// Apply distance fog
					r = Math.floor(r * invFog + FOG_R * fog);
					g = Math.floor(g * invFog + FOG_G * fog);
					b = Math.floor(b * invFog + FOG_B * fog);

					const bufIdx = (y * width + stripe) << 2;
					data[bufIdx] = r;
					data[bufIdx + 1] = g;
					data[bufIdx + 2] = b;
					data[bufIdx + 3] = 255;
				}
			}
		}
	}

	// ------------------------------------------------------------------
	// Private helpers
	// ------------------------------------------------------------------

	/** Clear background: dark ceiling + gradient floor. */
	private clearBackground(
		data: Uint8ClampedArray,
		width: number,
		height: number,
		halfH: number
	): void {
		for (let y = 0; y < height; y++) {
			const rowOffset = y * width;

			if (y < halfH) {
				// Ceiling: solid dark color
				for (let x = 0; x < width; x++) {
					const i = (rowOffset + x) << 2;
					data[i] = CEILING_R;
					data[i + 1] = CEILING_G;
					data[i + 2] = CEILING_B;
					data[i + 3] = 255;
				}
			} else {
				// Floor: gradient from dark at horizon to slightly lighter at bottom
				const t = (y - halfH) / (height - halfH); // 0 at horizon, 1 at bottom
				const floorR = Math.floor(30 + 40 * t);
				const floorG = Math.floor(30 + 40 * t);
				const floorB = Math.floor(35 + 30 * t);
				for (let x = 0; x < width; x++) {
					const i = (rowOffset + x) << 2;
					data[i] = floorR;
					data[i + 1] = floorG;
					data[i + 2] = floorB;
					data[i + 3] = 255;
				}
			}
		}
	}

	/** Get pixel data for a sprite image, caching the canvas + draw result. */
	private getSpritePixelData(textureId: string, img: HTMLImageElement): Uint8ClampedArray | null {
		let entry = this.spriteCanvasCache.get(textureId);

		if (!entry) {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			ctx.drawImage(img, 0, 0);
			entry = { canvas, ctx };
			this.spriteCanvasCache.set(textureId, entry);
		}

		// Re‑read in case image changed dimensions (unlikely but safe)
		if (entry.canvas.width !== img.width || entry.canvas.height !== img.height) {
			entry.canvas.width = img.width;
			entry.canvas.height = img.height;
			entry.ctx.drawImage(img, 0, 0);
		}

		try {
			return entry.ctx.getImageData(0, 0, img.width, img.height).data;
		} catch {
			return null;
		}
	}
}
