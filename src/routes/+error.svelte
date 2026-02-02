<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="bsod">
  <div class="scanlines"></div>
  <div class="content" role="alert">
    <div class="header">
      <span class="title-bar">The Book Fair</span>
    </div>
    <pre class="ascii-box">
 _______________________________________________
|                                               |
|   A fatal exception has occurred at the       |
|   Scholastic Book Fair. Please tell a         |
|   teacher or press any key to continue.       |
|_______________________________________________|</pre>
    <div class="error-code">
      <span class="big-code">{$page.status}</span>
    </div>
    <p class="error-msg">
      {$page.error?.message || 'This page has gone the way of your Geocities site.'}
    </p>
    <p class="flavor">
      Something went wrong... but at least you didn't lose your Oregon Trail progress.
    </p>
    <div class="details">
      <p>* Press any key to return to the shelf</p>
      <p>* If this problem persists, try blowing on the cartridge</p>
      <p>* Error logged to C:\BOOKFAIR\ERRORS\dump.log</p>
    </div>
    <a href="/" class="back-btn">
      [&nbsp;&nbsp;Return to Shelf&nbsp;&nbsp;]<span class="cursor">_</span>
    </a>
  </div>
</div>

<svelte:window onkeydown={() => window.location.href = '/'} />

<style>
  .bsod {
    position: fixed;
    inset: 0;
    background: #0000AA;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Courier New', Courier, monospace;
    color: #fff;
    overflow: hidden;
  }
  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px,
      transparent 1px, transparent 3px
    );
    pointer-events: none;
    z-index: 2;
  }
  .content {
    position: relative;
    z-index: 1;
    max-width: 640px;
    width: 90%;
    text-align: center;
    padding: 24px;
  }
  .header { margin-bottom: 16px; }
  .title-bar {
    background: #aaa;
    color: #0000AA;
    padding: 2px 16px;
    font-weight: bold;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .ascii-box {
    font-size: 11px;
    line-height: 1.3;
    text-align: left;
    display: inline-block;
    margin: 12px auto;
    color: #ccc;
  }
  .error-code { margin: 20px 0 12px; }
  .big-code {
    font-size: 96px;
    font-weight: bold;
    letter-spacing: 8px;
    text-shadow: 4px 4px 0 #000066;
    line-height: 1;
  }
  .error-msg {
    font-size: 18px;
    margin: 8px 0 20px;
    color: #ffff55;
  }
  .flavor {
    font-size: 14px;
    color: #aaa;
    font-style: italic;
    margin-bottom: 24px;
  }
  .details {
    text-align: left;
    display: inline-block;
    font-size: 13px;
    color: #ccc;
    line-height: 1.8;
    margin-bottom: 28px;
  }
  .back-btn {
    display: inline-block;
    color: #fff;
    background: none;
    border: none;
    font-family: 'Courier New', Courier, monospace;
    font-size: 18px;
    cursor: pointer;
    text-decoration: none;
    padding: 8px 4px;
    letter-spacing: 1px;
    transition: color 0.2s;
  }
  .back-btn:hover { color: #ffff55; }
  .back-btn:focus-visible {
    outline: 2px solid #ffff55;
    outline-offset: 4px;
  }
  .cursor { animation: blink 1s step-end infinite; }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>
