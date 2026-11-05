/**
 * ink/terminalProbe.ts
 *
 * 2.1.316 新增：启动时探测终端能力（扩展键、kitty 键盘、XTVERSION、OSC 回复、tmux）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (15)
 * attribution: placement 13, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, createContext } from "../../vendor/react/cjs/react.production.js";
import { env } from "../utils/env.js";
import { getTerminalProbeState, setXtversionName, keys } from "./terminalCapabilities.js";
import {
  cellSizeQuery,
  xtversion,
  kittyKeyboard,
  programStatusQuery,
  decrqm,
  kittyGraphicsQuery,
} from "./terminal-querier.js";
import { logForDebugging } from "../utils/debug.js";
import { setRawModeSafe } from "./setRawModeSafe.js";
import { queryTmuxPaneInfo, probeTmuxPassthrough } from "./terminalImages.js";
import {
  hasUnknownSequencePrintingBug,
  supportsItermImages,
  supportsKittyGraphics,
  DECSTBM_ENABLED,
} from "./terminal.js";
import { DEC } from "./termio/dec.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:228972-228976 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:228972", () => {
  init_react_production();
});
//@ chunk-2avr6cej.js:228976-228993 layout
var terminalProbeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:228976", () => {
  terminalProbeContext = createContext(null);
});
//@ chunk-2avr6cej.js:228993-228997 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:228993", () => {
  init_react_production();
});
//@ chunk-2avr6cej.js:228997-229014 placement
var InputNowContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:228997", () => {
  InputNowContext = createContext(null);
});
//@ chunk-2avr6cej.js:229014-229028 placement
var noopCursorDeclaration = () => {};
//@ chunk-2avr6cej.js:229028-229098 placement
/**
 * Ctrl+Z 挂起是否可用：后台会话（CLAUDE_CODE_SESSION_KIND=bg）不挂起。
 */
function isSuspendAllowed() {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return false;
  return true;
}
//@ chunk-2avr6cej.js:229098-229126 placement
function settleCapabilitiesDeadline(capabilities) {
  capabilities.deadline();
}
//@ chunk-2avr6cej.js:229126-229153 placement
function noopRetainFinePointer() {
  return () => {};
}
//@ chunk-2avr6cej.js:229153-229241 placement
/**
 * 记下终端单元格像素尺寸（来自 CSI 16t/6t 应答），供像素鼠标与图片定位使用。
 */
function recordCellPixels(size) {
  if (size.width > 0 && size.height > 0)
    getTerminalProbeState().cellPixels = {
      width: size.width,
      height: size.height,
    };
}
//@ chunk-2avr6cej.js:229241-229328 placement
function describeCellPixels() {
  let cellPixels = getTerminalProbeState().cellPixels;
  return cellPixels ? `${cellPixels.width}x${cellPixels.height}px` : "size unknown";
}
//@ chunk-2avr6cej.js:229328-229448 placement
/**
 * 重新查询单元格像素尺寸（终端重新获得焦点后，字体/缩放可能变了）。
 */
async function reprobeCellSize(querier) {
  let [cellPixels] = await Promise.all([querier.send(cellSizeQuery()), querier.flush()]);
  if (cellPixels) {
    recordCellPixels(cellPixels);
    logForDebugging(`Cell size asked again: ${describeCellPixels()}`);
  }
}
//@ chunk-2avr6cej.js:229448-229509 placement
function armCapabilitiesDeadline(capabilities, ms) {
  let timer = setTimeout(settleCapabilitiesDeadline, ms, capabilities);
  timer.unref();
  return timer;
}
//@ chunk-2avr6cej.js:229509-229528 placement
var CAPABILITY_PROBE_TIMEOUT_MS = 2000;
var OWED_REPLY_HOLD_MS = 250;
//@ chunk-2avr6cej.js:229528-229671 placement
/**
 * 原始模式关闭后为等待终端未回的查询应答而暂留的原始模式，到时（250ms）释放。
 */
function releaseOwedReplyHold(app, stdin) {
  if (app.owedReplyHold === undefined) return;
  clearTimeout(app.owedReplyHold);
  app.owedReplyHold = undefined;
  if (app.rawModeEnabledCount === 0) setRawModeSafe(stdin, false);
}
//@ chunk-2avr6cej.js:229671-233093 placement
/**
 * 启动时探测终端能力（扩展键、kitty 键盘、XTVERSION、OSC 回复、tmux）。
 */
async function probeTerminalCapabilities(querier, capabilities, timeoutMs = CAPABILITY_PROBE_TIMEOUT_MS) {
  let cancelDeadline = armCapabilitiesDeadline(capabilities, timeoutMs);
  let tmuxFactsPromise = env.TMUX
    ? queryTmuxPaneInfo().then((facts) => ({
        facts,
        at: performance.now(),
      }))
    : Promise.resolve(undefined);
  let askKeys =
    capabilities.get("extendedKeys").state === "pending" ||
    capabilities.get("kittyKeyboard").state === "pending";
  let askProgramStatus = capabilities.get("programStatus").state === "pending";
  let canAskXtversion = !hasUnknownSequencePrintingBug();
  let [xtversion_2, kittyFlags, programStatusReply, firstFlushed] = await Promise.all([
    canAskXtversion ? querier.send(xtversion()) : Promise.resolve(undefined),
    askKeys ? querier.send(kittyKeyboard()) : Promise.resolve(undefined),
    askProgramStatus
      ? querier.send(programStatusQuery()).then((programStatusReply) => {
          if (programStatusReply) capabilities.answer("programStatus", true, "probe: OSC 7501 reply");
          return programStatusReply;
        })
      : Promise.resolve(undefined),
    querier.flush(),
  ]);
  clearTimeout(cancelDeadline);
  if (xtversion_2) {
    let terminalName = xtversion_2.name;
    if (env.TMUX && terminalName.startsWith("tmux ")) {
      let termtype = (await tmuxFactsPromise)?.facts?.termtype;
      if (termtype) terminalName = termtype;
    }
    setXtversionName(terminalName);
    logForDebugging(`XTVERSION: terminal identified as "${terminalName}"`);
    if (!env.TMUX)
      capabilities.answer(
        "itermImages",
        supportsItermImages(terminalName),
        `probe: XTVERSION ${terminalName}`,
      );
  } else
    logForDebugging(
      canAskXtversion
        ? "XTVERSION: no reply (terminal ignored query)"
        : "XTVERSION: not asked (VTE before 0.53 would show the query as text)",
    );
  let kittyStatus = kittyFlags
    ? `CSI ? u flags=${kittyFlags.flags}`
    : askKeys
      ? "no reply to CSI ? u"
      : "CSI ? u not asked";
  let keysAnswered =
    kittyFlags !== undefined && capabilities.answer("extendedKeys", true, `probe: ${kittyStatus}`);
  if (askKeys && (kittyFlags !== undefined || firstFlushed))
    capabilities.answer("kittyKeyboard", kittyFlags !== undefined, `probe: ${kittyStatus}`);
  if (askProgramStatus && programStatusReply === undefined && firstFlushed)
    capabilities.answer("programStatus", false, "probe: no reply to OSC 7501 ; ?");
  let skipDecrqm = !xtversion_2 || env.TERM_PROGRAM === "Apple_Terminal";
  let askGraphics = !skipDecrqm && !env.TMUX && capabilities.get("kittyGraphics").state === "pending";
  let askMousePixels = !skipDecrqm && capabilities.get("mousePixels").state === "pending";
  let cancelDeadline_2 = armCapabilitiesDeadline(capabilities, timeoutMs);
  let [syncReply, da1Reply, cellSizeReply, pixelsReply, secondFlushed] = await Promise.all([
    skipDecrqm ? Promise.resolve(undefined) : querier.send(decrqm(DEC.SYNCHRONIZED_UPDATE)),
    askGraphics ? querier.send(kittyGraphicsQuery()) : Promise.resolve(undefined),
    askMousePixels ? querier.send(cellSizeQuery()) : Promise.resolve(undefined),
    askMousePixels ? querier.send(decrqm(DEC.MOUSE_SGR_PIXELS)) : Promise.resolve(undefined),
    skipDecrqm ? Promise.resolve(false) : querier.flush(),
  ]);
  if (syncReply)
    capabilities.answer(
      "synchronizedOutput",
      syncReply.status === 1 || syncReply.status === 2 || syncReply.status === 3,
      `probe: DECRPM 2026 status=${syncReply.status}`,
    );
  if (askGraphics && secondFlushed) {
    let terminal = getTerminalProbeState().xtversionName ?? env.terminal;
    capabilities.answer(
      "kittyGraphics",
      da1Reply !== undefined && supportsKittyGraphics(terminal),
      da1Reply === undefined
        ? "probe: no reply to the graphics query"
        : `probe: graphics reply ${da1Reply.message}, terminal ${terminal}`,
    );
  }
  if (cellSizeReply) recordCellPixels(cellSizeReply);
  if (pixelsReply)
    capabilities.answer(
      "mousePixels",
      pixelsReply.status === 1 || pixelsReply.status === 2 || pixelsReply.status === 3,
      `probe: DECRPM 1016 status=${pixelsReply.status}, cell ${describeCellPixels()}`,
    );
  if (env.TMUX) {
    let tmuxQuery = {
      versionName: xtversion_2?.name,
      hasPane: Boolean(env.TMUX_PANE),
    };
    let tmuxPaneResult = xtversion_2?.name.startsWith("tmux ") === true ? await tmuxFactsPromise : undefined;
    let facts = tmuxPaneResult?.facts;
    let terminalProbeState = getTerminalProbeState();
    let tmuxPane = terminalProbeState.tmuxPane;
    terminalProbeState.tmuxPane =
      facts === undefined || !tmuxQuery.hasPane
        ? tmuxPane
        : {
            ...facts.pane,
            passthrough: tmuxPane?.passthrough ?? facts.pane.passthrough,
          };
    terminalProbeState.tmuxPaneAnsweredAt =
      facts !== undefined && tmuxQuery.hasPane ? tmuxPaneResult?.at : undefined;
    let passthroughProbe = probeTmuxPassthrough(facts, tmuxQuery);
    capabilities.answer(
      "kittyGraphics",
      passthroughProbe.kittyGraphics.value,
      `probe: ${passthroughProbe.kittyGraphics.source}`,
    );
    capabilities.answer(
      "itermImages",
      passthroughProbe.itermImages.value,
      `probe: ${passthroughProbe.itermImages.source}`,
    );
    logForDebugging(
      facts === undefined || !tmuxQuery.hasPane
        ? `tmux images: kitty no, iTerm2 no (${passthroughProbe.itermImages.source})`
        : `tmux images: passthrough ${facts.pane.passthrough}, focus events ${facts.pane.hasFocusEvents ? "on" : "off"}, kitty ${passthroughProbe.kittyGraphics.value ? "yes" : "no"}, iTerm2 ${passthroughProbe.itermImages.value ? "yes" : "no"}, pane's top-left at row ${facts.pane.top}, column ${facts.pane.left} (from 0)`,
    );
  }
  clearTimeout(cancelDeadline_2);
  capabilities.deadline();
  logForDebugging(
    "Terminal capabilities: " +
      keys
        .map((capability) => {
          let reading = capabilities.get(capability);
          let value = reading.state === "settled" ? reading.value : reading.likely;
          return `${capability}=${value ? "yes" : "no"} (${reading.source})`;
        })
        .join("; ") +
      (keysAnswered ? "" : `; terminal said: ${kittyStatus}`) +
      (syncReply
        ? ""
        : skipDecrqm
          ? `; DECRQM 2026 not asked (${xtversion_2 ? "Apple_Terminal" : canAskXtversion ? "no XTVERSION reply" : "XTVERSION not asked"})`
          : "; no reply to DECRQM 2026"),
  );
  logForDebugging(
    `DECSTBM: ${DECSTBM_ENABLED ? "enabled" : "gated"} (TMUX=${env.TMUX ? "set" : "unset"} ZELLIJ=${process.env.ZELLIJ != null ? "set" : "unset"} TERM_PROGRAM=${env.TERM_PROGRAM ?? "unset"} TERM=${env.TERM ?? "unset"})`,
  );
}
export {
  noopRetainFinePointer,
  noopCursorDeclaration,
  InputNowContext,
  terminalProbeContext,
  reprobeCellSize,
  probeTerminalCapabilities,
  releaseOwedReplyHold,
  OWED_REPLY_HOLD_MS,
  isSuspendAllowed,
};
