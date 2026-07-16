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

<!-- Compact one-liner like N-Back's match buttons ("Position (A)") -->
<button tabindex="-1" disabled={$feedback[field] === 'disabled'} class="game-button-lg stimulus-button {$settings.theme}-{$feedback[field]}" on:click={() => checkForMatch(field)}>
  {display} ({$settings.hotkeys[hotkeyField]})
</button>