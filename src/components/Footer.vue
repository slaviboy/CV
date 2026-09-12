<script setup lang="ts">
import { ArrowUp } from '@lucide/vue'

import BrandIcon from '@/components/icons/BrandIcon.vue'
import LogoMark from '@/components/icons/LogoMark.vue'
import { portfolio } from '@/data/portfolio'
import { sections } from '@/data/sections'

const { profile, socials } = portfolio
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-line">
    <div
      class="container-page flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between"
    >
      <div class="max-w-sm">
        <a href="#top" class="inline-flex items-center gap-2.5 rounded-lg text-fg">
          <span class="text-accent"><LogoMark :size="22" /></span>
          <span class="font-semibold">{{ profile.name }}</span>
          <span class="sr-only">— back to top</span>
        </a>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          {{ profile.title }} · {{ profile.location }}
        </p>
      </div>

      <nav aria-label="Footer">
        <ul class="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <li v-for="section in sections" :key="section.id">
            <a :href="`#${section.id}`" class="text-muted transition-colors hover:text-fg">
              {{ section.label }}
            </a>
          </li>
        </ul>
      </nav>

      <ul class="-ml-2 flex items-center gap-1 md:ml-0" aria-label="Profiles">
        <li>
          <a :href="`mailto:${profile.email}`" class="icon-btn" aria-label="Email" title="Email">
            <BrandIcon platform="email" />
          </a>
        </li>
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
    </div>

    <div
      class="container-page flex flex-col-reverse gap-4 border-t border-line py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between"
    >
      <p>© {{ year }} {{ profile.name }}. Built with Vue &amp; Tailwind CSS.</p>
      <a
        href="#top"
        class="inline-flex items-center gap-1.5 self-start rounded transition-colors hover:text-fg sm:self-auto"
      >
        Back to top <ArrowUp :size="14" aria-hidden="true" />
      </a>
    </div>
  </footer>
</template>
