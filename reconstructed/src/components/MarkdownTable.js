/**
 * components/MarkdownTable.tsx
 *
 * Markdown 表格渲染：按终端宽度计算列宽、单元格换行、对齐与边框，过窄时改为纵向布局。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MarkdownTable.tsx
 * pieces: chunk-bc20zedk.js (3), chunk-cwwxybjc.js (1)
 * attribution: fingerprint 3, layout 1
 */
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { Rh } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme } from "./design-system/ThemeProvider.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { layoutMarkdownTable } from "./pluginUi/render/MarkdownBlock.js";
import { Wr, at, Fe, Ke, Ts } from "./pluginUi/render/elements.js";
import { renderWithSafeLinks } from "../utils/markdownInlineRendering.js";
import { formatTokenWindowed, summarizeMarkdownText, padAligned } from "../utils/markdown.js";
import { Yn } from "../utils/stripAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";

//@ chunk-bc20zedk.js:11866-12030 fingerprint = wrapText (1)
function wrapText(text, width, options) {
  if (width <= 0) return [text];
  let trimmedText = text.trimEnd(),
    lines = wrapAnsi(trimmedText, width, { hard: options?.hard ?? !1, trim: !1, wordWrap: !0 })
      .split(
        `
`,
      )
      .filter((line) => line.length > 0);
  return lines.length > 0 ? lines : [""];
}
/**
 * Markdown 表格组件：按主题、宽度与读屏模式生成表格；结果为 ANSI 文本时直接输出，否则交给表格布局组件。
 */
//@ chunk-bc20zedk.js:12030-12707 layout
var MarkdownTableView = Rh(function (props) {
  let $ = w(15),
    {
      token: token,
      highlight: highlight,
      forceWidth: forceWidth,
      linkCap: linkCap,
      isWindowed: isWindowed,
    } = props,
    [theme] = useTheme(),
    { columns: columns } = useScrollViewportSize(useTerminalSize()),
    screenReader = useIsScreenReaderEnabled(),
    width = forceWidth ?? columns,
    layoutMemo;
  if (
    $[0] !== highlight ||
    $[1] !== screenReader ||
    $[2] !== isWindowed ||
    $[3] !== linkCap ||
    $[4] !== width ||
    $[5] !== theme ||
    $[6] !== token
  )
    ((layoutMemo = MarkdownTable(token, width, theme, highlight, linkCap, screenReader, isWindowed)),
      ($[0] = highlight),
      ($[1] = screenReader),
      ($[2] = isWindowed),
      ($[3] = linkCap),
      ($[4] = width),
      ($[5] = theme),
      ($[6] = token),
      ($[7] = layoutMemo));
  else layoutMemo = $[7];
  let layout = layoutMemo;
  if (layout.kind === "ansi") {
    let ansiNode;
    if ($[8] !== layout.text)
      ((ansiNode = e(Ansi, { children: layout.text })), ($[8] = layout.text), ($[9] = ansiNode));
    else ansiNode = $[9];
    return ansiNode;
  }
  let tableNode;
  if ($[10] !== layout.headers || $[11] !== layout.rows || $[12] !== layout.truncatedCount || $[13] !== width)
    ((tableNode = e(layoutMarkdownTable, {
      headers: layout.headers,
      rows: layout.rows,
      terminalWidth: width,
      truncatedCount: layout.truncatedCount,
    })),
      ($[10] = layout.headers),
      ($[11] = layout.rows),
      ($[12] = layout.truncatedCount),
      ($[13] = width),
      ($[14] = tableNode));
  else tableNode = $[14];
  return tableNode;
});
/**
 * Markdown 表格：计算各列自然宽度，按终端宽度收缩并换行，支持 left/center/right 对齐；宽度实在不够时改为每行纵向"列名: 值"布局。
 */
//@ chunk-bc20zedk.js:12707-15392 fingerprint = MarkdownTable (0.688)
function MarkdownTable(o, p, a, m, f, u, c) {
  let max = Math.max(0, o.rows.length - Wr),
    x = max > 0 ? o.rows.slice(0, Wr) : o.rows,
    h = new Map();
  function formatCell(tokens) {
    let F = h.get(tokens);
    if (F !== void 0) return F;
    let K = renderWithSafeLinks(
      tokens,
      () =>
        tokens
          ?.map((V) =>
            formatTokenWindowed(V, a, {
              listDepth: 0,
              orderedListNumber: null,
              parent: null,
              highlight: m,
              glueProse: !1,
              linkCap: f,
              windowed: c,
            }),
          )
          .join("") ?? "",
    );
    return (h.set(tokens, K), K);
  }
  function getPlainText(tokens_0) {
    return Yn(formatCell(tokens_0));
  }
  if (u) {
    let v = summarizeMarkdownText(
      o.header.map((F) => getPlainText(F.tokens)),
      x.map((F) => F.map((K) => getPlainText(K.tokens))),
    );
    if (max > 0)
      v += `
${at(max)}`;
    return { kind: "ansi", text: v };
  }
  function getMinWidth(tokens_1) {
    let words = getPlainText(tokens_1)
      .split(/\s+/)
      .filter((V) => V.length > 0);
    if (words.length === 0) return Fe;
    return Math.max(...words.map((w_0) => bunStringWidth(w_0)), Fe);
  }
  function getIdealWidth(tokens_2) {
    return Math.max(bunStringWidth(getPlainText(tokens_2)), Fe);
  }
  let minWidths = o.header.map((header, colIndex) => {
      let maxMinWidth = getMinWidth(header.tokens);
      for (let V of x) maxMinWidth = Math.max(maxMinWidth, getMinWidth(V[colIndex]?.tokens));
      return maxMinWidth;
    }),
    idealWidths = o.header.map((header_0, colIndex_0) => {
      let maxIdeal = getIdealWidth(header_0.tokens);
      for (let V of x) maxIdeal = Math.max(maxIdeal, getIdealWidth(V[colIndex_0]?.tokens));
      return maxIdeal;
    }),
    numCols = o.header.length,
    N = 1 + numCols * 3,
    availableWidth = Math.max(p - N - Ke, numCols * Fe),
    totalMin = minWidths.reduce((sum, w_1) => sum + w_1, 0),
    totalIdeal = idealWidths.reduce((sum_0, w_2) => sum_0 + w_2, 0),
    B = !1,
    W;
  if (totalIdeal <= availableWidth) W = idealWidths;
  else if (totalMin <= availableWidth) {
    let v = availableWidth - totalMin,
      overflows = idealWidths.map((ideal, te) => ideal - minWidths[te]),
      totalOverflow = overflows.reduce((sum_1, te) => sum_1 + te, 0);
    W = minWidths.map((min, i_0) => {
      if (totalOverflow === 0) return min;
      let extra = Math.floor((overflows[i_0] / totalOverflow) * v);
      return min + extra;
    });
  } else {
    B = !0;
    let v = availableWidth / totalMin;
    W = minWidths.map((w_3) => Math.max(Math.floor(w_3 * v), Fe));
  }
  function calculateMaxRowLines() {
    let v = 1;
    for (let F = 0; F < o.header.length; F++) {
      let content = formatCell(o.header[F].tokens),
        wrapped = wrapText(content, W[F], { hard: B });
      v = Math.max(v, wrapped.length);
    }
    for (let F of x)
      for (let K = 0; K < F.length; K++) {
        let content_0 = formatCell(F[K]?.tokens),
          wrapped_0 = wrapText(content_0, W[K], { hard: B });
        v = Math.max(v, wrapped_0.length);
      }
    return v;
  }
  let G = calculateMaxRowLines() > Ts;
  function q() {
    if (x.length === 0)
      return {
        kind: "vertical",
        headers: [],
        rows: [o.header.map((v) => formatCell(v.tokens))],
        truncatedCount: max,
      };
    return {
      kind: "vertical",
      headers: o.header.map((v) => getPlainText(v.tokens).trim()),
      rows: x.map((v) => v.map((F) => formatCell(F.tokens))),
      truncatedCount: max,
    };
  }
  function renderRowLines(cells, isHeader) {
    let cellLines = cells.map((cell, colIndex_1) => {
        let formattedText = formatCell(cell.tokens),
          fe = W[colIndex_1];
        return wrapText(formattedText, fe, { hard: B });
      }),
      maxLines_0 = Math.max(...cellLines.map((lines) => lines.length), 1),
      verticalOffsets = cellLines.map((lines_0) => Math.floor((maxLines_0 - lines_0.length) / 2)),
      ne = [];
    for (let re = 0; re < maxLines_0; re++) {
      let line = "\u2502";
      for (let le = 0; le < cells.length; le++) {
        let fe = cellLines[le],
          Rt = verticalOffsets[le],
          z = re - Rt,
          ee = z >= 0 && z < fe.length ? fe[z] : "",
          ae = W[le],
          ke = isHeader ? "center" : (o.align?.[le] ?? "left");
        line += " " + padAligned(ee, bunStringWidth(ee), ae, ke) + " \u2502";
      }
      ne.push(line);
    }
    return ne;
  }
  function renderBorderLine(type) {
    let [F, K, V, te] = {
        top: ["\u250C", "\u2500", "\u252C", "\u2510"],
        middle: ["\u251C", "\u2500", "\u253C", "\u2524"],
        bottom: ["\u2514", "\u2500", "\u2534", "\u2518"],
      }[type],
      line_0 = F;
    return (
      W.forEach((width_1, colIndex_3) => {
        ((line_0 += K.repeat(width_1 + 2)), (line_0 += colIndex_3 < W.length - 1 ? V : te));
      }),
      line_0
    );
  }
  if (G) return q();
  let Z = [];
  (Z.push(renderBorderLine("top")),
    Z.push(...renderRowLines(o.header, !0)),
    Z.push(renderBorderLine("middle")),
    x.forEach((row_2, rowIndex) => {
      if ((Z.push(...renderRowLines(row_2, !1)), rowIndex < x.length - 1)) Z.push(renderBorderLine("middle"));
    }),
    Z.push(renderBorderLine("bottom")));
  let oe = 0;
  for (let v of Z) {
    let F = bunStringWidth(Yn(v));
    if (F > oe) oe = F;
  }
  if (oe > p - Ke) return q();
  if (max > 0) Z.push(at(max));
  return {
    kind: "ansi",
    text: Z.join(`
`),
  };
}
//@ chunk-cwwxybjc.js:991-1032 fingerprint = ANSI_BOLD_END (0.532)
var v = "\x1B[0m",
  A = "\x1B[2m",
  J = "\x1B[22m";

export { wrapText, MarkdownTableView, v, A, J };
