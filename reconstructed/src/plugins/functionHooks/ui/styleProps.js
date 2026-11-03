/**
 * plugins/functionHooks/ui/styleProps.ts
 *
 * 钩子文本样式属性表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (24)
 * attribution: placement 24
 */
import { BORDER_STYLE_NAMES } from "../../../ink/render-border.js";

//@ chunk-4121qate.js:109038-109061 placement
var Ir = ["start", "end"];
//@ chunk-4121qate.js:109061-109152 placement
var TEXT_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "dimColor",
  "bold",
  "italic",
  "underline",
  "strikethrough",
];
//@ chunk-4121qate.js:109152-109173 placement
var VIRTUALTEXT = "virtualText";
//@ chunk-4121qate.js:109173-109198 placement
var vs = [...Ir, ...TEXT_STYLE_PROPS, VIRTUALTEXT];
//@ chunk-4121qate.js:109198-109288 placement
function yf(e) {
  return typeof e === "string" || typeof e === "number" || typeof e === "boolean" ? e : "";
}
//@ chunk-4121qate.js:109288-109406 placement
var BOOLEAN_PROPS = new Set([
  "dimColor",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "inverse",
  "borderDimColor",
  "mono",
  "tabular",
]);
//@ chunk-4121qate.js:109406-109416 placement
var BORDER_ROWS = 2;
//@ chunk-4121qate.js:109416-109437 placement
var BORDER_STYLES = new Set(BORDER_STYLE_NAMES);
//@ chunk-4121qate.js:109437-109496 placement
var COLOR_PROPS = new Set(["color", "backgroundColor", "borderColor"]);
//@ chunk-4121qate.js:109496-109731 placement
var HOVER_PROPS = {
  Box: new Set([
    "borderStyle",
    "borderColor",
    "borderDimColor",
    "backgroundColor",
    "display",
    "top",
    "left",
    "right",
    "bottom",
  ]),
  Text: new Set([
    "color",
    "backgroundColor",
    "dimColor",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "inverse",
  ]),
};
//@ chunk-4121qate.js:109731-109846 placement
var SPACE_CELLS = {
  xs: { across: 1, down: 0 },
  sm: { across: 1, down: 0 },
  md: { across: 2, down: 1 },
  lg: { across: 3, down: 1 },
  xl: { across: 4, down: 2 },
};
//@ chunk-4121qate.js:109846-109911 placement
function isSpaceStep(e) {
  return typeof e === "string" && Object.hasOwn(SPACE_CELLS, e);
}
//@ chunk-4121qate.js:109911-110180 placement
var SPACE_AXIS = {
  columnGap: "across",
  rowGap: "down",
  marginX: "across",
  marginY: "down",
  marginLeft: "across",
  marginRight: "across",
  marginTop: "down",
  marginBottom: "down",
  paddingX: "across",
  paddingY: "down",
  paddingLeft: "across",
  paddingRight: "across",
  paddingTop: "down",
  paddingBottom: "down",
};
//@ chunk-4121qate.js:110180-110278 placement = applyGapStyles (0.349)
var SPACE_PAIRS = {
  gap: ["columnGap", "rowGap"],
  margin: ["marginX", "marginY"],
  padding: ["paddingX", "paddingY"],
};
//@ chunk-4121qate.js:110278-110337 placement
var SPACE_PROPS = new Set([...Object.keys(SPACE_AXIS), ...Object.keys(SPACE_PAIRS)]);
//@ chunk-4121qate.js:110337-110387 placement
var NUMBER_PROPS = new Set(["flexGrow", "flexShrink", ...SPACE_PROPS]);
//@ chunk-4121qate.js:110387-110436 placement
var OFFSET_PROPS = new Set(["top", "left", "right", "bottom"]);
//@ chunk-4121qate.js:110436-111172 placement = applyFlexStyles (0.426)
var PROP_VALUES = {
  flexDirection: new Set(["row", "column", "row-reverse", "column-reverse"]),
  flexWrap: new Set(["nowrap", "wrap", "wrap-reverse"]),
  alignItems: new Set(["flex-start", "center", "flex-end", "stretch"]),
  alignSelf: new Set(["flex-start", "center", "flex-end", "auto"]),
  justifyContent: new Set([
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
    "space-evenly",
  ]),
  overflow: new Set(["visible", "hidden"]),
  display: new Set(["flex", "none"]),
  position: new Set(["relative", "absolute"]),
  dir: new Set(["ltr", "rtl"]),
  wrap: new Set(["wrap", "end", "middle", "truncate-end", "truncate", "truncate-middle", "truncate-start"]),
  borderStyle: BORDER_STYLES,
  size: new Set(["caption", "footnote", "body", "heading", "title"]),
  weight: new Set(["regular", "medium", "semibold", "bold"]),
};
//@ chunk-4121qate.js:111172-111808 placement
var RENDER_PROPS = {
  Box: new Set([
    "flexDirection",
    "flexGrow",
    "flexShrink",
    "flexWrap",
    "alignItems",
    "alignSelf",
    "justifyContent",
    "gap",
    "columnGap",
    "rowGap",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "margin",
    "marginX",
    "marginY",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "padding",
    "paddingX",
    "paddingY",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "borderStyle",
    "borderColor",
    "borderDimColor",
    "backgroundColor",
    "overflow",
    "display",
    "position",
    "top",
    "left",
    "right",
    "bottom",
  ]),
  Text: new Set([
    "color",
    "backgroundColor",
    "dimColor",
    "size",
    "weight",
    "mono",
    "tabular",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "inverse",
    "dir",
    "wrap",
  ]),
};
//@ chunk-4121qate.js:111808-111820 placement
var SIZE_LIMIT = 1e4;
//@ chunk-4121qate.js:111820-111879 placement = applyDimensionStyles (0.373)
var SIZE_PROPS = new Set(["width", "height", "minWidth", "minHeight"]);
//@ chunk-4121qate.js:111879-111944 placement
var CONCEALING_PROPS = new Set(["display", "overflow", "position", ...SIZE_PROPS, ...OFFSET_PROPS]);
/**
 * 校验声明式 UI 的样式属性值（枚举、尺寸、间距 token、定位整数、颜色、布尔），不合法返回原因文字。注意：这不是 Ink 的 styles.ts。
 */
//@ chunk-4121qate.js:111944-112922 placement
function propValueProblem(prop, value) {
  let r = PROP_VALUES[prop];
  if (r !== void 0)
    return typeof value === "string" && r.has(value) ? void 0 : `must be one of ${[...r].join(", ")}`;
  if (SIZE_PROPS.has(prop)) {
    if (typeof value === "number")
      return Number.isFinite(value) && value >= 0 && value <= SIZE_LIMIT
        ? void 0
        : `must be a finite number between 0 and ${SIZE_LIMIT}`;
    return typeof value === "string" && /^\d{1,3}%$/.test(value)
      ? void 0
      : "must be a number or a percentage";
  }
  if (NUMBER_PROPS.has(prop)) {
    let n = typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= SIZE_LIMIT,
      s = SPACE_PROPS.has(prop);
    if (n || (s && isSpaceStep(value))) return;
    return s
      ? `must be a number of cells from -${SIZE_LIMIT} to ${SIZE_LIMIT}, or one of ${Object.keys(SPACE_CELLS).join(", ")}`
      : `must be a finite number within ${SIZE_LIMIT}`;
  }
  if (OFFSET_PROPS.has(prop))
    return typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= SIZE_LIMIT
      ? void 0
      : `must be an integer within ${SIZE_LIMIT} (character cells)`;
  if (COLOR_PROPS.has(prop))
    return typeof value === "string" && /^[#a-zA-Z0-9_().,% -]{1,40}$/.test(value)
      ? void 0
      : "must be a color (a theme key, a name, or hex)";
  if (BOOLEAN_PROPS.has(prop)) return typeof value === "boolean" ? void 0 : "must be a boolean";
  return "has no value rule";
}
//@ chunk-4121qate.js:112922-113028 placement
var ROWS_PER_UNIT = {
  padding: 2,
  paddingY: 2,
  paddingTop: 1,
  paddingBottom: 1,
  margin: 2,
  marginY: 2,
  marginTop: 1,
  marginBottom: 1,
};

export {
  vs,
  Ir,
  VIRTUALTEXT,
  TEXT_STYLE_PROPS,
  propValueProblem,
  yf,
  OFFSET_PROPS,
  HOVER_PROPS,
  BORDER_STYLES,
  SPACE_PROPS,
  isSpaceStep,
  SPACE_PAIRS,
  SPACE_AXIS,
  SPACE_CELLS,
  SIZE_PROPS,
  RENDER_PROPS,
  CONCEALING_PROPS,
  ROWS_PER_UNIT,
  BORDER_ROWS,
  BOOLEAN_PROPS,
  COLOR_PROPS,
  NUMBER_PROPS,
  PROP_VALUES,
  SIZE_LIMIT,
};
