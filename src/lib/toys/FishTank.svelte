<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface Fish {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    maxSize: number;
    age: number;
    species: number;
    name: string;
    direction: number; // 1 = right, -1 = left
    swimPhase: number;
    hunger: number;
    lastFed: number;
    born: number;
  }

  interface Food {
    x: number;
    y: number;
    vy: number;
    size: number;
  }

  interface Bubble {
    x: number;
    y: number;
    size: number;
    speed: number;
    wobble: number;
  }

  // Species data - colors and patterns
  const SPECIES = [
    { name: 'Goldfish', bodyColor: '#ffa500', finColor: '#ff8c00', tailColor: '#ff6600', pattern: 'solid' },
    { name: 'Guppy', bodyColor: '#00bfff', finColor: '#1e90ff', tailColor: '#4169e1', pattern: 'spotted' },
    { name: 'Angelfish', bodyColor: '#e6e6fa', finColor: '#dda0dd', tailColor: '#da70d6', pattern: 'striped' },
    { name: 'Betta', bodyColor: '#dc143c', finColor: '#b22222', tailColor: '#8b0000', pattern: 'flowing' },
    { name: 'Neon Tetra', bodyColor: '#00ffff', finColor: '#ff1493', tailColor: '#ff69b4', pattern: 'neon' },
    { name: 'Clownfish', bodyColor: '#ff4500', finColor: '#fff', tailColor: '#ff6347', pattern: 'clown' },
    { name: 'Molly', bodyColor: '#2f4f4f', finColor: '#696969', tailColor: '#708090', pattern: 'solid' },
    { name: 'Platy', bodyColor: '#ff69b4', finColor: '#ffb6c1', tailColor: '#ff1493', pattern: 'gradient' },
  ];

  const FISH_NAMES = [
    'Bubbles', 'Finn', 'Splash', 'Goldie', 'Nemo', 'Dory', 'Oscar', 'Jaws',
    'Flounder', 'Gill', 'Marlin', 'Bruce', 'Anchor', 'Chum', 'Nigel', 'Crush',
    'Squirt', 'Pearl', 'Tad', 'Bloat', 'Peach', 'Jacques', 'Gurgle', 'Bubba',
    'Neptune', 'Coral', 'Sandy', 'Shelly', 'Flipper', 'Finley', 'Azure', 'Captain',
    'Moby', 'Wanda', 'Klaus', 'Dorothy', 'Cleo', 'Blinky', 'Spot', 'Stripe'
  ];

  // State
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrame: number;
  let fish = $state<Fish[]>([]);
  let food = $state<Food[]>([]);
  let bubbles = $state<Bubble[]>([]);
  let selectedFish = $state<Fish | null>(null);
  let foodCount = $state(10);
  let lastSaveTime = $state(0);
  let tankAge = $state(0); // Days since first visit

  const TANK_WIDTH = 600;
  const TANK_HEIGHT = 400;

  function generateName(): string {
    return FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)];
  }

  function createFish(x?: number, y?: number, species?: number, size?: number): Fish {
    const sp = species ?? Math.floor(Math.random() * SPECIES.length);
    return {
      id: Date.now() + Math.random(),
      x: x ?? Math.random() * (TANK_WIDTH - 100) + 50,
      y: y ?? Math.random() * (TANK_HEIGHT - 100) + 50,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 0.5,
      size: size ?? 10 + Math.random() * 10,
      maxSize: 30 + Math.random() * 20,
      age: 0,
      species: sp,
      name: generateName(),
      direction: Math.random() > 0.5 ? 1 : -1,
      swimPhase: Math.random() * Math.PI * 2,
      hunger: 50,
      lastFed: Date.now(),
      born: Date.now()
    };
  }

  function loadState() {
    if (!browser) return;
    const saved = localStorage.getItem('bookfair-fishtank');
    if (saved) {
      const data = JSON.parse(saved);
      fish = data.fish || [];
      foodCount = data.foodCount ?? 10;
      lastSaveTime = data.lastSaveTime || Date.now();
      tankAge = data.tankAge || 0;

      // Calculate time passed and apply changes
      const now = Date.now();
      const hoursPassed = (now - lastSaveTime) / (1000 * 60 * 60);

      // Fish grow and get hungry while away
      fish = fish.map(f => {
        const growth = Math.min(hoursPassed * 0.5, f.maxSize - f.size);
        const hungerIncrease = hoursPassed * 10;
        return {
          ...f,
          size: Math.min(f.maxSize, f.size + growth),
          age: f.age + hoursPassed / 24,
          hunger: Math.max(0, f.hunger - hungerIncrease)
        };
      });

      // Very hungry fish might die :(
      const survivors = fish.filter(f => f.hunger > 0 || Math.random() > 0.3);
      if (survivors.length < fish.length) {
        playSound('sad', 0.3);
      }
      fish = survivors;

      // Regenerate food over time
      foodCount = Math.min(20, foodCount + Math.floor(hoursPassed));

      // Tank ages
      tankAge += hoursPassed / 24;

      saveState();
    } else {
      // First visit - start with 3 fish
      fish = [createFish(), createFish(), createFish()];
      saveState();
    }
  }

  function saveState() {
    if (!browser) return;
    lastSaveTime = Date.now();
    localStorage.setItem('bookfair-fishtank', JSON.stringify({
      fish,
      foodCount,
      lastSaveTime,
      tankAge
    }));
  }

  function dropFood(e: MouseEvent) {
    if (foodCount <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TANK_WIDTH;

    food = [...food, {
      x,
      y: 20,
      vy: 0.5 + Math.random() * 0.5,
      size: 3
    }];

    foodCount--;
    playSound('click', 0.2);
  }

  function clickFish(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TANK_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * TANK_HEIGHT;

    // Check if clicked on a fish
    for (const f of fish) {
      const dx = x - f.x;
      const dy = y - f.y;
      if (Math.sqrt(dx * dx + dy * dy) < f.size * 1.5) {
        selectedFish = f;
        playSound('click', 0.3);
        return;
      }
    }

    selectedFish = null;
    dropFood(e);
  }

  function update() {
    // Update bubbles
    bubbles = bubbles
      .map(b => ({
        ...b,
        y: b.y - b.speed,
        x: b.x + Math.sin(b.wobble + b.y * 0.05) * 0.5
      }))
      .filter(b => b.y > -10);

    // Spawn new bubbles from decorations
    if (Math.random() < 0.02) {
      bubbles = [...bubbles, {
        x: 100 + Math.random() * 50,
        y: TANK_HEIGHT - 30,
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1,
        wobble: Math.random() * Math.PI * 2
      }];
    }

    // Update food
    food = food
      .map(f => ({
        ...f,
        y: f.y + f.vy
      }))
      .filter(f => f.y < TANK_HEIGHT - 30);

    // Update fish
    fish = fish.map(f => {
      let { x, y, vx, vy, direction, swimPhase, size, hunger, maxSize, age } = f;

      // Swim phase for animation
      swimPhase += 0.2;

      // Check for food nearby
      let targetFood: Food | null = null;
      let minDist = 100;
      for (const fd of food) {
        const dist = Math.sqrt((fd.x - x) ** 2 + (fd.y - y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          targetFood = fd;
        }
      }

      if (targetFood && hunger < 80) {
        // Move toward food
        const dx = targetFood.x - x;
        const dy = targetFood.y - y;
        vx += dx * 0.01;
        vy += dy * 0.01;

        // Eat food if close enough
        if (minDist < size) {
          food = food.filter(fd => fd !== targetFood);
          hunger = Math.min(100, hunger + 20);
          size = Math.min(maxSize, size + 0.5);
          f.lastFed = Date.now();
          playSound('pop', 0.2);
        }
      } else {
        // Random swimming
        vx += (Math.random() - 0.5) * 0.1;
        vy += (Math.random() - 0.5) * 0.05;
      }

      // Speed limits
      const speed = Math.sqrt(vx * vx + vy * vy);
      const maxSpeed = 2 + (1 - size / maxSize); // Smaller = faster
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
      }

      // Update position
      x += vx;
      y += vy;

      // Update direction
      if (vx > 0.1) direction = 1;
      else if (vx < -0.1) direction = -1;

      // Boundary bounce
      const margin = size;
      if (x < margin) { x = margin; vx = Math.abs(vx); }
      if (x > TANK_WIDTH - margin) { x = TANK_WIDTH - margin; vx = -Math.abs(vx); }
      if (y < margin + 20) { y = margin + 20; vy = Math.abs(vy); }
      if (y > TANK_HEIGHT - margin - 40) { y = TANK_HEIGHT - margin - 40; vy = -Math.abs(vy); }

      // Slow hunger decrease
      hunger = Math.max(0, hunger - 0.001);

      // Slow growth when well-fed
      if (hunger > 50) {
        size = Math.min(maxSize, size + 0.001);
      }

      // Age increases
      age += 0.00001;

      return { ...f, x, y, vx, vy, direction, swimPhase, size, hunger, age };
    });

    // Breeding - if two fish are close, well-fed, and we have room
    if (fish.length < 12) {
      for (let i = 0; i < fish.length; i++) {
        for (let j = i + 1; j < fish.length; j++) {
          const f1 = fish[i];
          const f2 = fish[j];
          const dist = Math.sqrt((f1.x - f2.x) ** 2 + (f1.y - f2.y) ** 2);

          if (dist < 30 && f1.hunger > 70 && f2.hunger > 70 && f1.size > 25 && f2.size > 25) {
            if (Math.random() < 0.0005) { // Rare event
              // Baby fish!
              const species = Math.random() > 0.5 ? f1.species : f2.species;
              const baby = createFish(
                (f1.x + f2.x) / 2,
                (f1.y + f2.y) / 2,
                species,
                8
              );
              fish = [...fish, baby];
              playSound('powerup', 0.3);

              // Parents get tired
              fish = fish.map(f =>
                f.id === f1.id || f.id === f2.id
                  ? { ...f, hunger: f.hunger - 30 }
                  : f
              );
            }
          }
        }
      }
    }

    // Auto-save periodically
    if (Date.now() - lastSaveTime > 30000) {
      saveState();
    }
  }

  function draw() {
    if (!ctx) return;

    // Clear with water gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, TANK_HEIGHT);
    gradient.addColorStop(0, '#1a5276');
    gradient.addColorStop(0.3, '#2980b9');
    gradient.addColorStop(1, '#1a3c5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);

    // Water surface shimmer
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < TANK_WIDTH; i += 20) {
      const offset = Math.sin(Date.now() * 0.002 + i * 0.1) * 3;
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(i, 10 + offset, 15, 5);
    }
    ctx.restore();

    // Sand bottom
    const sandGrad = ctx.createLinearGradient(0, TANK_HEIGHT - 40, 0, TANK_HEIGHT);
    sandGrad.addColorStop(0, '#f4d03f');
    sandGrad.addColorStop(1, '#d4ac0d');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, TANK_HEIGHT - 40, TANK_WIDTH, 40);

    // Pebbles
    ctx.fillStyle = '#7f8c8d';
    for (let i = 0; i < TANK_WIDTH; i += 30) {
      ctx.beginPath();
      ctx.ellipse(i + Math.sin(i) * 10, TANK_HEIGHT - 35 + Math.cos(i) * 3, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Seaweed
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 4;
    for (let wx = 50; wx < TANK_WIDTH; wx += 80) {
      ctx.beginPath();
      ctx.moveTo(wx, TANK_HEIGHT - 40);
      for (let wy = TANK_HEIGHT - 40; wy > TANK_HEIGHT - 120; wy -= 10) {
        const wobble = Math.sin(Date.now() * 0.003 + wx * 0.1 + wy * 0.05) * 10;
        ctx.lineTo(wx + wobble, wy);
      }
      ctx.stroke();
    }

    // Treasure chest decoration
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(450, TANK_HEIGHT - 60, 40, 25);
    ctx.fillStyle = '#d4ac0d';
    ctx.fillRect(460, TANK_HEIGHT - 55, 20, 5);

    // Castle decoration
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(80, TANK_HEIGHT - 80, 60, 45);
    ctx.fillRect(90, TANK_HEIGHT - 100, 15, 25);
    ctx.fillRect(115, TANK_HEIGHT - 100, 15, 25);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(100, TANK_HEIGHT - 55, 20, 20);

    // Bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }

    // Food
    ctx.fillStyle = '#e74c3c';
    for (const f of food) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fish
    for (const f of fish) {
      drawFish(f);
    }

    // Tank frame
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, TANK_WIDTH, TANK_HEIGHT);

    // Glass reflection
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(100, 10);
    ctx.lineTo(10, 150);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFish(f: Fish) {
    const species = SPECIES[f.species];
    const { x, y, size, direction, swimPhase } = f;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);

    // Tail wag
    const tailWag = Math.sin(swimPhase) * 0.3;

    // Body
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pattern
    if (species.pattern === 'striped') {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = -size * 0.6; i < size * 0.6; i += 6) {
        ctx.fillRect(i, -size * 0.5, 2, size);
      }
    } else if (species.pattern === 'spotted') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-size * 0.3 + i * size * 0.3, (i % 2 - 0.5) * size * 0.3, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (species.pattern === 'neon') {
      ctx.fillStyle = '#ff1493';
      ctx.fillRect(-size * 0.8, -2, size * 1.2, 4);
    } else if (species.pattern === 'clown') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-size * 0.5, -size * 0.6, 4, size * 1.2);
      ctx.fillRect(size * 0.2, -size * 0.6, 4, size * 1.2);
    }

    // Tail
    ctx.fillStyle = species.tailColor;
    ctx.save();
    ctx.translate(-size, 0);
    ctx.rotate(tailWag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.6, -size * 0.4);
    ctx.lineTo(-size * 0.6, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dorsal fin
    ctx.fillStyle = species.finColor;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.5);
    ctx.quadraticCurveTo(0, -size * 0.9, size * 0.3, -size * 0.5);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.5, -size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(size * 0.55, -size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hunger indicator if selected
    if (selectedFish && selectedFish.id === f.id) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function gameLoop() {
    update();
    draw();
    animationFrame = requestAnimationFrame(gameLoop);
  }

  function buyFood() {
    foodCount = Math.min(20, foodCount + 5);
    playSound('powerup', 0.3);
    saveState();
  }

  onMount(() => {
    loadState();

    if (canvas) {
      ctx = canvas.getContext('2d')!;
      gameLoop();
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      saveState();
    };
  });

  onDestroy(() => {
    saveState();
  });
</script>

<div class="fishtank-container">
  <button class="close-btn" onclick={onClose}>✕</button>

  <div class="tank-wrapper">
    <div class="tank-header">
      <h2>🐠 My Fish Tank 🐠</h2>
      <p class="tank-age">Tank age: {Math.floor(tankAge)} days</p>
    </div>

    <canvas
      bind:this={canvas}
      width={TANK_WIDTH}
      height={TANK_HEIGHT}
      onclick={clickFish}
      class="tank-canvas"
    ></canvas>

    <div class="tank-controls">
      <div class="food-section">
        <span class="food-icon">🐟</span>
        <span class="food-count">{foodCount}</span>
        <button class="buy-btn" onclick={buyFood}>+5 Food</button>
      </div>

      <div class="fish-count">
        Fish: {fish.length} / 12
      </div>

      <div class="hint">
        Click to drop food · Click fish for info
      </div>
    </div>

    {#if selectedFish}
      <div class="fish-info">
        <h3 style="color: {SPECIES[selectedFish.species].bodyColor}">
          {selectedFish.name}
        </h3>
        <p class="species">{SPECIES[selectedFish.species].name}</p>

        <div class="stat">
          <span class="label">Size:</span>
          <div class="bar">
            <div class="fill" style="width: {(selectedFish.size / selectedFish.maxSize) * 100}%; background: #3498db;"></div>
          </div>
          <span class="value">{Math.floor(selectedFish.size)}/{Math.floor(selectedFish.maxSize)}</span>
        </div>

        <div class="stat">
          <span class="label">Hunger:</span>
          <div class="bar">
            <div
              class="fill"
              style="
                width: {selectedFish.hunger}%;
                background: {selectedFish.hunger < 30 ? '#e74c3c' : selectedFish.hunger < 60 ? '#f39c12' : '#27ae60'};
              "
            ></div>
          </div>
          <span class="value">{Math.floor(selectedFish.hunger)}%</span>
        </div>

        <div class="stat">
          <span class="label">Age:</span>
          <span class="value">{selectedFish.age.toFixed(1)} days</span>
        </div>

        <button class="close-info" onclick={() => selectedFish = null}>×</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .fishtank-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    cursor: pointer;
    border-radius: 50%;
    z-index: 100;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .tank-wrapper {
    max-width: 100%;
  }

  .tank-header {
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .tank-header h2 {
    color: #3498db;
    font-size: 1.2rem;
    margin: 0;
  }

  .tank-age {
    color: #7f8c8d;
    font-size: 0.5rem;
    margin: 0;
  }

  .tank-canvas {
    border: 8px solid #5d4e37;
    border-radius: 8px;
    cursor: pointer;
    max-width: 100%;
    height: auto;
    box-shadow:
      inset 0 0 30px rgba(0, 0, 0, 0.5),
      0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .tank-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #2c3e50;
    padding: 0.5rem 1rem;
    border-radius: 0 0 8px 8px;
    margin-top: -4px;
  }

  .food-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .food-icon {
    font-size: 1.2rem;
  }

  .food-count {
    color: #f1c40f;
    font-size: 1rem;
    font-weight: bold;
  }

  .buy-btn {
    background: #27ae60;
    color: white;
    border: 2px solid #1e8449;
    padding: 0.25rem 0.5rem;
    font-size: 0.5rem;
    cursor: pointer;
  }

  .buy-btn:hover {
    background: #2ecc71;
  }

  .fish-count {
    color: #ecf0f1;
    font-size: 0.6rem;
  }

  .hint {
    color: #7f8c8d;
    font-size: 0.45rem;
  }

  .fish-info {
    position: absolute;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(44, 62, 80, 0.95);
    border: 2px solid #3498db;
    border-radius: 8px;
    padding: 1rem;
    min-width: 200px;
  }

  .fish-info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }

  .species {
    color: #bdc3c7;
    font-size: 0.5rem;
    margin: 0 0 0.5rem 0;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.5rem;
  }

  .stat .label {
    color: #bdc3c7;
    width: 50px;
  }

  .stat .bar {
    flex: 1;
    height: 8px;
    background: #34495e;
    border-radius: 4px;
    overflow: hidden;
  }

  .stat .fill {
    height: 100%;
    transition: width 0.3s;
  }

  .stat .value {
    color: #ecf0f1;
    width: 50px;
    text-align: right;
  }

  .close-info {
    position: absolute;
    top: 4px;
    right: 4px;
    background: none;
    border: none;
    color: #7f8c8d;
    cursor: pointer;
    font-size: 1rem;
  }

  @media (max-width: 650px) {
    .tank-canvas {
      max-width: calc(100vw - 2rem);
    }

    .tank-controls {
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .hint {
      width: 100%;
      text-align: center;
    }
  }
</style>
