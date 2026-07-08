<script>
  import { alertsState, dismissAlert } from '../lib/state/alerts.svelte.js';

  function timeOf(at) {
    return new Date(at * 1000).toLocaleTimeString();
  }
</script>

<div class="stack">
  {#each alertsState.toasts as toast (toast.id)}
    <button class="toast {toast.type}" onclick={() => dismissAlert(toast.id)} title="dismiss">
      <span class="time">{timeOf(toast.at)}</span>
      {toast.message}
    </button>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    right: 12px;
    bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 30;
    max-width: 380px;
  }
  .toast {
    text-align: left;
    background: #fff;
    border: 1px solid #ddd;
    border-left: 5px solid #888;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    font-family: inherit;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    cursor: pointer;
    animation: slidein 0.25s ease-out;
  }
  .toast.drop { border-left-color: #c62828; }
  .toast.gap { border-left-color: #b26a00; }
  .toast.break { border-left-color: #2e7d32; }
  .time {
    display: block;
    font-size: 10px;
    color: #999;
    font-variant-numeric: tabular-nums;
  }
  @keyframes slidein {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
</style>
