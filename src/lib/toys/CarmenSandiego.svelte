<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Hidden beanie behind globe
  const hidingSpots: HidingSpot[] = [{ id: 'behind-globe' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // ---------- Types ----------

  interface Witness {
    type: 'Informant' | 'Tourist' | 'Local';
    clue: string;
  }

  interface CityStop {
    city: string;
    country: string;
    witnesses: Witness[];
    nextCorrect: string; // city name of correct next destination
    nextChoices: string[]; // 3 city names including correct
    landmark: string; // CSS landmark identifier
  }

  interface CaseFile {
    villain: string;
    stolenItem: string;
    trail: CityStop[];
    difficulty: number;
  }

  type Screen = 'title' | 'briefing' | 'city' | 'travel' | 'witness' | 'wrong-city' | 'warrant' | 'arrest' | 'gameover' | 'win';

  type Rank = 'Junior Detective' | 'Detective' | 'Senior Detective' | 'Super Sleuth' | "ACME's Finest";

  // ---------- Case Data ----------

  const cases: CaseFile[] = [
    {
      villain: 'Sarah Nade',
      stolenItem: 'The Crown Jewels of England',
      difficulty: 1,
      trail: [
        {
          city: 'London',
          country: 'England',
          landmark: 'big-ben',
          witnesses: [
            { type: 'Informant', clue: 'She was studying a French phrasebook and muttering about croissants.' },
            { type: 'Tourist', clue: 'I saw her buying a beret and a miniature Eiffel Tower keychain.' },
            { type: 'Local', clue: 'She asked me how to get to the Eurostar terminal heading south.' }
          ],
          nextCorrect: 'Paris',
          nextChoices: ['Paris', 'Berlin', 'Madrid']
        },
        {
          city: 'Paris',
          country: 'France',
          landmark: 'eiffel-tower',
          witnesses: [
            { type: 'Informant', clue: 'She mentioned canals and asked about wooden shoes.' },
            { type: 'Tourist', clue: 'She was looking at a map of the Low Countries, pointing at tulip fields.' },
            { type: 'Local', clue: 'She bought a train ticket and said something about windmills.' }
          ],
          nextCorrect: 'Amsterdam',
          nextChoices: ['Amsterdam', 'Brussels', 'Copenhagen']
        },
        {
          city: 'Amsterdam',
          country: 'Netherlands',
          landmark: 'windmill',
          witnesses: [
            { type: 'Informant', clue: 'She was reading about ancient ruins and the Acropolis.' },
            { type: 'Tourist', clue: 'I heard her say "Kalimera" into her phone - that is Greek for good morning.' },
            { type: 'Local', clue: 'She booked a flight heading southeast, toward the Mediterranean.' }
          ],
          nextCorrect: 'Athens',
          nextChoices: ['Athens', 'Rome', 'Istanbul']
        },
        {
          city: 'Athens',
          country: 'Greece',
          landmark: 'parthenon',
          witnesses: [
            { type: 'Informant', clue: 'This is her final hideout! Issue a warrant to catch her!' },
            { type: 'Tourist', clue: 'She seemed nervous, like she was planning to stay a while.' },
            { type: 'Local', clue: 'She rented an apartment near the Plaka district. She is not going anywhere.' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    },
    {
      villain: 'Justin Case',
      stolenItem: 'The Mona Lisa',
      difficulty: 2,
      trail: [
        {
          city: 'Paris',
          country: 'France',
          landmark: 'eiffel-tower',
          witnesses: [
            { type: 'Informant', clue: 'He was humming a samba rhythm and talking about Carnival.' },
            { type: 'Tourist', clue: 'I saw him reading about Sugarloaf Mountain and Copacabana Beach.' },
            { type: 'Local', clue: 'He exchanged euros for Brazilian reais at the currency booth.' }
          ],
          nextCorrect: 'Rio de Janeiro',
          nextChoices: ['Rio de Janeiro', 'Buenos Aires', 'Lima']
        },
        {
          city: 'Rio de Janeiro',
          country: 'Brazil',
          landmark: 'christ-redeemer',
          witnesses: [
            { type: 'Informant', clue: 'He kept talking about cherry blossoms and bullet trains.' },
            { type: 'Tourist', clue: 'He was practicing bowing and trying to use chopsticks at lunch.' },
            { type: 'Local', clue: 'He asked which airline flies direct to Narita Airport.' }
          ],
          nextCorrect: 'Tokyo',
          nextChoices: ['Tokyo', 'Seoul', 'Bangkok']
        },
        {
          city: 'Tokyo',
          country: 'Japan',
          landmark: 'torii-gate',
          witnesses: [
            { type: 'Informant', clue: 'He mentioned pyramids and pharaohs several times.' },
            { type: 'Tourist', clue: 'He was shopping for a kaftan and reading about the Nile River.' },
            { type: 'Local', clue: 'He bought a guidebook to the Valley of the Kings.' }
          ],
          nextCorrect: 'Cairo',
          nextChoices: ['Cairo', 'Marrakech', 'Nairobi']
        },
        {
          city: 'Cairo',
          country: 'Egypt',
          landmark: 'pyramids',
          witnesses: [
            { type: 'Informant', clue: 'He is hiding in this city! You can arrest him now!' },
            { type: 'Tourist', clue: 'He checked into a hotel near the Sphinx. He looks exhausted.' },
            { type: 'Local', clue: 'He has been visiting the bazaar every day. He is definitely staying put.' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    },
    {
      villain: 'Patty Larceny',
      stolenItem: "The Great Wall's Ancient Keystone",
      difficulty: 3,
      trail: [
        {
          city: 'Beijing',
          country: 'China',
          landmark: 'great-wall',
          witnesses: [
            { type: 'Informant', clue: 'She was fascinated by Bollywood movies and talking about the Taj Mahal.' },
            { type: 'Tourist', clue: 'She bought a sari and was learning to say "Namaste."' },
            { type: 'Local', clue: 'She booked a flight westward, saying she craved proper curry.' }
          ],
          nextCorrect: 'New Delhi',
          nextChoices: ['New Delhi', 'Bangkok', 'Kathmandu']
        },
        {
          city: 'New Delhi',
          country: 'India',
          landmark: 'taj-mahal',
          witnesses: [
            { type: 'Informant', clue: 'She asked about fjords and the Northern Lights.' },
            { type: 'Tourist', clue: 'She was reading a book about Vikings and Norse mythology.' },
            { type: 'Local', clue: 'She said she wanted to see the midnight sun before heading further.' }
          ],
          nextCorrect: 'Oslo',
          nextChoices: ['Oslo', 'Reykjavik', 'Helsinki']
        },
        {
          city: 'Oslo',
          country: 'Norway',
          landmark: 'viking-ship',
          witnesses: [
            { type: 'Informant', clue: 'She mentioned tango dancing and steaks as big as your plate.' },
            { type: 'Tourist', clue: 'She was looking at pictures of colorful buildings in La Boca.' },
            { type: 'Local', clue: 'She asked about flights across the Atlantic, heading far to the southwest.' }
          ],
          nextCorrect: 'Buenos Aires',
          nextChoices: ['Buenos Aires', 'Santiago', 'Bogota']
        },
        {
          city: 'Buenos Aires',
          country: 'Argentina',
          landmark: 'obelisk',
          witnesses: [
            { type: 'Informant', clue: 'She is cornered! Issue a warrant and bring her in!' },
            { type: 'Tourist', clue: 'She has been eating empanadas nonstop. She is not leaving.' },
            { type: 'Local', clue: 'She rented a room in San Telmo. Now is your chance!' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    },
    {
      villain: 'Sly Revanche',
      stolenItem: 'The Rosetta Stone',
      difficulty: 4,
      trail: [
        {
          city: 'Cairo',
          country: 'Egypt',
          landmark: 'pyramids',
          witnesses: [
            { type: 'Informant', clue: 'He talked about seeing Gaudi architecture and eating paella.' },
            { type: 'Tourist', clue: 'He was wearing a Barcelona FC jersey and practicing flamenco steps.' },
            { type: 'Local', clue: 'He flew west across the Mediterranean. Something about the Iberian Peninsula.' }
          ],
          nextCorrect: 'Barcelona',
          nextChoices: ['Barcelona', 'Lisbon', 'Marseille']
        },
        {
          city: 'Barcelona',
          country: 'Spain',
          landmark: 'sagrada-familia',
          witnesses: [
            { type: 'Informant', clue: 'He was raving about maple syrup and hockey.' },
            { type: 'Tourist', clue: 'He asked me if I had ever seen Niagara Falls or the CN Tower.' },
            { type: 'Local', clue: 'He exchanged his euros for Canadian dollars at the bank.' }
          ],
          nextCorrect: 'Toronto',
          nextChoices: ['Toronto', 'New York', 'Chicago']
        },
        {
          city: 'Toronto',
          country: 'Canada',
          landmark: 'cn-tower',
          witnesses: [
            { type: 'Informant', clue: 'He kept saying "G\'day mate" and drawing kangaroos on napkins.' },
            { type: 'Tourist', clue: 'He was reading about the Great Barrier Reef and the Outback.' },
            { type: 'Local', clue: 'He caught a long-haul flight heading across the Pacific, far to the south.' }
          ],
          nextCorrect: 'Sydney',
          nextChoices: ['Sydney', 'Auckland', 'Honolulu']
        },
        {
          city: 'Sydney',
          country: 'Australia',
          landmark: 'opera-house',
          witnesses: [
            { type: 'Informant', clue: 'He has gone to ground here. Arrest him now, Gumshoe!' },
            { type: 'Tourist', clue: 'He is hiding near the harbor. He thinks he has gotten away.' },
            { type: 'Local', clue: 'He has been at Bondi Beach every morning. He is not running anymore.' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    },
    {
      villain: 'Baron Wasteland',
      stolenItem: 'The Hope Diamond',
      difficulty: 5,
      trail: [
        {
          city: 'Washington D.C.',
          country: 'USA',
          landmark: 'capitol',
          witnesses: [
            { type: 'Informant', clue: 'He mentioned the Kremlin and drinking vodka in Red Square.' },
            { type: 'Tourist', clue: 'He was wearing a fur hat and practicing his Russian alphabet.' },
            { type: 'Local', clue: 'He booked a transatlantic flight heading northeast toward the steppes.' }
          ],
          nextCorrect: 'Moscow',
          nextChoices: ['Moscow', 'Warsaw', 'Kiev']
        },
        {
          city: 'Moscow',
          country: 'Russia',
          landmark: 'kremlin',
          witnesses: [
            { type: 'Informant', clue: 'He talked about safaris and seeing lions on the savanna.' },
            { type: 'Tourist', clue: 'He was packing mosquito nets and reading about Kilimanjaro.' },
            { type: 'Local', clue: 'He flew south, a very long journey to the heart of East Africa.' }
          ],
          nextCorrect: 'Nairobi',
          nextChoices: ['Nairobi', 'Johannesburg', 'Lagos']
        },
        {
          city: 'Nairobi',
          country: 'Kenya',
          landmark: 'savanna',
          witnesses: [
            { type: 'Informant', clue: 'He talked about Machu Picchu and alpacas in the Andes.' },
            { type: 'Tourist', clue: 'He was learning Quechua phrases and buying a poncho.' },
            { type: 'Local', clue: 'He headed across the Atlantic to South America, high in the mountains.' }
          ],
          nextCorrect: 'Lima',
          nextChoices: ['Lima', 'Quito', 'La Paz']
        },
        {
          city: 'Lima',
          country: 'Peru',
          landmark: 'machu-picchu',
          witnesses: [
            { type: 'Informant', clue: 'He is trapped in this city! Issue the warrant!' },
            { type: 'Tourist', clue: 'He has been nervously pacing near the Plaza Mayor. He knows you are close.' },
            { type: 'Local', clue: 'He tried to hire a guide to Machu Picchu but no one will take him. Get him!' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    },
    {
      villain: 'Dee Cryption',
      stolenItem: 'The Original Enigma Machine',
      difficulty: 3,
      trail: [
        {
          city: 'Berlin',
          country: 'Germany',
          landmark: 'brandenburg-gate',
          witnesses: [
            { type: 'Informant', clue: 'She kept talking about gondolas and asking about the price of glass.' },
            { type: 'Tourist', clue: 'She was humming Italian opera and looking at maps of the Adriatic Sea.' },
            { type: 'Local', clue: 'She caught a train heading south through the Alps toward a city of canals.' }
          ],
          nextCorrect: 'Venice',
          nextChoices: ['Venice', 'Vienna', 'Prague']
        },
        {
          city: 'Venice',
          country: 'Italy',
          landmark: 'gondola',
          witnesses: [
            { type: 'Informant', clue: 'She was obsessed with jazz music and talked about Mardi Gras.' },
            { type: 'Tourist', clue: 'She asked about creole cooking and riverboat casinos.' },
            { type: 'Local', clue: 'She flew across the Atlantic to the American South, bayou country.' }
          ],
          nextCorrect: 'New Orleans',
          nextChoices: ['New Orleans', 'Miami', 'Houston']
        },
        {
          city: 'New Orleans',
          country: 'USA',
          landmark: 'jazz-quarter',
          witnesses: [
            { type: 'Informant', clue: 'She asked about temples and said she wanted to see Angkor Wat.' },
            { type: 'Tourist', clue: 'She was researching Southeast Asian history and bought a rice hat.' },
            { type: 'Local', clue: 'She took a flight heading far west across the Pacific to the Mekong region.' }
          ],
          nextCorrect: 'Phnom Penh',
          nextChoices: ['Phnom Penh', 'Ho Chi Minh City', 'Manila']
        },
        {
          city: 'Phnom Penh',
          country: 'Cambodia',
          landmark: 'angkor-wat',
          witnesses: [
            { type: 'Informant', clue: 'She is here! Quick, issue the warrant before she escapes!' },
            { type: 'Tourist', clue: 'She tried to blend in at the night market but she stands out.' },
            { type: 'Local', clue: 'She is hiding near the Royal Palace. This is your moment, detective!' }
          ],
          nextCorrect: '',
          nextChoices: []
        }
      ]
    }
  ];

  // ---------- Game State ----------

  let screen = $state<Screen>('title');
  let currentCase = $state<CaseFile | null>(null);
  let currentCityIndex = $state(0);
  let movesUsed = $state(0);
  let maxMoves = $state(8);
  let cluesGathered = $state(0);
  let witnessesSpoken = $state<Set<string>>(new Set());
  let currentWitness = $state<Witness | null>(null);
  let warrantReady = $state(false);
  let caseNumber = $state(0);
  let wrongCityName = $state('');
  let dossierNotes = $state<string[]>([]);
  let showDossier = $state(false);
  let chiefMessage = $state('');
  let animatingTravel = $state(false);
  let totalCasesWon = $state(0);

  // Derived
  let currentCity = $derived(currentCase ? currentCase.trail[currentCityIndex] : null);
  let movesRemaining = $derived(maxMoves - movesUsed);
  let isLastCity = $derived(currentCase ? currentCityIndex >= currentCase.trail.length - 1 : false);

  let rank = $derived.by<Rank>(() => {
    if (totalCasesWon >= 5) return "ACME's Finest";
    if (totalCasesWon >= 4) return 'Super Sleuth';
    if (totalCasesWon >= 3) return 'Senior Detective';
    if (totalCasesWon >= 2) return 'Detective';
    return 'Junior Detective';
  });

  // ---------- Functions ----------

  function startNewCase() {
    const caseFile = cases[caseNumber % cases.length];
    currentCase = caseFile;
    currentCityIndex = 0;
    movesUsed = 0;
    maxMoves = 8;
    cluesGathered = 0;
    witnessesSpoken = new Set();
    currentWitness = null;
    warrantReady = false;
    wrongCityName = '';
    dossierNotes = [];
    showDossier = false;
    animatingTravel = false;

    chiefMessage = `Gumshoe! ${caseFile.villain} has stolen ${caseFile.stolenItem}! We have tracked them to ${caseFile.trail[0].city}. Get over there and start questioning witnesses!`;
    screen = 'briefing';
    playSound('ding', 0.3);
  }

  function enterCity() {
    screen = 'city';
    witnessesSpoken = new Set();
    currentWitness = null;
    playSound('click', 0.2);
  }

  function talkToWitness(witness: Witness) {
    currentWitness = witness;
    witnessesSpoken.add(witness.type);
    // Force reactivity
    witnessesSpoken = new Set(witnessesSpoken);
    cluesGathered++;

    dossierNotes = [...dossierNotes, `[${currentCity?.city}] ${witness.type}: "${witness.clue}"`];

    // Check if warrant should be ready (visited 3+ correct cities and at last city)
    if (isLastCity && cluesGathered >= 2) {
      warrantReady = true;
    }

    playSound('click', 0.2);
    screen = 'witness';
  }

  function backToCity() {
    screen = 'city';
    currentWitness = null;
  }

  function travelTo(cityName: string) {
    if (!currentCity || animatingTravel) return;

    animatingTravel = true;
    movesUsed++;
    playSound('whoosh', 0.3);
    screen = 'travel';

    setTimeout(() => {
      animatingTravel = false;

      if (movesUsed >= maxMoves) {
        screen = 'gameover';
        playSound('sad', 0.3);
        return;
      }

      if (cityName === currentCity!.nextCorrect) {
        // Correct city
        currentCityIndex++;
        witnessesSpoken = new Set();
        currentWitness = null;
        dossierNotes = [...dossierNotes, `--- Traveled to ${cityName} (correct trail) ---`];
        playSound('ding', 0.3);
        screen = 'city';
      } else {
        // Wrong city
        wrongCityName = cityName;
        dossierNotes = [...dossierNotes, `--- Traveled to ${cityName} (dead end!) ---`];
        playSound('error', 0.3);
        screen = 'wrong-city';
      }
    }, 1500);
  }

  function backFromWrongCity() {
    screen = 'city';
    playSound('click', 0.2);
  }

  function issueWarrant() {
    if (!warrantReady || !currentCase) return;
    playSound('victory', 0.4);
    totalCasesWon++;
    caseNumber++;
    screen = 'arrest';
  }

  function nextCase() {
    startNewCase();
  }

  function returnToTitle() {
    screen = 'title';
    currentCase = null;
  }

  function toggleDossier() {
    showDossier = !showDossier;
    playSound('click', 0.2);
  }

  function getRankForMoves(moves: number): Rank {
    if (moves <= 4) return "ACME's Finest";
    if (moves <= 5) return 'Super Sleuth';
    if (moves <= 6) return 'Senior Detective';
    if (moves <= 7) return 'Detective';
    return 'Junior Detective';
  }

  // ---------- Lifecycle ----------

  onMount(() => {
    registerSpots('carmen', hidingSpots);
    const beanies = getBeaniesForArea('carmen');
    if (beanies.size > 0) {
      hiddenBeanie = beanies.values().next().value ?? null;
    }
  });
</script>

<div class="carmen-container">
  <CloseButton onClose={onClose} />

  <!-- ACME Top Bar -->
  {#if screen !== 'title'}
    <div class="top-bar">
      <div class="acme-badge">
        <div class="badge-shield">
          <span class="badge-text">ACME</span>
          <span class="badge-sub">DETECTIVE AGENCY</span>
        </div>
      </div>
      {#if currentCase}
        <div class="case-info">
          <div class="case-label">CASE: {currentCase.villain}</div>
          <div class="stolen-label">STOLEN: {currentCase.stolenItem}</div>
        </div>
        <div class="moves-counter">
          <div class="moves-label">MOVES LEFT</div>
          <div class="moves-number" class:low={movesRemaining <= 2}>{movesRemaining}</div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Title Screen -->
  {#if screen === 'title'}
    <div class="title-screen">
      <div class="title-globe">
        <div class="globe-body">
          <div class="globe-line line-1"></div>
          <div class="globe-line line-2"></div>
          <div class="globe-line line-3"></div>
          <div class="globe-equator"></div>
          <div class="globe-meridian"></div>
        </div>
      </div>
      <div class="title-text">
        <div class="title-where">WHERE IN THE WORLD IS</div>
        <div class="title-carmen">CARMEN SANDIEGO</div>
        <div class="title-question">?</div>
      </div>
      <div class="title-acme">
        <div class="acme-logo-large">
          <span class="acme-a">A</span><span class="acme-c">C</span><span class="acme-m">M</span><span class="acme-e">E</span>
        </div>
        <div class="acme-tagline">DETECTIVE AGENCY</div>
      </div>
      <button class="start-btn" onclick={startNewCase}>
        BEGIN INVESTIGATION
      </button>
      <div class="title-footer">A Gumshoe Production</div>
    </div>

  <!-- Briefing Screen -->
  {:else if screen === 'briefing'}
    <div class="briefing-screen">
      <div class="chief-section">
        <div class="chief-portrait">
          <div class="chief-head">
            <div class="chief-hair"></div>
            <div class="chief-face">
              <div class="chief-eye left"></div>
              <div class="chief-eye right"></div>
              <div class="chief-mouth"></div>
            </div>
          </div>
          <div class="chief-body"></div>
          <div class="chief-label">THE CHIEF</div>
        </div>
        <div class="chief-bubble">
          <p>{chiefMessage}</p>
        </div>
      </div>
      <div class="case-dossier-brief">
        <div class="dossier-header">CASE FILE</div>
        <div class="dossier-line"><strong>SUSPECT:</strong> {currentCase?.villain}</div>
        <div class="dossier-line"><strong>CRIME:</strong> Grand Theft</div>
        <div class="dossier-line"><strong>STOLEN:</strong> {currentCase?.stolenItem}</div>
        <div class="dossier-line"><strong>LAST SEEN:</strong> {currentCase?.trail[0].city}, {currentCase?.trail[0].country}</div>
        <div class="dossier-line"><strong>DIFFICULTY:</strong>
          {'★'.repeat(currentCase?.difficulty ?? 1)}{'☆'.repeat(5 - (currentCase?.difficulty ?? 1))}
        </div>
      </div>
      <button class="action-btn" onclick={enterCity}>
        TRAVEL TO {currentCase?.trail[0].city.toUpperCase()}
      </button>
    </div>

  <!-- City Screen -->
  {:else if screen === 'city' && currentCity}
    <div class="city-screen">
      <!-- City Scene -->
      <div class="city-scene">
        <div class="city-sky"></div>
        <div class="city-name-plate">
          <span class="city-name">{currentCity.city}</span>
          <span class="country-name">{currentCity.country}</span>
        </div>

        <!-- CSS Landmarks -->
        <div class="landmark-container">
          {#if currentCity.landmark === 'eiffel-tower'}
            <div class="lm eiffel">
              <div class="eiffel-top"></div>
              <div class="eiffel-mid"></div>
              <div class="eiffel-base"></div>
            </div>
          {:else if currentCity.landmark === 'big-ben'}
            <div class="lm bigben">
              <div class="bigben-spire"></div>
              <div class="bigben-clock"></div>
              <div class="bigben-tower"></div>
              <div class="bigben-base"></div>
            </div>
          {:else if currentCity.landmark === 'windmill'}
            <div class="lm windmill-lm">
              <div class="windmill-blades">
                <div class="blade b1"></div>
                <div class="blade b2"></div>
                <div class="blade b3"></div>
                <div class="blade b4"></div>
              </div>
              <div class="windmill-body-shape"></div>
            </div>
          {:else if currentCity.landmark === 'parthenon'}
            <div class="lm parthenon">
              <div class="parthenon-roof"></div>
              <div class="parthenon-columns">
                <div class="column"></div>
                <div class="column"></div>
                <div class="column"></div>
                <div class="column"></div>
                <div class="column"></div>
              </div>
              <div class="parthenon-base"></div>
            </div>
          {:else if currentCity.landmark === 'pyramids'}
            <div class="lm pyramids-lm">
              <div class="pyramid p1"></div>
              <div class="pyramid p2"></div>
              <div class="pyramid p3"></div>
            </div>
          {:else if currentCity.landmark === 'christ-redeemer'}
            <div class="lm christ">
              <div class="christ-head"></div>
              <div class="christ-arms"></div>
              <div class="christ-body"></div>
              <div class="christ-base"></div>
            </div>
          {:else if currentCity.landmark === 'torii-gate'}
            <div class="lm torii">
              <div class="torii-top"></div>
              <div class="torii-beam"></div>
              <div class="torii-left"></div>
              <div class="torii-right"></div>
            </div>
          {:else if currentCity.landmark === 'great-wall'}
            <div class="lm greatwall">
              <div class="wall-seg s1"></div>
              <div class="wall-tower"></div>
              <div class="wall-seg s2"></div>
              <div class="wall-tower"></div>
              <div class="wall-seg s3"></div>
            </div>
          {:else if currentCity.landmark === 'taj-mahal'}
            <div class="lm tajmahal">
              <div class="taj-dome"></div>
              <div class="taj-body"></div>
              <div class="taj-minaret left"></div>
              <div class="taj-minaret right"></div>
            </div>
          {:else if currentCity.landmark === 'viking-ship'}
            <div class="lm viking">
              <div class="viking-sail"></div>
              <div class="viking-mast"></div>
              <div class="viking-hull"></div>
            </div>
          {:else if currentCity.landmark === 'obelisk'}
            <div class="lm obelisk-lm">
              <div class="obelisk-tip"></div>
              <div class="obelisk-shaft"></div>
              <div class="obelisk-base-rect"></div>
            </div>
          {:else if currentCity.landmark === 'sagrada-familia'}
            <div class="lm sagrada">
              <div class="sagrada-spire s1"></div>
              <div class="sagrada-spire s2"></div>
              <div class="sagrada-spire s3"></div>
              <div class="sagrada-body"></div>
            </div>
          {:else if currentCity.landmark === 'cn-tower'}
            <div class="lm cntower">
              <div class="cn-antenna"></div>
              <div class="cn-pod"></div>
              <div class="cn-shaft"></div>
            </div>
          {:else if currentCity.landmark === 'opera-house'}
            <div class="lm opera">
              <div class="opera-shell s1"></div>
              <div class="opera-shell s2"></div>
              <div class="opera-shell s3"></div>
              <div class="opera-base"></div>
            </div>
          {:else if currentCity.landmark === 'capitol'}
            <div class="lm capitol-lm">
              <div class="capitol-dome"></div>
              <div class="capitol-body"></div>
              <div class="capitol-steps"></div>
            </div>
          {:else if currentCity.landmark === 'kremlin'}
            <div class="lm kremlin-lm">
              <div class="kremlin-star"></div>
              <div class="kremlin-spire"></div>
              <div class="kremlin-tower"></div>
              <div class="kremlin-wall"></div>
            </div>
          {:else if currentCity.landmark === 'savanna'}
            <div class="lm savanna-lm">
              <div class="acacia-top"></div>
              <div class="acacia-trunk"></div>
              <div class="savanna-grass"></div>
            </div>
          {:else if currentCity.landmark === 'machu-picchu'}
            <div class="lm machu">
              <div class="machu-mountain"></div>
              <div class="machu-ruins">
                <div class="ruin-block r1"></div>
                <div class="ruin-block r2"></div>
                <div class="ruin-block r3"></div>
              </div>
            </div>
          {:else if currentCity.landmark === 'brandenburg-gate'}
            <div class="lm brandenburg">
              <div class="brand-top"></div>
              <div class="brand-columns">
                <div class="brand-col"></div>
                <div class="brand-col"></div>
                <div class="brand-col"></div>
                <div class="brand-col"></div>
                <div class="brand-col"></div>
                <div class="brand-col"></div>
              </div>
              <div class="brand-base"></div>
            </div>
          {:else if currentCity.landmark === 'gondola'}
            <div class="lm gondola-lm">
              <div class="gondola-pole"></div>
              <div class="gondola-boat"></div>
              <div class="gondola-water"></div>
            </div>
          {:else if currentCity.landmark === 'jazz-quarter'}
            <div class="lm jazz">
              <div class="jazz-building b1"></div>
              <div class="jazz-building b2"></div>
              <div class="jazz-building b3"></div>
              <div class="jazz-note n1">&#9835;</div>
              <div class="jazz-note n2">&#9834;</div>
            </div>
          {:else if currentCity.landmark === 'angkor-wat'}
            <div class="lm angkor">
              <div class="angkor-spire central"></div>
              <div class="angkor-spire left"></div>
              <div class="angkor-spire right"></div>
              <div class="angkor-body"></div>
            </div>
          {:else}
            <div class="lm generic">
              <div class="generic-building"></div>
            </div>
          {/if}
        </div>

        <!-- Ground -->
        <div class="city-ground"></div>
      </div>

      <!-- Witnesses -->
      <div class="witness-panel">
        <div class="witness-title">QUESTION WITNESSES</div>
        <div class="witness-buttons">
          {#each currentCity.witnesses as witness}
            <button
              class="witness-btn"
              class:spoken={witnessesSpoken.has(witness.type)}
              onclick={() => talkToWitness(witness)}
            >
              <span class="witness-icon">
                {#if witness.type === 'Informant'}&#128373;{:else if witness.type === 'Tourist'}&#128247;{:else}&#127968;{/if}
              </span>
              <span class="witness-label">{witness.type}</span>
              {#if witnessesSpoken.has(witness.type)}
                <span class="check-mark">&#10003;</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Travel or Warrant -->
      {#if isLastCity && warrantReady}
        <div class="warrant-panel">
          <button class="warrant-btn" onclick={issueWarrant}>
            &#128680; ISSUE WARRANT & ARREST &#128680;
          </button>
        </div>
      {:else if !isLastCity}
        <div class="travel-panel">
          <div class="travel-title">TRAVEL TO NEXT CITY</div>
          <div class="travel-buttons">
            {#each currentCity.nextChoices as dest}
              <button class="travel-btn" onclick={() => travelTo(dest)}>
                &#9992; {dest}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="warrant-panel">
          <div class="warrant-hint">Talk to more witnesses to gather enough evidence for a warrant.</div>
        </div>
      {/if}

      <!-- Dossier Toggle -->
      <button class="dossier-toggle" onclick={toggleDossier}>
        &#128221; {showDossier ? 'HIDE' : 'SHOW'} DOSSIER ({dossierNotes.length})
      </button>

      {#if showDossier}
        <div class="dossier-overlay" onclick={toggleDossier} role="presentation">
          <div class="dossier-content" onclick={(e) => e.stopPropagation()} role="dialog">
            <div class="dossier-title">CASE DOSSIER</div>
            {#if dossierNotes.length === 0}
              <p class="dossier-empty">No evidence gathered yet.</p>
            {:else}
              {#each dossierNotes as note}
                <p class="dossier-note">{note}</p>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>

  <!-- Witness Dialog Screen -->
  {:else if screen === 'witness' && currentWitness && currentCity}
    <div class="witness-screen">
      <div class="witness-scene">
        <div class="witness-portrait">
          <div class="witness-silhouette">
            <div class="sil-head"></div>
            <div class="sil-body"></div>
          </div>
          <div class="witness-type-label">{currentWitness.type}</div>
        </div>
        <div class="witness-dialog">
          <div class="dialog-city">{currentCity.city}, {currentCity.country}</div>
          <div class="dialog-bubble">
            <p>"{currentWitness.clue}"</p>
          </div>
        </div>
      </div>
      <button class="action-btn" onclick={backToCity}>BACK TO CITY</button>
    </div>

  <!-- Travel Animation -->
  {:else if screen === 'travel'}
    <div class="travel-screen">
      <div class="travel-anim">
        <div class="plane-icon">&#9992;</div>
        <div class="travel-text">TRAVELING...</div>
        <div class="travel-dots">
          <span class="dot d1">.</span>
          <span class="dot d2">.</span>
          <span class="dot d3">.</span>
        </div>
      </div>
      <div class="world-map-bg">
        <div class="continent na"></div>
        <div class="continent sa"></div>
        <div class="continent eu"></div>
        <div class="continent af"></div>
        <div class="continent as"></div>
        <div class="continent oc"></div>
      </div>
    </div>

  <!-- Wrong City -->
  {:else if screen === 'wrong-city'}
    <div class="wrong-city-screen">
      <div class="wrong-icon">&#10060;</div>
      <div class="wrong-title">DEAD END</div>
      <div class="wrong-text">No sign of the suspect in {wrongCityName}...</div>
      <div class="wrong-sub">You wasted precious time! Head back and try again.</div>
      <div class="wrong-moves">Moves remaining: {movesRemaining}</div>
      <button class="action-btn" onclick={backFromWrongCity}>RETURN TO {currentCity?.city.toUpperCase()}</button>
    </div>

  <!-- Arrest Screen -->
  {:else if screen === 'arrest' && currentCase}
    <div class="arrest-screen">
      <div class="arrest-flash"></div>
      <div class="arrest-badge">&#128737;</div>
      <div class="arrest-title">SUSPECT APPREHENDED!</div>
      <div class="arrest-villain">You caught {currentCase.villain}!</div>
      <div class="arrest-item">{currentCase.stolenItem} has been recovered!</div>
      <div class="arrest-stats">
        <div class="stat-line">Moves used: {movesUsed}</div>
        <div class="stat-line">Clues gathered: {cluesGathered}</div>
        <div class="stat-line">Case rank: {getRankForMoves(movesUsed)}</div>
      </div>
      <div class="arrest-rank">
        <div class="rank-label">YOUR ACME RANK</div>
        <div class="rank-title">{rank}</div>
        <div class="rank-cases">Cases Solved: {totalCasesWon}</div>
      </div>
      {#if caseNumber < cases.length}
        <button class="action-btn" onclick={nextCase}>NEXT CASE</button>
      {:else}
        <button class="action-btn" onclick={returnToTitle}>RETURN TO HQ</button>
      {/if}
    </div>

  <!-- Game Over -->
  {:else if screen === 'gameover' && currentCase}
    <div class="gameover-screen">
      <div class="go-icon">&#128683;</div>
      <div class="go-title">TIME IS UP!</div>
      <div class="go-text">{currentCase.villain} escaped with {currentCase.stolenItem}!</div>
      <div class="go-sub">Better luck next time, Gumshoe.</div>
      <button class="action-btn" onclick={startNewCase}>TRY AGAIN</button>
      <button class="action-btn secondary" onclick={returnToTitle}>BACK TO TITLE</button>
    </div>
  {/if}

  <!-- Hidden Beanie -->
  {#if hiddenBeanie && screen === 'title'}
    <HidingBeanie beanie={hiddenBeanie} class="beanie-globe" />
  {/if}
</div>

<style>
  /* ---------- Container ---------- */

  .carmen-container {
    position: fixed;
    inset: 0;
    background: #1a0a0a;
    color: #e8d8c8;
    font-family: 'Courier New', monospace;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 100;
  }

  /* ---------- Top Bar ---------- */

  .top-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 70px 8px 12px;
    background: linear-gradient(180deg, #4a0000 0%, #2a0000 100%);
    border-bottom: 2px solid #ff3333;
    position: sticky;
    top: 0;
    z-index: 50;
    flex-wrap: wrap;
  }

  .acme-badge {
    flex-shrink: 0;
  }

  .badge-shield {
    background: linear-gradient(135deg, #d4a017, #b8860b);
    border: 2px solid #ffd700;
    border-radius: 4px;
    padding: 4px 10px;
    text-align: center;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
  }

  .badge-text {
    display: block;
    font-size: 14px;
    font-weight: bold;
    color: #1a0a0a;
    letter-spacing: 3px;
  }

  .badge-sub {
    display: block;
    font-size: 7px;
    color: #1a0a0a;
    letter-spacing: 1px;
  }

  .case-info {
    flex: 1;
    min-width: 0;
  }

  .case-label {
    font-size: 12px;
    color: #ff6666;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stolen-label {
    font-size: 10px;
    color: #cc9966;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .moves-counter {
    text-align: center;
    flex-shrink: 0;
  }

  .moves-label {
    font-size: 9px;
    color: #999;
    letter-spacing: 1px;
  }

  .moves-number {
    font-size: 28px;
    font-weight: bold;
    color: #33ff33;
    text-shadow: 0 0 10px rgba(51, 255, 51, 0.5);
    line-height: 1;
  }

  .moves-number.low {
    color: #ff3333;
    text-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
    animation: pulse-red 1s ease-in-out infinite;
  }

  @keyframes pulse-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* ---------- Title Screen ---------- */

  .title-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
    background: radial-gradient(ellipse at center, #2a0000 0%, #0a0000 70%);
    text-align: center;
    gap: 20px;
  }

  .title-globe {
    position: relative;
    margin-bottom: 10px;
  }

  .globe-body {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #1a5c8a, #0a2a4a 70%);
    border: 3px solid #3399cc;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 30px rgba(51, 153, 204, 0.3);
    animation: globe-spin 10s linear infinite;
  }

  @keyframes globe-spin {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  .globe-equator {
    position: absolute;
    top: 50%;
    left: -5%;
    width: 110%;
    height: 2px;
    background: rgba(51, 204, 51, 0.4);
    transform: translateY(-50%);
  }

  .globe-meridian {
    position: absolute;
    top: -5%;
    left: 50%;
    width: 2px;
    height: 110%;
    background: rgba(51, 204, 51, 0.3);
    transform: translateX(-50%);
  }

  .globe-line {
    position: absolute;
    width: 100%;
    height: 1px;
    background: rgba(51, 204, 51, 0.2);
    left: 0;
  }

  .line-1 { top: 25%; }
  .line-2 { top: 50%; }
  .line-3 { top: 75%; }

  .title-text {
    position: relative;
  }

  .title-where {
    font-size: 14px;
    color: #cc9966;
    letter-spacing: 4px;
    margin-bottom: 4px;
  }

  .title-carmen {
    font-size: 32px;
    font-weight: bold;
    color: #ff3333;
    text-shadow:
      0 0 20px rgba(255, 51, 51, 0.6),
      2px 2px 0 #800000;
    letter-spacing: 3px;
    line-height: 1.1;
  }

  .title-question {
    font-size: 48px;
    color: #ff3333;
    text-shadow: 0 0 20px rgba(255, 51, 51, 0.4);
    line-height: 1;
  }

  .title-acme {
    margin-top: 8px;
  }

  .acme-logo-large {
    font-size: 36px;
    font-weight: bold;
    letter-spacing: 8px;
  }

  .acme-a { color: #ffd700; }
  .acme-c { color: #ff6633; }
  .acme-m { color: #ff3333; }
  .acme-e { color: #cc0000; }

  .acme-tagline {
    font-size: 11px;
    color: #999;
    letter-spacing: 6px;
    margin-top: 2px;
  }

  .start-btn {
    background: linear-gradient(180deg, #cc0000 0%, #880000 100%);
    color: #ffd700;
    border: 2px solid #ff3333;
    padding: 14px 36px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    text-shadow: 1px 1px 0 #440000;
    box-shadow: 0 0 15px rgba(255, 51, 51, 0.3);
    margin-top: 10px;
  }

  .start-btn:hover {
    background: linear-gradient(180deg, #ff0000 0%, #aa0000 100%);
    box-shadow: 0 0 25px rgba(255, 51, 51, 0.6);
    transform: scale(1.05);
  }

  .title-footer {
    font-size: 10px;
    color: #553333;
    margin-top: 10px;
  }

  /* ---------- Briefing Screen ---------- */

  .briefing-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px 40px;
    gap: 20px;
    min-height: 100vh;
  }

  .chief-section {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    max-width: 600px;
    width: 100%;
  }

  .chief-portrait {
    flex-shrink: 0;
    text-align: center;
  }

  .chief-head {
    width: 60px;
    height: 60px;
    position: relative;
  }

  .chief-hair {
    position: absolute;
    top: 0;
    left: 5px;
    width: 50px;
    height: 25px;
    background: #555;
    border-radius: 25px 25px 0 0;
  }

  .chief-face {
    position: absolute;
    top: 15px;
    left: 10px;
    width: 40px;
    height: 40px;
    background: #d4a574;
    border-radius: 50%;
  }

  .chief-eye {
    position: absolute;
    width: 6px;
    height: 6px;
    background: #222;
    border-radius: 50%;
    top: 14px;
  }

  .chief-eye.left { left: 10px; }
  .chief-eye.right { right: 10px; }

  .chief-mouth {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 3px;
    background: #8b4513;
    border-radius: 2px;
  }

  .chief-body {
    width: 50px;
    height: 30px;
    background: #336;
    border-radius: 4px 4px 0 0;
    margin: 0 auto;
  }

  .chief-label {
    font-size: 9px;
    color: #999;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  .chief-bubble {
    background: #2a1a1a;
    border: 2px solid #cc6633;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    flex: 1;
  }

  .chief-bubble::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 20px;
    border: 5px solid transparent;
    border-right-color: #cc6633;
  }

  .chief-bubble p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #e8d8c8;
  }

  .case-dossier-brief {
    background: #1a1500;
    border: 2px solid #665500;
    padding: 16px;
    max-width: 600px;
    width: 100%;
  }

  .dossier-header {
    font-size: 16px;
    font-weight: bold;
    color: #ffd700;
    border-bottom: 1px solid #665500;
    padding-bottom: 8px;
    margin-bottom: 8px;
    letter-spacing: 3px;
  }

  .dossier-line {
    font-size: 13px;
    padding: 4px 0;
    color: #cc9966;
  }

  .dossier-line strong {
    color: #e8d8c8;
  }

  /* ---------- City Screen ---------- */

  .city-screen {
    padding-top: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .city-scene {
    position: relative;
    height: 260px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .city-sky {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg,
      #0a1628 0%,
      #1a2a4a 40%,
      #2a3a5a 70%,
      #3a4a6a 100%
    );
  }

  .city-name-plate {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
    background: rgba(0, 0, 0, 0.6);
    padding: 6px 20px;
    border: 1px solid #ff3333;
  }

  .city-name {
    display: block;
    font-size: 22px;
    font-weight: bold;
    color: #ff6666;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .country-name {
    display: block;
    font-size: 11px;
    color: #cc9966;
    letter-spacing: 2px;
  }

  .landmark-container {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
  }

  .city-ground {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(180deg, #2a3a2a 0%, #1a2a1a 100%);
  }

  /* ---------- CSS Landmarks ---------- */

  .lm {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Eiffel Tower */
  .eiffel { width: 80px; height: 140px; }
  .eiffel-top {
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 50px solid #8a7a5a;
  }
  .eiffel-mid {
    width: 30px;
    height: 30px;
    background: #8a7a5a;
    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
  }
  .eiffel-base {
    width: 60px;
    height: 40px;
    background: #8a7a5a;
    clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
  }

  /* Big Ben */
  .bigben { width: 60px; height: 140px; }
  .bigben-spire {
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 25px solid #c4a35a;
  }
  .bigben-clock {
    width: 30px;
    height: 30px;
    background: #f0e68c;
    border: 2px solid #c4a35a;
    border-radius: 50%;
  }
  .bigben-tower {
    width: 26px;
    height: 55px;
    background: #c4a35a;
  }
  .bigben-base {
    width: 40px;
    height: 20px;
    background: #a89040;
  }

  /* Windmill */
  .windmill-lm { width: 80px; height: 120px; }
  .windmill-blades {
    position: relative;
    width: 80px;
    height: 80px;
    animation: spin-blades 8s linear infinite;
  }
  .blade {
    position: absolute;
    width: 8px;
    height: 35px;
    background: #aaa;
    top: 50%;
    left: 50%;
    transform-origin: center top;
  }
  .b1 { transform: translate(-50%, -100%) rotate(0deg); }
  .b2 { transform: translate(-50%, -100%) rotate(90deg); }
  .b3 { transform: translate(-50%, -100%) rotate(180deg); }
  .b4 { transform: translate(-50%, -100%) rotate(270deg); }
  @keyframes spin-blades { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .windmill-body-shape {
    width: 30px;
    height: 50px;
    background: #8b4513;
    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
    margin-top: -10px;
  }

  /* Parthenon */
  .parthenon { width: 100px; height: 80px; }
  .parthenon-roof {
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 20px solid #d4c4a4;
  }
  .parthenon-columns {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .column {
    width: 8px;
    height: 40px;
    background: #d4c4a4;
    border-radius: 2px;
  }
  .parthenon-base {
    width: 100px;
    height: 8px;
    background: #b4a484;
  }

  /* Pyramids */
  .pyramids-lm {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 100px;
  }
  .pyramid {
    width: 0;
    height: 0;
    border-left: solid transparent;
    border-right: solid transparent;
    border-bottom: solid #c4a35a;
  }
  .p1 { border-left-width: 40px; border-right-width: 40px; border-bottom-width: 70px; }
  .p2 { border-left-width: 30px; border-right-width: 30px; border-bottom-width: 55px; }
  .p3 { border-left-width: 20px; border-right-width: 20px; border-bottom-width: 35px; }

  /* Christ the Redeemer */
  .christ { width: 80px; height: 120px; align-items: center; }
  .christ-head {
    width: 16px;
    height: 16px;
    background: #d4d4d4;
    border-radius: 50%;
  }
  .christ-arms {
    width: 70px;
    height: 8px;
    background: #d4d4d4;
    border-radius: 4px;
  }
  .christ-body {
    width: 20px;
    height: 50px;
    background: #d4d4d4;
    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
  }
  .christ-base {
    width: 40px;
    height: 30px;
    background: #666;
    clip-path: polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%);
  }

  /* Torii Gate */
  .torii { width: 80px; height: 100px; position: relative; }
  .torii-top {
    width: 80px;
    height: 8px;
    background: #cc0000;
    border-radius: 4px;
    position: relative;
    z-index: 2;
  }
  .torii-beam {
    width: 65px;
    height: 6px;
    background: #cc0000;
    margin-top: 6px;
    align-self: center;
  }
  .torii-left, .torii-right {
    position: absolute;
    width: 10px;
    height: 80px;
    background: #cc0000;
    bottom: 0;
  }
  .torii-left { left: 10px; }
  .torii-right { right: 10px; }

  /* Great Wall */
  .greatwall { flex-direction: row; align-items: flex-end; gap: 0; width: 120px; height: 80px; }
  .wall-seg {
    height: 30px;
    background: #a0a0a0;
    flex: 1;
  }
  .wall-tower {
    width: 20px;
    height: 50px;
    background: #888;
    border-top: 4px solid #666;
    flex-shrink: 0;
  }

  /* Taj Mahal */
  .tajmahal { width: 100px; height: 110px; position: relative; }
  .taj-dome {
    width: 40px;
    height: 40px;
    background: #f0f0f0;
    border-radius: 50% 50% 0 0;
    align-self: center;
  }
  .taj-body {
    width: 60px;
    height: 40px;
    background: #f0f0f0;
    align-self: center;
  }
  .taj-minaret {
    position: absolute;
    width: 8px;
    height: 70px;
    background: #e0e0e0;
    bottom: 0;
  }
  .taj-minaret.left { left: 5px; }
  .taj-minaret.right { right: 5px; }

  /* Viking Ship */
  .viking { width: 100px; height: 100px; position: relative; }
  .viking-sail {
    width: 0;
    height: 0;
    border-left: 25px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 50px solid #c4a35a;
    align-self: center;
  }
  .viking-mast {
    width: 4px;
    height: 60px;
    background: #8b4513;
    align-self: center;
    margin-top: -55px;
  }
  .viking-hull {
    width: 90px;
    height: 25px;
    background: #8b4513;
    border-radius: 0 0 50% 50%;
    margin-top: -5px;
    align-self: center;
  }

  /* Obelisk */
  .obelisk-lm { width: 30px; height: 120px; }
  .obelisk-tip {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 20px solid #e0e0e0;
  }
  .obelisk-shaft {
    width: 20px;
    height: 80px;
    background: #d0d0d0;
  }
  .obelisk-base-rect {
    width: 30px;
    height: 10px;
    background: #aaa;
  }

  /* Sagrada Familia */
  .sagrada { width: 80px; height: 120px; position: relative; }
  .sagrada-spire {
    position: absolute;
    bottom: 40px;
    width: 12px;
    background: #c4a35a;
    border-radius: 6px 6px 0 0;
  }
  .sagrada-spire.s1 { left: 15px; height: 75px; }
  .sagrada-spire.s2 { left: 34px; height: 85px; }
  .sagrada-spire.s3 { left: 53px; height: 70px; }
  .sagrada-body {
    position: absolute;
    bottom: 0;
    left: 10px;
    width: 60px;
    height: 40px;
    background: #b09030;
  }

  /* CN Tower */
  .cntower { width: 30px; height: 140px; }
  .cn-antenna {
    width: 4px;
    height: 30px;
    background: #ccc;
    align-self: center;
  }
  .cn-pod {
    width: 24px;
    height: 20px;
    background: #ddd;
    border-radius: 12px;
    align-self: center;
  }
  .cn-shaft {
    width: 8px;
    height: 90px;
    background: #ccc;
    align-self: center;
  }

  /* Opera House */
  .opera { width: 120px; height: 80px; position: relative; flex-direction: row; align-items: flex-end; }
  .opera-shell {
    width: 0;
    height: 0;
    border-left: 20px solid transparent;
    border-right: 20px solid transparent;
    border-bottom: 50px solid #f0f0f0;
    position: absolute;
    bottom: 15px;
  }
  .opera-shell.s1 { left: 0; }
  .opera-shell.s2 { left: 30px; border-bottom-width: 55px; }
  .opera-shell.s3 { left: 60px; border-bottom-width: 45px; }
  .opera-base {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 110px;
    height: 15px;
    background: #ccc;
  }

  /* Capitol */
  .capitol-lm { width: 100px; height: 100px; }
  .capitol-dome {
    width: 40px;
    height: 30px;
    background: #e0e0e0;
    border-radius: 40px 40px 0 0;
    align-self: center;
  }
  .capitol-body {
    width: 80px;
    height: 35px;
    background: #d4d4d4;
    align-self: center;
  }
  .capitol-steps {
    width: 100px;
    height: 15px;
    background: #bbb;
    clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);
  }

  /* Kremlin */
  .kremlin-lm { width: 50px; height: 120px; }
  .kremlin-star {
    width: 16px;
    height: 16px;
    background: #cc0000;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    align-self: center;
  }
  .kremlin-spire {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 30px solid #2d8b3a;
    align-self: center;
  }
  .kremlin-tower {
    width: 30px;
    height: 40px;
    background: #cc6644;
    align-self: center;
  }
  .kremlin-wall {
    width: 50px;
    height: 20px;
    background: #b85533;
  }

  /* Savanna */
  .savanna-lm { width: 80px; height: 100px; }
  .acacia-top {
    width: 60px;
    height: 25px;
    background: #2d5a1e;
    border-radius: 50%;
    align-self: center;
  }
  .acacia-trunk {
    width: 6px;
    height: 40px;
    background: #8b4513;
    align-self: center;
  }
  .savanna-grass {
    width: 80px;
    height: 15px;
    background: #9a8a3a;
    border-radius: 50%;
  }

  /* Machu Picchu */
  .machu { width: 120px; height: 110px; position: relative; }
  .machu-mountain {
    width: 0;
    height: 0;
    border-left: 60px solid transparent;
    border-right: 60px solid transparent;
    border-bottom: 80px solid #4a6a3a;
    position: absolute;
    bottom: 0;
  }
  .machu-ruins {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 3px;
  }
  .ruin-block {
    background: #a0a0a0;
  }
  .r1 { width: 15px; height: 12px; }
  .r2 { width: 10px; height: 18px; }
  .r3 { width: 12px; height: 10px; }

  /* Brandenburg Gate */
  .brandenburg { width: 100px; height: 80px; }
  .brand-top {
    width: 90px;
    height: 10px;
    background: #c4b49a;
    align-self: center;
  }
  .brand-columns {
    display: flex;
    gap: 6px;
    justify-content: center;
  }
  .brand-col {
    width: 6px;
    height: 45px;
    background: #c4b49a;
  }
  .brand-base {
    width: 100px;
    height: 8px;
    background: #a4947a;
  }

  /* Gondola */
  .gondola-lm { width: 80px; height: 80px; position: relative; }
  .gondola-pole {
    width: 4px;
    height: 40px;
    background: #8b4513;
    position: absolute;
    top: 0;
    right: 15px;
  }
  .gondola-boat {
    width: 70px;
    height: 15px;
    background: #222;
    border-radius: 0 0 50% 50%;
    position: absolute;
    bottom: 20px;
    left: 5px;
  }
  .gondola-water {
    width: 80px;
    height: 20px;
    background: linear-gradient(0deg, #1a4a6a, #2a5a7a);
    position: absolute;
    bottom: 0;
    border-radius: 4px;
  }

  /* Jazz Quarter */
  .jazz { width: 100px; height: 100px; position: relative; display: flex; flex-direction: row; align-items: flex-end; gap: 4px; }
  .jazz-building {
    background: #665544;
    border-radius: 2px 2px 0 0;
  }
  .jazz-building.b1 { width: 25px; height: 60px; background: #776655; }
  .jazz-building.b2 { width: 30px; height: 75px; background: #665544; }
  .jazz-building.b3 { width: 25px; height: 55px; background: #887766; }
  .jazz-note {
    position: absolute;
    color: #ffd700;
    font-size: 24px;
    animation: float-note 3s ease-in-out infinite;
  }
  .jazz-note.n1 { top: 5px; left: 20px; animation-delay: 0s; }
  .jazz-note.n2 { top: 15px; right: 10px; animation-delay: 1.5s; }
  @keyframes float-note {
    0%, 100% { transform: translateY(0); opacity: 0.6; }
    50% { transform: translateY(-10px); opacity: 1; }
  }

  /* Angkor Wat */
  .angkor { width: 100px; height: 100px; position: relative; }
  .angkor-spire {
    position: absolute;
    background: #a09070;
    border-radius: 4px 4px 0 0;
  }
  .angkor-spire.central { width: 16px; height: 60px; bottom: 25px; left: 42px; }
  .angkor-spire.left { width: 12px; height: 45px; bottom: 25px; left: 18px; }
  .angkor-spire.right { width: 12px; height: 45px; bottom: 25px; right: 18px; }
  .angkor-body {
    position: absolute;
    bottom: 0;
    left: 10px;
    width: 80px;
    height: 25px;
    background: #908060;
  }

  /* Generic fallback */
  .generic-building {
    width: 40px;
    height: 80px;
    background: #666;
    border-radius: 2px;
  }

  /* ---------- Witness Panel ---------- */

  .witness-panel {
    padding: 12px 16px;
    background: #1a0a0a;
    border-top: 2px solid #660000;
  }

  .witness-title {
    font-size: 11px;
    color: #ff6666;
    letter-spacing: 3px;
    margin-bottom: 8px;
    text-align: center;
  }

  .witness-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .witness-btn {
    background: linear-gradient(180deg, #3a1a1a 0%, #2a0a0a 100%);
    border: 2px solid #883333;
    color: #e8d8c8;
    padding: 10px 16px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    min-width: 110px;
    justify-content: center;
  }

  .witness-btn:hover {
    background: linear-gradient(180deg, #5a2a2a 0%, #3a1a1a 100%);
    border-color: #ff6666;
    transform: translateY(-2px);
  }

  .witness-btn.spoken {
    border-color: #336633;
    opacity: 0.7;
  }

  .witness-icon {
    font-size: 18px;
  }

  .witness-label {
    font-weight: bold;
    letter-spacing: 1px;
  }

  .check-mark {
    color: #33ff33;
    font-weight: bold;
  }

  /* ---------- Travel Panel ---------- */

  .travel-panel {
    padding: 12px 16px;
    background: #0a0a1a;
    border-top: 2px solid #003366;
  }

  .travel-title {
    font-size: 11px;
    color: #6699cc;
    letter-spacing: 3px;
    margin-bottom: 8px;
    text-align: center;
  }

  .travel-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .travel-btn {
    background: linear-gradient(180deg, #0a1a3a 0%, #0a0a2a 100%);
    border: 2px solid #336699;
    color: #99ccff;
    padding: 10px 20px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 1px;
  }

  .travel-btn:hover {
    background: linear-gradient(180deg, #1a2a5a 0%, #0a1a3a 100%);
    border-color: #66aaff;
    box-shadow: 0 0 12px rgba(102, 170, 255, 0.3);
    transform: translateY(-2px);
  }

  /* ---------- Warrant Panel ---------- */

  .warrant-panel {
    padding: 16px;
    text-align: center;
    background: #1a1a0a;
    border-top: 2px solid #666600;
  }

  .warrant-btn {
    background: linear-gradient(180deg, #cc6600 0%, #993300 100%);
    border: 3px solid #ff9933;
    color: #fff;
    padding: 14px 32px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 2px;
    animation: warrant-pulse 1.5s ease-in-out infinite;
    transition: transform 0.2s;
  }

  .warrant-btn:hover {
    transform: scale(1.05);
  }

  @keyframes warrant-pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 153, 51, 0.3); }
    50% { box-shadow: 0 0 25px rgba(255, 153, 51, 0.7); }
  }

  .warrant-hint {
    color: #999966;
    font-size: 13px;
    font-style: italic;
  }

  /* ---------- Dossier ---------- */

  .dossier-toggle {
    display: block;
    margin: 8px auto 16px;
    background: none;
    border: 1px solid #665500;
    color: #cc9966;
    padding: 6px 16px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.2s;
  }

  .dossier-toggle:hover {
    border-color: #ffd700;
    color: #ffd700;
  }

  .dossier-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .dossier-content {
    background: #1a1500;
    border: 2px solid #665500;
    padding: 20px;
    max-width: 500px;
    width: 100%;
    max-height: 70vh;
    overflow-y: auto;
  }

  .dossier-title {
    font-size: 16px;
    font-weight: bold;
    color: #ffd700;
    border-bottom: 1px solid #665500;
    padding-bottom: 8px;
    margin-bottom: 12px;
    letter-spacing: 3px;
  }

  .dossier-empty {
    color: #666;
    font-style: italic;
  }

  .dossier-note {
    font-size: 12px;
    color: #cc9966;
    padding: 4px 0;
    border-bottom: 1px solid #332200;
    margin: 0;
    line-height: 1.4;
  }

  /* ---------- Witness Dialog Screen ---------- */

  .witness-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px 40px;
    gap: 20px;
    min-height: 100vh;
    background: #1a0a0a;
  }

  .witness-scene {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    max-width: 600px;
    width: 100%;
  }

  .witness-portrait {
    flex-shrink: 0;
    text-align: center;
  }

  .witness-silhouette {
    width: 60px;
    height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sil-head {
    width: 30px;
    height: 30px;
    background: #444;
    border-radius: 50%;
  }

  .sil-body {
    width: 40px;
    height: 45px;
    background: #444;
    border-radius: 8px 8px 0 0;
    margin-top: 2px;
  }

  .witness-type-label {
    font-size: 10px;
    color: #ff6666;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  .witness-dialog {
    flex: 1;
  }

  .dialog-city {
    font-size: 11px;
    color: #666;
    margin-bottom: 8px;
    letter-spacing: 2px;
  }

  .dialog-bubble {
    background: #2a1a1a;
    border: 2px solid #883333;
    border-radius: 8px;
    padding: 16px;
    position: relative;
  }

  .dialog-bubble::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 15px;
    border: 5px solid transparent;
    border-right-color: #883333;
  }

  .dialog-bubble p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #e8d8c8;
    font-style: italic;
  }

  /* ---------- Travel Animation ---------- */

  .travel-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background: #0a0a1a;
  }

  .travel-anim {
    text-align: center;
    z-index: 10;
  }

  .plane-icon {
    font-size: 60px;
    animation: fly-plane 1.5s ease-in-out;
    transform: rotate(-20deg);
  }

  @keyframes fly-plane {
    0% { transform: translateX(-100px) rotate(-20deg); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translateX(100px) rotate(-20deg); opacity: 1; }
  }

  .travel-text {
    font-size: 24px;
    color: #6699cc;
    letter-spacing: 6px;
    margin-top: 16px;
  }

  .travel-dots {
    font-size: 36px;
    color: #6699cc;
  }

  .dot { animation: blink-dot 1.5s ease-in-out infinite; }
  .d1 { animation-delay: 0s; }
  .d2 { animation-delay: 0.3s; }
  .d3 { animation-delay: 0.6s; }

  @keyframes blink-dot {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }

  .world-map-bg {
    position: absolute;
    inset: 0;
    opacity: 0.08;
  }

  .continent {
    position: absolute;
    background: #3399cc;
    border-radius: 30%;
  }

  .continent.na { top: 15%; left: 10%; width: 22%; height: 30%; }
  .continent.sa { top: 50%; left: 18%; width: 14%; height: 30%; }
  .continent.eu { top: 12%; left: 42%; width: 14%; height: 18%; }
  .continent.af { top: 30%; left: 42%; width: 16%; height: 35%; }
  .continent.as { top: 10%; left: 55%; width: 28%; height: 35%; }
  .continent.oc { top: 55%; left: 72%; width: 16%; height: 18%; }

  /* ---------- Wrong City ---------- */

  .wrong-city-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
    text-align: center;
    gap: 12px;
    background: #1a0a0a;
  }

  .wrong-icon {
    font-size: 60px;
    animation: shake-wrong 0.5s ease-in-out;
  }

  @keyframes shake-wrong {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-15px); }
    75% { transform: translateX(15px); }
  }

  .wrong-title {
    font-size: 28px;
    color: #ff3333;
    letter-spacing: 4px;
    font-weight: bold;
  }

  .wrong-text {
    font-size: 16px;
    color: #cc6666;
  }

  .wrong-sub {
    font-size: 13px;
    color: #996666;
  }

  .wrong-moves {
    font-size: 14px;
    color: #ffcc33;
    margin-top: 8px;
  }

  /* ---------- Arrest Screen ---------- */

  .arrest-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
    text-align: center;
    gap: 12px;
    background: radial-gradient(ellipse at center, #1a2a1a 0%, #0a0a0a 70%);
    position: relative;
    overflow: hidden;
  }

  .arrest-flash {
    position: absolute;
    inset: 0;
    background: rgba(255, 215, 0, 0.1);
    animation: flash-arrest 2s ease-out forwards;
    pointer-events: none;
  }

  @keyframes flash-arrest {
    0% { opacity: 1; background: rgba(255, 215, 0, 0.4); }
    100% { opacity: 0; }
  }

  .arrest-badge {
    font-size: 60px;
    animation: bounce-badge 0.8s ease-out;
  }

  @keyframes bounce-badge {
    0% { transform: scale(0); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .arrest-title {
    font-size: 24px;
    color: #33ff33;
    letter-spacing: 3px;
    font-weight: bold;
    text-shadow: 0 0 15px rgba(51, 255, 51, 0.4);
  }

  .arrest-villain {
    font-size: 18px;
    color: #ffd700;
  }

  .arrest-item {
    font-size: 14px;
    color: #cc9966;
  }

  .arrest-stats {
    background: #1a1a0a;
    border: 1px solid #665500;
    padding: 12px 24px;
    margin-top: 8px;
  }

  .stat-line {
    font-size: 13px;
    color: #cc9966;
    padding: 2px 0;
  }

  .arrest-rank {
    background: linear-gradient(180deg, #2a1a00 0%, #1a0a00 100%);
    border: 2px solid #ffd700;
    padding: 16px 32px;
    margin-top: 8px;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
  }

  .rank-label {
    font-size: 10px;
    color: #999;
    letter-spacing: 3px;
  }

  .rank-title {
    font-size: 22px;
    color: #ffd700;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    margin: 4px 0;
  }

  .rank-cases {
    font-size: 12px;
    color: #cc9966;
  }

  /* ---------- Game Over ---------- */

  .gameover-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
    text-align: center;
    gap: 12px;
    background: radial-gradient(ellipse at center, #2a0a0a 0%, #0a0000 70%);
  }

  .go-icon {
    font-size: 60px;
  }

  .go-title {
    font-size: 28px;
    color: #ff3333;
    letter-spacing: 4px;
    font-weight: bold;
    text-shadow: 0 0 15px rgba(255, 51, 51, 0.4);
  }

  .go-text {
    font-size: 16px;
    color: #cc6666;
  }

  .go-sub {
    font-size: 13px;
    color: #996666;
    font-style: italic;
  }

  /* ---------- Shared Buttons ---------- */

  .action-btn {
    background: linear-gradient(180deg, #cc0000 0%, #880000 100%);
    color: #ffd700;
    border: 2px solid #ff3333;
    padding: 12px 28px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    text-shadow: 1px 1px 0 #440000;
    margin-top: 8px;
  }

  .action-btn:hover {
    background: linear-gradient(180deg, #ff0000 0%, #aa0000 100%);
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(255, 51, 51, 0.4);
  }

  .action-btn.secondary {
    background: linear-gradient(180deg, #444 0%, #222 100%);
    border-color: #666;
    color: #ccc;
    text-shadow: none;
  }

  .action-btn.secondary:hover {
    background: linear-gradient(180deg, #555 0%, #333 100%);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  }

  /* ---------- Beanie Position ---------- */

  :global(.beanie-globe) {
    bottom: 20px;
    left: 30px;
    z-index: 5;
    opacity: 0.7;
  }

  /* ---------- Responsive ---------- */

  @media (max-width: 600px) {
    .title-carmen {
      font-size: 22px;
    }

    .title-where {
      font-size: 11px;
    }

    .acme-logo-large {
      font-size: 28px;
    }

    .witness-btn {
      min-width: 90px;
      padding: 8px 10px;
      font-size: 11px;
    }

    .travel-btn {
      padding: 8px 14px;
      font-size: 12px;
    }

    .chief-section {
      flex-direction: column;
      align-items: center;
    }

    .chief-bubble::before {
      display: none;
    }

    .witness-scene {
      flex-direction: column;
      align-items: center;
    }

    .dialog-bubble::before {
      display: none;
    }

    .city-scene {
      height: 200px;
    }

    .city-name-plate {
      top: 50px;
    }
  }
</style>
