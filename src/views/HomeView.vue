<script setup lang="ts">
import About from '@/components/About.vue'
import AiDevelopment from '@/components/AiDevelopment.vue'
import Contact from '@/components/Contact.vue'
import Education from '@/components/Education.vue'
import Experience from '@/components/Experience.vue'
import Hero from '@/components/Hero.vue'
import Projects from '@/components/Projects.vue'
import Skills from '@/components/Skills.vue'
</script>

<template>
  <Hero />
  <About />
  <Skills />
  <!-- Experience and Education render nothing when their data is empty. -->
  <Experience />
  <Projects />
  <AiDevelopment />
  <Education />
  <Contact />
</template>
