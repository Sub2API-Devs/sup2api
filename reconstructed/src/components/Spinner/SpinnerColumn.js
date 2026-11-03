/**
 * components/Spinner/SpinnerColumn.tsx
 *
 * 2.1.316 新增：Spinner 列布局组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kvpw3x0k.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "./spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-kvpw3x0k.js:375-385 placement
var SPINNER_COLUMN_TICK_MS = 150;
//@ chunk-kvpw3x0k.js:385-781 placement
function SpinnerColumn(props) {
  let p = w(8);
  let { tone, text } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let o = prefersReducedMotion || isScreenReaderEnabled;
  let [c, P] = useAnimationFrame(o ? null : SPINNER_COLUMN_TICK_MS);
  const frame = Math.floor(P / SPINNER_COLUMN_TICK_MS);
  let children;
  if (p[0] !== o || p[1] !== frame || p[2] !== text || p[3] !== tone) {
    children = jsxProd_default(NoticeLine, {
      state: "live",
      tone,
      text,
      linkify: false,
      frame,
      reducedMotion: o,
    });
    p[0] = o;
    p[1] = frame;
    p[2] = text;
    p[3] = tone;
    p[4] = children;
  } else children = p[4];
  let m;
  if (p[5] !== c || p[6] !== children) {
    m = jsxProd_default(Box, {
      ref: c,
      flexDirection: "column",
      children,
    });
    p[5] = c;
    p[6] = children;
    p[7] = m;
  } else m = p[7];
  return m;
}
//@ chunk-kvpw3x0k.js:781-791 placement
/**
 * 导出值：SPINNER_COLUMN_MIN_WIDTH（0）。
 */
var SPINNER_COLUMN_MIN_WIDTH = 0;
export { SPINNER_COLUMN_MIN_WIDTH, SpinnerColumn };
