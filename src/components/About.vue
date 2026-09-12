<script setup lang="ts">
import { Download, Languages, MapPin } from '@lucide/vue'
import { ref } from 'vue'

import portrait from '@/assets/images/portrait.webp'
import MatrixRain from '@/components/MatrixRain.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'

const { profile, stats } = portfolio
const cvUrl = profile.cvPdfPath ? `${import.meta.env.BASE_URL}${profile.cvPdfPath}` : undefined

const isPortraitHovered = ref(false)
</script>

<template>
  <section id="about" class="section" aria-labelledby="about-title">
    <div class="container-page">
      <SectionHeading id="about-title" eyebrow="About" title="A bit about me" />

      <div class="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <figure v-reveal class="relative mx-auto w-full max-w-xs md:mx-0 md:max-w-none">
          <div
            class="absolute -inset-3 -z-10 rounded-[1.75rem] border border-dashed border-accent-line"
            aria-hidden="true"
          />
          <div
            class="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-line bg-surface-2"
            @pointerenter="isPortraitHovered = true"
            @pointerleave="isPortraitHovered = false"
          >
            <img
              :src="portrait"
              :alt="`Portrait of ${profile.name}`"
              width="408"
              height="612"
              loading="lazy"
              decoding="async"
              class="size-full object-cover object-top"
            />
            <div
              class="pointer-events-none absolute inset-0 bg-black transition-opacity duration-500"
              :class="isPortraitHovered ? 'opacity-55' : 'opacity-0'"
              aria-hidden="true"
            />
            <MatrixRain
              :active="isPortraitHovered"
              class="pointer-events-none absolute inset-0 transition-opacity duration-500"
              :class="isPortraitHovered ? 'opacity-100' : 'opacity-0'"
            />
          </div>
        </figure>

        <div class="flex flex-col justify-center">
          <div v-reveal="80" class="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
            <p v-for="(paragraph, index) in profile.about" :key="index">{{ paragraph }}</p>
          </div>

          <dl v-reveal="140" class="mt-10 grid grid-cols-2 gap-4">
            <div v-for="stat in stats" :key="stat.label" class="card flex flex-col px-5 py-5">
              <dt class="text-sm text-muted">{{ stat.label }}</dt>
              <dd
                class="order-first mb-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl"
              >
                {{ stat.value }}
              </dd>
            </div>
          </dl>

          <ul
            v-reveal="200"
            class="mt-8 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:gap-8"
          >
            <li class="flex items-center gap-2">
              <MapPin :size="16" class="text-accent" aria-hidden="true" />
              {{ profile.location }}
            </li>
            <li class="flex items-center gap-2">
              <Languages :size="16" class="text-accent" aria-hidden="true" />
              <span
                ><span class="sr-only">Speaks </span>{{ profile.spokenLanguages.join(' · ') }}</span
              >
            </li>
          </ul>

          <div v-reveal="260" class="mt-10 flex flex-wrap gap-3">
            <a v-if="cvUrl" :href="cvUrl" class="btn btn-secondary" download type="application/pdf">
              <Download :size="16" aria-hidden="true" />
              Download CV
              <span class="text-xs text-subtle">(PDF)</span>
            </a>
            <a href="#contact" class="btn text-accent hover:bg-accent-soft">Get in touch</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
