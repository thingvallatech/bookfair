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

  // Beanie hiding spot
  const hidingSpots: HidingSpot[] = [{ id: 'behind-downloads' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // Search state
  let searchQuery = $state('');
  let searchResults = $state<SearchResult[]>([]);
  let hasSearched = $state(false);
  let isSearching = $state(false);

  // Download state
  let downloads = $state<Download[]>([]);
  let nextDownloadId = $state(0);

  // Popup state
  let popups = $state<Popup[]>([]);
  let nextPopupId = $state(0);
  let popupInterval: ReturnType<typeof setInterval>;
  let downloadInterval: ReturnType<typeof setInterval>;

  // Selected file for highlighting
  let selectedFileIndex = $state<number | null>(null);

  // Stats
  let totalShared = $state(Math.floor(Math.random() * 500000) + 100000);
  let usersOnline = $state(Math.floor(Math.random() * 40000) + 10000);

  interface SearchResult {
    filename: string;
    size: string;
    sizeBytes: number;
    type: string;
    sources: number;
    speed: string;
    isVirus: boolean;
  }

  interface Download {
    id: number;
    filename: string;
    size: string;
    progress: number;
    speed: string;
    eta: string;
    status: 'downloading' | 'complete' | 'virus' | 'stalled';
    stallCounter: number;
    behavior: 'normal' | 'erratic' | 'backwards' | 'stuck99' | 'stall';
    isVirus: boolean;
  }

  interface Popup {
    id: number;
    type: 'ipod' | 'virus' | 'singles' | 'congratulations' | 'smiley' | 'casino';
    x: number;
    y: number;
    spawnsMore: boolean;
  }

  // ---- SEARCH RESULT GENERATION ----

  const fileExtensions = ['.mp3', '.mp3.exe', '.exe', '.wma', '.wav', '.avi', '.mpg', '.zip', '.scr', '.bat', '.jpg.exe', '.mp3.zip'];

  const speedOptions = ['56k', '56k', '56k', '56k', '28.8k', 'T1', 'Cable', 'DSL', '56k', '14.4k'];

  const virusNames = [
    'totally_not_a_virus',
    'FREE_DOWNLOAD_SAFE',
    'NO_SPYWARE_GUARANTEED',
    'CLICK_ME_ITS_SAFE',
    'trustme_legit_file',
    'antivirus_OFF_to_play',
    'disable_firewall_first',
  ];

  const billClintonFiles = [
    'bill_clinton_speech_1998_FULL.mp3',
    'clinton_saxophone_solo_RARE.wma',
    'bill_clinton_i_did_not_have_relations.mp3',
    'clinton_state_of_union_LEAKED.wav',
    'bill_clinton_playing_sax_on_arsenio.avi',
  ];

  const crazyFrogFiles = [
    'crazy_frog_axel_f_RINGTONE.mp3',
    'crazy_frog_ding_ding_REMIX.mp3',
    'annoying_thing_crazy_frog_HQ.wma',
    'crazy_frog_popcorn_EXTENDED.mp3',
    'crazy_frog_we_are_the_champions.mp3',
  ];

  const linuxIsos = [
    'ubuntu-6.06-desktop-i386.iso',
    'fedora-core-4-i386-disc1.iso',
    'knoppix_v5.1.1CD-2007-01-04-EN.iso',
    'debian-31r4-i386-binary-1.iso',
    'mandrake-linux-10.1-disc1.iso',
    'gentoo-2006.0-installcd-x86.iso',
    'slackware-11.0-install-d1.iso',
  ];

  const genericJunk = [
    'limewire_pro_crack.zip',
    'limewire_pro_KEYGEN.exe',
    'kazaa_lite_resurrection.exe',
    'FREE_RINGTONES_2004.zip',
    'bonzi_buddy_installer.exe',
    'cursor_mania_setup.exe',
    'comet_cursor_pack.exe',
    'weatherbug_toolbar.exe',
    'smiley_central_FULL.exe',
    'screensaver_FREE_paris_hilton.scr',
    'AOL_instant_messenger_HACK.exe',
    'myspace_profile_tracker.exe',
    'neopets_neopoints_generator.exe',
    'runescape_gold_hack_2005.exe',
    'AIM_buddy_spy_pro.zip',
    'internet_speed_booster_3000.exe',
    'RAM_doubler_pro_CRACKED.exe',
  ];

  function randomSize(): { display: string; bytes: number } {
    const absurdSizes = [
      { display: '3.2 KB', bytes: 3200 },
      { display: '847 MB', bytes: 847000000 },
      { display: '0.1 KB', bytes: 100 },
      { display: '2.4 GB', bytes: 2400000000 },
      { display: '69 KB', bytes: 69000 },
      { display: '420 KB', bytes: 420000 },
      { display: '1.21 GB', bytes: 1210000000 },
      { display: '666 KB', bytes: 666000 },
      { display: '3.50 MB', bytes: 3500000 },
      { display: '12 bytes', bytes: 12 },
      { display: '4.20 MB', bytes: 4200000 },
      { display: '1337 KB', bytes: 1337000 },
      { display: '99.9 MB', bytes: 99900000 },
      { display: '0 KB', bytes: 0 },
      { display: '7.77 MB', bytes: 7770000 },
    ];
    return absurdSizes[Math.floor(Math.random() * absurdSizes.length)];
  }

  function randomType(): string {
    const types = ['Audio', 'Video', 'Application', 'Document', 'Image', 'Archive', 'Screensaver', '???', 'Audio?', 'Definitely Music'];
    return types[Math.floor(Math.random() * types.length)];
  }

  function generateResults(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const q = query.toLowerCase().replace(/\s+/g, '_');

    // The actual thing but wrong extensions
    const wrongExts = ['.exe', '.mp3.exe', '.scr', '.bat', '.zip', '.wma'];
    for (let i = 0; i < 3; i++) {
      const ext = wrongExts[Math.floor(Math.random() * wrongExts.length)];
      const prefixes = ['', 'FULL_ALBUM_', 'HQ_', 'RARE_', 'NEW_', 'xXx_', '(1)_', 'copy_of_'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const size = randomSize();
      results.push({
        filename: `${prefix}${q}${ext}`,
        size: size.display,
        sizeBytes: size.bytes,
        type: randomType(),
        sources: Math.floor(Math.random() * 200) + 1,
        speed: speedOptions[Math.floor(Math.random() * speedOptions.length)],
        isVirus: Math.random() > 0.5,
      });
    }

    // Virus disguised as search
    const virusName = virusNames[Math.floor(Math.random() * virusNames.length)];
    const virusSize = randomSize();
    results.push({
      filename: `${virusName}_[${q}].mp3.exe`,
      size: virusSize.display,
      sizeBytes: virusSize.bytes,
      type: 'Audio?',
      sources: Math.floor(Math.random() * 5) + 1,
      speed: '56k',
      isVirus: true,
    });

    // Bill Clinton
    const clinton = billClintonFiles[Math.floor(Math.random() * billClintonFiles.length)];
    const clintonSize = randomSize();
    results.push({
      filename: clinton,
      size: clintonSize.display,
      sizeBytes: clintonSize.bytes,
      type: 'Audio',
      sources: Math.floor(Math.random() * 50) + 10,
      speed: speedOptions[Math.floor(Math.random() * speedOptions.length)],
      isVirus: Math.random() > 0.7,
    });

    // Crazy Frog
    const frog = crazyFrogFiles[Math.floor(Math.random() * crazyFrogFiles.length)];
    const frogSize = randomSize();
    results.push({
      filename: frog,
      size: frogSize.display,
      sizeBytes: frogSize.bytes,
      type: 'Audio',
      sources: Math.floor(Math.random() * 300) + 50,
      speed: speedOptions[Math.floor(Math.random() * speedOptions.length)],
      isVirus: false,
    });

    // Linux ISO
    const iso = linuxIsos[Math.floor(Math.random() * linuxIsos.length)];
    results.push({
      filename: iso,
      size: '694 MB',
      sizeBytes: 694000000,
      type: 'Archive',
      sources: Math.floor(Math.random() * 10) + 1,
      speed: 'T1',
      isVirus: false,
    });

    // Generic junk
    for (let i = 0; i < 3; i++) {
      const junk = genericJunk[Math.floor(Math.random() * genericJunk.length)];
      const junkSize = randomSize();
      results.push({
        filename: junk,
        size: junkSize.display,
        sizeBytes: junkSize.bytes,
        type: randomType(),
        sources: Math.floor(Math.random() * 100) + 1,
        speed: speedOptions[Math.floor(Math.random() * speedOptions.length)],
        isVirus: Math.random() > 0.4,
      });
    }

    // More wrong versions of the query
    const suffixes = [
      `${q}_FULL_ALBUM_2003.zip`,
      `${q}_live_in_concert_bootleg.mp3`,
      `${q}_ringtone_nokia.mmf`,
      `${q}_music_video_144p.avi`,
      `${q}_karaoke_version.wma`,
      `not_${q}_but_close_enough.mp3`,
      `${q}_SAMPLE_buy_full_version.mp3`,
    ];
    for (let i = 0; i < 2; i++) {
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const sSize = randomSize();
      results.push({
        filename: suffix,
        size: sSize.display,
        sizeBytes: sSize.bytes,
        type: randomType(),
        sources: Math.floor(Math.random() * 80) + 1,
        speed: speedOptions[Math.floor(Math.random() * speedOptions.length)],
        isVirus: Math.random() > 0.6,
      });
    }

    // Shuffle results
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return results;
  }

  // ---- SEARCH ----

  function doSearch() {
    if (!searchQuery.trim()) return;
    playSound('click', 0.2);
    isSearching = true;
    hasSearched = true;
    searchResults = [];
    selectedFileIndex = null;

    // Simulate search delay
    setTimeout(() => {
      searchResults = generateResults(searchQuery);
      isSearching = false;
    }, 800 + Math.random() * 1500);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      doSearch();
    }
  }

  // ---- DOWNLOADS ----

  const etaOptions = [
    '2 hours remaining',
    '47 minutes remaining',
    '6 days remaining',
    '12 seconds remaining',
    '∞',
    '3 weeks remaining',
    'About 5 minutes',
    '23 hours remaining',
    'Calculating...',
    '1 year remaining',
    '99 hours remaining',
    'Almost done!',
    'Not long now...',
    'ETA: Thursday',
    'ETA: Never',
    'Sometime next week',
  ];

  const downloadSpeedOptions = [
    '2.3 KB/s',
    '0.1 KB/s',
    '12 KB/s',
    '0.0 KB/s',
    '0.3 KB/s',
    '156 B/s',
    '1.1 KB/s',
    '0.01 KB/s',
    '45 KB/s',
    '0.5 KB/s',
    '7 B/s',
    '3.2 KB/s',
    '0.0 B/s',
    '89 KB/s',
    '0.02 KB/s',
  ];

  function startDownload(result: SearchResult) {
    playSound('click', 0.2);

    const behaviors: Download['behavior'][] = ['normal', 'erratic', 'backwards', 'stuck99', 'stall', 'erratic', 'stall'];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

    const dl: Download = {
      id: nextDownloadId++,
      filename: result.filename,
      size: result.size,
      progress: 0,
      speed: downloadSpeedOptions[Math.floor(Math.random() * downloadSpeedOptions.length)],
      eta: etaOptions[Math.floor(Math.random() * etaOptions.length)],
      status: 'downloading',
      stallCounter: 0,
      behavior,
      isVirus: result.isVirus,
    };

    downloads = [...downloads, dl];
  }

  function tickDownloads() {
    downloads = downloads.map(dl => {
      if (dl.status !== 'downloading') return dl;

      let newProgress = dl.progress;
      const newSpeed = downloadSpeedOptions[Math.floor(Math.random() * downloadSpeedOptions.length)];
      const newEta = Math.random() > 0.7 ? etaOptions[Math.floor(Math.random() * etaOptions.length)] : dl.eta;

      switch (dl.behavior) {
        case 'normal':
          newProgress += Math.random() * 3 + 0.5;
          break;
        case 'erratic':
          if (Math.random() > 0.3) {
            newProgress += Math.random() * 8;
          } else {
            newProgress -= Math.random() * 3;
          }
          break;
        case 'backwards':
          if (dl.progress < 40) {
            newProgress += Math.random() * 2;
          } else {
            newProgress -= Math.random() * 1.5;
            if (Math.random() > 0.8) newProgress += Math.random() * 5;
          }
          break;
        case 'stuck99':
          if (dl.progress < 99) {
            newProgress += Math.random() * 5 + 1;
            if (newProgress > 99) newProgress = 99;
          } else {
            dl.stallCounter++;
            if (dl.stallCounter > 20) {
              // Finally either complete or virus
              if (dl.isVirus) {
                playSound('error', 0.3);
                return { ...dl, status: 'virus' as const, progress: 99 };
              } else {
                playSound('success', 0.3);
                return { ...dl, status: 'complete' as const, progress: 100 };
              }
            }
          }
          break;
        case 'stall':
          dl.stallCounter++;
          if (dl.stallCounter < 8) {
            // Stalled at the start
            newProgress += Math.random() * 0.1;
          } else if (dl.stallCounter < 15) {
            // Sudden burst
            newProgress += Math.random() * 10;
          } else {
            // Stall again
            newProgress += Math.random() * 0.05;
            if (dl.stallCounter > 25) {
              // Reset behavior
              dl.stallCounter = 0;
            }
          }
          break;
      }

      newProgress = Math.max(0, Math.min(100, newProgress));

      // Check for completion (not stuck99, that has its own logic)
      if (dl.behavior !== 'stuck99' && newProgress >= 100) {
        if (dl.isVirus && Math.random() > 0.3) {
          playSound('error', 0.3);
          return { ...dl, progress: 100, speed: newSpeed, eta: newEta, status: 'virus' as const };
        } else {
          playSound('success', 0.3);
          return { ...dl, progress: 100, speed: newSpeed, eta: newEta, status: 'complete' as const };
        }
      }

      return { ...dl, progress: newProgress, speed: newSpeed, eta: newEta };
    });
  }

  function removeDownload(id: number) {
    downloads = downloads.filter(d => d.id !== id);
  }

  // ---- POPUPS ----

  const popupTypes: Popup['type'][] = ['ipod', 'virus', 'singles', 'congratulations', 'smiley', 'casino'];

  const popupContent: Record<Popup['type'], { title: string; body: string; color: string; bg: string }> = {
    ipod: {
      title: 'CONGRATULATIONS!!!',
      body: 'You are the 1,000,000th visitor! Click here to claim your FREE iPod Nano!',
      color: '#000',
      bg: 'linear-gradient(135deg, #ffeb3b, #ff9800)',
    },
    virus: {
      title: 'WARNING! VIRUS DETECTED!',
      body: 'Your computer has 847 viruses! Download AntiVirus Pro 2004 NOW before your hard drive is DESTROYED!',
      color: '#fff',
      bg: 'linear-gradient(135deg, #d32f2f, #b71c1c)',
    },
    singles: {
      title: 'Hot Singles In Your Area!',
      body: 'Local singles are DYING to meet you! Click here NOW! No credit card required!*',
      color: '#fff',
      bg: 'linear-gradient(135deg, #e91e63, #ad1457)',
    },
    congratulations: {
      title: 'YOU WON $1,000,000!!!',
      body: 'Enter your social security number and mother\'s maiden name to claim your prize!',
      color: '#000',
      bg: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    },
    smiley: {
      title: 'FREE Smiley Pack!!!',
      body: 'Download 10,000 FREE smileys for AIM! Your friends will be SO jealous!!! :) :D ;) XD',
      color: '#000',
      bg: 'linear-gradient(135deg, #ffeb3b, #ffc107)',
    },
    casino: {
      title: 'ONLINE CASINO - FREE $500!',
      body: 'Play Texas Hold\'em NOW! Free $500 bonus! You WILL win! Click here!',
      color: '#ffd700',
      bg: 'linear-gradient(135deg, #1a237e, #0d0d0d)',
    },
  };

  function spawnPopup() {
    if (popups.length >= 5) return; // Max popups

    const type = popupTypes[Math.floor(Math.random() * popupTypes.length)];
    const popup: Popup = {
      id: nextPopupId++,
      type,
      x: Math.random() * 50 + 10,
      y: Math.random() * 40 + 10,
      spawnsMore: Math.random() > 0.6,
    };

    popups = [...popups, popup];
    playSound('pop', 0.2);
  }

  function closePopup(id: number) {
    const popup = popups.find(p => p.id === id);
    playSound('pop', 0.2);

    if (popup?.spawnsMore && Math.random() > 0.4) {
      // Closing triggers another popup
      popups = popups.filter(p => p.id !== id);
      setTimeout(spawnPopup, 200);
    } else {
      popups = popups.filter(p => p.id !== id);
    }
  }

  // ---- LIFECYCLE ----

  onMount(() => {
    registerSpots('napster', hidingSpots);
    const beanies = getBeaniesForArea('napster');
    hiddenBeanie = beanies.get('behind-downloads') || null;

    // Random popup timer
    popupInterval = setInterval(() => {
      if (Math.random() > 0.6 && hasSearched) {
        spawnPopup();
      }
    }, 8000);

    // Download tick
    downloadInterval = setInterval(tickDownloads, 500);
  });

  onDestroy(() => {
    clearInterval(popupInterval);
    clearInterval(downloadInterval);
  });
</script>

<div class="napster-container">
  <CloseButton onClose={onClose} />

  <!-- Title Bar -->
  <div class="title-bar">
    <div class="title-bar-left">
      <span class="app-icon">&#127925;</span>
      <span class="app-title">LimeWire 4.18.8</span>
    </div>
    <div class="title-bar-buttons">
      <button class="title-btn minimize">_</button>
      <button class="title-btn maximize">&#9633;</button>
      <button class="title-btn close-x" onclick={onClose}>X</button>
    </div>
  </div>

  <!-- Menu Bar -->
  <div class="menu-bar">
    <span class="menu-item">File</span>
    <span class="menu-item">View</span>
    <span class="menu-item">Navigation</span>
    <span class="menu-item">Tools</span>
    <span class="menu-item">Help</span>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-tabs">
      <button class="toolbar-tab active">
        <span class="tab-icon">&#128269;</span>
        Search
      </button>
      <button class="toolbar-tab">
        <span class="tab-icon">&#128229;</span>
        Library
      </button>
      <button class="toolbar-tab">
        <span class="tab-icon">&#128101;</span>
        Community
      </button>
    </div>
  </div>

  <!-- Search Area -->
  <div class="search-area">
    <div class="search-row">
      <label class="search-label" for="napster-search">Search for:</label>
      <input
        id="napster-search"
        class="search-input"
        type="text"
        placeholder="Enter artist, song, or file name..."
        bind:value={searchQuery}
        onkeydown={handleSearchKeydown}
      />
      <button class="search-btn" onclick={doSearch}>
        &#128269; Search
      </button>
    </div>
    <div class="search-filters">
      <span class="filter-label">Type:</span>
      <select class="filter-select">
        <option>All Types</option>
        <option>Audio</option>
        <option>Video</option>
        <option>Documents</option>
        <option>Programs</option>
        <option>Images</option>
        <option>Linux ISOs (definitely)</option>
      </select>
      <span class="filter-label">Speed:</span>
      <select class="filter-select">
        <option>Any Speed</option>
        <option>56k or faster</option>
        <option>Cable/DSL</option>
        <option>T1 (lol)</option>
      </select>
    </div>
  </div>

  <!-- Results Table -->
  <div class="results-area">
    {#if isSearching}
      <div class="searching-msg">
        <div class="searching-spinner"></div>
        <span>Searching {usersOnline.toLocaleString()} users for "{searchQuery}"...</span>
      </div>
    {:else if hasSearched && searchResults.length > 0}
      <div class="results-header">
        {searchResults.length} results for "{searchQuery}" ({totalShared.toLocaleString()} files shared on network)
      </div>
      <div class="results-table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th class="col-name">File Name</th>
              <th class="col-size">Size</th>
              <th class="col-type">Type</th>
              <th class="col-sources">Sources</th>
              <th class="col-speed">Speed</th>
            </tr>
          </thead>
          <tbody>
            {#each searchResults as result, i}
              <tr
                class="result-row"
                class:selected={selectedFileIndex === i}
                class:suspicious={result.filename.endsWith('.exe') || result.filename.endsWith('.scr') || result.filename.endsWith('.bat')}
                onclick={() => { selectedFileIndex = i; playSound('click', 0.2); }}
                ondblclick={() => startDownload(result)}
              >
                <td class="col-name">
                  <span class="file-icon">
                    {#if result.filename.endsWith('.mp3') || result.filename.endsWith('.wma') || result.filename.endsWith('.wav')}
                      &#127925;
                    {:else if result.filename.endsWith('.avi') || result.filename.endsWith('.mpg')}
                      &#127916;
                    {:else if result.filename.endsWith('.iso')}
                      &#128191;
                    {:else if result.filename.endsWith('.zip')}
                      &#128230;
                    {:else}
                      &#9888;&#65039;
                    {/if}
                  </span>
                  {result.filename}
                </td>
                <td class="col-size">{result.size}</td>
                <td class="col-type">{result.type}</td>
                <td class="col-sources">{result.sources}</td>
                <td class="col-speed">
                  <span class="speed-indicator" class:fast={result.speed === 'T1' || result.speed === 'Cable'}>
                    {result.speed}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="results-footer">
        Double-click a file to download | Right-click for more options (jk this is a web browser)
      </div>
    {:else if hasSearched}
      <div class="no-results">
        No results found. Try "linkin park" or "free ringtones" or literally anything.
      </div>
    {:else}
      <div class="welcome-msg">
        <div class="welcome-icon">&#127925;</div>
        <h2>Welcome to LimeWire</h2>
        <p>Search for music, videos, and definitely-not-viruses above.</p>
        <p class="welcome-stats">
          {usersOnline.toLocaleString()} users online | {totalShared.toLocaleString()} files shared
        </p>
        <p class="welcome-warning">
          WARNING: Downloading copyrighted material is illegal.*<br/>
          <span class="small">*But everyone does it anyway lol</span>
        </p>
      </div>
    {/if}
  </div>

  <!-- Downloads Panel -->
  <div class="downloads-panel" class:expanded={downloads.length > 0}>
    <div class="downloads-header">
      <span class="downloads-title">&#128229; Downloads ({downloads.length})</span>
      {#if downloads.length > 0}
        <button class="clear-done-btn" onclick={() => { downloads = downloads.filter(d => d.status === 'downloading'); }}>
          Clear Completed
        </button>
      {/if}
    </div>
    {#if downloads.length > 0}
      <div class="downloads-list">
        {#each downloads as dl (dl.id)}
          <div class="download-item" class:virus={dl.status === 'virus'} class:complete={dl.status === 'complete'}>
            <div class="download-info">
              <span class="download-name">{dl.filename}</span>
              <span class="download-meta">
                {#if dl.status === 'downloading'}
                  {dl.size} | {dl.speed} | {dl.eta}
                {:else if dl.status === 'complete'}
                  {dl.size} | Download Complete!
                {:else if dl.status === 'virus'}
                  VIRUS DETECTED - FILE QUARANTINED
                {/if}
              </span>
            </div>
            <div class="download-bar-wrapper">
              <div class="download-bar">
                <div
                  class="download-bar-fill"
                  class:virus-bar={dl.status === 'virus'}
                  class:complete-bar={dl.status === 'complete'}
                  style="width: {Math.min(dl.progress, 100)}%"
                ></div>
              </div>
              <span class="download-percent">
                {#if dl.status === 'virus'}
                  &#9888;&#65039;
                {:else if dl.status === 'complete'}
                  &#9989;
                {:else}
                  {Math.floor(dl.progress)}%
                {/if}
              </span>
              <button class="download-remove" onclick={() => removeDownload(dl.id)} title="Remove">
                &#10005;
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Beanie hiding spot -->
    {#if hiddenBeanie}
      <div class="beanie-spot">
        <HidingBeanie beanie={hiddenBeanie} />
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <span class="status-item">Connected: {usersOnline.toLocaleString()} users</span>
    <span class="status-sep">|</span>
    <span class="status-item">Shared: {totalShared.toLocaleString()} files</span>
    <span class="status-sep">|</span>
    <span class="status-item">Downloads: {downloads.filter(d => d.status === 'downloading').length} active</span>
    <span class="status-sep">|</span>
    <span class="status-item status-speed">&#8595; 0.3 KB/s &#8593; 0.0 KB/s</span>
  </div>

  <!-- Popup Ads -->
  {#each popups as popup (popup.id)}
    <div
      class="popup-ad"
      style="left: {popup.x}%; top: {popup.y}%; background: {popupContent[popup.type].bg}; color: {popupContent[popup.type].color};"
    >
      <div class="popup-titlebar">
        <span class="popup-title">{popupContent[popup.type].title}</span>
        <button class="popup-close" onclick={() => closePopup(popup.id)} title="Close">X</button>
      </div>
      <div class="popup-body">
        <p>{popupContent[popup.type].body}</p>
        <div class="popup-buttons">
          <button class="popup-btn popup-btn-yes" onclick={() => closePopup(popup.id)}>
            OK!!! YES!!!
          </button>
          <button class="popup-btn popup-btn-no" onclick={() => closePopup(popup.id)}>
            No thanks
          </button>
        </div>
        {#if popup.type === 'virus'}
          <div class="popup-blink">&#9888;&#65039; URGENT! ACT NOW! &#9888;&#65039;</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  /* ---- CONTAINER ---- */
  .napster-container {
    position: fixed;
    inset: 0;
    background: #c0c0c0;
    display: flex;
    flex-direction: column;
    font-family: 'Tahoma', 'Segoe UI', 'Arial', sans-serif;
    font-size: 12px;
    color: #000;
    overflow: hidden;
    z-index: 100;
  }

  /* ---- TITLE BAR ---- */
  .title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, #0a246a 0%, #3a6ea5 100%);
    color: white;
    padding: 3px 6px;
    font-weight: bold;
    font-size: 13px;
    min-height: 26px;
    flex-shrink: 0;
  }

  .title-bar-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .app-icon {
    font-size: 16px;
  }

  .app-title {
    font-family: 'Tahoma', sans-serif;
    text-shadow: 1px 1px 1px rgba(0,0,0,0.4);
  }

  .title-bar-buttons {
    display: flex;
    gap: 2px;
  }

  .title-btn {
    width: 21px;
    height: 21px;
    background: linear-gradient(180deg, #dfe4e8 0%, #b5bdc6 50%, #a0a8b0 100%);
    border: 1px solid #708090;
    border-radius: 3px;
    color: #000;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
  }

  .title-btn:hover {
    background: linear-gradient(180deg, #eef2f6 0%, #c5cdd6 50%, #b0b8c0 100%);
  }

  .title-btn.close-x {
    background: linear-gradient(180deg, #e8a0a0 0%, #c05050 50%, #a03030 100%);
    color: white;
  }

  .title-btn.close-x:hover {
    background: linear-gradient(180deg, #f0b0b0 0%, #d06060 50%, #b04040 100%);
  }

  /* ---- MENU BAR ---- */
  .menu-bar {
    background: #ece9d8;
    border-bottom: 1px solid #aca899;
    padding: 2px 4px;
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .menu-item {
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 2px;
  }

  .menu-item:hover {
    background: #316ac5;
    color: white;
  }

  /* ---- TOOLBAR ---- */
  .toolbar {
    background: linear-gradient(180deg, #f6f6f6 0%, #e3e3e0 50%, #d8d8d4 100%);
    border-bottom: 1px solid #aca899;
    padding: 4px 8px;
    flex-shrink: 0;
  }

  .toolbar-tabs {
    display: flex;
    gap: 2px;
  }

  .toolbar-tab {
    padding: 4px 14px;
    background: linear-gradient(180deg, #f0f0ee 0%, #d8d8d4 100%);
    border: 1px solid #aca899;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-size: 12px;
    font-family: 'Tahoma', sans-serif;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #333;
  }

  .toolbar-tab.active {
    background: white;
    font-weight: bold;
    border-bottom: 1px solid white;
    margin-bottom: -1px;
  }

  .tab-icon {
    font-size: 14px;
  }

  /* ---- SEARCH AREA ---- */
  .search-area {
    background: #f5f5f0;
    border-bottom: 1px solid #d4d0c8;
    padding: 8px 12px;
    flex-shrink: 0;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .search-label {
    font-weight: bold;
    font-size: 12px;
    white-space: nowrap;
    color: #333;
  }

  .search-input {
    flex: 1;
    padding: 4px 8px;
    border: 2px inset #d4d0c8;
    background: white;
    font-size: 13px;
    font-family: 'Tahoma', sans-serif;
    outline: none;
  }

  .search-input:focus {
    border-color: #316ac5;
  }

  .search-btn {
    padding: 4px 16px;
    background: linear-gradient(180deg, #f0f0ee 0%, #d4d0c8 100%);
    border: 2px outset #d4d0c8;
    cursor: pointer;
    font-weight: bold;
    font-size: 12px;
    font-family: 'Tahoma', sans-serif;
    white-space: nowrap;
  }

  .search-btn:hover {
    background: linear-gradient(180deg, #e8e8e4 0%, #ccc8c0 100%);
  }

  .search-btn:active {
    border-style: inset;
  }

  .search-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 11px;
    color: #666;
  }

  .filter-select {
    padding: 2px 4px;
    border: 1px solid #aca899;
    background: white;
    font-size: 11px;
    font-family: 'Tahoma', sans-serif;
  }

  /* ---- RESULTS AREA ---- */
  .results-area {
    flex: 1;
    overflow-y: auto;
    background: white;
    border: 2px inset #d4d0c8;
    margin: 0 4px;
    min-height: 0;
  }

  .searching-msg {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: #666;
    font-size: 13px;
  }

  .searching-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #ddd;
    border-top: 3px solid #316ac5;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .results-header {
    padding: 4px 8px;
    background: #ece9d8;
    border-bottom: 1px solid #d4d0c8;
    font-size: 11px;
    color: #444;
  }

  .results-table-wrapper {
    overflow-x: auto;
  }

  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .results-table thead {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .results-table th {
    background: linear-gradient(180deg, #f6f6f6 0%, #e3e3e0 50%, #d4d0c8 100%);
    border: 1px solid #aca899;
    border-top: none;
    padding: 3px 8px;
    text-align: left;
    font-weight: bold;
    font-size: 11px;
    color: #333;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .results-table th:hover {
    background: linear-gradient(180deg, #fff 0%, #ece9d8 100%);
  }

  .result-row {
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
  }

  .result-row:hover {
    background: #e8e8ff;
  }

  .result-row.selected {
    background: #316ac5;
    color: white;
  }

  .result-row.selected .speed-indicator {
    color: white;
  }

  .result-row.suspicious .col-name {
    color: inherit;
  }

  .results-table td {
    padding: 3px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  .col-name {
    min-width: 200px;
  }

  .col-size {
    text-align: right;
    min-width: 70px;
  }

  .col-type {
    min-width: 80px;
  }

  .col-sources {
    text-align: center;
    min-width: 60px;
  }

  .col-speed {
    min-width: 60px;
  }

  .file-icon {
    margin-right: 4px;
    font-size: 13px;
  }

  .speed-indicator {
    color: #888;
    font-size: 11px;
  }

  .speed-indicator.fast {
    color: #2e7d32;
    font-weight: bold;
  }

  .results-footer {
    padding: 4px 8px;
    background: #f5f5f0;
    border-top: 1px solid #d4d0c8;
    font-size: 10px;
    color: #888;
    text-align: center;
  }

  .no-results {
    padding: 40px 20px;
    text-align: center;
    color: #888;
    font-size: 13px;
  }

  /* ---- WELCOME MESSAGE ---- */
  .welcome-msg {
    padding: 40px 20px;
    text-align: center;
    color: #555;
  }

  .welcome-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .welcome-msg h2 {
    font-family: 'Press Start 2P', 'Tahoma', sans-serif;
    font-size: 18px;
    color: #2e7d32;
    margin: 0 0 12px;
  }

  .welcome-msg p {
    margin: 6px 0;
    font-size: 13px;
  }

  .welcome-stats {
    color: #888;
    font-size: 11px !important;
    margin-top: 16px !important;
  }

  .welcome-warning {
    margin-top: 20px !important;
    color: #999;
    font-size: 11px !important;
    font-style: italic;
  }

  .welcome-warning .small {
    font-size: 9px;
    color: #bbb;
  }

  /* ---- DOWNLOADS PANEL ---- */
  .downloads-panel {
    background: #ece9d8;
    border-top: 2px solid #d4d0c8;
    flex-shrink: 0;
    max-height: 30vh;
    overflow-y: auto;
    position: relative;
  }

  .downloads-panel.expanded {
    min-height: 80px;
  }

  .downloads-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: linear-gradient(180deg, #f6f6f6 0%, #e3e3e0 100%);
    border-bottom: 1px solid #d4d0c8;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .downloads-title {
    font-weight: bold;
    font-size: 12px;
    color: #333;
  }

  .clear-done-btn {
    padding: 2px 8px;
    background: linear-gradient(180deg, #f0f0ee 0%, #d4d0c8 100%);
    border: 1px outset #d4d0c8;
    cursor: pointer;
    font-size: 10px;
    font-family: 'Tahoma', sans-serif;
  }

  .clear-done-btn:hover {
    background: linear-gradient(180deg, #e8e8e4 0%, #ccc8c0 100%);
  }

  .downloads-list {
    padding: 4px 8px;
  }

  .download-item {
    padding: 6px 8px;
    margin-bottom: 4px;
    background: white;
    border: 1px solid #d4d0c8;
    border-radius: 2px;
  }

  .download-item.virus {
    background: #ffe0e0;
    border-color: #ff6666;
  }

  .download-item.complete {
    background: #e0ffe0;
    border-color: #66cc66;
  }

  .download-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    flex-wrap: wrap;
    gap: 4px;
  }

  .download-name {
    font-weight: bold;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 50%;
  }

  .download-meta {
    font-size: 10px;
    color: #666;
    white-space: nowrap;
  }

  .download-item.virus .download-meta {
    color: #cc0000;
    font-weight: bold;
  }

  .download-item.complete .download-meta {
    color: #2e7d32;
    font-weight: bold;
  }

  .download-bar-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .download-bar {
    flex: 1;
    height: 14px;
    background: #e8e8e8;
    border: 1px inset #d4d0c8;
    border-radius: 1px;
    overflow: hidden;
  }

  .download-bar-fill {
    height: 100%;
    background: linear-gradient(180deg, #7ec87e 0%, #3da03d 50%, #2d8a2d 100%);
    transition: width 0.4s ease;
    position: relative;
  }

  .download-bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 6px,
      rgba(255,255,255,0.2) 6px,
      rgba(255,255,255,0.2) 8px
    );
  }

  .download-bar-fill.virus-bar {
    background: linear-gradient(180deg, #e87e7e 0%, #cc3333 50%, #aa2222 100%);
  }

  .download-bar-fill.complete-bar {
    background: linear-gradient(180deg, #7ec87e 0%, #3da03d 50%, #2d8a2d 100%);
  }

  .download-percent {
    font-size: 11px;
    font-weight: bold;
    min-width: 30px;
    text-align: right;
    color: #333;
  }

  .download-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #999;
    font-size: 12px;
    padding: 0 4px;
    line-height: 1;
  }

  .download-remove:hover {
    color: #cc0000;
  }

  .beanie-spot {
    position: absolute;
    bottom: 4px;
    right: 12px;
    z-index: 5;
  }

  /* ---- STATUS BAR ---- */
  .status-bar {
    background: #ece9d8;
    border-top: 1px solid #fff;
    padding: 3px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #444;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .status-sep {
    color: #bbb;
  }

  .status-speed {
    margin-left: auto;
  }

  /* ---- POPUP ADS ---- */
  .popup-ad {
    position: absolute;
    width: 300px;
    border-radius: 6px;
    box-shadow: 4px 4px 16px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.3);
    z-index: 500;
    animation: popupBounce 0.3s ease-out;
    font-family: 'Arial', sans-serif;
    overflow: hidden;
  }

  @keyframes popupBounce {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }

  .popup-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: rgba(0,0,0,0.3);
    font-weight: bold;
    font-size: 11px;
  }

  .popup-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .popup-close {
    width: 18px;
    height: 18px;
    background: rgba(255,255,255,0.3);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 2px;
    color: inherit;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
  }

  .popup-close:hover {
    background: rgba(255,0,0,0.6);
    color: white;
  }

  .popup-body {
    padding: 12px;
    font-size: 13px;
    line-height: 1.4;
  }

  .popup-body p {
    margin: 0 0 10px;
  }

  .popup-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .popup-btn {
    padding: 6px 16px;
    border: 2px outset #ccc;
    cursor: pointer;
    font-weight: bold;
    font-size: 12px;
    border-radius: 3px;
  }

  .popup-btn-yes {
    background: #ff6600;
    color: white;
    border-color: #cc5500;
    animation: popupPulse 0.8s ease-in-out infinite;
  }

  .popup-btn-no {
    background: #ddd;
    color: #999;
    font-size: 8px;
    padding: 4px 8px;
  }

  @keyframes popupPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .popup-blink {
    text-align: center;
    margin-top: 10px;
    font-weight: bold;
    font-size: 14px;
    animation: blinkText 0.5s step-end infinite;
  }

  @keyframes blinkText {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* ---- MOBILE ---- */
  @media (max-width: 768px) {
    .napster-container {
      font-size: 11px;
    }

    .title-bar {
      font-size: 11px;
      padding: 2px 4px;
      padding-top: max(2px, env(safe-area-inset-top));
    }

    .toolbar-tab {
      padding: 3px 8px;
      font-size: 11px;
    }

    .tab-icon {
      display: none;
    }

    .search-row {
      flex-wrap: wrap;
    }

    .search-label {
      display: none;
    }

    .search-input {
      font-size: 16px; /* Prevent iOS zoom */
      min-width: 0;
    }

    .search-filters {
      display: none;
    }

    .results-table td {
      max-width: 180px;
      font-size: 11px;
      padding: 4px 4px;
    }

    .results-table th {
      font-size: 10px;
      padding: 3px 4px;
    }

    .col-type, .col-sources {
      display: none;
    }

    .popup-ad {
      width: 240px;
      font-size: 11px;
    }

    .welcome-msg h2 {
      font-size: 14px;
    }

    .download-name {
      max-width: 40%;
    }

    .menu-bar {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .col-speed {
      display: none;
    }

    .toolbar {
      display: none;
    }

    .popup-ad {
      width: 200px;
      left: 10% !important;
    }
  }
</style>
