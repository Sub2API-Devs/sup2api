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
import { isDeepStrictEqual } from "util";
import { requireLoadedPluginArgs } from "./apiDispatch.js";
import { warnOversizedPluginText } from "./dispatch/valueSizing.js";
import { isPromptSectionMode, PROMPT_SECTION_MODES } from "./hookApiSurface.js";
import { isPersonInputEvent } from "./uiHooks.js";
import { lentModulesByChain } from "./hooksWorkerClient.js";
import { DEFAULT_HOOK_TIMEOUT_MS } from "./dispatch/streamChain.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { isNonNegativeInt } from "./sites/siteRules.js";
import { surfaceComposer } from "./surfaceBinding.js";
import { logForDebugging } from "../../utils/debug.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-e6aww6q8.js:3716716-3716888 placement
/**
 * $.audio.play 表项：以插件根目录与存储 id 交给播放预算器播放。
 */
var AUDIO_PLAY_API = (e) => ({
  run: async (n, r) => {
    let { pluginRoot, pluginStorageId } = requireLoadedPluginArgs(e, r, "audio.play");
    return e.budgets.plays.play(
      {
        ...n,
        root: pluginRoot,
        pluginStorageId,
      },
      r.plugin,
      r.signal,
    );
  },
});
//@ chunk-e6aww6q8.js:3716888-3717391 placement
/**
 * 为 prompt.fill/submit 等生成表项：校验 {text} 并告警超长文本，run 时带上 mode、decorations、cursor 与插件来源。
 */
var createPromptTextApi = (e, n, promptSuggestOp) => ({
  check: (s, h) => {
    let text = s?.text;
    if (!(s !== undefined && typeof text === "string")) return "takes { text } (a string)";
    let w = n(s);
    if (w === undefined) warnOversizedPluginText(h.plugin, e, text.length);
    return w;
  },
  run: (s, h) => {
    let y = "mode" in s && isPromptSectionMode(s.mode);
    let S = "decorations" in s && s.decorations !== undefined;
    let w = "cursor" in s && s.cursor !== undefined;
    return promptSuggestOp(
      {
        text: s.text,
        ...(y && {
          mode: s.mode,
        }),
        ...(S && {
          decorations: s.decorations,
        }),
        ...(w && {
          cursor: s.cursor,
        }),
        origin: {
          kind: "plugin",
          name: h.plugin,
        },
        hookOrigin: h.origin,
        ...(h.signal !== undefined && {
          signal: h.signal,
        }),
      },
      h,
    );
  },
});
//@ chunk-e6aww6q8.js:3717391-3717478 placement
/**
 * 校验 prompt.section 参数
 */
function checkPromptSectionArgs(mode) {
  return mode === undefined || isPromptSectionMode(mode)
    ? undefined
    : `takes { mode } of ${PROMPT_SECTION_MODES.join(", ")}`;
}
//@ chunk-e6aww6q8.js:3717478-3717600 placement
var dispatchFactsOf = (e) => ({
  cwd: e.cwd,
  turnHeld: e.turnHeld,
  rootEvent: isPersonInputEvent(e.rootEvent) ? undefined : e.rootEvent,
  isDispatching: e.isDispatching,
});
//@ chunk-e6aww6q8.js:3717600-3717961 placement
/**
 * 构造插件间接口调用的"幕后"信息：调用者链、借用帧（有效期上限）、分发事实与评判上下文。
 */
function interfaceCallBehind(e) {
  let { environmentId } = e;
  let r = environmentId === undefined;
  let now = Date.now();
  let h = lentModulesByChain().get(e.origin);
  return {
    caller: e.plugin,
    callers: r ? [] : [...(e.callers ?? []), environmentId],
    lent: e.origin.map((frame, S) => ({
      frame,
      until: Math.min(h?.[S]?.until ?? Number.POSITIVE_INFINITY, now + DEFAULT_HOOK_TIMEOUT_MS),
      alike: h?.[S]?.alike,
    })),
    facts: dispatchFactsOf(e),
    ...(e.judging !== undefined && {
      judging: e.judging,
    }),
    ...(e.signal !== undefined && {
      signal: e.signal,
    }),
  };
}
//@ chunk-e6aww6q8.js:3991212-3991254 placement
var aEt = Object.freeze({
  text: "",
  cursor: 0,
});
//@ chunk-e6aww6q8.js:3991254-3991356 placement
/**
 * 规整输入框内容为 {text, cursor}，不合法时为空。
 */
function normalizePromptBox(e) {
  return isPlainObject_5(e) && typeof e.text === "string" && isNonNegativeInt(e.cursor)
    ? {
        text: e.text,
        cursor: e.cursor,
      }
    : aEt;
}
//@ chunk-e6aww6q8.js:3991356-3991505 placement
/**
 * $.prompt.read 核心：读取当前绑定输入框的 {text, cursor}，没有输入框时返回空。
 */
async function readPromptBox(plugin) {
  let n = surfaceComposer();
  if (n === undefined && plugin !== undefined)
    logForDebugging(`$.prompt.read (${plugin}): no prompt box bound; the empty box`);
  return (await n?.read()) ?? aEt;
}
//@ chunk-e6aww6q8.js:3991505-3991568 placement
/**
 * 各事件是否记录 session.start
 */
var RECORDS_SESSION_START = {
  "prompt.submit": false,
  "command.run": false,
  "agent.spawn": true,
};
//@ chunk-e6aww6q8.js:3991568-3991603 placement
/**
 * 会话开始调用记录槽
 */
var sessionStartCallsSlot = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:3991603-3991639 placement
/**
 * 忘掉某次调用
 */
function forgetSessionStartCall(e) {
  sessionStartCallsSlot.get()?.delete(e);
}
//@ chunk-e6aww6q8.js:3991682-3991751 placement
/**
 * 各事件空调用表
 */
var emptySessionCalls = () => ({
  "prompt.submit": [],
  "command.run": [],
  "agent.spawn": [],
});
//@ chunk-e6aww6q8.js:3991751-3991970 placement
/**
 * 记录插件在 session.start 中的一次加载（参数与展示信息）；与上次相同返回 true，否则重置该插件的调用记录。
 */
function recordSessionStartLoad({ name: e, args, shown, environmentId }) {
  let h = sessionStartCallsSlot.get() ?? new Map();
  sessionStartCallsSlot.set(h);
  let y = {
    args,
    shown,
  };
  let S = isDeepStrictEqual(h.get(e)?.load, y);
  if (!S)
    h.set(e, {
      load: y,
      calls: emptySessionCalls(),
      copies: new Set(),
    });
  h.get(e)?.copies.add(environmentId);
  return S;
}
//@ chunk-e6aww6q8.js:3991970-3992071 placement
/**
 * 判断调用结果是否因中止而结束（拒绝或出错）。
 */
function isAbortedCallResult(e, n) {
  return (
    e.endsWith?.aborted === true && (!isPlainDataObject(n) || Object.hasOwn(n, "deny") || n.isError === true)
  );
}
//@ chunk-e6aww6q8.js:3992071-3992146 placement
/**
 * 移除一次调用
 */
function removeCall(e, n, r) {
  e.calls = {
    ...e.calls,
    [n]: e.calls[n].filter((s) => s !== r),
  };
}
//@ chunk-e6aww6q8.js:3992146-3992217 placement
/**
 * 会话加载记录
 */
var sessionLoadRecord = (environmentId, args, result) => ({
  args,
  result,
  starts: new Set([environmentId]),
  isRepeated: false,
});
export {
  recordSessionStartLoad,
  forgetSessionStartCall,
  sessionStartCallsSlot,
  sessionLoadRecord,
  RECORDS_SESSION_START,
  isAbortedCallResult,
  removeCall,
  readPromptBox,
  normalizePromptBox,
  aEt,
  AUDIO_PLAY_API,
  interfaceCallBehind,
  createPromptTextApi,
  checkPromptSectionArgs,
};
