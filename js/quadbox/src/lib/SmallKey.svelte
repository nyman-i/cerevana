<script>
  import { scores } from "../stores/scoreStore"
  import { feedback } from "../stores/feedbackStore"
  import { settings } from "../stores/settingsStore"
  export let field = ''
  export let display = ''
  export let isPlaying = false
  export let checkForMatch
  $: score = $scores[field]
  $: hotkeyField = field === 'image' ? 'shape' : field
</script>

<!-- Compact mobile match button in the N-Back style -->
<button tabindex="-1" class="game-button stimulus-button flex-1 {$settings.theme}-{$feedback[field]} {$feedback[field]}" on:click={() => checkForMatch(field)}>
  {display}
</button>


<style>
.game-button.disabled {
  display: none !important;
}
</style>