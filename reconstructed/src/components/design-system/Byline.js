/**
 * components/design-system/Byline.tsx
 *
 * 用 " · " 连接多个子元素的行内组件（被 140+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Byline.tsx
 * pieces: chunk-k1hxk1ex.js (5)
 * attribution: sole-consumer 4, callgraph-witnessed 1
 */
import { j, Kc, dh, Fy } from "../../../vendor/react/cjs/react.production.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-k1hxk1ex.js:380-384 sole-consumer
j();
//@ chunk-k1hxk1ex.js:384-388 sole-consumer
j();
//@ chunk-k1hxk1ex.js:388-416 sole-consumer
function y(s) {
  return s !== "";
}
//@ chunk-k1hxk1ex.js:416-519 sole-consumer
function renderBylineItem(o, a) {
  return r(
    Kc,
    { children: [a > 0 && e(Text, { dimColor: !0, children: " \xB7 " }), o] },
    dh(o) ? (o.key ?? a) : a,
  );
}
//@ chunk-k1hxk1ex.js:519-790 callgraph-witnessed = Byline (0.375)
function Byline(t0) {
  let $ = w(5),
    { children: children } = t0,
    i,
    c;
  if ($[0] !== children) {
    c = EARLY_RETURN_SENTINEL;
    T: {
      let filtered = Fy.toArray(children).filter(y);
      if (filtered.length === 0) {
        c = null;
        break T;
      }
      i = filtered.map(renderBylineItem);
    }
    (($[0] = children), ($[1] = i), ($[2] = c));
  } else ((i = $[1]), (c = $[2]));
  if (c !== EARLY_RETURN_SENTINEL) return c;
  let f;
  if ($[3] !== i) ((f = e(Fragment, { children: i })), ($[3] = i), ($[4] = f));
  else f = $[4];
  return f;
}

export { Byline };
