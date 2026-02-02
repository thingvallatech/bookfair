<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Beanie hunt
  const hidingSpots: HidingSpot[] = [{ id: 'under-maze' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Canvas
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrame: number;
  let containerEl: HTMLDivElement;

  // Game dimensions - computed on mount
  let mazeSize = 400;
  let offsetX = 0;
  let offsetY = 0;
  let canvasLogicalW = 400;
  let canvasLogicalH = 400;

  // Cached wood background
  let woodCanvas: HTMLCanvasElement | null = null;

  // Game state
  let gameState = $state<'playing' | 'won' | 'falling'>('playing');
  let level = $state(0);
  let timer = $state(0);
  let timerInterval: number;
  let bestTimes = $state<(number | null)[]>([null, null, null]);

  const STORAGE_KEY = 'bookfair_marblemaze_best';

  // Physics
  let ballX = 0;
  let ballY = 0;
  let ballVX = 0;
  let ballVY = 0;
  const ballRadius = 7;
  const friction = 0.985;
  const bounceDamping = 0.5;
  const maxSpeed = 5;
  const tiltSensitivity = 0.15;

  // Tilt from input
  let tiltX = 0; // -1 to 1
  let tiltY = 0; // -1 to 1

  // Start position for reset
  let startX = 0;
  let startY = 0;

  // Falling animation
  let fallingHoleX = 0;
  let fallingHoleY = 0;
  let fallingProgress = 0;

  // Mouse tracking
  let useAccelerometer = $state(false);

  // Level definitions
  // Each level is a set of walls, holes, start position, and goal position
  // Coordinates are in a 0-400 unit space
  interface Wall {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  interface Hole {
    x: number;
    y: number;
    r: number;
  }

  interface Goal {
    x: number;
    y: number;
    r: number;
  }

  interface MazeLevel {
    name: string;
    walls: Wall[];
    holes: Hole[];
    goal: Goal;
    start: { x: number; y: number };
  }

  const wallThickness = 8;
  const w = wallThickness;

  const levels: MazeLevel[] = [
    // Easy
    {
      name: 'Easy',
      start: { x: 40, y: 40 },
      goal: { x: 360, y: 360, r: 14 },
      walls: [
        // Outer border
        { x: 10, y: 10, w: 380, h: w },
        { x: 10, y: 10, w: w, h: 380 },
        { x: 10, y: 382, w: 380, h: w },
        { x: 382, y: 10, w: w, h: 380 },
        // Interior walls - simple path
        { x: 80, y: 10, w: w, h: 120 },
        { x: 10, y: 130, w: 140, h: w },
        { x: 150, y: 70, w: w, h: 140 },
        { x: 150, y: 200, w: 160, h: w },
        { x: 80, y: 270, w: 230, h: w },
        { x: 80, y: 270, w: w, h: 120 },
        { x: 230, y: 130, w: w, h: 80 },
        { x: 230, y: 130, w: 100, h: w },
        { x: 310, y: 270, w: w, h: 60 },
        { x: 160, y: 340, w: 160, h: w },
      ],
      holes: [
        { x: 120, y: 80, r: 10 },
        { x: 200, y: 240, r: 10 },
        { x: 280, y: 170, r: 10 },
      ],
    },
    // Medium
    {
      name: 'Medium',
      start: { x: 40, y: 40 },
      goal: { x: 360, y: 360, r: 12 },
      walls: [
        // Outer border
        { x: 10, y: 10, w: 380, h: w },
        { x: 10, y: 10, w: w, h: 380 },
        { x: 10, y: 382, w: 380, h: w },
        { x: 382, y: 10, w: w, h: 380 },
        // Row 1
        { x: 70, y: 10, w: w, h: 70 },
        { x: 140, y: 50, w: w, h: 90 },
        { x: 10, y: 80, w: 70, h: w },
        { x: 210, y: 10, w: w, h: 60 },
        { x: 210, y: 70, w: 110, h: w },
        { x: 310, y: 10, w: w, h: 70 },
        // Row 2
        { x: 70, y: 140, w: 80, h: w },
        { x: 210, y: 140, w: w, h: 80 },
        { x: 280, y: 140, w: 110, h: w },
        { x: 280, y: 140, w: w, h: 80 },
        { x: 10, y: 200, w: 140, h: w },
        { x: 140, y: 200, w: w, h: 80 },
        // Row 3
        { x: 70, y: 270, w: 80, h: w },
        { x: 70, y: 200, w: w, h: 78 },
        { x: 210, y: 220, w: 80, h: w },
        { x: 210, y: 270, w: w, h: 60 },
        { x: 310, y: 220, w: w, h: 100 },
        { x: 140, y: 340, w: 120, h: w },
        { x: 310, y: 320, w: 80, h: w },
        // Row 4
        { x: 70, y: 340, w: w, h: 50 },
        { x: 260, y: 340, w: w, h: 50 },
      ],
      holes: [
        { x: 110, y: 110, r: 9 },
        { x: 175, y: 170, r: 9 },
        { x: 250, y: 110, r: 9 },
        { x: 350, y: 180, r: 9 },
        { x: 110, y: 240, r: 9 },
        { x: 250, y: 300, r: 9 },
        { x: 170, y: 370, r: 9 },
      ],
    },
    // Hard
    {
      name: 'Hard',
      start: { x: 40, y: 40 },
      goal: { x: 360, y: 360, r: 11 },
      walls: [
        // Outer border
        { x: 10, y: 10, w: 380, h: w },
        { x: 10, y: 10, w: w, h: 380 },
        { x: 10, y: 382, w: 380, h: w },
        { x: 382, y: 10, w: w, h: 380 },
        // Dense maze
        { x: 60, y: 10, w: w, h: 50 },
        { x: 120, y: 10, w: w, h: 50 },
        { x: 180, y: 30, w: w, h: 50 },
        { x: 240, y: 10, w: w, h: 50 },
        { x: 300, y: 30, w: w, h: 50 },
        { x: 360, y: 10, w: w, h: 60 },
        { x: 10, y: 60, w: 60, h: w },
        { x: 90, y: 80, w: 40, h: w },
        { x: 150, y: 60, w: 40, h: w },
        { x: 210, y: 80, w: 80, h: w },
        { x: 330, y: 70, w: 60, h: w },

        { x: 60, y: 60, w: w, h: 60 },
        { x: 120, y: 80, w: w, h: 60 },
        { x: 180, y: 80, w: w, h: 50 },
        { x: 240, y: 80, w: w, h: 60 },
        { x: 300, y: 80, w: w, h: 50 },

        { x: 10, y: 130, w: 60, h: w },
        { x: 90, y: 140, w: 100, h: w },
        { x: 240, y: 140, w: 80, h: w },
        { x: 340, y: 130, w: 50, h: w },

        { x: 60, y: 130, w: w, h: 70 },
        { x: 120, y: 140, w: w, h: 50 },
        { x: 180, y: 130, w: w, h: 60 },
        { x: 310, y: 130, w: w, h: 70 },
        { x: 360, y: 130, w: w, h: 60 },

        { x: 10, y: 200, w: 60, h: w },
        { x: 90, y: 190, w: 40, h: w },
        { x: 150, y: 200, w: 70, h: w },
        { x: 240, y: 200, w: 80, h: w },
        { x: 360, y: 190, w: 30, h: w },

        { x: 60, y: 200, w: w, h: 60 },
        { x: 120, y: 190, w: w, h: 60 },
        { x: 180, y: 200, w: w, h: 60 },
        { x: 240, y: 200, w: w, h: 60 },
        { x: 300, y: 200, w: w, h: 60 },

        { x: 10, y: 260, w: 60, h: w },
        { x: 90, y: 260, w: 100, h: w },
        { x: 230, y: 260, w: 80, h: w },
        { x: 340, y: 260, w: 50, h: w },

        { x: 60, y: 260, w: w, h: 60 },
        { x: 120, y: 260, w: w, h: 60 },
        { x: 180, y: 260, w: w, h: 70 },
        { x: 310, y: 260, w: w, h: 60 },
        { x: 360, y: 260, w: w, h: 50 },

        { x: 10, y: 320, w: 60, h: w },
        { x: 90, y: 330, w: 100, h: w },
        { x: 230, y: 320, w: 80, h: w },
        { x: 340, y: 310, w: 50, h: w },

        { x: 60, y: 320, w: w, h: 70 },
        { x: 120, y: 330, w: w, h: 60 },
        { x: 180, y: 330, w: w, h: 60 },
        { x: 240, y: 320, w: w, h: 70 },
        { x: 310, y: 320, w: w, h: 70 },
      ],
      holes: [
        { x: 90, y: 45, r: 8 },
        { x: 160, y: 110, r: 8 },
        { x: 270, y: 50, r: 8 },
        { x: 350, y: 100, r: 8 },
        { x: 40, y: 165, r: 8 },
        { x: 150, y: 165, r: 8 },
        { x: 270, y: 170, r: 8 },
        { x: 90, y: 225, r: 8 },
        { x: 210, y: 230, r: 8 },
        { x: 350, y: 230, r: 8 },
        { x: 40, y: 290, r: 8 },
        { x: 150, y: 295, r: 8 },
        { x: 270, y: 290, r: 8 },
        { x: 90, y: 360, r: 8 },
        { x: 210, y: 360, r: 8 },
      ],
    },
  ];

  const levelNames = ['Easy', 'Medium', 'Hard'];

  function loadBestTimes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        bestTimes = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  function saveBestTime(lvl: number, time: number) {
    if (bestTimes[lvl] === null || time < bestTimes[lvl]!) {
      bestTimes[lvl] = time;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bestTimes));
      } catch {
        // ignore
      }
    }
  }

  function resetBall() {
    const maze = levels[level];
    const scale = mazeSize / 400;
    startX = maze.start.x * scale;
    startY = maze.start.y * scale;
    ballX = startX;
    ballY = startY;
    ballVX = 0;
    ballVY = 0;
    tiltX = 0;
    tiltY = 0;
  }

  function startLevel(lvl: number) {
    playSound('click', 0.2);
    level = lvl;
    gameState = 'playing';
    timer = 0;
    clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      if (gameState === 'playing') {
        timer += 10;
      }
    }, 10);
    resetBall();
  }

  function resetGame() {
    playSound('click', 0.2);
    gameState = 'playing';
    timer = 0;
    clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      if (gameState === 'playing') {
        timer += 10;
      }
    }, 10);
    resetBall();
  }

  function formatTime(ms: number): string {
    const secs = Math.floor(ms / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${secs}.${centis.toString().padStart(2, '0')}s`;
  }

  // Collision detection with scaled walls
  function checkWallCollision(nx: number, ny: number, scale: number): { x: number; y: number; hitX: boolean; hitY: boolean } {
    const maze = levels[level];
    const r = ballRadius;
    let hitX = false;
    let hitY = false;
    let resultX = nx;
    let resultY = ny;

    for (const wall of maze.walls) {
      const wx = wall.x * scale;
      const wy = wall.y * scale;
      const ww = wall.w * scale;
      const wh = wall.h * scale;

      // Check if ball overlaps wall rectangle
      const closestX = Math.max(wx, Math.min(resultX, wx + ww));
      const closestY = Math.max(wy, Math.min(resultY, wy + wh));
      const distX = resultX - closestX;
      const distY = resultY - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < r) {
        // Push ball out of wall
        if (dist === 0) {
          // Ball center is inside wall - push out the shortest direction
          const overlapLeft = (resultX + r) - wx;
          const overlapRight = (wx + ww) - (resultX - r);
          const overlapTop = (resultY + r) - wy;
          const overlapBottom = (wy + wh) - (resultY - r);

          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft) { resultX = wx - r; hitX = true; }
          else if (minOverlap === overlapRight) { resultX = wx + ww + r; hitX = true; }
          else if (minOverlap === overlapTop) { resultY = wy - r; hitY = true; }
          else { resultY = wy + wh + r; hitY = true; }
        } else {
          const overlap = r - dist;
          const pushX = (distX / dist) * overlap;
          const pushY = (distY / dist) * overlap;
          resultX += pushX;
          resultY += pushY;

          // Determine which axis was primarily hit
          if (Math.abs(distX) > Math.abs(distY)) {
            hitX = true;
          } else {
            hitY = true;
          }
        }
      }
    }

    return { x: resultX, y: resultY, hitX, hitY };
  }

  function checkHoleCollision(scale: number): Hole | null {
    const maze = levels[level];
    for (const hole of maze.holes) {
      const hx = hole.x * scale;
      const hy = hole.y * scale;
      const hr = hole.r * scale;
      const dx = ballX - hx;
      const dy = ballY - hy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hr * 0.6) {
        return hole;
      }
    }
    return null;
  }

  function checkGoalCollision(scale: number): boolean {
    const maze = levels[level];
    const gx = maze.goal.x * scale;
    const gy = maze.goal.y * scale;
    const gr = maze.goal.r * scale;
    const dx = ballX - gx;
    const dy = ballY - gy;
    return Math.sqrt(dx * dx + dy * dy) < gr;
  }

  // Physics update
  function updatePhysics() {
    if (gameState !== 'playing') return;

    const scale = mazeSize / 400;

    // Apply tilt as acceleration
    ballVX += tiltX * tiltSensitivity;
    ballVY += tiltY * tiltSensitivity;

    // Friction
    ballVX *= friction;
    ballVY *= friction;

    // Clamp speed
    const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    if (speed > maxSpeed) {
      ballVX = (ballVX / speed) * maxSpeed;
      ballVY = (ballVY / speed) * maxSpeed;
    }

    // Move
    let nx = ballX + ballVX;
    let ny = ballY + ballVY;

    // Wall collision
    const collision = checkWallCollision(nx, ny, scale);
    if (collision.hitX) {
      ballVX *= -bounceDamping;
      playSound('pop', 0.15);
    }
    if (collision.hitY) {
      ballVY *= -bounceDamping;
      playSound('pop', 0.15);
    }
    ballX = collision.x;
    ballY = collision.y;

    // Hole check
    const hole = checkHoleCollision(scale);
    if (hole) {
      gameState = 'falling';
      fallingHoleX = hole.x * scale;
      fallingHoleY = hole.y * scale;
      fallingProgress = 0;
      playSound('error', 0.3);
    }

    // Goal check
    if (checkGoalCollision(scale)) {
      gameState = 'won';
      clearInterval(timerInterval);
      saveBestTime(level, timer);
      playSound('success', 0.4);
    }
  }

  // Draw functions
  function generateWoodBackground(w: number, h: number): HTMLCanvasElement {
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d')!;

    // Wood base color
    offCtx.fillStyle = '#c4956a';
    offCtx.fillRect(0, 0, w, h);

    // Wood grain lines
    offCtx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
    offCtx.lineWidth = 1;
    for (let i = 0; i < h; i += 3 + Math.random() * 4) {
      offCtx.beginPath();
      offCtx.moveTo(0, i);
      let x = 0;
      while (x < w) {
        x += 10 + Math.random() * 20;
        const wobble = (Math.random() - 0.5) * 2;
        offCtx.lineTo(x, i + wobble);
      }
      offCtx.stroke();
    }

    return offscreen;
  }

  function drawWoodBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!woodCanvas || woodCanvas.width !== w || woodCanvas.height !== h) {
      woodCanvas = generateWoodBackground(w, h);
    }
    ctx.drawImage(woodCanvas, 0, 0);
  }

  function drawPlasticFrame(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, mx: number, my: number, ms: number) {
    const frameWidth = 20;

    // Outer frame - light blue translucent plastic
    const gradient = ctx.createLinearGradient(mx - frameWidth, my - frameWidth, mx + ms + frameWidth, my + ms + frameWidth);
    gradient.addColorStop(0, 'rgba(173, 216, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(200, 230, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(230, 245, 255, 0.9)');
    gradient.addColorStop(0.7, 'rgba(200, 230, 255, 0.95)');
    gradient.addColorStop(1, 'rgba(160, 200, 240, 0.9)');

    ctx.fillStyle = gradient;
    // Top
    ctx.fillRect(mx - frameWidth, my - frameWidth, ms + frameWidth * 2, frameWidth);
    // Bottom
    ctx.fillRect(mx - frameWidth, my + ms, ms + frameWidth * 2, frameWidth);
    // Left
    ctx.fillRect(mx - frameWidth, my, frameWidth, ms);
    // Right
    ctx.fillRect(mx + ms, my, frameWidth, ms);

    // Inner bevel - highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - frameWidth + 2, my - frameWidth + 2, ms + frameWidth * 2 - 4, ms + frameWidth * 2 - 4);

    // Outer bevel - shadow
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - frameWidth, my - frameWidth, ms + frameWidth * 2, ms + frameWidth * 2);

    // Shine line across top
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx - frameWidth + 8, my - frameWidth + 6);
    ctx.lineTo(mx + ms + frameWidth - 8, my - frameWidth + 6);
    ctx.stroke();

    // Inner edge highlight
    ctx.strokeStyle = 'rgba(100, 140, 180, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 1, my - 1, ms + 2, ms + 2);
  }

  function drawWall(ctx: CanvasRenderingContext2D, wall: Wall, scale: number) {
    const x = wall.x * scale;
    const y = wall.y * scale;
    const ww = wall.w * scale;
    const wh = wall.h * scale;

    // Main wall color
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, y, ww, wh);

    // Top/left highlight for 3D bevel
    ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
    ctx.fillRect(x, y, ww, Math.max(1, wh * 0.2));
    ctx.fillRect(x, y, Math.max(1, ww * 0.2), wh);

    // Bottom/right shadow for 3D bevel
    ctx.fillStyle = 'rgba(60, 30, 0, 0.4)';
    ctx.fillRect(x, y + wh - Math.max(1, wh * 0.2), ww, Math.max(1, wh * 0.2));
    ctx.fillRect(x + ww - Math.max(1, ww * 0.2), y, Math.max(1, ww * 0.2), wh);
  }

  function drawHole(ctx: CanvasRenderingContext2D, hole: Hole, scale: number) {
    const hx = hole.x * scale;
    const hy = hole.y * scale;
    const hr = hole.r * scale;

    // Black hole with gradient edge
    const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.7, '#1a1a1a');
    grad.addColorStop(1, '#333');

    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle shadow ring around hole
    ctx.beginPath();
    ctx.arc(hx, hy, hr + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawGoal(ctx: CanvasRenderingContext2D, goal: Goal, scale: number, time: number) {
    const gx = goal.x * scale;
    const gy = goal.y * scale;
    const gr = goal.r * scale;

    // Pulsing green glow
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);

    // Outer glow
    const glowGrad = ctx.createRadialGradient(gx, gy, gr * 0.5, gx, gy, gr * 2);
    glowGrad.addColorStop(0, `rgba(0, 255, 100, ${0.3 * pulse})`);
    glowGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
    ctx.beginPath();
    ctx.arc(gx, gy, gr * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Goal circle
    const goalGrad = ctx.createRadialGradient(gx - gr * 0.2, gy - gr * 0.2, 0, gx, gy, gr);
    goalGrad.addColorStop(0, '#5eff5e');
    goalGrad.addColorStop(0.6, '#2ecc40');
    goalGrad.addColorStop(1, '#1a8a1a');

    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fillStyle = goalGrad;
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(0, 100, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tiltXVal: number, tiltYVal: number, scaleFactor: number = 1) {
    const r = radius * scaleFactor;
    if (r <= 0) return;

    // Shadow (offset by tilt)
    const shadowOffX = tiltXVal * 3;
    const shadowOffY = tiltYVal * 3;
    ctx.beginPath();
    ctx.arc(x + shadowOffX + 2, y + shadowOffY + 2, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    // Metallic ball - steel/silver gradient
    const highlightX = x - r * 0.3 - tiltXVal * 2;
    const highlightY = y - r * 0.3 - tiltYVal * 2;
    const ballGrad = ctx.createRadialGradient(highlightX, highlightY, 0, x, y, r);
    ballGrad.addColorStop(0, '#f0f0f0');
    ballGrad.addColorStop(0.2, '#d8d8d8');
    ballGrad.addColorStop(0.5, '#b0b0b0');
    ballGrad.addColorStop(0.8, '#808080');
    ballGrad.addColorStop(1, '#606060');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(highlightX, highlightY, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Subtle rim
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Main render
  let lastTime = 0;
  let animTime = 0;

  function render(timestamp: number) {
    if (!ctx || !canvas) return;

    const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
    lastTime = timestamp;
    animTime += dt;

    const cw = canvasLogicalW;
    const ch = canvasLogicalH;
    const scale = mazeSize / 400;

    // Update physics
    if (gameState === 'playing') {
      updatePhysics();
    } else if (gameState === 'falling') {
      fallingProgress += dt * 2.5;
      // Move ball toward hole
      ballX += (fallingHoleX - ballX) * 0.15;
      ballY += (fallingHoleY - ballY) * 0.15;

      if (fallingProgress >= 1) {
        gameState = 'playing';
        resetBall();
      }
    }

    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Background (dark)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, cw, ch);

    // Save for maze area clipping
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw wood background for maze
    drawWoodBackground(ctx, mazeSize, mazeSize);

    // Draw goal
    drawGoal(ctx, levels[level].goal, scale, animTime);

    // Draw holes
    for (const hole of levels[level].holes) {
      drawHole(ctx, hole, scale);
    }

    // Draw walls
    for (const wall of levels[level].walls) {
      drawWall(ctx, wall, scale);
    }

    // Draw ball
    if (gameState === 'falling') {
      const shrink = 1 - fallingProgress;
      drawBall(ctx, ballX, ballY, ballRadius, tiltX, tiltY, shrink);
    } else if (gameState !== 'won') {
      drawBall(ctx, ballX, ballY, ballRadius, tiltX, tiltY);
    }

    ctx.restore();

    // Draw plastic frame on top
    drawPlasticFrame(ctx, cw, ch, offsetX, offsetY, mazeSize);

    // Won overlay
    if (gameState === 'won') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, cw, ch);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#5eff5e';
      ctx.font = `bold ${Math.floor(cw * 0.07)}px "Press Start 2P", monospace`;
      ctx.fillText('You made it!', cw / 2, ch / 2 - 30);

      ctx.fillStyle = '#fff';
      ctx.font = `${Math.floor(cw * 0.04)}px "Press Start 2P", monospace`;
      ctx.fillText(`Time: ${formatTime(timer)}`, cw / 2, ch / 2 + 15);

      if (bestTimes[level] !== null) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `${Math.floor(cw * 0.03)}px "Press Start 2P", monospace`;
        ctx.fillText(`Best: ${formatTime(bestTimes[level]!)}`, cw / 2, ch / 2 + 50);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${Math.floor(cw * 0.025)}px "Press Start 2P", monospace`;
      ctx.fillText('Click Reset to play again', cw / 2, ch / 2 + 85);

      ctx.restore();
    }

    animationFrame = requestAnimationFrame(render);
  }

  // Input handling
  function handleMouseMove(e: MouseEvent) {
    if (useAccelerometer || gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    tiltX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
    tiltY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameState !== 'playing') return;
    const step = 0.7;
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        e.preventDefault();
        tiltX = -step;
        break;
      case 'ArrowRight':
      case 'd':
        e.preventDefault();
        tiltX = step;
        break;
      case 'ArrowUp':
      case 'w':
        e.preventDefault();
        tiltY = -step;
        break;
      case 'ArrowDown':
      case 's':
        e.preventDefault();
        tiltY = step;
        break;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        if (tiltX < 0) tiltX = 0;
        break;
      case 'ArrowRight':
      case 'd':
        if (tiltX > 0) tiltX = 0;
        break;
      case 'ArrowUp':
      case 'w':
        if (tiltY < 0) tiltY = 0;
        break;
      case 'ArrowDown':
      case 's':
        if (tiltY > 0) tiltY = 0;
        break;
    }
  }

  // Device orientation (mobile)
  let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  async function requestAccelerometer() {
    // iOS 13+ requires permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          enableAccelerometer();
        }
      } catch {
        // Permission denied, fall back to mouse/keyboard
      }
    } else {
      enableAccelerometer();
    }
  }

  function enableAccelerometer() {
    useAccelerometer = true;
    orientationHandler = (e: DeviceOrientationEvent) => {
      if (gameState !== 'playing') return;
      // gamma = left-right tilt (-90 to 90)
      // beta = front-back tilt (-180 to 180)
      const gamma = e.gamma || 0;
      const beta = e.beta || 0;
      tiltX = Math.max(-1, Math.min(1, gamma / 30));
      tiltY = Math.max(-1, Math.min(1, (beta - 30) / 30)); // offset for natural holding angle
    };
    window.addEventListener('deviceorientation', orientationHandler);
  }

  function resizeCanvas() {
    if (!canvas || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use the container size, leave room for UI
    const availW = rect.width;
    const availH = rect.height;

    canvasLogicalW = availW;
    canvasLogicalH = availH;

    canvas.style.width = availW + 'px';
    canvas.style.height = availH + 'px';
    canvas.width = availW * dpr;
    canvas.height = availH * dpr;

    ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Invalidate cached wood background on resize
    woodCanvas = null;

    // Maze fits in center with some padding
    const padding = 40;
    mazeSize = Math.min(availW - padding * 2, availH - padding * 2, 500);
    offsetX = (availW - mazeSize) / 2;
    offsetY = (availH - mazeSize) / 2;

    resetBall();
  }

  onMount(() => {
    loadBestTimes();

    // Register beanie spots
    registerSpots('marblemaze', hidingSpots);
    const beanies = getBeaniesForArea('marblemaze');
    hiddenBeanie = beanies.get('under-maze') || null;

    ctx = canvas.getContext('2d')!;
    resizeCanvas();
    startLevel(0);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Try accelerometer on mobile
    if ('ontouchstart' in window) {
      requestAccelerometer();
    }

    animationFrame = requestAnimationFrame(render);
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrame);
    clearInterval(timerInterval);
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (orientationHandler) {
      window.removeEventListener('deviceorientation', orientationHandler);
    }
  });
</script>

<div class="marble-maze" bind:this={containerEl}>
  <CloseButton {onClose} variant="light" />

  <div class="ui-bar">
    <div class="timer">
      {formatTime(timer)}
    </div>

    <div class="level-selector">
      {#each levelNames as name, i}
        <button
          class="level-btn"
          class:active={level === i}
          onclick={() => startLevel(i)}
        >
          {name}
        </button>
      {/each}
    </div>

    <button class="reset-btn" onclick={resetGame}>
      Reset
    </button>
  </div>

  <div class="canvas-area">
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="info-bar">
    {#if bestTimes[level] !== null}
      <span class="best-time">Best: {formatTime(bestTimes[level]!)}</span>
    {:else}
      <span class="best-time">Best: --</span>
    {/if}
    <span class="controls-hint">
      {#if useAccelerometer}
        Tilt to move
      {:else}
        Mouse or Arrow keys
      {/if}
    </span>
  </div>

  {#if hiddenBeanie}
    <HidingBeanie beanie={hiddenBeanie} class="maze-beanie" />
  {/if}
</div>

<style>
  .marble-maze {
    position: fixed;
    inset: 0;
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 100;
    overflow: hidden;
    font-family: 'Press Start 2P', monospace;
  }

  .ui-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top, 0));
    width: 100%;
    max-width: 600px;
    z-index: 10;
    flex-shrink: 0;
  }

  .timer {
    font-size: 14px;
    color: #ffd700;
    min-width: 80px;
    text-align: center;
    background: rgba(0, 0, 0, 0.4);
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }

  .level-selector {
    display: flex;
    gap: 4px;
  }

  .level-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #aaa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .level-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .level-btn.active {
    background: rgba(173, 216, 255, 0.3);
    border-color: rgba(173, 216, 255, 0.6);
    color: #adf;
  }

  .reset-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    padding: 6px 10px;
    background: rgba(255, 100, 100, 0.2);
    border: 1px solid rgba(255, 100, 100, 0.4);
    color: #ff9999;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .reset-btn:hover {
    background: rgba(255, 100, 100, 0.4);
    color: #fff;
  }

  .canvas-area {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .info-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 8px 16px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0));
    width: 100%;
    max-width: 600px;
    flex-shrink: 0;
    z-index: 10;
  }

  .best-time {
    font-size: 10px;
    color: #ffd700;
  }

  .controls-hint {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
  }

  :global(.maze-beanie) {
    position: absolute;
    bottom: 60px;
    left: 20px;
    z-index: 50;
  }

  @media (max-width: 480px) {
    .ui-bar {
      gap: 8px;
      padding: 8px 8px;
      padding-top: calc(8px + env(safe-area-inset-top, 0));
      flex-wrap: wrap;
    }

    .timer {
      font-size: 11px;
      padding: 4px 8px;
    }

    .level-btn {
      font-size: 7px;
      padding: 4px 6px;
    }

    .reset-btn {
      font-size: 7px;
      padding: 4px 8px;
    }

    .info-bar {
      gap: 12px;
    }

    .best-time {
      font-size: 8px;
    }

    .controls-hint {
      font-size: 7px;
    }
  }
</style>
