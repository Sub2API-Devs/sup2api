/**
 * ink/termio/sgr.ts
 *
 * SGR 参数解析为文本样式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/sgr.ts
 * pieces: chunk-m1vyn8g1.js (4)
 * attribution: fingerprint 4
 */
import { csi } from "./csi.js";
import { defaultStyle } from "./types.js";

//@ chunk-m1vyn8g1.js:510-937 fingerprint = NAMED_COLORS (0.876)
var SGR_RESET = csi(0, "m");
var SGR_BOLD = csi(1, "m");
var SGR_DIM = csi(2, "m");
var SGR_UNDERLINE = csi(4, "m");
var SGR_INVERSE = csi(7, "m");
var SGR_FG_YELLOW = csi(33, "m");
var SGR_NORMAL_INTENSITY = csi(22, "m");
var SGR_NO_UNDERLINE = csi(24, "m");
var SGR_NO_INVERSE = csi(27, "m");
var SGR_NO_STRIKETHROUGH = csi(29, "m");
var SGR_DEFAULT_FG = csi(39, "m");
var SGR_DEFAULT_BG = csi(49, "m");
var SGR_NO_OVERLINE = csi(55, "m");
var NAMED_COLORS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
];
var UNDERLINE_STYLES = ["none", "single", "double", "curly", "dotted", "dashed"];
//@ chunk-m1vyn8g1.js:937-1425 fingerprint = parseParams (1)
/**
 * 解析 SGR 参数串（; 分隔参数、: 分隔子参数）。
 */
function parseParams(str) {
  if (str === "")
    return [
      {
        value: 0,
        subparams: [],
        colon: false,
      },
    ];
  let result = [];
  let current = {
    value: null,
    subparams: [],
    colon: false,
  };
  let num = "";
  let inSub = false;
  for (let i = 0; i <= str.length; i++) {
    let char = str[i];
    if (char === ";" || char === undefined) {
      let n = num === "" ? null : parseInt(num, 10);
      if (inSub) {
        if (n !== null) current.subparams.push(n);
      } else current.value = n;
      result.push(current);
      current = {
        value: null,
        subparams: [],
        colon: false,
      };
      num = "";
      inSub = false;
    } else if (char === ":") {
      let n = num === "" ? null : parseInt(num, 10);
      if (!inSub) {
        current.value = n;
        current.colon = true;
        inSub = true;
      } else if (n !== null) current.subparams.push(n);
      num = "";
    } else if (char >= "0" && char <= "9") num += char;
  }
  return result;
}
//@ chunk-m1vyn8g1.js:1425-2010 fingerprint = parseExtendedColor (1)
/**
 * 解析 38/48/58 扩展颜色：冒号形式（5:n / 2:[cs:]r:g:b）或分号形式（;5;n / ;2;r;g;b）。
 */
function parseExtendedColor(params, idx) {
  let param = params[idx];
  if (!param) return null;
  if (param.colon && param.subparams.length >= 1) {
    if (param.subparams[0] === 5 && param.subparams.length >= 2)
      return {
        index: param.subparams[1],
      };
    if (param.subparams[0] === 2 && param.subparams.length >= 4) {
      let off = param.subparams.length >= 5 ? 1 : 0;
      return {
        r: param.subparams[1 + off],
        g: param.subparams[2 + off],
        b: param.subparams[3 + off],
      };
    }
  }
  let next = params[idx + 1];
  if (!next) return null;
  if (next.value === 5 && params[idx + 2]?.value !== null && params[idx + 2]?.value !== undefined)
    return {
      index: params[idx + 2].value,
    };
  if (next.value === 2) {
    let red = params[idx + 2]?.value;
    let green = params[idx + 3]?.value;
    let blue = params[idx + 4]?.value;
    if (
      red !== null &&
      red !== undefined &&
      green !== null &&
      green !== undefined &&
      blue !== null &&
      blue !== undefined
    )
      return {
        r: red,
        g: green,
        b: blue,
      };
  }
  return null;
}
//@ chunk-m1vyn8g1.js:2010-3511 fingerprint = applySGR (1)
/**
 * 把一条 SGR 应用到 termio 文本样式：重置、粗/暗/斜/下划线（含 4:x 样式与 21 双下划线）/闪烁/反显/隐藏/删除线/上划线及其关闭码、16 色前景背景（含亮色）、256 色与真彩色、下划线颜色。
 */
function applySGR(paramStr, style) {
  let params = parseParams(paramStr);
  let style_2 = {
    ...style,
  };
  let idx = 0;
  while (idx < params.length) {
    let param = params[idx];
    let code = param.value ?? 0;
    if (code === 0) {
      style_2 = defaultStyle();
      idx++;
      continue;
    }
    if (code === 1) {
      style_2.bold = true;
      idx++;
      continue;
    }
    if (code === 2) {
      style_2.dim = true;
      idx++;
      continue;
    }
    if (code === 3) {
      style_2.italic = true;
      idx++;
      continue;
    }
    if (code === 4) {
      style_2.underline = param.colon ? (UNDERLINE_STYLES[param.subparams[0]] ?? "single") : "single";
      idx++;
      continue;
    }
    if (code === 5 || code === 6) {
      style_2.blink = true;
      idx++;
      continue;
    }
    if (code === 7) {
      style_2.inverse = true;
      idx++;
      continue;
    }
    if (code === 8) {
      style_2.hidden = true;
      idx++;
      continue;
    }
    if (code === 9) {
      style_2.strikethrough = true;
      idx++;
      continue;
    }
    if (code === 21) {
      style_2.underline = "double";
      idx++;
      continue;
    }
    if (code === 22) {
      style_2.bold = false;
      style_2.dim = false;
      idx++;
      continue;
    }
    if (code === 23) {
      style_2.italic = false;
      idx++;
      continue;
    }
    if (code === 24) {
      style_2.underline = "none";
      idx++;
      continue;
    }
    if (code === 25) {
      style_2.blink = false;
      idx++;
      continue;
    }
    if (code === 27) {
      style_2.inverse = false;
      idx++;
      continue;
    }
    if (code === 28) {
      style_2.hidden = false;
      idx++;
      continue;
    }
    if (code === 29) {
      style_2.strikethrough = false;
      idx++;
      continue;
    }
    if (code === 53) {
      style_2.overline = true;
      idx++;
      continue;
    }
    if (code === 55) {
      style_2.overline = false;
      idx++;
      continue;
    }
    if (code >= 30 && code <= 37) {
      style_2.fg = {
        type: "named",
        name: NAMED_COLORS[code - 30],
      };
      idx++;
      continue;
    }
    if (code === 39) {
      style_2.fg = {
        type: "default",
      };
      idx++;
      continue;
    }
    if (code >= 40 && code <= 47) {
      style_2.bg = {
        type: "named",
        name: NAMED_COLORS[code - 40],
      };
      idx++;
      continue;
    }
    if (code === 49) {
      style_2.bg = {
        type: "default",
      };
      idx++;
      continue;
    }
    if (code >= 90 && code <= 97) {
      style_2.fg = {
        type: "named",
        name: NAMED_COLORS[code - 90 + 8],
      };
      idx++;
      continue;
    }
    if (code >= 100 && code <= 107) {
      style_2.bg = {
        type: "named",
        name: NAMED_COLORS[code - 100 + 8],
      };
      idx++;
      continue;
    }
    if (code === 38 || code === 48 || code === 58) {
      let extendedColor = parseExtendedColor(params, idx);
      if (extendedColor) {
        let colorSpec =
          "index" in extendedColor
            ? {
                type: "indexed",
                index: extendedColor.index,
              }
            : {
                type: "rgb",
                ...extendedColor,
              };
        if (code === 38) style_2.fg = colorSpec;
        else if (code === 48) style_2.bg = colorSpec;
        else style_2.underlineColor = colorSpec;
      }
      let colorKind = params[idx + 1]?.value;
      idx += param.colon ? 1 : colorKind === 5 ? 3 : colorKind === 2 ? 5 : 1;
      continue;
    }
    if (code === 59) {
      style_2.underlineColor = {
        type: "default",
      };
      idx++;
      continue;
    }
    idx++;
  }
  return style_2;
}
export {
  SGR_BOLD,
  SGR_DIM,
  SGR_NORMAL_INTENSITY,
  SGR_INVERSE,
  SGR_NO_INVERSE,
  SGR_UNDERLINE,
  SGR_NO_UNDERLINE,
  SGR_FG_YELLOW,
  SGR_DEFAULT_FG,
  SGR_DEFAULT_BG,
  SGR_NO_STRIKETHROUGH,
  SGR_NO_OVERLINE,
  SGR_RESET,
  applySGR,
};
