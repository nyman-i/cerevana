<script>
  import { gameSettings } from "../stores/gameSettingsStore"
  import { settings } from "../stores/settingsStore"

  const clampNumber = (field, min, value, max) => {
    if (isNaN(value) || value < min || max < value) {
      return
    }
    gameSettings.setField(field, value)
  }

  const toggleShapeOrColor = (event, field) => {
    gameSettings.setField(field, event.target.checked)
    if (event.target.value) {
      gameSettings.setField('enableImage', false)
    }
  }

  const toggleShapeAndColor = (event) => {
    gameSettings.setField('enableImage', event.target.checked)
    if (event.target.value) {
      gameSettings.setField('enableShape', false)
      gameSettings.setField('enableColor', false)
    }
  }

  const toggleVariableNBack = (event) => {
    if (event.target.checked) {
      gameSettings.setField('rules', 'variable')
    } else {
      gameSettings.setField('rules', 'none')
    }
  }

  const updatePositionWidthSequence = (width, value) => {
    if (isNaN(value) || value < 1 || 4 < value) {
      return
    }
    const positionWidthSequence = [...$gameSettings.positionWidthSequence]
    positionWidthSequence[width] = value
    gameSettings.setField('positionWidthSequence', positionWidthSequence)
  }

  const range = (n) => Array.from({ length: n }, (_, i) => i)

  const audioOptions = new Map([
    ['letters2','Letters M1'],
    ['letters3','Letters M2'],
    ['letters5','Letters F1'],
    ['letters4','Letters F2'],
    ['letters','Letters F3'],
    ['numbers','Numbers'],
    ['nato','NATO'],
    ['syl5','5 syllables'],
    ['syl10','10 syllables'],
  ])
  const shapeOptions = new Map([
    ['basic', 'Basic'],
    ['tetris', 'Tetris'],
    ['iconsA', 'Icons A'],
    ['iconsB', 'Icons B'],
    ['all', 'All Shapes'],
  ])
  const colorOptions = new Map([
    ['basic','Basic'],
    ['gradient','Gradient'],
    ['voronoi','Voronoi'],
    ['generative','Generative Art'],
  ])
</script>

<div class="mb-2">
  <div class="inline-input__outer">
    N-Back
    <span class="inline-input__inner">
      <input type="number" min="1" max="12" step="1" value={$gameSettings.nBack} on:input={(e) => clampNumber('nBack', 1, +e.target.value, 12)} style="width: 5ch">
    </span>
  </div>
</div>
{#if $settings.mode !== 'tally' && $settings.mode !== 'vtally'}
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="variable-nback" type="checkbox" checked={$gameSettings.rules === 'variable'} on:change={toggleVariableNBack}>
      <label class="switch" for="variable-nback"></label>
    </div>
    <label for="variable-nback">Variable N-Back</label>
    <div class="tooltip-container" tabindex="0">
      ?
      <div class="tooltip-text">
        Makes N change randomly<br>
        each trial.<br>
      </div>
    </div>
  </div>
</div>
{/if}
{#if 'trialTime' in $gameSettings}
<div class="mb-2">
  <div class="inline-input__outer">
    Trial time
    <span class="inline-input__inner">
      <input type="number" min="1000" max="5000" step="100" value={$gameSettings.trialTime} on:input={(e) => clampNumber('trialTime', 1000, +e.target.value, 5000)} style="width: 7ch">ms
    </span>
  </div>
</div>
{/if}
<div class="mb-2">
  <div class="inline-input__outer">
    Num trials
    <span class="inline-input__inner">
      <input type="number" min="10" max="999" step="1" value={$gameSettings.numTrials} on:input={(e) => clampNumber('numTrials', 10, +e.target.value, 999)} style="width: 6ch">
    </span>
  </div>
</div>
<div class="mb-2">
  <div class="inline-input__outer">
    <span class="ctrl__inner">Match chance
      <div class="tooltip-container" tabindex="0">
        ?
        <div class="tooltip-text">
          Chance of a stimulus from<br>
          n trials ago repeating.<br>
        </div>
      </div>
    </span>
    <span class="inline-input__inner">
      <input type="number" min="5" max="75" step="1" value={$gameSettings.matchChance} on:input={(e) => clampNumber('matchChance', 5, +e.target.value, 75)} style="width: 5ch">%
    </span>
  </div>
</div>
<div class="mb-2">
  <div class="inline-input__outer">
    <span class="ctrl__inner">Interference
      <div class="tooltip-container" tabindex="0">
        ?
        <div class="tooltip-text">
          Chance of using repeats from<br>
          n&plusmn;1 trials ago. Increases<br>
          difficulty.<br>
        </div>
      </div>
    </span>
    <span class="inline-input__inner">
      <input type="number" min="0" max="75" step="1" value={$gameSettings.interference} on:input={(e) => clampNumber('interference', 0, +e.target.value, 75)} style="width: 5ch">%
    </span>
  </div>
</div>
{#if $settings.mode !== 'vtally'}
<div class="mb-2">
  <div class="ctrl__inner">
    <span>Grid</span>
    <select bind:value={$gameSettings.grid} class="select-item">
      <option value="rotate3D">3D (rotating cube)</option>
      <option value="static2D">2D (static)</option>
    </select>
  </div>
</div>
{/if}
{#if $settings.mode === 'tally' || $settings.mode === 'vtally'}
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="enable-position-width-sequence" type="checkbox" bind:checked={$gameSettings.enablePositionWidthSequence}>
      <label class="switch" for="enable-position-width-sequence"></label>
    </div>
    <label for="enable-position-width-sequence">Define {$settings.mode === 'vtally' ? 'visual' : 'position'} chain</label>
  </div>
</div>
{#if $gameSettings.enablePositionWidthSequence}
  {#each range($gameSettings.nBack) as width (width)}
  <div class="mb-1" style="margin-left: 2rem;">
    <div class="inline-input__outer">
      W{width + 1}
      <span class="inline-input__inner">
        <input type="number" min="1" max="4" step="1" value={$gameSettings.positionWidthSequence[width]} on:input={(e) => updatePositionWidthSequence(width, +e.target.value)} style="width: 4ch">
      </span>
    </div>
  </div>
  {/each}
{:else}
<div class="mb-2">
  <div class="inline-input__outer">
    Concurrent {$settings.mode === 'vtally' ? 'visuals' : 'positions'}
    <span class="inline-input__inner">
      <input type="number" min="1" max="4" step="1" value={$gameSettings.positionWidth} on:input={(e) => clampNumber('positionWidth', 1, +e.target.value, 4)} style="width: 4ch">
    </span>
  </div>
</div>
{/if}
{/if}
<div class="mb-05 panel-heading">Stimuli</div>
{#if $settings.mode.startsWith('custom') || $settings.mode === 'tally' || $settings.mode === 'vtally'}
{#if $settings.mode !== 'vtally'}
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="enable-audio" type="checkbox" bind:checked={$gameSettings.enableAudio}>
      <label class="switch" for="enable-audio"></label>
    </div>
    <label for="enable-audio">Audio</label>
    <select bind:value={$gameSettings.audioSource} class="select-item">
      {#each audioOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
{/if}
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="enable-color" type="checkbox" checked={$gameSettings.enableColor} on:input={(e) => toggleShapeOrColor(e, 'enableColor')}>
      <label class="switch" for="enable-color"></label>
    </div>
    <label for="enable-color">Color</label>
    <select bind:value={$gameSettings.colorSource} class="select-item">
      {#each colorOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="enable-shape" type="checkbox" checked={$gameSettings.enableShape} on:input={(e) => toggleShapeOrColor(e, 'enableShape')}>
      <label class="switch" for="enable-shape"></label>
    </div>
    <label for="enable-shape">Shape</label>
    <select bind:value={$gameSettings.shapeSource} class="select-item">
      {#each shapeOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
<div class="mb-1">
  <div class="ctrl__inner">
    <div>
      <input hidden id="enable-shape-color" type="checkbox" checked={$gameSettings.enableImage} on:input={(e) => toggleShapeAndColor(e)}>
      <label class="switch" for="enable-shape-color"></label>
    </div>
    <label for="enable-shape-color">Image</label>
    <select bind:value={$gameSettings.imageSource} class="select-item">
      <option value="voronoi">Voronoi</option>
      <option value="generative">Generative Art</option>
    </select>
  </div>
</div>
{:else}
<div class="mb-2">
  <div class="ctrl__inner">
    <span>Audio</span>
    <select bind:value={$gameSettings.audioSource} id="audio-select" class="select-item">
      {#each audioOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
{/if}

{#if $settings.mode === 'quad'}
<div class="mb-2">
  <div class="ctrl__inner">
    <span>Color</span>
    <select bind:value={$gameSettings.colorSource} class="select-item">
      {#each colorOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
<div class="mb-2">
  <div class="ctrl__inner">
    <span>Shape</span>
    <select bind:value={$gameSettings.shapeSource} class="select-item">
      {#each shapeOptions as [id, description] (id)}
        <option value={id}>{description}</option>
      {/each}
    </select>
  </div>
</div>
{/if}
