export const TILE_SIZE = 16;
export const TEXTURE_SIZE = 64;

export interface WallTexture {
	name: string;
	data: ImageData;
}

// Pixel coordinates for tile extraction from the tilesets.
// These are NOT on a uniform grid — coordinates were identified by
// scanning the tileset for fully-opaque, wall-appropriate 16x16 regions.
const TILE_DEFS = {
	// Gray stone blocks (from overworld.png castle area)
	stoneBrick: { src: 'overworld', px: 352, py: 32 },
	// Lighter stone variant
	stoneWall: { src: 'overworld', px: 368, py: 16 },
	// Warm brown wood/cobblestone
	woodPlank: { src: 'overworld', px: 192, py: 208 },
	// Dark brown stone for doors/accents
	door: { src: 'overworld', px: 512, py: 288 },
	// Grass (not used for walls, kept for completeness)
	grass: { src: 'overworld', px: 192, py: 224 },
	// Brown cave wall
	caveWall: { src: 'cave', px: 0, py: 0 },
	// Dark cave wall
	caveDark: { src: 'cave', px: 16, py: 16 },
} as const;

export type TextureName = keyof typeof TILE_DEFS;

export async function loadTextures(): Promise<Map<TextureName, ImageData>> {
	const textures = new Map<TextureName, ImageData>();

	const sources: Record<string, HTMLImageElement> = {};
	const srcNames = [...new Set(Object.values(TILE_DEFS).map((d) => d.src))];

	await Promise.all(
		srcNames.map(
			(name) =>
				new Promise<void>((resolve, reject) => {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.onload = () => {
						sources[name] = img;
						resolve();
					};
					img.onerror = reject;
					img.src = `/textures/${name}.png`;
				})
		)
	);

	const canvas = document.createElement('canvas');
	canvas.width = TEXTURE_SIZE;
	canvas.height = TEXTURE_SIZE;
	const ctx = canvas.getContext('2d')!;
	ctx.imageSmoothingEnabled = false;

	for (const [name, def] of Object.entries(TILE_DEFS)) {
		const img = sources[def.src];
		if (!img) continue;

		ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
		ctx.drawImage(
			img,
			def.px,
			def.py,
			TILE_SIZE,
			TILE_SIZE,
			0,
			0,
			TEXTURE_SIZE,
			TEXTURE_SIZE
		);
		textures.set(name as TextureName, ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE));
	}

	return textures;
}
