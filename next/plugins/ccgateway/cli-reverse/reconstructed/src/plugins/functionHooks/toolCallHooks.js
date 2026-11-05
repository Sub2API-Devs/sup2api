/**
 * plugins/functionHooks/toolCallHooks.ts
 *
 * 2.1.316 新增：tool.call 事件钩子接入工具执行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (41)
 * attribution: placement 41
 */
import { randomUUID } from "crypto";
import { __export } from "../../../runtime/bun-runtime.js";
import { forgetMcpServerFor, isToolFromServer, list, registeredMcpToolName } from "./mcpServerHooks.js";
import { moduleStore, createModuleStore } from "../../services/mcp/mcpClientCapabilities.js";
import {
  MAX_TRACKED_INSTRUCTION_PATHS,
  PATH,
  INSTRUCTION_WITHHELD_REASONS,
  MAX_SHOWN_INSTRUCTION_FILES,
  logWithheldInstructionFiles,
  recordWithheldInstructionFiles,
  clearOwedInstructionFiles,
  takeOwedInstructionFiles,
  seenWithheldPaths,
  withheldMemoryPaths,
  withheldInstructionNotice,
  moreInstructionFilesText,
  takeShownInstructionFiles,
  withheldInstructionStateSlot,
} from "../../utils/instructionFileAccess.js";
import { HOOK_EVENTS as HOOK_EVENTS_2 } from "./hookApiSurface.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { originPlugin } from "./hooksWorkerClient.js";
import { CHECKER_NO_ANSWER } from "./hostBridge.js";
import { env } from "../../utils/env.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { joinTextBlocks as joinTextBlocks_2 } from "./sites/toolSites.js";
import { HooksError } from "./hooksErrors.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:37648-37659 placement
/**
 * 空对象
 */
var emptyToolHooksFirst = {};
//@ chunk-5xgkngpb.js:37659-37893 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:37659", () => {
  __export(emptyToolHooksFirst, {
    closeCall: () => forgetOpenCall,
    default: () => emptyToolHooksFirst,
    endWithheldWatch: () => releaseWithheldWatch,
    noteWithheld: () => noteWithheldPostToolUse,
    noticeProblem: () => checkToolCallOwner,
    noticesStore: () => pluginNotices,
    openCall: () => setOpenCall,
    setNotice: () => setPluginNotice,
    takeWithheld: () => forgetWithheldCall,
    watchWithheld: () => watchWithheldResults,
    withheldResult: () => withheldResultText,
  });
});
//@ chunk-5xgkngpb.js:37893-37903 placement
/**
 * 空对象
 */
var emptyToolHooksSecond = {};
//@ chunk-5xgkngpb.js:37903-38075 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:37903", () => {
  __export(emptyToolHooksSecond, {
    default: () => emptyToolHooksSecond,
    forgetRegisteredTools: () => forgetMcpServerFor,
    isRegisteredBy: () => isToolFromServer,
    registered: () => moduleStore,
    registeredToolsOf: () => list,
    registrations: () => createModuleStore,
    unchangedRegistration: () => registeredMcpToolName,
  });
});
//@ chunk-5xgkngpb.js:38075-38086 placement
/**
 * 空对象
 */
var emptyToolHooksThird = {};
//@ chunk-5xgkngpb.js:38086-38376 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:38086", () => {
  __export(emptyToolHooksThird, {
    KEPT_MOST: () => MAX_TRACKED_INSTRUCTION_PATHS,
    PATH_MARK: () => PATH,
    REASONS: () => INSTRUCTION_WITHHELD_REASONS,
    SHOWN_MOST: () => MAX_SHOWN_INSTRUCTION_FILES,
    default: () => emptyToolHooksThird,
    noteWithheld: () => logWithheldInstructionFiles,
    oweWithheld: () => recordWithheldInstructionFiles,
    owedNoMore: () => clearOwedInstructionFiles,
    owedWithheld: () => takeOwedInstructionFiles,
    toldBy: () => seenWithheldPaths,
    toldIn: () => withheldMemoryPaths,
    withheldLine: () => withheldInstructionNotice,
    withheldMore: () => moreInstructionFilesText,
    withheldShown: () => takeShownInstructionFiles,
    withheldTolds: () => withheldInstructionStateSlot,
  });
});
//@ chunk-5xgkngpb.js:38376-38423 placement
/**
 * 经典钩子事件（非 PreToolUse）
 */
var isClassicHookEvent = (event) => event !== "PreToolUse" && HOOK_EVENTS_2.includes(event);
//@ chunk-5xgkngpb.js:38423-38463 placement
/**
 * 经典钩子有钩子
 */
var isClassicHooked = (event) => isClassicHookEvent(event) && hasModuleHookingSite(`classic.${event}`);
//@ chunk-5xgkngpb.js:38463-38491 placement
/**
 * classic.<event>
 */
var classicSiteName = (event) => `classic.${event}`;
//@ chunk-5xgkngpb.js:38491-38522 placement
/**
 * 是否有 classic.<event> 站
 */
var hasClassicHookSite = (event) => hasModuleHookingSite(`classic.${event}`);
//@ chunk-5xgkngpb.js:38522-38608 placement
/**
 * 有模块监听该经典事件
 */
var isClassicEventAdmitted = (event) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) => isModuleAdmitted(loadedModule) && loadedModule.patterns.includes(`classic.${event}`),
  );
//@ chunk-5xgkngpb.js:38608-38633 placement
/**
 * 插件提示表
 */
var pluginNotices = () => getPluginRegistry().notices;
//@ chunk-5xgkngpb.js:38633-38792 placement
/**
 * 设置或清除某键的插件提示（内容未变则不更新）。
 */
var setPluginNotice = (toolUseId, notice) => {
  pluginNotices().setState((notices) => {
    let existing = notices.get(toolUseId);
    if (existing?.plugin === notice?.plugin && existing?.text === notice?.text) return notices;
    let next = new Map(notices);
    if (notice) next.set(toolUseId, notice);
    else next.delete(toolUseId);
    return next;
  });
};
//@ chunk-5xgkngpb.js:38792-38876 placement
/**
 * 忘掉打开的调用
 */
function forgetOpenCall(toolUseId) {
  getPluginRegistry().openCalls.delete(toolUseId);
  getPluginRegistry().withheldCalls.delete(toolUseId);
  setPluginNotice(toolUseId, undefined);
}
//@ chunk-5xgkngpb.js:38876-39046 placement
/**
 * 释放一个对被扣留结果的观察者，返回期间是否有新的扣留记录。
 */
function releaseWithheldWatch(toolUseId, seenNotes) {
  let { withheldWatches } = getPluginRegistry();
  let watch = withheldWatches.get(toolUseId);
  if (watch === undefined || watch.watchers <= 1) withheldWatches.delete(toolUseId);
  else
    withheldWatches.set(toolUseId, {
      ...watch,
      watchers: watch.watchers - 1,
    });
  return watch !== undefined && watch.notes > seenNotes;
}
//@ chunk-5xgkngpb.js:39046-39315 placement
/**
 * PostToolUse 被扣留时记录：增加观察计数，标记开放调用为已扣留。
 */
function noteWithheldPostToolUse(hookInput) {
  let { openCalls, withheldCalls, withheldWatches } = getPluginRegistry();
  let toolUseId = Reflect.get(hookInput, "tool_use_id");
  let isPostToolUse =
    Reflect.get(hookInput, "hook_event_name") === "PostToolUse" && typeof toolUseId === "string";
  let watch = isPostToolUse ? withheldWatches.get(toolUseId) : undefined;
  let isOpen = isPostToolUse && openCalls.has(toolUseId);
  if (watch !== undefined)
    withheldWatches.set(toolUseId, {
      ...watch,
      notes: watch.notes + 1,
    });
  if (isOpen) withheldCalls.add(toolUseId);
}
//@ chunk-5xgkngpb.js:39315-39526 placement
/**
 * 校验插件可以操作的 tool_use_id：调用必须开放且由该插件的 $.tool.call 发起。
 */
function checkToolCallOwner(toolUseId, plugin) {
  let { openCalls } = getPluginRegistry();
  if (!openCalls.has(toolUseId)) return "no call with that tool_use_id is open";
  let origins = openCalls.get(toolUseId);
  return origins === undefined || origins.some((origin) => originPlugin(origin) === plugin)
    ? undefined
    : "the call is another plugin's $.tool.call run";
}
//@ chunk-5xgkngpb.js:39526-39567 placement
/**
 * 记录打开的调用
 */
var setOpenCall = (toolUseID, hookOrigin) => {
  getPluginRegistry().openCalls.set(toolUseID, hookOrigin);
};
//@ chunk-5xgkngpb.js:39567-39609 placement
/**
 * 忘掉扣留的调用
 */
var forgetWithheldCall = (toolUseId) => getPluginRegistry().withheldCalls.delete(toolUseId);
//@ chunk-5xgkngpb.js:39609-39739 placement
/**
 * 登记一个被扣留结果的观察者，返回当前记录数。
 */
function watchWithheldResults(toolUseId) {
  let { withheldWatches } = getPluginRegistry();
  let watch = withheldWatches.get(toolUseId) ?? {
    watchers: 0,
    notes: 0,
  };
  withheldWatches.set(toolUseId, {
    ...watch,
    watchers: watch.watchers + 1,
  });
  return watch.notes;
}
//@ chunk-5xgkngpb.js:39739-39805 placement
/**
 * 结果被扣留说明
 */
var withheldResultText = (name) => `${name} ran, and a plugin withheld its result: ${CHECKER_NO_ANSWER}`;
//@ chunk-5xgkngpb.js:3848140-3848292 placement
function createToolDescriptionCache() {
  let weakMap = new WeakMap();
  return {
    of: (tool, compute) => {
      let map = weakMap;
      let descriptionPromise =
        map.get(tool) ??
        compute().catch(() => {
          map.delete(tool);
          return "";
        });
      map.set(tool, descriptionPromise);
      return descriptionPromise;
    },
    forget: () => {
      weakMap = new WeakMap();
    },
  };
}
//@ chunk-5xgkngpb.js:3848292-3848306 placement
/**
 * 工具描述缓存
 */
var toolDescriptionCache; // deferred: uses createToolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3848292", () => {
  toolDescriptionCache = createToolDescriptionCache();
});
//@ chunk-5xgkngpb.js:3848306-3848318 placement
/**
 * 300
 */
var TOOL_DESCRIBE_SETTLE_MS = 300;
//@ chunk-5xgkngpb.js:3848318-3848337 placement
var forget; // deferred: uses toolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3848318", () => {
  forget = toolDescriptionCache.forget;
});
//@ chunk-5xgkngpb.js:3848337-3848348 placement
/**
 * 20
 */
var DEFAULT_MAX_SUBAGENTS = 20;
//@ chunk-5xgkngpb.js:3848348-3848414 placement
/**
 * 并发子代理上限
 */
function maxConcurrentSubagents() {
  return env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS ?? DEFAULT_MAX_SUBAGENTS;
}
//@ chunk-5xgkngpb.js:3848414-3848432 placement
/**
 * 并发子代理上限
 */
var maxSubagents = () => maxConcurrentSubagents();
//@ chunk-5xgkngpb.js:3848432-3848498 placement
/**
 * 子代理调用者信息
 */
var subagentCaller = (agentId, resolvedModel) =>
  resolvedModel === undefined
    ? {
        agentId,
      }
    : {
        agentId,
        resolvedModel,
      };
//@ chunk-5xgkngpb.js:3848498-3848522 placement
/**
 * {type:"direct"}
 */
var DIRECT_CALLER = {
  type: "direct",
};
//@ chunk-5xgkngpb.js:3848522-3848568 placement
/**
 * 工具结果带 isError
 */
var errorToolResult = (result, text) => ({
  result,
  text,
  isError: true,
});
//@ chunk-5xgkngpb.js:3848568-3848631 placement
/**
 * 插件构造的工具调用 id 前缀 toolu_plugin_；带这个前缀的 tool_use 视为插件发起。
 */
var TOOLU_PLUGIN_2 = "toolu_plugin_";
var TOOLU_PLUGIN = (toolUseId) => toolUseId.startsWith("toolu_plugin_");
//@ chunk-5xgkngpb.js:3848669-3848767 placement
/**
 * 构造插件 tool_use 块
 */
var pluginToolUse = (name, input) => ({
  type: "tool_use",
  id: `${TOOLU_PLUGIN_2}${randomUUID().replace(/-/g, "")}`,
  name,
  input,
  caller: DIRECT_CALLER,
});
//@ chunk-5xgkngpb.js:3848767-3848880 placement
/**
 * 取异步启动的 Agent 工具结果中的代理 id。
 */
function launchedAgentId(name, result) {
  let launchResult = result;
  let agentId = launchResult?.agentId;
  return name === AGENT && launchResult?.status === "async_launched" && typeof agentId === "string"
    ? agentId
    : undefined;
}
//@ chunk-5xgkngpb.js:3848880-3849000 placement
/**
 * 构造插件发起工具调用的上下文：带上钩子来源、调用插件与是否服务模型。
 */
var pluginToolContext = (session, abortController, caller) => ({
  ...session.toolContext(abortController),
  hookOrigin: caller.origin,
  hookCaller: caller.plugin,
  ...(caller.servesModel && {
    hookServesModel: true,
  }),
});
//@ chunk-5xgkngpb.js:3849000-3849153 placement
/**
 * 取消息列表中最后一条有文本的助手消息文本。
 */
function lastAssistantText(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type !== "assistant") continue;
    let text = joinTextBlocks_2(message.message?.content, "");
    if (text !== "") return text;
  }
  return "";
}
//@ chunk-5xgkngpb.js:3849153-3849239 placement (2.1.88 match: extractErrorTypeFromData, 1)
function unwrapUserMessage(data) {
  if ("type" in data) return;
  let { message } = data;
  return message.type === "user" ? message : undefined;
}
//@ chunk-5xgkngpb.js:3849239-3849329 placement
/**
 * 包装成 HooksError
 */
function rethrowHooksError(pluginName, error, what) {
  if (error instanceof HooksError) throw error;
  throw new HooksError(`${pluginName}: ${what} failed: ${errorMessage(error)}`);
}
//@ chunk-5xgkngpb.js:3849329-3849362 placement
/**
 * 扣留结果标记
 */
var WITHHELD_RESULT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3849329", () => {
  WITHHELD_RESULT = Symbol("withheldResult");
});
//@ chunk-5xgkngpb.js:3849362-3849396 placement
/**
 * 是否被扣留
 */
var isWithheldResult = (update) => Object.hasOwn(update, WITHHELD_RESULT);
//@ chunk-5xgkngpb.js:3849396-3849461 placement
/**
 * 标记扣留
 */
function markWithheldResult(message) {
  Object.defineProperty(message, WITHHELD_RESULT, {
    value: true,
  });
  return message;
}
export {
  hasClassicHookSite,
  maxConcurrentSubagents,
  TOOLU_PLUGIN,
  classicSiteName,
  noteWithheldPostToolUse,
  pluginToolContext,
  pluginToolUse,
  unwrapUserMessage,
  isWithheldResult,
  rethrowHooksError,
  launchedAgentId,
  subagentCaller,
  errorToolResult,
  toolDescriptionCache,
  TOOL_DESCRIBE_SETTLE_MS,
  emptyToolHooksSecond,
  isClassicHooked,
  isClassicEventAdmitted,
  checkToolCallOwner,
  setPluginNotice,
  maxSubagents,
  lastAssistantText,
  forgetOpenCall,
  forgetWithheldCall,
  setOpenCall,
  markWithheldResult,
  forget,
  emptyToolHooksFirst,
  isClassicHookEvent,
  watchWithheldResults,
  releaseWithheldWatch,
  withheldResultText,
  emptyToolHooksThird,
};
