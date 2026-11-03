/**
 * ink/terminalProbe.ts
 *
 * 2.1.316 新增：启动时探测终端能力（扩展键、kitty 键盘、XTVERSION、OSC 回复、tmux）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (13)
 * attribution: placement 13
 */
import { j, qt } from "../../vendor/react/cjs/react.production.js";
import { env } from "../utils/env.js";
import { gk, p$s, keys } from "./terminalCapabilities.js";
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
import { HX, supportsItermImages, supportsKittyGraphics, DECSTBM_ENABLED } from "./terminal.js";
import { DEC } from "./termio/dec.js";

//@ chunk-bzr73sfg.js:229377-229381 placement
j();
//@ chunk-bzr73sfg.js:229381-229398 placement
var InputNowContext = qt(null);
//@ chunk-bzr73sfg.js:229398-229412 placement
var noopCursorDeclaration = () => {};
/**
 * Ctrl+Z 挂起是否可用：后台会话（CLAUDE_CODE_SESSION_KIND=bg）不挂起。
 */
//@ chunk-bzr73sfg.js:229412-229482 placement
function isSuspendAllowed() {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return !1;
  return !0;
}
//@ chunk-bzr73sfg.js:229482-229510 placement
function settleCapabilitiesDeadline(capabilities) {
  capabilities.deadline();
}
//@ chunk-bzr73sfg.js:229510-229537 placement
function noopRetainFinePointer() {
  return () => {};
}
/**
 * 记下终端单元格像素尺寸（来自 CSI 16t/6t 应答），供像素鼠标与图片定位使用。
 */
//@ chunk-bzr73sfg.js:229537-229625 placement
function recordCellPixels(size) {
  if (size.width > 0 && size.height > 0) gk().cellPixels = { width: size.width, height: size.height };
}
//@ chunk-bzr73sfg.js:229625-229712 placement
function describeCellPixels() {
  let cellPixels = gk().cellPixels;
  return cellPixels ? `${cellPixels.width}x${cellPixels.height}px` : "size unknown";
}
/**
 * 重新查询单元格像素尺寸（终端重新获得焦点后，字体/缩放可能变了）。
 */
//@ chunk-bzr73sfg.js:229712-229832 placement
async function reprobeCellSize(querier) {
  let [u] = await Promise.all([querier.send(cellSizeQuery()), querier.flush()]);
  if (u) (recordCellPixels(u), logForDebugging(`Cell size asked again: ${describeCellPixels()}`));
}
//@ chunk-bzr73sfg.js:229832-229893 placement
function armCapabilitiesDeadline(capabilities, ms) {
  let f = setTimeout(settleCapabilitiesDeadline, ms, capabilities);
  return (f.unref(), f);
}
//@ chunk-bzr73sfg.js:229893-229912 placement
var CAPABILITY_PROBE_TIMEOUT_MS = 2000,
  OWED_REPLY_HOLD_MS = 250;
/**
 * 原始模式关闭后为等待终端未回的查询应答而暂留的原始模式，到时（250ms）释放。
 */
//@ chunk-bzr73sfg.js:229912-230055 placement
function releaseOwedReplyHold(app, stdin) {
  if (app.owedReplyHold === void 0) return;
  if ((clearTimeout(app.owedReplyHold), (app.owedReplyHold = void 0), app.rawModeEnabledCount === 0))
    setRawModeSafe(stdin, !1);
}
/**
 * 启动时探测终端能力（扩展键、kitty 键盘、XTVERSION、OSC 回复、tmux）。
 */
//@ chunk-bzr73sfg.js:230055-233477 placement
async function probeTerminalCapabilities(querier, capabilities, timeoutMs = CAPABILITY_PROBE_TIMEOUT_MS) {
  let m = armCapabilitiesDeadline(capabilities, timeoutMs),
    tmuxFactsPromise = env.TMUX
      ? queryTmuxPaneInfo().then((ee) => ({ facts: ee, at: performance.now() }))
      : Promise.resolve(void 0),
    askKeys =
      capabilities.get("extendedKeys").state === "pending" ||
      capabilities.get("kittyKeyboard").state === "pending",
    askProgramStatus = capabilities.get("programStatus").state === "pending",
    canAskXtversion = !HX(),
    [xtversion_2, kittyFlags, programStatusReply, firstFlushed] = await Promise.all([
      canAskXtversion ? querier.send(xtversion()) : Promise.resolve(void 0),
      askKeys ? querier.send(kittyKeyboard()) : Promise.resolve(void 0),
      askProgramStatus
        ? querier.send(programStatusQuery()).then((ee) => {
            if (ee) capabilities.answer("programStatus", !0, "probe: OSC 7501 reply");
            return ee;
          })
        : Promise.resolve(void 0),
      querier.flush(),
    ]);
  if ((clearTimeout(m), xtversion_2)) {
    let ee = xtversion_2.name;
    if (env.TMUX && ee.startsWith("tmux ")) {
      let ae = (await tmuxFactsPromise)?.facts?.termtype;
      if (ae) ee = ae;
    }
    if ((p$s(ee), logForDebugging(`XTVERSION: terminal identified as "${ee}"`), !env.TMUX))
      capabilities.answer("itermImages", supportsItermImages(ee), `probe: XTVERSION ${ee}`);
  } else
    logForDebugging(
      canAskXtversion
        ? "XTVERSION: no reply (terminal ignored query)"
        : "XTVERSION: not asked (VTE before 0.53 would show the query as text)",
    );
  let U = kittyFlags
      ? `CSI ? u flags=${kittyFlags.flags}`
      : askKeys
        ? "no reply to CSI ? u"
        : "CSI ? u not asked",
    L = kittyFlags !== void 0 && capabilities.answer("extendedKeys", !0, `probe: ${U}`);
  if (askKeys && (kittyFlags !== void 0 || firstFlushed))
    capabilities.answer("kittyKeyboard", kittyFlags !== void 0, `probe: ${U}`);
  if (askProgramStatus && programStatusReply === void 0 && firstFlushed)
    capabilities.answer("programStatus", !1, "probe: no reply to OSC 7501 ; ?");
  let skipDecrqm = !xtversion_2 || env.TERM_PROGRAM === "Apple_Terminal",
    askGraphics = !skipDecrqm && !env.TMUX && capabilities.get("kittyGraphics").state === "pending",
    askMousePixels = !skipDecrqm && capabilities.get("mousePixels").state === "pending",
    X = armCapabilitiesDeadline(capabilities, timeoutMs),
    [syncReply, da1Reply, cellSizeReply, pixelsReply, secondFlushed] = await Promise.all([
      skipDecrqm ? Promise.resolve(void 0) : querier.send(decrqm(DEC.SYNCHRONIZED_UPDATE)),
      askGraphics ? querier.send(kittyGraphicsQuery()) : Promise.resolve(void 0),
      askMousePixels ? querier.send(cellSizeQuery()) : Promise.resolve(void 0),
      askMousePixels ? querier.send(decrqm(DEC.MOUSE_SGR_PIXELS)) : Promise.resolve(void 0),
      skipDecrqm ? Promise.resolve(!1) : querier.flush(),
    ]);
  if (syncReply)
    capabilities.answer(
      "synchronizedOutput",
      syncReply.status === 1 || syncReply.status === 2 || syncReply.status === 3,
      `probe: DECRPM 2026 status=${syncReply.status}`,
    );
  if (askGraphics && secondFlushed) {
    let ee = gk().xtversionName ?? env.terminal;
    capabilities.answer(
      "kittyGraphics",
      da1Reply !== void 0 && supportsKittyGraphics(ee),
      da1Reply === void 0
        ? "probe: no reply to the graphics query"
        : `probe: graphics reply ${da1Reply.message}, terminal ${ee}`,
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
    let ee = { versionName: xtversion_2?.name, hasPane: Boolean(env.TMUX_PANE) },
      ne = xtversion_2?.name.startsWith("tmux ") === !0 ? await tmuxFactsPromise : void 0,
      de = ne?.facts,
      se = gk(),
      tmuxPane = se.tmuxPane;
    ((se.tmuxPane =
      de === void 0 || !ee.hasPane
        ? tmuxPane
        : { ...de.pane, passthrough: tmuxPane?.passthrough ?? de.pane.passthrough }),
      (se.tmuxPaneAnsweredAt = de !== void 0 && ee.hasPane ? ne?.at : void 0));
    let ue = probeTmuxPassthrough(de, ee);
    (capabilities.answer("kittyGraphics", ue.kittyGraphics.value, `probe: ${ue.kittyGraphics.source}`),
      capabilities.answer("itermImages", ue.itermImages.value, `probe: ${ue.itermImages.source}`),
      logForDebugging(
        de === void 0 || !ee.hasPane
          ? `tmux images: kitty no, iTerm2 no (${ue.itermImages.source})`
          : `tmux images: passthrough ${de.pane.passthrough}, focus events ${de.pane.hasFocusEvents ? "on" : "off"}, kitty ${ue.kittyGraphics.value ? "yes" : "no"}, iTerm2 ${ue.itermImages.value ? "yes" : "no"}, pane's top-left at row ${de.pane.top}, column ${de.pane.left} (from 0)`,
      ));
  }
  (clearTimeout(X),
    capabilities.deadline(),
    logForDebugging(
      "Terminal capabilities: " +
        keys
          .map((ee) => {
            let ae = capabilities.get(ee),
              ne = ae.state === "settled" ? ae.value : ae.likely;
            return `${ee}=${ne ? "yes" : "no"} (${ae.source})`;
          })
          .join("; ") +
        (L ? "" : `; terminal said: ${U}`) +
        (syncReply
          ? ""
          : skipDecrqm
            ? `; DECRQM 2026 not asked (${xtversion_2 ? "Apple_Terminal" : canAskXtversion ? "no XTVERSION reply" : "XTVERSION not asked"})`
            : "; no reply to DECRQM 2026"),
    ),
    logForDebugging(
      `DECSTBM: ${DECSTBM_ENABLED ? "enabled" : "gated"} (TMUX=${env.TMUX ? "set" : "unset"} ZELLIJ=${process.env.ZELLIJ != null ? "set" : "unset"} TERM_PROGRAM=${env.TERM_PROGRAM ?? "unset"} TERM=${env.TERM ?? "unset"})`,
    ));
}

export {
  isSuspendAllowed,
  noopRetainFinePointer,
  noopCursorDeclaration,
  InputNowContext,
  reprobeCellSize,
  probeTerminalCapabilities,
  releaseOwedReplyHold,
  OWED_REPLY_HOLD_MS,
};
