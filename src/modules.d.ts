// Type declarations for libraries without their own type definitions

declare module 'howler' {
	export class Howl {
		constructor(options: Record<string, unknown>);
		play(): number;
		pause(): void;
		stop(): void;
		volume(vol?: number): number | this;
		unload(): void;
		once(event: string, fn: () => void): void;
		src: string[];
	}
	export const Howler: {
		stop(): void;
		volume(vol?: number): number;
	};
}

declare module 'butterchurn' {
	const butterchurn: {
		createVisualizer(
			audioContext: AudioContext,
			canvas: HTMLCanvasElement,
			options: Record<string, unknown>
		): unknown;
	};
	export default butterchurn;
}

declare module 'butterchurn-presets' {
	const presets: {
		getPresets(): Record<string, unknown>;
	};
	export default presets;
}
