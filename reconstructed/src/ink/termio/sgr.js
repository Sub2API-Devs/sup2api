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
var SGR_RESET = csi(0, "m"),
  SGR_BOLD = csi(1, "m"),
  SGR_DIM = csi(2, "m"),
  SGR_UNDERLINE = csi(4, "m"),
  SGR_INVERSE = csi(7, "m"),
  SGR_FG_YELLOW = csi(33, "m"),
  SGR_NORMAL_INTENSITY = csi(22, "m"),
  SGR_NO_UNDERLINE = csi(24, "m"),
  SGR_NO_INVERSE = csi(27, "m"),
  SGR_NO_STRIKETHROUGH = csi(29, "m"),
  SGR_DEFAULT_FG = csi(39, "m"),
  SGR_DEFAULT_BG = csi(49, "m"),
  SGR_NO_OVERLINE = csi(55, "m"),
  NAMED_COLORS = [
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
  ],
  UNDERLINE_STYLES = ["none", "single", "double", "curly", "dotted", "dashed"];
/**
 * 解析 SGR 参数串（; 分隔参数、: 分隔子参数）。
 */
//@ chunk-m1vyn8g1.js:937-1425 fingerprint = parseParams (1)
function parseParams(str) {
  if (str === "") return [{ value: 0, subparams: [], colon: !1 }];
  let result = [],
    current = { value: null, subparams: [], colon: !1 },
    num = "",
    i = !1;
  for (let s = 0; s <= str.length; s++) {
    let r = str[s];
    if (r === ";" || r === void 0) {
      let u = num === "" ? null : parseInt(num, 10);
      if (i) {
        if (u !== null) current.subparams.push(u);
      } else current.value = u;
      (result.push(current), (current = { value: null, subparams: [], colon: !1 }), (num = ""), (i = !1));
    } else if (r === ":") {
      let u = num === "" ? null : parseInt(num, 10);
      if (!i) ((current.value = u), (current.colon = !0), (i = !0));
      else if (u !== null) current.subparams.push(u);
      num = "";
    } else if (r >= "0" && r <= "9") num += r;
  }
  return result;
}
/**
 * 解析 38/48/58 扩展颜色：冒号形式（5:n / 2:[cs:]r:g:b）或分号形式（;5;n / ;2;r;g;b）。
 */
//@ chunk-m1vyn8g1.js:1425-2010 fingerprint = parseExtendedColor (1)
function parseExtendedColor(params, idx) {
  let o = params[idx];
  if (!o) return null;
  if (o.colon && o.subparams.length >= 1) {
    if (o.subparams[0] === 5 && o.subparams.length >= 2) return { index: o.subparams[1] };
    if (o.subparams[0] === 2 && o.subparams.length >= 4) {
      let off = o.subparams.length >= 5 ? 1 : 0;
      return { r: o.subparams[1 + off], g: o.subparams[2 + off], b: o.subparams[3 + off] };
    }
  }
  let t = params[idx + 1];
  if (!t) return null;
  if (t.value === 5 && params[idx + 2]?.value !== null && params[idx + 2]?.value !== void 0)
    return { index: params[idx + 2].value };
  if (t.value === 2) {
    let i = params[idx + 2]?.value,
      s = params[idx + 3]?.value,
      r = params[idx + 4]?.value;
    if (i !== null && i !== void 0 && s !== null && s !== void 0 && r !== null && r !== void 0)
      return { r: i, g: s, b: r };
  }
  return null;
}
/**
 * 把一条 SGR 应用到 termio 文本样式：重置、粗/暗/斜/下划线（含 4:x 样式与 21 双下划线）/闪烁/反显/隐藏/删除线/上划线及其关闭码、16 色前景背景（含亮色）、256 色与真彩色、下划线颜色。
 */
//@ chunk-m1vyn8g1.js:2010-3511 fingerprint = applySGR (1)
function applySGR(paramStr, style) {
  let params = parseParams(paramStr),
    t = { ...style },
    i = 0;
  while (i < params.length) {
    let s = params[i],
      code = s.value ?? 0;
    if (code === 0) {
      ((t = defaultStyle()), i++);
      continue;
    }
    if (code === 1) {
      ((t.bold = !0), i++);
      continue;
    }
    if (code === 2) {
      ((t.dim = !0), i++);
      continue;
    }
    if (code === 3) {
      ((t.italic = !0), i++);
      continue;
    }
    if (code === 4) {
      ((t.underline = s.colon ? (UNDERLINE_STYLES[s.subparams[0]] ?? "single") : "single"), i++);
      continue;
    }
    if (code === 5 || code === 6) {
      ((t.blink = !0), i++);
      continue;
    }
    if (code === 7) {
      ((t.inverse = !0), i++);
      continue;
    }
    if (code === 8) {
      ((t.hidden = !0), i++);
      continue;
    }
    if (code === 9) {
      ((t.strikethrough = !0), i++);
      continue;
    }
    if (code === 21) {
      ((t.underline = "double"), i++);
      continue;
    }
    if (code === 22) {
      ((t.bold = !1), (t.dim = !1), i++);
      continue;
    }
    if (code === 23) {
      ((t.italic = !1), i++);
      continue;
    }
    if (code === 24) {
      ((t.underline = "none"), i++);
      continue;
    }
    if (code === 25) {
      ((t.blink = !1), i++);
      continue;
    }
    if (code === 27) {
      ((t.inverse = !1), i++);
      continue;
    }
    if (code === 28) {
      ((t.hidden = !1), i++);
      continue;
    }
    if (code === 29) {
      ((t.strikethrough = !1), i++);
      continue;
    }
    if (code === 53) {
      ((t.overline = !0), i++);
      continue;
    }
    if (code === 55) {
      ((t.overline = !1), i++);
      continue;
    }
    if (code >= 30 && code <= 37) {
      ((t.fg = { type: "named", name: NAMED_COLORS[code - 30] }), i++);
      continue;
    }
    if (code === 39) {
      ((t.fg = { type: "default" }), i++);
      continue;
    }
    if (code >= 40 && code <= 47) {
      ((t.bg = { type: "named", name: NAMED_COLORS[code - 40] }), i++);
      continue;
    }
    if (code === 49) {
      ((t.bg = { type: "default" }), i++);
      continue;
    }
    if (code >= 90 && code <= 97) {
      ((t.fg = { type: "named", name: NAMED_COLORS[code - 90 + 8] }), i++);
      continue;
    }
    if (code >= 100 && code <= 107) {
      ((t.bg = { type: "named", name: NAMED_COLORS[code - 100 + 8] }), i++);
      continue;
    }
    if (code === 38 || code === 48 || code === 58) {
      let u = parseExtendedColor(params, i);
      if (u) {
        let p = "index" in u ? { type: "indexed", index: u.index } : { type: "rgb", ...u };
        if (code === 38) t.fg = p;
        else if (code === 48) t.bg = p;
        else t.underlineColor = p;
      }
      let m = params[i + 1]?.value;
      i += s.colon ? 1 : m === 5 ? 3 : m === 2 ? 5 : 1;
      continue;
    }
    if (code === 59) {
      ((t.underlineColor = { type: "default" }), i++);
      continue;
    }
    i++;
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
