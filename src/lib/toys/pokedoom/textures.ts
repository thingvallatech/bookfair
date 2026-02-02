export const TILE_SIZE = 16;
export const TEXTURE_SIZE = 64;

export interface WallTexture {
	name: string;
	data: ImageData;
}

// Tile coordinates in each tileset (col, row) - 16x16 grid
// IMPORTANT: These coordinates need verification against the actual tileset images.
// The overworld tileset is a grid of 16x16px tiles.
const TILE_DEFS = {
	stoneBrick: { src: 'overworld', col: 5, row: 1 },
	stoneWall: { src: 'overworld', col: 6, row: 1 },
	woodPlank: { src: 'overworld', col: 1, row: 5 },
	grass: { src: 'overworld', col: 0, row: 0 },
	door: { src: 'overworld', col: 3, row: 5 },
	caveWall: { src: 'cave', col: 1, row: 0 },
	caveDark: { src: 'cave', col: 2, row: 0 }
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
			def.col * TILE_SIZE,
			def.row * TILE_SIZE,
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
