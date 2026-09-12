import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY, useTheme } from '../composables/useTheme'

// Node 25+ ships its own experimental `localStorage` global that can shadow jsdom's, so the
// test provides an explicit in-memory Storage.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  }
}

describe('useTheme', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('toggles the theme, updates <html> and persists the choice', () => {
    const { theme, toggleTheme, setTheme } = useTheme()

    setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light')

    toggleTheme()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})
