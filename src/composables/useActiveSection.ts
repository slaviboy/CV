import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Tracks which page section is currently in the middle of the viewport, so the navigation can
 * highlight it. Uses a single IntersectionObserver instead of scroll listeners.
 */
export function useActiveSection(sectionIds: Ref<string[]>) {
  const activeId = ref<string | null>(null)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!('IntersectionObserver' in window)) return

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activeId.value = entry.target.id
        }
      },
      // A thin band across the middle of the viewport decides the active section.
      { rootMargin: '-45% 0px -50% 0px' },
    )

    for (const id of sectionIds.value) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }

    // The hero is not a nav item; clear the highlight when scrolled back to the top.
    const hero = document.getElementById('top')
    if (hero) observer.observe(hero)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return activeId
}
