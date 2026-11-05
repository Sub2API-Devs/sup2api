/**
 * plugins/functionHooks/ui/styleProps.ts
 *
 * 钩子文本样式属性表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (24)
 * attribution: placement 24
 */
import { BORDER_STYLE_NAMES } from "../../../ink/render-border.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:89644-89667 placement
/**
 * start/end
 */
var DECORATION_EDGE_KEYS = ["start", "end"];
//@ chunk-j8f885h1.js:89667-89758 placement
var TEXT_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "dimColor",
  "bold",
  "italic",
  "underline",
  "strikethrough",
];
//@ chunk-j8f885h1.js:89758-89779 placement
var VIRTUALTEXT = "virtualText";
//@ chunk-j8f885h1.js:89779-89804 placement
/**
 * 文本样式键集合
 */
var TEXT_STYLE_KEYS; // deferred: uses DECORATION_EDGE_KEYS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:89779", () => {
  TEXT_STYLE_KEYS = [...DECORATION_EDGE_KEYS, ...TEXT_STYLE_PROPS, VIRTUALTEXT];
});
//@ chunk-j8f885h1.js:89804-89894 placement
/**
 * 基本类型或空串
 */
function primitiveOrEmpty(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : "";
}
//@ chunk-j8f885h1.js:89894-90012 placement
var BOOLEAN_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:89894", () => {
  BOOLEAN_PROPS = new Set([
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
});
//@ chunk-j8f885h1.js:90012-90022 placement
var BORDER_ROWS = 2;
//@ chunk-j8f885h1.js:90022-90043 placement
var BORDER_STYLES; // deferred: uses BORDER_STYLE_NAMES (../../../ink/render-border.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:90022", () => {
  BORDER_STYLES = new Set(BORDER_STYLE_NAMES);
});
//@ chunk-j8f885h1.js:90043-90102 placement
var COLOR_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:90043", () => {
  COLOR_PROPS = new Set(["color", "backgroundColor", "borderColor"]);
});
//@ chunk-j8f885h1.js:90102-90337 placement
var HOVER_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:90102", () => {
  HOVER_PROPS = {
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
});
//@ chunk-j8f885h1.js:90337-90452 placement
var SPACE_CELLS = {
  xs: {
    across: 1,
    down: 0,
  },
  sm: {
    across: 1,
    down: 0,
  },
  md: {
    across: 2,
    down: 1,
  },
  lg: {
    across: 3,
    down: 1,
  },
  xl: {
    across: 4,
    down: 2,
  },
};
//@ chunk-j8f885h1.js:90452-90517 placement
function isSpaceStep(value) {
  return typeof value === "string" && Object.hasOwn(SPACE_CELLS, value);
}
//@ chunk-j8f885h1.js:90517-90786 placement
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
//@ chunk-j8f885h1.js:90786-90884 placement
var SPACE_PAIRS = {
  gap: ["columnGap", "rowGap"],
  margin: ["marginX", "marginY"],
  padding: ["paddingX", "paddingY"],
};
//@ chunk-j8f885h1.js:90884-90943 placement
var SPACE_PROPS; // deferred: uses SPACE_AXIS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:90884", () => {
  SPACE_PROPS = new Set([...Object.keys(SPACE_AXIS), ...Object.keys(SPACE_PAIRS)]);
});
//@ chunk-j8f885h1.js:90943-90993 placement
var NUMBER_PROPS; // deferred: uses SPACE_PROPS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:90943", () => {
  NUMBER_PROPS = new Set(["flexGrow", "flexShrink", ...SPACE_PROPS]);
});
//@ chunk-j8f885h1.js:90993-91042 placement
var OFFSET_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:90993", () => {
  OFFSET_PROPS = new Set(["top", "left", "right", "bottom"]);
});
//@ chunk-j8f885h1.js:91042-91778 placement (2.1.88 match: applyFlexStyles, 0.426)
var PROP_VALUES; // deferred: uses BORDER_STYLES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:91042", () => {
  PROP_VALUES = {
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
});
//@ chunk-j8f885h1.js:91778-92414 placement
var RENDER_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:91778", () => {
  RENDER_PROPS = {
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
});
//@ chunk-j8f885h1.js:92414-92426 placement
var SIZE_LIMIT = 1e4;
//@ chunk-j8f885h1.js:92426-92485 placement (2.1.88 match: applyDimensionStyles, 0.373)
var SIZE_PROPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:92426", () => {
  SIZE_PROPS = new Set(["width", "height", "minWidth", "minHeight"]);
});
//@ chunk-j8f885h1.js:92485-92550 placement
var CONCEALING_PROPS; // deferred: uses SIZE_PROPS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:92485", () => {
  CONCEALING_PROPS = new Set(["display", "overflow", "position", ...SIZE_PROPS, ...OFFSET_PROPS]);
});
//@ chunk-j8f885h1.js:92550-93528 placement
/**
 * 校验声明式 UI 的样式属性值（枚举、尺寸、间距 token、定位整数、颜色、布尔），不合法返回原因文字。注意：这不是 Ink 的 styles.ts。
 */
function propValueProblem(prop, value) {
  let allowed = PROP_VALUES[prop];
  if (allowed !== undefined)
    return typeof value === "string" && allowed.has(value)
      ? undefined
      : `must be one of ${[...allowed].join(", ")}`;
  if (SIZE_PROPS.has(prop)) {
    if (typeof value === "number")
      return Number.isFinite(value) && value >= 0 && value <= SIZE_LIMIT
        ? undefined
        : `must be a finite number between 0 and ${SIZE_LIMIT}`;
    return typeof value === "string" && /^\d{1,3}%$/.test(value)
      ? undefined
      : "must be a number or a percentage";
  }
  if (NUMBER_PROPS.has(prop)) {
    let isNumberInRange =
      typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= SIZE_LIMIT;
    let allowsSpaceStep = SPACE_PROPS.has(prop);
    if (isNumberInRange || (allowsSpaceStep && isSpaceStep(value))) return;
    return allowsSpaceStep
      ? `must be a number of cells from -${SIZE_LIMIT} to ${SIZE_LIMIT}, or one of ${Object.keys(SPACE_CELLS).join(", ")}`
      : `must be a finite number within ${SIZE_LIMIT}`;
  }
  if (OFFSET_PROPS.has(prop))
    return typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= SIZE_LIMIT
      ? undefined
      : `must be an integer within ${SIZE_LIMIT} (character cells)`;
  if (COLOR_PROPS.has(prop))
    return typeof value === "string" && /^[#a-zA-Z0-9_().,% -]{1,40}$/.test(value)
      ? undefined
      : "must be a color (a theme key, a name, or hex)";
  if (BOOLEAN_PROPS.has(prop)) return typeof value === "boolean" ? undefined : "must be a boolean";
  return "has no value rule";
}
//@ chunk-j8f885h1.js:93528-93634 placement
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
  TEXT_STYLE_PROPS,
  BOOLEAN_PROPS,
  BORDER_ROWS,
  BORDER_STYLES,
  COLOR_PROPS,
  CONCEALING_PROPS,
  HOVER_PROPS,
  NUMBER_PROPS,
  OFFSET_PROPS,
  PROP_VALUES,
  RENDER_PROPS,
  ROWS_PER_UNIT,
  SIZE_LIMIT,
  SIZE_PROPS,
  SPACE_AXIS,
  SPACE_CELLS,
  SPACE_PAIRS,
  SPACE_PROPS,
  isSpaceStep,
  propValueProblem,
  TEXT_STYLE_KEYS,
  DECORATION_EDGE_KEYS,
  VIRTUALTEXT,
  primitiveOrEmpty,
};
