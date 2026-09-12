<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight } from '@lucide/vue'

import BrandIcon from '@/components/icons/BrandIcon.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'
import type { ProjectCategory } from '@/types/portfolio'

type Filter = 'all' | ProjectCategory

const { projects, openSource, socials } = portfolio
const github = socials.find((social) => social.platform === 'github')

const filterLabels: Record<Filter, string> = { all: 'All', android: 'Android', web: 'Web' }

// GitHub's language colors.
const languageColors: Record<string, string> = {
  Kotlin: '#a97bff',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
}

// Only offer filters that actually have projects.
const filters = computed(() =>
  (['all', 'android', 'web'] as const)
    .map((value) => ({
      value,
      label: filterLabels[value],
      count:
        value === 'all' ? projects.length : projects.filter((p) => p.category === value).length,
    }))
    .filter((filter) => filter.count > 0),
)

const activeFilter = ref<Filter>('all')

const visibleProjects = computed(() =>
  activeFilter.value === 'all'
    ? projects
    : projects.filter((project) => project.category === activeFilter.value),
)
</script>

<template>
  <section id="projects" class="section" aria-labelledby="projects-title">
    <div class="container-page">
      <SectionHeading
        id="projects-title"
        eyebrow="Projects"
        title="Selected work"
        description="Apps and experiments I've built — from graphics-heavy Android apps to the web."
      />

      <div v-reveal class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter projects by platform" class="flex flex-wrap gap-2">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200"
            :class="
              activeFilter === filter.value
                ? 'border-fg bg-fg text-bg'
                : 'border-line-strong text-muted hover:border-fg/40 hover:text-fg'
            "
            :aria-pressed="activeFilter === filter.value"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
            <span class="ml-1 font-mono text-xs opacity-60">{{ filter.count }}</span>
          </button>
        </div>
        <p class="sr-only" aria-live="polite">
          Showing {{ visibleProjects.length }}
          {{ visibleProjects.length === 1 ? 'project' : 'projects' }}
        </p>
      </div>

      <TransitionGroup
        tag="ul"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        move-class="transition-transform duration-300"
      >
        <li v-for="project in visibleProjects" :key="project.id">
          <ProjectCard :project="project" />
        </li>
      </TransitionGroup>

      <div v-if="openSource.length > 0" class="mt-24">
        <div v-reveal class="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 class="text-2xl font-semibold tracking-tight text-fg">Open-source libraries</h3>
            <p class="mt-2 text-muted">A few of the Android libraries I share on GitHub.</p>
          </div>
          <a
            v-if="github"
            :href="github.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            <BrandIcon platform="github" :size="16" />
            All repositories
            <ArrowUpRight :size="14" aria-hidden="true" />
            <span class="sr-only">(opens in a new tab)</span>
          </a>
        </div>

        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="(repo, index) in openSource"
            :key="repo.url"
            v-reveal="(index % 3) * 60"
            class="card group relative flex flex-col p-5 transition-colors duration-300 hover:border-accent-line"
          >
            <h4
              class="flex items-center justify-between gap-2 font-mono text-sm font-medium text-fg"
            >
              <!-- Stretched link: the whole card opens the repository. -->
              <a
                :href="repo.url"
                target="_blank"
                rel="noopener noreferrer"
                class="after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {{ repo.name }}
                <span class="sr-only">on GitHub (opens in a new tab)</span>
              </a>
              <ArrowUpRight
                :size="16"
                class="text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                aria-hidden="true"
              />
            </h4>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-muted">{{ repo.description }}</p>
            <div class="mt-4 flex items-center justify-between gap-3 text-xs text-subtle">
              <span class="flex items-center gap-1.5">
                <span
                  class="size-2 rounded-full"
                  :style="{ backgroundColor: languageColors[repo.language] ?? 'var(--accent)' }"
                  aria-hidden="true"
                />
                {{ repo.language }}
              </span>
              <a
                v-if="repo.homepage"
                :href="repo.homepage"
                target="_blank"
                rel="noopener noreferrer"
                class="relative z-10 font-medium text-accent hover:underline"
              >
                Live site
                <span class="sr-only">for {{ repo.name }} (opens in a new tab)</span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
