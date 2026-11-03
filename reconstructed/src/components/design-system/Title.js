/**
 * components/design-system/Title.tsx
 *
 * 2.1.316 新增。设计系统标题组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7ga9pgfv.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

/**
 * 标题组件：粗体标题加可选副标题。
 */
//@ chunk-7ga9pgfv.js:300-616 placement
function Title(p) {
  let $ = w(7),
    { children: children, subtitle: subtitle } = p,
    o;
  if ($[0] !== children) ((o = e(Text, { bold: !0, children: children })), ($[0] = children), ($[1] = o));
  else o = $[1];
  let c;
  if ($[2] !== subtitle)
    ((c = subtitle && e(Text, { dimColor: !0, children: subtitle })), ($[2] = subtitle), ($[3] = c));
  else c = $[3];
  let a;
  if ($[4] !== o || $[5] !== c)
    ((a = r(Box, { flexDirection: "column", children: [o, c] })), ($[4] = o), ($[5] = c), ($[6] = a));
  else a = $[6];
  return a;
}

export { Title };
