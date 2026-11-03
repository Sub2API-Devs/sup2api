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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-kvpw3x0k.js:375-385 placement
var t = 150;
//@ chunk-kvpw3x0k.js:385-781 placement
function SpinnerColumn(M) {
  let p = w(8),
    { tone: tone, text: text } = M,
    T = usePrefersReducedMotion(),
    N = useIsScreenReaderEnabled(),
    o = T || N,
    [c, P] = useAnimationFrame(o ? null : t);
  const floored = Math.floor(P / t);
  let r;
  if (p[0] !== o || p[1] !== floored || p[2] !== text || p[3] !== tone)
    ((r = e(NoticeLine, {
      state: "live",
      tone: tone,
      text: text,
      linkify: !1,
      frame: floored,
      reducedMotion: o,
    })),
      (p[0] = o),
      (p[1] = floored),
      (p[2] = text),
      (p[3] = tone),
      (p[4] = r));
  else r = p[4];
  let m;
  if (p[5] !== c || p[6] !== r)
    ((m = e(Box, { ref: c, flexDirection: "column", children: r })), (p[5] = c), (p[6] = r), (p[7] = m));
  else m = p[7];
  return m;
}
//@ chunk-kvpw3x0k.js:781-791 placement
var lTe = 0;

export { lTe, SpinnerColumn };
