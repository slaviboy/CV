<script setup lang="ts">
import ProjectCard from '@/components/ProjectCard.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'

const { intro, projects } = portfolio.aiDevelopment
</script>

<template>
  <section v-if="projects.length > 0" id="ai" class="section" aria-labelledby="ai-title">
    <div class="container-page">
      <SectionHeading
        id="ai-title"
        eyebrow="AI development"
        title="Building with Claude"
        :description="intro"
      />

      <ul class="grid gap-6 sm:grid-cols-2">
        <li v-for="(project, index) in projects" :key="project.id" v-reveal="(index % 2) * 80">
          <ProjectCard :project="project" badge="Built with Claude" />
        </li>
      </ul>
    </div>
  </section>
</template>
