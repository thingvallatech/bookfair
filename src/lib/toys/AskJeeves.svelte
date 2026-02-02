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

  // Hidden beanie behind Jeeves
  const hidingSpots: HidingSpot[] = [{ id: 'behind-jeeves' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Search state
  let query = $state('');
  let submittedQuery = $state('');
  let results = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let hasSearched = $state(false);
  let searchCount = $state(1247892);

  // Butler animation state
  type ButlerMood = 'idle' | 'thinking' | 'presenting' | 'offended' | 'confused';
  let butlerMood = $state<ButlerMood>('idle');
  let idleAnimation = $state(0); // cycles through idle frames
  let idleTimer: ReturnType<typeof setInterval> | undefined;

  // Popup state
  let showPopup = $state(false);
  let popupMessage = $state('');

  // Special easter egg response
  let specialMessage = $state('');

  interface SearchResult {
    title: string;
    url: string;
    description: string;
    isBroken?: boolean;
  }

  // Names for generated pages
  const firstNames = ['Margaret', 'Bob', 'Linda', 'Dave', 'Carol', 'Steve', 'Nancy', 'Gary', 'Brenda', 'Keith', 'Doris', 'Larry', 'Phyllis', 'Gerald', 'Barb', 'Harold'];
  const tlds = ['geocities.com', 'angelfire.com', 'tripod.com', 'homestead.com', 'fortunecity.com', 'xoom.com'];
  const years = ['1996', '1997', '1998', '1999', '2000', '2001'];

  const popupMessages = [
    (t: string) => `Add "${t}" to your favorites!`,
    () => "Sign Margaret's Guestbook!",
    () => 'This site is Netscape Navigator Optimized!',
    () => '\u{1F6A7} Page Under Construction \u{1F6A7}',
    () => 'You are visitor #00004872!',
    () => 'Click here for FREE AOL trial CD!',
    (t: string) => `Download our FREE ${t} toolbar!`,
    () => 'Best viewed at 800x600 resolution',
  ];

  function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateResults(q: string): SearchResult[] {
    const topic = q.trim();
    const topicLower = topic.toLowerCase();
    const topicSlug = topicLower.replace(/[^a-z0-9]+/g, '_').slice(0, 20);
    const name1 = randomFrom(firstNames);
    const name2 = randomFrom(firstNames.filter(n => n !== name1));
    const name3 = randomFrom(firstNames.filter(n => n !== name1 && n !== name2));
    const tld1 = randomFrom(tlds);
    const tld2 = randomFrom(tlds.filter(t => t !== tld1));
    const year1 = randomFrom(years);
    const year2 = randomFrom(years);

    // Misinterpretation map for common words
    const misinterpretations: Record<string, { title: string; url: string; desc: string }> = {
      'java': { title: 'Best Coffee Shops in Seattle - Java Junction Reviews', url: `http://www.${tld1}/~coffeelover99/java_shops.html`, desc: `The ULTIMATE guide to java in the Pacific Northwest! Updated ${year1}.` },
      'python': { title: `${name1}'s Monty Python Fan Page!!! \u{1F40D}`, url: `http://www.${tld1}/~${name1.toLowerCase()}99/python_fan.html`, desc: 'NI! NI! NI! The best Monty Python quotes and sounds! MIDI files inside!' },
      'apple': { title: 'Washington State Apple Growers Association', url: 'http://www.waapples.org/varieties.htm', desc: `Compare Fuji, Gala, and Granny Smith apples. ${year1} harvest report.` },
      'windows': { title: `${name2}'s Home Window Replacement Guide`, url: `http://www.${tld2}/~${name2.toLowerCase()}/windows_tips.htm`, desc: 'Save $$$$ on double-pane window installation! Before & after pics!' },
      'mouse': { title: 'National Mouse Enthusiasts Club', url: `http://www.mouseclub.org/breeds.htm`, desc: `Everything you wanted to know about fancy mice! Breeding tips & show schedule.` },
      'bug': { title: `Insect Identification for Kids! \u{1F41B}`, url: `http://www.${tld1}/~bugboy/identify.html`, desc: 'Learn about 200+ bugs with PICTURES! Great for school projects!' },
      'cookies': { title: `Grandma ${name1}'s Cookie Recipes - 47 Varieties!`, url: `http://www.${tld1}/~${name1.toLowerCase()}/cookies/`, desc: `The BEST chocolate chip cookie recipe on the World Wide Web! Since ${year2}.` },
      'crash': { title: `Dave's Crash Bandicoot Walkthrough`, url: `http://www.${tld2}/~gamer_dave/crash_guide.htm`, desc: 'Complete walkthrough with ALL secret levels and gems!' },
    };

    const out: SearchResult[] = [];

    // 1. Actual-ish answer from a terrible source
    out.push({
      title: `${name1}'s Geocities Page About ${topic}`,
      url: `http://www.geocities.com/TimesSquare/Arcade/4872/${topicSlug}.html`,
      description: `Everything you EVER wanted to know about ${topic}!!! Last updated ${randomFrom(years)}. Best viewed in Netscape Navigator 4.0.`,
    });

    // 2. Completely wrong interpretation
    const miskey = Object.keys(misinterpretations).find(k => topicLower.includes(k));
    if (miskey) {
      const mis = misinterpretations[miskey];
      out.push({ title: mis.title, url: mis.url, description: mis.desc });
    } else {
      // Generic misinterpretation
      const wrongTopics = ['Beanie Baby collection', 'Star Trek fan fiction', 'homemade soap recipes', 'UFO sightings database', 'hamster dance remix', 'Y2K survival guide'];
      const wrongTopic = randomFrom(wrongTopics);
      out.push({
        title: `${wrongTopic} - ${name2}'s Web Corner`,
        url: `http://www.${tld2}/~${name2.toLowerCase()}/index.html`,
        description: `Not exactly about ${topic}, but you might enjoy ${wrongTopic.toLowerCase()} anyway! Guestbook inside!`,
      });
    }

    // 3. WebRing link
    const ringCount = Math.floor(Math.random() * 200) + 50;
    out.push({
      title: `Join the ${topic} WebRing! ${ringCount} sites!`,
      url: `http://www.webring.org/hub?ring=${topicSlug}&list`,
      description: `The OFFICIAL ${topic} WebRing. Browse ${ringCount} sites dedicated to ${topic}. [ Previous | Random | Next ]`,
    });

    // 4. Suspiciously specific personal page
    out.push({
      title: `${name3}'s ${topic} Tribute Page - Est. ${year1}`,
      url: `http://www.${tld1}/~${name3.toLowerCase()}${Math.floor(Math.random() * 99)}/${topicSlug}_tribute/`,
      description: `"${topic} changed my life." - ${name3}. Featuring 47 animated GIFs, 3 MIDI files, and a guestbook. Sign it!!`,
    });

    // 5. Broken Angelfire link
    out.push({
      title: `The ${topic} Information SuperHighway!!!`,
      url: `http://www.angelfire.com/wa2/${topicSlug}_info/main.html`,
      description: `ERROR 404 - This Angelfire Page No Longer Exists. The webmaster may have exceeded their 5MB storage limit.`,
      isBroken: true,
    });

    // 6. AltaVista cached version
    out.push({
      title: `[CACHED] ${topic} - FAQ and Resources (AltaVista)`,
      url: `http://www.altavista.com/cache?q=${topicSlug}&pg=1`,
      description: `AltaVista cached version from ${randomFrom(['March', 'June', 'October', 'December'])} ${year2}. Original page may have changed.`,
    });

    // 7. Yahoo! Directory category
    out.push({
      title: `Yahoo! Directory > Reference > ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
      url: `http://dir.yahoo.com/Reference/${topicSlug}/`,
      description: `Browse the Yahoo! Directory for hand-picked ${topic} sites. 23 sites listed. Suggest a Site | What's New`,
    });

    // 8. Screensaver download
    out.push({
      title: `Download ${topic} Screensaver FREE! \u2B50\u2B50\u2B50`,
      url: `http://www.screensavers4free.com/${topicSlug}_saver.exe`,
      description: `Amazing ${topic} screensaver for Windows 95/98! Only 847KB. Totally virus free!!!* (*not verified)`,
    });

    // 9. Chat room
    out.push({
      title: `Join #${topicSlug} on DALnet IRC!`,
      url: `irc://irc.dal.net:6667/${topicSlug}`,
      description: `Chat with other ${topic} fans in real-time! Usually 12-15 people online. No flooding plz. Type /join #${topicSlug}`,
    });

    // 10. MIDI download
    const midiSize = Math.floor(Math.random() * 30) + 8;
    out.push({
      title: `Download ${topicSlug}.mid - ${midiSize}KB \u{1F3B5}`,
      url: `http://www.midifarm.com/midi/${topicSlug}.mid`,
      description: `MIDI rendition of the ${topic} theme. Compatible with Windows Media Player and RealPlayer. More MIDIs inside!`,
    });

    return out;
  }

  // Easter egg searches
  function checkEasterEgg(q: string): { results: SearchResult[] | null; message: string; mood: ButlerMood } {
    const lower = q.toLowerCase().trim();

    if (lower === 'meaning of life' || lower === 'what is the meaning of life') {
      return {
        results: null,
        message: '42. Will that be all, sir?',
        mood: 'presenting',
      };
    }

    if (lower === 'google' || lower.includes('google')) {
      return {
        results: null,
        message: 'I beg your pardon? I am the ONLY search engine you need, sir.',
        mood: 'offended',
      };
    }

    if (lower === 'what is the internet' || lower === 'what is internet') {
      return {
        results: [
          {
            title: 'The Internet: A Series of Tubes (Explained!)',
            url: 'http://www.geocities.com/SiliconValley/Lab/1234/internet_explained.html',
            description: 'The internet is like a big library, but on your COMPUTER! You need a modem and a phone line.',
          },
          {
            title: "So You've Heard About The \"World Wide Web\"...",
            url: 'http://www.angelfire.com/ca/webguide/start.html',
            description: 'A beginner\'s guide to the Information Superhighway. What is a "browser"? What is "e-mail"? We explain it ALL!',
          },
          {
            title: 'AOL Keyword: INTERNET',
            url: 'http://www.aol.com/internet',
            description: 'America Online makes the Internet EASY! Just use keyword "internet" to get started. Free trial CD available!',
          },
          {
            title: 'Is The Internet Just A Fad? (TIME Magazine, 1997)',
            url: 'http://www.time.com/archive/1997/internet_fad.html',
            description: 'Some experts say the internet is a passing trend. Others say it will be as big as the telephone someday.',
          },
          {
            title: 'How To Explain E-Mail To Your Grandparents',
            url: `http://www.${randomFrom(tlds)}/~techhelper/email_guide.html`,
            description: 'It\'s like sending a letter, but it arrives INSTANTLY! No stamp required! Includes helpful diagrams.',
          },
          {
            title: 'Internet Safety For Kids - Netiquette Guide',
            url: 'http://www.yahooligans.com/safety/',
            description: 'NEVER give out your real name, phone number, or address online! Ask your parents before downloading anything.',
          },
        ],
        message: 'Ah, a most excellent question! Allow me to illuminate you on the Information Superhighway.',
        mood: 'presenting',
      };
    }

    if (lower === 'jeeves' || lower === 'who is jeeves' || lower === 'who are you') {
      return {
        results: null,
        message: 'I am Jeeves, sir. Your humble digital butler, at your service since 1996. I know everything. Mostly.',
        mood: 'presenting',
      };
    }

    if (lower === 'y2k' || lower.includes('year 2000')) {
      return {
        results: [
          {
            title: '\u{1F6A8} Y2K EMERGENCY PREPAREDNESS KIT \u{1F6A8}',
            url: 'http://www.y2ksurvival.com/checklist.html',
            description: 'Stock up on canned food, water, and batteries NOW! The millennium bug could DESTROY civilization!',
          },
          {
            title: "Bob's Y2K Bunker Page - 247 Days Until TEOTWAWKI",
            url: 'http://www.geocities.com/Area51/Vault/y2k_countdown.html',
            description: 'I have converted my basement into a Y2K survival shelter. Here are my blueprints and supply lists.',
          },
          {
            title: 'Will Your Tamagotchi Survive Y2K?',
            url: `http://www.${randomFrom(tlds)}/~tamafan99/y2k_tama.html`,
            description: 'IMPORTANT: Your Tamagotchi may reset on Jan 1, 2000! Here is how to protect your digital pet.',
          },
          {
            title: 'Y2K Bug: What Computers REALLY Think',
            url: 'http://www.y2ktruth.org/facts.htm',
            description: 'On midnight, January 1st, 2000, computers will think it is 1900. Planes may fall from the sky.',
          },
        ],
        message: 'Ah yes, sir. I have taken the liberty of backing up my own systems. One cannot be too careful.',
        mood: 'thinking',
      };
    }

    return { results: null, message: '', mood: 'idle' };
  }

  function handleSearch() {
    if (!query.trim()) return;

    playSound('click', 0.2);
    submittedQuery = query.trim();
    isSearching = true;
    hasSearched = true;
    specialMessage = '';
    results = [];
    butlerMood = 'thinking';
    showPopup = false;

    // Simulate search delay
    setTimeout(() => {
      const easter = checkEasterEgg(submittedQuery);

      if (easter.message) {
        specialMessage = easter.message;
        butlerMood = easter.mood;
        if (easter.results) {
          results = easter.results;
        }
      } else {
        results = generateResults(submittedQuery);
        butlerMood = 'presenting';
      }

      isSearching = false;
      searchCount += Math.floor(Math.random() * 3) + 1;
      playSound('ding', 0.2);

      // 20% chance of popup
      if (Math.random() < 0.2) {
        setTimeout(() => {
          const msgFn = randomFrom(popupMessages);
          popupMessage = msgFn(submittedQuery);
          showPopup = true;
          playSound('pop', 0.2);
        }, 800);
      }

      // Scroll to results after a tick
      setTimeout(() => {
        const el = document.getElementById('jeeves-results');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 1500 + Math.random() * 1000);
  }

  function closePopup() {
    showPopup = false;
    playSound('pop', 0.2);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  // Butler idle animations
  const idleFrames = [
    { emoji: '\u{1F9D1}\u200D\u{1F4BC}', label: 'standing' },
    { emoji: '\u{1F9D1}\u200D\u{1F4BC}', label: 'adjusting-tie' },
    { emoji: '\u{1F9D1}\u200D\u{1F4BC}', label: 'looking-right' },
    { emoji: '\u{1F9D1}\u200D\u{1F4BC}', label: 'looking-left' },
    { emoji: '\u{1F9D1}\u200D\u{1F4BC}', label: 'tapping' },
  ];

  onMount(() => {
    registerSpots('askjeeves', hidingSpots);
    const beanies = getBeaniesForArea('askjeeves');
    hiddenBeanie = beanies.get('behind-jeeves') || null;

    // Cycle idle animations
    idleTimer = setInterval(() => {
      if (butlerMood === 'idle') {
        idleAnimation = (idleAnimation + 1) % idleFrames.length;
      }
    }, 2500);
  });

  onDestroy(() => {
    if (idleTimer) clearInterval(idleTimer);
  });

  let butlerClass = $derived(
    butlerMood === 'thinking' ? 'butler-thinking' :
    butlerMood === 'presenting' ? 'butler-presenting' :
    butlerMood === 'offended' ? 'butler-offended' :
    butlerMood === 'confused' ? 'butler-confused' :
    `butler-idle butler-idle-${idleFrames[idleAnimation].label}`
  );
</script>

<div class="askjeeves-container">
  <CloseButton {onClose} variant="light" />

  <div class="askjeeves-page">
    <!-- Header -->
    <header class="jeeves-header">
      <div class="logo-area">
        <div class="butler-figure {butlerClass}">
          <div class="butler-hat">{'\u{1F3A9}'}</div>
          <div class="butler-face">
            {#if butlerMood === 'offended'}
              <span class="face-emoji">{'\u{1F624}'}</span>
            {:else if butlerMood === 'thinking'}
              <span class="face-emoji">{'\u{1F914}'}</span>
            {:else if butlerMood === 'presenting'}
              <span class="face-emoji">{'\u{1F60C}'}</span>
            {:else if butlerMood === 'confused'}
              <span class="face-emoji">{'\u{1F9D0}'}</span>
            {:else}
              <span class="face-emoji">{'\u{1F9D1}\u200D\u{1F4BC}'}</span>
            {/if}
          </div>
          <div class="butler-body">
            <div class="butler-suit"></div>
            <div class="butler-tie"></div>
          </div>
          {#if butlerMood === 'thinking'}
            <div class="thought-dots">
              <span class="dot dot-1">.</span>
              <span class="dot dot-2">.</span>
              <span class="dot dot-3">.</span>
            </div>
          {/if}
        </div>
        <div class="logo-text">
          <h1 class="jeeves-title">Ask Jeeves!</h1>
          <p class="jeeves-subtitle">The Internet Butler</p>
        </div>
      </div>
    </header>

    <!-- Search Area -->
    <div class="search-area">
      <p class="search-prompt">You may ask me a question, type a keyword, or enter a URL.</p>
      <div class="search-bar">
        <input
          type="text"
          class="search-input"
          placeholder="Type your question here..."
          bind:value={query}
          onkeydown={handleKeydown}
          disabled={isSearching}
        />
        <button class="ask-button" onclick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? 'Searching...' : 'Ask!'}
        </button>
      </div>
      <div class="search-options">
        <label class="option-label">
          <input type="checkbox" checked disabled /> Search the Web
        </label>
        <label class="option-label">
          <input type="checkbox" disabled /> Search News
        </label>
        <label class="option-label">
          <input type="checkbox" disabled /> Search Pictures
        </label>
      </div>
    </div>

    <!-- Special Message -->
    {#if specialMessage}
      <div class="special-message">
        <div class="speech-bubble">
          <span class="quote-mark">&ldquo;</span>{specialMessage}<span class="quote-mark">&rdquo;</span>
          <span class="jeeves-sig">&mdash; Jeeves</span>
        </div>
      </div>
    {/if}

    <!-- Results -->
    {#if hasSearched}
      <div id="jeeves-results" class="results-area">
        {#if isSearching}
          <div class="searching-indicator">
            <div class="hourglass">{'\u231B'}</div>
            <p>Jeeves is consulting his vast knowledge...</p>
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
          </div>
        {:else}
          {#if submittedQuery}
            <p class="you-asked">You asked: <strong>&ldquo;{submittedQuery}&rdquo;</strong></p>
          {/if}

          {#if results.length > 0}
            <p class="results-count">I found {results.length} results for you, sir:</p>
            <ol class="results-list">
              {#each results as result, i}
                <li class="result-item" class:broken={result.isBroken}>
                  <a href="#!" class="result-title" onclick={(e) => e.preventDefault()}>
                    {result.title}
                  </a>
                  <span class="result-url">{result.url}</span>
                  <p class="result-desc">
                    {#if result.isBroken}
                      <span class="broken-icon">{'\u26A0\uFE0F'}</span>
                    {/if}
                    {result.description}
                  </p>
                </li>
              {/each}
            </ol>

            <div class="pagination">
              <span class="page-current">1</span>
              <a href="#!" onclick={(e) => e.preventDefault()}>2</a>
              <a href="#!" onclick={(e) => e.preventDefault()}>3</a>
              <a href="#!" onclick={(e) => e.preventDefault()}>4</a>
              <a href="#!" onclick={(e) => e.preventDefault()}>Next &raquo;</a>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Footer -->
    <footer class="jeeves-footer">
      <div class="hit-counter">
        <img
          alt="counter"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          width="1"
          height="1"
        />
        Jeeves has answered <span class="counter-number">{searchCount.toLocaleString()}</span> questions
      </div>

      <div class="webring">
        <div class="webring-box">
          <p class="webring-title">{'\u{1F517}'} The Search Engine WebRing {'\u{1F517}'}</p>
          <div class="webring-nav">
            <a href="#!" onclick={(e) => e.preventDefault()}>&laquo; Prev</a>
            <span class="webring-sep">|</span>
            <a href="#!" onclick={(e) => e.preventDefault()}>Random</a>
            <span class="webring-sep">|</span>
            <a href="#!" onclick={(e) => e.preventDefault()}>Next &raquo;</a>
          </div>
        </div>
      </div>

      <div class="construction-bar">
        <span>{'\u{1F6A7}'}</span>
        <span>{'\u{1F6A7}'}</span>
        <span>{'\u{1F6A7}'}</span>
        <span class="construction-text">UNDER CONSTRUCTION</span>
        <span>{'\u{1F6A7}'}</span>
        <span>{'\u{1F6A7}'}</span>
        <span>{'\u{1F6A7}'}</span>
      </div>

      <p class="browser-notice">Best viewed in Internet Explorer 5.0 at 800x600</p>
      <p class="copyright">&copy; 1996-{new Date().getFullYear()} Ask Jeeves, Inc. All Rights Reserved.</p>
    </footer>
  </div>

  <!-- Random Popup -->
  {#if showPopup}
    <div class="retro-popup">
      <div class="popup-titlebar">
        <span class="popup-titlebar-text">Internet Explorer</span>
        <button class="popup-close" onclick={closePopup}>&times;</button>
      </div>
      <div class="popup-body">
        <div class="popup-icon">{'\u{2139}\uFE0F'}</div>
        <p class="popup-message">{popupMessage}</p>
        <button class="popup-ok" onclick={closePopup}>OK</button>
      </div>
    </div>
  {/if}

  <!-- Hidden Beanie -->
  {#if hiddenBeanie}
    <div class="beanie-spot">
      <HidingBeanie beanie={hiddenBeanie} />
    </div>
  {/if}
</div>

<style>
  .askjeeves-container {
    position: fixed;
    inset: 0;
    background: #e8e4d9;
    overflow-y: auto;
    overflow-x: hidden;
    font-family: 'Times New Roman', Times, Georgia, serif;
    color: #000;
    z-index: 100;
  }

  .askjeeves-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 20px 16px 40px;
    background: #fff;
    min-height: 100%;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
  }

  /* Header */
  .jeeves-header {
    text-align: center;
    padding: 20px 0 10px;
    border-bottom: 2px solid #333;
    margin-bottom: 20px;
  }

  .logo-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .logo-text {
    text-align: left;
  }

  .jeeves-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 42px;
    color: #1a0a5e;
    margin: 0;
    text-shadow: 2px 2px 0 #ccc;
    letter-spacing: -1px;
  }

  .jeeves-subtitle {
    font-size: 14px;
    color: #666;
    margin: 2px 0 0;
    font-style: italic;
  }

  /* Butler Figure */
  .butler-figure {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 80px;
    transition: transform 0.3s ease;
  }

  .butler-hat {
    font-size: 36px;
    line-height: 1;
    margin-bottom: -8px;
    z-index: 2;
  }

  .butler-face {
    font-size: 40px;
    line-height: 1;
    z-index: 1;
  }

  .face-emoji {
    display: inline-block;
  }

  .butler-body {
    position: relative;
    width: 44px;
    height: 36px;
    background: #1a1a1a;
    border-radius: 0 0 12px 12px;
    margin-top: -4px;
  }

  .butler-suit {
    position: absolute;
    inset: 0;
    border-radius: 0 0 12px 12px;
    background: linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%);
  }

  .butler-tie {
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 18px;
    background: #8b0000;
    clip-path: polygon(30% 0, 70% 0, 100% 30%, 60% 100%, 40% 100%, 0 30%);
  }

  /* Butler idle animations */
  .butler-idle-standing {
    animation: butler-breathe 3s ease-in-out infinite;
  }

  .butler-idle-adjusting-tie .butler-tie {
    animation: tie-adjust 0.6s ease-in-out;
  }

  .butler-idle-looking-right {
    animation: look-right 2s ease-in-out;
  }

  .butler-idle-looking-left {
    animation: look-left 2s ease-in-out;
  }

  .butler-idle-tapping {
    animation: tapping 1.5s ease-in-out;
  }

  .butler-thinking {
    animation: butler-think 1s ease-in-out infinite;
  }

  .butler-presenting {
    animation: butler-bow 0.8s ease-out forwards;
  }

  .butler-offended {
    animation: butler-recoil 0.5s ease-out;
  }

  .butler-confused .butler-hat {
    animation: hat-tilt 1s ease-in-out;
  }

  .thought-dots {
    position: absolute;
    top: -10px;
    right: -20px;
    display: flex;
    gap: 2px;
  }

  .dot {
    font-size: 24px;
    font-weight: bold;
    color: #666;
    animation: dot-bounce 1.2s ease-in-out infinite;
  }

  .dot-2 { animation-delay: 0.2s; }
  .dot-3 { animation-delay: 0.4s; }

  @keyframes butler-breathe {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes tie-adjust {
    0%, 100% { transform: translateX(-50%) rotate(0deg); }
    50% { transform: translateX(-50%) rotate(5deg) scale(1.1); }
  }

  @keyframes look-right {
    0%, 100% { transform: translateX(0); }
    30%, 70% { transform: translateX(4px); }
  }

  @keyframes look-left {
    0%, 100% { transform: translateX(0); }
    30%, 70% { transform: translateX(-4px); }
  }

  @keyframes tapping {
    0%, 100% { transform: translateY(0); }
    10% { transform: translateY(1px); }
    20% { transform: translateY(0); }
    30% { transform: translateY(1px); }
    40% { transform: translateY(0); }
    50% { transform: translateY(1px); }
    60% { transform: translateY(0); }
  }

  @keyframes butler-think {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-2px) rotate(-2deg); }
    75% { transform: translateY(-2px) rotate(2deg); }
  }

  @keyframes butler-bow {
    0% { transform: rotate(0deg) translateY(0); }
    40% { transform: rotate(15deg) translateY(4px); }
    100% { transform: rotate(0deg) translateY(0); }
  }

  @keyframes butler-recoil {
    0% { transform: translateX(0) scale(1); }
    30% { transform: translateX(8px) scale(1.05); }
    100% { transform: translateX(0) scale(1); }
  }

  @keyframes hat-tilt {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-10deg) translateX(-4px); }
  }

  @keyframes dot-bounce {
    0%, 100% { opacity: 0.3; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(-6px); }
  }

  /* Search Area */
  .search-area {
    margin: 24px 0;
    text-align: center;
  }

  .search-prompt {
    font-size: 14px;
    color: #333;
    margin-bottom: 12px;
  }

  .search-bar {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  .search-input {
    width: 100%;
    max-width: 440px;
    padding: 6px 10px;
    font-size: 16px;
    font-family: 'Times New Roman', Times, serif;
    border: 2px inset #aaa;
    background: #fff;
    outline: none;
  }

  .search-input:focus {
    border-color: #666;
  }

  .search-input:disabled {
    background: #eee;
  }

  .ask-button {
    padding: 6px 24px;
    font-size: 15px;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    background: #ddd;
    border: 2px outset #ccc;
    cursor: pointer;
    color: #000;
    min-width: 80px;
  }

  .ask-button:hover:not(:disabled) {
    background: #ccc;
  }

  .ask-button:active:not(:disabled) {
    border-style: inset;
    background: #bbb;
  }

  .ask-button:disabled {
    color: #999;
    cursor: default;
  }

  .search-options {
    display: flex;
    justify-content: center;
    gap: 16px;
    font-size: 12px;
    color: #666;
    flex-wrap: wrap;
  }

  .option-label {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: default;
  }

  .option-label input {
    margin: 0;
  }

  /* Special Message */
  .special-message {
    text-align: center;
    margin: 20px auto;
    max-width: 500px;
  }

  .speech-bubble {
    position: relative;
    background: #fffff0;
    border: 2px solid #999;
    border-radius: 12px;
    padding: 16px 20px;
    font-size: 18px;
    font-style: italic;
    color: #333;
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.1);
  }

  .speech-bubble::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 40px;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid #999;
  }

  .speech-bubble::after {
    content: '';
    position: absolute;
    top: -9px;
    left: 42px;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid #fffff0;
  }

  .quote-mark {
    font-size: 22px;
    color: #999;
  }

  .jeeves-sig {
    display: block;
    text-align: right;
    font-size: 13px;
    color: #888;
    margin-top: 6px;
  }

  /* Results */
  .results-area {
    margin: 24px 0;
    padding-top: 16px;
    border-top: 1px solid #ddd;
  }

  .searching-indicator {
    text-align: center;
    padding: 30px 0;
  }

  .hourglass {
    font-size: 40px;
    animation: hourglass-spin 2s linear infinite;
  }

  @keyframes hourglass-spin {
    0% { transform: rotate(0deg); }
    50% { transform: rotate(180deg); }
    100% { transform: rotate(180deg); }
  }

  .searching-indicator p {
    font-style: italic;
    color: #666;
    margin: 12px 0;
  }

  .progress-bar-container {
    width: 300px;
    max-width: 90%;
    height: 16px;
    background: #eee;
    border: 2px inset #ccc;
    margin: 12px auto;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0000cc, #6666ff);
    animation: progress-fill 2s ease-in-out infinite;
  }

  @keyframes progress-fill {
    0% { width: 0%; }
    80% { width: 95%; }
    100% { width: 95%; }
  }

  .you-asked {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }

  .results-count {
    font-size: 13px;
    color: #888;
    margin-bottom: 16px;
    font-style: italic;
  }

  .results-list {
    list-style: decimal;
    padding-left: 28px;
    margin: 0;
  }

  .result-item {
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px dotted #ddd;
  }

  .result-title {
    font-size: 16px;
    color: #0000cc;
    text-decoration: underline;
    cursor: pointer;
    font-weight: normal;
    display: inline-block;
    margin-bottom: 2px;
  }

  .result-title:hover {
    color: #6600cc;
  }

  .result-title:visited {
    color: #551a8b;
  }

  .result-url {
    display: block;
    font-size: 12px;
    color: #008000;
    font-family: 'Courier New', Courier, monospace;
    margin-bottom: 3px;
    word-break: break-all;
  }

  .result-desc {
    font-size: 13px;
    color: #333;
    margin: 4px 0 0;
    line-height: 1.4;
  }

  .result-item.broken .result-title {
    color: #cc0000;
    text-decoration: line-through;
  }

  .result-item.broken .result-url {
    color: #cc0000;
  }

  .broken-icon {
    margin-right: 3px;
  }

  .pagination {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 16px 0;
    font-size: 14px;
  }

  .pagination a {
    color: #0000cc;
    text-decoration: underline;
    cursor: pointer;
  }

  .pagination a:hover {
    color: #6600cc;
  }

  .page-current {
    font-weight: bold;
    color: #333;
  }

  /* Footer */
  .jeeves-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #333;
    text-align: center;
  }

  .hit-counter {
    font-size: 13px;
    color: #666;
    margin-bottom: 16px;
    background: #000;
    color: #0f0;
    font-family: 'Courier New', Courier, monospace;
    display: inline-block;
    padding: 4px 12px;
    border: 1px inset #444;
  }

  .counter-number {
    font-weight: bold;
    letter-spacing: 1px;
  }

  .webring {
    margin: 16px auto;
  }

  .webring-box {
    display: inline-block;
    border: 2px ridge #999;
    padding: 10px 20px;
    background: #f0f0f0;
  }

  .webring-title {
    font-size: 12px;
    font-weight: bold;
    margin: 0 0 6px;
    color: #333;
  }

  .webring-nav {
    display: flex;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
  }

  .webring-nav a {
    color: #0000cc;
    text-decoration: underline;
    cursor: pointer;
  }

  .webring-sep {
    color: #999;
  }

  .construction-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    margin: 16px 0;
    padding: 6px;
    background: repeating-linear-gradient(
      45deg,
      #ffcc00,
      #ffcc00 10px,
      #333 10px,
      #333 20px
    );
    font-size: 14px;
    animation: construction-scroll 2s linear infinite;
    background-size: 28px 28px;
  }

  @keyframes construction-scroll {
    0% { background-position: 0 0; }
    100% { background-position: 28px 0; }
  }

  .construction-text {
    background: #fff;
    padding: 2px 10px;
    font-weight: bold;
    font-size: 11px;
    letter-spacing: 2px;
    color: #333;
    font-family: Arial, sans-serif;
  }

  .browser-notice {
    font-size: 11px;
    color: #999;
    margin: 12px 0 4px;
    font-style: italic;
  }

  .copyright {
    font-size: 10px;
    color: #aaa;
    margin: 4px 0 20px;
  }

  /* Retro Popup */
  .retro-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 340px;
    max-width: 90vw;
    z-index: 1100;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
    border: 2px outset #ddd;
    background: #ece9d8;
    font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
    animation: popup-appear 0.2s ease-out;
  }

  @keyframes popup-appear {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  .popup-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, #0a246a 0%, #3a6ea5 100%);
    padding: 3px 5px;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
  }

  .popup-titlebar-text {
    padding-left: 3px;
  }

  .popup-close {
    width: 20px;
    height: 20px;
    background: #ddd;
    border: 1px outset #eee;
    color: #000;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .popup-close:hover {
    background: #c00;
    color: #fff;
  }

  .popup-close:active {
    border-style: inset;
  }

  .popup-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 12px;
  }

  .popup-icon {
    font-size: 32px;
  }

  .popup-message {
    font-size: 13px;
    color: #333;
    text-align: center;
    line-height: 1.4;
    margin: 0;
  }

  .popup-ok {
    padding: 4px 32px;
    font-size: 12px;
    background: #ddd;
    border: 2px outset #ccc;
    cursor: pointer;
    font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
  }

  .popup-ok:hover {
    background: #ccc;
  }

  .popup-ok:active {
    border-style: inset;
  }

  /* Beanie spot */
  .beanie-spot {
    position: fixed;
    bottom: 80px;
    left: 20px;
    z-index: 50;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .jeeves-title {
      font-size: 30px;
    }

    .logo-area {
      flex-direction: column;
      gap: 8px;
    }

    .logo-text {
      text-align: center;
    }

    .search-bar {
      flex-direction: column;
      align-items: center;
    }

    .search-input {
      max-width: 100%;
    }

    .ask-button {
      width: 100%;
      max-width: 440px;
    }

    .search-options {
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .retro-popup {
      width: 90vw;
    }

    .butler-figure {
      width: 60px;
    }

    .butler-hat {
      font-size: 28px;
    }

    .butler-face {
      font-size: 32px;
    }

    .butler-body {
      width: 36px;
      height: 28px;
    }
  }
</style>
