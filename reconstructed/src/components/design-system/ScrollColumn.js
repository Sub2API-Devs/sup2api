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
import { init_react_production, qt, R, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-1kwgxcw6.js:1290-1294 placement
init_react_production();
//@ chunk-1kwgxcw6.js:1294-1314 placement
/**
 * ScrollColumn 的 context（当前滚动值）与最小行数 1。
 */
var SCROLL_COLUMN_CONTEXT = qt(null);
var SCROLL_COLUMN_MIN_ROWS = 1;
//@ chunk-1kwgxcw6.js:1314-1717 placement
/**
 * 可滚动列容器：按终端行数和预留行数限制高度。
 */
function ScrollColumn(props) {
  let u = w(10);
  let { box, reserve, children } = props;
  let r = R(null);
  let t = box ?? r;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let value;
  if (u[0] !== t || u[1] !== reserve || u[2] !== rows) {
    value = {
      box: t,
      rows,
      reserve,
    };
    u[0] = t;
    u[1] = reserve;
    u[2] = rows;
    u[3] = value;
  } else value = u[3];
  let children_2;
  if (u[4] !== t || u[5] !== children) {
    children_2 = jsxProd_default(Box, {
      ref: t,
      flexDirection: "column",
      children,
    });
    u[4] = t;
    u[5] = children;
    u[6] = children_2;
  } else children_2 = u[6];
  let m;
  if (u[7] !== value || u[8] !== children_2) {
    m = jsxProd_default(SCROLL_COLUMN_CONTEXT, {
      value,
      children: children_2,
    });
    u[7] = value;
    u[8] = children_2;
    u[9] = m;
  } else m = u[9];
  return m;
}
//@ chunk-1kwgxcw6.js:1717-1744 placement
/**
 * 读 ScrollColumn context 的 hook。
 */
function useScrollColumnContext() {
  return Se(SCROLL_COLUMN_CONTEXT);
}
export { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS, ScrollColumn };
