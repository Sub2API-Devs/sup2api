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
import { j, Fy, dh, Kc } from "../../../vendor/react/cjs/react.production.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { reactNodeText } from "../../utils/reactText.js";
import { clamp } from "../../ink/screen.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";

//@ chunk-2nmyajw8.js:567-571 placement
j();
//@ chunk-2nmyajw8.js:571-624 placement
function re(ce) {
  return Fy.toArray(ce.props.children);
}
//@ chunk-2nmyajw8.js:624-666 placement
function le(de) {
  return de.header !== void 0;
}
//@ chunk-2nmyajw8.js:666-699 placement
function se(me) {
  return me.header;
}
//@ chunk-2nmyajw8.js:699-768 placement
var TABLE_ALIGN_TO_FLEX = { start: "flex-start", center: "center", end: "flex-end" },
  A = 2,
  YHt = 12;
//@ chunk-2nmyajw8.js:768-875 placement
function isTextLike(o) {
  if (typeof o === "string" || typeof o === "number") return !0;
  if (dh(o) && o.type === Kc) return !0;
  return !1;
}
//@ chunk-2nmyajw8.js:875-970 placement = StyledText (1)
function applyEmphasis(o, i, h) {
  if (!isTextLike(o)) return o;
  return e(Text, { dimColor: i.dim && !h, bold: i.bold || h, children: o });
}
//@ chunk-2nmyajw8.js:970-1001 placement
function B(o) {
  return bunStringWidth(reactNodeText(o));
}
/**
 * 计算表格各列宽度：固定数字直接用，fill 先置 0，ratio 列按比例分配剩余宽度（扣除列间距），其余按内容最大宽度夹在 min/max 内。
 */
//@ chunk-2nmyajw8.js:1001-1575 placement
function computeColumnWidths(columns, rows, h, b) {
  let y = columns.length,
    mapped = columns.map((t, l) => {
      let u = h ? B(t.header) : 0;
      for (let d of rows) u = Math.max(u, B(d[l]));
      return u;
    }),
    widths = Array(y),
    a = [];
  for (let t = 0; t < y; t++) {
    let width = columns[t].width;
    if (width === "fill") widths[t] = 0;
    else if (typeof width === "number") widths[t] = width;
    else if (width && "ratio" in width && width.ratio !== void 0) (a.push(t), (widths[t] = 0));
    else if (width) widths[t] = clamp(mapped[t], width.min ?? 0, width.max ?? 1 / 0);
    else widths[t] = mapped[t];
  }
  if (a.length > 0) {
    let reduced = widths.reduce((d, m) => d + m, 0),
      max = Math.max(0, b - A * (y - 1) - reduced),
      reduced_2 = a.reduce((d, m) => d + (columns[m].width.ratio ?? 0), 0);
    for (let d of a) {
      let width = columns[d].width,
        f = reduced_2 > 0 ? Math.floor((max * (width.ratio ?? 0)) / reduced_2) : 0;
      widths[d] = clamp(f, width.min ?? 1, width.max ?? 1 / 0);
    }
  }
  return widths;
}
/**
 * 表格行：按列宽渲染单元格，最后一列可填满剩余宽度并换行。
 */
//@ chunk-2nmyajw8.js:1575-2503 placement
function TableRow(props) {
  let $ = w(16),
    { cells: cells, columns: columns, widths: widths, isHeader: isHeader } = props,
    c = columns.length - 1,
    p = columns[c]?.width,
    a = p === "fill" ? YHt : p === void 0 ? Math.min(YHt, widths[c] ?? 0) : 0;
  const t = a > 0 ? "wrap" : "nowrap";
  let u;
  if (
    $[0] !== cells ||
    $[1] !== columns ||
    $[2] !== a ||
    $[3] !== isHeader ||
    $[4] !== c ||
    $[5] !== widths
  ) {
    let d;
    if ($[7] !== cells || $[8] !== a || $[9] !== isHeader || $[10] !== c || $[11] !== widths)
      ((d = (m, f) =>
        m.width === "fill"
          ? e(
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
          : e(
              Box,
              {
                width: widths[f] || void 0,
                flexShrink: f === c && m.width === void 0 ? 1 : 0,
                flexBasis: f === c && a > 0 ? a : void 0,
                flexGrow: f === c && a > 0 ? 1 : 0,
                maxWidth: f === c && a > 0 ? widths[f] : void 0,
                justifyContent: TABLE_ALIGN_TO_FLEX[m.align ?? "start"],
                children: applyEmphasis(cells[f], m, isHeader),
              },
              f,
            )),
        ($[7] = cells),
        ($[8] = a),
        ($[9] = isHeader),
        ($[10] = c),
        ($[11] = widths),
        ($[12] = d));
    else d = $[12];
    u = columns.map(d);
    (($[0] = cells),
      ($[1] = columns),
      ($[2] = a),
      ($[3] = isHeader),
      ($[4] = c),
      ($[5] = widths),
      ($[6] = u));
  } else u = $[6];
  let d;
  if ($[13] !== t || $[14] !== u)
    ((d = e(Box, { flexDirection: "row", columnGap: A, flexWrap: t, children: u })),
      ($[13] = t),
      ($[14] = u),
      ($[15] = d));
  else d = $[15];
  return d;
}
//@ chunk-2nmyajw8.js:2503-2612 placement
function TableRowGroup(o) {
  let h = w(2),
    { children: children } = o,
    b;
  if (h[0] !== children) ((b = e(Fragment, { children: children })), (h[0] = children), (h[1] = b));
  else b = h[1];
  return b;
}
/**
 * 表格组件：按终端宽度（或 forceWidth）计算列宽，有表头时先渲染表头行，再逐行渲染子元素的单元格。
 */
//@ chunk-2nmyajw8.js:2612-3202 placement
function Table(props) {
  let $ = w(12),
    { columns: columns, children: children, forceWidth: forceWidth } = props,
    { columns: columns_2 } = useTerminalSize(),
    c = forceWidth ?? columns_2,
    a,
    t,
    l,
    u;
  if ($[0] !== children || $[1] !== columns || $[2] !== c) {
    let filtered = Fy.toArray(children).filter(dh);
    let mapped = filtered.map(re);
    let any = columns.some(le);
    let Q = computeColumnWidths(columns, mapped, any, c);
    a = Box;
    t = "column";
    l = any && e(TableRow, { cells: columns.map(se), columns: columns, widths: Q, isHeader: !0 });
    u = mapped.map((ae, V) =>
      e(TableRow, { cells: ae, columns: columns, widths: Q, isHeader: !1 }, filtered[V].key ?? V),
    );
    (($[0] = children), ($[1] = columns), ($[2] = c), ($[3] = a), ($[4] = t), ($[5] = l), ($[6] = u));
  } else ((a = $[3]), (t = $[4]), (l = $[5]), (u = $[6]));
  let X;
  if ($[7] !== a || $[8] !== t || $[9] !== l || $[10] !== u)
    ((X = r(a, { flexDirection: t, children: [l, u] })),
      ($[7] = a),
      ($[8] = t),
      ($[9] = l),
      ($[10] = u),
      ($[11] = X));
  else X = $[11];
  return X;
}
//@ chunk-2nmyajw8.js:3202-3234 placement = FlexDirection (1)
var FlexDirectionRow = Object.assign(Table, { Row: TableRowGroup });

export { FlexDirectionRow, YHt };
