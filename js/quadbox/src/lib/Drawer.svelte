<script>
import { onMount } from 'svelte'
import { get } from 'svelte/store'
import { settings } from '../stores/settingsStore'
import { gameSettings } from '../stores/gameSettingsStore'
import { scores } from '../stores/scoreStore'
import { analytics } from '../stores/analyticsStore'
import { mobile } from '../stores/mobileStore'
import { autoProgression } from '../stores/autoProgressionStore'
import { isPlaying, title } from "../stores/gameRunningStore"
import GameSettings from './GameSettings.svelte'
import ModeSwapper from './ModeSwapper.svelte'
import ChartPopup from "./ChartPopup.svelte"
import KeybindingsPopup from "./KeybindingsPopup.svelte"
import InfoPopup from './InfoPopup.svelte'
import { panelRequest } from '../stores/panelRequestStore'

let open = false
const toggle = () => open = !open
const close = () => open = false

let drawerRef

const unsubPanel = panelRequest.subscribe(r => {
  if (r?.panel === 'settings') toggle()
})

// Tell the Cerevana host when the drawer is open so it can fade its
// corner tabs out of the way (same-origin embed).
$: window.parent !== window && window.parent.postMessage({ cerevana: 'panelState', panel: 'settings', open }, '*')

const handleClickOutside = (event) => {
  if (open && !drawerRef.contains(event.target)) {
    close()
  }
}

const updateSuccessCriteria = (value) => {
  if (isNaN(value) || value < 0 || 100 < value) return
  settings.update('successCriteria', value)
  if ($settings.failureCriteria > value) {
    settings.update('failureCriteria', value)
  }
}

const updateFailureCriteria = (value) => {
  if (isNaN(value) || value < 0 || 100 < value) return
  settings.update('failureCriteria', value)
  if ($settings.successCriteria < value) {
    settings.update('successCriteria', value)
  }
}

const updateCombo = (field, value) => {
  if (isNaN(value) || value < 1 || 9 < value) return
  settings.update(field, value)
}

const updateRotationSpeed = (value) => {
  if (isNaN(value) || value < 0 || 999 < value) return
  settings.update('rotationSpeed', value)
}

const getPositionWidthDisplay = () => {
  if (!$settings.mode === 'tally') {
    return '1'
  }

  const gs =  get(gameSettings)
  const sequence = gs.positionWidthSequence
  return $gameSettings.enablePositionWidthSequence
    ? sequence.slice(0, $gameSettings.nBack).join(',')
    : $gameSettings.positionWidth
}

onMount(() => {
  document.addEventListener('click', handleClickOutside)
  return () => {
    document.removeEventListener('click', handleClickOutside)
    unsubPanel()
  }
})

</script>

<div class="relative flex flex-col h-svh overflow-hidden">
  <div class="hud-strip font-hud select-none whitespace-nowrap max-w-[92svw] overflow-hidden"
    class:text-2xl={$mobile}
    class:advance={$autoProgression.advance}
    class:fallback={$autoProgression.fallback}>
    <div>N {$gameSettings.rules === 'variable' ? '≤' : '='} {$gameSettings.nBack}</div>
    {#if $settings.mode === 'tally'}
    <div>W = {getPositionWidthDisplay()}</div>
    {/if}
    <div>{$title.toUpperCase()}</div>
    {#if $scores.total && $mobile}
      <div>{($scores.total.percent * 100).toFixed(0)}%</div>
      {#if $scores.total.averageTrialTime}
        <div>{($scores.total.averageTrialTime / 1000).toFixed(2)}s/t</div>
      {/if}
    {/if}
    {#if $scores.total && !$isPlaying && !$mobile}
      <div>Last: {($scores.total.percent * 100).toFixed(0)}%</div>
      {#if $scores.total.averageTrialTime}
        <div>{($scores.total.averageTrialTime / 1000).toFixed(2)}s/t</div>
      {/if}
    {/if}
    {#if !$isPlaying && !$mobile && $analytics.playTime}
    <div>Today: {$analytics.playTime}</div>
    {/if}
  </div>
  <span><InfoPopup /><ChartPopup /></span>

  <div class="flex-auto flex relative overflow-x-hidden w-fit duration-0">
    <nav
      bind:this={drawerRef}
      class="offcanvas-skin absolute top-0 left-0 h-full w-86 sm:w-80 flex transform transition-transform duration-150 z-50"
      class:-translate-x-86={!open} class:sm:-translate-x-80={!open}
      >
      <div class="offcanvas-body">
        <div class="mb-1"></div>
        <div class="mb-05 panel-heading">Mode</div>
        <ModeSwapper />
        <div class="mb-05 panel-heading">Session</div>
        <GameSettings />
        <hr class="cv-divider">
        <div class="mb-05 panel-heading">Display</div>
        <div class="mb-2">
          <div class="ctrl__inner">
            <span>Feedback</span>
            <select bind:value={$settings.feedback} id="feedback-select" class="select-item">
              <option value="show">Show</option>
              <option value="hide">Hide</option>
              <option value="hide-counter">Hide counter only</option>
            </select>
          </div>
        </div>
        {#if $settings.mode !== 'vtally'}
        <div class="mb-2">
          <div class="inline-input__outer">
            Rotation speed
            <span class="inline-input__inner">
              <input type="number" min="0" max="999" step="1" value={$settings.rotationSpeed} on:input={(e) => updateRotationSpeed(+e.target.value)} style="width: 5ch">
            </span>
          </div>
        </div>
        {/if}
        {#if $settings.mode !== 'tally' && $settings.mode !== 'vtally'}
        <hr class="cv-divider">
        <div class="mb-05 panel-heading">Progression</div>
        <div class="mb-1">
          <div class="ctrl__inner">
            <div>
              <input hidden id="enable-auto-progression" type="checkbox" bind:checked={$settings.enableAutoProgression}>
              <label class="switch" for="enable-auto-progression"></label>
            </div>
            <label for="enable-auto-progression">Auto Progression</label>
            <div class="tooltip-container" tabindex="0">
              ?
              <div class="tooltip-text">
                Raises or lowers N based on<br>
                your recent scores.<br>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-2">
          <div class="inline-input__outer">
            Advance at
            <span class="inline-input__inner">
              <input disabled={!$settings.enableAutoProgression} type="number" min="0" max="100" step="1" value={$settings.successCriteria} on:input={(e) => updateSuccessCriteria(+e.target.value)} style="width: 5ch">%
            </span>
          </div>
        </div>
        <div class="mb-2">
          <div class="inline-input__outer">
            Win after
            <span class="inline-input__inner">
              <input disabled={!$settings.enableAutoProgression} type="number" min="1" max="9" step="1" value={$settings.successComboRequired} on:input={(e) => updateCombo('successComboRequired', +e.target.value)} style="width: 4ch">in a row
            </span>
          </div>
        </div>
        <div class="mb-2">
          <div class="inline-input__outer">
            Drop below
            <span class="inline-input__inner">
              <input disabled={!$settings.enableAutoProgression} type="number" min="0" max="100" step="1" value={$settings.failureCriteria} on:input={(e) => updateFailureCriteria(+e.target.value)} style="width: 5ch">%
            </span>
          </div>
        </div>
        <div class="mb-2">
          <div class="inline-input__outer">
            Lose after
            <span class="inline-input__inner">
              <input disabled={!$settings.enableAutoProgression} type="number" min="1" max="9" step="1" value={$settings.failureComboRequired} on:input={(e) => updateCombo('failureComboRequired', +e.target.value)} style="width: 4ch">in a row
            </span>
          </div>
        </div>
        {/if}
        <hr class="cv-divider">
        <KeybindingsPopup />
        <div class="my-10"></div>
      </div>
      <div class="offcanvas-side">
        <label class="offcanvas-close" on:click={close} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()} tabindex="0" title="Close settings">✕</label>
      </div>
    </nav>

    <div class="relative w-screen h-full transition-transform duration-150">
      <slot />
    </div>
  </div>
</div>
