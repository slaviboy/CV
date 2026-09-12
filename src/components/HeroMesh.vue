<script setup lang="ts">
/**
 * Decorative hero background: a slowly drifting Delaunay triangulation with faint low-poly
 * shading — a nod to the Low Poly Art app and the DelaunatorKotlin library.
 *
 * Performance/accessibility:
 * - triangulated once per resize; each frame only moves points (no re-triangulation, no flicker)
 * - capped at ~30 fps, paused when off-screen or when the tab is hidden
 * - renders a single static frame for `prefers-reduced-motion`
 */
import Delaunator from 'delaunator'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useReducedMotion } from '@/composables/useReducedMotion'

interface MeshPoint {
  baseX: number
  baseY: number
  amplitude: number
  speed: number
  phaseX: number
  phaseY: number
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reducedMotion = useReducedMotion()

const FRAME_INTERVAL = 1000 / 30

let context: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let points: MeshPoint[] = []
let coords = new Float64Array(0)
let triangles = new Uint32Array(0)
let halfedges = new Int32Array(0)
let shades = new Float32Array(0)
let meshRgb = '61 220 132'
let isDarkTheme = true

let frameId = 0
let lastFrame = 0
let visible = true
const pointer = { x: -9999, y: -9999, targetX: -9999, targetY: -9999 }

let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null

// Deterministic pseudo-random numbers so the mesh looks the same on every visit.
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function readThemeColors() {
  const root = document.documentElement
  meshRgb = getComputedStyle(root).getPropertyValue('--mesh').trim() || meshRgb
  isDarkTheme = root.classList.contains('dark')
}

function buildMesh() {
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

  // Jittered grid → evenly sized, organic-looking triangles.
  const spacing = Math.max(70, Math.min(130, Math.sqrt((width * height) / 90)))
  const random = createRandom(1994)
  const columns = Math.ceil(width / spacing) + 2
  const rows = Math.ceil(height / spacing) + 2

  points = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      points.push({
        baseX: (column - 0.5) * spacing + (random() - 0.5) * spacing * 0.7,
        baseY: (row - 0.5) * spacing + (random() - 0.5) * spacing * 0.7,
        amplitude: spacing * (0.08 + random() * 0.14),
        speed: 0.00012 + random() * 0.00018,
        phaseX: random() * Math.PI * 2,
        phaseY: random() * Math.PI * 2,
      })
    }
  }

  coords = new Float64Array(points.length * 2)
  points.forEach((point, index) => {
    coords[index * 2] = point.baseX
    coords[index * 2 + 1] = point.baseY
  })

  const delaunay = new Delaunator(coords)
  triangles = delaunay.triangles
  halfedges = delaunay.halfedges

  shades = new Float32Array(triangles.length / 3)
  for (let index = 0; index < shades.length; index++) shades[index] = random()
}

function draw(time: number) {
  if (!context) return
  const ctx = context

  for (let index = 0; index < points.length; index++) {
    const point = points[index]!
    coords[index * 2] = point.baseX + Math.sin(time * point.speed + point.phaseX) * point.amplitude
    coords[index * 2 + 1] =
      point.baseY + Math.cos(time * point.speed * 0.8 + point.phaseY) * point.amplitude
  }

  pointer.x += (pointer.targetX - pointer.x) * 0.08
  pointer.y += (pointer.targetY - pointer.y) * 0.08

  ctx.clearRect(0, 0, width, height)

  const fillStrength = isDarkTheme ? 0.075 : 0.06
  const highlightRadius = 220

  // Faceted fill: each triangle gets a stable shade plus a soft glow around the pointer.
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]! * 2
    const b = triangles[t + 1]! * 2
    const c = triangles[t + 2]! * 2
    const ax = coords[a]!
    const ay = coords[a + 1]!
    const bx = coords[b]!
    const by = coords[b + 1]!
    const cx = coords[c]!
    const cy = coords[c + 1]!

    const centroidX = (ax + bx + cx) / 3
    const centroidY = (ay + by + cy) / 3
    const distance = Math.hypot(centroidX - pointer.x, centroidY - pointer.y)
    const glow = Math.max(0, 1 - distance / highlightRadius)
    const alpha = fillStrength * (0.15 + shades[t / 3]! * 0.85) + glow * 0.09

    ctx.fillStyle = `rgb(${meshRgb} / ${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fill()
  }

  // Edges: every half-edge pair once.
  ctx.beginPath()
  for (let edge = 0; edge < triangles.length; edge++) {
    const opposite = halfedges[edge]!
    if (edge < opposite || opposite === -1) {
      const from = triangles[edge]! * 2
      const to = triangles[edge % 3 === 2 ? edge - 2 : edge + 1]! * 2
      ctx.moveTo(coords[from]!, coords[from + 1]!)
      ctx.lineTo(coords[to]!, coords[to + 1]!)
    }
  }
  ctx.strokeStyle = `rgb(${meshRgb} / ${isDarkTheme ? 0.16 : 0.2})`
  ctx.lineWidth = 1
  ctx.stroke()

  // Vertices.
  ctx.fillStyle = `rgb(${meshRgb} / ${isDarkTheme ? 0.45 : 0.5})`
  for (let index = 0; index < points.length; index++) {
    ctx.beginPath()
    ctx.arc(coords[index * 2]!, coords[index * 2 + 1]!, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function loop(time: number) {
  frameId = requestAnimationFrame(loop)
  if (time - lastFrame < FRAME_INTERVAL) return
  lastFrame = time
  draw(time)
}

function start() {
  stop()
  if (reducedMotion.value || !visible || document.hidden) {
    draw(0)
    return
  }
  frameId = requestAnimationFrame(loop)
}

function stop() {
  cancelAnimationFrame(frameId)
  frameId = 0
}

function onPointerMove(event: PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  pointer.targetX = event.clientX - rect.left
  pointer.targetY = event.clientY - rect.top
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else start()
}

watch(reducedMotion, start)

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  readThemeColors()
  buildMesh()
  start()

  resizeObserver = new ResizeObserver(() => {
    buildMesh()
    if (!frameId) draw(0)
  })
  resizeObserver.observe(canvas)

  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
    start()
  })
  intersectionObserver.observe(canvas)

  // Re-read the palette whenever the theme class on <html> changes.
  themeObserver = new MutationObserver(() => {
    readThemeColors()
    if (!frameId) draw(0)
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  document.addEventListener('visibilitychange', onVisibilityChange)
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pointermove', onPointerMove)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="hero-mesh pointer-events-none absolute inset-0 size-full"
    aria-hidden="true"
  />
</template>

<style scoped>
.hero-mesh {
  /* Keep the mesh away from the headline for legibility, strongest towards the right. */
  mask-image: radial-gradient(ellipse 75% 85% at 78% 42%, #000 20%, transparent 78%);
}

@media (max-width: 767px) {
  .hero-mesh {
    mask-image: radial-gradient(ellipse 120% 60% at 60% 0%, #000 10%, transparent 75%);
    opacity: 0.8;
  }
}
</style>
