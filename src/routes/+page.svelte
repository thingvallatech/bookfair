<script lang="ts">
  import { onMount } from 'svelte';
  import DialUpModem from '$lib/toys/DialUpModem.svelte';
  import KooshBall from '$lib/toys/KooshBall.svelte';

  // Which object is currently "open" (fullscreen experience)
  let activeObject = $state<string | null>(null);

  // Shelf objects - will grow over time
  const shelfObjects = [
    { id: 'modem', name: 'Dial-Up Modem', x: 15, y: 60, scale: 1 },
    { id: 'koosh', name: 'Koosh Ball', x: 40, y: 55, scale: 0.9 },
    { id: 'kidpix', name: 'Kid Pix', x: 65, y: 62, scale: 1.1, comingSoon: true },
    { id: 'pogs', name: 'Pog Tube', x: 85, y: 58, scale: 0.85, comingSoon: true },
  ];

  function openObject(id: string) {
    const obj = shelfObjects.find(o => o.id === id);
    if (obj?.comingSoon) return;
    activeObject = id;
  }

  function closeObject() {
    activeObject = null;
  }

  // Wobble animation on hover
  let hoveredObject = $state<string | null>(null);
</script>

<div class="room">
  <!-- Window with afternoon light -->
  <div class="window">
    <div class="blinds"></div>
    <div class="light-rays"></div>
  </div>

  <!-- Poster edge peeking from top -->
  <div class="poster-edge">
    <span>BEAST</span>
  </div>

  <!-- The Shelf -->
  <div class="shelf-container">
    <div class="shelf">
      <div class="shelf-surface">
        {#each shelfObjects as obj}
          <button
            class="shelf-object"
            class:coming-soon={obj.comingSoon}
            class:wobble={hoveredObject === obj.id}
            style="left: {obj.x}%; bottom: 0; transform: scale({obj.scale})"
            onmouseenter={() => hoveredObject = obj.id}
            onmouseleave={() => hoveredObject = null}
            onclick={() => openObject(obj.id)}
            title={obj.comingSoon ? `${obj.name} (coming soon)` : obj.name}
          >
            {#if obj.id === 'modem'}
              <div class="object-modem">
                <div class="modem-body">
                  <div class="modem-lights">
                    <span class="led"></span>
                    <span class="led"></span>
                    <span class="led green"></span>
                  </div>
                  <div class="modem-label">US Robotics</div>
                </div>
              </div>
            {:else if obj.id === 'koosh'}
              <div class="object-koosh">
                <div class="koosh-ball">
                  {#each Array(16) as _, i}
                    <div class="tendril" style="--angle: {i * 22.5}deg; --hue: {i * 22}"></div>
                  {/each}
                </div>
              </div>
            {:else if obj.id === 'kidpix'}
              <div class="object-kidpix">
                <div class="kidpix-box">
                  <div class="kidpix-screen">🎨</div>
                  <div class="kidpix-label">Kid Pix</div>
                </div>
              </div>
            {:else if obj.id === 'pogs'}
              <div class="object-pogs">
                <div class="pog-tube">
                  <div class="pog" style="--color: #e84393"></div>
                  <div class="pog" style="--color: #00a693"></div>
                  <div class="pog" style="--color: #ffc312"></div>
                  <div class="slammer"></div>
                </div>
              </div>
            {/if}
            {#if obj.comingSoon}
              <div class="coming-soon-badge">soon</div>
            {/if}
          </button>
        {/each}
      </div>
      <div class="shelf-front"></div>
      <div class="shelf-shadow"></div>
    </div>
  </div>

  <!-- Wood floor hint -->
  <div class="floor"></div>
</div>

<!-- Active object overlay -->
{#if activeObject === 'modem'}
  <div class="object-view">
    <DialUpModem onClose={closeObject} />
  </div>
{:else if activeObject === 'koosh'}
  <div class="object-view">
    <KooshBall onClose={closeObject} />
  </div>
{/if}

<style>
  .room {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #f5e6d3 0%, #e8d4bc 100%);
    position: relative;
    overflow: hidden;
  }

  /* Window */
  .window {
    position: absolute;
    top: 5%;
    right: 10%;
    width: 180px;
    height: 220px;
    background: linear-gradient(180deg, #87ceeb 0%, #b4e7f8 100%);
    border: 12px solid #8b7355;
    box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.5);
  }

  .blinds {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60%;
    background: repeating-linear-gradient(
      180deg,
      #f5f0e6 0px,
      #f5f0e6 8px,
      #d4cfc5 8px,
      #d4cfc5 10px
    );
  }

  .light-rays {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 300px;
    height: 400px;
    background: linear-gradient(
      180deg,
      rgba(255, 248, 220, 0.4) 0%,
      rgba(255, 248, 220, 0) 100%
    );
    transform: translateX(-50%) perspective(100px) rotateX(-20deg);
    pointer-events: none;
  }

  /* Poster */
  .poster-edge {
    position: absolute;
    top: 0;
    left: 20%;
    width: 100px;
    height: 40px;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 4px;
  }

  .poster-edge span {
    font-family: 'Impact', sans-serif;
    font-size: 14px;
    color: #ffc312;
    letter-spacing: 2px;
  }

  /* Shelf */
  .shelf-container {
    position: absolute;
    bottom: 15%;
    left: 5%;
    right: 5%;
    height: 200px;
  }

  .shelf {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .shelf-surface {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    height: 160px;
  }

  .shelf-front {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: linear-gradient(180deg, #d4a574 0%, #b8956a 100%);
    border: 3px solid #8b7355;
    border-radius: 0 0 4px 4px;
  }

  .shelf-shadow {
    position: absolute;
    bottom: -10px;
    left: 5%;
    right: 5%;
    height: 10px;
    background: rgba(0, 0, 0, 0.15);
    filter: blur(5px);
    border-radius: 50%;
  }

  /* Shelf Objects */
  .shelf-object {
    position: absolute;
    background: none;
    border: none;
    box-shadow: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.2s ease-out, filter 0.2s;
  }

  .shelf-object:hover {
    transform: scale(1.1) translateY(-8px) !important;
    filter: brightness(1.1);
  }

  .shelf-object.coming-soon {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .shelf-object.coming-soon:hover {
    transform: scale(1) translateY(0) !important;
  }

  .shelf-object.wobble {
    animation: wobble 0.5s ease-in-out;
  }

  @keyframes wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-3deg); }
    75% { transform: rotate(3deg); }
  }

  .coming-soon-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #e84393;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: bold;
  }

  /* Modem Object */
  .object-modem {
    width: 120px;
    height: 30px;
  }

  .modem-body {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #d0d0d0 0%, #a0a0a0 100%);
    border: 2px solid #606060;
    border-radius: 4px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 8px;
  }

  .modem-lights {
    display: flex;
    gap: 4px;
  }

  .led {
    width: 6px;
    height: 6px;
    background: #333;
    border-radius: 50%;
  }

  .led.green {
    background: #00ff00;
    box-shadow: 0 0 4px #00ff00;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .modem-label {
    font-size: 8px;
    color: #333;
    font-weight: bold;
  }

  /* Koosh Ball Object */
  .object-koosh {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .koosh-ball {
    width: 40px;
    height: 40px;
    position: relative;
    animation: kooshBreathe 2s ease-in-out infinite;
  }

  @keyframes kooshBreathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .tendril {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 4px;
    background: hsl(var(--hue), 80%, 50%);
    border-radius: 2px;
    transform-origin: left center;
    transform: rotate(var(--angle));
  }

  /* Kid Pix Object */
  .object-kidpix {
    width: 80px;
    height: 100px;
  }

  .kidpix-box {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #ffc312 0%, #e6a800 100%);
    border: 3px solid #333;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .kidpix-screen {
    font-size: 32px;
  }

  .kidpix-label {
    font-size: 12px;
    font-weight: bold;
    color: #333;
  }

  /* Pogs Object */
  .object-pogs {
    width: 40px;
    height: 80px;
  }

  .pog-tube {
    width: 100%;
    height: 100%;
    background: rgba(200, 200, 200, 0.3);
    border: 2px solid #888;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 4px;
    gap: 2px;
  }

  .pog {
    width: 30px;
    height: 6px;
    background: var(--color);
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.3);
  }

  .slammer {
    width: 32px;
    height: 8px;
    background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
    border-radius: 50%;
    border: 2px solid #404040;
    margin-top: 4px;
  }

  /* Floor */
  .floor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 12%;
    background: linear-gradient(90deg,
      #8b7355 0%,
      #a08060 10%,
      #8b7355 20%,
      #a08060 30%,
      #8b7355 40%,
      #a08060 50%,
      #8b7355 60%,
      #a08060 70%,
      #8b7355 80%,
      #a08060 90%,
      #8b7355 100%
    );
  }

  /* Object View Overlay */
  .object-view {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: #1a1a2e;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
