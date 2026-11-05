/**
 * context/fpsMetrics.tsx
 *
 * FPS 指标 getter 的 Context Provider。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/fpsMetrics.tsx
 * pieces: chunk-swe0kb5q.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { statsContext } from "./stats.js";

//@ chunk-swe0kb5q.js:1812-1973 fingerprint (2.1.88 match: FpsMetricsProvider, 0.716)
/**
 * 向子树提供 getFpsMetrics。
 */
function FpsMetricsProvider(props) {
  let $ = useMemoCache(3);
  let { getFpsMetrics, children } = props;
  let t1;
  if ($[0] !== children || $[1] !== getFpsMetrics) {
    t1 = jsxProd_default(statsContext.Provider, {
      value: getFpsMetrics,
      children,
    });
    $[0] = children;
    $[1] = getFpsMetrics;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
export { FpsMetricsProvider };
