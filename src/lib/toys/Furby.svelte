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

  // Beanie hiding
  const hidingSpots: HidingSpot[] = [{ id: 'behind-furby' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // localStorage keys
  const STORAGE_KEY = 'bookfair_furby';

  // Furby state
  type FurbyMood = 'happy' | 'sleepy' | 'hungry' | 'angry' | 'talking' | 'idle' | 'sleeping' | 'tickled' | 'eating' | 'petted';

  let mood = $state<FurbyMood>('idle');
  let interactionCount = $state(0);
  let isFlipped = $state(false);
  let speechText = $state('');
  let speechTranslation = $state('');
  let showSpeech = $state(false);
  let blinking = $state(false);
  let beakOpen = $state(false);
  let eyeLidLevel = $state(0); // 0 = open, 1 = fully closed
  let pupilX = $state(0);
  let pupilY = $state(0);
  let earAngle = $state(0); // degrees of ear rotation, negative = flat
  let bodyBounce = $state(0);
  let bodyShake = $state(0);
  let lastInteractionTime = $state(Date.now());
  let rapidClickCount = $state(0);
  let rapidClickTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // Voice synthesis
  let voiceReady = $state(false);
  let selectedVoice: SpeechSynthesisVoice | null = null;

  function initVoice() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const pickVoice = () => {
      const voices = speechSynthesis.getVoices();
      // Prefer a higher-pitched or novelty voice
      selectedVoice =
        voices.find(v => /zira|samantha|karen|fiona|tessa/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith('en') && /female/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0] || null;
      voiceReady = voices.length > 0;
    };
    pickVoice();
    if (!voiceReady) {
      speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  function speakText(text: string, isFurbish: boolean) {
    if (!voiceReady || typeof window === 'undefined' || !window.speechSynthesis) return;
    // Don't speak if audio is disabled
    if (localStorage.getItem('audioEnabled') !== 'true') return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;

    if (isFurbish) {
      // Furbish: high pitch, fast, robotic
      utterance.pitch = 1.8;
      utterance.rate = 1.3;
      utterance.volume = 0.7;
    } else {
      // English: still cute but more understandable
      utterance.pitch = 1.5;
      utterance.rate = 1.1;
      utterance.volume = 0.7;
    }

    speechSynthesis.speak(utterance);
  }

  // Animation frame
  let animFrame = $state(0);
  let animInterval: ReturnType<typeof setInterval>;
  let idleCheckInterval: ReturnType<typeof setInterval>;
  let speechTimeout: ReturnType<typeof setTimeout>;
  let moodTimeout: ReturnType<typeof setTimeout>;

  // Furbish phrases organized by context
  const furbishPhrases = {
    greeting: [
      { furbish: 'Dah doo-ay', english: 'Good morning' },
      { furbish: 'Hey-loh', english: 'Hello' },
      { furbish: 'Dah ay-loh u-tye', english: 'Hello friend' },
    ],
    happy: [
      { furbish: 'Noo-loo!', english: 'Happy!' },
      { furbish: 'Dah noo-loo', english: 'Big fun' },
      { furbish: 'Mee-mee nah-bah', english: 'Very beautiful' },
      { furbish: 'Wee-tah', english: 'Sing' },
      { furbish: 'Doo-ay wah!', english: 'Fun time!' },
    ],
    hungry: [
      { furbish: 'Kah way-lo u-nye', english: "I'm hungry" },
      { furbish: 'Ah-tah', english: 'Feed me' },
      { furbish: 'Yum-yum a-tay', english: 'Yummy food' },
      { furbish: 'Kah a-tay', english: 'Want food' },
    ],
    angry: [
      { furbish: 'Dah way-lo!', english: 'Bad!' },
      { furbish: 'Boo koo-doh', english: 'No like' },
      { furbish: 'Dah boo', english: 'Big baby' },
      { furbish: 'Noh-lah!', english: 'Scary!' },
    ],
    sleepy: [
      { furbish: 'U-nye-way-loh-nee-way', english: 'Go to sleep now' },
      { furbish: 'Kah u-nye-boh-bye', english: 'I am sleepy' },
      { furbish: 'Way-loh... zzz', english: 'Goodnight... zzz' },
    ],
    tickle: [
      { furbish: 'Hee hee hee!', english: 'Hee hee hee!' },
      { furbish: 'Noo-loo! Noo-loo!', english: 'Happy! Happy!' },
      { furbish: 'Dah doo-ay!', english: 'So fun!' },
      { furbish: 'Wee-tee-kah!', english: 'That tickles!' },
    ],
    pet: [
      { furbish: 'Oooh... mee-mee', english: 'Oooh... nice' },
      { furbish: 'Noo-loo kah', english: 'Happy me' },
      { furbish: 'Dah u-tye', english: 'Big love' },
      { furbish: 'Mmmm... doo-ay', english: 'Mmmm... good' },
    ],
    talk: [
      { furbish: 'Wee-tee-kah-loo-loo', english: 'Tell me a story' },
      { furbish: 'Toh-loo kah u-tye?', english: 'Do you like me?' },
      { furbish: 'Wee-tee-kah doo-ay?', english: 'What is your name?' },
      { furbish: 'Dah way-loh noo-loo', english: 'The world is happy' },
      { furbish: 'Kah boo-dah u-tye', english: 'I love party' },
      { furbish: 'Mee-mee kah toh-loo', english: 'Very nice day' },
    ],
    feed: [
      { furbish: 'Yum! Dah a-tay!', english: 'Yum! Big food!' },
      { furbish: 'Noo-loo a-tay!', english: 'Happy food!' },
      { furbish: 'Mmmm yum yum', english: 'Mmmm yummy' },
    ],
  };

  // Get language level (1=all Furbish, 2=mix, 3=mostly English)
  let languageLevel = $derived.by(() => {
    if (interactionCount >= 25) return 3;
    if (interactionCount >= 10) return 2;
    return 1;
  });

  let friendshipLabel = $derived.by(() => {
    if (languageLevel === 3) return 'Best Friends';
    if (languageLevel === 2) return 'Getting Closer';
    return 'Just Met';
  });

  let friendshipProgress = $derived.by(() => {
    if (interactionCount >= 25) return 100;
    return Math.round((interactionCount / 25) * 100);
  });

  // Load state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        interactionCount = data.interactionCount || 0;
      }
    } catch {
      // ignore
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        interactionCount,
      }));
    } catch {
      // ignore
    }
  }

  function incrementInteractions() {
    interactionCount++;
    saveState();
  }

  // Get a phrase with appropriate language mixing
  function getPhrase(context: keyof typeof furbishPhrases): { display: string; translation: string } {
    const phrases = furbishPhrases[context];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    if (languageLevel === 1) {
      return { display: phrase.furbish, translation: phrase.english };
    } else if (languageLevel === 2) {
      // Mix: sometimes Furbish, sometimes English
      if (Math.random() < 0.5) {
        return { display: phrase.furbish, translation: phrase.english };
      } else {
        return { display: phrase.english, translation: '' };
      }
    } else {
      // Mostly English with occasional Furbish flair
      if (Math.random() < 0.2) {
        return { display: phrase.furbish, translation: phrase.english };
      } else {
        return { display: phrase.english, translation: '' };
      }
    }
  }

  function showSpeechBubble(context: keyof typeof furbishPhrases, duration = 3000) {
    const phrase = getPhrase(context);
    speechText = phrase.display;
    speechTranslation = phrase.translation;
    showSpeech = true;

    // Speak the text aloud
    const isFurbish = phrase.translation !== '';
    speakText(phrase.display, isFurbish);

    if (speechTimeout) clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => {
      showSpeech = false;
    }, duration);
  }

  function animateBeakTalk(count = 4) {
    let i = 0;
    const interval = setInterval(() => {
      beakOpen = i % 2 === 0;
      i++;
      if (i >= count * 2) {
        clearInterval(interval);
        beakOpen = false;
      }
    }, 150);
  }

  function setMoodTemporary(newMood: FurbyMood, duration = 2500) {
    mood = newMood;
    if (moodTimeout) clearTimeout(moodTimeout);
    moodTimeout = setTimeout(() => {
      mood = 'idle';
      earAngle = 0;
      bodyShake = 0;
    }, duration);
  }

  // -- Interactions --

  function handlePet() {
    lastInteractionTime = Date.now();
    incrementInteractions();
    playSound('happy', 0.3);

    // Brief eye close
    eyeLidLevel = 0.7;
    earAngle = 10;
    setMoodTemporary('petted', 2000);
    showSpeechBubble('pet');
    animateBeakTalk(3);

    setTimeout(() => {
      eyeLidLevel = 0;
    }, 1200);
  }

  function handleFeed() {
    lastInteractionTime = Date.now();
    incrementInteractions();
    playSound('eat', 0.3);

    beakOpen = true;
    earAngle = 5;
    setMoodTemporary('eating', 3000);
    showSpeechBubble('feed');

    // Chewing animation
    let chews = 0;
    const chewInterval = setInterval(() => {
      beakOpen = !beakOpen;
      chews++;
      if (chews >= 8) {
        clearInterval(chewInterval);
        beakOpen = false;
        playSound('happy', 0.2);
      }
    }, 200);
  }

  function handleTalk() {
    lastInteractionTime = Date.now();
    incrementInteractions();
    playSound('pop', 0.2);

    earAngle = 15;
    setMoodTemporary('talking', 3000);
    showSpeechBubble('talk', 4000);
    animateBeakTalk(6);

    // Pupils look around while talking
    const lookInterval = setInterval(() => {
      pupilX = (Math.random() - 0.5) * 6;
      pupilY = (Math.random() - 0.5) * 4;
    }, 300);
    setTimeout(() => {
      clearInterval(lookInterval);
      pupilX = 0;
      pupilY = 0;
    }, 2500);
  }

  function handleTickle() {
    lastInteractionTime = Date.now();
    rapidClickCount++;

    if (rapidClickTimer) clearTimeout(rapidClickTimer);
    rapidClickTimer = setTimeout(() => {
      rapidClickCount = 0;
    }, 800);

    if (rapidClickCount >= 3) {
      incrementInteractions();
      playSound('happy', 0.3);

      earAngle = 20;
      setMoodTemporary('tickled', 2500);
      showSpeechBubble('tickle');
      animateBeakTalk(5);
      rapidClickCount = 0;
    } else {
      playSound('click', 0.2);
    }
  }

  function handleFlip() {
    lastInteractionTime = Date.now();
    incrementInteractions();
    playSound('sad', 0.2);

    isFlipped = true;
    earAngle = -25;
    bodyShake = 1;
    setMoodTemporary('angry', 3000);
    showSpeechBubble('angry');
    animateBeakTalk(4);

    setTimeout(() => {
      isFlipped = false;
      bodyShake = 0;
    }, 3000);
  }

  // Idle / sleep logic
  function checkIdle() {
    const elapsed = (Date.now() - lastInteractionTime) / 1000;

    if (mood === 'sleeping') return;

    if (elapsed > 30) {
      // Fall asleep
      mood = 'sleeping';
      eyeLidLevel = 1;
      earAngle = -15;
      showSpeechBubble('sleepy', 4000);
    } else if (elapsed > 15 && mood === 'idle') {
      // Getting sleepy
      mood = 'sleepy';
      eyeLidLevel = 0.5;
      earAngle = -10;
      showSpeechBubble('sleepy');

      // Yawn: open beak wide briefly
      beakOpen = true;
      setTimeout(() => {
        beakOpen = false;
      }, 1500);
    }
  }

  // Wake up if sleeping
  function wakeUp() {
    if (mood === 'sleeping' || mood === 'sleepy') {
      mood = 'idle';
      eyeLidLevel = 0;
      earAngle = 0;
      lastInteractionTime = Date.now();
      showSpeechBubble('greeting');
      playSound('happy', 0.2);
      animateBeakTalk(2);
    }
  }

  function handleBodyClick() {
    if (mood === 'sleeping' || mood === 'sleepy') {
      wakeUp();
      return;
    }
    handlePet();
  }

  function handleButtonClick(action: string) {
    if (mood === 'sleeping' || mood === 'sleepy') {
      wakeUp();
    }
    playSound('click', 0.2);
    switch (action) {
      case 'feed': handleFeed(); break;
      case 'talk': handleTalk(); break;
      case 'tickle': handleTickle(); break;
      case 'flip': handleFlip(); break;
    }
  }

  // Animation loop for idle behaviors
  function animationTick() {
    animFrame++;

    // Idle eye movement
    if (mood === 'idle') {
      if (animFrame % 40 === 0) {
        pupilX = (Math.random() - 0.5) * 5;
        pupilY = (Math.random() - 0.5) * 3;
      }
    }

    // Blinking
    if (mood !== 'sleeping' && animFrame % 60 === 0 && Math.random() < 0.3) {
      blinking = true;
      setTimeout(() => { blinking = false; }, 150);
    }

    // Gentle bounce for happy/tickled
    if (mood === 'happy' || mood === 'tickled' || mood === 'petted') {
      bodyBounce = Math.sin(animFrame * 0.3) * 4;
    } else if (mood === 'sleeping') {
      // Gentle breathing
      bodyBounce = Math.sin(animFrame * 0.05) * 2;
    } else {
      bodyBounce *= 0.9;
    }

    // Shaking for angry
    if (mood === 'angry') {
      bodyShake = Math.sin(animFrame * 2) * 3;
    }
  }

  onMount(() => {
    loadState();
    initVoice();

    // Register beanie spot
    registerSpots('furby', hidingSpots);
    const beanies = getBeaniesForArea('furby');
    hiddenBeanie = beanies.get('behind-furby') || null;

    // Show greeting
    setTimeout(() => {
      showSpeechBubble('greeting');
      animateBeakTalk(3);
      playSound('happy', 0.2);
    }, 500);

    animInterval = setInterval(animationTick, 50);
    idleCheckInterval = setInterval(checkIdle, 3000);
  });

  onDestroy(() => {
    if (animInterval) clearInterval(animInterval);
    if (idleCheckInterval) clearInterval(idleCheckInterval);
    if (speechTimeout) clearTimeout(speechTimeout);
    if (moodTimeout) clearTimeout(moodTimeout);
    if (rapidClickTimer) clearTimeout(rapidClickTimer);
    // Stop any ongoing speech when leaving
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  });
</script>

<div class="furby-container">
  <CloseButton {onClose} />

  <!-- Speech bubble -->
  <div class="speech-area">
    {#if showSpeech}
      <div class="speech-bubble" class:visible={showSpeech}>
        <div class="speech-text">{speechText}</div>
        {#if speechTranslation}
          <div class="speech-translation">({speechTranslation})</div>
        {/if}
        <div class="speech-tail"></div>
      </div>
    {/if}
  </div>

  <!-- Furby wrapper for positioning beanie -->
  <div class="furby-wrapper">
    {#if hiddenBeanie}
      <div class="beanie-spot">
        <HidingBeanie beanie={hiddenBeanie} class="furby-beanie" />
      </div>
    {/if}

    <!-- The Furby itself -->
    <div
      class="furby"
      class:flipped={isFlipped}
      class:sleeping={mood === 'sleeping'}
      style="transform: translateY({bodyBounce}px) translateX({bodyShake}px) {isFlipped ? 'rotate(180deg)' : ''};"
      role="button"
      tabindex="0"
      aria-label="Pet the Furby"
      onclick={handleBodyClick}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBodyClick(); }}}
    >
      <!-- Ears -->
      <div class="ear ear-left" style="transform: rotate({-30 + earAngle}deg);">
        <div class="ear-inner"></div>
      </div>
      <div class="ear ear-right" style="transform: rotate({30 - earAngle}deg);">
        <div class="ear-inner"></div>
      </div>

      <!-- Forehead tuft -->
      <div class="tuft">
        <div class="tuft-spike"></div>
        <div class="tuft-spike s2"></div>
        <div class="tuft-spike s3"></div>
      </div>

      <!-- Body -->
      <div class="body">
        <!-- Fur texture overlay -->
        <div class="fur-texture"></div>

        <!-- Face plate (white/cream area) -->
        <div class="face-plate">
          <!-- Eyes -->
          <div class="eyes">
            <div class="eye eye-left">
              <div class="eye-white">
                <div class="pupil" style="transform: translate({pupilX}px, {pupilY}px);">
                  <div class="pupil-shine"></div>
                </div>
              </div>
              <div
                class="eyelid"
                style="height: {(blinking ? 100 : eyeLidLevel * 100)}%;"
              ></div>
            </div>
            <div class="eye eye-right">
              <div class="eye-white">
                <div class="pupil" style="transform: translate({pupilX}px, {pupilY}px);">
                  <div class="pupil-shine"></div>
                </div>
              </div>
              <div
                class="eyelid"
                style="height: {(blinking ? 100 : eyeLidLevel * 100)}%;"
              ></div>
            </div>
          </div>

          <!-- Beak -->
          <div class="beak-container">
            <div class="beak-top"></div>
            <div class="beak-bottom" class:open={beakOpen}></div>
          </div>
        </div>

        <!-- Tiger stripes -->
        <div class="stripe stripe-1"></div>
        <div class="stripe stripe-2"></div>
        <div class="stripe stripe-3"></div>
        <div class="stripe stripe-4"></div>
      </div>

      <!-- Feet -->
      <div class="feet">
        <div class="foot foot-left"></div>
        <div class="foot foot-right"></div>
      </div>
    </div>
  </div>

  <!-- Interaction buttons -->
  <div class="controls">
    <button class="action-btn" onclick={() => handleButtonClick('feed')} title="Feed">
      <span class="btn-icon">&#x1F37D;&#xFE0F;</span>
      <span class="btn-label">Feed</span>
    </button>
    <button class="action-btn" onclick={() => handleButtonClick('talk')} title="Talk">
      <span class="btn-icon">&#x1F4AC;</span>
      <span class="btn-label">Talk</span>
    </button>
    <button class="action-btn" onclick={() => handleButtonClick('tickle')} title="Tickle">
      <span class="btn-icon">&#x1F92D;</span>
      <span class="btn-label">Tickle</span>
    </button>
    <button class="action-btn" onclick={() => handleButtonClick('flip')} title="Flip upside down">
      <span class="btn-icon">&#x1F504;</span>
      <span class="btn-label">Flip</span>
    </button>
  </div>

  <!-- Friendship level -->
  <div class="friendship">
    <div class="friendship-label">{friendshipLabel}</div>
    <div class="friendship-bar">
      <div class="friendship-fill" style="width: {friendshipProgress}%;"></div>
    </div>
    <div class="friendship-detail">
      {interactionCount} interaction{interactionCount === 1 ? '' : 's'} &middot; Level {languageLevel}/3
    </div>
  </div>

  <!-- Mood indicator (subtle) -->
  {#if mood === 'sleeping'}
    <div class="zzz">
      <span class="z z1">z</span>
      <span class="z z2">z</span>
      <span class="z z3">Z</span>
    </div>
  {/if}
</div>

<style>
  .furby-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #1a0533 0%, #2d1b69 30%, #4a2c8a 60%, #6b3fa0 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
    user-select: none;
  }

  /* Ambient sparkles via pseudo-element */
  .furby-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(1px 1px at 10% 20%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(1px 1px at 30% 60%, rgba(255, 255, 255, 0.4), transparent),
      radial-gradient(1.5px 1.5px at 50% 10%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(1px 1px at 70% 40%, rgba(255, 255, 255, 0.3), transparent),
      radial-gradient(1px 1px at 85% 75%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(1.5px 1.5px at 20% 85%, rgba(255, 255, 255, 0.4), transparent),
      radial-gradient(1px 1px at 60% 90%, rgba(255, 255, 255, 0.3), transparent),
      radial-gradient(1px 1px at 90% 15%, rgba(255, 255, 255, 0.6), transparent);
    pointer-events: none;
    animation: twinkle 4s ease-in-out infinite alternate;
  }

  @keyframes twinkle {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  /* Speech bubble */
  .speech-area {
    position: absolute;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .speech-bubble {
    background: white;
    border-radius: 18px;
    padding: 12px 20px;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: speechPop 0.3s ease-out;
    max-width: 280px;
    text-align: center;
  }

  @keyframes speechPop {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }

  .speech-text {
    font-size: 16px;
    font-weight: bold;
    color: #2d1b69;
    line-height: 1.3;
  }

  .speech-translation {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
    font-style: italic;
  }

  .speech-tail {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 12px solid white;
  }

  /* Furby wrapper */
  .furby-wrapper {
    position: relative;
    z-index: 10;
  }

  .beanie-spot {
    position: absolute;
    bottom: 10px;
    right: -35px;
    z-index: 5;
  }

  :global(.furby-beanie) {
    bottom: 0;
    right: 0;
    z-index: 5;
  }

  :global(.furby-beanie.discovered) {
    z-index: 15 !important;
  }

  /* The Furby */
  .furby {
    position: relative;
    cursor: pointer;
    transition: transform 0.15s ease-out;
    width: 200px;
    height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .furby:hover {
    filter: brightness(1.05);
  }

  .furby:active {
    filter: brightness(1.1);
  }

  .furby.flipped {
    transition: transform 0.5s ease-in-out;
  }

  /* Ears */
  .ear {
    position: absolute;
    top: 12px;
    width: 32px;
    height: 50px;
    background: linear-gradient(180deg, #1a1a1a 0%, #333 100%);
    border-radius: 50% 50% 30% 30%;
    z-index: 2;
    transition: transform 0.3s ease;
  }

  .ear-left {
    left: 28px;
    transform-origin: bottom center;
  }

  .ear-right {
    right: 28px;
    transform-origin: bottom center;
  }

  .ear-inner {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 18px;
    height: 30px;
    background: linear-gradient(180deg, #ff69b4 0%, #ff1493 100%);
    border-radius: 50% 50% 30% 30%;
  }

  /* Forehead tuft */
  .tuft {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    gap: 2px;
  }

  .tuft-spike {
    width: 6px;
    height: 22px;
    background: #1a1a1a;
    border-radius: 50% 50% 20% 20%;
    transform: rotate(-10deg);
  }

  .tuft-spike.s2 {
    height: 28px;
    transform: rotate(0deg);
  }

  .tuft-spike.s3 {
    height: 20px;
    transform: rotate(10deg);
  }

  /* Body */
  .body {
    position: relative;
    width: 180px;
    height: 170px;
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 30%, #1a1a1a 60%, #333 100%);
    border-radius: 50% 50% 45% 45%;
    margin-top: 35px;
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.5),
      inset 0 -5px 15px rgba(0, 0, 0, 0.3),
      inset 0 5px 10px rgba(255, 255, 255, 0.05);
    overflow: hidden;
    z-index: 3;
  }

  /* Fur texture */
  .fur-texture {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.02) 2px,
        rgba(255, 255, 255, 0.02) 3px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 3px,
        rgba(255, 255, 255, 0.015) 3px,
        rgba(255, 255, 255, 0.015) 4px
      );
    pointer-events: none;
  }

  /* Tiger stripes */
  .stripe {
    position: absolute;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    pointer-events: none;
  }

  .stripe-1 {
    top: 10px;
    left: 5px;
    width: 50px;
    height: 30px;
    transform: rotate(-20deg);
  }

  .stripe-2 {
    top: 45px;
    right: 10px;
    width: 45px;
    height: 25px;
    transform: rotate(15deg);
  }

  .stripe-3 {
    bottom: 40px;
    left: 15px;
    width: 40px;
    height: 20px;
    transform: rotate(-10deg);
  }

  .stripe-4 {
    bottom: 20px;
    right: 20px;
    width: 35px;
    height: 22px;
    transform: rotate(25deg);
  }

  /* Face plate */
  .face-plate {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 110px;
    height: 100px;
    background: linear-gradient(180deg, #ffeedd 0%, #ffe4cc 50%, #ffd9b3 100%);
    border-radius: 50%;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 4;
  }

  /* Eyes */
  .eyes {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 18px;
    position: relative;
    z-index: 5;
  }

  .eye {
    width: 34px;
    height: 38px;
    position: relative;
    overflow: hidden;
    border-radius: 50%;
    border: 3px solid #1a1a1a;
    background: #1a1a1a;
  }

  .eye-white {
    width: 100%;
    height: 100%;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .pupil {
    width: 16px;
    height: 18px;
    background: radial-gradient(circle at 40% 35%, #4a2c8a, #1a0533 70%);
    border-radius: 50%;
    transition: transform 0.15s ease-out;
    position: relative;
  }

  .pupil-shine {
    position: absolute;
    top: 3px;
    left: 4px;
    width: 5px;
    height: 5px;
    background: white;
    border-radius: 50%;
  }

  .eyelid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border-radius: 50% 50% 0 0;
    transition: height 0.15s ease;
    z-index: 6;
  }

  /* Beak */
  .beak-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 6px;
    z-index: 5;
  }

  .beak-top {
    width: 22px;
    height: 10px;
    background: linear-gradient(180deg, #ff9800 0%, #e68900 100%);
    clip-path: polygon(0% 100%, 50% 0%, 100% 100%);
    position: relative;
    z-index: 2;
  }

  .beak-bottom {
    width: 18px;
    height: 7px;
    background: linear-gradient(180deg, #e68900 0%, #cc7a00 100%);
    clip-path: polygon(0% 0%, 50% 100%, 100% 0%);
    margin-top: -1px;
    transform-origin: top center;
    transition: transform 0.15s ease;
  }

  .beak-bottom.open {
    transform: translateY(4px) scaleY(1.3);
  }

  /* Feet */
  .feet {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-top: -8px;
    z-index: 2;
    position: relative;
  }

  .foot {
    width: 42px;
    height: 18px;
    background: linear-gradient(180deg, #ff9800 0%, #e68900 100%);
    border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  }

  /* Controls */
  .controls {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    z-index: 20;
    flex-wrap: wrap;
    justify-content: center;
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
  }

  .action-btn:hover {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
  }

  .action-btn:active {
    transform: translateY(1px);
  }

  .btn-icon {
    font-size: 24px;
    line-height: 1;
  }

  .btn-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  /* Friendship level */
  .friendship {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 20;
    width: 200px;
  }

  .friendship-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: bold;
    margin-bottom: 6px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  }

  .friendship-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .friendship-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff69b4, #ff1493, #da70d6);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .friendship-detail {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 4px;
  }

  /* Sleeping Zs */
  .zzz {
    position: absolute;
    top: 22%;
    right: 25%;
    z-index: 50;
    pointer-events: none;
  }

  .z {
    position: absolute;
    color: rgba(255, 255, 255, 0.7);
    font-weight: bold;
    font-style: italic;
    animation: floatZ 3s ease-in-out infinite;
  }

  .z1 {
    font-size: 16px;
    animation-delay: 0s;
    right: 0;
    top: 0;
  }

  .z2 {
    font-size: 22px;
    animation-delay: 1s;
    right: 15px;
    top: -20px;
  }

  .z3 {
    font-size: 28px;
    animation-delay: 2s;
    right: 30px;
    top: -45px;
  }

  @keyframes floatZ {
    0% {
      opacity: 0;
      transform: translateY(10px) rotate(-10deg);
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-30px) translateX(15px) rotate(10deg);
    }
  }

  /* Responsive */
  @media (max-width: 480px) {
    .furby {
      transform: scale(0.85);
    }

    .controls {
      gap: 8px;
    }

    .action-btn {
      padding: 8px 12px;
    }

    .btn-icon {
      font-size: 20px;
    }

    .speech-area {
      top: 6%;
    }

    .speech-text {
      font-size: 14px;
    }
  }

  @media (max-height: 600px) {
    .speech-area {
      top: 2%;
    }

    .furby {
      transform: scale(0.75);
    }

    .controls {
      margin-top: 10px;
    }
  }
</style>
