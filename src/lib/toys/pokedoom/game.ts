// PokeDOOM — Central game orchestrator.
// Ties together the raycaster, map, Pokemon modules, and input handling
// into a playable game loop with phases and BadOS interrupt events.

import { Raycaster, type Player, type Sprite } from './raycaster.js';
import { DUNGEON_MAP, PLAYER_START, PLAYER_START_DIR, PLAYER_START_PLANE, SPAWN_POINTS } from './map.js';
import { assignPokemon, preloadSprites, type PokemonDef } from './pokemon.js';
import { loadTextures, type TextureName } from './textures.js';

// ---------- Public types ----------

export type GamePhase = 'loading' | 'title' | 'playing' | 'catching' | 'result';

export interface CatchAttempt {
	pokemon: PokemonDef;
	wobbles: number; // 1-3 wobble animations before result
	caught: boolean;
	timer: number; // frames remaining in catch animation
}

export interface GameState {
	phase: GamePhase;
	pokeballs: number;
	caught: PokemonDef[];
	totalPokemon: number;
	interrupt: string | null;
	catchAttempt: CatchAttempt | null;
}

// ---------- BadOS interrupt messages ----------

const BADOS_MESSAGES = [
	'explorer.exe has encountered a wild Pokemon and needs to close.',
	'Warning: Your Pokedex is running low on disk space.',
	'Error 0x80Pokemon: Catch rate buffer overflow.',
	'A wild MISSINGNO. has corrupted your system registry.',
	'Task Manager is not responding. Would you like to catch it?',
	'Windows has detected a Pikachu on your network.',
	'Critical Error: pokeball.dll not found.',
	'Your PC ran into a problem. A Snorlax is blocking the system bus.',
	'Blue Screen of Doom: ZUBAT_SWARM_EXCEPTION',
	'This program has performed an illegal Pokemon operation.',
];

// ---------- Texture name to wall type number mapping ----------

const TEXTURE_WALL_MAP: Record<TextureName, number> = {
	stoneBrick: 1,
	caveWall: 2,
	woodPlank: 3,
	stoneWall: 4,
	grass: 5,
	door: 6,
	caveDark: 7,
};

// ---------- Constants ----------

const MOVE_SPEED = 0.06;
const ROT_SPEED = 0.04;
const COLLISION_MARGIN = 0.2;
const CATCH_RANGE = 3.0;
const CATCH_ANGLE = Math.PI / 4; // 45 degrees
const INTERRUPT_CHANCE = 0.002;
const INTERRUPT_DURATION = 180; // ~3 seconds at 60fps
const INITIAL_POKEBALLS = 20;
const MAP_SIZE = 32;

// ---------- Game class ----------

export class Game {
	// Rendering
	private canvas!: HTMLCanvasElement;
	private ctx!: CanvasRenderingContext2D;
	private buf!: ImageData;
	private raycaster!: Raycaster;

	// Textures
	private wallTextures = new Map<number, ImageData>();
	private spriteTextures = new Map<string, HTMLImageElement>();

	// Game objects
	private player: Player = {
		pos: { x: PLAYER_START.x, y: PLAYER_START.y },
		dir: { x: PLAYER_START_DIR.x, y: PLAYER_START_DIR.y },
		plane: { x: PLAYER_START_PLANE.x, y: PLAYER_START_PLANE.y },
	};
	private sprites: Sprite[] = [];
	private assignments: PokemonDef[] = [];

	// State
	private phase: GamePhase = 'loading';
	private pokeballs = INITIAL_POKEBALLS;
	private caught: PokemonDef[] = [];
	private interrupt: string | null = null;
	private interruptTimer = 0;
	private catchAttempt: CatchAttempt | null = null;

	// Input
	private keys = new Set<string>();

	// Loop
	private animFrameId = 0;
	private stateChangeCb: ((state: GameState) => void) | null = null;

	// ------------------------------------------------------------------
	// Lifecycle
	// ------------------------------------------------------------------

	async init(canvas: HTMLCanvasElement): Promise<void> {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.buf = this.ctx.createImageData(canvas.width, canvas.height);
		this.raycaster = new Raycaster({ width: canvas.width, height: canvas.height });

		this.phase = 'loading';
		this.notifyStateChange();

		// Load textures: map TextureName → wall type number for the raycaster
		const [namedTextures, sprites] = await Promise.all([loadTextures(), preloadSprites()]);

		for (const [name, imageData] of namedTextures) {
			const wallType = TEXTURE_WALL_MAP[name];
			if (wallType !== undefined) {
				this.wallTextures.set(wallType, imageData);
			}
		}

		this.spriteTextures = sprites;

		// Assign Pokemon to spawn points and create sprites
		this.setupPokemon();

		this.phase = 'title';
		this.notifyStateChange();
	}

	startGame(): void {
		this.phase = 'playing';
		this.notifyStateChange();
		this.startLoop();
	}

	restart(): void {
		// Cancel any running loop
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = 0;
		}

		// Reset player
		this.player.pos.x = PLAYER_START.x;
		this.player.pos.y = PLAYER_START.y;
		this.player.dir.x = PLAYER_START_DIR.x;
		this.player.dir.y = PLAYER_START_DIR.y;
		this.player.plane.x = PLAYER_START_PLANE.x;
		this.player.plane.y = PLAYER_START_PLANE.y;

		// Reset state
		this.pokeballs = INITIAL_POKEBALLS;
		this.caught = [];
		this.interrupt = null;
		this.interruptTimer = 0;
		this.catchAttempt = null;
		this.keys.clear();

		// Reassign Pokemon
		this.setupPokemon();

		this.phase = 'playing';
		this.notifyStateChange();
		this.startLoop();
	}

	resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
		this.buf = this.ctx.createImageData(width, height);
		this.raycaster.resize(width, height);
	}

	destroy(): void {
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = 0;
		}
		this.keys.clear();
	}

	// ------------------------------------------------------------------
	// Input handlers
	// ------------------------------------------------------------------

	handleKeyDown(key: string): void {
		const k = key.toLowerCase();
		this.keys.add(k);

		if (k === ' ' || key === ' ') {
			if (this.phase === 'title') {
				this.startGame();
			} else if (this.phase === 'playing') {
				this.throwBall();
			}
		}

		if (k === 'escape') {
			if (this.interrupt) {
				this.dismissInterrupt();
			}
		}
	}

	handleKeyUp(key: string): void {
		this.keys.delete(key.toLowerCase());
	}

	// ------------------------------------------------------------------
	// BadOS interrupts
	// ------------------------------------------------------------------

	dismissInterrupt(): void {
		this.interrupt = null;
		this.interruptTimer = 0;
		this.notifyStateChange();
	}

	// ------------------------------------------------------------------
	// Pokeball throwing
	// ------------------------------------------------------------------

	throwBall(): boolean {
		if (this.phase !== 'playing' || this.pokeballs <= 0) return false;

		this.pokeballs--;
		this.notifyStateChange();

		// Find nearest active Pokemon in front of player within range and angle
		let bestDist = Infinity;
		let bestIdx = -1;

		for (let i = 0; i < this.sprites.length; i++) {
			const spr = this.sprites[i];
			if (!spr.active) continue;

			const dx = spr.pos.x - this.player.pos.x;
			const dy = spr.pos.y - this.player.pos.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > CATCH_RANGE) continue;

			// Check if Pokemon is in front of player using dot product
			const dot = dx * this.player.dir.x + dy * this.player.dir.y;
			if (dot <= 0) continue; // behind player

			// Check angle using atan2
			const angleToPokemon = Math.atan2(dy, dx);
			const playerAngle = Math.atan2(this.player.dir.y, this.player.dir.x);
			let angleDiff = angleToPokemon - playerAngle;

			// Normalize to [-PI, PI]
			while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
			while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

			if (Math.abs(angleDiff) > CATCH_ANGLE) continue;

			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}

		if (bestIdx === -1) {
			// Miss — no valid target
			this.checkGameEnd();
			return false;
		}

		// Start catch attempt
		const pokemon = this.assignments[bestIdx];
		const wobbles = Math.floor(Math.random() * 3) + 1; // 1-3
		const caught = Math.random() < pokemon.catchRate;
		const timer = wobbles * 30 + 30;

		this.catchAttempt = { pokemon, wobbles, caught, timer };
		this.phase = 'catching';
		this.notifyStateChange();

		// The catch timer is managed in the game loop update
		// Store the sprite index for resolution
		this.catchTargetIdx = bestIdx;

		return true;
	}

	// Index of the sprite currently being caught (used internally)
	private catchTargetIdx = -1;

	// ------------------------------------------------------------------
	// State callback
	// ------------------------------------------------------------------

	setStateChangeCallback(cb: (state: GameState) => void): void {
		this.stateChangeCb = cb;
	}

	getState(): GameState {
		return {
			phase: this.phase,
			pokeballs: this.pokeballs,
			caught: [...this.caught],
			totalPokemon: SPAWN_POINTS.length,
			interrupt: this.interrupt,
			catchAttempt: this.catchAttempt ? { ...this.catchAttempt } : null,
		};
	}

	// ------------------------------------------------------------------
	// Private — game loop
	// ------------------------------------------------------------------

	private startLoop(): void {
		const loop = () => {
			this.update();
			this.render();
			this.animFrameId = requestAnimationFrame(loop);
		};
		this.animFrameId = requestAnimationFrame(loop);
	}

	private update(): void {
		// Handle catch timer
		if (this.phase === 'catching' && this.catchAttempt) {
			this.catchAttempt.timer--;
			if (this.catchAttempt.timer <= 0) {
				this.resolveCatch();
			}
			return; // No movement during catch
		}

		if (this.phase !== 'playing') return;

		// BadOS interrupt timer
		if (this.interruptTimer > 0) {
			this.interruptTimer--;
			if (this.interruptTimer <= 0) {
				this.dismissInterrupt();
			}
		}

		// Random BadOS interrupt
		if (!this.interrupt && Math.random() < INTERRUPT_CHANCE) {
			this.interrupt = BADOS_MESSAGES[Math.floor(Math.random() * BADOS_MESSAGES.length)];
			this.interruptTimer = INTERRUPT_DURATION;
			this.notifyStateChange();
		}

		// Movement (no movement during interrupt)
		if (!this.interrupt) {
			this.handleMovement();
		}
	}

	private handleMovement(): void {
		const { player, keys } = this;

		// Forward/backward
		if (keys.has('w') || keys.has('arrowup')) {
			const newX = player.pos.x + player.dir.x * MOVE_SPEED;
			const newY = player.pos.y + player.dir.y * MOVE_SPEED;
			if (!this.isWall(newX, player.pos.y)) player.pos.x = newX;
			if (!this.isWall(player.pos.x, newY)) player.pos.y = newY;
		}
		if (keys.has('s') || keys.has('arrowdown')) {
			const newX = player.pos.x - player.dir.x * MOVE_SPEED;
			const newY = player.pos.y - player.dir.y * MOVE_SPEED;
			if (!this.isWall(newX, player.pos.y)) player.pos.x = newX;
			if (!this.isWall(player.pos.x, newY)) player.pos.y = newY;
		}

		// Strafe
		if (keys.has('a')) {
			const newX = player.pos.x - player.dir.y * MOVE_SPEED;
			const newY = player.pos.y + player.dir.x * MOVE_SPEED;
			if (!this.isWall(newX, player.pos.y)) player.pos.x = newX;
			if (!this.isWall(player.pos.x, newY)) player.pos.y = newY;
		}
		if (keys.has('d')) {
			const newX = player.pos.x + player.dir.y * MOVE_SPEED;
			const newY = player.pos.y - player.dir.x * MOVE_SPEED;
			if (!this.isWall(newX, player.pos.y)) player.pos.x = newX;
			if (!this.isWall(player.pos.x, newY)) player.pos.y = newY;
		}

		// Rotation
		if (keys.has('arrowleft') || keys.has('q')) {
			this.rotate(-ROT_SPEED);
		}
		if (keys.has('arrowright') || keys.has('e')) {
			this.rotate(ROT_SPEED);
		}
	}

	private rotate(angle: number): void {
		const { dir, plane } = this.player;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const oldDirX = dir.x;
		dir.x = dir.x * cos - dir.y * sin;
		dir.y = oldDirX * sin + dir.y * cos;

		const oldPlaneX = plane.x;
		plane.x = plane.x * cos - plane.y * sin;
		plane.y = oldPlaneX * sin + plane.y * cos;
	}

	private isWall(x: number, y: number): boolean {
		// Check all four corners of the collision box
		const checks = [
			{ cx: x + COLLISION_MARGIN, cy: y + COLLISION_MARGIN },
			{ cx: x - COLLISION_MARGIN, cy: y + COLLISION_MARGIN },
			{ cx: x + COLLISION_MARGIN, cy: y - COLLISION_MARGIN },
			{ cx: x - COLLISION_MARGIN, cy: y - COLLISION_MARGIN },
		];

		for (const { cx, cy } of checks) {
			const mapX = Math.floor(cx);
			const mapY = Math.floor(cy);
			if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) return true;
			if (DUNGEON_MAP[mapY][mapX] > 0) return true;
		}
		return false;
	}

	private render(): void {
		this.raycaster.renderWalls(this.buf, this.player, DUNGEON_MAP, this.wallTextures);
		this.raycaster.renderSprites(this.buf, this.player, this.sprites, this.spriteTextures);
		this.ctx.putImageData(this.buf, 0, 0);
	}

	// ------------------------------------------------------------------
	// Private — Pokemon setup and catch resolution
	// ------------------------------------------------------------------

	private setupPokemon(): void {
		this.assignments = assignPokemon(SPAWN_POINTS);
		this.sprites = SPAWN_POINTS.map((sp, i) => ({
			id: `pokemon-${i}`,
			pos: { x: sp.x, y: sp.y },
			textureId: `pokemon-${this.assignments[i].id}`,
			active: true,
		}));
	}

	private resolveCatch(): void {
		if (!this.catchAttempt) return;

		if (this.catchAttempt.caught && this.catchTargetIdx >= 0) {
			// Caught! Deactivate sprite, add to caught list
			this.sprites[this.catchTargetIdx].active = false;
			this.caught.push(this.catchAttempt.pokemon);
		} else if (this.catchTargetIdx >= 0) {
			// Escaped — move Pokemon to a random open cell
			const newPos = this.findRandomOpenPos();
			if (newPos) {
				this.sprites[this.catchTargetIdx].pos.x = newPos.x;
				this.sprites[this.catchTargetIdx].pos.y = newPos.y;
			}
		}

		this.catchAttempt = null;
		this.catchTargetIdx = -1;
		this.phase = 'playing';
		this.notifyStateChange();

		this.checkGameEnd();
	}

	private checkGameEnd(): void {
		const allCaught = this.sprites.every((s) => !s.active);
		const activePokemon = this.sprites.some((s) => s.active);
		const outOfBalls = this.pokeballs <= 0 && activePokemon;

		if (allCaught || outOfBalls) {
			this.phase = 'result';
			this.notifyStateChange();
			if (this.animFrameId) {
				cancelAnimationFrame(this.animFrameId);
				this.animFrameId = 0;
			}
		}
	}

	private findRandomOpenPos(): { x: number; y: number } | null {
		for (let attempt = 0; attempt < 100; attempt++) {
			const x = Math.floor(Math.random() * MAP_SIZE);
			const y = Math.floor(Math.random() * MAP_SIZE);

			if (DUNGEON_MAP[y][x] !== 0) continue;

			const cx = x + 0.5;
			const cy = y + 0.5;

			// Ensure at least 3 units from player
			const dx = cx - this.player.pos.x;
			const dy = cy - this.player.pos.y;
			if (Math.sqrt(dx * dx + dy * dy) < 3) continue;

			return { x: cx, y: cy };
		}
		return null;
	}

	private notifyStateChange(): void {
		if (this.stateChangeCb) {
			this.stateChangeCb(this.getState());
		}
	}
}
