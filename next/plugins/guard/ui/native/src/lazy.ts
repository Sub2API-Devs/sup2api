import { defineAsyncComponent, h, type Component } from 'vue'
import { SSpinner } from '@sub2api/ui'

// Pages are split out of entry.js: the console loads every native entry at
// start-up, so only what a slot or register() needs stays in the entry and a
// page's code is fetched when the page is first opened. A failed fetch is
// retried twice before the page shows the console's error state.
const Loading: Component = { name: 'PageLoading', render: () => h('div', { class: 'flex justify-center py-16' }, [h(SSpinner)]) }

export function lazyPage(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({
    loader,
    loadingComponent: Loading,
    delay: 150,
    onError: (err, retry, fail, attempts) => (attempts <= 2 ? setTimeout(retry, 500 * attempts) : fail())
  })
}
