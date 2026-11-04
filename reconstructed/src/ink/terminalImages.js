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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m4dvt8pp.js:7632-7646 placement
/**
 * tmux 查询输出的读取上限（16 KiB）。
 */
var MAX_SEGMENT_CELLS = 16384;
//@ chunk-m4dvt8pp.js:7646-7945 placement
function assertCellSegmenter(substitute, screen) {
  if (typeof Bun === "undefined" || typeof Bun.ant?.CellSegmenter !== "function")
    throw Error(
      "This runtime has no Bun.ant.CellSegmenter. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json.",
    );
  return new Bun.ant.CellSegmenter({
    ambiguousIsNarrow: true,
    substitute,
    screen,
  });
}
//@ chunk-m4dvt8pp.js:7945-9794 placement
/**
 * tmux 内显示图像的失败说明组：tmux 版本/allow-passthrough/focus-events 未开、外层终端不支持图像、无法探知外层终端、查询无应答、TMUX_PANE 缺失等，每种情况一段可直接展示给用户的提示。
 */
var TMUX_PASSTHROUGH_REQUIREMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TMUX_OLD_VERSION_HINT;
var TMUX_OUTER_TERMINAL_HINT;
var TMUX_UNKNOWN_OUTER_TERMINAL;
var TMUX_PASSTHROUGH_UNKNOWN;
var TMUX_VERSION_UNANSWERED;
var TMUX_PANE_UNSET;
var TMUX_NOT_A_PANE;
var joined;
deferInit("chunk-m4dvt8pp.js:7945", () => {
  TMUX_PASSTHROUGH_REQUIREMENT =
    "images inside tmux need tmux 3.3 or later with allow-passthrough and focus-events on: run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach tmux again, then restart Claude Code";
  TMUX_OLD_VERSION_HINT =
    "images inside tmux need tmux 3.3 or later, with kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later as the terminal outside it: update tmux, then end every tmux session so the new version runs (`tmux kill-server` ends them all, and Claude Code with them), start tmux again, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then start Claude Code";
  TMUX_OUTER_TERMINAL_HINT =
    "images inside tmux need kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later as the terminal outside tmux: attach tmux from one of those, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then restart Claude Code";
  TMUX_UNKNOWN_OUTER_TERMINAL =
    "tmux does not know which terminal is outside it, so Claude Code draws no images here: attach tmux from kitty 0.28 or later, Ghostty, or iTerm2 3.5 or later, run `tmux set -g allow-passthrough on` and `tmux set -g focus-events on`, detach and attach again, then restart Claude Code";
  TMUX_PASSTHROUGH_UNKNOWN =
    "tmux did not say whether it passes images through; restart Claude Code to ask again";
  TMUX_VERSION_UNANSWERED =
    "the terminal did not answer Claude Code's version query, so tmux was not asked whether it passes images through; restart Claude Code to ask again";
  TMUX_PANE_UNSET =
    "TMUX_PANE is not set (as in a tmux popup), so Claude Code cannot ask tmux about this pane; run Claude Code in a tmux pane to draw images";
  TMUX_NOT_A_PANE =
    "TMUX is set, but the terminal did not answer as tmux; if this is not a tmux pane, unset TMUX and restart Claude Code";
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
});
//@ chunk-m4dvt8pp.js:9794-9972 placement
/**
 * 用 tmux display-message 查询当前窗格信息（1 秒超时），成功时解析返回。
 */
async function queryTmuxPaneInfo() {
  let paneArgs = env.TMUX_PANE ? ["-t", env.TMUX_PANE] : [];
  let { stdout, code } = await execFileNoThrow("tmux", ["display-message", "-p", ...paneArgs, joined], {
    timeout: 1000,
    useCwd: false,
  });
  return code === 0 ? parseTmuxPaneInfo(stdout) : undefined;
}
//@ chunk-m4dvt8pp.js:9972-10416 placement
/**
 * 解析 tmux display-message 输出的 8 个制表符分隔字段（客户端终端名、版本、透传设置等），字段数或数字格式不对时返回 undefined。
 */
function parseTmuxPaneInfo(stdout) {
  let parts = stdout.replace(/\r?\n$/, "").split("\t");
  let [termtype, passthrough, focusEvents, top, left, syncMode, statusPosition] = parts;
  let isPlaced = parts[7];
  if (
    parts.length !== 8 ||
    termtype === undefined ||
    passthrough === undefined ||
    top === undefined ||
    left === undefined ||
    syncMode === undefined ||
    !/^\d+$/.test(top) ||
    !/^\d+$/.test(left)
  )
    return;
  let statusHeight = syncMode === "on" ? 1 : /^[2-5]$/.test(syncMode) ? Number(syncMode) : 0;
  let topOffset = statusPosition === "top" ? statusHeight : 0;
  return {
    termtype,
    pane: {
      passthrough: passthrough === "on" || passthrough === "1" ? "on" : passthrough === "all" ? "all" : "off",
      hasFocusEvents: focusEvents === "1",
      isPlaced: isPlaced !== "1",
      top: Number(top) + topOffset,
      left: Number(left),
    },
    hasPassthroughOption: passthrough !== "",
  };
}
//@ chunk-m4dvt8pp.js:10416-11434 placement
/**
 * 用 tmux display-message 查询外层终端、透传、焦点事件等。
 */
function probeTmuxPassthrough(facts, tmuxFacts) {
  let isTmux = tmuxFacts.versionName?.startsWith("tmux ") === true;
  let termtype = facts === undefined || facts.termtype === "" ? null : facts.termtype;
  let supportsKitty = supportsKittyGraphics(termtype);
  let supportsIterm = !supportsKitty && supportsItermImages(termtype);
  if (
    !isTmux ||
    !tmuxFacts.hasPane ||
    facts === undefined ||
    facts.pane.passthrough === "off" ||
    !facts.pane.hasFocusEvents
  ) {
    let refusal = {
      value: false,
      source:
        tmuxFacts.versionName === undefined
          ? TMUX_VERSION_UNANSWERED
          : !isTmux
            ? TMUX_NOT_A_PANE
            : !tmuxFacts.hasPane
              ? TMUX_PANE_UNSET
              : facts === undefined
                ? TMUX_PASSTHROUGH_UNKNOWN
                : !facts.hasPassthroughOption
                  ? TMUX_OLD_VERSION_HINT
                  : supportsKitty || supportsIterm
                    ? TMUX_PASSTHROUGH_REQUIREMENT
                    : termtype === null
                      ? TMUX_UNKNOWN_OUTER_TERMINAL
                      : `${TMUX_OUTER_TERMINAL_HINT}; tmux says it is ${termtype}`,
    };
    return {
      kittyGraphics: refusal,
      itermImages: refusal,
    };
  }
  let fact =
    termtype === null
      ? `tmux passthrough ${facts.pane.passthrough}, but tmux does not know which terminal is outside`
      : `tmux passthrough ${facts.pane.passthrough}, outer terminal ${termtype}`;
  let itermSupport = !supportsIterm
    ? undefined
    : facts.pane.passthrough === "all"
      ? "iTerm2 pictures need `tmux set -g allow-passthrough on`, not `all`; then restart Claude Code"
      : !facts.pane.isPlaced
        ? "the tmux window is bigger than this terminal, so Claude Code cannot tell where on screen to draw iTerm2 pictures; make the window fit, then restart Claude Code"
        : undefined;
  return {
    kittyGraphics: {
      value: supportsKitty,
      source: fact,
    },
    itermImages: {
      value: supportsIterm && itermSupport === undefined,
      source: itermSupport === undefined ? fact : `${fact}: ${itermSupport}`,
    },
  };
}
//@ chunk-m4dvt8pp.js:11434-11447 placement
/**
 * tmux 窗格繁询的冷却：最近一次询问在 1.5 秒内失败或无应答时，重绘路径不再重复执行 tmux display-message。
 */
var TMUX_PANE_ASK_GRACE_MS = 1500;
//@ chunk-m4dvt8pp.js:11447-11504 placement
/**
 * 判断 tmux 探测结果是否仍新鲜（未探测或超过 1.5 秒则过期）。
 */
function isFreshTmuxProbe(answeredAt, tmuxPaneAnsweredAt, now) {
  return (
    !answeredAt ||
    (tmuxPaneAnsweredAt !== undefined &&
      now >= tmuxPaneAnsweredAt &&
      now - tmuxPaneAnsweredAt <= TMUX_PANE_ASK_GRACE_MS)
  );
}
export {
  assertCellSegmenter,
  MAX_SEGMENT_CELLS,
  queryTmuxPaneInfo,
  probeTmuxPassthrough,
  TMUX_PANE_ASK_GRACE_MS,
  isFreshTmuxProbe,
  TMUX_PASSTHROUGH_REQUIREMENT,
  TMUX_OLD_VERSION_HINT,
  TMUX_OUTER_TERMINAL_HINT,
  TMUX_UNKNOWN_OUTER_TERMINAL,
  TMUX_PASSTHROUGH_UNKNOWN,
  TMUX_PANE_UNSET,
  TMUX_VERSION_UNANSWERED,
  TMUX_NOT_A_PANE,
};
