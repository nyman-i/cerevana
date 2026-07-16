<script>
  import { settings } from '../stores/settingsStore'
  import { onDestroy } from 'svelte'
  $: mode = $settings.mode

  const allModes = ['quad', 'dual', 'custom', 'customB', 'tally', 'vtally']
  const modeLabels = new Map([
    ['quad', 'Quad'],
    ['dual', 'Dual'],
    ['custom', 'Custom A'],
    ['customB', 'Custom B'],
    ['tally', 'Tally'],
    ['vtally', 'Visual Tally'],
  ])

  let showTallyExplanation = false

  // PageUp/PageDown still cycle through the enabledModes rotation
  $: modes = [...$settings.enabledModes].sort((a, b) => allModes.indexOf(a) - allModes.indexOf(b))

  const nextMode = () => {
    if (modes.length <= 1) return
    let nextIndex = modes.indexOf(mode) + 1
    if (nextIndex > modes.length - 1) {
      nextIndex = 0
    }
    settings.update('mode', modes[nextIndex])
  }

  const prevMode = () => {
    if (modes.length <= 1) return
    let prevIndex = modes.indexOf(mode) - 1
    if (prevIndex < 0) {
      prevIndex = modes.length - 1
    }
    settings.update('mode', modes[prevIndex])
  }

  const handleKey = (event) => {
    switch (event.code) {
      case 'PageUp':
        prevMode()
        break
      case 'PageDown':
        nextMode()
        break
    }
  }

  document.addEventListener('keydown', handleKey)

  onDestroy(async () => {
    document.removeEventListener('keydown', handleKey)
  })
</script>

<div class="mb-2">
  <div class="ctrl__inner">
    <span>Game Mode</span>
    <select value={mode} on:change={(e) => settings.update('mode', e.target.value)} class="select-item">
      {#each allModes as m (m)}
        <option value={m}>{modeLabels.get(m)}</option>
      {/each}
    </select>
    {#if mode.includes('tally')}
    <div class="tooltip-container" tabindex="0" on:click={() => showTallyExplanation = true}>
      ?
      <div class="tooltip-text">
        Enter the count of matches per<br>
        trial instead of per-stimulus<br>
        keys. Click for details.<br>
      </div>
    </div>
    {/if}
  </div>
</div>

{#if showTallyExplanation}
<div class="cv-popup-backdrop" on:click={() => showTallyExplanation = false}></div>
<div class="cv-popup" style="width: 40vw; min-height: 0; left: 30%; top: 25%;">
  <div class="panel-heading">Tally Modes</div>
  <div class="cv-popup-body">
    <p>Tally mode changes how matches are handled. Instead of pressing a hotkey for every stimulus that matches during a trial, you enter the <em>count</em> of how many stimuli matched.</p>
    <p style="margin-top: 0.5rem;">Because only one input is needed per trial, there&rsquo;s no fixed trial timer. The game advances when you enter a number, and will be as fast as you&rsquo;re able to keep up.</p>
  </div>
  <div class="graph-end-controls">
    <div></div>
    <button class="cv-popup-close" on:click={() => showTallyExplanation = false}>Close</button>
  </div>
</div>
{/if}
