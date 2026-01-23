<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import { playSound } from '$lib/stores/audio';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  interface Buddy {
    name: string;
    status: 'online' | 'away' | 'offline';
    awayMessage?: string;
    icon: string;
  }

  const buddyList: Buddy[] = [
    { name: 'sk8rboi2001', status: 'online', icon: '🛹' },
    { name: 'xXDragonSlayerXx', status: 'away', awayMessage: 'BRB getting pizza 🍕', icon: '🐉' },
    { name: 'pinkprincess99', status: 'online', icon: '👑' },
    { name: 'CoOlDuDe420', status: 'away', awayMessage: '~*~If YoU cAnT hAnDlE mE aT mY wOrSt~*~', icon: '😎' },
    { name: 'SoccerStar17', status: 'offline', icon: '⚽' },
    { name: 'N*SYNCfan4eva', status: 'online', icon: '🎤' },
    { name: 'linkinpark_rox', status: 'away', awayMessage: 'In the end, it doesn\'t even matter', icon: '🎸' },
    { name: 'butterfly_kisses', status: 'online', icon: '🦋' },
    { name: 'GameBoyKing', status: 'offline', icon: '🎮' },
  ];

  const awayMessages = [
    '~*~LiViNg My BeSt LiFe~*~',
    'brb... or not. who knows? ¯\\_(ツ)_/¯',
    'Away msg: I\'m not here. Leave a msg after the beep. BEEP!',
    '♫ ♪ Listening to music ♪ ♫',
    'If you need me, I\'ll be at the mall',
    'Homework :( talk later',
    '>>>>PARTY TIME<<<<',
    'zZzZzZz sleeping zZzZzZz',
  ];

  let currentView = $state<'buddies' | 'chat' | 'away'>('buddies');
  let selectedBuddy = $state<Buddy | null>(null);
  let chatMessages = $state<Array<{ from: string; text: string; time: string }>>([]);
  let messageInput = $state('');
  let myAwayMessage = $state(awayMessages[0]);
  let isAway = $state(false);

  // Door sound effect on buddy sign on/off
  let lastOnlineCount = buddyList.filter(b => b.status !== 'offline').length;

  function openChat(buddy: Buddy) {
    if (buddy.status === 'offline') return;
    selectedBuddy = buddy;
    currentView = 'chat';
    chatMessages = [
      { from: buddy.name, text: getRandomGreeting(), time: getCurrentTime() }
    ];
  }

  function getRandomGreeting(): string {
    const greetings = [
      'hey!!! :)',
      'omg hi!!',
      'sup?',
      'heyyyy',
      'yo whats up',
      'hiiii :D',
      'heyyy long time no talk!',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  function getCurrentTime(): string {
    const now = new Date();
    let hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  }

  function sendMessage() {
    if (!messageInput.trim() || !selectedBuddy) return;

    playSound('whoosh', 0.3);

    chatMessages = [...chatMessages, {
      from: 'You',
      text: messageInput,
      time: getCurrentTime()
    }];

    const userMsg = messageInput;
    messageInput = '';

    // Auto-reply after delay
    setTimeout(() => {
      if (selectedBuddy) {
        playSound('ding', 0.5);
        chatMessages = [...chatMessages, {
          from: selectedBuddy.name,
          text: getAutoReply(userMsg),
          time: getCurrentTime()
        }];
      }
    }, 1000 + Math.random() * 2000);
  }

  function getAutoReply(msg: string): string {
    const replies = [
      'lol totally',
      'omg same!!',
      'haha yeah',
      'no way!!',
      'thats so cool',
      'brb phone',
      'lol :P',
      'ikr???',
      'wait rly?',
      'haha nice',
      'gtg soon',
      'lol ur funny',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="aim">
  <CloseButton {onClose} />

  <div class="aim-window">
    <!-- Title bar -->
    <div class="title-bar">
      <div class="aim-logo">
        <span class="running-man">🏃</span>
        <span>AIM</span>
      </div>
      <div class="title-text">
        {#if currentView === 'buddies'}
          Buddy List
        {:else if currentView === 'chat' && selectedBuddy}
          {selectedBuddy.name}
        {:else}
          Away Message
        {/if}
      </div>
    </div>

    <!-- Menu bar -->
    <div class="menu-bar">
      <button onclick={() => currentView = 'buddies'}>My Buddies</button>
      <button onclick={() => currentView = 'away'}>Away</button>
    </div>

    <!-- Content area -->
    <div class="content">
      {#if currentView === 'buddies'}
        <div class="buddy-list">
          <div class="category">
            <div class="category-header">
              <span>▼</span> Buddies ({buddyList.filter(b => b.status !== 'offline').length}/{buddyList.length})
            </div>

            {#each buddyList.filter(b => b.status !== 'offline') as buddy}
              <button class="buddy-item" onclick={() => openChat(buddy)}>
                <span class="buddy-icon">{buddy.icon}</span>
                <span class="buddy-name">{buddy.name}</span>
                {#if buddy.status === 'away'}
                  <span class="away-indicator">💤</span>
                {/if}
              </button>
            {/each}
          </div>

          <div class="category">
            <div class="category-header">
              <span>▶</span> Offline ({buddyList.filter(b => b.status === 'offline').length})
            </div>
            {#each buddyList.filter(b => b.status === 'offline') as buddy}
              <div class="buddy-item offline">
                <span class="buddy-icon">{buddy.icon}</span>
                <span class="buddy-name">{buddy.name}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Status bar -->
        <div class="status-bar">
          <span class="status-icon">{isAway ? '💤' : '🟢'}</span>
          <span>{isAway ? 'Away' : 'Online'}</span>
        </div>

      {:else if currentView === 'chat' && selectedBuddy}
        <div class="chat-window">
          <!-- Buddy info -->
          <div class="buddy-header">
            <span class="buddy-icon large">{selectedBuddy.icon}</span>
            <div class="buddy-info">
              <div class="buddy-name">{selectedBuddy.name}</div>
              {#if selectedBuddy.status === 'away' && selectedBuddy.awayMessage}
                <div class="buddy-away">Away: {selectedBuddy.awayMessage}</div>
              {/if}
            </div>
          </div>

          <!-- Messages -->
          <div class="messages">
            {#each chatMessages as msg}
              <div class="message" class:mine={msg.from === 'You'}>
                <span class="msg-sender">{msg.from}</span>
                <span class="msg-time">({msg.time})</span>
                <span class="msg-text">: {msg.text}</span>
              </div>
            {/each}
          </div>

          <!-- Input -->
          <div class="message-input">
            <textarea
              bind:value={messageInput}
              onkeydown={handleKeydown}
              placeholder="Type a message..."
            ></textarea>
            <div class="input-buttons">
              <button onclick={sendMessage}>Send</button>
              <button onclick={() => { currentView = 'buddies'; selectedBuddy = null; }}>Back</button>
            </div>
          </div>
        </div>

      {:else if currentView === 'away'}
        <div class="away-settings">
          <h3>Set Away Message</h3>

          <div class="away-toggle">
            <label>
              <input type="checkbox" bind:checked={isAway} />
              I am away from my computer
            </label>
          </div>

          <div class="away-presets">
            <p>Choose a message:</p>
            {#each awayMessages as msg}
              <button
                class="away-preset"
                class:active={myAwayMessage === msg}
                onclick={() => myAwayMessage = msg}
              >
                {msg}
              </button>
            {/each}
          </div>

          <div class="current-away">
            <p>Current message:</p>
            <textarea bind:value={myAwayMessage}></textarea>
          </div>
        </div>
      {/if}
    </div>

    <!-- Warning banner -->
    <div class="warning-banner">
      ⚠️ Remember: Never give out your password or personal info!
    </div>
  </div>
</div>

<style>
  .aim {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #6b8cce 0%, #4a6ba5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    font-size: 18px;
    cursor: pointer;
    z-index: 100;
  }

  .aim-window {
    background: #ece9d8;
    border: 2px solid #0054e3;
    border-radius: 8px 8px 0 0;
    width: 100%;
    max-width: 320px;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .title-bar {
    background: linear-gradient(180deg, #0a246a 0%, #a6caf0 5%, #0a246a 95%, #0a246a 100%);
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: white;
  }

  .aim-logo {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    font-size: 12px;
  }

  .running-man {
    animation: run 0.5s steps(2) infinite;
  }

  @keyframes run {
    0% { transform: translateX(0); }
    100% { transform: translateX(2px); }
  }

  .title-text {
    font-size: 11px;
  }

  .menu-bar {
    background: #ece9d8;
    border-bottom: 1px solid #aca899;
    padding: 2px 4px;
    display: flex;
    gap: 4px;
  }

  .menu-bar button {
    background: none;
    border: 1px solid transparent;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
  }

  .menu-bar button:hover {
    background: #b5d3ff;
    border-color: #316ac5;
  }

  .content {
    min-height: 300px;
    max-height: 400px;
    overflow-y: auto;
    background: white;
  }

  /* Buddy List */
  .buddy-list {
    padding: 8px;
  }

  .category {
    margin-bottom: 8px;
  }

  .category-header {
    font-size: 11px;
    font-weight: bold;
    padding: 4px;
    background: #ece9d8;
    border: 1px solid #aca899;
    cursor: pointer;
  }

  .buddy-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    min-height: 44px;
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
  }

  .buddy-item:hover {
    background: #316ac5;
    color: white;
  }

  .buddy-item.offline {
    opacity: 0.5;
    cursor: default;
  }

  .buddy-item.offline:hover {
    background: none;
    color: inherit;
  }

  .buddy-icon {
    font-size: 16px;
  }

  .buddy-icon.large {
    font-size: 32px;
  }

  .buddy-name {
    flex: 1;
  }

  .away-indicator {
    font-size: 12px;
  }

  .status-bar {
    background: #ece9d8;
    border-top: 1px solid #aca899;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }

  /* Chat Window */
  .chat-window {
    display: flex;
    flex-direction: column;
    height: 350px;
  }

  .buddy-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: #f0f0f0;
    border-bottom: 1px solid #ccc;
  }

  .buddy-info {
    flex: 1;
  }

  .buddy-away {
    font-size: 10px;
    color: #666;
    font-style: italic;
  }

  .messages {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    font-size: 12px;
  }

  .message {
    margin-bottom: 4px;
    word-wrap: break-word;
  }

  .message.mine .msg-sender {
    color: #c00;
    font-weight: bold;
  }

  .message:not(.mine) .msg-sender {
    color: #00c;
    font-weight: bold;
  }

  .msg-time {
    color: #999;
    font-size: 10px;
  }

  .message-input {
    border-top: 1px solid #ccc;
    padding: 8px;
    background: #f5f5f5;
  }

  .message-input textarea {
    width: 100%;
    height: 50px;
    border: 1px solid #ccc;
    padding: 4px;
    font-family: inherit;
    font-size: 12px;
    resize: none;
  }

  .input-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .input-buttons button {
    padding: 4px 16px;
    background: #ece9d8;
    border: 1px solid #aca899;
    cursor: pointer;
    font-size: 11px;
  }

  .input-buttons button:hover {
    background: #ddd;
  }

  /* Away Settings */
  .away-settings {
    padding: 16px;
  }

  .away-settings h3 {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .away-toggle {
    margin-bottom: 16px;
    font-size: 12px;
  }

  .away-toggle input {
    margin-right: 8px;
  }

  .away-presets {
    margin-bottom: 16px;
  }

  .away-presets p {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .away-preset {
    display: block;
    width: 100%;
    padding: 8px;
    margin-bottom: 4px;
    background: #f5f5f5;
    border: 1px solid #ccc;
    text-align: left;
    font-size: 11px;
    cursor: pointer;
  }

  .away-preset:hover {
    background: #e5e5e5;
  }

  .away-preset.active {
    background: #316ac5;
    color: white;
    border-color: #316ac5;
  }

  .current-away p {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .current-away textarea {
    width: 100%;
    height: 60px;
    font-size: 12px;
    padding: 8px;
    border: 1px solid #ccc;
  }

  .warning-banner {
    background: #fff3cd;
    border-top: 1px solid #ffc107;
    padding: 4px 8px;
    font-size: 9px;
    text-align: center;
    color: #856404;
  }
</style>
