/**
 * components/design-system/ScrollColumn.tsx
 *
 * 可滚动列组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2nf232h2.js (4)
 * attribution: placement 4
 */
import {
  init_react_production,
  createContext,
  useRef,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2nf232h2.js:1290-1294 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2nf232h2.js:1290", () => {
  init_react_production();
});
//@ chunk-2nf232h2.js:1294-1314 placement
/**
 * ScrollColumn 的 context（当前滚动值）与最小行数 1。
 */
var SCROLL_COLUMN_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCROLL_COLUMN_MIN_ROWS;
deferInit("chunk-2nf232h2.js:1294", () => {
  SCROLL_COLUMN_CONTEXT = createContext(null);
  SCROLL_COLUMN_MIN_ROWS = 1;
});
//@ chunk-2nf232h2.js:1314-1717 placement
/**
 * 可滚动列容器：按终端行数和预留行数限制高度。
 */
function ScrollColumn(props) {
  let $ = useMemoCache(10);
  let { box, reserve, children } = props;
  let localRef = useRef(null);
  let boxRef = box ?? localRef;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let value;
  if ($[0] !== boxRef || $[1] !== reserve || $[2] !== rows) {
    value = {
      box: boxRef,
      rows,
      reserve,
    };
    $[0] = boxRef;
    $[1] = reserve;
    $[2] = rows;
    $[3] = value;
  } else value = $[3];
  let children_2;
  if ($[4] !== boxRef || $[5] !== children) {
    children_2 = jsxProd_default(Box, {
      ref: boxRef,
      flexDirection: "column",
      children,
    });
    $[4] = boxRef;
    $[5] = children;
    $[6] = children_2;
  } else children_2 = $[6];
  let contextValue;
  if ($[7] !== value || $[8] !== children_2) {
    contextValue = jsxProd_default(SCROLL_COLUMN_CONTEXT, {
      value,
      children: children_2,
    });
    $[7] = value;
    $[8] = children_2;
    $[9] = contextValue;
  } else contextValue = $[9];
  return contextValue;
}
//@ chunk-2nf232h2.js:1717-1744 placement
/**
 * 读 ScrollColumn context 的 hook。
 */
function useScrollColumnContext() {
  return useContext(SCROLL_COLUMN_CONTEXT);
}
export { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS, ScrollColumn };
