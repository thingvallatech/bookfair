// Visitor Passport - stamp card tracking which toys have been opened
import { browser } from '$app/environment';

const STORAGE_KEY = 'bookfair_passport';

let stamps: Set<string> = new Set();
let loaded = false;

function load(): void {
  if (!browser || loaded) return;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      stamps = new Set(parsed);
    }
  } catch (e) {
    console.error('Failed to load passport data');
  }
  loaded = true;
}

function save(): void {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...stamps]));
  } catch (e) {
    console.error('Failed to save passport data');
  }
}

/** Stamp a toy as visited. Called the first time a toy is opened. */
export function stampToy(id: string): void {
  load();
  if (!stamps.has(id)) {
    stamps.add(id);
    save();
  }
}

/** Get the full set of stamped toy IDs. */
export function getStamps(): Set<string> {
  load();
  return new Set(stamps);
}

/** Get the count of stamped toys. */
export function getStampCount(): number {
  load();
  return stamps.size;
}
