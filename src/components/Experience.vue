<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'

import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'
import { formatMonthRange } from '@/utils/date'

const { experience } = portfolio
</script>

<template>
  <!-- Rendered only when `portfolio.experience` has entries. -->
  <section
    v-if="experience.length > 0"
    id="experience"
    class="section"
    aria-labelledby="experience-title"
  >
    <div class="container-page">
      <SectionHeading id="experience-title" eyebrow="Experience" title="Where I've worked" />

      <ol class="relative space-y-6 border-l border-line pl-6 sm:pl-10">
        <li
          v-for="(job, index) in experience"
          :key="`${job.company}-${job.start}`"
          v-reveal="index * 60"
          class="relative"
        >
          <!-- Dot centred on the timeline line (the list's left border). -->
          <span
            class="absolute top-7 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-accent-soft sm:-left-[45px]"
            aria-hidden="true"
          />
          <article class="card p-6 sm:p-7">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 class="text-lg font-semibold text-fg">
                {{ job.role }}
                <span class="text-muted"> · </span>
                <a
                  v-if="job.companyUrl"
                  :href="job.companyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-0.5 text-accent hover:underline"
                >
                  {{ job.company }}<ArrowUpRight :size="14" aria-hidden="true" />
                  <span class="sr-only">(opens in a new tab)</span>
                </a>
                <span v-else class="text-accent">{{ job.company }}</span>
              </h3>
              <p class="shrink-0 font-mono text-xs text-subtle">
                <time :datetime="job.start">{{ formatMonthRange(job.start, job.end) }}</time>
              </p>
            </div>
            <p v-if="job.location" class="mt-1 text-sm text-subtle">{{ job.location }}</p>
            <p class="mt-4 leading-relaxed text-muted">{{ job.description }}</p>
            <ul
              v-if="job.highlights?.length"
              class="mt-4 list-disc space-y-1.5 pl-5 text-muted marker:text-accent"
            >
              <li v-for="item in job.highlights" :key="item">{{ item }}</li>
            </ul>
            <ul
              v-if="job.technologies?.length"
              class="mt-5 flex flex-wrap gap-2"
              aria-label="Technologies"
            >
              <li v-for="tech in job.technologies" :key="tech" class="chip">{{ tech }}</li>
            </ul>
          </article>
        </li>
      </ol>
    </div>
  </section>
</template>
