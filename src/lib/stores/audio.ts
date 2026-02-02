// Global audio store for sound effects and music
// Howler is loaded dynamically on first use to keep it out of the initial bundle

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HowlClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HowlerGlobal: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let howlerLoading: Promise<any> | null = null;

async function loadHowler() {
  if (HowlClass && HowlerGlobal) {
    return { Howl: HowlClass, Howler: HowlerGlobal };
  }
  if (!howlerLoading) {
    howlerLoading = import('howler');
  }
  const mod = await howlerLoading;
  HowlClass = mod.Howl;
  HowlerGlobal = mod.Howler;
  return mod;
}

// Sound effect library - short, punchy, varied sounds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sounds: Record<string, any> = {};

const soundUrls: Record<string, string> = {
  // UI sounds - free from mixkit.co and similar
  click: 'https://cdn.freesound.org/previews/220/220206_4100837-lq.mp3', // soft click
  pop: 'https://cdn.freesound.org/previews/456/456965_9159316-lq.mp3', // bubble pop
  whoosh: 'https://cdn.freesound.org/previews/537/537539_10147498-lq.mp3', // swoosh
  ding: 'https://cdn.freesound.org/previews/536/536420_11943129-lq.mp3', // notification ding
  error: 'https://cdn.freesound.org/previews/142/142608_1840739-lq.mp3', // error buzz
  success: 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', // success chime

  // Retro game sounds
  coin: 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', // coin collect
  jump: 'https://cdn.freesound.org/previews/270/270303_5123851-lq.mp3', // jump
  hit: 'https://cdn.freesound.org/previews/387/387232_5121236-lq.mp3', // impact
  powerup: 'https://cdn.freesound.org/previews/270/270304_5123851-lq.mp3', // power up

  // Pet sounds
  happy: 'https://cdn.freesound.org/previews/415/415079_5121236-lq.mp3', // happy chirp
  sad: 'https://cdn.freesound.org/previews/277/277021_4486188-lq.mp3', // sad sound
  eat: 'https://cdn.freesound.org/previews/412/412735_5121236-lq.mp3', // eating

  // Drawing sounds
  draw: 'https://cdn.freesound.org/previews/268/268757_4930887-lq.mp3', // pencil scratch
  spray: 'https://cdn.freesound.org/previews/368/368691_6687700-lq.mp3', // spray can
  stamp: 'https://cdn.freesound.org/previews/266/266078_3263906-lq.mp3', // stamp
  erase: 'https://cdn.freesound.org/previews/240/240784_4284968-lq.mp3', // eraser
  explode: 'https://cdn.freesound.org/previews/587/587196_12911217-lq.mp3', // explosion for bomb

  // Pog sounds
  slam: 'https://cdn.freesound.org/previews/387/387232_5121236-lq.mp3', // slam impact
  scatter: 'https://cdn.freesound.org/previews/350/350905_3248244-lq.mp3', // chips scatter
  collect: 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', // collect

  // Oregon Trail
  wagon: 'https://cdn.freesound.org/previews/467/467758_6456007-lq.mp3', // wagon wheels
  death: 'https://cdn.freesound.org/previews/277/277021_4486188-lq.mp3', // sad death
  victory: 'https://cdn.freesound.org/previews/270/270319_5123851-lq.mp3', // victory fanfare
};

// Initialize sounds lazily - returns a Howl instance or null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSound(name: string): Promise<any | null> {
  if (sounds[name]) return sounds[name];

  if (soundUrls[name]) {
    const { Howl } = await loadHowler();
    sounds[name] = new Howl({
      src: [soundUrls[name]],
      volume: 0.5,
      preload: true,
    });
    return sounds[name];
  }

  return null;
}

// Check if audio is enabled
function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('audioEnabled') === 'true';
}

// Play a sound effect
export function playSound(name: string, volume = 0.5): void {
  if (!isAudioEnabled()) return;

  // Fire-and-forget: load howler then play
  getSound(name).then(sound => {
    if (sound) {
      sound.volume(volume);
      sound.play();
    }
  });
}

// Play a random sound from a category
export function playRandomSound(names: string[], volume = 0.5): void {
  const name = names[Math.floor(Math.random() * names.length)];
  playSound(name, volume);
}

// Stop all sounds
export function stopAllSounds(): void {
  if (HowlerGlobal) {
    HowlerGlobal.stop();
  }
}

// Set global volume
export function setVolume(volume: number): void {
  if (HowlerGlobal) {
    HowlerGlobal.volume(volume);
  }
}

// Preload common sounds
export function preloadSounds(names: string[]): void {
  names.forEach(name => getSound(name));
}
