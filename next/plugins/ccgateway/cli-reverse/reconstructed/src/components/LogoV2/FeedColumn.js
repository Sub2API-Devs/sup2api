/**
 * components/LogoV2/FeedColumn.tsx
 *
 * 欢迎区右侧 Feed 列容器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/FeedColumn.tsx
 * pieces: chunk-j6tt9nsa.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UsageAttributionView } from "../Settings/Usage.js";

//@ chunk-j6tt9nsa.js:46028-46139 fingerprint (2.1.88 match: FeedColumn, 0.551)
function FeedColumn(props) {
  let $ = useMemoCache(2);
  let { maxWidth } = props;
  let column;
  if ($[0] !== maxWidth) {
    column = jsxProd_default(UsageAttributionView, {
      maxWidth,
    });
    $[0] = maxWidth;
    $[1] = column;
  } else column = $[1];
  return column;
}
export { FeedColumn };
