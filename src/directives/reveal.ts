import type { Directive } from 'vue'

/**
 * `v-reveal` — fades an element in the first time it scrolls into view.
 * Optional value: a delay in milliseconds for simple staggering, e.g. `v-reveal="index * 60"`.
 *
 * Content is only hidden after JS has confirmed IntersectionObserver support, and the CSS
 * disables the effect entirely for `prefers-reduced-motion`.
 */

let observer: IntersectionObserver | null = null

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )
  return observer
}

export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    el.classList.add('reveal')
    getObserver().observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
