<script>
  import { CircleHelp } from '@lucide/svelte'
  import { settings } from '../stores/settingsStore'
  import { deleteDB } from './gamedb'

  let show = false
  let tab = 'how-to-play'
  let confirmResetAll = false
  let isDeleting = false
  const openModal = async () => {
    show = true
  }

  const closeModal = () => {
    show = false
    confirmResetAll = false
  }

  import { onDestroy } from 'svelte'
  import { panelRequest } from '../stores/panelRequestStore'
  const unsubPanel = panelRequest.subscribe(r => {
    if (r?.panel === 'info') show ? closeModal() : openModal()
  })
  onDestroy(unsubPanel)
  $: window.parent !== window && window.parent.postMessage({ cerevana: 'panelState', panel: 'info', open: show }, '*')

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal()
  }

  const handleBackdropClick = (event) => {
    if (event.target.classList.contains('modal')) closeModal()
  }

  const resetSettings = () => {
    settings.reset()
    alert("Settings reset to default.")
    show = false
  }

  const resetAll = async () => {
    isDeleting = true
    await deleteDB()
    settings.reset()
    isDeleting = false
    alert("App fully reset.")
    confirmResetAll = false
    show = false
  }
</script>

<!-- Trigger hidden: the Cerevana host page's info corner tab opens this via postMessage -->
<button class="hidden items-center justify-center" on:click={openModal}>
  <CircleHelp class="btn btn-square btn-ghost h-8 lg:h-6" />
</button>
{#if show}
  <div class="cv-popup-backdrop" on:click={closeModal}></div>
  <div class="cv-popup whitespace-normal" on:keydown={handleKeydown} tabindex="0">
    <div class="graph-controls">
      <button class="cv-button graph-select" class:selected={tab === 'how-to-play'} on:click={() => tab = 'how-to-play'}>How to Play</button>
      <button class="cv-button graph-select" class:selected={tab === 'misc'} on:click={() => tab = 'misc'}>Reset</button>
    </div>
      {#if tab === 'how-to-play'}
      <div class="cv-popup-body">
        <p>
          3D Quad N-Back is a working memory game. A cube will repeatedly flash in a 3D grid, and you must remember cues that appeared
          <strong>n steps ago</strong> across four different modalities:
        </p>
        <ul class="list-disc list-inside my-4">
          <li><strong>Position:</strong> where the cube appeared</li>
          <li><strong>Color:</strong> the color of the cube</li>
          <li><strong>Shape:</strong> the shape inside the cube</li>
          <li><strong>Audio:</strong> what was spoken</li>
        </ul>
        <p>
          For each new item, press the corresponding key if it matches the item shown
          <strong>n steps back</strong> in the sequence:
        </p>
        <ul class="list-disc list-inside my-4">
          <li><strong>A</strong> &ndash; position match</li>
          <li><strong>F</strong> &ndash; color match</li>
          <li><strong>J</strong> &ndash; shape match</li>
          <li><strong>L</strong> &ndash; audio match</li>
        </ul>
        <p>
          You can press multiple keys if more than one aspect matches. The game continues with a new cube every few seconds.
          After a set amount of trials, you'll be scored on your accuracy.
          If you do well enough, you're n-back level will be advanced by 1.
          Stay focused and try to get as high a score as possible!
        </p>
      </div>
      {:else if tab === 'misc'}
      <div class="cv-popup-body">
        <div class="mt-4">
          <div class="panel-heading">Reset Settings</div>
          <p class="mt-2">Reset all game settings to their default values.
          This will not affect your game history or performance data.</p>
          <button class="cv-button mt-4" on:click={resetSettings}>
            Reset Settings
          </button>
        </div>
        <hr class="cv-divider">
        <div>
          <div class="panel-heading">Danger Zone</div>
          <p class="mt-2">
            This will erase all Quad Box data including settings and game history. This action is irreversible.
          </p>

          {#if !confirmResetAll}
            <button class="cv-button delete mt-4" on:click={() => confirmResetAll = true}>
              Reset Quad Box
            </button>
          {:else}
            <div class="mt-4 flex flex-col gap-2 items-start">
              <p>Are you absolutely sure?</p>
              <button class="cv-button delete" on:click={() => resetAll()}>
                Yes, erase everything{#if isDeleting}&hellip;{/if}
              </button>
              <button class="cv-button" on:click={() => confirmResetAll = false}>
                Cancel
              </button>
            </div>
          {/if}
        </div>
      </div>
      {/if}
      <div class="graph-end-controls">
        <div class="flex gap-4">
          <a class="underline" href="https://github.com/soamsy/quad-box" target="_blank" rel="noopener">Quad Box by soamsy</a>
          <a class="underline" href="https://ko-fi.com/soasoa" target="_blank" rel="noopener">Donate☕</a>
        </div>
        <button class="cv-popup-close" on:click={closeModal}>Close</button>
      </div>
  </div>
{/if}
