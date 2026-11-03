/**
 * components/LogoV2/FeedColumn.tsx
 *
 * 欢迎区右侧 Feed 列容器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/FeedColumn.tsx
 * pieces: chunk-9h8dr0qb.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UsageAttributionView } from "../Settings/Usage.js";

//@ chunk-9h8dr0qb.js:46092-46203 fingerprint = FeedColumn (0.552)
function FeedColumn(t0) {
  let $ = w(2),
    { maxWidth: maxWidth } = t0,
    h;
  if ($[0] !== maxWidth)
    ((h = e(UsageAttributionView, { maxWidth: maxWidth })), ($[0] = maxWidth), ($[1] = h));
  else h = $[1];
  return h;
}

export { FeedColumn };
