<script setup lang="ts">
import { ArrowUpRight, BadgeCheck, GraduationCap, School } from '@lucide/vue'

import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'
import { formatMonth, formatMonthRange } from '@/utils/date'

const { education, certifications } = portfolio
</script>

<template>
  <section
    v-if="education.length > 0 || certifications.length > 0"
    id="education"
    class="section"
    aria-labelledby="education-title"
  >
    <div class="container-page">
      <SectionHeading id="education-title" eyebrow="Education" title="Where I studied" />

      <ol class="grid gap-4 md:grid-cols-2">
        <li
          v-for="(item, index) in education"
          :key="item.institution"
          v-reveal="index * 80"
          class="card flex gap-5 p-6 sm:p-7"
        >
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
            aria-hidden="true"
          >
            <GraduationCap v-if="item.kind === 'university'" :size="20" />
            <School v-else :size="20" />
          </span>
          <div>
            <p class="font-mono text-xs text-subtle">
              <time :datetime="item.start">{{ formatMonthRange(item.start, item.end) }}</time>
            </p>
            <h3 class="mt-2 text-lg font-semibold text-fg">{{ item.degree }}</h3>
            <p class="mt-1 text-muted">{{ item.institution }}</p>
            <p class="mt-0.5 text-sm text-subtle">{{ item.location }}</p>
          </div>
        </li>
      </ol>

      <!-- Shown only when certifications are added to the data file. -->
      <div v-if="certifications.length > 0" class="mt-16">
        <h3 class="mb-6 text-xl font-semibold tracking-tight text-fg">Certifications</h3>
        <ul class="grid gap-4 md:grid-cols-2">
          <li
            v-for="cert in certifications"
            :key="cert.name"
            v-reveal
            class="card flex items-start gap-4 p-5"
          >
            <BadgeCheck :size="20" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <div class="min-w-0">
              <p class="font-medium text-fg">{{ cert.name }}</p>
              <p class="text-sm text-muted">
                {{ cert.issuer }} · <time :datetime="cert.date">{{ formatMonth(cert.date) }}</time>
              </p>
              <a
                v-if="cert.credentialUrl"
                :href="cert.credentialUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                View credential <ArrowUpRight :size="14" aria-hidden="true" />
                <span class="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
