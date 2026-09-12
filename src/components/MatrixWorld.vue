<script setup lang="ts">
/**
 * A pseudo-3D "Matrix" digital-rain world rendered around and blended into a source image.
 *
 * There's no real depth data for an arbitrary photo, and no WebGL here — this is a canvas-2D
 * approximation, deliberately built around a few tricks that make a flat scene read as having
 * depth:
 *
 * 1. Perspective projection (`project()`): every particle lives in a "world" x/y/z, and gets
 *    projected to screen space with `scale = focalLength / (focalLength + z)`, the standard
 *    pinhole-camera approximation. Farther particles (larger z) end up smaller, dimmer, and
 *    closer to the vanishing point.
 * 2. Six conceptual planes (background / midground / floor / left+right wall / foreground),
 *    each with different motion: "falling" planes move down in world-y at a fixed depth;
 *    "approaching" planes (floor, walls) instead move in z toward the camera, which is what
 *    actually reads as a receding floor/corridor once projected.
 * 3. Draw order does the occlusion work a real z-buffer would: far planes are drawn first with
 *    an additive blend (so they read as glow sitting *in* the scene rather than paint on top),
 *    the image sits in the middle, and the sparse foreground plane is drawn last with normal
 *    compositing so it can genuinely cover part of the photo.
 * 4. A static radial "depth field" keyed to the vanishing point (no per-frame image analysis)
 *    dims particles near the middle of the frame, so a face/subject there stays legible while
 *    the code thickens toward the edges.
 */
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useReducedMotion } from '@/composables/useReducedMotion'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    /** Master switch for the code layer — 0 fades to the plain photo, >0 fades it in. Toggling
     * this smoothly dissolves in/out rather than reshuffling particles; it doesn't change how
     * many particles exist, only how visible the (fixed-size) field currently is. */
    intensity?: number
    speed?: number
    /** Strength of the code's glow/blend over the photo, independent of particle density. */
    opacity?: number
    fontSize?: number
    color?: string
    /** Scales how far the background/floor/walls extend and how close the foreground gets. */
    depth?: number
    /** Scales perspective convergence — higher reads as a more dramatic, wide-angle depth. */
    perspective?: number
    vanishingPointX?: number
    vanishingPointY?: number
    interactive?: boolean
  }>(),
  {
    alt: '',
    intensity: 1,
    speed: 1,
    opacity: 0.85,
    fontSize: 14,
    color: '#00ff66',
    depth: 1,
    perspective: 1,
    vanishingPointX: 0.5,
    vanishingPointY: 0.42,
    interactive: true,
  },
)

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const wrapperRef = useTemplateRef<HTMLDivElement>('wrapper')
const reducedMotion = useReducedMotion()

const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789:・."=+-*<>'
function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]!
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0')
  const value = parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function mix(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

const baseColor = computed(() => hexToRgb(props.color))
const headColor = computed(() => mix(baseColor.value, { r: 255, g: 255, b: 255 }, 0.78))
const dimColor = computed(() => mix(baseColor.value, { r: 0, g: 0, b: 0 }, 0.55))

function rgbaOf(c: { r: number; g: number; b: number }, a: number) {
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** t=0 is the freshly-typed head, t=1 is the far end of the trail — matches the classic
 * bright-head/dim-green-tail Matrix look. */
function sampleTrail(t: number) {
  if (t < 0.12) return mix(headColor.value, baseColor.value, t / 0.12)
  if (t < 0.55) return mix(baseColor.value, baseColor.value, 0)
  return mix(baseColor.value, dimColor.value, (t - 0.55) / 0.45)
}

// ---------------------------------------------------------------------------------------------
// Scene state
// ---------------------------------------------------------------------------------------------

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let dpr = 1

let sourceImage: HTMLImageElement | null = null
let imageReady = false

interface FallingStream {
  wx: number
  wy: number
  z: number
  speed: number
  tail: number
  jitter: number
}

interface ApproachStream {
  fixed: number // world position on the plane's fixed axis (wall: x offset, floor: y offset)
  free: number // world position on the plane's free axis (wall: y, floor: x)
  z: number
  speed: number
  tail: number
}

let background: FallingStream[] = []
let midground: FallingStream[] = []
let foreground: FallingStream[] = []
let floor: ApproachStream[] = []
let wallLeft: ApproachStream[] = []
let wallRight: ApproachStream[] = []

let worldW = 0
let worldH = 0
let zFar = 0
let zMid = 0
let zNear = 0

const camera = { x: 0, y: 0, driftT: 0 }
const pointer = { x: 0, y: 0, active: false }

// How much of the code layer to show, eased toward `intensity > 0 ? 1 : 0` each frame — this is
// what makes hover on/off read as a smooth dissolve instead of the particle field popping in.
let codeIntro = 0

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function makeFalling(count: number, zMin: number, zMax: number, speedMin: number, speedMax: number, tailMin: number, tailMax: number): FallingStream[] {
  return Array.from({ length: count }, () => ({
    wx: rand(-worldW / 2, worldW / 2),
    wy: rand(-worldH / 2, worldH / 2),
    z: rand(zMin, zMax),
    speed: rand(speedMin, speedMax),
    tail: Math.round(rand(tailMin, tailMax)),
    jitter: Math.random() * 1000,
  }))
}

function makeApproach(count: number, freeMin: number, freeMax: number, fixed: number): ApproachStream[] {
  return Array.from({ length: count }, () => ({
    fixed: fixed * rand(0.85, 1.15),
    free: rand(freeMin, freeMax),
    z: rand(zMid, zFar),
    speed: rand(0.55, 1.35),
    tail: Math.round(rand(3, 5)),
  }))
}

function buildScene() {
  worldW = width * 1.6
  worldH = height * 1.6
  zFar = 700 * props.depth
  zMid = 320 * props.depth
  zNear = 80 * props.depth

  // Particle *count* is fixed once built (scaled only by the canvas's own area, so a small
  // card on mobile doesn't get the same count as a large desktop panel) — `intensity` instead
  // controls how visible that fixed field is via `codeIntro`, so toggling it on hover fades
  // the code in/out rather than reshuffling every particle's position each time.
  const d = Math.min(1.6, Math.max(0.35, (width * height) / (420 * 520)))

  background = makeFalling(Math.round(38 * d), zMid, zFar, 0.15, 0.35, 4, 6)
  midground = makeFalling(Math.round(34 * d), zNear * 1.8, zMid, 0.35, 0.65, 5, 8)
  foreground = makeFalling(Math.round(10 * d), zNear * 0.4, zNear, 0.7, 1.1, 5, 8)
  floor = makeApproach(Math.round(36 * d), -worldW * 0.6, worldW * 0.6, worldH * 0.42)
  wallLeft = makeApproach(Math.round(18 * d), -worldH * 0.5, worldH * 0.5, -worldW * 0.5)
  wallRight = makeApproach(Math.round(18 * d), -worldH * 0.5, worldH * 0.5, worldW * 0.5)
}

// ---------------------------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------------------------

const focalLength = computed(() => 260 / Math.max(0.15, props.perspective))

function project(wx: number, wy: number, z: number) {
  const scale = focalLength.value / (focalLength.value + Math.max(1, z))
  const vpX = props.vanishingPointX * width
  const vpY = props.vanishingPointY * height
  return {
    x: vpX + (wx + camera.x) * scale,
    y: vpY + (wy + camera.y) * scale,
    scale,
  }
}

/** Static radial field around the vanishing point — 0 there, ~1 toward the corners. Used to
 * keep a subject near the frame's focal point legible while the code thickens at the edges. */
function edgeField(nx: number, ny: number) {
  const dx = nx - props.vanishingPointX
  const dy = ny - props.vanishingPointY
  return Math.min(1, Math.hypot(dx, dy) * 1.5)
}

/** Boosts a base alpha so far/dim glyphs are still legible against 'lighter' blending onto a
 * mid-brightness photo — plain linear alpha reads as near-invisible at these scales. */
function punch(alpha: number) {
  return Math.min(1, Math.pow(Math.max(0, alpha), 0.6) * 1.15)
}

// ---------------------------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------------------------

function updateFalling(list: FallingStream[], dt: number) {
  for (const s of list) {
    s.wy += s.speed * props.speed * dt * 60
    if (s.wy > worldH / 2) {
      s.wy = -worldH / 2 - Math.random() * worldH * 0.2
      s.wx = rand(-worldW / 2, worldW / 2)
    }
  }
}

function updateApproach(list: ApproachStream[], dt: number) {
  for (const s of list) {
    s.z -= s.speed * props.speed * dt * 220
    if (s.z < zNear * 0.3) {
      s.z = zFar
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------------------------

function drawGlyphAt(x: number, y: number, size: number, alpha: number, color: { r: number; g: number; b: number }, glow: number) {
  if (alpha <= 0.012 || size < 1.5) return
  const c = ctx!
  if (glow > 0) {
    c.shadowColor = rgbaOf(baseColor.value, Math.min(1, alpha + 0.2))
    c.shadowBlur = glow
  } else {
    c.shadowBlur = 0
  }
  c.font = `600 ${size.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`
  c.fillStyle = rgbaOf(color, alpha)
  c.fillText(randomChar(), x, y)
}

function drawFalling(list: FallingStream[], glow: number, opacityMul: number, edgeAware: boolean) {
  const spacing = props.fontSize * 1.05
  for (const s of list) {
    for (let i = 0; i < s.tail; i++) {
      const wy = s.wy - i * spacing
      const p = project(s.wx, wy, s.z)
      if (p.y < -40 || p.y > height + 40 || p.x < -40 || p.x > width + 40) continue

      const t = i / Math.max(1, s.tail - 1)
      const color = sampleTrail(t)
      let alpha = (1 - t * 0.7) * p.scale * props.opacity * opacityMul
      if (edgeAware) {
        const nx = p.x / width
        const ny = p.y / height
        alpha *= 0.5 + edgeField(nx, ny) * 0.7
      }
      drawGlyphAt(p.x, p.y, props.fontSize * p.scale, punch(alpha), color, i === 0 ? glow : 0)
    }
  }
}

function drawFloor(list: ApproachStream[]) {
  const zStep = 90 * props.depth
  for (const s of list) {
    for (let i = 0; i < s.tail; i++) {
      const z = s.z + i * zStep
      const p = project(s.free, s.fixed, z)
      if (p.y < -20 || p.y > height + 20 || p.x < -40 || p.x > width + 40) continue

      const closeness = 1 - Math.min(1, z / zFar)
      const t = i / Math.max(1, s.tail - 1)
      const color = sampleTrail(Math.min(1, t + (1 - closeness) * 0.4))
      const alpha = (0.3 + closeness * 0.9) * p.scale * props.opacity * (1 - t * 0.4)
      drawGlyphAt(p.x, p.y, props.fontSize * p.scale, punch(alpha), color, 0)
    }
  }
}

function drawWall(list: ApproachStream[]) {
  const zStep = 70 * props.depth
  for (const s of list) {
    for (let i = 0; i < s.tail; i++) {
      const z = s.z + i * zStep
      const p = project(s.fixed, s.free, z)
      if (p.y < -20 || p.y > height + 20 || p.x < -40 || p.x > width + 40) continue

      const closeness = 1 - Math.min(1, z / zFar)
      const t = i / Math.max(1, s.tail - 1)
      const color = sampleTrail(Math.min(1, t + (1 - closeness) * 0.4))
      const alpha = (0.25 + closeness * 0.75) * p.scale * props.opacity * (1 - t * 0.4)
      drawGlyphAt(p.x, p.y, props.fontSize * p.scale, punch(alpha), color, 0)
    }
  }
}

/** Cover-fit + top-align, matching the CSS `object-cover object-top` a plain `<img>` would use. */
function drawImage(elapsed: number) {
  if (!ctx || !sourceImage || !imageReady) return
  const c = ctx

  const scale = Math.max(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight)
  const dw = sourceImage.naturalWidth * scale
  const dh = sourceImage.naturalHeight * scale
  const dx = (width - dw) / 2 + camera.x * 0.05 * codeIntro
  const dy = camera.y * 0.05 * codeIntro

  // Interpolate toward the "moody" grade as the code layer fades in, so the resting (unhovered)
  // photo looks like a plain, untouched photo rather than always slightly darkened. The dip in
  // brightness matters more than it might seem: on 'lighter'/additive blending, green glyphs
  // only read clearly against a darkened backdrop — on the unmodified photo they wash out.
  const moodFilter = `brightness(${(1 - 0.35 * codeIntro).toFixed(3)}) contrast(${(1 + 0.2 * codeIntro).toFixed(3)}) saturate(${(1 - 0.25 * codeIntro).toFixed(3)})`

  c.save()
  c.filter = moodFilter
  c.drawImage(sourceImage, dx, dy, dw, dh)
  c.restore()

  // Cheap chromatic-aberration stand-in: two colour-tinted, sub-pixel-offset copies blended
  // additively. Kept faint — this should read as a lens artefact, not a glitch.
  if (codeIntro > 0.01) {
    c.save()
    c.globalCompositeOperation = 'lighter'
    c.filter = moodFilter
    c.globalAlpha = 0.05 * codeIntro
    c.drawImage(sourceImage, dx - 1, dy, dw, dh)
    c.globalAlpha = 0.04 * codeIntro
    c.drawImage(sourceImage, dx + 1, dy, dw, dh)
    c.restore()

    // Faint green light contamination from the surrounding "simulation".
    c.save()
    c.globalCompositeOperation = 'overlay'
    c.fillStyle = rgbaOf(baseColor.value, (0.08 + Math.sin(elapsed / 900) * 0.015) * codeIntro)
    c.fillRect(0, 0, width, height)
    c.restore()
  }
}

function drawNoiseAndFlicker(elapsed: number) {
  if (!ctx || codeIntro <= 0.01) return
  const c = ctx

  // Sparse digital grain.
  c.save()
  c.globalCompositeOperation = 'screen'
  c.fillStyle = rgbaOf(baseColor.value, 0.5)
  const dots = Math.round(30 * Math.min(1.5, (width * height) / (420 * 520)))
  for (let i = 0; i < dots; i++) {
    if (Math.random() > 0.4) continue
    c.globalAlpha = Math.random() * 0.12
    c.fillRect(Math.random() * width, Math.random() * height, 1, 1)
  }
  c.restore()

  // A very occasional, very brief brightness dip — never a visible "jump".
  const flicker = Math.random() < 0.01 ? 0.9 : 1
  if (flicker < 1) {
    c.save()
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = `rgba(4,6,5,${(1 - flicker) * 0.5})`
    c.fillRect(0, 0, width, height)
    c.restore()
  }
  void elapsed
}

function render(elapsed: number) {
  if (!ctx) return
  const c = ctx
  c.clearRect(0, 0, width, height)

  drawImage(elapsed)

  if (codeIntro > 0.01) {
    c.save()
    c.globalAlpha = codeIntro
    c.globalCompositeOperation = 'lighter'
    drawFalling(background, 2, 0.8, true)
    drawWall(wallLeft)
    drawWall(wallRight)
    drawFloor(floor)
    drawFalling(midground, 4, 1.05, true)

    c.globalCompositeOperation = 'source-over'
    drawFalling(foreground, 11, 1.2, false)

    drawNoiseAndFlicker(elapsed)
    c.restore()
  }

  c.globalCompositeOperation = 'source-over'
  c.shadowBlur = 0
}

// ---------------------------------------------------------------------------------------------
// Lifecycle / loop
// ---------------------------------------------------------------------------------------------

let frameId = 0
let lastTime = 0
let visible = true
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  width = Math.max(1, rect.width)
  height = Math.max(1, rect.height)
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildScene()
}

function frame(time: number) {
  const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0
  lastTime = time

  camera.driftT += dt
  const driftX = Math.sin(camera.driftT * 0.13) * 6
  const driftY = Math.cos(camera.driftT * 0.1) * 4
  const pointerPull = props.interactive && pointer.active ? 0.5 : 0
  camera.x += ((driftX + pointer.x * 10 * pointerPull) - camera.x) * Math.min(1, dt * 2)
  camera.y += ((driftY + pointer.y * 8 * pointerPull) - camera.y) * Math.min(1, dt * 2)

  const introTarget = props.intensity > 0 ? 1 : 0
  codeIntro += (introTarget - codeIntro) * Math.min(1, dt * 3.5)
  if (Math.abs(introTarget - codeIntro) < 0.002) codeIntro = introTarget

  // Nothing left to animate once the code layer has fully faded out and intensity is off —
  // stop the loop rather than redrawing an unchanging photo at 60fps forever.
  const stillActive = introTarget > 0 || codeIntro > 0.001
  if (stillActive) {
    updateFalling(background, dt)
    updateFalling(midground, dt)
    updateFalling(foreground, dt)
    updateApproach(floor, dt)
    updateApproach(wallLeft, dt)
    updateApproach(wallRight, dt)
  }

  render(time)

  if (stillActive) {
    frameId = requestAnimationFrame(frame)
  } else {
    frameId = 0
  }
}

function stop() {
  cancelAnimationFrame(frameId)
  frameId = 0
}

/** Restarts the render loop without reshuffling particle positions — used to wake back up
 * from the idle-stop above, so re-hovering resumes the scene rather than resetting it. */
function resume() {
  if (frameId || reducedMotion.value || !visible || document.hidden) return
  lastTime = 0
  frameId = requestAnimationFrame(frame)
}

function start() {
  stop()
  setupCanvas()
  lastTime = 0
  if (reducedMotion.value) {
    render(0)
    return
  }
  if (!visible || document.hidden) return
  frameId = requestAnimationFrame(frame)
}

function onPointerMove(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  pointer.x = (event.clientX - rect.left) / rect.width - 0.5
  pointer.y = (event.clientY - rect.top) / rect.height - 0.5
  pointer.active = true
}

function onPointerLeave() {
  pointer.active = false
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else start()
}

function loadImage() {
  const img = new Image()
  imageReady = false
  img.onload = () => {
    imageReady = true
    sourceImage = img
    if (!frameId) render(0)
  }
  img.src = props.src
  sourceImage = img
}

watch(() => props.src, loadImage)
watch([() => props.depth, () => props.vanishingPointX, () => props.vanishingPointY], () => {
  if (canvasRef.value) buildScene()
})
watch(
  () => props.intensity,
  (value) => {
    if (value > 0) resume()
  },
)
watch(reducedMotion, start)

onMounted(() => {
  loadImage()
  start()

  resizeObserver = new ResizeObserver(() => start())
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)

  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
    if (visible) start()
    else stop()
  })
  if (wrapperRef.value) intersectionObserver.observe(wrapperRef.value)

  document.addEventListener('visibilitychange', onVisibilityChange)
  if (props.interactive) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    canvasRef.value?.addEventListener('pointerleave', onPointerLeave)
  }
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pointermove', onPointerMove)
  canvasRef.value?.removeEventListener('pointerleave', onPointerLeave)
})
</script>

<template>
  <div ref="wrapper" class="matrix-world">
    <canvas ref="canvas" class="size-full" role="img" :aria-label="alt" />
    <div class="matrix-world__vignette" aria-hidden="true" />
    <div class="matrix-world__scanlines" aria-hidden="true" />
  </div>
</template>

<style scoped>
.matrix-world {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.matrix-world__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 42%, transparent 45%, rgb(0 0 0 / 0.35) 100%);
}

.matrix-world__scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / 0.12) 0,
    rgb(0 0 0 / 0.12) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: multiply;
}
</style>
