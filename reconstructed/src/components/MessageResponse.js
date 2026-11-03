/**
 * components/MessageResponse.tsx
 *
 * 工具结果/子输出的缩进容器（"⎿" 前缀），带 aria-hidden 与嵌套去重。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageResponse.tsx
 * pieces: chunk-wq9366y3.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { j, Se, qt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../ink/components/Input.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ratchet } from "./design-system/Ratchet.js";

//@ chunk-wq9366y3.js:380-384 placement
j();
//@ chunk-wq9366y3.js:384-388 placement
j();
/**
 * 工具结果缩进容器：首行前缀 "⎿"，嵌套时不重复；前缀 aria-hidden；被 100+ 处使用。
 */
//@ chunk-wq9366y3.js:388-1065 fingerprint = MessageResponse (0.639)
function MessageResponse(t0) {
  let $ = w(11),
    { children: children, height: height, screenReaderLabel: screenReaderLabel } = t0;
  if (Se(InMessageResponseContext)) {
    return children;
  }
  const R = screenReaderLabel === void 0;
  let d;
  if ($[0] !== screenReaderLabel || $[1] !== R)
    ((d = e(NoSelect, {
      fromLeftEdge: !0,
      flexShrink: 0,
      children: r(Text, {
        "aria-hidden": R,
        "aria-label": screenReaderLabel,
        dimColor: !0,
        children: ["  ", "\u23BF \xA0"],
      }),
    })),
      ($[0] = screenReaderLabel),
      ($[1] = R),
      ($[2] = d));
  else d = $[2];
  let l;
  if ($[3] !== children)
    ((l = e(Box, { flexShrink: 1, flexGrow: 1, children: children })), ($[3] = children), ($[4] = l));
  else l = $[4];
  let x;
  if ($[5] !== height || $[6] !== d || $[7] !== l)
    ((x = e(InMessageResponseProvider, {
      children: r(Box, { flexDirection: "row", height: height, overflowY: "hidden", children: [d, l] }),
    })),
      ($[5] = height),
      ($[6] = d),
      ($[7] = l),
      ($[8] = x));
  else x = $[8];
  let content = x;
  if (height !== void 0) {
    return content;
  }
  let L;
  if ($[9] !== content)
    ((L = e(Ratchet, { lock: "offscreen", children: content })), ($[9] = content), ($[10] = L));
  else L = $[10];
  return L;
}
//@ chunk-wq9366y3.js:1065-1078 placement
var InMessageResponseContext = qt(!1);
//@ chunk-wq9366y3.js:1078-1106 placement
function Hmt() {
  return Se(InMessageResponseContext);
}
//@ chunk-wq9366y3.js:1106-1233 placement
function InMessageResponseProvider(m) {
  let c = w(2),
    { children: children } = m,
    i;
  if (c[0] !== children)
    ((i = e(InMessageResponseContext.Provider, { value: !0, children: children })),
      (c[0] = children),
      (c[1] = i));
  else i = c[1];
  return i;
}

export { MessageResponse, Hmt };
