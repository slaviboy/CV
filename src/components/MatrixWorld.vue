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
    /** Canvas backdrop. Its own lightness decides the rendering mode: on a dark backdrop code
     * glows bright (classic Matrix); on a light one it inks in dark instead of washing out to
     * white, so the effect still reads as "code" rather than just disappearing. */
    bgColor?: string
  }>(),
  {
    maskSrc: '',
    alt: '',
    intensity: 1,
    speed: 1,
    opacity: 1,
    fontSize: 10,
    color: '#00ff66',
    bgColor: '#050607',
  },
)

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const wrapperRef = useTemplateRef<HTMLDivElement>('wrapper')
const reducedMotion = useReducedMotion()

const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789:・."=+-*<>'
function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]!
}

// Size tiers from background to foreground. More than two steps so the silhouette edge reads as
// a gradient rather than a visible seam, while `tierCells` (below) keeps the per-frame cost to
// exactly one visit per cell no matter how many tiers there are.
const SIZE_TIERS = 5

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

function relativeLuma(c: { r: number; g: number; b: number }) {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
}

const baseColor = () => hexToRgb(props.color)
const backdropColor = () => hexToRgb(props.bgColor)
/** True when the backdrop is light enough that code needs to ink in dark rather than glow
 * bright — additive ("lighter") blending only reads on a dark backdrop; on a light one it just
 * washes out toward white, which is the "black background looks wrong so let's fix the colors
 * and it just disappears" failure mode. */
const onLightBg = () => relativeLuma(backdropColor()) > 0.5
/** The head/emphasis tone: brightened toward white on a dark backdrop (a hot spark), darkened
 * toward black on a light one (an inked-in point) — whichever direction reads as "more present"
 * for that backdrop. */
const headColor = () =>
  onLightBg() ? mix(baseColor(), { r: 0, g: 0, b: 0 }, 0.55) : mix(baseColor(), { r: 255, g: 255, b: 255 }, 0.78)

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
const shadeCanvas = document.createElement('canvas')
const shadeContext = shadeCanvas.getContext('2d', { willReadFrequently: true })
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
 * drives brightness/color) so it can also drive depth cues like glyph scale and glow. */
let depthMask = new Float32Array(0)
let headRow: number[] = []
let colSpeed: number[] = []
let colTail: number[] = []
/** Each cell's currently-displayed glyph. Mostly stable (drawn every frame regardless of the
 * falling head, so the face reads as a dense, present texture rather than a passing sliver) and
 * rerolled occasionally for shimmer, with cells inside a column's falling head rerolled more. */
let charGrid: string[] = []
/** Cell indices bucketed by size tier (background→foreground), computed once whenever the mask
 * is resampled — not per frame. `drawCode` then does exactly one pass per tier over only that
 * tier's cells, so going from 2 tiers to N doesn't multiply how many cells get visited overall;
 * it only changes how many times `ctx.font` gets set (a handful, still cheap). */
let tierCells: number[][] = []

// How dissolved into code the scene currently is: 0 = plain photo, 1 = full code. Eased toward
// the intensity-derived target each frame so hover reads as a dissolve, not a hard cut.
let transitionT = 0

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

// A fixed virtual light direction (from upper-left, mostly frontal) used to shade the pseudo
// bump map below. Normalized once at module load.
const LIGHT = (() => {
  const x = -0.55,
    y = -0.5,
    z = 0.67
  const len = Math.hypot(x, y, z)
  return { x: x / len, y: y / len, z: z / len }
})()

/** Treats the photo's own brightness as a height field and derives a normal from its gradient
 * (the standard height-map-to-normal trick), then lights that normal from a fixed direction —
 * cheap pseudo bump-mapping. This is what makes cheekbones, a nose bridge, hair volume, and
 * fabric folds read as actual raised/recessed surface rather than flat brightness, without any
 * real depth data. Writes the result into `shadeCanvas` at the source's medium resolution;
 * the caller downsamples it the same way as everything else. */
function computeBumpShade(medW: number, medH: number) {
  if (!medContext || !shadeContext) return
  const gray = new Float32Array(medW * medH)
  const src = medContext.getImageData(0, 0, medW, medH).data
  for (let p = 0; p < gray.length; p++) {
    const i = p * 4
    gray[p] = (src[i]! + src[i + 1]! + src[i + 2]!) / (3 * 255)
  }

  const strength = 6
  const shadeData = shadeContext.createImageData(medW, medH)
  for (let y = 0; y < medH; y++) {
    for (let x = 0; x < medW; x++) {
      const p = y * medW + x
      const xm1 = x > 0 ? p - 1 : p
      const xp1 = x < medW - 1 ? p + 1 : p
      const ym1 = y > 0 ? p - medW : p
      const yp1 = y < medH - 1 ? p + medW : p
      const gx = (gray[xp1]! - gray[xm1]!) * strength
      const gy = (gray[yp1]! - gray[ym1]!) * strength
      const nLen = Math.hypot(gx, gy, 1)
      const nx = -gx / nLen
      const ny = -gy / nLen
      const nz = 1 / nLen
      const shade = Math.max(0, Math.min(1, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z))
      const v = Math.round(shade * 255)
      const i4 = p * 4
      shadeData.data[i4] = shadeData.data[i4 + 1] = shadeData.data[i4 + 2] = v
      shadeData.data[i4 + 3] = 255
    }
  }
  shadeCanvas.width = medW
  shadeCanvas.height = medH
  shadeContext.putImageData(shadeData, 0, 0)
}

/** Samples the photo down to one "how much code here" value per grid cell, cover-fit +
 * top-aligned to match `object-cover object-top`. Brightness alone can't tell dark hair or a
 * dark t-shirt from a dark background — it would suppress all three equally — so *where* the
 * person is comes from the mask cutout's alpha channel (`maskSrc`: the subject cut out on a
 * transparent background) instead of brightness. The background still gets a dim, ambient
 * version of the same code (from the real photo's own brightness) so it doesn't go fully dark —
 * the mask's job is to make the person pop brighter against it, not to erase everything else. */
function buildTierCells() {
  tierCells = Array.from({ length: SIZE_TIERS }, () => [] as number[])
  for (let idx = 0; idx < depthMask.length; idx++) {
    const tier = Math.min(SIZE_TIERS - 1, Math.floor((depthMask[idx] ?? 0) * SIZE_TIERS))
    tierCells[tier]!.push(idx)
  }
}

function sampleLuminance() {
  luminance = new Float32Array(columns * rows)
  depthMask = new Float32Array(columns * rows)
  const image = sourceImage
  if (!sampleContext || !medContext || !image?.naturalWidth || !imageReady) {
    luminance.fill(0.5)
    buildTierCells()
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
  computeBumpShade(medW, medH)

  const lumaCtx = progressiveDownscale(medCanvas, columns, rows)
  const lumaSmall = lumaCtx?.getImageData(0, 0, columns, rows).data
  if (!lumaSmall) {
    luminance.fill(0.5)
    buildTierCells()
    return
  }

  const rawLuma = new Float32Array(columns * rows)
  for (let cell = 0; cell < rawLuma.length; cell++) {
    const i = cell * 4
    rawLuma[cell] = (0.2126 * lumaSmall[i]! + 0.7152 * lumaSmall[i + 1]! + 0.0722 * lumaSmall[i + 2]!) / 255
  }
  const lumaCurve = stretchAndGamma(rawLuma, 0.015, 0.015, 4)

  const shadeCtx = progressiveDownscale(shadeCanvas, columns, rows)
  const shadeSmall = shadeCtx?.getImageData(0, 0, columns, rows).data
  const rawShade = new Float32Array(columns * rows)
  if (shadeSmall) {
    for (let cell = 0; cell < rawShade.length; cell++) {
      rawShade[cell] = shadeSmall[cell * 4]! / 255
    }
  } else {
    rawShade.fill(1)
  }

  const mask = maskImage
  if (!maskContext || !mask?.naturalWidth || !maskReady) {
    // No mask loaded (yet) — fall back to brightness alone rather than showing nothing.
    luminance.set(lumaCurve)
    buildTierCells()
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
    buildTierCells()
    return
  }

  const rawMask = new Float32Array(columns * rows)
  for (let cell = 0; cell < rawMask.length; cell++) {
    const alpha = maskSmall[cell * 4 + 3]! / 255
    // Smoothstep rather than the raw alpha — gives the depth cues (scale/glow below) a gentler
    // transition at the silhouette edge instead of a hard step.
    rawMask[cell] = alpha * alpha * (3 - 2 * alpha)
  }
  depthMask.set(rawMask)
  buildTierCells()

  // Dim, ambient rain over the whole frame (still shaped by the real photo's brightness, just
  // faint) — then the mask blends in a much brighter, gamma-boosted version over the person,
  // itself modulated by the bump shade so the person's own surface — cheekbones, hair volume,
  // fabric folds — reads with real highlight/shadow instead of flat brightness.
  for (let cell = 0; cell < luminance.length; cell++) {
    const background = 0.05 + rawLuma[cell]! ** 1.4 * 0.22
    const person = (0.45 + lumaCurve[cell]! * 0.4) * (0.55 + rawShade[cell]! * 0.7)
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

function drawCode(alpha: number) {
  if (!ctx || alpha <= 0.004) return
  const c = ctx
  const light = onLightBg()
  c.save()
  c.globalAlpha = alpha
  c.globalCompositeOperation = light ? 'multiply' : 'lighter'
  c.textBaseline = 'top'

  const head = headColor()
  const base = baseColor()
  const bg = props.fontSize * 0.78

  // The whole grid is drawn every frame — that's what makes the face read as a dense, present
  // texture rather than a thin falling sliver. Each column's moving head then boosts brightness
  // and reroll frequency for the cells it currently passes through, layering motion on top.
  // Iterating `tierCells` (precomputed in sampleLuminance) rather than the full grid per tier
  // keeps the total number of cells visited constant at columns*rows regardless of tier count.
  for (let tier = 0; tier < SIZE_TIERS; tier++) {
    const cells = tierCells[tier]
    if (!cells || cells.length === 0) continue
    const size = bg + (props.fontSize - bg) * (tier / (SIZE_TIERS - 1))
    c.font = `600 ${size.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`

    for (const idx of cells) {
      const luma = luminance[idx] ?? 0
      if (luma <= 0.02) continue

      const col = idx % columns
      const row = (idx - col) / columns
      const tail = colTail[col]!
      const dist = headRow[col]! - row
      const boost = dist >= 0 && dist < tail ? 1 - dist / tail : 0

      if (Math.random() < (boost > 0.5 ? 0.35 : 0.02)) {
        charGrid[idx] = randomChar()
      }

      const a = Math.min(1, luma * (0.55 + boost * 0.85))
      // Shadow blur is one of the pricier canvas operations per draw call — keep it rare (only
      // the animated "head" cells passing through), not a permanent per-cell cost across the
      // whole silhouette. Size and brightness alone already carry most of the depth cue.
      const glow = boost > 0.6 ? boost * 5 : 0
      if (glow > 0) {
        c.shadowColor = rgbaOf(base, Math.min(1, luma))
        c.shadowBlur = glow
        c.fillStyle = rgbaOf(mix(base, head, boost), a)
      } else {
        c.shadowBlur = 0
        c.fillStyle = rgbaOf(base, a)
      }
      c.fillText(charGrid[idx] ?? randomChar(), col * props.fontSize, row * props.fontSize)
    }
  }

  c.shadowBlur = 0
  c.restore()
}

function drawNoise(codeAlpha: number) {
  if (!ctx || codeAlpha <= 0.05) return
  const c = ctx
  c.save()
  c.globalCompositeOperation = onLightBg() ? 'multiply' : 'screen'
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
  c.fillStyle = props.bgColor
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
  if (stillActive) updateColumns(dt)

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
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
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
