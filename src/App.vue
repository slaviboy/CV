<script setup lang="ts">
import Footer from '@/components/Footer.vue'
import Navbar from '@/components/Navbar.vue'
import HomeView from '@/views/HomeView.vue'
</script>

<template>
  <a
    href="#main"
    class="sr-only z-100 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
  >
    Skip to content
  </a>
  <Navbar />
  <main id="main" tabindex="-1" class="outline-none">
    <HomeView />
  </main>
  <Footer />
</template>
