<script>
  import { onMount } from "svelte"
  import { getLastMonthGames } from "../lib/gamedb"
  import { settings } from "../stores/settingsStore"
  import { recentGamesState } from "../stores/recentGamesStore"
  import { formatSeconds } from "./utils"

  let games = []

  onMount(async () => {
    games = await getLastMonthGames()
  })

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return $settings.theme === "light" ? "bg-[#307e2c]" : "bg-[#4c8434]"
      case "cancelled":
        return $settings.theme === "light" ? "bg-[#582234]" : "bg-[#8a5264]"
      default:
        return $settings.theme === "light" ? "bg-gray-400" : "bg-gray-700"
    }
  }

  const getStatusClass = (status) => {
    let className = getStatusColor(status)
    className += " text-white py-1 px-2 rounded"
    return className
  }

  // Score tiers on Cerevana's verdict palette (correct/warning/wrong hues)
  const getPercentColor = (percent) => {
    if (percent > 0.7) {
      return $settings.theme === "light" ? "bg-[#307e2c]" : "bg-[#4c8434]"
    } if (percent > 0.6) {
      return $settings.theme === "light" ? "bg-[#5c8f34]" : "bg-[#6f9440]"
    } if (percent > 0.5) {
      return $settings.theme === "light" ? "bg-[#b07d2e]" : "bg-[#a6712c]"
    } else if (percent > 0.4) {
      return $settings.theme === "light" ? "bg-[#a3552e]" : "bg-[#9c5a3a]"
    } else {
      return $settings.theme === "light" ? "bg-[#582234]" : "bg-[#8a5264]"
    }
  }

  const getPercentClass = (percent) => {
    if (percent === undefined) {
      return
    }
    let className = getPercentColor(percent)
    className += ' rounded'
    className += $settings.theme === "light" ? " text-black" : " text-white"
    return className
  }

  const formatPercent = (percent) => {
    if (percent === undefined) {
      return ''
    }
    return (percent * 100).toFixed(0) + '%'
  }

  const getTimeLabel = (timestamp) => {
    const now = new Date()
    const input = new Date(timestamp)

    const shiftMs = 4 * 60 * 60 * 1000  // 3 hours in milliseconds

    const shiftedNow = new Date(now.getTime() - shiftMs)
    const shiftedInput = new Date(input.getTime() - shiftMs)

    const diffMs = now - input
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)

    shiftedNow.setHours(0, 0, 0, 0)
    shiftedInput.setHours(0, 0, 0, 0)
    const diffDay = Math.round((shiftedNow - shiftedInput) / (1000 * 60 * 60 * 24))

    if (diffSec < 60) return "Just now"
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
    if (diffHr < 6)
      return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`

    if (diffDay === 0)
      return `Today at ${input.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    if (diffDay === 1)
      return `1 day ago`

    return `${diffDay} days ago`
  }

  const getGameShortName = (game) => {
    if (game.title.startsWith('tally')) {
      return 'Tally ' + game.nBack
    }
    if (game.title.startsWith('vtally')) {
      return 'VTally ' + game.nBack
    }

    if (!game.title || game.title === 'custom') {
      let tags = game.tags.map(tag => tag === 'shapeColor' ? 'image' : tag)
      let order = ['position', 'color', 'shape', 'audio', 'image']
      tags.sort((a, b) => order.indexOf(a) - order.indexOf(b))
      const prefix = tags.map(tag => tag.charAt(0).toUpperCase()).join('')
      return prefix + game.nBack + 'B'
    }
    return game.title.charAt(0).toUpperCase() + game.nBack + 'B'
  }

  $: filteredGames = $recentGamesState.filter === "completed" ? games.filter(game => game.status === "completed") : games.filter(game => ['completed', 'cancelled'].includes(game.status))
</script>

<table class="table table-auto">
  <thead>
    <tr>
      <th>Date</th>
      <th>Game</th>
      <th class="text-center">Total</th>
      <th class="text-center">Position</th>
      <th class="text-center">Audio</th>
      <th class="text-center">Color</th>
      <th class="text-center">Shape</th>
      <th>Time</th>
      {#if $recentGamesState.filter !== "completed"}
        <th>Status</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each filteredGames as game (game.id)}
      <tr>
        <td>{getTimeLabel(game.timestamp)}</td>
        <td>{getGameShortName(game)}</td>
        <td class="text-center border-r-1 border-[#FFFFFF22]"><span class={'py-1 px-2 ' + getPercentClass(game?.total?.percent)}>{formatPercent(game?.total?.percent)}</span></td>
        <td class="text-center"><span class={'text-sm px-1 ' + getPercentClass(game?.scores?.position?.percent)}>{formatPercent(game?.scores?.position?.percent)}</span></td>
        <td class="text-center"><span class={'text-sm px-1 ' + getPercentClass(game?.scores?.audio?.percent)}>{formatPercent(game?.scores?.audio?.percent)}</span></td>
        <td class="text-center"><span class={'text-sm px-1 ' + getPercentClass(game?.scores?.color?.percent)}>{formatPercent(game?.scores?.color?.percent)}</span></td>
        <td class="text-center"><span class={'text-sm px-1 ' + getPercentClass(game?.scores?.shapeColor?.percent ?? game?.scores?.image?.percent ?? game?.scores?.shape?.percent)}>{formatPercent(game?.scores?.shapeColor?.percent ?? game?.scores?.image?.percent ?? game?.scores?.shape?.percent)}</span></td>
        {#if game.title.startsWith('tally') || game.title.startsWith('vtally')}
          <td>{formatSeconds(game.elapsedSeconds) + ' | ' + (game.total.averageTrialTime / 1000).toFixed(2) + 's/t'}</td>
        {:else}
          <td>{formatSeconds(game.elapsedSeconds)}</td>
        {/if}
        {#if $recentGamesState.filter !== "completed"}
          <td><span class={getStatusClass(game.status)}>{game.status}</span></td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>