<script setup lang="ts">
import { ArrowDown, ArrowRight, MapPin } from '@lucide/vue'

import HeroMesh from '@/components/HeroMesh.vue'
import BrandIcon from '@/components/icons/BrandIcon.vue'
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
  ...profile.focus.map<Line>((item) => [
    [`        "${item}"`, 'string'],
    [',', 'plain'],
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
          ><code><span v-for="(line, index) in code" :key="index" class="block"><span class="mr-5 inline-block w-4 text-right text-subtle/60 select-none">{{ index + 1 }}</span><span v-for="([text, kind], tokenIndex) in line" :key="tokenIndex" :class="tokenClass[kind]">{{ text }}</span></span></code></pre>
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
