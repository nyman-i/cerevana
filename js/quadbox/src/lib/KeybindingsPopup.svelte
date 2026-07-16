<script>
  import Keybindings from "./Keybindings.svelte"
  let show = false
  const openModal = async () => {
    show = true
  }

  const closeModal = () => {
    show = false
  }

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal()
  }

  const handleBackdropClick = (event) => {
    event.stopPropagation()
    if (event.target.classList.contains('modal')) closeModal()
  }
</script>

<button class="cv-button" on:click={openModal}>
  Keybindings
</button>


{#if show}
  <div class="cv-popup-backdrop" on:click={closeModal}></div>
  <div class="cv-popup" style="width: 40vw; min-height: 0; left: 30%; top: 20%;" on:keydown={handleKeydown} tabindex="0">
    <div class="panel-heading">Keybindings</div>
    <div class="cv-popup-body">
      <Keybindings />
      <div class="grid grid-cols-2 gap-2 mt-4">
        <div><strong>Space:</strong> Start Game</div>
        <div><strong>Esc:</strong> End Game</div>
        <div><strong>PgDown:</strong> Next Mode</div>
        <div><strong>PgUp:</strong> Previous Mode</div>
      </div>
    </div>
    <div class="graph-end-controls">
      <div></div>
      <button class="cv-popup-close" on:click={closeModal}>Close</button>
    </div>
  </div>
{/if}