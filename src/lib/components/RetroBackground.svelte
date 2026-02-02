<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type P5 from 'p5';

  let container: HTMLDivElement;
  let p5Instance: P5;

  onMount(async () => {
    // Skip p5 animation entirely for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const p5Module = await import('p5');
    const p5 = p5Module.default;

    const sketch = (p: P5) => {
      // Starfield particles
      let stars: Array<{ x: number; y: number; z: number; brightness: number }> = [];
      const STAR_COUNT = 150;

      // Floating shapes
      let shapes: Array<{
        x: number;
        y: number;
        size: number;
        rotation: number;
        rotSpeed: number;
        type: 'triangle' | 'square' | 'circle';
        hue: number;
        floatOffset: number;
        floatSpeed: number;
      }> = [];
      const SHAPE_COUNT = 12;

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();

        // Initialize stars
        for (let i = 0; i < STAR_COUNT; i++) {
          stars.push({
            x: p.random(p.width),
            y: p.random(p.height),
            z: p.random(1, 3),
            brightness: p.random(30, 80),
          });
        }

        // Initialize floating shapes
        for (let i = 0; i < SHAPE_COUNT; i++) {
          shapes.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.random(20, 60),
            rotation: p.random(p.TWO_PI),
            rotSpeed: p.random(-0.02, 0.02),
            type: ['triangle', 'square', 'circle'][Math.floor(p.random(3))] as 'triangle' | 'square' | 'circle',
            hue: p.random(360),
            floatOffset: p.random(p.TWO_PI),
            floatSpeed: p.random(0.01, 0.03),
          });
        }
      };

      p.draw = () => {
        // Dark blue gradient background
        for (let y = 0; y < p.height; y++) {
          const inter = p.map(y, 0, p.height, 0, 1);
          const c = p.lerpColor(
            p.color(240, 60, 15),  // Dark blue-purple
            p.color(260, 50, 8)    // Darker purple
          , inter);
          p.stroke(c);
          p.line(0, y, p.width, y);
        }
        p.noStroke();

        const time = p.frameCount * 0.02;

        // Draw twinkling stars
        for (const star of stars) {
          const twinkle = p.sin(time * star.z + star.x) * 20 + star.brightness;
          p.fill(60, 10, twinkle, 80);
          const size = star.z * 1.5;
          p.ellipse(star.x, star.y, size, size);
        }

        // Draw floating geometric shapes (very subtle)
        for (const shape of shapes) {
          shape.rotation += shape.rotSpeed;
          const floatY = p.sin(time + shape.floatOffset) * 10;

          p.push();
          p.translate(shape.x, shape.y + floatY);
          p.rotate(shape.rotation);

          // Very low opacity for subtlety
          p.fill(shape.hue, 40, 50, 8);

          if (shape.type === 'triangle') {
            p.triangle(
              0, -shape.size / 2,
              -shape.size / 2, shape.size / 2,
              shape.size / 2, shape.size / 2
            );
          } else if (shape.type === 'square') {
            p.rectMode(p.CENTER);
            p.rect(0, 0, shape.size, shape.size);
          } else {
            p.ellipse(0, 0, shape.size, shape.size);
          }

          p.pop();
        }

        // Subtle grid lines (very faint)
        p.stroke(200, 30, 30, 5);
        p.strokeWeight(1);
        const gridSize = 80;
        for (let x = 0; x < p.width; x += gridSize) {
          p.line(x, 0, x, p.height);
        }
        for (let y = 0; y < p.height; y += gridSize) {
          p.line(0, y, p.width, y);
        }
        p.noStroke();
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };
    };

    p5Instance = new p5(sketch, container);
  });

  onDestroy(() => {
    if (p5Instance) {
      p5Instance.remove();
    }
  });
</script>

<div bind:this={container} class="retro-bg"></div>

<style>
  .retro-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .retro-bg :global(canvas) {
    display: block;
  }
</style>
