<script setup lang="ts">
import { vReveal } from '@/directives/reveal'

defineProps<{
  /** Id of the <h2>, referenced by the section's aria-labelledby. */
  id: string
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <header v-reveal class="mb-12 max-w-2xl sm:mb-16">
    <p
      class="mb-3 flex items-center gap-3 font-mono text-xs font-medium tracking-[0.18em] text-accent uppercase"
    >
      <span class="h-px w-6 bg-accent" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <h2 :id="id" class="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
      {{ title }}
    </h2>
    <p v-if="description" class="mt-4 text-base leading-relaxed text-muted sm:text-lg">
      {{ description }}
    </p>
  </header>
</template>
