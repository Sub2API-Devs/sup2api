/**
 * components/design-system/Table.tsx
 *
 * 表格组件 Table（列宽 fill/ratio/min/max、表头、Row）的前半部分（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2nmyajw8.js (13)
 * attribution: placement 13
 */
import {
  init_react_production,
  Fy,
  isValidElement_default,
  Kc,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { reactNodeText } from "../../utils/reactText.js";
import { clamp } from "../../ink/screen.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";

//@ chunk-2nmyajw8.js:567-571 placement
init_react_production();
//@ chunk-2nmyajw8.js:571-624 placement
function childArray(ce) {
  return Fy.toArray(ce.props.children);
}
//@ chunk-2nmyajw8.js:624-666 placement
function hasHeader(de) {
  return de.header !== undefined;
}
//@ chunk-2nmyajw8.js:666-699 placement
function headerOf(me) {
  return me.header;
}
//@ chunk-2nmyajw8.js:699-768 placement
/**
 * 表格列间距 2 与 fill 列的最小宽度 12。
 */
var TABLE_ALIGN_TO_FLEX = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};
var TABLE_COLUMN_GAP = 2;
var TABLE_FILL_MIN_WIDTH = 12;
//@ chunk-2nmyajw8.js:768-875 placement
function isTextLike(o) {
  if (typeof o === "string" || typeof o === "number") return true;
  if (isValidElement_default(o) && o.type === Kc) return true;
  return false;
}
//@ chunk-2nmyajw8.js:875-970 placement = StyledText (1)
function applyEmphasis(o, i, isHeader) {
  if (!isTextLike(o)) return o;
  return jsxProd_default(Text, {
    dimColor: i.dim && !isHeader,
    bold: i.bold || isHeader,
    children: o,
  });
}
//@ chunk-2nmyajw8.js:970-1001 placement
function nodeWidth(header) {
  return bunStringWidth(reactNodeText(header));
}
//@ chunk-2nmyajw8.js:1001-1575 placement
/**
 * 计算表格各列宽度：固定数字直接用，fill 先置 0，ratio 列按比例分配剩余宽度（扣除列间距），其余按内容最大宽度夹在 min/max 内。
 */
function computeColumnWidths(columns, rows, h, b) {
  let y = columns.length;
  let mapped = columns.map((column, l) => {
    let u = h ? nodeWidth(column.header) : 0;
    for (let d of rows) u = Math.max(u, nodeWidth(d[l]));
    return u;
  });
  let widths = Array(y);
  let a = [];
  for (let idx = 0; idx < y; idx++) {
    let width = columns[idx].width;
    if (width === "fill") widths[idx] = 0;
    else if (typeof width === "number") widths[idx] = width;
    else if (width && "ratio" in width && width.ratio !== undefined) {
      a.push(idx);
      widths[idx] = 0;
    } else if (width) widths[idx] = clamp(mapped[idx], width.min ?? 0, width.max ?? 1 / 0);
    else widths[idx] = mapped[idx];
  }
  if (a.length > 0) {
    let reduced = widths.reduce((acc, width) => acc + width, 0);
    let max = Math.max(0, b - TABLE_COLUMN_GAP * (y - 1) - reduced);
    let reduced_2 = a.reduce((acc, m) => acc + (columns[m].width.ratio ?? 0), 0);
    for (let d of a) {
      let width = columns[d].width;
      let f = reduced_2 > 0 ? Math.floor((max * (width.ratio ?? 0)) / reduced_2) : 0;
      widths[d] = clamp(f, width.min ?? 1, width.max ?? 1 / 0);
    }
  }
  return widths;
}
//@ chunk-2nmyajw8.js:1575-2503 placement
/**
 * 表格行：按列宽渲染单元格，最后一列可填满剩余宽度并换行。
 */
function TableRow(props) {
  let $ = w(16);
  let { cells, columns, widths, isHeader } = props;
  let c = columns.length - 1;
  let width = columns[c]?.width;
  let a =
    width === "fill"
      ? TABLE_FILL_MIN_WIDTH
      : width === undefined
        ? Math.min(TABLE_FILL_MIN_WIDTH, widths[c] ?? 0)
        : 0;
  const flexWrap = a > 0 ? "wrap" : "nowrap";
  let children;
  if (
    $[0] !== cells ||
    $[1] !== columns ||
    $[2] !== a ||
    $[3] !== isHeader ||
    $[4] !== c ||
    $[5] !== widths
  ) {
    let d;
    if ($[7] !== cells || $[8] !== a || $[9] !== isHeader || $[10] !== c || $[11] !== widths) {
      d = (m, f) =>
        m.width === "fill"
          ? jsxProd_default(
              Box,
              {
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                minWidth: f === c ? a : 1,
                justifyContent: TABLE_ALIGN_TO_FLEX[m.align ?? "start"],
                children: applyEmphasis(cells[f], m, isHeader),
              },
              f,
            )
          : jsxProd_default(
              Box,
              {
                width: widths[f] || undefined,
                flexShrink: f === c && m.width === undefined ? 1 : 0,
                flexBasis: f === c && a > 0 ? a : undefined,
                flexGrow: f === c && a > 0 ? 1 : 0,
                maxWidth: f === c && a > 0 ? widths[f] : undefined,
                justifyContent: TABLE_ALIGN_TO_FLEX[m.align ?? "start"],
                children: applyEmphasis(cells[f], m, isHeader),
              },
              f,
            );
      $[7] = cells;
      $[8] = a;
      $[9] = isHeader;
      $[10] = c;
      $[11] = widths;
      $[12] = d;
    } else d = $[12];
    children = columns.map(d);
    $[0] = cells;
    $[1] = columns;
    $[2] = a;
    $[3] = isHeader;
    $[4] = c;
    $[5] = widths;
    $[6] = children;
  } else children = $[6];
  let d;
  if ($[13] !== flexWrap || $[14] !== children) {
    d = jsxProd_default(Box, {
      flexDirection: "row",
      columnGap: TABLE_COLUMN_GAP,
      flexWrap,
      children,
    });
    $[13] = flexWrap;
    $[14] = children;
    $[15] = d;
  } else d = $[15];
  return d;
}
//@ chunk-2nmyajw8.js:2503-2612 placement
function TableRowGroup(props) {
  let h = w(2);
  let { children } = props;
  let b;
  if (h[0] !== children) {
    b = jsxProd_default(Fragment, {
      children,
    });
    h[0] = children;
    h[1] = b;
  } else b = h[1];
  return b;
}
//@ chunk-2nmyajw8.js:2612-3202 placement
/**
 * 表格组件：按终端宽度（或 forceWidth）计算列宽，有表头时先渲染表头行，再逐行渲染子元素的单元格。
 */
function Table(props) {
  let $ = w(12);
  let { columns, children, forceWidth } = props;
  let { columns: columns_2 } = useTerminalSize();
  let c = forceWidth ?? columns_2;
  let a;
  let flexDirection;
  let l;
  let u;
  if ($[0] !== children || $[1] !== columns || $[2] !== c) {
    let filtered = Fy.toArray(children).filter(isValidElement_default);
    let rows = filtered.map(childArray);
    let any = columns.some(hasHeader);
    let widths = computeColumnWidths(columns, rows, any, c);
    a = Box;
    flexDirection = "column";
    l =
      any &&
      jsxProd_default(TableRow, {
        cells: columns.map(headerOf),
        columns,
        widths,
        isHeader: true,
      });
    u = rows.map((cells, V) =>
      jsxProd_default(
        TableRow,
        {
          cells,
          columns,
          widths,
          isHeader: false,
        },
        filtered[V].key ?? V,
      ),
    );
    $[0] = children;
    $[1] = columns;
    $[2] = c;
    $[3] = a;
    $[4] = flexDirection;
    $[5] = l;
    $[6] = u;
  } else {
    a = $[3];
    flexDirection = $[4];
    l = $[5];
    u = $[6];
  }
  let X;
  if ($[7] !== a || $[8] !== flexDirection || $[9] !== l || $[10] !== u) {
    X = jsxProd_default_2(a, {
      flexDirection,
      children: [l, u],
    });
    $[7] = a;
    $[8] = flexDirection;
    $[9] = l;
    $[10] = u;
    $[11] = X;
  } else X = $[11];
  return X;
}
//@ chunk-2nmyajw8.js:3202-3234 placement = FlexDirection (1)
var FlexDirectionRow = Object.assign(Table, {
  Row: TableRowGroup,
});
export { FlexDirectionRow, TABLE_FILL_MIN_WIDTH };
