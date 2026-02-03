#!/usr/bin/env node

/**
 * Generate the Open Graph preview image for The Book Fair.
 * Creates a retro-styled 1200x630 PNG at static/og-preview.png.
 *
 * Uses the `canvas` npm package for high-quality rendering.
 * All icons are drawn programmatically (no emoji dependency).
 *
 * Run: node scripts/generate-og.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, '..', 'static');

const WIDTH = 1200;
const HEIGHT = 630;

// --- Simple icon drawing functions ---

function drawBook(ctx, cx, cy, size) {
  const s = size;
  // Left page
  ctx.fillStyle = '#e8d5b0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.45, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.45, cy + s * 0.35);
  ctx.lineTo(cx, cy + s * 0.15);
  ctx.closePath();
  ctx.fill();
  // Right page
  ctx.fillStyle = '#f0e0c0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.45, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.45, cy + s * 0.35);
  ctx.lineTo(cx, cy + s * 0.15);
  ctx.closePath();
  ctx.fill();
  // Spine
  ctx.strokeStyle = '#a08060';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.15);
  ctx.stroke();
}

function drawPalette(ctx, cx, cy, size) {
  const s = size;
  // Palette shape (oval)
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.4, s * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Thumb hole
  ctx.fillStyle = '#0c1024';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.15, cy + s * 0.08, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  // Paint dots
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
  const dotPositions = [
    [-0.05, -0.15], [0.15, -0.1], [0.25, 0.05], [0.1, 0.12], [-0.2, -0.05]
  ];
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(cx + dotPositions[i][0] * s, cy + dotPositions[i][1] * s, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEgg(ctx, cx, cy, size) {
  // Tamagotchi egg shape
  const s = size;
  ctx.fillStyle = '#f7d51d';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.05, s * 0.25, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Screen
  ctx.fillStyle = '#a0c4a0';
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.13, cy - s * 0.12, s * 0.26, s * 0.2, s * 0.03);
  ctx.fill();
  // Eyes on screen
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(cx - s * 0.04, cy - s * 0.04, s * 0.025, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.04, cy - s * 0.04, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Button
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.25, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

function drawMusicNote(ctx, cx, cy, size) {
  const s = size;
  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = s * 0.06;
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.08, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.25);
  ctx.stroke();
  // Note head
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.02, cy + s * 0.2, s * 0.12, s * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Flag
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.08, cy - s * 0.25);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.12, cx + s * 0.08, cy - s * 0.02);
  ctx.stroke();
}

function drawGamepad(ctx, cx, cy, size) {
  const s = size;
  // Body
  ctx.fillStyle = '#636e72';
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.38, cy - s * 0.18, s * 0.76, s * 0.36, s * 0.12);
  ctx.fill();
  // D-pad
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(cx - s * 0.27, cy - s * 0.04, s * 0.14, s * 0.08);
  ctx.fillRect(cx - s * 0.23, cy - s * 0.08, s * 0.06, s * 0.16);
  // Buttons
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(cx + s * 0.18, cy - s * 0.02, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.arc(cx + s * 0.26, cy + s * 0.02, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake(ctx, cx, cy, size) {
  const s = size;
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = s * 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.15);
  ctx.quadraticCurveTo(cx - s * 0.15, cy - s * 0.2, cx, cy + s * 0.05);
  ctx.quadraticCurveTo(cx + s * 0.15, cy + s * 0.25, cx + s * 0.3, cy - s * 0.1);
  ctx.stroke();
  // Head
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.arc(cx + s * 0.3, cy - s * 0.1, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx + s * 0.32, cy - s * 0.12, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Tongue
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.36, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.08);
  ctx.moveTo(cx + s * 0.36, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.14);
  ctx.stroke();
}

function drawMonitor(ctx, cx, cy, size) {
  const s = size;
  // Monitor body
  ctx.fillStyle = '#b2bec3';
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.35, cy - s * 0.28, s * 0.7, s * 0.46, s * 0.03);
  ctx.fill();
  // Screen
  ctx.fillStyle = '#0984e3';
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.28, cy - s * 0.22, s * 0.56, s * 0.34, s * 0.02);
  ctx.fill();
  // Stand
  ctx.fillStyle = '#636e72';
  ctx.fillRect(cx - s * 0.06, cy + s * 0.18, s * 0.12, s * 0.1);
  ctx.fillRect(cx - s * 0.15, cy + s * 0.26, s * 0.3, s * 0.04);
  // Blue screen XP hills
  ctx.fillStyle = '#00b894';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.28, cy + s * 0.12);
  ctx.quadraticCurveTo(cx - s * 0.1, cy - s * 0.02, cx + s * 0.05, cy + s * 0.12);
  ctx.quadraticCurveTo(cx + s * 0.18, cy + s * 0.02, cx + s * 0.28, cy + s * 0.12);
  ctx.fill();
}

function drawWagonWheel(ctx, cx, cy, size) {
  // Oregon Trail wagon wheel
  const s = size;
  ctx.strokeStyle = '#c87533';
  ctx.lineWidth = s * 0.06;
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  // Spokes
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * s * 0.3, cy + Math.sin(angle) * s * 0.3);
    ctx.stroke();
  }
  // Hub
  ctx.fillStyle = '#a05a20';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function generateOGImage() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // --- Background: deep dark blue with subtle gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bgGrad.addColorStop(0, '#0c1024');
  bgGrad.addColorStop(0.5, '#111832');
  bgGrad.addColorStop(1, '#0a0e1e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- Starfield: tiny dots scattered across the background ---
  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
  }
  const rng = seededRandom(42);
  for (let i = 0; i < 140; i++) {
    const x = rng() * WIDTH;
    const y = rng() * HEIGHT * 0.78;
    const radius = rng() * 1.3 + 0.3;
    const alpha = rng() * 0.5 + 0.15;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
    ctx.fill();
  }

  // --- Subtle vignette overlay ---
  const vignetteGrad = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, WIDTH * 0.2,
    WIDTH / 2, HEIGHT / 2, WIDTH * 0.7
  );
  vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- Top row: drawn icons representing toys ---
  const topIcons = [
    drawBook, drawPalette, drawEgg, drawMusicNote, drawGamepad, drawSnake, drawMonitor,
  ];
  const iconY = 105;
  const iconSpacing = WIDTH / (topIcons.length + 1);
  const iconSize = 55;

  for (let i = 0; i < topIcons.length; i++) {
    const x = iconSpacing * (i + 1);
    ctx.save();
    // Subtle golden glow behind each icon
    ctx.shadowColor = 'rgba(247, 213, 29, 0.35)';
    ctx.shadowBlur = 18;
    topIcons[i](ctx, x, iconY, iconSize);
    ctx.restore();
  }

  // --- Main title: "The Book Fair" ---
  const titleY = 240;

  // Title shadow/glow
  ctx.save();
  ctx.shadowColor = 'rgba(200, 50, 80, 0.5)';
  ctx.shadowBlur = 25;

  ctx.font = 'bold italic 82px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark outline for depth
  ctx.strokeStyle = '#0a0510';
  ctx.lineWidth = 8;
  ctx.strokeText('The Book Fair', WIDTH / 2, titleY);

  // Main fill: warm cream/white with slight pink tint
  const titleGrad = ctx.createLinearGradient(0, titleY - 40, 0, titleY + 40);
  titleGrad.addColorStop(0, '#ffe8e8');
  titleGrad.addColorStop(0.5, '#ffffff');
  titleGrad.addColorStop(1, '#ffd0d0');
  ctx.fillStyle = titleGrad;
  ctx.fillText('The Book Fair', WIDTH / 2, titleY);
  ctx.restore();

  // --- Tagline ---
  ctx.font = 'bold 20px "Courier New", "Courier", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7b8caa';
  ctx.fillText('A   S H E L F   O F   I N T E R A C T I V E   9 0 s   T O Y S', WIDTH / 2, titleY + 60);

  // --- Shelf: wooden bar ---
  const shelfY = 420;
  const shelfHeight = 8;
  const shelfGrad = ctx.createLinearGradient(0, shelfY, 0, shelfY + shelfHeight);
  shelfGrad.addColorStop(0, '#c87533');
  shelfGrad.addColorStop(0.3, '#e8943d');
  shelfGrad.addColorStop(0.7, '#d48235');
  shelfGrad.addColorStop(1, '#a05a20');
  ctx.fillStyle = shelfGrad;

  const shelfLeft = 90;
  const shelfRight = WIDTH - 90;
  ctx.beginPath();
  ctx.roundRect(shelfLeft, shelfY, shelfRight - shelfLeft, shelfHeight, 3);
  ctx.fill();

  // Shelf shadow
  const shelfShadow = ctx.createLinearGradient(0, shelfY + shelfHeight, 0, shelfY + shelfHeight + 14);
  shelfShadow.addColorStop(0, 'rgba(0,0,0,0.3)');
  shelfShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shelfShadow;
  ctx.fillRect(shelfLeft + 4, shelfY + shelfHeight, shelfRight - shelfLeft - 8, 14);

  // --- Shelf items: labeled tiles with drawn mini-icons ---
  const shelfItems = [
    { label: 'Kid Pix', draw: drawPalette },
    { label: 'Tamagotchi', draw: drawEgg },
    { label: 'Winamp', draw: drawMusicNote },
    { label: 'Oregon Trail', draw: drawWagonWheel },
    { label: 'Snake', draw: drawSnake },
    { label: 'BadOS XP', draw: drawMonitor },
  ];
  const tileWidth = 136;
  const tileHeight = 68;
  const tileGap = 18;
  const totalTilesWidth = shelfItems.length * tileWidth + (shelfItems.length - 1) * tileGap;
  const tilesStartX = (WIDTH - totalTilesWidth) / 2;
  const tileBotY = shelfY - 6;
  const tileTopY = tileBotY - tileHeight;

  for (let i = 0; i < shelfItems.length; i++) {
    const x = tilesStartX + i * (tileWidth + tileGap);

    // Tile background: dark rounded rect
    const tileGradFill = ctx.createLinearGradient(x, tileTopY, x, tileTopY + tileHeight);
    tileGradFill.addColorStop(0, '#2a3050');
    tileGradFill.addColorStop(1, '#1c2238');
    ctx.fillStyle = tileGradFill;
    ctx.beginPath();
    ctx.roundRect(x, tileTopY, tileWidth, tileHeight, 8);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(100, 130, 180, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, tileTopY, tileWidth, tileHeight, 8);
    ctx.stroke();

    // Mini icon on tile
    ctx.save();
    shelfItems[i].draw(ctx, x + tileWidth / 2, tileTopY + 26, 28);
    ctx.restore();

    // Label on tile
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8899bb';
    ctx.fillText(shelfItems[i].label, x + tileWidth / 2, tileTopY + 54);
  }

  // --- Bottom tagline ---
  ctx.font = '16px "Georgia", serif';
  ctx.fillStyle = 'rgba(200, 160, 100, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(
    '18 interactive toys \u2022 hidden beanie babies \u2022 pure nostalgia',
    WIDTH / 2,
    HEIGHT - 68
  );

  // --- URL at bottom ---
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillStyle = 'rgba(140, 160, 200, 0.45)';
  ctx.fillText('thebookfair.thingvalla.tech', WIDTH / 2, HEIGHT - 38);

  // --- Subtle scanline effect for retro CRT feel ---
  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
    ctx.fillRect(0, y, WIDTH, 1);
  }

  // --- Write the file ---
  const buffer = canvas.toBuffer('image/png');
  const outputPath = join(STATIC_DIR, 'og-preview.png');
  writeFileSync(outputPath, buffer);

  console.log(`Created og-preview.png (${WIDTH}x${HEIGHT}, ${buffer.length} bytes)`);
  console.log(`Location: ${outputPath}`);
}

generateOGImage();
