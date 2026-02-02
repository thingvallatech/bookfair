#!/usr/bin/env node

/**
 * Generate PWA icons for The Book Fair.
 * Creates icon-192.png, icon-512.png, and maskable variants.
 *
 * Uses the Canvas API via Node.js (requires Node 18+ with built-in support
 * or the `canvas` npm package). Falls back to a simpler approach if canvas
 * is not available.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, '..', 'static');

// We'll try to use the `canvas` npm package; if unavailable we generate
// minimal valid PNGs with a solid background color.

async function generateWithCanvas() {
  const { createCanvas } = await import('canvas');

  const sizes = [192, 512];
  const variants = [
    { suffix: '', padding: 0 },
    { suffix: '-maskable', padding: 0.1 } // 10% safe zone for maskable
  ];

  for (const size of sizes) {
    for (const { suffix, padding } of variants) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      const pad = Math.round(size * padding);

      // Background
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, size, size);

      // Gold border accent
      const borderWidth = Math.max(2, Math.round(size * 0.02));
      ctx.strokeStyle = '#f7d51d';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(
        pad + borderWidth,
        pad + borderWidth,
        size - 2 * (pad + borderWidth),
        size - 2 * (pad + borderWidth)
      );

      // Inner subtle shelf lines (decorative)
      ctx.strokeStyle = 'rgba(247, 213, 29, 0.3)';
      ctx.lineWidth = Math.max(1, Math.round(size * 0.005));
      const innerPad = pad + Math.round(size * 0.15);
      for (let i = 1; i <= 3; i++) {
        const y = innerPad + ((size - 2 * innerPad) / 4) * i;
        ctx.beginPath();
        ctx.moveTo(innerPad, y);
        ctx.lineTo(size - innerPad, y);
        ctx.stroke();
      }

      // Book emoji text
      const fontSize = Math.round((size - 2 * pad) * 0.45);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('\u{1F4DA}', size / 2, size / 2 - Math.round(size * 0.02));

      // "BF" text below the emoji for smaller sizes
      const labelSize = Math.round((size - 2 * pad) * 0.1);
      ctx.font = `bold ${labelSize}px monospace`;
      ctx.fillStyle = '#f7d51d';
      ctx.fillText('BOOK FAIR', size / 2, size / 2 + fontSize * 0.4);

      const filename = `icon${suffix}-${size}.png`;
      const buffer = canvas.toBuffer('image/png');
      writeFileSync(join(STATIC_DIR, filename), buffer);
      console.log(`Created ${filename} (${buffer.length} bytes)`);
    }
  }
}

// Note: For higher quality icons with text/emoji, install the `canvas` npm package.

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function generateFallback() {
  const { deflateSync } = await import('zlib');

  const sizes = [192, 512];
  const variants = ['', '-maskable'];

  for (const size of sizes) {
    for (const suffix of variants) {
      const width = size;
      const height = size;

      // IHDR
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      ihdr[8] = 8;
      ihdr[9] = 2;
      ihdr[10] = 0;
      ihdr[11] = 0;
      ihdr[12] = 0;

      const rowSize = 1 + width * 3;
      const rawData = Buffer.alloc(rowSize * height);
      const borderW = Math.max(4, Math.round(size * 0.04));
      const isMaskable = suffix === '-maskable';
      const safePad = isMaskable ? Math.round(size * 0.1) : 0;

      for (let y = 0; y < height; y++) {
        const rowOffset = y * rowSize;
        rawData[rowOffset] = 0;
        for (let x = 0; x < width; x++) {
          const px = rowOffset + 1 + x * 3;

          const inBorder =
            x >= safePad + borderW && x < width - safePad - borderW &&
            y >= safePad + borderW && y < height - safePad - borderW;
          const inOuter =
            x >= safePad && x < width - safePad &&
            y >= safePad && y < height - safePad;

          if (inOuter && !inBorder) {
            // Gold border
            rawData[px] = 0xf7;
            rawData[px + 1] = 0xd5;
            rawData[px + 2] = 0x1d;
          } else {
            // Dark background
            rawData[px] = 0x0a;
            rawData[px + 1] = 0x0a;
            rawData[px + 2] = 0x1a;
          }
        }
      }

      const compressed = deflateSync(rawData);

      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const chunks = [
        makeChunk('IHDR', ihdr),
        makeChunk('IDAT', compressed),
        makeChunk('IEND', Buffer.alloc(0))
      ];

      const png = Buffer.concat([signature, ...chunks]);
      const filename = `icon${suffix}-${size}.png`;
      writeFileSync(join(STATIC_DIR, filename), png);
      console.log(`Created ${filename} (${png.length} bytes)`);
    }
  }
}

// Try canvas first, fall back to minimal PNG generation
async function main() {
  try {
    await generateWithCanvas();
    console.log('\nIcons generated with canvas (high quality).');
  } catch {
    console.log('canvas package not available, generating minimal placeholder PNGs...');
    await generateFallback();
    console.log('\nPlaceholder icons generated. For better icons, install `canvas`:');
    console.log('  npm install --save-dev canvas');
    console.log('  node scripts/generate-icons.mjs');
  }
}

main().catch(console.error);
