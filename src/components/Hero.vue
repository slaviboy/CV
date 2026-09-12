<script setup lang="ts">
import { ArrowDown, ArrowRight, MapPin } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import HeroMesh from '@/components/HeroMesh.vue'
import BrandIcon from '@/components/icons/BrandIcon.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { portfolio } from '@/data/portfolio'

const { profile, socials } = portfolio

type TokenKind = 'keyword' | 'type' | 'string' | 'property' | 'plain' | 'comment'
type Line = [text: string, kind: TokenKind][]

// A small Kotlin snippet built from the profile data (decorative; the same facts are in the text).
const code: Line[] = [
  [['// Developer.kt', 'comment']],
  [
    ['val ', 'keyword'],
    ['developer', 'plain'],
    [' = ', 'plain'],
    ['Developer', 'type'],
    ['(', 'plain'],
  ],
  [
    ['    name', 'property'],
    [' = ', 'plain'],
    [`"${profile.name}"`, 'string'],
    [',', 'plain'],
  ],
  [
    ['    role', 'property'],
    [' = ', 'plain'],
    [`"${profile.title}"`, 'string'],
    [',', 'plain'],
  ],
  [
    ['    basedIn', 'property'],
    [' = ', 'plain'],
    [`"${profile.location}"`, 'string'],
    [',', 'plain'],
  ],
  [
    ['    stack', 'property'],
    [' = ', 'plain'],
    ['listOf', 'type'],
    ['(', 'plain'],
  ],
  ...profile.focus.map<Line>((item, index) => [
    [`        "${item}"`, 'string'],
    ...(index === profile.focus.length - 1 ? [] : [[',', 'plain'] as Line[number]]),
  ]),
  [['    ),', 'plain']],
  [[')', 'plain']],
]

const tokenClass: Record<TokenKind, string> = {
  keyword: 'text-(--code-keyword)',
  type: 'text-(--code-type)',
  string: 'text-(--code-string)',
  property: 'text-fg',
  plain: 'text-muted',
  comment: 'text-(--code-comment) italic',
}

/**
 * Typewriter effect for the code panel: types the snippet out, pauses, erases it, and loops —
 * as if a developer were writing it live. `revealCount` is a single running character count
 * across the whole snippet; each line's tokens are sliced from it in `visibleCode`.
 */
const panelRef = useTemplateRef<HTMLDivElement>('panel')
const reducedMotion = useReducedMotion()

const lineLengths = code.map((line) => line.reduce((sum, [text]) => sum + text.length, 0))
const lineEndOffsets = lineLengths.reduce<number[]>((offsets, length, index) => {
  offsets.push((offsets[index - 1] ?? 0) + length)
  return offsets
}, [])
const totalChars = lineEndOffsets[lineEndOffsets.length - 1] ?? 0

const revealCount = ref(0)
/** A wrong character currently shown right after the typed text, mid-correction. */
const typoChar = ref<string | null>(null)

// The same char-by-char order `revealCount` walks, flattened once so a typo can look ahead
// at what the "correct" next character is (to pick a plausible fumble) without re-deriving it.
const flatText = code.map((line) => line.map(([text]) => text).join('')).join('')

const visibleCode = computed<Line[]>(() => {
  let consumed = 0
  return code.map((line) =>
    line.map(([text, kind]) => {
      const visible = Math.max(0, Math.min(text.length, revealCount.value - consumed))
      consumed += text.length
      return [text.slice(0, visible), kind] as Line[number]
    }),
  )
})

const activeLineIndex = computed(() => {
  const index = lineEndOffsets.findIndex((end) => revealCount.value < end)
  return index === -1 ? lineLengths.length - 1 : index
})

// Adjacent QWERTY keys, so a "mistyped" character looks like a real slipped keystroke.
const KEYBOARD_NEIGHBORS: Record<string, string> = {
  a: 'sq',
  b: 'vn',
  c: 'xv',
  d: 'sfe',
  e: 'wrd',
  f: 'dgr',
  g: 'fht',
  h: 'gjy',
  i: 'uok',
  j: 'hku',
  k: 'jli',
  l: 'ko',
  m: 'n',
  n: 'bm',
  o: 'ipl',
  p: 'ol',
  q: 'wa',
  r: 'etf',
  s: 'ade',
  t: 'ryg',
  u: 'yij',
  v: 'cb',
  w: 'qes',
  x: 'zc',
  y: 'tuh',
  z: 'xs',
}

function typoFor(correctChar: string) {
  const lower = correctChar.toLowerCase()
  const neighbors = KEYBOARD_NEIGHBORS[lower]
  if (!neighbors) return correctChar
  const pick = neighbors[Math.floor(Math.random() * neighbors.length)]!
  return correctChar === lower ? pick : pick.toUpperCase()
}

let timeoutId = 0
let visible = true

function schedule(fn: () => void, delay: number) {
  timeoutId = window.setTimeout(fn, delay)
}

function typeStep() {
  if (revealCount.value >= totalChars) {
    schedule(eraseStep, 2200)
    return
  }

  const nextChar = flatText[revealCount.value] ?? ''
  if (!typoChar.value && /[a-zA-Z]/.test(nextChar) && Math.random() < 0.02) {
    typoChar.value = typoFor(nextChar)
    schedule(fixTypoStep, 130 + Math.random() * 180)
    return
  }

  revealCount.value++
  const atLineEnd = lineEndOffsets.includes(revealCount.value)
  const thinkPause = Math.random() < 0.05
  schedule(
    typeStep,
    atLineEnd ? 260 + Math.random() * 220 : thinkPause ? 160 + Math.random() * 220 : 18 + Math.random() * 34,
  )
}

function fixTypoStep() {
  typoChar.value = null
  schedule(typeStep, 70 + Math.random() * 90)
}

function eraseStep() {
  typoChar.value = null
  revealCount.value--
  if (revealCount.value <= 0) {
    revealCount.value = 0
    schedule(typeStep, 550)
    return
  }
  schedule(eraseStep, 9 + Math.random() * 12)
}

function stop() {
  clearTimeout(timeoutId)
  timeoutId = 0
}

function start() {
  stop()
  if (reducedMotion.value || !visible || document.hidden) return
  schedule(typeStep, 300)
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else start()
}

watch(reducedMotion, (isReduced) => {
  stop()
  typoChar.value = null
  if (isReduced) {
    revealCount.value = totalChars
    return
  }
  revealCount.value = 0
  start()
})

let intersectionObserver: IntersectionObserver | null = null

onMounted(() => {
  if (reducedMotion.value) {
    revealCount.value = totalChars
  } else {
    start()
  }

  if (panelRef.value) {
    intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) start()
      else stop()
    })
    intersectionObserver.observe(panelRef.value)
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  stop()
  intersectionObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <section
    id="top"
    class="relative isolate flex min-h-svh items-center overflow-hidden pt-24 pb-20 sm:pt-28"
    aria-labelledby="hero-title"
  >
    <HeroMesh class="-z-10" />
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-b from-transparent to-bg"
      aria-hidden="true"
    />

    <div
      class="container-page grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10"
    >
      <div class="hero-enter">
        <p class="mb-5 font-mono text-sm text-accent">{{ profile.greeting }}</p>
        <h1
          id="hero-title"
          class="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] text-fg min-[380px]:text-5xl sm:text-6xl lg:text-7xl"
        >
          {{ profile.name }}
        </h1>
        <p class="mt-4 text-xl font-medium tracking-tight text-muted sm:text-2xl">
          {{ profile.title }}
        </p>
        <p class="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {{ profile.intro }}
        </p>

        <div class="mt-9 flex flex-wrap items-center gap-3">
          <a href="#projects" class="btn btn-primary group">
            View my work
            <ArrowRight
              :size="16"
              class="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
          <a href="#contact" class="btn btn-secondary">Contact me</a>
        </div>

        <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ul class="-ml-2 flex items-center gap-1" aria-label="Profiles">
            <li v-for="social in socials" :key="social.platform">
              <a
                :href="social.url"
                target="_blank"
                rel="noopener noreferrer"
                class="icon-btn"
                :aria-label="`${social.label} (opens in a new tab)`"
                :title="social.label"
              >
                <BrandIcon :platform="social.platform" />
              </a>
            </li>
          </ul>
          <span class="h-5 w-px bg-line-strong" aria-hidden="true" />
          <p class="flex items-center gap-2 text-sm text-muted">
            <MapPin :size="16" aria-hidden="true" />
            {{ profile.location }}
          </p>
        </div>
      </div>

      <div class="hero-enter hero-enter-delayed hidden lg:block" aria-hidden="true">
        <div
          ref="panel"
          class="overflow-hidden rounded-2xl border border-line bg-surface/85 shadow-2xl shadow-black/5 backdrop-blur-md dark:shadow-black/40"
        >
          <div class="flex items-center justify-between border-b border-line px-4 py-3">
            <span class="font-mono text-xs text-subtle">Developer.kt</span>
            <span class="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent"
              >Kotlin</span
            >
          </div>
          <pre
            class="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-6"
          ><code><span v-for="(line, index) in visibleCode" :key="index" class="block"><span class="mr-5 inline-block w-4 text-right text-subtle/60 select-none">{{ index + 1 }}</span><span v-for="([text, kind], tokenIndex) in line" :key="tokenIndex" :class="tokenClass[kind]">{{ text }}</span><span v-if="typoChar && index === activeLineIndex" class="text-danger">{{ typoChar }}</span><span v-if="!reducedMotion && index === activeLineIndex" class="typing-cursor" aria-hidden="true"></span></span></code></pre>
        </div>
      </div>
    </div>

    <a
      href="#about"
      class="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 rounded-lg p-2 font-mono text-[11px] tracking-[0.2em] text-subtle uppercase transition-colors hover:text-fg sm:flex [@media(max-height:700px)]:hidden"
    >
      Scroll
      <ArrowDown :size="14" class="scroll-cue" aria-hidden="true" />
    </a>
  </section>
</template>

<style scoped>
.hero-enter {
  animation: hero-enter 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.hero-enter-delayed {
  animation-delay: 0.15s;
}

.scroll-cue {
  animation: scroll-cue 2.4s ease-in-out infinite;
}

.typing-cursor {
  display: inline-block;
  width: 0.5ch;
  height: 1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--accent);
  animation: cursor-blink 0.9s steps(1) infinite;
}

@keyframes cursor-blink {
  50% {
    opacity: 0;
  }
}

@keyframes hero-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@keyframes scroll-cue {
  50% {
    transform: translateY(3px);
  }
}
</style>
