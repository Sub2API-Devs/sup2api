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

/**
 * 终端支持的标准 ANSI 颜色名表。
 */
//@ chunk-g3xfp0ds.js:387-611 placement
var ANSI_COLOR_NAMES = {
    black: !0,
    red: !0,
    green: !0,
    yellow: !0,
    blue: !0,
    magenta: !0,
    cyan: !0,
    white: !0,
    blackBright: !0,
    redBright: !0,
    greenBright: !0,
    yellowBright: !0,
    blueBright: !0,
    magentaBright: !0,
    cyanBright: !0,
    whiteBright: !0,
  },
  ANSI_COLOR_NAME_SET = new Set(Object.keys(ANSI_COLOR_NAMES));
//@ chunk-g3xfp0ds.js:611-641 placement
var k = csi(30, "m"),
  M = csi(37, "m");
//@ chunk-g3xfp0ds.js:641-677 placement
function mYr(r) {
  return r === M || r === k;
}
/**
 * 终端环境识别（JetBrains、Windows Terminal、VS Code、ghostty 等）。
 */
//@ chunk-g3xfp0ds.js:677-2321 placement
class TerminalDetector {
  proc;
  constructor(r = process) {
    this.proc = r;
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
      a(env.VTE_VERSION) &&
      (r === "vte-based" || r === "gnome-terminal") &&
      (env.TERM ?? "").trim().startsWith("xterm") &&
      !a(env.TMUX) &&
      !a(env.STY) &&
      env.ZELLIJ === void 0 &&
      !a(env.XTERM_VERSION) &&
      !a(env.ALACRITTY_WINDOW_ID) &&
      !a(env.ALACRITTY_LOG) &&
      !a(env.KITTY_WINDOW_ID) &&
      !a(env.WEZTERM_PANE) &&
      !a(env.INSIDE_EMACS) &&
      !a(env.VIM_TERMINAL) &&
      !a(env.NVIM)
    );
  }
  isMintty() {
    if (this.proc.env.TERM_PROGRAM === "mintty") return !0;
    if (this.proc.platform === "win32" && this.proc.env.MSYSTEM) return !0;
    return !1;
  }
  windowsConsoleSupportsVirtualTerminalSequences() {
    if (this.isMicrosoftWindowsTerminal()) return !0;
    if (
      this.proc.platform === "win32" &&
      this.proc.env.TERM_PROGRAM === "vscode" &&
      this.proc.env.TERM_PROGRAM_VERSION
    )
      return !0;
    if (this.isMintty()) return !0;
    return !1;
  }
  hasGeometricShapesInkBleedBug() {
    return this.isGhostty();
  }
  hasUnknownSequencePrintingBug(r) {
    return this.isVteBasedTerminal(r) && Number.parseInt(this.proc.env.VTE_VERSION ?? "", 10) < 5300;
  }
  hasOsc52ClipboardUtf8Bug() {
    if (this.proc.env.TERM_PROGRAM !== "vscode") return !1;
    let r = parseVersionNumber(this.proc.env.TERM_PROGRAM_VERSION);
    return r !== null && r >= 1123000 && r < 1125000;
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
function a(r) {
  return (r ?? "").trim() !== "";
}
/**
 * 终端识别单例。
 */
//@ chunk-g3xfp0ds.js:2483-2496 placement
var terminalDetector = new TerminalDetector();
//@ chunk-g3xfp0ds.js:2496-2541 placement
var y = /^\x1b\[([34]8);2;(\d+);(\d+);(\d+)m$/;
/**
 * 终端不支持真彩色时，把样式中的 24 位颜色代码降级为可用的颜色。
 */
//@ chunk-g3xfp0ds.js:2541-2798 placement
function downgradeTrueColorCodes(r) {
  if (sequential.level >= 3 || r.length === 0) return r;
  let e;
  for (let n = 0; n < r.length; n++) {
    let o = r[n],
      match = y.exec(o.code);
    if (match)
      ((e ??= r.slice(0, n)),
        e.push({
          type: "ansi",
          code: `\x1B[${match[1]};5;${rgbToAnsi256(+match[2], +match[3], +match[4])}m`,
          endCode: o.endCode,
        }));
    else if (e) e.push(o);
  }
  return e ?? r;
}
//@ chunk-g3xfp0ds.js:2798-2815 placement
var f = "\x1B[23m";
/**
 * 终端把斜体显示为反显时，去掉样式中的斜体。
 */
//@ chunk-g3xfp0ds.js:2815-2939 placement
function dropItalicIfStandout(r) {
  for (let e of r)
    if (e.endCode === f)
      return terminalDetector.rendersItalicAsStandout() ? r.filter((n) => n.endCode !== f) : r;
  return r;
}
//@ chunk-g3xfp0ds.js:2939-2968 placement
var _ = [0, 95, 135, 175, 215, 255];
/**
 * 把 RGB 颜色转换为 256 色索引。
 */
//@ chunk-g3xfp0ds.js:2968-3306 placement
function rgbToAnsi256(r, e, n) {
  let o = (d) => (d < 48 ? 0 : d < 115 ? 1 : d < 155 ? 2 : d < 195 ? 3 : d < 235 ? 4 : 5),
    g = o(r),
    t = o(e),
    s = o(n),
    b = 16 + 36 * g + 6 * t + s,
    rounded = Math.round((r + e + n) / 3);
  if (rounded < 5) return 16;
  if (rounded > 244 && g === t && t === s) return b;
  let max = Math.max(0, Math.min(23, Math.round((rounded - 8) / 10))),
    N = 232 + max,
    m = 8 + max * 10,
    O = _[g],
    T = _[t],
    R = _[s],
    A = (r - O) ** 2 + (e - T) ** 2 + (n - R) ** 2;
  return (r - m) ** 2 + (e - m) ** 2 + (n - m) ** 2 < A ? N : b;
}

export { terminalDetector, mYr, dropItalicIfStandout, downgradeTrueColorCodes, ANSI_COLOR_NAME_SET };
