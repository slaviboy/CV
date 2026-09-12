import { defineConfig } from 'vitest/config'

// Standalone config so Vitest doesn't pick up the frontend's config from the repository root.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
