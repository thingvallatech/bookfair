// PokeDOOM — Pokemon definitions, sprite loading, and spawn assignment.

export interface PokemonDef {
	id: number; // PokeAPI national dex number
	name: string;
	tier: 'common' | 'uncommon' | 'rare' | 'legendary';
	catchRate: number; // 0-1 probability per throw
}

export const POKEMON: PokemonDef[] = [
	// Common (high catch rate)
	{ id: 16, name: 'Pidgey', tier: 'common', catchRate: 0.8 },
	{ id: 19, name: 'Rattata', tier: 'common', catchRate: 0.8 },
	{ id: 41, name: 'Zubat', tier: 'common', catchRate: 0.75 },
	{ id: 10, name: 'Caterpie', tier: 'common', catchRate: 0.85 },
	{ id: 13, name: 'Weedle', tier: 'common', catchRate: 0.85 },

	// Uncommon
	{ id: 25, name: 'Pikachu', tier: 'uncommon', catchRate: 0.5 },
	{ id: 1, name: 'Bulbasaur', tier: 'uncommon', catchRate: 0.45 },
	{ id: 4, name: 'Charmander', tier: 'uncommon', catchRate: 0.45 },
	{ id: 7, name: 'Squirtle', tier: 'uncommon', catchRate: 0.45 },
	{ id: 39, name: 'Jigglypuff', tier: 'uncommon', catchRate: 0.5 },

	// Rare
	{ id: 143, name: 'Snorlax', tier: 'rare', catchRate: 0.2 },
	{ id: 94, name: 'Gengar', tier: 'rare', catchRate: 0.15 },
	{ id: 149, name: 'Dragonite', tier: 'rare', catchRate: 0.1 },

	// Legendary
	{ id: 150, name: 'Mewtwo', tier: 'legendary', catchRate: 0.05 }
];

/** Build the PokeAPI sprite URL for a given national dex ID. */
export function getSpriteUrl(pokeId: number): string {
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;
}

/**
 * For each spawn point, pick a random Pokemon whose tier matches.
 * Returns an array parallel to the input spawn points.
 */
export function assignPokemon(spawnPoints: { tier: string }[]): PokemonDef[] {
	const byTier = new Map<string, PokemonDef[]>();
	for (const p of POKEMON) {
		const list = byTier.get(p.tier) ?? [];
		list.push(p);
		byTier.set(p.tier, list);
	}

	return spawnPoints.map((sp) => {
		const pool = byTier.get(sp.tier);
		if (!pool || pool.length === 0) {
			// Fallback: pick any common Pokemon
			return POKEMON[0];
		}
		return pool[Math.floor(Math.random() * pool.length)];
	});
}

/**
 * Preload all unique Pokemon sprite images.
 * Returns a map of "pokemon-{id}" to the loaded HTMLImageElement.
 * Resolves even if individual sprites fail to load (they are simply omitted).
 */
export async function preloadSprites(): Promise<Map<string, HTMLImageElement>> {
	const sprites = new Map<string, HTMLImageElement>();

	const loadPromises = POKEMON.map(
		(p) =>
			new Promise<void>((resolve) => {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.onload = () => {
					sprites.set(`pokemon-${p.id}`, img);
					resolve();
				};
				img.onerror = () => {
					// Skip failed sprites — game can still run without them
					console.warn(`Failed to load sprite for ${p.name} (#${p.id})`);
					resolve();
				};
				img.src = getSpriteUrl(p.id);
			})
	);

	await Promise.all(loadPromises);
	return sprites;
}
