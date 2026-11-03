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
    let r = str[i];
    if (r === ";" || r === undefined) {
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
    } else if (r === ":") {
      let n = num === "" ? null : parseInt(num, 10);
      if (!inSub) {
        current.value = n;
        current.colon = true;
        inSub = true;
      } else if (n !== null) current.subparams.push(n);
      num = "";
    } else if (r >= "0" && r <= "9") num += r;
  }
  return result;
}
//@ chunk-m1vyn8g1.js:1425-2010 fingerprint = parseExtendedColor (1)
/**
 * 解析 38/48/58 扩展颜色：冒号形式（5:n / 2:[cs:]r:g:b）或分号形式（;5;n / ;2;r;g;b）。
 */
function parseExtendedColor(params, idx) {
  let o = params[idx];
  if (!o) return null;
  if (o.colon && o.subparams.length >= 1) {
    if (o.subparams[0] === 5 && o.subparams.length >= 2)
      return {
        index: o.subparams[1],
      };
    if (o.subparams[0] === 2 && o.subparams.length >= 4) {
      let off = o.subparams.length >= 5 ? 1 : 0;
      return {
        r: o.subparams[1 + off],
        g: o.subparams[2 + off],
        b: o.subparams[3 + off],
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
    let i = params[idx + 2]?.value;
    let s = params[idx + 3]?.value;
    let r = params[idx + 4]?.value;
    if (i !== null && i !== undefined && s !== null && s !== undefined && r !== null && r !== undefined)
      return {
        r: i,
        g: s,
        b: r,
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
  let t = {
    ...style,
  };
  let idx = 0;
  while (idx < params.length) {
    let s = params[idx];
    let code = s.value ?? 0;
    if (code === 0) {
      t = defaultStyle();
      idx++;
      continue;
    }
    if (code === 1) {
      t.bold = true;
      idx++;
      continue;
    }
    if (code === 2) {
      t.dim = true;
      idx++;
      continue;
    }
    if (code === 3) {
      t.italic = true;
      idx++;
      continue;
    }
    if (code === 4) {
      t.underline = s.colon ? (UNDERLINE_STYLES[s.subparams[0]] ?? "single") : "single";
      idx++;
      continue;
    }
    if (code === 5 || code === 6) {
      t.blink = true;
      idx++;
      continue;
    }
    if (code === 7) {
      t.inverse = true;
      idx++;
      continue;
    }
    if (code === 8) {
      t.hidden = true;
      idx++;
      continue;
    }
    if (code === 9) {
      t.strikethrough = true;
      idx++;
      continue;
    }
    if (code === 21) {
      t.underline = "double";
      idx++;
      continue;
    }
    if (code === 22) {
      t.bold = false;
      t.dim = false;
      idx++;
      continue;
    }
    if (code === 23) {
      t.italic = false;
      idx++;
      continue;
    }
    if (code === 24) {
      t.underline = "none";
      idx++;
      continue;
    }
    if (code === 25) {
      t.blink = false;
      idx++;
      continue;
    }
    if (code === 27) {
      t.inverse = false;
      idx++;
      continue;
    }
    if (code === 28) {
      t.hidden = false;
      idx++;
      continue;
    }
    if (code === 29) {
      t.strikethrough = false;
      idx++;
      continue;
    }
    if (code === 53) {
      t.overline = true;
      idx++;
      continue;
    }
    if (code === 55) {
      t.overline = false;
      idx++;
      continue;
    }
    if (code >= 30 && code <= 37) {
      t.fg = {
        type: "named",
        name: NAMED_COLORS[code - 30],
      };
      idx++;
      continue;
    }
    if (code === 39) {
      t.fg = {
        type: "default",
      };
      idx++;
      continue;
    }
    if (code >= 40 && code <= 47) {
      t.bg = {
        type: "named",
        name: NAMED_COLORS[code - 40],
      };
      idx++;
      continue;
    }
    if (code === 49) {
      t.bg = {
        type: "default",
      };
      idx++;
      continue;
    }
    if (code >= 90 && code <= 97) {
      t.fg = {
        type: "named",
        name: NAMED_COLORS[code - 90 + 8],
      };
      idx++;
      continue;
    }
    if (code >= 100 && code <= 107) {
      t.bg = {
        type: "named",
        name: NAMED_COLORS[code - 100 + 8],
      };
      idx++;
      continue;
    }
    if (code === 38 || code === 48 || code === 58) {
      let extendedColor = parseExtendedColor(params, idx);
      if (extendedColor) {
        let p =
          "index" in extendedColor
            ? {
                type: "indexed",
                index: extendedColor.index,
              }
            : {
                type: "rgb",
                ...extendedColor,
              };
        if (code === 38) t.fg = p;
        else if (code === 48) t.bg = p;
        else t.underlineColor = p;
      }
      let m = params[idx + 1]?.value;
      idx += s.colon ? 1 : m === 5 ? 3 : m === 2 ? 5 : 1;
      continue;
    }
    if (code === 59) {
      t.underlineColor = {
        type: "default",
      };
      idx++;
      continue;
    }
    idx++;
  }
  return t;
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
