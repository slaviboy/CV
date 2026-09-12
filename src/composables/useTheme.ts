import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const isBrowser = typeof window !== 'undefined'

function readStoredTheme(): Theme | null {
  if (!isBrowser) return null
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    // Storage can be unavailable (privacy mode, blocked cookies) — fall back to the system theme.
    return null
  }
}

function readSystemTheme(): Theme {
  return isBrowser && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

// Module-level state: every component shares a single theme.
const storedTheme = ref<Theme | null>(readStoredTheme())
const systemTheme = ref<Theme>(readSystemTheme())
const theme = computed<Theme>(() => storedTheme.value ?? systemTheme.value)

let initialized = false

function applyTheme(value: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', value === 'dark')

  // Keep the browser UI (mobile address bar) in sync with the page background.
  const background = getComputedStyle(root).getPropertyValue('--bg').trim()
  if (background) {
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => (meta.content = background))
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function init() {
  if (initialized || !isBrowser) return
  initialized = true

  applyTheme(theme.value)

  // Follow live OS changes for as long as the visitor hasn't picked a theme explicitly.
  window.matchMedia?.(DARK_QUERY).addEventListener('change', (event) => {
    systemTheme.value = event.matches ? 'dark' : 'light'
    if (!storedTheme.value) applyTheme(theme.value)
  })
}

function setTheme(value: Theme) {
  storedTheme.value = value
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Ignore — the choice still applies for this visit.
  }

  const update = () => applyTheme(value)
  if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
    document.startViewTransition(update)
  } else {
    update()
  }
}

export function useTheme() {
  init()

  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    setTheme,
    toggleTheme: () => setTheme(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
