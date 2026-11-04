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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3716716-3716888 placement
/**
 * $.audio.play 表项：以插件根目录与存储 id 交给播放预算器播放。
 */
var AUDIO_PLAY_API = (apiEntry) => ({
  run: async (args, caller) => {
    let { pluginRoot, pluginStorageId } = requireLoadedPluginArgs(apiEntry, caller, "audio.play");
    return apiEntry.budgets.plays.play(
      {
        ...args,
        root: pluginRoot,
        pluginStorageId,
      },
      caller.plugin,
      caller.signal,
    );
  },
});
//@ chunk-e6aww6q8.js:3716888-3717391 placement
/**
 * 为 prompt.fill/submit 等生成表项：校验 {text} 并告警超长文本，run 时带上 mode、decorations、cursor 与插件来源。
 */
var createPromptTextApi = (apiName, checkSize, promptSuggestOp) => ({
  check: (args, caller) => {
    let text = args?.text;
    if (!(args !== undefined && typeof text === "string")) return "takes { text } (a string)";
    let sizeProblem = checkSize(args);
    if (sizeProblem === undefined) warnOversizedPluginText(caller.plugin, apiName, text.length);
    return sizeProblem;
  },
  run: (args, caller) => {
    let hasMode = "mode" in args && isPromptSectionMode(args.mode);
    let hasDecorations = "decorations" in args && args.decorations !== undefined;
    let hasCursor = "cursor" in args && args.cursor !== undefined;
    return promptSuggestOp(
      {
        text: args.text,
        ...(hasMode && {
          mode: args.mode,
        }),
        ...(hasDecorations && {
          decorations: args.decorations,
        }),
        ...(hasCursor && {
          cursor: args.cursor,
        }),
        origin: {
          kind: "plugin",
          name: caller.plugin,
        },
        hookOrigin: caller.origin,
        ...(caller.signal !== undefined && {
          signal: caller.signal,
        }),
      },
      caller,
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
var dispatchFactsOf = (caller) => ({
  cwd: caller.cwd,
  turnHeld: caller.turnHeld,
  rootEvent: isPersonInputEvent(caller.rootEvent) ? undefined : caller.rootEvent,
  isDispatching: caller.isDispatching,
});
//@ chunk-e6aww6q8.js:3717600-3717961 placement
/**
 * 构造插件间接口调用的"幕后"信息：调用者链、借用帧（有效期上限）、分发事实与评判上下文。
 */
function interfaceCallBehind(caller) {
  let { environmentId } = caller;
  let hasNoEnvironment = environmentId === undefined;
  let now = Date.now();
  let lentByChain = lentModulesByChain().get(caller.origin);
  return {
    caller: caller.plugin,
    callers: hasNoEnvironment ? [] : [...(caller.callers ?? []), environmentId],
    lent: caller.origin.map((frame, frameIndex) => ({
      frame,
      until: Math.min(
        lentByChain?.[frameIndex]?.until ?? Number.POSITIVE_INFINITY,
        now + DEFAULT_HOOK_TIMEOUT_MS,
      ),
      alike: lentByChain?.[frameIndex]?.alike,
    })),
    facts: dispatchFactsOf(caller),
    ...(caller.judging !== undefined && {
      judging: caller.judging,
    }),
    ...(caller.signal !== undefined && {
      signal: caller.signal,
    }),
  };
}
//@ chunk-e6aww6q8.js:3991212-3991254 placement
var EMPTY_PROMPT_DRAFT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3991212", () => {
  EMPTY_PROMPT_DRAFT = Object.freeze({
    text: "",
    cursor: 0,
  });
});
//@ chunk-e6aww6q8.js:3991254-3991356 placement
/**
 * 规整输入框内容为 {text, cursor}，不合法时为空。
 */
function normalizePromptBox(box) {
  return isPlainObject_5(box) && typeof box.text === "string" && isNonNegativeInt(box.cursor)
    ? {
        text: box.text,
        cursor: box.cursor,
      }
    : EMPTY_PROMPT_DRAFT;
}
//@ chunk-e6aww6q8.js:3991356-3991505 placement
/**
 * $.prompt.read 核心：读取当前绑定输入框的 {text, cursor}，没有输入框时返回空。
 */
async function readPromptBox(plugin) {
  let composer = surfaceComposer();
  if (composer === undefined && plugin !== undefined)
    logForDebugging(`$.prompt.read (${plugin}): no prompt box bound; the empty box`);
  return (await composer?.read()) ?? EMPTY_PROMPT_DRAFT;
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
var sessionStartCallsSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3991568", () => {
  sessionStartCallsSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:3991603-3991639 placement
/**
 * 忘掉某次调用
 */
function forgetSessionStartCall(name) {
  sessionStartCallsSlot.get()?.delete(name);
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
function recordSessionStartLoad({ name, args, shown, environmentId }) {
  let byName = sessionStartCallsSlot.get() ?? new Map();
  sessionStartCallsSlot.set(byName);
  let load = {
    args,
    shown,
  };
  let isSameLoad = isDeepStrictEqual(byName.get(name)?.load, load);
  if (!isSameLoad)
    byName.set(name, {
      load,
      calls: emptySessionCalls(),
      copies: new Set(),
    });
  byName.get(name)?.copies.add(environmentId);
  return isSameLoad;
}
//@ chunk-e6aww6q8.js:3991970-3992071 placement
/**
 * 判断调用结果是否因中止而结束（拒绝或出错）。
 */
function isAbortedCallResult(result, value) {
  return (
    result.endsWith?.aborted === true &&
    (!isPlainDataObject(value) || Object.hasOwn(value, "deny") || value.isError === true)
  );
}
//@ chunk-e6aww6q8.js:3992071-3992146 placement
/**
 * 移除一次调用
 */
function removeCall(entry, key, call) {
  entry.calls = {
    ...entry.calls,
    [key]: entry.calls[key].filter((existing) => existing !== call),
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
  EMPTY_PROMPT_DRAFT,
  AUDIO_PLAY_API,
  interfaceCallBehind,
  createPromptTextApi,
  checkPromptSectionArgs,
};
