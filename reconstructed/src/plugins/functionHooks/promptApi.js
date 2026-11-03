/**
 * plugins/functionHooks/promptApi.ts
 *
 * 2.1.316 新增：插件 prompt 相关接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { requireLoadedPluginArgs } from "./apiDispatch.js";
import { warnOversizedPluginText } from "./dispatch/valueSizing.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "./hookApiSurface.js";
import { iv } from "./uiHooks.js";
import { lentModulesByChain } from "./hooksWorkerClient.js";
import { cEe } from "./dispatch/streamChain.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { hK } from "./sites/siteRules.js";
import { G3 } from "./surfaceBinding.js";
import { logForDebugging } from "../../utils/debug.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";

/**
 * $.audio.play 表项：以插件根目录与存储 id 交给播放预算器播放。
 */
//@ chunk-e6aww6q8.js:3716716-3716888 placement
var AUDIO_PLAY_API = (e) => ({
  run: async (n, r) => {
    let { pluginRoot: pluginRoot, pluginStorageId: pluginStorageId } = requireLoadedPluginArgs(
      e,
      r,
      "audio.play",
    );
    return e.budgets.plays.play(
      { ...n, root: pluginRoot, pluginStorageId: pluginStorageId },
      r.plugin,
      r.signal,
    );
  },
});
/**
 * 为 prompt.fill/submit 等生成表项：校验 {text} 并告警超长文本，run 时带上 mode、decorations、cursor 与插件来源。
 */
//@ chunk-e6aww6q8.js:3716888-3717391 placement
var createPromptTextApi = (e, n, r) => ({
  check: (s, h) => {
    let y = s?.text;
    if (!(s !== void 0 && typeof y === "string")) return "takes { text } (a string)";
    let w = n(s);
    if (w === void 0) warnOversizedPluginText(h.plugin, e, y.length);
    return w;
  },
  run: (s, h) => {
    let y = "mode" in s && isPromptSectionMode(s.mode),
      S = "decorations" in s && s.decorations !== void 0,
      w = "cursor" in s && s.cursor !== void 0;
    return r(
      {
        text: s.text,
        ...(y && { mode: s.mode }),
        ...(S && { decorations: s.decorations }),
        ...(w && { cursor: s.cursor }),
        origin: { kind: "plugin", name: h.plugin },
        hookOrigin: h.origin,
        ...(h.signal !== void 0 && { signal: h.signal }),
      },
      h,
    );
  },
});
//@ chunk-e6aww6q8.js:3717391-3717478 placement
function tFr(e) {
  return e === void 0 || isPromptSectionMode(e)
    ? void 0
    : `takes { mode } of ${PROMPT_SECTION_MODES.join(", ")}`;
}
//@ chunk-e6aww6q8.js:3717478-3717600 placement
var dispatchFactsOf = (e) => ({
  cwd: e.cwd,
  turnHeld: e.turnHeld,
  rootEvent: iv(e.rootEvent) ? void 0 : e.rootEvent,
  isDispatching: e.isDispatching,
});
/**
 * 构造插件间接口调用的"幕后"信息：调用者链、借用帧（有效期上限）、分发事实与评判上下文。
 */
//@ chunk-e6aww6q8.js:3717600-3717961 placement
function interfaceCallBehind(e) {
  let { environmentId: environmentId } = e,
    r = environmentId === void 0,
    now = Date.now(),
    h = lentModulesByChain().get(e.origin);
  return {
    caller: e.plugin,
    callers: r ? [] : [...(e.callers ?? []), environmentId],
    lent: e.origin.map((y, S) => ({
      frame: y,
      until: Math.min(h?.[S]?.until ?? Number.POSITIVE_INFINITY, now + cEe),
      alike: h?.[S]?.alike,
    })),
    facts: dispatchFactsOf(e),
    ...(e.judging !== void 0 && { judging: e.judging }),
    ...(e.signal !== void 0 && { signal: e.signal }),
  };
}
//@ chunk-e6aww6q8.js:3991212-3991254 placement
var freeze_19 = Object.freeze({ text: "", cursor: 0 });
/**
 * 规整输入框内容为 {text, cursor}，不合法时为空。
 */
//@ chunk-e6aww6q8.js:3991254-3991356 placement
function normalizePromptBox(e) {
  return isPlainObject_4(e) && typeof e.text === "string" && hK(e.cursor)
    ? { text: e.text, cursor: e.cursor }
    : freeze_19;
}
/**
 * $.prompt.read 核心：读取当前绑定输入框的 {text, cursor}，没有输入框时返回空。
 */
//@ chunk-e6aww6q8.js:3991356-3991505 placement
async function readPromptBox(e) {
  let n = G3();
  if (n === void 0 && e !== void 0)
    logForDebugging(`$.prompt.read (${e}): no prompt box bound; the empty box`);
  return (await n?.read()) ?? freeze_19;
}
//@ chunk-e6aww6q8.js:3991505-3991568 placement
var A0n = { "prompt.submit": !1, "command.run": !1, "agent.spawn": !0 };
//@ chunk-e6aww6q8.js:3991568-3991603 placement
var Aj = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:3991603-3991639 placement
function gMe(e) {
  Aj.get()?.delete(e);
}
//@ chunk-e6aww6q8.js:3991682-3991751 placement
var x0n = () => ({ "prompt.submit": [], "command.run": [], "agent.spawn": [] });
/**
 * 记录插件在 session.start 中的一次加载（参数与展示信息）；与上次相同返回 true，否则重置该插件的调用记录。
 */
//@ chunk-e6aww6q8.js:3991751-3991970 placement
function recordSessionStartLoad({ name: e, args: args, shown: shown, environmentId: environmentId }) {
  let h = Aj.get() ?? new Map();
  Aj.set(h);
  let y = { args: args, shown: shown },
    S = isDeepStrictEqual_12(h.get(e)?.load, y);
  if (!S) h.set(e, { load: y, calls: x0n(), copies: new Set() });
  return (h.get(e)?.copies.add(environmentId), S);
}
/**
 * 判断调用结果是否因中止而结束（拒绝或出错）。
 */
//@ chunk-e6aww6q8.js:3991970-3992071 placement
function isAbortedCallResult(e, n) {
  return (
    e.endsWith?.aborted === !0 && (!isPlainDataObject(n) || Object.hasOwn(n, "deny") || n.isError === !0)
  );
}
//@ chunk-e6aww6q8.js:3992071-3992146 placement
function hat(e, n, r) {
  e.calls = { ...e.calls, [n]: e.calls[n].filter((s) => s !== r) };
}
//@ chunk-e6aww6q8.js:3992146-3992217 placement
var P0n = (e, n, r) => ({ args: n, result: r, starts: new Set([e]), isRepeated: !1 });

export {
  recordSessionStartLoad,
  gMe,
  Aj,
  P0n,
  A0n,
  isAbortedCallResult,
  hat,
  readPromptBox,
  normalizePromptBox,
  freeze_19,
  AUDIO_PLAY_API,
  interfaceCallBehind,
  createPromptTextApi,
  tFr,
};
