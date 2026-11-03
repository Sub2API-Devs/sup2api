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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { layoutMarkdownTable } from "./pluginUi/render/MarkdownBlock.js";
import {
  MAX_RENDER_ROWS,
  moreRowsText,
  LIST_LEVEL_INDENT,
  CODE_LIST_TAB_WIDTH,
  BLOCK_QUOTE_INDENT,
} from "./pluginUi/render/elements.js";
import { renderWithSafeLinks } from "../utils/markdownInlineRendering.js";
import { formatTokenWindowed, summarizeMarkdownText, padAligned } from "../utils/markdown.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";

//@ chunk-bc20zedk.js:11866-12030 fingerprint = wrapText (1)
function wrapText(text, width, options) {
  if (width <= 0) return [text];
  let trimmedText = text.trimEnd();
  let lines = wrapAnsi(trimmedText, width, {
    hard: options?.hard ?? false,
    trim: false,
    wordWrap: true,
  })
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  return lines.length > 0 ? lines : [""];
}
//@ chunk-bc20zedk.js:12030-12707 layout
/**
 * Markdown 表格组件：按主题、宽度与读屏模式生成表格；结果为 ANSI 文本时直接输出，否则交给表格布局组件。
 */
var MarkdownTableView = Rh(function (props) {
  let $ = w(15);
  let { token, highlight, forceWidth, linkCap, isWindowed } = props;
  let [theme] = useTheme();
  let { columns } = useScrollViewportSize(useTerminalSize());
  let screenReader = useIsScreenReaderEnabled();
  let width = forceWidth ?? columns;
  let layoutMemo;
  if (
    $[0] !== highlight ||
    $[1] !== screenReader ||
    $[2] !== isWindowed ||
    $[3] !== linkCap ||
    $[4] !== width ||
    $[5] !== theme ||
    $[6] !== token
  ) {
    layoutMemo = MarkdownTable(token, width, theme, highlight, linkCap, screenReader, isWindowed);
    $[0] = highlight;
    $[1] = screenReader;
    $[2] = isWindowed;
    $[3] = linkCap;
    $[4] = width;
    $[5] = theme;
    $[6] = token;
    $[7] = layoutMemo;
  } else layoutMemo = $[7];
  let layout = layoutMemo;
  if (layout.kind === "ansi") {
    let ansiNode;
    if ($[8] !== layout.text) {
      ansiNode = jsxProd_default(Ansi, {
        children: layout.text,
      });
      $[8] = layout.text;
      $[9] = ansiNode;
    } else ansiNode = $[9];
    return ansiNode;
  }
  let tableNode;
  if (
    $[10] !== layout.headers ||
    $[11] !== layout.rows ||
    $[12] !== layout.truncatedCount ||
    $[13] !== width
  ) {
    tableNode = jsxProd_default(layoutMarkdownTable, {
      headers: layout.headers,
      rows: layout.rows,
      terminalWidth: width,
      truncatedCount: layout.truncatedCount,
    });
    $[10] = layout.headers;
    $[11] = layout.rows;
    $[12] = layout.truncatedCount;
    $[13] = width;
    $[14] = tableNode;
  } else tableNode = $[14];
  return tableNode;
});
//@ chunk-bc20zedk.js:12707-15392 fingerprint = MarkdownTable (0.688)
/**
 * Markdown 表格：计算各列自然宽度，按终端宽度收缩并换行，支持 left/center/right 对齐；宽度实在不够时改为每行纵向"列名: 值"布局。
 */
function MarkdownTable(token, width, theme, highlight, linkCap, screenReader, windowed) {
  let max = Math.max(0, token.rows.length - MAX_RENDER_ROWS);
  let x = max > 0 ? token.rows.slice(0, MAX_RENDER_ROWS) : token.rows;
  let h = new Map();
  function formatCell(tokens) {
    let F = h.get(tokens);
    if (F !== undefined) return F;
    let K = renderWithSafeLinks(
      tokens,
      () =>
        tokens
          ?.map((token) =>
            formatTokenWindowed(token, theme, {
              listDepth: 0,
              orderedListNumber: null,
              parent: null,
              highlight,
              glueProse: false,
              linkCap,
              windowed,
            }),
          )
          .join("") ?? "",
    );
    h.set(tokens, K);
    return K;
  }
  function getPlainText(tokens) {
    return stripAnsi(formatCell(tokens));
  }
  if (screenReader) {
    let text = summarizeMarkdownText(
      token.header.map((F) => getPlainText(F.tokens)),
      x.map((F) => F.map((K) => getPlainText(K.tokens))),
    );
    if (max > 0)
      text += `
${moreRowsText(max)}`;
    return {
      kind: "ansi",
      text,
    };
  }
  function getMinWidth(tokens) {
    let words = getPlainText(tokens)
      .split(/\s+/)
      .filter((V) => V.length > 0);
    if (words.length === 0) return LIST_LEVEL_INDENT;
    return Math.max(...words.map((w_0) => bunStringWidth(w_0)), LIST_LEVEL_INDENT);
  }
  function getIdealWidth(tokens) {
    return Math.max(bunStringWidth(getPlainText(tokens)), LIST_LEVEL_INDENT);
  }
  let minWidths = token.header.map((header, colIndex) => {
    let maxMinWidth = getMinWidth(header.tokens);
    for (let row of x) maxMinWidth = Math.max(maxMinWidth, getMinWidth(row[colIndex]?.tokens));
    return maxMinWidth;
  });
  let idealWidths = token.header.map((header, colIndex) => {
    let maxIdeal = getIdealWidth(header.tokens);
    for (let row of x) maxIdeal = Math.max(maxIdeal, getIdealWidth(row[colIndex]?.tokens));
    return maxIdeal;
  });
  let numCols = token.header.length;
  let borderOverhead = 1 + numCols * 3;
  let availableWidth = Math.max(width - borderOverhead - CODE_LIST_TAB_WIDTH, numCols * LIST_LEVEL_INDENT);
  let totalMin = minWidths.reduce((sum, w_1) => sum + w_1, 0);
  let totalIdeal = idealWidths.reduce((sum, w_2) => sum + w_2, 0);
  let needsHardWrap = false;
  let columnWidths;
  if (totalIdeal <= availableWidth) columnWidths = idealWidths;
  else if (totalMin <= availableWidth) {
    let extraSpace = availableWidth - totalMin;
    let overflows = idealWidths.map((ideal, i) => ideal - minWidths[i]);
    let totalOverflow = overflows.reduce((sum, te) => sum + te, 0);
    columnWidths = minWidths.map((min, i_0) => {
      if (totalOverflow === 0) return min;
      let extra = Math.floor((overflows[i_0] / totalOverflow) * extraSpace);
      return min + extra;
    });
  } else {
    needsHardWrap = true;
    let scaleFactor = availableWidth / totalMin;
    columnWidths = minWidths.map((w_3) => Math.max(Math.floor(w_3 * scaleFactor), LIST_LEVEL_INDENT));
  }
  function calculateMaxRowLines() {
    let maxLines = 1;
    for (let i_1 = 0; i_1 < token.header.length; i_1++) {
      let content = formatCell(token.header[i_1].tokens);
      let wrapped = wrapText(content, columnWidths[i_1], {
        hard: needsHardWrap,
      });
      maxLines = Math.max(maxLines, wrapped.length);
    }
    for (let row of x)
      for (let i_2 = 0; i_2 < row.length; i_2++) {
        let content = formatCell(row[i_2]?.tokens);
        let wrapped = wrapText(content, columnWidths[i_2], {
          hard: needsHardWrap,
        });
        maxLines = Math.max(maxLines, wrapped.length);
      }
    return maxLines;
  }
  let G = calculateMaxRowLines() > BLOCK_QUOTE_INDENT;
  function q() {
    if (x.length === 0)
      return {
        kind: "vertical",
        headers: [],
        rows: [token.header.map((v) => formatCell(v.tokens))],
        truncatedCount: max,
      };
    return {
      kind: "vertical",
      headers: token.header.map((v) => getPlainText(v.tokens).trim()),
      rows: x.map((v) => v.map((F) => formatCell(F.tokens))),
      truncatedCount: max,
    };
  }
  function renderRowLines(cells, isHeader) {
    let cellLines = cells.map((cell, colIndex) => {
      let formattedText = formatCell(cell.tokens);
      let width = columnWidths[colIndex];
      return wrapText(formattedText, width, {
        hard: needsHardWrap,
      });
    });
    let maxLines = Math.max(...cellLines.map((lines) => lines.length), 1);
    let verticalOffsets = cellLines.map((lines) => Math.floor((maxLines - lines.length) / 2));
    let result = [];
    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      let line = "\u2502";
      for (let colIndex = 0; colIndex < cells.length; colIndex++) {
        let lines = cellLines[colIndex];
        let offset = verticalOffsets[colIndex];
        let contentLineIdx = lineIdx - offset;
        let lineText = contentLineIdx >= 0 && contentLineIdx < lines.length ? lines[contentLineIdx] : "";
        let width = columnWidths[colIndex];
        let align = isHeader ? "center" : (token.align?.[colIndex] ?? "left");
        line += " " + padAligned(lineText, bunStringWidth(lineText), width, align) + " \u2502";
      }
      result.push(line);
    }
    return result;
  }
  function renderBorderLine(type) {
    let [left, mid, cross, right] = {
      top: ["\u250C", "\u2500", "\u252C", "\u2510"],
      middle: ["\u251C", "\u2500", "\u253C", "\u2524"],
      bottom: ["\u2514", "\u2500", "\u2534", "\u2518"],
    }[type];
    let line = left;
    columnWidths.forEach((width, colIndex) => {
      line += mid.repeat(width + 2);
      line += colIndex < columnWidths.length - 1 ? cross : right;
    });
    return line;
  }
  if (G) return q();
  let Z = [];
  Z.push(renderBorderLine("top"));
  Z.push(...renderRowLines(token.header, true));
  Z.push(renderBorderLine("middle"));
  x.forEach((row, rowIndex) => {
    Z.push(...renderRowLines(row, false));
    if (rowIndex < x.length - 1) Z.push(renderBorderLine("middle"));
  });
  Z.push(renderBorderLine("bottom"));
  let oe = 0;
  for (let v of Z) {
    let F = bunStringWidth(stripAnsi(v));
    if (F > oe) oe = F;
  }
  if (oe > width - CODE_LIST_TAB_WIDTH) return q();
  if (max > 0) Z.push(moreRowsText(max));
  return {
    kind: "ansi",
    text: Z.join(`
`),
  };
}
//@ chunk-cwwxybjc.js:991-1032 fingerprint = ANSI_BOLD_END (0.532)
var ANSI_RESET = "\x1B[0m";
var ANSI_DIM = "\x1B[2m";
var ANSI_NORMAL_INTENSITY = "\x1B[22m";
export { wrapText, MarkdownTableView, ANSI_RESET, ANSI_DIM, ANSI_NORMAL_INTENSITY };
