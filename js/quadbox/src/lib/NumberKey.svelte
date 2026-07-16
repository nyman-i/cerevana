<script>
  import { tallyFeedback } from "../stores/tallyFeedbackStore"
  import { settings } from "../stores/settingsStore"
  export let count = 0
  export let handleCount
  $: className = $settings.theme + '-' + $tallyFeedback[count]
</script>

<!-- Compact tally count key in the N-Back style -->
<button class="game-button qb-number-key {className}" on:click={() => handleCount(count)}>
  <slot></slot>
</button>


<style>
.game-button.disabled {
  display: none !important;
}
</style>
