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
  childrenExport,
  isValidElement_default,
  fragmentTypeExport,
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2nmyajw8.js:567-571 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2nmyajw8.js:567", () => {
  init_react_production();
});
//@ chunk-2nmyajw8.js:571-624 placement
function childArray(cell) {
  return childrenExport.toArray(cell.props.children);
}
//@ chunk-2nmyajw8.js:624-666 placement
function hasHeader(row) {
  return row.header !== undefined;
}
//@ chunk-2nmyajw8.js:666-699 placement
function headerOf(row) {
  return row.header;
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
function isTextLike(cell) {
  if (typeof cell === "string" || typeof cell === "number") return true;
  if (isValidElement_default(cell) && cell.type === fragmentTypeExport) return true;
  return false;
}
//@ chunk-2nmyajw8.js:875-970 placement = StyledText (1)
function applyEmphasis(cell, style, isHeader) {
  if (!isTextLike(cell)) return cell;
  return jsxProd_default(Text, {
    dimColor: style.dim && !isHeader,
    bold: style.bold || isHeader,
    children: cell,
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
function computeColumnWidths(columns, rows, hasHeaders, totalWidth) {
  let columnCount = columns.length;
  let mapped = columns.map((column, columnIndex) => {
    let maxWidth = hasHeaders ? nodeWidth(column.header) : 0;
    for (let row of rows) maxWidth = Math.max(maxWidth, nodeWidth(row[columnIndex]));
    return maxWidth;
  });
  let widths = Array(columnCount);
  let fillIndexes = [];
  for (let idx = 0; idx < columnCount; idx++) {
    let width = columns[idx].width;
    if (width === "fill") widths[idx] = 0;
    else if (typeof width === "number") widths[idx] = width;
    else if (width && "ratio" in width && width.ratio !== undefined) {
      fillIndexes.push(idx);
      widths[idx] = 0;
    } else if (width) widths[idx] = clamp(mapped[idx], width.min ?? 0, width.max ?? 1 / 0);
    else widths[idx] = mapped[idx];
  }
  if (fillIndexes.length > 0) {
    let reduced = widths.reduce((acc, width) => acc + width, 0);
    let max = Math.max(0, totalWidth - TABLE_COLUMN_GAP * (columnCount - 1) - reduced);
    let reduced_2 = fillIndexes.reduce((acc, flexCount) => acc + (columns[flexCount].width.ratio ?? 0), 0);
    for (let extra of fillIndexes) {
      let width = columns[extra].width;
      let index = reduced_2 > 0 ? Math.floor((max * (width.ratio ?? 0)) / reduced_2) : 0;
      widths[extra] = clamp(index, width.min ?? 1, width.max ?? 1 / 0);
    }
  }
  return widths;
}
//@ chunk-2nmyajw8.js:1575-2503 placement
/**
 * 表格行：按列宽渲染单元格，最后一列可填满剩余宽度并换行。
 */
function TableRow(props) {
  let $ = useMemoCache(16);
  let { cells, columns, widths, isHeader } = props;
  let lastColumnIndex = columns.length - 1;
  let width = columns[lastColumnIndex]?.width;
  let fillMinWidth =
    width === "fill"
      ? TABLE_FILL_MIN_WIDTH
      : width === undefined
        ? Math.min(TABLE_FILL_MIN_WIDTH, widths[lastColumnIndex] ?? 0)
        : 0;
  const flexWrap = fillMinWidth > 0 ? "wrap" : "nowrap";
  let children;
  if (
    $[0] !== cells ||
    $[1] !== columns ||
    $[2] !== fillMinWidth ||
    $[3] !== isHeader ||
    $[4] !== lastColumnIndex ||
    $[5] !== widths
  ) {
    let renderCell;
    if (
      $[7] !== cells ||
      $[8] !== fillMinWidth ||
      $[9] !== isHeader ||
      $[10] !== lastColumnIndex ||
      $[11] !== widths
    ) {
      renderCell = (column, index) =>
        column.width === "fill"
          ? jsxProd_default(
              Box,
              {
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                minWidth: index === lastColumnIndex ? fillMinWidth : 1,
                justifyContent: TABLE_ALIGN_TO_FLEX[column.align ?? "start"],
                children: applyEmphasis(cells[index], column, isHeader),
              },
              index,
            )
          : jsxProd_default(
              Box,
              {
                width: widths[index] || undefined,
                flexShrink: index === lastColumnIndex && column.width === undefined ? 1 : 0,
                flexBasis: index === lastColumnIndex && fillMinWidth > 0 ? fillMinWidth : undefined,
                flexGrow: index === lastColumnIndex && fillMinWidth > 0 ? 1 : 0,
                maxWidth: index === lastColumnIndex && fillMinWidth > 0 ? widths[index] : undefined,
                justifyContent: TABLE_ALIGN_TO_FLEX[column.align ?? "start"],
                children: applyEmphasis(cells[index], column, isHeader),
              },
              index,
            );
      $[7] = cells;
      $[8] = fillMinWidth;
      $[9] = isHeader;
      $[10] = lastColumnIndex;
      $[11] = widths;
      $[12] = renderCell;
    } else renderCell = $[12];
    children = columns.map(renderCell);
    $[0] = cells;
    $[1] = columns;
    $[2] = fillMinWidth;
    $[3] = isHeader;
    $[4] = lastColumnIndex;
    $[5] = widths;
    $[6] = children;
  } else children = $[6];
  let rowElement;
  if ($[13] !== flexWrap || $[14] !== children) {
    rowElement = jsxProd_default(Box, {
      flexDirection: "row",
      columnGap: TABLE_COLUMN_GAP,
      flexWrap,
      children,
    });
    $[13] = flexWrap;
    $[14] = children;
    $[15] = rowElement;
  } else rowElement = $[15];
  return rowElement;
}
//@ chunk-2nmyajw8.js:2503-2612 placement
function TableRowGroup(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let fragment;
  if ($[0] !== children) {
    fragment = jsxProd_default(Fragment, {
      children,
    });
    $[0] = children;
    $[1] = fragment;
  } else fragment = $[1];
  return fragment;
}
//@ chunk-2nmyajw8.js:2612-3202 placement
/**
 * 表格组件：按终端宽度（或 forceWidth）计算列宽，有表头时先渲染表头行，再逐行渲染子元素的单元格。
 */
function Table(props) {
  let $ = useMemoCache(12);
  let { columns, children, forceWidth } = props;
  let { columns: columns_2 } = useTerminalSize();
  let width = forceWidth ?? columns_2;
  let RowWrapper;
  let flexDirection;
  let headerRow;
  let bodyRows;
  if ($[0] !== children || $[1] !== columns || $[2] !== width) {
    let filtered = childrenExport.toArray(children).filter(isValidElement_default);
    let rows = filtered.map(childArray);
    let hasHeaders = columns.some(hasHeader);
    let widths = computeColumnWidths(columns, rows, hasHeaders, width);
    RowWrapper = Box;
    flexDirection = "column";
    headerRow =
      hasHeaders &&
      jsxProd_default(TableRow, {
        cells: columns.map(headerOf),
        columns,
        widths,
        isHeader: true,
      });
    bodyRows = rows.map((cells, rowIndex) =>
      jsxProd_default(
        TableRow,
        {
          cells,
          columns,
          widths,
          isHeader: false,
        },
        filtered[rowIndex].key ?? rowIndex,
      ),
    );
    $[0] = children;
    $[1] = columns;
    $[2] = width;
    $[3] = RowWrapper;
    $[4] = flexDirection;
    $[5] = headerRow;
    $[6] = bodyRows;
  } else {
    RowWrapper = $[3];
    flexDirection = $[4];
    headerRow = $[5];
    bodyRows = $[6];
  }
  let table;
  if ($[7] !== RowWrapper || $[8] !== flexDirection || $[9] !== headerRow || $[10] !== bodyRows) {
    table = jsxProd_default_2(RowWrapper, {
      flexDirection,
      children: [headerRow, bodyRows],
    });
    $[7] = RowWrapper;
    $[8] = flexDirection;
    $[9] = headerRow;
    $[10] = bodyRows;
    $[11] = table;
  } else table = $[11];
  return table;
}
//@ chunk-2nmyajw8.js:3202-3234 placement = FlexDirection (1)
var FlexDirectionRow; // deferred: uses Table of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2nmyajw8.js:3202", () => {
  FlexDirectionRow = Object.assign(Table, {
    Row: TableRowGroup,
  });
});
export { FlexDirectionRow, TABLE_FILL_MIN_WIDTH };
