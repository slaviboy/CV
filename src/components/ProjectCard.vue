<script setup lang="ts">
import { computed } from 'vue'
import { CirclePlay, Globe, Sparkles } from '@lucide/vue'

import BrandIcon from '@/components/icons/BrandIcon.vue'
import { useTheme } from '@/composables/useTheme'
import type { Project, ProjectLinkKind } from '@/types/portfolio'

const props = defineProps<{
  project: Project
  /** Optional label shown over the screenshot, e.g. "Built with Claude". */
  badge?: string
  /** When set, the whole card links to the matching link kind (e.g. the GitHub source). */
  stretchedLink?: ProjectLinkKind
}>()

const { isDark } = useTheme()

const stretchedLinkUrl = computed(
  () => props.project.links.find((link) => link.kind === props.stretchedLink)?.url,
)

const categoryLabel = { android: 'Android', web: 'Web' } as const

const linkDescription: Record<ProjectLinkKind, string> = {
  source: 'on GitHub',
  demo: 'in the browser',
  store: 'on Google Play',
  video: 'on YouTube',
}
</script>

<template>
  <article
    class="card group relative flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-accent-line hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30"
  >
    <div class="relative aspect-32/21 overflow-hidden border-b border-line bg-surface-2">
      <img
        v-if="project.image"
        :src="isDark && project.image.darkSrc ? project.image.darkSrc : project.image.src"
        :alt="project.image.alt"
        :width="project.image.width"
        :height="project.image.height"
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      <span
        v-if="badge"
        class="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
      >
        <Sparkles :size="13" class="text-[#3ddc84]" aria-hidden="true" />
        {{ badge }}
      </span>
    </div>

    <div class="flex flex-1 flex-col p-6">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold tracking-tight text-fg">
          <a
            v-if="stretchedLinkUrl"
            :href="stretchedLinkUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="after:absolute after:inset-0 after:content-['']"
          >
            {{ project.name }}
            <span class="sr-only">{{ linkDescription[stretchedLink!] }} (opens in a new tab)</span>
          </a>
          <template v-else>{{ project.name }}</template>
        </h3>
        <span class="font-mono text-[11px] tracking-wider text-subtle uppercase">
          {{ categoryLabel[project.category] }}
        </span>
      </div>

      <p class="mt-3 flex-1 leading-relaxed text-muted">{{ project.description }}</p>

      <ul class="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
        <li v-for="tech in project.technologies" :key="tech" class="chip">{{ tech }}</li>
      </ul>

      <ul
        v-if="project.links.length > 0"
        class="relative z-10 mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5"
      >
        <li v-for="link in project.links" :key="link.url">
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg transition-colors hover:text-accent"
          >
            <BrandIcon v-if="link.kind === 'source'" platform="github" :size="16" />
            <BrandIcon v-else-if="link.kind === 'store'" platform="google-play" :size="16" />
            <CirclePlay v-else-if="link.kind === 'video'" :size="16" aria-hidden="true" />
            <Globe v-else :size="16" aria-hidden="true" />
            {{ link.label }}
            <span class="sr-only">
              for {{ project.name }} {{ linkDescription[link.kind] }} (opens in a new tab)
            </span>
          </a>
        </li>
      </ul>
    </div>
  </article>
</template>
