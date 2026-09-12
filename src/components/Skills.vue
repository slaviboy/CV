<script setup lang="ts">
import {
  CodeXml,
  Database,
  FlaskConical,
  GitBranch,
  Layers,
  Network,
  Smartphone,
  Workflow,
} from '@lucide/vue'
import type { Component } from 'vue'

import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'
import type { SkillCategoryIcon } from '@/types/portfolio'

const icons: Record<SkillCategoryIcon, Component> = {
  languages: CodeXml,
  android: Smartphone,
  architecture: Layers,
  concurrency: Workflow,
  networking: Network,
  data: Database,
  testing: FlaskConical,
  tools: GitBranch,
}
</script>

<template>
  <section id="skills" class="section" aria-labelledby="skills-title">
    <div class="container-page">
      <SectionHeading
        id="skills-title"
        eyebrow="Skills"
        title="Tools of the trade"
        description="Native Android is my focus — from architecture and concurrency down to custom rendering."
      />

      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="(group, index) in portfolio.skillGroups"
          :key="group.title"
          v-reveal="(index % 4) * 60"
          class="card group p-5 transition-colors duration-300 hover:border-accent-line"
        >
          <h3 class="flex items-center gap-3 text-base font-semibold text-fg">
            <span
              class="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"
              aria-hidden="true"
            >
              <component :is="icons[group.icon]" :size="18" />
            </span>
            {{ group.title }}
          </h3>
          <ul class="mt-5 flex flex-wrap gap-2" :aria-label="`${group.title} skills`">
            <li v-for="skill in group.skills" :key="skill.name" class="chip text-[13px]">
              {{ skill.name }}
              <span v-if="skill.detail" class="ml-1 text-subtle">· {{ skill.detail }}</span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </section>
</template>
