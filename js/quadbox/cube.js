/*!
 * Vanilla-DOM renderer for the Quad Box board - port of the vendored
 * Svelte components Grid.svelte / Cell.svelte / Frame.svelte /
 * VisualCrank.svelte (Quad Box by soamsy, MIT - js/quadbox/LICENSE).
 * Rendering only; trial data comes from js/quadbox/engine/ or classic.js.
 * Cerevana extensions: text stimuli (letters/numbers) on faces, a center
 * overlay for position-less modes, and timed multi-position rendering
 * with stream-identity tints (multi-square).
 */
import { createSvgId, findBoxColor, findShapeOuterColor, cacheNextTrial } from './engine/trialUtils.js'
import { getSvgUrl } from './engine/svg.js'
import { seededRandom } from './engine/utils.js'

// Inline so the lattice can inherit the user's accent via currentColor (an <img>
// can't read CSS vars). Same 4 lines + border as the old frame-*.svg; the theme
// hex/opacity split those files carried now lives in css/quadbox.css (.qb-frame).
const FRAME_SVG =
  '<svg class="qb-frame" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">' +
  '<line x1="100" y1="0" x2="100" y2="300"/><line x1="200" y1="0" x2="200" y2="300"/>' +
  '<line x1="0" y1="100" x2="300" y2="100"/><line x1="0" y1="200" x2="300" y2="200"/>' +
  '<rect x="0" y="0" width="300" height="300" fill="none"/></svg>'

// Grid.svelte: rotation start is seeded per 2-hour window
const determineRotationStart = () => {
  const now = Date.now()
  const seed = Math.floor(now / 7200000) * 7200000
  const random = seededRandom(seed)
  return {
    x: (random() * 360).toFixed(2),
    y2: (random() * 360).toFixed(2), // upstream draws z before y
    z: (random() * 360).toFixed(2),
  }
}

const el = (tag, className, parent) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (parent) parent.appendChild(node)
  return node
}

const frameImg = (parent, translate, rotate) => {
  parent.insertAdjacentHTML('beforeend', FRAME_SVG)
  const svg = parent.lastElementChild
  if (translate) svg.style.translate = translate
  if (rotate) svg.style.rotate = rotate
  return svg
}

// Cell.svelte class/style computation, verbatim semantics
const cellClasses = (base, position, svgId, flash, transparent) => {
  const classNames = [base, 'p' + (position ?? '0-0-0')]
  if (svgId && (svgId.includes('-bg-') || svgId.includes('-full_'))) {
    classNames.push('qb-no-padding')
  } else if (svgId && svgId.includes('-big_')) {
    classNames.push('qb-little-padding')
  }
  if (flash) classNames.push('qb-flash')
  if (transparent) classNames.push('qb-see-through')
  return classNames.join(' ')
}

const cellStyle = (node, boxColor, svgId, shapeOuterColor, transparent) => {
  node.style.cssText = ''
  if (boxColor) {
    node.style.setProperty('--face-bg-color', `${boxColor}${transparent ? '3A' : ''}`)
  } else if (shapeOuterColor) {
    node.style.setProperty('--face-bg-color', `${shapeOuterColor}${transparent ? '2A' : ''}`)
  }
  if (svgId) {
    node.style.setProperty('--shape-url', `url('${getSvgUrl(svgId)}')`)
  }
  if (transparent) {
    node.style.setProperty('--face-size', '72%')
  }
}

const MAX_CELLS = 4

// multi-square stream identity: blue, green, yellow, red
const STREAM_COLORS = ['#26f', '#2c2', '#dc2', '#d22']

const setFaceText = (cell, text) => {
  const t = text == null ? '' : String(text)
  cell.querySelectorAll('.qb-face').forEach(f => { if (f.textContent !== t) f.textContent = t })
}

export class BoardRenderer {
  constructor(stage) {
    this.stage = stage
    this.grid = null
    this.theme = 'dark'
    this.cells = []
    this.variableN = el('div', 'qb-variable-n', stage)
    this.variableN.hidden = true
    // center overlay: stimulus display for position-less modes
    this.centerWrap = el('div', 'qb-center-wrap', stage)
    this.centerFace = el('div', 'qb-face', this.centerWrap)
    this.centerWrap.hidden = true
  }

  // (Re)build the board for a grid type + theme + rotation speed.
  build({ grid, theme, rotationSpeed }) {
    this.grid = grid
    this.theme = theme
    this.wrap?.remove()
    this.cells = []

    if (grid === 'visualCrank') {
      this.wrap = el('div', 'qb-crank-wrap', this.stage)
      this.crank = el('div', 'qb-crank', this.wrap)
      for (let i = 0; i < MAX_CELLS; i++) {
        const wrap = el('div', 'qb-vcell-wrap', this.crank)
        const cell = el('div', 'qb-vcell', wrap)
        el('div', 'qb-face', cell)
        cell.hidden = true
        this.cells.push(cell)
      }
    } else if (grid === 'static2D') {
      this.wrap = el('div', 'qb-wrap2d', this.stage)
      this.board = el('div', 'qb-board2d', this.wrap)
      for (let i = 0; i < MAX_CELLS; i++) {
        const cell = el('div', 'qb-cell2d', this.board)
        el('div', 'qb-face', cell)
        cell.hidden = true
        this.cells.push(cell)
      }
      frameImg(this.board)
    } else {
      this.wrap = el('div', 'qb-wrap3d', this.stage)
      this.scene = el('div', 'qb-scene', this.wrap)
      const start = determineRotationStart()
      this.scene.style.setProperty('--rotation-start-x', `${start.x}deg`)
      this.scene.style.setProperty('--rotation-start-z', `${start.z}deg`)
      this.scene.style.setProperty('--rotation-start-y', `${start.y2}deg`)
      this.setRotationSpeed(rotationSpeed)
      for (let i = 0; i < MAX_CELLS; i++) {
        const cell = el('div', 'qb-cell', this.scene)
        for (const face of ['front', 'back', 'right', 'left', 'bottom', 'top']) {
          el('div', `qb-face qb-face--${face}`, cell)
        }
        cell.hidden = true
        this.cells.push(cell)
      }
      // Grid.svelte: 4 planes per axis at ±(scene/2) / ±(cell/2) svmin
      for (const d of ['-25.5svmin', '-8.5svmin', '8.5svmin', '25.5svmin']) {
        frameImg(this.scene, `0 0 ${d}`)
        frameImg(this.scene, `0 ${d} 0`, 'x 90deg')
        frameImg(this.scene, `${d} 0 0`, 'y 90deg')
      }
    }
  }

  setRotationSpeed(rotationSpeed) {
    if (!this.scene) return
    // Grid.svelte: animation-duration = 3400 / rotationSpeed seconds
    const speed = Number(rotationSpeed) || 0
    if (speed <= 0) {
      this.scene.style.animationPlayState = 'paused'
    } else {
      this.scene.style.animationPlayState = 'running'
      this.scene.style.animationDuration = `${(3400 / speed).toFixed(0)}s`
    }
  }

  // Render a trial. settings = full quad-box settings object.
  // `highlight` is undefined for tally renders (cells stay lit by design)
  // and boolean for timed play (stimulus display window).
  renderTrial(trial, settings, { highlight, flash = false } = {}) {
    if (this.grid === 'visualCrank') {
      this.renderCrank(trial, settings)
      return
    }
    const base = this.grid === 'static2D' ? 'qb-cell2d' : 'qb-cell'
    const multi = 'position0' in (trial ?? {})
    const timedMulti = multi && highlight !== undefined
    for (let i = 0; i < MAX_CELLS; i++) {
      const cell = this.cells[i]
      let position, show, transparent = false
      if (multi) {
        position = trial[`position${i}`]
        show = !!position && highlight !== false
        transparent = !timedMulti && !!trial.position1
      } else {
        position = i === 0 ? trial?.position : null
        show = i === 0 && !!position && !!highlight
      }
      if (!show) {
        cell.hidden = true
        continue
      }
      const svgId = createSvgId(trial.shape, trial.color, trial.image, settings)
      const boxColor = findBoxColor(trial.shape, trial.color, trial.image, settings)
      const shapeOuterColor = findShapeOuterColor(trial.color, settings)
      cell.hidden = false
      cell.className = cellClasses(base, position, svgId, multi ? flash : false, transparent)
      cellStyle(cell, boxColor, svgId, shapeOuterColor, transparent)
      if (timedMulti && !boxColor) {
        cell.style.setProperty('--face-bg-color', STREAM_COLORS[i])
      }
      setFaceText(cell, multi ? '' : trial?.text)
    }
    // position-less stimuli (sound-family colors, combo letters, arithmetic)
    const wantCenter = !multi && !trial?.position && !!highlight
      && (trial?.text != null || trial?.color || trial?.shape || trial?.image)
    if (wantCenter) {
      const svgId = createSvgId(trial.shape, trial.color, trial.image, settings)
      cellStyle(this.centerWrap, findBoxColor(trial.shape, trial.color, trial.image, settings),
        svgId, findShapeOuterColor(trial.color, settings), false)
      this.centerFace.textContent = trial.text == null ? '' : String(trial.text)
      this.centerWrap.hidden = false
    } else {
      this.centerWrap.hidden = true
    }
    this.variableN.hidden = !trial?.variableNBack
    if (trial?.variableNBack) this.variableN.textContent = trial.variableNBack
  }

  // VisualCrank.svelte: up to 4 shape/color/image cells on a slow orbit
  renderCrank(trial, settings) {
    const rotationSpeed = settings.rotationSpeed
    if (rotationSpeed > 0 && this.crank) {
      const ticks = Math.floor(2000 / rotationSpeed)
      const angle = ((this._crankIndex ?? 0) % ticks) * 2 * Math.PI / ticks
      const radius = 7
      this.crank.style.transform =
        `translate(${Math.cos(angle) * radius}svmin, ${Math.sin(angle) * radius}svmin)`
    }
    for (let i = 0; i < MAX_CELLS; i++) {
      const cell = this.cells[i]
      const has = `shape${i}` in (trial ?? {}) || `color${i}` in (trial ?? {}) || `image${i}` in (trial ?? {})
      if (!has) {
        cell.hidden = true
        continue
      }
      const shape = trial[`shape${i}`]
      const color = trial[`color${i}`]
      const image = trial[`image${i}`]
      const svgId = createSvgId(shape, color, image, settings)
      cell.hidden = false
      cell.className = cellClasses('qb-vcell', '0', svgId, false, false)
      cellStyle(cell, findBoxColor(shape, color, image, settings), svgId, findShapeOuterColor(color, settings), false)
    }
  }

  setCrankIndex(i) {
    this._crankIndex = i
  }

  // Pre-generate the next trial's art off the hot path (trialUtils)
  cacheNext(nextTrial, settings) {
    if (!nextTrial) return
    if (this.grid === 'visualCrank') {
      for (let i = 0; i < MAX_CELLS; i++) {
        if (`shape${i}` in nextTrial || `color${i}` in nextTrial || `image${i}` in nextTrial) {
          cacheNextTrial({ shape: nextTrial[`shape${i}`], color: nextTrial[`color${i}`], image: nextTrial[`image${i}`] }, settings)
        }
      }
    } else {
      cacheNextTrial(nextTrial, settings)
    }
  }

  clear() {
    this.cells.forEach(c => { c.hidden = true; setFaceText(c, '') })
    this.variableN.hidden = true
    this.centerWrap.hidden = true
  }
}
