<script setup lang="ts">
/**
 * Decorative "digital rain" overlay for the portrait — animates only while `active` is true
 * (the parent toggles this on hover) so it costs nothing the rest of the time. Colored from
 * the theme's `--mesh` token, which is already the accent green in both light and dark mode.
 */
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useReducedMotion } from '@/composables/useReducedMotion'

const props = defineProps<{ active: boolean }>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reducedMotion = useReducedMotion()

const FRAME_INTERVAL = 1000 / 24
const FONT_SIZE = 15
const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789:・."=+-*<>'

let context: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let columns = 0
let drops: number[] = []
let meshRgb = '61 220 132'

let frameId = 0
let lastFrame = 0
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

function readThemeColor() {
  meshRgb = getComputedStyle(document.documentElement).getPropertyValue('--mesh').trim() || meshRgb
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
  ctx.fillStyle = 'rgb(0 0 0 / 0.12)'
  ctx.fillRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'

  ctx.font = `${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textBaseline = 'top'

  for (let i = 0; i < columns; i++) {
    const char = CHARS[Math.floor(Math.random() * CHARS.length)]!
    const x = i * FONT_SIZE
    const y = drops[i]! * FONT_SIZE

    ctx.fillStyle = `rgb(${meshRgb} / 0.9)`
    ctx.fillText(char, x, y)

    if (y > height && Math.random() > 0.975) {
      drops[i] = 0
    }
    drops[i]! += 0.5 + Math.random() * 0.5
  }
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
  readThemeColor()
  themeObserver = new MutationObserver(readThemeColor)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  resizeObserver = new ResizeObserver(() => {
    if (props.active) setup()
  })
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)

  if (props.active) start()
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="size-full" aria-hidden="true" />
</template>
