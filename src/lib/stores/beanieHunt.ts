// Beanie Hunt - "Where's Waldo" style hidden beanie management
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import { ALL_BEANIES, type Beanie } from './beanies';

// Simplified hiding spot - just needs an ID, positioning is handled by each component
export interface HidingSpot {
  id: string;
}

// Rarity weights for random selection (rarer = less likely to appear)
const RARITY_WEIGHTS: Record<string, number> = {
  'common': 50,
  'uncommon': 30,
  'rare': 12,
  'ultra-rare': 6,
  'legendary': 2
};

const STORAGE_KEY = 'bookfair-beanie-discovered';

// Global state
let sessionBeanies: Map<string, Beanie> = new Map();
let discoveredThisSession: Set<string> = new Set();
let allTimeDiscovered: string[] = [];
let registeredSpots: Map<string, HidingSpot[]> = new Map();
let initialized = false;

// Svelte store for the popup state
export const tagPopupStore = writable<Beanie | null>(null);

// Pick random beanies weighted by rarity
function pickWeightedBeanie(exclude: string[] = []): Beanie {
  const available = ALL_BEANIES.filter(b => !exclude.includes(b.name));
  if (available.length === 0) return ALL_BEANIES[0];

  let totalWeight = 0;
  for (const beanie of available) {
    totalWeight += RARITY_WEIGHTS[beanie.rarity];
  }

  let roll = Math.random() * totalWeight;
  for (const beanie of available) {
    roll -= RARITY_WEIGHTS[beanie.rarity];
    if (roll <= 0) return beanie;
  }

  return available[0];
}

// Initialize the hunt for this session
export function initializeHunt(): void {
  if (!browser || initialized) return;

  // Load all-time discovered from localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      allTimeDiscovered = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load beanie discovery data');
  }

  // Pick 3-4 random beanies for this session
  const numBeanies = Math.random() < 0.6 ? 3 : 4;
  const picked: Beanie[] = [];

  for (let i = 0; i < numBeanies; i++) {
    const beanie = pickWeightedBeanie(picked.map(b => b.name));
    picked.push(beanie);
  }

  // Clear previous session
  sessionBeanies.clear();
  discoveredThisSession.clear();

  // Store picked beanies temporarily
  (globalThis as any).__pickedBeanies = picked;

  initialized = true;
}

// Register hiding spots for an area (called by components)
export function registerSpots(areaId: string, spots: HidingSpot[]): Beanie | null {
  registeredSpots.set(areaId, spots);

  // Get picked beanies
  const picked: Beanie[] = (globalThis as any).__pickedBeanies || [];
  if (picked.length === 0) return null;

  // Check if this area already has an assigned beanie
  for (const [spotId, beanie] of sessionBeanies) {
    if (spotId.startsWith(areaId + '-')) {
      return beanie;
    }
  }

  // Assign a beanie to a random spot in this area if available
  const unassignedBeanies = picked.filter(b =>
    !Array.from(sessionBeanies.values()).some(assigned => assigned.name === b.name)
  );

  if (unassignedBeanies.length === 0 || spots.length === 0) return null;

  // 70% chance to have a beanie in any given area (except shelf which always has one)
  if (areaId !== 'shelf' && Math.random() > 0.7) return null;

  const beanie = unassignedBeanies[Math.floor(Math.random() * unassignedBeanies.length)];
  const spot = spots[Math.floor(Math.random() * spots.length)];

  sessionBeanies.set(`${areaId}-${spot.id}`, beanie);

  return beanie;
}

// Get beanie for a specific spot (if one was assigned)
export function getBeanieForSpot(areaId: string, spotId: string): Beanie | null {
  return sessionBeanies.get(`${areaId}-${spotId}`) || null;
}

// Get all assigned beanies for an area
export function getBeaniesForArea(areaId: string): Map<string, Beanie> {
  const result = new Map<string, Beanie>();
  for (const [spotId, beanie] of sessionBeanies) {
    if (spotId.startsWith(areaId + '-')) {
      const localSpotId = spotId.replace(areaId + '-', '');
      result.set(localSpotId, beanie);
    }
  }
  return result;
}

// Mark a beanie as discovered
export function markDiscovered(beanieName: string): void {
  discoveredThisSession.add(beanieName);

  // Save to localStorage if not already there
  if (browser && !allTimeDiscovered.includes(beanieName)) {
    allTimeDiscovered.push(beanieName);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTimeDiscovered));
  }
}

// Check if beanie was discovered this session
export function isDiscoveredThisSession(beanieName: string): boolean {
  return discoveredThisSession.has(beanieName);
}

// Check if beanie was ever discovered
export function isEverDiscovered(beanieName: string): boolean {
  return allTimeDiscovered.includes(beanieName);
}

// Get all-time discovered beanies
export function getAllTimeDiscovered(): string[] {
  return [...allTimeDiscovered];
}

// Get discovery stats
export function getDiscoveryStats(): { discovered: number; total: number } {
  return {
    discovered: allTimeDiscovered.length,
    total: ALL_BEANIES.length
  };
}

// Popup control
export function showTag(beanie: Beanie): void {
  tagPopupStore.set(beanie);
  markDiscovered(beanie.name);
}

export function closeTag(): void {
  tagPopupStore.set(null);
}

export function getTagPopup(): Beanie | null {
  return get(tagPopupStore);
}
