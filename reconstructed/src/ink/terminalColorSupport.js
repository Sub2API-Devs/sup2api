/**
 * ink/terminalColorSupport.ts
 *
 * 2.1.316 新增：终端环境识别（JetBrains、Windows Terminal、VS Code、ghostty 等）；把 RGB 颜色转换为 256 色索引等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g3xfp0ds.js (13)
 * attribution: placement 13
 */
import { csi } from "./termio/csi.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-g3xfp0ds.js:387-611 placement
/**
 * 终端支持的标准 ANSI 颜色名表。
 */
var ANSI_COLOR_NAMES = {
  black: true,
  red: true,
  green: true,
  yellow: true,
  blue: true,
  magenta: true,
  cyan: true,
  white: true,
  blackBright: true,
  redBright: true,
  greenBright: true,
  yellowBright: true,
  blueBright: true,
  magentaBright: true,
  cyanBright: true,
  whiteBright: true,
};
var ANSI_COLOR_NAME_SET = new Set(Object.keys(ANSI_COLOR_NAMES));
//@ chunk-g3xfp0ds.js:611-641 placement
/**
 * SGR 30
 */
var ANSI_FG_BLACK = csi(30, "m");
var ANSI_FG_WHITE = csi(37, "m");
//@ chunk-g3xfp0ds.js:641-677 placement
/**
 * 判断 SGR 序列是否为前景色 30 或 37（用作“默认色”近似）。
 */
function isDefaultFgColor(r) {
  return r === ANSI_FG_WHITE || r === ANSI_FG_BLACK;
}
//@ chunk-g3xfp0ds.js:677-2321 placement
/**
 * 终端环境识别（JetBrains、Windows Terminal、VS Code、ghostty 等）。
 */
class TerminalDetector {
  proc;
  constructor(proc = process) {
    this.proc = proc;
  }
  isJetBrainsIdeTerminal() {
    return this.proc.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
  }
  isMicrosoftWindowsTerminal() {
    return this.proc.platform === "win32" && !!this.proc.env.WT_SESSION;
  }
  isGhostty() {
    return this.proc.env.TERM === "xterm-ghostty" || this.proc.env.TERM_PROGRAM === "ghostty";
  }
  isVteBasedTerminal(r) {
    let env = this.proc.env;
    return (
      isNonEmptyString(env.VTE_VERSION) &&
      (r === "vte-based" || r === "gnome-terminal") &&
      (env.TERM ?? "").trim().startsWith("xterm") &&
      !isNonEmptyString(env.TMUX) &&
      !isNonEmptyString(env.STY) &&
      env.ZELLIJ === undefined &&
      !isNonEmptyString(env.XTERM_VERSION) &&
      !isNonEmptyString(env.ALACRITTY_WINDOW_ID) &&
      !isNonEmptyString(env.ALACRITTY_LOG) &&
      !isNonEmptyString(env.KITTY_WINDOW_ID) &&
      !isNonEmptyString(env.WEZTERM_PANE) &&
      !isNonEmptyString(env.INSIDE_EMACS) &&
      !isNonEmptyString(env.VIM_TERMINAL) &&
      !isNonEmptyString(env.NVIM)
    );
  }
  isMintty() {
    if (this.proc.env.TERM_PROGRAM === "mintty") return true;
    if (this.proc.platform === "win32" && this.proc.env.MSYSTEM) return true;
    return false;
  }
  windowsConsoleSupportsVirtualTerminalSequences() {
    if (this.isMicrosoftWindowsTerminal()) return true;
    if (
      this.proc.platform === "win32" &&
      this.proc.env.TERM_PROGRAM === "vscode" &&
      this.proc.env.TERM_PROGRAM_VERSION
    )
      return true;
    if (this.isMintty()) return true;
    return false;
  }
  hasGeometricShapesInkBleedBug() {
    return this.isGhostty();
  }
  hasUnknownSequencePrintingBug(r) {
    return this.isVteBasedTerminal(r) && Number.parseInt(this.proc.env.VTE_VERSION ?? "", 10) < 5300;
  }
  hasOsc52ClipboardUtf8Bug() {
    if (this.proc.env.TERM_PROGRAM !== "vscode") return false;
    let versionNumber = parseVersionNumber(this.proc.env.TERM_PROGRAM_VERSION);
    return versionNumber !== null && versionNumber >= 1123000 && versionNumber < 1125000;
  }
  macCmdClickArrivesWithoutSgrModifierBit() {
    return (
      this.proc.platform === "darwin" &&
      (this.proc.env.TERM_PROGRAM === "ghostty" || this.proc.env.TERM_PROGRAM === "WarpTerminal")
    );
  }
  rendersItalicAsStandout() {
    return (this.proc.env.TERM ?? "").startsWith("screen");
  }
}
//@ chunk-g3xfp0ds.js:2321-2443 placement
function parseVersionNumber(r) {
  if (!r) return null;
  let match = /^(\d+)\.(\d+)\.(\d+)/.exec(r);
  if (!match) return null;
  return +match[1] * 1e6 + +match[2] * 1000 + +match[3];
}
//@ chunk-g3xfp0ds.js:2443-2483 placement
/**
 * 去空白后非空
 */
function isNonEmptyString(r) {
  return (r ?? "").trim() !== "";
}
//@ chunk-g3xfp0ds.js:2483-2496 placement
/**
 * 终端识别单例。
 */
var terminalDetector = new TerminalDetector();
//@ chunk-g3xfp0ds.js:2496-2541 placement
/**
 * 24 位颜色 SGR 正则
 */
var TRUECOLOR_SGR_RE = /^\x1b\[([34]8);2;(\d+);(\d+);(\d+)m$/;
//@ chunk-g3xfp0ds.js:2541-2798 placement
/**
 * 终端不支持真彩色时，把样式中的 24 位颜色代码降级为可用的颜色。
 */
function downgradeTrueColorCodes(r) {
  if (sequential.level >= 3 || r.length === 0) return r;
  let e;
  for (let j = 0; j < r.length; j++) {
    let o = r[j];
    let match = TRUECOLOR_SGR_RE.exec(o.code);
    if (match) {
      e ??= r.slice(0, j);
      e.push({
        type: "ansi",
        code: `\x1B[${match[1]};5;${rgbToAnsi256(+match[2], +match[3], +match[4])}m`,
        endCode: o.endCode,
      });
    } else if (e) e.push(o);
  }
  return e ?? r;
}
//@ chunk-g3xfp0ds.js:2798-2815 placement
/**
 * ESC[23m
 */
var ANSI_ITALIC_OFF = "\x1B[23m";
//@ chunk-g3xfp0ds.js:2815-2939 placement
/**
 * 终端把斜体显示为反显时，去掉样式中的斜体。
 */
function dropItalicIfStandout(r) {
  for (let e of r)
    if (e.endCode === ANSI_ITALIC_OFF)
      return terminalDetector.rendersItalicAsStandout() ? r.filter((n) => n.endCode !== ANSI_ITALIC_OFF) : r;
  return r;
}
//@ chunk-g3xfp0ds.js:2939-2968 placement
var _ = [0, 95, 135, 175, 215, 255];
//@ chunk-g3xfp0ds.js:2968-3306 placement
/**
 * 把 RGB 颜色转换为 256 色索引。
 */
function rgbToAnsi256(r, e, n) {
  let o = (d) => (d < 48 ? 0 : d < 115 ? 1 : d < 155 ? 2 : d < 195 ? 3 : d < 235 ? 4 : 5);
  let g = o(r);
  let t = o(e);
  let s = o(n);
  let b = 16 + 36 * g + 6 * t + s;
  let rounded = Math.round((r + e + n) / 3);
  if (rounded < 5) return 16;
  if (rounded > 244 && g === t && t === s) return b;
  let max = Math.max(0, Math.min(23, Math.round((rounded - 8) / 10)));
  let N = 232 + max;
  let m = 8 + max * 10;
  let O = _[g];
  let T = _[t];
  let R = _[s];
  let A = (r - O) ** 2 + (e - T) ** 2 + (n - R) ** 2;
  return (r - m) ** 2 + (e - m) ** 2 + (n - m) ** 2 < A ? N : b;
}
export {
  terminalDetector,
  isDefaultFgColor,
  dropItalicIfStandout,
  downgradeTrueColorCodes,
  ANSI_COLOR_NAME_SET,
};
