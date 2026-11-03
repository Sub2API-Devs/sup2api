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

//@ chunk-3s7ydtfd.js:79265-79331 placement
/**
 * 转义 &<>
 */
var escapeXmlText = (e) => e.text.replace(/[&<>]/g, (t) => `&#${t.charCodeAt(0)};`);
//@ chunk-3s7ydtfd.js:79331-79433 placement
/**
 * 坐标轴行的网格线。
 */
function svgGridLine(e) {
  let t = e.at.x + SVG_HALF_CELL;
  let o = e.at.y + SVG_HALF_CELL;
  return svgLine(
    {
      x: t,
      y: o,
    },
    {
      x: t + e.gridWidth,
      y: o,
    },
    ' class="grid"',
  );
}
//@ chunk-3s7ydtfd.js:79433-79507 placement
/**
 * 斜线填充属性
 */
var hatchAttrs = (e) => (e.isHatched ? ` fill-opacity=".45" stroke="var(--${e.ink})"` : "");
//@ chunk-3s7ydtfd.js:79507-79560 placement
/**
 * 折线点串
 */
var polylinePoints = (e) => e.points.map((point) => svgPoint(point.x, point.y)).join(" ");
//@ chunk-3s7ydtfd.js:79560-79678 placement
/**
 * 生成 SVG 矩形元素。
 */
var svgRect = (e, t = "") =>
  `<rect x="${svgX(e.x)}" y="${svgY(e.y)}" width="${svgX(e.width)}" height="${svgY(e.height)}" ${svgFill(e.ink, t)}/>`;
//@ chunk-3s7ydtfd.js:79678-79766 placement
/**
 * 迷你条带矩形
 */
var sparkRect = (e, t) => ({
  x: e.at.x,
  y: t.end,
  width: e.width - SVG_STROKE,
  height: t.part.height,
  ink: t.part.ink,
});
//@ chunk-3s7ydtfd.js:79766-79870 placement
/**
 * 迷你条带上沿的折线点。
 */
var stripTopPoints = (e, t) =>
  e.heights.flatMap((height, r) => {
    let s = e.at.x + r;
    let p = t - (height ?? 0) * (1 - SVG_HALF * SVG_BAND_PAD);
    return [svgPoint(s, p), svgPoint(s + 1, p)];
  });
//@ chunk-3s7ydtfd.js:79870-79981 placement
/**
 * 迷你条带多边形的点序列。
 */
function stripPolygonPoints(e) {
  let t = e.at.y + 1 - SVG_BAND_PAD;
  return `${svgPoint(e.at.x, t)} ${stripTopPoints(e, t).join(" ")} ${svgPoint(e.at.x + e.heights.length, t)}`;
}
//@ chunk-3s7ydtfd.js:79981-80043 placement
/**
 * 描边与 data-series 属性
 */
var strokeSeriesAttrs = (e) => `stroke="var(--${e.ink})" data-series="${e.ink}"`;
//@ chunk-3s7ydtfd.js:80043-80086 placement
/**
 * textLength 属性
 */
var textLengthAttr = (e) => `textLength="${svgX(displayWidth(e.text))}"`;
//@ chunk-3s7ydtfd.js:80086-80165 placement
/**
 * fill 与标题加粗
 */
var fillInkAttr = (e) => `fill="var(--${e.ink})"` + (e.ink === "title" ? ' font-weight="600"' : "");
//@ chunk-3s7ydtfd.js:80165-80195 placement
/**
 * 文字的 y 坐标
 */
var textY = (e) => (e.at.y + SVG_HALF_CELL) * SVG_ROW_HEIGHT + SVG_TEXT_DY;
//@ chunk-3s7ydtfd.js:80195-80239 placement
/**
 * 文字的 x/y 属性
 */
var textXY = (e) => `x="${svgX(e.at.x)}" y="${textY(e)}"`;
//@ chunk-3s7ydtfd.js:80239-80745 placement
/**
 * 把一个图形（文字、柱、堆叠、坐标轴行、条带、色带、折线）转为 SVG 片段。
 */
function shapeToSvg(e) {
  switch (e.kind) {
    case "text":
      return `<text ${textXY(e)} ${textLengthAttr(e)} ${fillInkAttr(e)}>${escapeXmlText(e)}</text>`;
    case "bar":
      return svgRect(thinBarRect(e), hatchAttrs(e));
    case "stack":
      return prefixSums(e.parts, (t) => -t.height, e.at.y)
        .filter((t) => hasSvgHeight(t.part))
        .map((t) => svgRect(sparkRect(e, t)))
        .join("");
    case "axisRow": {
      let t = svgTickLine(e);
      return e.gridWidth > 0 ? `${t}${svgGridLine(e)}` : t;
    }
    case "strip":
      return `<polygon points="${stripPolygonPoints(e)}" ${svgFill(e.ink)}/>`;
    case "band":
      return prefixSums(e.parts, (t) => t.width, e.at.x)
        .map((t) => svgRect(bandPartRect(e, t)))
        .join("");
    case "line":
      return `<polyline points="${polylinePoints(e)}" ${strokeSeriesAttrs(e)}/>`;
  }
}
//@ chunk-3s7ydtfd.js:80745-80958 placement
var joined = [
  `text{font-size:${SVG_FONT_SIZE}px;font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre}`,
  "polyline{fill:none;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}",
  ".grid{opacity:.25}",
].join("");
//@ chunk-3s7ydtfd.js:80958-81030 placement
/**
 * 生成主题 CSS 变量
 */
var themeVars = (e) =>
  Object.entries(CHART_THEME_COLORS)
    .map(([key, value]) => `--${key}:${value[e]}`)
    .join(";");
//@ chunk-3s7ydtfd.js:81030-81075 placement
/**
 * 深色模式媒体查询
 */
var DARK_MODE_MEDIA = "@media (prefers-color-scheme: dark)";
//@ chunk-3s7ydtfd.js:81075-81486 placement = ansiToSvg (0.408)
function ansiToSvg(e) {
  let o = e.shapes.some((span) => span.kind === "stack" && !span.parts.every(hasSvgHeight))
    ? e.shapes
    : e.shapes.filter((spans) => !(spans.kind === "text" && spans.isAboutPartsLeftOut));
  let r = e.columns * SVG_COL_WIDTH;
  let s = (e.rows - (e.shapes.length - o.length)) * SVG_ROW_HEIGHT;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${s}" viewBox="0 0 ${r} ${s}">`,
    `<style>svg{${themeVars("light")}}${DARK_MODE_MEDIA}{svg{${themeVars("dark")}}}`,
    `${joined}</style>`,
    ...o.map(shapeToSvg),
    "</svg>",
  ].join(`
`);
}
export { ansiToSvg };
