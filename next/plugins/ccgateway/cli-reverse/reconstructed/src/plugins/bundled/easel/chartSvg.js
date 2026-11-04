/**
 * plugins/bundled/easel/chartSvg.ts
 *
 * 2.1.316 新增：easel 插件的图表 SVG 片段拼装（网格线、矩形、折线、文字与条带），基于 renderChart 的坐标工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (18)
 * attribution: placement 18
 */
import {
  SVG_HALF_CELL,
  svgLine,
  svgPoint,
  svgX,
  svgY,
  svgFill,
  SVG_STROKE,
  SVG_HALF,
  SVG_BAND_PAD,
  SVG_ROW_HEIGHT,
  SVG_TEXT_DY,
  thinBarRect,
  hasSvgHeight,
  svgTickLine,
  bandPartRect,
  SVG_FONT_SIZE,
  SVG_COL_WIDTH,
} from "./renderChart.js";
import { displayWidth, prefixSums } from "./chartSchema.js";
import { CHART_THEME_COLORS } from "./planChart.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-3s7ydtfd.js:79265-79331 placement
/**
 * 转义 &<>
 */
var escapeXmlText = (node) => node.text.replace(/[&<>]/g, (char) => `&#${char.charCodeAt(0)};`);
//@ chunk-3s7ydtfd.js:79331-79433 placement
/**
 * 坐标轴行的网格线。
 */
function svgGridLine(line) {
  let x = line.at.x + SVG_HALF_CELL;
  let y = line.at.y + SVG_HALF_CELL;
  return svgLine(
    {
      x,
      y,
    },
    {
      x: x + line.gridWidth,
      y,
    },
    ' class="grid"',
  );
}
//@ chunk-3s7ydtfd.js:79433-79507 placement
/**
 * 斜线填充属性
 */
var hatchAttrs = (cell) => (cell.isHatched ? ` fill-opacity=".45" stroke="var(--${cell.ink})"` : "");
//@ chunk-3s7ydtfd.js:79507-79560 placement
/**
 * 折线点串
 */
var polylinePoints = (series) => series.points.map((point) => svgPoint(point.x, point.y)).join(" ");
//@ chunk-3s7ydtfd.js:79560-79678 placement
/**
 * 生成 SVG 矩形元素。
 */
var svgRect = (rect, extraAttrs = "") =>
  `<rect x="${svgX(rect.x)}" y="${svgY(rect.y)}" width="${svgX(rect.width)}" height="${svgY(rect.height)}" ${svgFill(rect.ink, extraAttrs)}/>`;
//@ chunk-3s7ydtfd.js:79678-79766 placement
/**
 * 迷你条带矩形
 */
var sparkRect = (cell, stackEntry) => ({
  x: cell.at.x,
  y: stackEntry.end,
  width: cell.width - SVG_STROKE,
  height: stackEntry.part.height,
  ink: stackEntry.part.ink,
});
//@ chunk-3s7ydtfd.js:79766-79870 placement
/**
 * 迷你条带上沿的折线点。
 */
var stripTopPoints = (strip, baseY) =>
  strip.heights.flatMap((height, index) => {
    let x = strip.at.x + index;
    let y = baseY - (height ?? 0) * (1 - SVG_HALF * SVG_BAND_PAD);
    return [svgPoint(x, y), svgPoint(x + 1, y)];
  });
//@ chunk-3s7ydtfd.js:79870-79981 placement
/**
 * 迷你条带多边形的点序列。
 */
function stripPolygonPoints(strip) {
  let baseY = strip.at.y + 1 - SVG_BAND_PAD;
  return `${svgPoint(strip.at.x, baseY)} ${stripTopPoints(strip, baseY).join(" ")} ${svgPoint(strip.at.x + strip.heights.length, baseY)}`;
}
//@ chunk-3s7ydtfd.js:79981-80043 placement
/**
 * 描边与 data-series 属性
 */
var strokeSeriesAttrs = (series) => `stroke="var(--${series.ink})" data-series="${series.ink}"`;
//@ chunk-3s7ydtfd.js:80043-80086 placement
/**
 * textLength 属性
 */
var textLengthAttr = (node) => `textLength="${svgX(displayWidth(node.text))}"`;
//@ chunk-3s7ydtfd.js:80086-80165 placement
/**
 * fill 与标题加粗
 */
var fillInkAttr = (node) => `fill="var(--${node.ink})"` + (node.ink === "title" ? ' font-weight="600"' : "");
//@ chunk-3s7ydtfd.js:80165-80195 placement
/**
 * 文字的 y 坐标
 */
var textY = (node) => (node.at.y + SVG_HALF_CELL) * SVG_ROW_HEIGHT + SVG_TEXT_DY;
//@ chunk-3s7ydtfd.js:80195-80239 placement
/**
 * 文字的 x/y 属性
 */
var textXY = (node) => `x="${svgX(node.at.x)}" y="${textY(node)}"`;
//@ chunk-3s7ydtfd.js:80239-80745 placement
/**
 * 把一个图形（文字、柱、堆叠、坐标轴行、条带、色带、折线）转为 SVG 片段。
 */
function shapeToSvg(shape) {
  switch (shape.kind) {
    case "text":
      return `<text ${textXY(shape)} ${textLengthAttr(shape)} ${fillInkAttr(shape)}>${escapeXmlText(shape)}</text>`;
    case "bar":
      return svgRect(thinBarRect(shape), hatchAttrs(shape));
    case "stack":
      return prefixSums(shape.parts, (part) => -part.height, shape.at.y)
        .filter((entry) => hasSvgHeight(entry.part))
        .map((entry) => svgRect(sparkRect(shape, entry)))
        .join("");
    case "axisRow": {
      let tick = svgTickLine(shape);
      return shape.gridWidth > 0 ? `${tick}${svgGridLine(shape)}` : tick;
    }
    case "strip":
      return `<polygon points="${stripPolygonPoints(shape)}" ${svgFill(shape.ink)}/>`;
    case "band":
      return prefixSums(shape.parts, (part) => part.width, shape.at.x)
        .map((entry) => svgRect(bandPartRect(shape, entry)))
        .join("");
    case "line":
      return `<polyline points="${polylinePoints(shape)}" ${strokeSeriesAttrs(shape)}/>`;
  }
}
//@ chunk-3s7ydtfd.js:80745-80958 placement
var joined; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:80745", () => {
  joined = [
    `text{font-size:${SVG_FONT_SIZE}px;font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre}`,
    "polyline{fill:none;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}",
    ".grid{opacity:.25}",
  ].join("");
});
//@ chunk-3s7ydtfd.js:80958-81030 placement
/**
 * 生成主题 CSS 变量
 */
var themeVars = (mode) =>
  Object.entries(CHART_THEME_COLORS)
    .map(([key, value]) => `--${key}:${value[mode]}`)
    .join(";");
//@ chunk-3s7ydtfd.js:81030-81075 placement
/**
 * 深色模式媒体查询
 */
var DARK_MODE_MEDIA = "@media (prefers-color-scheme: dark)";
//@ chunk-3s7ydtfd.js:81075-81486 placement (2.1.88 match: ansiToSvg, 0.408)
function ansiToSvg(chart) {
  let shapes = chart.shapes.some((span) => span.kind === "stack" && !span.parts.every(hasSvgHeight))
    ? chart.shapes
    : chart.shapes.filter((spans) => !(spans.kind === "text" && spans.isAboutPartsLeftOut));
  let width = chart.columns * SVG_COL_WIDTH;
  let height = (chart.rows - (chart.shapes.length - shapes.length)) * SVG_ROW_HEIGHT;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<style>svg{${themeVars("light")}}${DARK_MODE_MEDIA}{svg{${themeVars("dark")}}}`,
    `${joined}</style>`,
    ...shapes.map(shapeToSvg),
    "</svg>",
  ].join(`
`);
}
export { ansiToSvg };
