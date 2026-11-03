/**
 * context/fpsMetrics.tsx
 *
 * FPS 指标 getter 的 Context Provider。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/fpsMetrics.tsx
 * pieces: chunk-xe7zq1p4.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ie } from "./stats.js";

/**
 * 向子树提供 getFpsMetrics。
 */
//@ chunk-xe7zq1p4.js:1810-1971 fingerprint = FpsMetricsProvider (0.716)
function FpsMetricsProvider(t0) {
  let o = w(3),
    { getFpsMetrics: getFpsMetrics, children: children } = t0,
    t1;
  if (o[0] !== children || o[1] !== getFpsMetrics)
    ((t1 = e(ie.Provider, { value: getFpsMetrics, children: children })),
      (o[0] = children),
      (o[1] = getFpsMetrics),
      (o[2] = t1));
  else t1 = o[2];
  return t1;
}

export { FpsMetricsProvider };
