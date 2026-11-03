/**
 * components/design-system/ScrollColumn.tsx
 *
 * 可滚动列组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1kwgxcw6.js (4)
 * attribution: placement 4
 */
import { j, qt, R, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-1kwgxcw6.js:1290-1294 placement
j();
//@ chunk-1kwgxcw6.js:1294-1314 placement
var c = qt(null),
  NV = 1;
/**
 * 可滚动列容器：按终端行数和预留行数限制高度。
 */
//@ chunk-1kwgxcw6.js:1314-1717 placement
function ScrollColumn(l) {
  let u = w(10),
    { box: box, reserve: reserve, children: children } = l,
    r = R(null),
    t = box ?? r,
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    p;
  if (u[0] !== t || u[1] !== reserve || u[2] !== rows)
    ((p = { box: t, rows: rows, reserve: reserve }), (u[0] = t), (u[1] = reserve), (u[2] = rows), (u[3] = p));
  else p = u[3];
  let x;
  if (u[4] !== t || u[5] !== children)
    ((x = e(Box, { ref: t, flexDirection: "column", children: children })),
      (u[4] = t),
      (u[5] = children),
      (u[6] = x));
  else x = u[6];
  let m;
  if (u[7] !== p || u[8] !== x) ((m = e(c, { value: p, children: x })), (u[7] = p), (u[8] = x), (u[9] = m));
  else m = u[9];
  return m;
}
//@ chunk-1kwgxcw6.js:1717-1744 placement
function $V() {
  return Se(c);
}

export { $V, NV, ScrollColumn };
