import { onBeforeUnmount, onMounted, ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Reactive `prefers-reduced-motion` media query. */
export function useReducedMotion() {
  const reduced = ref(typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches)
  let media: MediaQueryList | undefined

  const update = (event: MediaQueryListEvent) => (reduced.value = event.matches)

  onMounted(() => {
    media = window.matchMedia?.(QUERY)
    media?.addEventListener('change', update)
  })

  onBeforeUnmount(() => media?.removeEventListener('change', update))

  return reduced
}
