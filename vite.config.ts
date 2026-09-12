import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // The site is served from https://slaviboy.github.io/CV/ (a repository-based GitHub Pages site),
  // so every asset URL must be prefixed with the repository name.
  base: '/CV/',
  plugins: [vue(), tailwindcss(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    // Inline only tiny assets; images are emitted as hashed, cacheable files.
    assetsInlineLimit: 2048,
  },
})
