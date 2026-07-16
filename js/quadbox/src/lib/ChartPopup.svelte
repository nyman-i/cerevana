<script>
  import { analytics } from '../stores/analyticsStore'
  import { mobile } from '../stores/mobileStore'
  import { recentGamesState } from '../stores/recentGamesStore'
  import ProgressChart from './ProgressChart.svelte'
  import { ChartColumn } from '@lucide/svelte'
  import RecentGames from './RecentGames.svelte'
  import TimeStats from './TimeStats.svelte'

  let show = false
  let tab = 'recent-games'
  const openModal = async () => {
    show = true
  }

  const closeModal = () => {
    show = false
  }

  import { onDestroy } from 'svelte'
  import { panelRequest } from '../stores/panelRequestStore'
  const unsubPanel = panelRequest.subscribe(r => {
    if (r?.panel === 'chart') show ? closeModal() : openModal()
  })
  onDestroy(unsubPanel)
  $: window.parent !== window && window.parent.postMessage({ cerevana: 'panelState', panel: 'chart', open: show }, '*')

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal()
  }

  const handleBackdropClick = (event) => {
    if (event.target.classList.contains('modal')) closeModal()
  }

</script>

<!-- Trigger hidden: the Cerevana host page's graph corner tab opens this via postMessage -->
<button class="hidden items-center justify-center" on:click={openModal}>
  <ChartColumn class="btn btn-square btn-ghost h-8 lg:h-6" />
</button>
{#if show}
  <div class="cv-popup-backdrop" on:click={closeModal}></div>
  <div class="cv-popup" on:keydown={handleKeydown} tabindex="0">
    <div class="graph-controls">
      <button class="cv-button graph-select" class:selected={tab === 'recent-games'} on:click={() => tab = 'recent-games'}>Recent Games</button>
      <button class="cv-button graph-select" class:selected={tab === 'progress-chart'} on:click={() => tab = 'progress-chart'}>Progress Chart</button>
    </div>
    <div class="cv-popup-body">
      {#if tab === 'recent-games'}
      <RecentGames />
      {:else}
      <TimeStats />
      <div class="h-[50svh]">
        <ProgressChart />
      </div>
      {/if}
    </div>
    <div class="graph-end-controls select-none">
      <div class="ctrl__inner">
        {#if tab === 'recent-games'}
        <div>
          <input hidden id="show-cancelled" type="checkbox" checked={$recentGamesState.filter !== 'completed'} on:click={() => $recentGamesState.filter = $recentGamesState.filter === 'completed' ? 'all' : 'completed'}>
          <label class="switch" for="show-cancelled"></label>
        </div>
        <label for="show-cancelled">Show cancelled</label>
        {/if}
        {#if $mobile && $analytics.playTime}
        <div>Today: {$analytics.playTime}</div>
        {/if}
      </div>
      <button class="cv-popup-close" on:click={closeModal}>Close</button>
    </div>
  </div>
{/if}
