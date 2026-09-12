<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { Menu, X } from '@lucide/vue'

import LogoMark from '@/components/icons/LogoMark.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useActiveSection } from '@/composables/useActiveSection'
import { portfolio } from '@/data/portfolio'
import { sections } from '@/data/sections'

const activeId = useActiveSection(ref(sections.map((section) => section.id)))

const menuOpen = ref(false)
const scrolled = ref(false)
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const menuPanel = useTemplateRef<HTMLElement>('menuPanel')

function closeMenu({ restoreFocus = false } = {}) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (restoreFocus) menuButton.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu({ restoreFocus: true })
}

function onScroll() {
  scrolled.value = window.scrollY > 8
}

// Close the mobile menu when the viewport grows past the breakpoint.
const desktop = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null
const onBreakpoint = (event: MediaQueryListEvent) => event.matches && closeMenu()

watch(menuOpen, async (open) => {
  if (!open) return
  await nextTick()
  menuPanel.value?.querySelector<HTMLElement>('a')?.focus()
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  desktop?.addEventListener('change', onBreakpoint)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  desktop?.removeEventListener('change', onBreakpoint)
})
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300"
    :class="
      scrolled || menuOpen
        ? 'border-line bg-bg/80 backdrop-blur-lg backdrop-saturate-150'
        : 'border-transparent bg-transparent'
    "
  >
    <nav class="container-page flex h-16 items-center justify-between" aria-label="Primary">
      <a
        href="#top"
        class="-ml-1 flex items-center gap-2.5 rounded-lg px-1 py-1 text-fg"
        @click="closeMenu()"
      >
        <span class="text-accent"><LogoMark :size="24" /></span>
        <span class="font-mono text-sm font-medium tracking-tight">{{
          portfolio.profile.nickname
        }}</span>
        <span class="sr-only">— {{ portfolio.profile.name }}, back to top</span>
      </a>

      <div class="flex items-center gap-1">
        <ul class="mr-2 hidden items-center gap-1 md:flex">
          <li v-for="section in sections" :key="section.id">
            <a
              :href="`#${section.id}`"
              class="relative rounded-full px-3 py-2 text-sm transition-colors duration-200"
              :class="activeId === section.id ? 'text-fg' : 'text-muted hover:text-fg'"
              :aria-current="activeId === section.id ? 'location' : undefined"
            >
              {{ section.label }}
              <span
                class="absolute inset-x-3 -bottom-px h-px origin-left bg-accent transition-transform duration-300"
                :class="activeId === section.id ? 'scale-x-100' : 'scale-x-0'"
                aria-hidden="true"
              />
            </a>
          </li>
        </ul>

        <ThemeToggle />

        <button
          ref="menuButton"
          type="button"
          class="icon-btn md:hidden"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="20" aria-hidden="true" />
          <Menu v-else :size="20" aria-hidden="true" />
        </button>
      </div>
    </nav>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="menuOpen" id="mobile-menu" ref="menuPanel" class="border-t border-line md:hidden">
        <ul class="container-page flex flex-col py-3">
          <li v-for="section in sections" :key="section.id">
            <a
              :href="`#${section.id}`"
              class="flex items-center justify-between rounded-lg px-2 py-3 text-base transition-colors"
              :class="activeId === section.id ? 'text-accent' : 'text-fg hover:text-accent'"
              :aria-current="activeId === section.id ? 'location' : undefined"
              @click="closeMenu()"
            >
              {{ section.label }}
            </a>
          </li>
        </ul>
      </div>
    </Transition>
  </header>
</template>
