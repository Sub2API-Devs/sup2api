import { defineAsyncComponent, h, type Component } from 'vue'
import SSpinner from './SSpinner.vue'

// Native plugin pages are split out of entry.js: the console loads every
// native entry at start-up, so only what a slot or register() needs stays in
// the entry and a page's code is fetched when the page is first opened. A
// failed fetch is retried twice before the page shows the console's error state.
const Loading: Component = { name: 'PageLoading', render: () => h('div', { class: 'flex justify-center py-16' }, [h(SSpinner)]) }

const RETRIES = 2

// The retries live in the loader rather than in defineAsyncComponent's
// onError: Vue keeps that attempt counter for the component's whole lifetime,
// so after one full failure every later mount (the page's Retry button, a
// revisit) would try only once. Here each mount starts a fresh round.
async function withRetry<T>(loader: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await loader()
    } catch (e) {
      if (i >= RETRIES) throw e
      await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
}

export function lazyPage(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({
    loader: () => withRetry(loader),
    loadingComponent: Loading,
    delay: 150
  })
}
