// Back / Forward (the browser button, the Android back gesture) with a
// dialog, drawer or sheet open on a phone or touch screen closes the topmost
// layer instead of leaving the page: the step is cancelled, so the URL
// stays. A persistent layer, a layer opened on a wide screen with a mouse,
// or no layer at all lets the step navigate as usual (see dismissTopLayer);
// pushes and replaces are never touched.
import type { Router } from 'vue-router'
import { dismissTopLayer } from '@sub2api/ui'

export function closeLayersOnBack(router: Router) {
  let historyStep = false
  // The history only reports Back / Forward steps (pushes and replaces go through the router).
  router.options.history.listen((_to, _from, info) => {
    historyStep = info.delta !== 0
  })
  router.beforeEach(() => {
    const step = historyStep
    historyStep = false
    return !(step && dismissTopLayer())
  })
}
