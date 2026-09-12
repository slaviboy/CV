<script setup lang="ts">
/**
 * "Dissolve into the Matrix" hover effect: on hover, the photo fades out completely while a
 * dense grid of falling code fades in — and that code isn't random noise over the photo, it's
 * brightness-mapped *from* the photo (sampled once into a `columns x rows` grid matching the
 * render grid), so the falling characters reconstruct the same face/silhouette rather than
 * just decorating it. This is the same idea as the classic "face made of Matrix code" shots:
 * dense code, near-black background, the subject legible only through where the code is bright.
 */
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useReducedMotion } from '@/composables/useReducedMotion'

const props = withDefaults(
  defineProps<{
    src: string
    /** A cutout of the same photo — subject on a flat white fill, same crop/dimensions as `src`.
     * Used only to work out which cells belong to the person; brightness still comes from `src`. */
    maskSrc?: string
    alt?: string
    /** 0 shows the plain photo; >0 dissolves it into the code grid. */
    intensity?: number
    speed?: number
    /** Strength of the code layer once fully dissolved in. */
    opacity?: number
    fontSize?: number
    color?: string
  }>(),
  {
    maskSrc: '',
    alt: '',
    intensity: 1,
    speed: 1,
    opacity: 1,
    fontSize: 10,
    color: '#00ff66',
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
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0')
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

const baseColor = () => hexToRgb(props.color)
const headColor = () => mix(baseColor(), { r: 255, g: 255, b: 255 }, 0.78)

function rgbaOf(c: { r: number; g: number; b: number }, a: number) {
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0

let sourceImage: HTMLImageElement | null = null
let imageReady = false
let maskImage: HTMLImageElement | null = null
let maskReady = false

const sampleCanvas = document.createElement('canvas')
const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true })
const medCanvas = document.createElement('canvas')
const medContext = medCanvas.getContext('2d', { willReadFrequently: true })
const maskCanvas = document.createElement('canvas')
const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
const downA = document.createElement('canvas')
const downACtx = downA.getContext('2d', { willReadFrequently: true })
const downB = document.createElement('canvas')
const downBCtx = downB.getContext('2d', { willReadFrequently: true })

/** Downscales in halving steps rather than one big jump — plain bilinear on a >4x reduction
 * aliases badly (lets fine background noise through instead of averaging it away), which is
 * exactly the noise `sampleLuminance` is trying to suppress. Chaining ~2x steps approximates a
 * proper box filter using only what canvas 2D gives us for free. */
function progressiveDownscale(source: HTMLCanvasElement, targetW: number, targetH: number) {
  let curCanvas: HTMLCanvasElement = source
  let curW = source.width
  let curH = source.height
  let useA = true

  while (curW > targetW * 2 && curH > targetH * 2) {
    const nextW = Math.max(targetW, Math.round(curW / 2))
    const nextH = Math.max(targetH, Math.round(curH / 2))
    const dest = useA ? downA : downB
    const destCtx = useA ? downACtx : downBCtx
    if (!destCtx) break
    dest.width = nextW
    dest.height = nextH
    destCtx.imageSmoothingEnabled = true
    destCtx.imageSmoothingQuality = 'high'
    destCtx.clearRect(0, 0, nextW, nextH)
    destCtx.drawImage(curCanvas, 0, 0, nextW, nextH)
    curCanvas = dest
    curW = nextW
    curH = nextH
    useA = !useA
  }

  sampleCanvas.width = targetW
  sampleCanvas.height = targetH
  if (sampleContext) {
    sampleContext.imageSmoothingEnabled = true
    sampleContext.imageSmoothingQuality = 'high'
    sampleContext.clearRect(0, 0, targetW, targetH)
    sampleContext.drawImage(curCanvas, 0, 0, targetW, targetH)
  }
  return sampleContext
}

let columns = 0
let rows = 0
let luminance = new Float32Array(0)
/** How "foreground" each cell is (from the mask alpha) — separate from `luminance` (which
 * drives brightness/color) so it can also drive depth cues: glyph scale, glow, and parallax. */
let depthMask = new Float32Array(0)
let headRow: number[] = []
let colSpeed: number[] = []
let colTail: number[] = []
/** Each cell's currently-displayed glyph. Mostly stable (drawn every frame regardless of the
 * falling head, so the face reads as a dense, present texture rather than a passing sliver) and
 * rerolled occasionally for shimmer, with cells inside a column's falling head rerolled more. */
let charGrid: string[] = []

// How dissolved into code the scene currently is: 0 = plain photo, 1 = full code. Eased toward
// the intensity-derived target each frame so hover reads as a dissolve, not a hard cut.
let transitionT = 0

// Mouse parallax: the person (high depthMask) shifts noticeably, the background barely moves —
// that differential is what sells "depth" rather than everything being one flat plane.
const PARALLAX_PX = 7
const pointerTarget = { x: 0, y: 0 }
const pointer = { x: 0, y: 0 }

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** Percentile-stretches `raw` to its own min/max then applies a gamma curve, so each signal is
 * normalized to its own range before the two are combined. `lowCutoff` and `highCutoff` are
 * independent so the noise floor can be raised without also compressing the bright end. */
function stretchAndGamma(raw: Float32Array, lowCutoff: number, highCutoff: number, gamma: number) {
  const sorted = Array.from(raw).sort((a, b) => a - b)
  const low = sorted[Math.floor(sorted.length * lowCutoff)] ?? 0
  const high = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * (1 - highCutoff)) - 1)] ?? 1
  const range = Math.max(0.02, high - low)
  const out = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    out[i] = Math.min(1, Math.max(0, (raw[i]! - low) / range)) ** gamma
  }
  return out
}

/** Samples the photo down to one "how much code here" value per grid cell, cover-fit +
 * top-aligned to match `object-cover object-top`. Brightness alone can't tell dark hair or a
 * dark t-shirt from a dark background — it would suppress all three equally — so *where* the
 * person is comes from the mask cutout's alpha channel (`maskSrc`: the subject cut out on a
 * transparent background) instead of brightness. The background still gets a dim, ambient
 * version of the same code (from the real photo's own brightness) so it doesn't go fully dark —
 * the mask's job is to make the person pop brighter against it, not to erase everything else. */
function sampleLuminance() {
  luminance = new Float32Array(columns * rows)
  depthMask = new Float32Array(columns * rows)
  const image = sourceImage
  if (!sampleContext || !medContext || !image?.naturalWidth || !imageReady) {
    luminance.fill(0.5)
    return
  }

  const medW = 220
  const medH = Math.max(1, Math.round((medW * height) / width))
  medCanvas.width = medW
  medCanvas.height = medH
  const scale = Math.max(medW / image.naturalWidth, medH / image.naturalHeight)
  const dw = image.naturalWidth * scale
  const dh = image.naturalHeight * scale
  const dx = (medW - dw) / 2
  medContext.clearRect(0, 0, medW, medH)
  medContext.drawImage(image, dx, 0, dw, dh)

  const lumaCtx = progressiveDownscale(medCanvas, columns, rows)
  const lumaSmall = lumaCtx?.getImageData(0, 0, columns, rows).data
  if (!lumaSmall) {
    luminance.fill(0.5)
    return
  }

  const rawLuma = new Float32Array(columns * rows)
  for (let cell = 0; cell < rawLuma.length; cell++) {
    const i = cell * 4
    rawLuma[cell] = (0.2126 * lumaSmall[i]! + 0.7152 * lumaSmall[i + 1]! + 0.0722 * lumaSmall[i + 2]!) / 255
  }
  const lumaCurve = stretchAndGamma(rawLuma, 0.015, 0.015, 4)

  const mask = maskImage
  if (!maskContext || !mask?.naturalWidth || !maskReady) {
    // No mask loaded (yet) — fall back to brightness alone rather than showing nothing.
    luminance.set(lumaCurve)
    return
  }

  maskCanvas.width = medW
  maskCanvas.height = medH
  const maskScale = Math.max(medW / mask.naturalWidth, medH / mask.naturalHeight)
  const mdw = mask.naturalWidth * maskScale
  const mdh = mask.naturalHeight * maskScale
  maskContext.clearRect(0, 0, medW, medH)
  maskContext.drawImage(mask, (medW - mdw) / 2, 0, mdw, mdh)

  const maskCtx = progressiveDownscale(maskCanvas, columns, rows)
  const maskSmall = maskCtx?.getImageData(0, 0, columns, rows).data
  if (!maskSmall) {
    luminance.set(lumaCurve)
    return
  }

  const rawMask = new Float32Array(columns * rows)
  for (let cell = 0; cell < rawMask.length; cell++) {
    const alpha = maskSmall[cell * 4 + 3]! / 255
    // Smoothstep rather than the raw alpha — gives the depth cues (scale/glow/parallax below) a
    // gentler transition at the silhouette edge instead of a hard step.
    rawMask[cell] = alpha * alpha * (3 - 2 * alpha)
  }
  depthMask.set(rawMask)

  // Dim, ambient rain over the whole frame (still shaped by the real photo's brightness, just
  // faint) — then the mask blends in a much brighter, gamma-boosted version over the person, so
  // it clearly pops out of the background rather than the background vanishing entirely.
  for (let cell = 0; cell < luminance.length; cell++) {
    const background = 0.05 + rawLuma[cell]! ** 1.4 * 0.22
    const person = 0.5 + lumaCurve[cell]! * 0.5
    luminance[cell] = background + (person - background) * rawMask[cell]!
  }
}

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  width = Math.max(1, rect.width)
  height = Math.max(1, rect.height)

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  columns = Math.max(1, Math.ceil(width / props.fontSize))
  rows = Math.max(1, Math.ceil(height / props.fontSize))
  headRow = Array.from({ length: columns }, () => rand(-rows, rows))
  colSpeed = Array.from({ length: columns }, () => rand(0.12, 0.32))
  colTail = Array.from({ length: columns }, () => Math.round(rand(5, 9)))
  charGrid = Array.from({ length: columns * rows }, randomChar)

  sampleLuminance()
}

function updateColumns(dt: number) {
  for (let i = 0; i < columns; i++) {
    headRow[i]! += colSpeed[i]! * props.speed * dt * 60
    if (headRow[i]! - colTail[i]! > rows) {
      headRow[i] = rand(-rows * 0.4, 0)
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------------------------

/** Cover-fit + top-align, matching the `<img>` this replaces. */
function drawPhoto(alpha: number) {
  if (!ctx || !sourceImage || !imageReady || alpha <= 0.004) return
  const c = ctx
  const scale = Math.max(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight)
  const dw = sourceImage.naturalWidth * scale
  const dh = sourceImage.naturalHeight * scale
  const dx = (width - dw) / 2
  c.save()
  c.globalAlpha = alpha
  c.drawImage(sourceImage, dx, 0, dw, dh)
  c.restore()
}

/** Two size/glow/parallax tiers — background (far) and person (near) — rather than a truly
 * continuous per-cell scale, so `ctx.font` only changes twice a frame instead of once per glyph
 * (font changes are one of the pricier canvas state changes). That's enough to read as depth:
 * the person renders larger, glows, and shifts more with the mouse; the background stays small,
 * flat, and nearly still. */
function drawCode(alpha: number) {
  if (!ctx || alpha <= 0.004) return
  const c = ctx
  c.save()
  c.globalAlpha = alpha
  c.globalCompositeOperation = 'lighter'
  c.textBaseline = 'top'

  const head = headColor()
  const base = baseColor()
  const fg = props.fontSize
  const bg = props.fontSize * 0.78
  const parallaxBg = { x: pointer.x * PARALLAX_PX * 0.12, y: pointer.y * PARALLAX_PX * 0.12 }
  const parallaxFg = { x: pointer.x * PARALLAX_PX, y: pointer.y * PARALLAX_PX }

  // The whole grid is drawn every frame — that's what makes the face read as a dense, present
  // texture rather than a thin falling sliver. Each column's moving head then boosts brightness
  // and reroll frequency for the cells it currently passes through, layering motion on top.
  for (let pass = 0; pass < 2; pass++) {
    const isForeground = pass === 1
    c.font = `600 ${(isForeground ? fg : bg).toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`
    const parallax = isForeground ? parallaxFg : parallaxBg

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const idx = row * columns + col
        const depth = depthMask[idx] ?? 0
        if (isForeground !== depth >= 0.5) continue

        const luma = luminance[idx] ?? 0
        if (luma <= 0.02) continue

        const tail = colTail[col]!
        const dist = headRow[col]! - row
        const boost = dist >= 0 && dist < tail ? 1 - dist / tail : 0

        if (Math.random() < (boost > 0.5 ? 0.35 : 0.02)) {
          charGrid[idx] = randomChar()
        }

        const a = Math.min(1, luma * (0.55 + boost * 0.85))
        // Shadow blur is one of the pricier canvas operations per draw call — keep it rare
        // (only the animated "head" cells passing through), not a permanent per-cell cost across
        // the whole silhouette. Size and brightness alone already carry most of the depth cue.
        const glow = isForeground && boost > 0.6 ? boost * 5 : 0
        if (glow > 0) {
          c.shadowColor = rgbaOf(base, Math.min(1, luma))
          c.shadowBlur = glow
          c.fillStyle = rgbaOf(mix(base, head, boost), a)
        } else {
          c.shadowBlur = 0
          c.fillStyle = rgbaOf(base, a)
        }
        c.fillText(
          charGrid[idx] ?? randomChar(),
          col * props.fontSize + parallax.x,
          row * props.fontSize + parallax.y,
        )
      }
    }
  }

  c.shadowBlur = 0
  c.restore()
}

function drawNoise(codeAlpha: number) {
  if (!ctx || codeAlpha <= 0.05) return
  const c = ctx
  c.save()
  c.globalCompositeOperation = 'screen'
  c.fillStyle = rgbaOf(baseColor(), 0.5)
  const dots = Math.round(24 * Math.min(1.6, (width * height) / (420 * 520)))
  for (let i = 0; i < dots; i++) {
    if (Math.random() > 0.35) continue
    c.globalAlpha = Math.random() * 0.1 * codeAlpha
    c.fillRect(Math.random() * width, Math.random() * height, 1, 1)
  }
  c.restore()
}

function render() {
  if (!ctx) return
  const c = ctx
  c.clearRect(0, 0, width, height)

  // Solid backdrop first — as the photo's alpha drops toward 0, this is what's left behind it
  // instead of the page showing through, and it's what the code layer sits on.
  c.fillStyle = 'rgb(5 6 7)'
  c.fillRect(0, 0, width, height)

  drawPhoto(1 - transitionT)
  if (props.intensity > 0 || transitionT > 0.01) {
    drawCode(transitionT * props.opacity)
    drawNoise(transitionT)
  }
}

// ---------------------------------------------------------------------------------------------
// Lifecycle / loop
// ---------------------------------------------------------------------------------------------

let frameId = 0
let lastTime = 0
let visible = true
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

function frame(time: number) {
  const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0
  lastTime = time

  const target = props.intensity > 0 ? 1 : 0
  transitionT += (target - transitionT) * Math.min(1, dt * 3.2)
  if (Math.abs(target - transitionT) < 0.002) transitionT = target

  const stillActive = target > 0 || transitionT > 0.001
  if (stillActive) {
    updateColumns(dt)
    const lerp = Math.min(1, dt * 5)
    pointer.x += (pointerTarget.x - pointer.x) * lerp
    pointer.y += (pointerTarget.y - pointer.y) * lerp
  }

  render()

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

/** Resumes the loop without rebuilding the grid — re-hovering should continue the scene, not
 * reshuffle every column's position. */
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
    render()
    return
  }
  if (!visible || document.hidden) return
  frameId = requestAnimationFrame(frame)
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else start()
}

function onPointerMove(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  pointerTarget.x = (event.clientX - rect.left) / rect.width - 0.5
  pointerTarget.y = (event.clientY - rect.top) / rect.height - 0.5
}

function onPointerLeave() {
  pointerTarget.x = 0
  pointerTarget.y = 0
}

function loadImage() {
  const img = new Image()
  imageReady = false
  img.onload = () => {
    imageReady = true
    sourceImage = img
    if (canvasRef.value) {
      sampleLuminance()
      if (!frameId) render()
    }
  }
  img.src = props.src
  sourceImage = img
}

function loadMaskImage() {
  if (!props.maskSrc) {
    maskReady = false
    maskImage = null
    return
  }
  const img = new Image()
  maskReady = false
  img.onload = () => {
    maskReady = true
    maskImage = img
    if (canvasRef.value) {
      sampleLuminance()
      if (!frameId) render()
    }
  }
  img.src = props.maskSrc
  maskImage = img
}

watch(() => props.src, loadImage)
watch(() => props.maskSrc, loadMaskImage)
watch(
  () => props.intensity,
  (value) => {
    if (value > 0) resume()
  },
)
watch(() => props.fontSize, () => {
  if (canvasRef.value) setupCanvas()
})
watch(reducedMotion, start)

onMounted(() => {
  loadImage()
  loadMaskImage()
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
  wrapperRef.value?.addEventListener('pointermove', onPointerMove)
  wrapperRef.value?.addEventListener('pointerleave', onPointerLeave)
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  wrapperRef.value?.removeEventListener('pointermove', onPointerMove)
  wrapperRef.value?.removeEventListener('pointerleave', onPointerLeave)
  document.removeEventListener('visibilitychange', onVisibilityChange)
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
  background: radial-gradient(ellipse at 50% 40%, transparent 40%, rgb(0 0 0 / 0.45) 100%);
}

.matrix-world__scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.4;
  background: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / 0.14) 0,
    rgb(0 0 0 / 0.14) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: multiply;
}
</style>
