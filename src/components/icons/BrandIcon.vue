<script setup lang="ts">
import { Mail } from '@lucide/vue'

import type { SocialPlatform } from '@/types/portfolio'

// Lucide no longer ships brand marks, so the few we need are drawn here in the same
// 24×24, 2px-stroke style as the rest of the icon set.
defineProps<{ platform: SocialPlatform; size?: number }>()
</script>

<template>
  <Mail v-if="platform === 'email'" :size="size ?? 20" aria-hidden="true" />
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="size ?? 20"
    :height="size ?? 20"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="platform === 'github'">
      <path
        d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
      />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </template>
    <template v-else-if="platform === 'linkedin'">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </template>
    <template v-else-if="platform === 'google-play'">
      <path d="M5 3.5v17a1 1 0 0 0 1.52.85l13.6-8.5a1 1 0 0 0 0-1.7L6.52 2.65A1 1 0 0 0 5 3.5z" />
      <path d="m5.4 3 9 9-9 9" />
      <path d="m14.4 12 2.6-2.6M14.4 12l2.6 2.6" />
    </template>
  </svg>
</template>
