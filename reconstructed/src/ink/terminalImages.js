/**
 * ink/terminalImages.ts
 *
 * 2.1.316 新增：终端内联图像能力检测（tmux 透传、kitty/Ghostty/iTerm 版本）与 CellSegmenter 运行时检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m4dvt8pp.js (8)
 * attribution: placement 8
 */
import { env } from "../utils/env.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { supportsKittyGraphics, supportsItermImages } from "./terminal.js";

//@ chunk-m4dvt8pp.js:7632-7646 placement
var a2t = 16384;
//@ chunk-m4dvt8pp.js:7646-7945 placement
function assertCellSegmenter(e, t) {
  if (typeof Bun > "u" || typeof Bun.ant?.CellSegmenter !== "function")
    throw Error(
      "This runtime has no Bun.ant.CellSegmenter. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json.",
    );
  return new Bun.ant.CellSegmenter({ ambiguousIsNarrow: !0, substitute: e, screen: t });
}
/**
 * tmux 中显示图像的条件与不满足时的说明。
 */
//@ chunk-m4dvt8pp.js:7945-9794 placement
var TMUX_PASSTHROUGH_REQUIREMENT =
    "images inside tmux need tmux 3.3 or later with allow-passthrough and focus-events on: run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach tmux again, then restart Claude Code",
  H2o =
    "images inside tmux need tmux 3.3 or later, with kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later as the terminal outside it: update tmux, then end every tmux session so the new version runs (`tmux kill-server` ends them all, and Claude Code with them), start tmux again, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then start Claude Code",
  N2o =
    "images inside tmux need kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later as the terminal outside tmux: attach tmux from one of those, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then restart Claude Code",
  $2o =
    "tmux does not know which terminal is outside it, so Claude Code draws no images here: attach tmux from kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then restart Claude Code",
  F2o = "tmux did not say whether it passes images through; restart Claude Code to ask again",
  U2o =
    "the terminal did not answer Claude Code's version query, so tmux was not asked whether it passes images through; restart Claude Code to ask again",
  B2o =
    "TMUX_PANE is not set (as in a tmux popup), so Claude Code cannot ask tmux about this pane; run Claude Code in a tmux pane to draw images",
  j2o =
    "TMUX is set, but the terminal did not answer as tmux; if this is not a tmux pane, unset TMUX and restart Claude Code",
  joined = [
    "#{client_termtype}",
    "#{allow-passthrough}",
    "#{focus-events}",
    "#{pane_top}",
    "#{pane_left}",
    "#{status}",
    "#{status-position}",
    "#{window_bigger}",
  ].join("\t");
/**
 * 用 tmux display-message 查询当前窗格信息（1 秒超时），成功时解析返回。
 */
//@ chunk-m4dvt8pp.js:9794-9972 placement
async function queryTmuxPaneInfo() {
  let e = env.TMUX_PANE ? ["-t", env.TMUX_PANE] : [],
    { stdout: stdout, code: code } = await execFileNoThrow("tmux", ["display-message", "-p", ...e, joined], {
      timeout: 1000,
      useCwd: !1,
    });
  return code === 0 ? parseTmuxPaneInfo(stdout) : void 0;
}
/**
 * 解析 tmux display-message 输出的 8 个制表符分隔字段（客户端终端名、版本、透传设置等），字段数或数字格式不对时返回 undefined。
 */
//@ chunk-m4dvt8pp.js:9972-10416 placement
function parseTmuxPaneInfo(e) {
  let parts = e.replace(/\r?\n$/, "").split("\t"),
    [o, n, r, a, F, u, d] = parts,
    c = parts[7];
  if (
    parts.length !== 8 ||
    o === void 0 ||
    n === void 0 ||
    a === void 0 ||
    F === void 0 ||
    u === void 0 ||
    !/^\d+$/.test(a) ||
    !/^\d+$/.test(F)
  )
    return;
  let h = u === "on" ? 1 : /^[2-5]$/.test(u) ? Number(u) : 0,
    m = d === "top" ? h : 0;
  return {
    termtype: o,
    pane: {
      passthrough: n === "on" || n === "1" ? "on" : n === "all" ? "all" : "off",
      hasFocusEvents: r === "1",
      isPlaced: c !== "1",
      top: Number(a) + m,
      left: Number(F),
    },
    hasPassthroughOption: n !== "",
  };
}
/**
 * 用 tmux display-message 查询外层终端、透传、焦点事件等。
 */
//@ chunk-m4dvt8pp.js:10416-11434 placement
function probeTmuxPassthrough(e, t) {
  let o = t.versionName?.startsWith("tmux ") === !0,
    n = e === void 0 || e.termtype === "" ? null : e.termtype,
    r = supportsKittyGraphics(n),
    a = !r && supportsItermImages(n);
  if (!o || !t.hasPane || e === void 0 || e.pane.passthrough === "off" || !e.pane.hasFocusEvents) {
    let c = {
      value: !1,
      source:
        t.versionName === void 0
          ? U2o
          : !o
            ? j2o
            : !t.hasPane
              ? B2o
              : e === void 0
                ? F2o
                : !e.hasPassthroughOption
                  ? H2o
                  : r || a
                    ? TMUX_PASSTHROUGH_REQUIREMENT
                    : n === null
                      ? $2o
                      : `${N2o}; tmux says it is ${n}`,
    };
    return { kittyGraphics: c, itermImages: c };
  }
  let F =
      n === null
        ? `tmux passthrough ${e.pane.passthrough}, but tmux does not know which terminal is outside`
        : `tmux passthrough ${e.pane.passthrough}, outer terminal ${n}`,
    u = !a
      ? void 0
      : e.pane.passthrough === "all"
        ? "iTerm2 pictures need `tmux set -g allow-passthrough on`, not `all`; then restart Claude Code"
        : !e.pane.isPlaced
          ? "the tmux window is bigger than this terminal, so Claude Code cannot tell where on screen to draw iTerm2 pictures; make the window fit, then restart Claude Code"
          : void 0;
  return {
    kittyGraphics: { value: r, source: F },
    itermImages: { value: a && u === void 0, source: u === void 0 ? F : `${F}: ${u}` },
  };
}
//@ chunk-m4dvt8pp.js:11434-11447 placement
var G2o = 1500;
//@ chunk-m4dvt8pp.js:11447-11504 placement
function nQs(e, t, o) {
  return !e || (t !== void 0 && o >= t && o - t <= G2o);
}

export {
  assertCellSegmenter,
  a2t,
  queryTmuxPaneInfo,
  probeTmuxPassthrough,
  G2o,
  nQs,
  TMUX_PASSTHROUGH_REQUIREMENT,
  H2o,
  N2o,
  $2o,
  F2o,
  B2o,
  U2o,
  j2o,
};
