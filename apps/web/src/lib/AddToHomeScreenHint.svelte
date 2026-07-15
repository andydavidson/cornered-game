<script lang="ts">
  import { onMount } from 'svelte';

  const DISMISSED_KEY = 'cornered:a2hs-dismissed';

  let visible = $state(false);

  function isIosSafari(): boolean {
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes('Macintosh') && navigator.maxTouchPoints > 1); // iPadOS 13+ reports as Mac
    const isSafari = /^((?!crios|fxios|edgios|opios|chrome|android).)*safari/i.test(ua);
    return isIos && isSafari;
  }

  function isStandalone(): boolean {
    return (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
  }

  function dismiss() {
    visible = false;
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  onMount(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (isStandalone()) return;
    if (!isIosSafari()) return;
    visible = true;
  });
</script>

{#if visible}
  <div class="a2hs-hint" role="note">
    <span class="text">
      Add Cornered to your Home Screen: tap <strong>Share</strong>
      <span aria-hidden="true">⬆️</span>, then <strong>Add to Home Screen</strong>.
    </span>
    <button class="dismiss" onclick={dismiss} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .a2hs-hint {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 480px;
    margin: 0.5rem auto 0;
    padding: 0.5rem 0.75rem;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    font-size: 0.8rem;
    color: #94a3b8;
    animation: fade-in 0.3s ease-out;
  }

  .text {
    flex: 1;
  }

  strong {
    color: #cbd5e1;
  }

  .dismiss {
    flex-shrink: 0;
    background: transparent;
    color: #64748b;
    padding: 0.25rem 0.5rem;
    min-width: 32px;
    min-height: 32px;
    font-size: 0.8rem;
  }

  @media (hover: hover) {
    .dismiss:hover {
      color: #f1f5f9;
    }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
