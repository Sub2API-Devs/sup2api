/**
 * plugins/functionHooks/toolCallHooks.ts
 *
 * 2.1.316 新增：tool.call 事件钩子接入工具执行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (41)
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

//@ chunk-e6aww6q8.js:35060-35071 placement
/**
 * 空对象
 */
var emptyToolHooksFirst = {};
//@ chunk-e6aww6q8.js:35071-35305 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:35071", () => {
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
//@ chunk-e6aww6q8.js:35305-35315 placement
/**
 * 空对象
 */
var emptyToolHooksSecond = {};
//@ chunk-e6aww6q8.js:35315-35487 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:35315", () => {
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
//@ chunk-e6aww6q8.js:35487-35498 placement
/**
 * 空对象
 */
var emptyToolHooksThird = {};
//@ chunk-e6aww6q8.js:35498-35788 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:35498", () => {
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
//@ chunk-e6aww6q8.js:35788-35835 placement
/**
 * 经典钩子事件（非 PreToolUse）
 */
var isClassicHookEvent = (event) => event !== "PreToolUse" && HOOK_EVENTS_2.includes(event);
//@ chunk-e6aww6q8.js:35835-35875 placement
/**
 * 经典钩子有钩子
 */
var isClassicHooked = (event) => isClassicHookEvent(event) && hasModuleHookingSite(`classic.${event}`);
//@ chunk-e6aww6q8.js:35875-35903 placement
/**
 * classic.<event>
 */
var classicSiteName = (event) => `classic.${event}`;
//@ chunk-e6aww6q8.js:35903-35934 placement
/**
 * 是否有 classic.<event> 站
 */
var hasClassicHookSite = (event) => hasModuleHookingSite(`classic.${event}`);
//@ chunk-e6aww6q8.js:35934-36020 placement
/**
 * 有模块监听该经典事件
 */
var isClassicEventAdmitted = (event) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) => isModuleAdmitted(loadedModule) && loadedModule.patterns.includes(`classic.${event}`),
  );
//@ chunk-e6aww6q8.js:36020-36045 placement
/**
 * 插件提示表
 */
var pluginNotices = () => getPluginRegistry().notices;
//@ chunk-e6aww6q8.js:36045-36204 placement
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
//@ chunk-e6aww6q8.js:36204-36288 placement
/**
 * 忘掉打开的调用
 */
function forgetOpenCall(toolUseId) {
  getPluginRegistry().openCalls.delete(toolUseId);
  getPluginRegistry().withheldCalls.delete(toolUseId);
  setPluginNotice(toolUseId, undefined);
}
//@ chunk-e6aww6q8.js:36288-36458 placement
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
//@ chunk-e6aww6q8.js:36458-36727 placement
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
//@ chunk-e6aww6q8.js:36727-36938 placement
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
//@ chunk-e6aww6q8.js:36938-36979 placement
/**
 * 记录打开的调用
 */
var setOpenCall = (toolUseID, hookOrigin) => {
  getPluginRegistry().openCalls.set(toolUseID, hookOrigin);
};
//@ chunk-e6aww6q8.js:36979-37021 placement
/**
 * 忘掉扣留的调用
 */
var forgetWithheldCall = (toolUseId) => getPluginRegistry().withheldCalls.delete(toolUseId);
//@ chunk-e6aww6q8.js:37021-37151 placement
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
//@ chunk-e6aww6q8.js:37151-37217 placement
/**
 * 结果被扣留说明
 */
var withheldResultText = (name) => `${name} ran, and a plugin withheld its result: ${CHECKER_NO_ANSWER}`;
//@ chunk-e6aww6q8.js:3752385-3752537 placement
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
//@ chunk-e6aww6q8.js:3752537-3752551 placement
/**
 * 工具描述缓存
 */
var toolDescriptionCache; // deferred: uses createToolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3752537", () => {
  toolDescriptionCache = createToolDescriptionCache();
});
//@ chunk-e6aww6q8.js:3752551-3752563 placement
/**
 * 300
 */
var TOOL_DESCRIBE_SETTLE_MS = 300;
//@ chunk-e6aww6q8.js:3752563-3752582 placement
var forget; // deferred: uses toolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3752563", () => {
  forget = toolDescriptionCache.forget;
});
//@ chunk-e6aww6q8.js:3752582-3752593 placement
/**
 * 20
 */
var DEFAULT_MAX_SUBAGENTS = 20;
//@ chunk-e6aww6q8.js:3752593-3752659 placement
/**
 * 并发子代理上限
 */
function maxConcurrentSubagents() {
  return env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS ?? DEFAULT_MAX_SUBAGENTS;
}
//@ chunk-e6aww6q8.js:3752659-3752677 placement
/**
 * 并发子代理上限
 */
var maxSubagents = () => maxConcurrentSubagents();
//@ chunk-e6aww6q8.js:3752677-3752743 placement
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
//@ chunk-e6aww6q8.js:3752743-3752767 placement
/**
 * {type:"direct"}
 */
var DIRECT_CALLER = {
  type: "direct",
};
//@ chunk-e6aww6q8.js:3752767-3752813 placement
/**
 * 工具结果带 isError
 */
var errorToolResult = (result, text) => ({
  result,
  text,
  isError: true,
});
//@ chunk-e6aww6q8.js:3752813-3752876 placement
/**
 * 插件构造的工具调用 id 前缀 toolu_plugin_；带这个前缀的 tool_use 视为插件发起。
 */
var TOOLU_PLUGIN_2 = "toolu_plugin_";
var TOOLU_PLUGIN = (toolUseId) => toolUseId.startsWith("toolu_plugin_");
//@ chunk-e6aww6q8.js:3752914-3753012 placement
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
//@ chunk-e6aww6q8.js:3753012-3753125 placement
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
//@ chunk-e6aww6q8.js:3753125-3753245 placement
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
//@ chunk-e6aww6q8.js:3753245-3753398 placement
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
//@ chunk-e6aww6q8.js:3753398-3753484 placement = extractErrorTypeFromData (1)
function unwrapUserMessage(data) {
  if ("type" in data) return;
  let { message } = data;
  return message.type === "user" ? message : undefined;
}
//@ chunk-e6aww6q8.js:3753484-3753574 placement
/**
 * 包装成 HooksError
 */
function rethrowHooksError(pluginName, error, what) {
  if (error instanceof HooksError) throw error;
  throw new HooksError(`${pluginName}: ${what} failed: ${errorMessage(error)}`);
}
//@ chunk-e6aww6q8.js:3753574-3753607 placement
/**
 * 扣留结果标记
 */
var WITHHELD_RESULT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3753574", () => {
  WITHHELD_RESULT = Symbol("withheldResult");
});
//@ chunk-e6aww6q8.js:3753607-3753641 placement
/**
 * 是否被扣留
 */
var isWithheldResult = (update) => Object.hasOwn(update, WITHHELD_RESULT);
//@ chunk-e6aww6q8.js:3753641-3753706 placement
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
  isClassicEventAdmitted,
  maxConcurrentSubagents,
  emptyToolHooksFirst,
  isClassicHookEvent,
  isClassicHooked,
  emptyToolHooksThird,
  forgetOpenCall,
  forgetWithheldCall,
  setOpenCall,
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
  TOOLU_PLUGIN,
  maxSubagents,
  lastAssistantText,
  markWithheldResult,
  checkToolCallOwner,
  setPluginNotice,
  forget,
  watchWithheldResults,
  releaseWithheldWatch,
  withheldResultText,
};
