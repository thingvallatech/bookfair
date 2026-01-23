<script lang="ts">
  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface GameState {
    screen: 'title' | 'name' | 'store' | 'travel' | 'event' | 'dead' | 'win';
    name: string;
    miles: number;
    food: number;
    health: number;
    money: number;
    oxen: number;
    pace: 'steady' | 'strenuous' | 'grueling';
    day: number;
    eventText: string;
  }

  let game = $state<GameState>({
    screen: 'title',
    name: '',
    miles: 0,
    food: 0,
    health: 100,
    money: 400,
    oxen: 2,
    pace: 'steady',
    day: 1,
    eventText: '',
  });

  let nameInput = $state('');

  const TOTAL_MILES = 2000;

  const events = [
    { text: 'You found a wild fruit bush! (+20 food)', food: 20, health: 0 },
    { text: 'A snake bit one of your party! (-15 health)', food: 0, health: -15 },
    { text: 'You met friendly travelers who shared supplies! (+30 food)', food: 30, health: 0 },
    { text: 'Bad water made everyone sick! (-25 health)', food: 0, health: -25 },
    { text: 'You shot a buffalo! (+50 food)', food: 50, health: 0 },
    { text: 'A thief stole some of your food! (-25 food)', food: -25, health: 0 },
    { text: 'Beautiful weather lifts everyone\'s spirits! (+10 health)', food: 0, health: 10 },
    { text: 'You have DYSENTERY. (-40 health)', food: 0, health: -40 },
    { text: 'Found an abandoned wagon with supplies! (+40 food)', food: 40, health: 0 },
    { text: 'Harsh weather conditions! (-20 health)', food: 0, health: -20 },
    { text: 'A member of your party has TYPHOID. (-35 health)', food: 0, health: -35 },
    { text: 'You successfully forded the river!', food: 0, health: 0 },
    { text: 'An ox wandered off... (-1 ox)', food: 0, health: 0, oxen: -1 },
    { text: 'You found a lost ox! (+1 ox)', food: 0, health: 0, oxen: 1 },
    { text: 'CHOLERA strikes your party! (-30 health)', food: 0, health: -30 },
  ];

  function startGame() {
    game.screen = 'name';
  }

  function setName() {
    if (!nameInput.trim()) return;
    game.name = nameInput;
    game.screen = 'store';
  }

  function buyItem(item: string, cost: number, amount: number) {
    if (game.money >= cost) {
      game.money -= cost;
      if (item === 'food') game.food += amount;
      if (item === 'oxen') game.oxen += amount;
    }
  }

  function leaveStore() {
    if (game.food < 50) {
      alert('You need at least 50 food to start your journey!');
      return;
    }
    if (game.oxen < 1) {
      alert('You need at least 1 ox to pull your wagon!');
      return;
    }
    game.screen = 'travel';
  }

  function travel() {
    // Calculate miles based on pace and oxen
    const paceMultiplier = game.pace === 'steady' ? 1 : game.pace === 'strenuous' ? 1.5 : 2;
    const milesPerDay = 15 * paceMultiplier * Math.min(game.oxen, 2);
    game.miles += Math.round(milesPerDay);
    game.day += 1;

    // Consume food
    const foodConsumed = 5 + (game.pace === 'grueling' ? 3 : game.pace === 'strenuous' ? 1 : 0);
    game.food = Math.max(0, game.food - foodConsumed);

    // Health effects from pace
    if (game.pace === 'grueling') game.health -= 5;
    else if (game.pace === 'strenuous') game.health -= 2;

    // Starving
    if (game.food <= 0) {
      game.health -= 10;
    }

    // Random event (40% chance)
    if (Math.random() < 0.4) {
      const event = events[Math.floor(Math.random() * events.length)];
      game.eventText = event.text;
      game.food = Math.max(0, game.food + event.food);
      game.health = Math.min(100, Math.max(0, game.health + event.health));
      if (event.oxen) game.oxen = Math.max(0, game.oxen + event.oxen);
      game.screen = 'event';
      return;
    }

    checkEndConditions();
  }

  function continueFromEvent() {
    game.screen = 'travel';
    checkEndConditions();
  }

  function checkEndConditions() {
    if (game.health <= 0) {
      game.screen = 'dead';
    } else if (game.miles >= TOTAL_MILES) {
      game.screen = 'win';
    }
  }

  function rest() {
    game.day += 1;
    game.food = Math.max(0, game.food - 3);
    game.health = Math.min(100, game.health + 10);

    if (game.food <= 0) {
      game.health -= 5;
    }

    checkEndConditions();
  }

  function resetGame() {
    game = {
      screen: 'title',
      name: '',
      miles: 0,
      food: 0,
      health: 100,
      money: 400,
      oxen: 2,
      pace: 'steady',
      day: 1,
      eventText: '',
    };
    nameInput = '';
  }
</script>

<div class="oregon-trail">
  <button class="close-btn" onclick={onClose}>✕</button>

  <div class="game-screen">
    {#if game.screen === 'title'}
      <div class="title-screen">
        <pre class="ascii-art">
    ___  ____  ____  ___  ___  _  _
   / __)(  _ \( ___)/ __)/ __)( \/ )
  ( (__  )   / )__)( (_ \\__ \ )  (
   \___)(_)\_)(____)\___/(___/(_/\_)
        _____ ____   ____  _____  __
       (_   _)  _ \ / _  \(_   _)(  )
         | | |    || (_) | | |  |  |__
         (_) (_/\_)(_/\_) (_)  (_____)
        </pre>
        <h1>THE OREGON TRAIL</h1>
        <p class="subtitle">Can you survive the journey?</p>
        <button class="game-btn" onclick={startGame}>Press ENTER to Start</button>
      </div>

    {:else if game.screen === 'name'}
      <div class="name-screen">
        <h2>What is the name of your wagon leader?</h2>
        <input
          type="text"
          bind:value={nameInput}
          placeholder="Enter name..."
          maxlength="12"
        />
        <button class="game-btn" onclick={setName}>Continue</button>
      </div>

    {:else if game.screen === 'store'}
      <div class="store-screen">
        <h2>Matt's General Store</h2>
        <p>Money: ${game.money}</p>

        <div class="store-items">
          <div class="store-item">
            <span>Food (10 lbs)</span>
            <span>$5</span>
            <button onclick={() => buyItem('food', 5, 10)}>Buy</button>
            <span>Owned: {game.food} lbs</span>
          </div>
          <div class="store-item">
            <span>Oxen</span>
            <span>$40</span>
            <button onclick={() => buyItem('oxen', 40, 1)}>Buy</button>
            <span>Owned: {game.oxen}</span>
          </div>
        </div>

        <button class="game-btn" onclick={leaveStore}>Leave Store</button>
      </div>

    {:else if game.screen === 'travel'}
      <div class="travel-screen">
        <div class="landscape">
          <div class="sun">☀️</div>
          <div class="mountains">🏔️🏔️🏔️</div>
          <div class="wagon">🐂🚗</div>
          <div class="ground"></div>
        </div>

        <div class="stats">
          <div class="stat-row">
            <span>Day: {game.day}</span>
            <span>Miles: {game.miles}/{TOTAL_MILES}</span>
          </div>
          <div class="stat-row">
            <span>Health: {game.health}%</span>
            <span>Food: {game.food} lbs</span>
          </div>
          <div class="stat-row">
            <span>Oxen: {game.oxen}</span>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress" style="width: {(game.miles / TOTAL_MILES) * 100}%"></div>
          <span class="progress-text">{Math.round((game.miles / TOTAL_MILES) * 100)}% to Oregon</span>
        </div>

        <div class="pace-selector">
          <span>Pace:</span>
          <label>
            <input type="radio" bind:group={game.pace} value="steady" />
            Steady
          </label>
          <label>
            <input type="radio" bind:group={game.pace} value="strenuous" />
            Strenuous
          </label>
          <label>
            <input type="radio" bind:group={game.pace} value="grueling" />
            Grueling
          </label>
        </div>

        <div class="actions">
          <button class="game-btn" onclick={travel}>Continue Trail</button>
          <button class="game-btn secondary" onclick={rest}>Rest (restore health)</button>
        </div>
      </div>

    {:else if game.screen === 'event'}
      <div class="event-screen">
        <div class="event-box">
          <p>{game.eventText}</p>
        </div>
        <button class="game-btn" onclick={continueFromEvent}>Continue</button>
      </div>

    {:else if game.screen === 'dead'}
      <div class="dead-screen">
        <pre class="tombstone">
      _______
     /       \
    |  R.I.P  |
    |         |
    | {game.name.substring(0, 7).padEnd(7)} |
    |  {game.day} days  |
    |_________|
    </pre>
        <h2>You have died.</h2>
        <p>You traveled {game.miles} miles before your journey ended.</p>
        <button class="game-btn" onclick={resetGame}>Try Again</button>
      </div>

    {:else if game.screen === 'win'}
      <div class="win-screen">
        <h1>🎉 CONGRATULATIONS! 🎉</h1>
        <h2>{game.name}'s party made it to Oregon!</h2>
        <p>You traveled {TOTAL_MILES} miles in {game.day} days.</p>
        <p>Final health: {game.health}%</p>
        <p>Food remaining: {game.food} lbs</p>
        <button class="game-btn" onclick={resetGame}>Play Again</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .oregon-trail {
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    font-family: 'Press Start 2P', 'Courier New', monospace;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
  }

  .game-screen {
    background: #001a00;
    border: 4px solid #00ff00;
    width: 90%;
    max-width: 500px;
    min-height: 400px;
    padding: 20px;
    color: #00ff00;
    text-align: center;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
  }

  .ascii-art {
    font-size: 6px;
    line-height: 1.2;
    margin-bottom: 20px;
    color: #00ff00;
  }

  h1 {
    font-size: 1rem;
    margin-bottom: 10px;
  }

  h2 {
    font-size: 0.7rem;
    margin-bottom: 20px;
  }

  .subtitle {
    font-size: 0.5rem;
    margin-bottom: 30px;
    color: #00aa00;
  }

  .game-btn {
    padding: 12px 24px;
    font-family: inherit;
    font-size: 0.6rem;
    background: #003300;
    color: #00ff00;
    border: 2px solid #00ff00;
    cursor: pointer;
    margin: 8px;
    transition: all 0.2s;
  }

  .game-btn:hover {
    background: #00ff00;
    color: #003300;
  }

  .game-btn.secondary {
    background: transparent;
    border-color: #00aa00;
    color: #00aa00;
  }

  .game-btn.secondary:hover {
    background: #00aa00;
    color: #001a00;
  }

  input[type="text"] {
    width: 80%;
    padding: 12px;
    font-family: inherit;
    font-size: 0.6rem;
    background: #001a00;
    color: #00ff00;
    border: 2px solid #00ff00;
    margin-bottom: 20px;
    text-align: center;
  }

  input[type="text"]::placeholder {
    color: #006600;
  }

  /* Store */
  .store-items {
    margin: 20px 0;
    text-align: left;
  }

  .store-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #003300;
    font-size: 0.5rem;
  }

  .store-item button {
    padding: 4px 12px;
    font-family: inherit;
    font-size: 0.4rem;
    background: #003300;
    color: #00ff00;
    border: 1px solid #00ff00;
    cursor: pointer;
  }

  .store-item button:hover {
    background: #00ff00;
    color: #003300;
  }

  /* Travel */
  .landscape {
    height: 120px;
    position: relative;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .sun {
    position: absolute;
    top: 10px;
    right: 20px;
    font-size: 2rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .mountains {
    position: absolute;
    bottom: 30px;
    left: 0;
    right: 0;
    font-size: 2rem;
    text-align: center;
    letter-spacing: -10px;
  }

  .wagon {
    position: absolute;
    bottom: 10px;
    left: 30%;
    font-size: 1.5rem;
    animation: bump 0.5s ease-in-out infinite;
  }

  @keyframes bump {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .ground {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 10px;
    background: #00aa00;
  }

  .stats {
    margin: 15px 0;
    font-size: 0.5rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
    padding: 4px;
  }

  .progress-bar {
    height: 20px;
    background: #003300;
    border: 2px solid #00ff00;
    position: relative;
    margin: 15px 0;
  }

  .progress {
    height: 100%;
    background: #00ff00;
    transition: width 0.3s;
  }

  .progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.4rem;
    color: #00ff00;
    mix-blend-mode: difference;
  }

  .pace-selector {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
    margin: 15px 0;
    font-size: 0.4rem;
    flex-wrap: wrap;
  }

  .pace-selector label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .actions {
    margin-top: 20px;
  }

  /* Event */
  .event-box {
    background: #003300;
    border: 2px solid #00ff00;
    padding: 20px;
    margin: 30px 0;
  }

  .event-box p {
    font-size: 0.6rem;
    line-height: 1.6;
  }

  /* Dead */
  .tombstone {
    font-size: 8px;
    margin: 20px 0;
  }

  .dead-screen p {
    font-size: 0.5rem;
    margin: 10px 0;
  }

  /* Win */
  .win-screen h1 {
    font-size: 0.8rem;
    animation: rainbow 2s linear infinite;
  }

  @keyframes rainbow {
    0% { color: #ff0000; }
    17% { color: #ff8800; }
    33% { color: #ffff00; }
    50% { color: #00ff00; }
    67% { color: #0088ff; }
    83% { color: #8800ff; }
    100% { color: #ff0000; }
  }

  .win-screen p {
    font-size: 0.5rem;
    margin: 10px 0;
  }
</style>
