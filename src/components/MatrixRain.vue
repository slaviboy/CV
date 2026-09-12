<script setup lang="ts">
/**
 * Decorative "digital rain" overlay for the portrait — animates only while `active` is true
 * (the parent toggles this on hover) so it costs nothing the rest of the time. A fixed neon
 * green is used (rather than the theme accent) so the effect reads as "Matrix" and stays
 * punchy in both light and dark mode.
 */
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useReducedMotion } from '@/composables/useReducedMotion'

const props = defineProps<{ active: boolean }>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reducedMotion = useReducedMotion()

const FRAME_INTERVAL = 1000 / 24
const FONT_SIZE = 16
const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789:・."=+-*<>'
const HEAD_RGB = '214 255 226'
const TRAIL_RGB = '43 255 110'

let context: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let columns = 0
let drops: number[] = []

let frameId = 0
let lastFrame = 0
let resizeObserver: ResizeObserver | null = null

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]!
}

function setup() {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  width = Math.max(1, rect.width)
  height = Math.max(1, rect.height)

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  context = canvas.getContext('2d')
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)
  context?.clearRect(0, 0, width, height)

  columns = Math.max(1, Math.ceil(width / FONT_SIZE))
  drops = Array.from({ length: columns }, () => (Math.random() * -height) / FONT_SIZE)
}

function draw() {
  if (!context) return
  const ctx = context

  // Fade old glyphs by reducing their alpha (not by painting opaque black), so the canvas
  // background stays transparent and the darkened photo underneath stays visible through it.
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgb(0 0 0 / 0.08)'
  ctx.fillRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'

  ctx.font = `600 ${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textBaseline = 'top'
  ctx.shadowColor = `rgb(${TRAIL_RGB} / 0.8)`
  ctx.shadowBlur = 6

  for (let i = 0; i < columns; i++) {
    const x = i * FONT_SIZE
    const headY = drops[i]! * FONT_SIZE

    // Bright leading glyph, with a dimmer green one following it — the classic two-tone rain.
    ctx.fillStyle = `rgb(${HEAD_RGB} / 0.95)`
    ctx.fillText(randomChar(), x, headY)
    ctx.fillStyle = `rgb(${TRAIL_RGB} / 0.75)`
    ctx.fillText(randomChar(), x, headY - FONT_SIZE)

    if (headY > height && Math.random() > 0.975) {
      drops[i] = 0
    }
    drops[i]! += 0.4 + Math.random() * 0.4
  }

  ctx.shadowBlur = 0
}

function loop(time: number) {
  frameId = requestAnimationFrame(loop)
  if (time - lastFrame < FRAME_INTERVAL) return
  lastFrame = time
  draw()
}

function stop() {
  cancelAnimationFrame(frameId)
  frameId = 0
}

function start() {
  stop()
  if (reducedMotion.value) return
  setup()
  frameId = requestAnimationFrame(loop)
}

watch(
  () => props.active,
  (isActive) => {
    if (isActive) start()
    else stop()
  },
)

watch(reducedMotion, (isReduced) => {
  if (isReduced) stop()
})

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (props.active) setup()
  })
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)

  if (props.active) start()
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="size-full" aria-hidden="true" />
</template>
