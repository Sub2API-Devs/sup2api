/**
 * tools/REPLTool/hookRun.ts
 *
 * 通过插件 tool.call hook 运行内层调用并处理拒绝与结果扣留（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (9)
 * attribution: placement 9
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import {
  createToolCallChain,
  buildToolUseErrorBlock,
  isRunUnchanged,
  shouldApplyManagedRewrite,
  ranWithoutError,
  runPostToolUseHooksForMemory,
} from "../../services/tools/toolHooks.js";
import { sameMessageOrShape } from "../../plugins/functionHooks/sites/sessionSites.js";
import { createUserMessage } from "../../utils/messages.js";
import { shouldReplaceMemoryInput } from "../../utils/permissions/permissions.js";
import { guardAccountMemoryHookRewrite } from "../../utils/hooks/hookUpdatedInput.js";
import { withAgentId, toolCallEvent } from "../../plugins/functionHooks/sites/toolSites.js";
import { setOpenCall, forgetOpenCall } from "../../plugins/functionHooks/toolCallHooks.js";
import { releaseToolServerHold } from "../../plugins/functionHooks/pluginLifecycle.js";
import { eventCallersFor2 } from "../../plugins/functionHooks/eventCatalog.js";
import { PromptScopedAbortController, attachDetachableAbortRelay } from "../../utils/abortController.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-n51jggtb.js:87732-87792 placement
/**
 * 列出可参与 hook 的已加载模块。
 */
function hookedModules() {
  return getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule));
}
//@ chunk-n51jggtb.js:87792-87913 placement
/**
 * 判断该工具的调用是否需要走插件 tool.call hook。
 */
function hasToolCallHook(tool, toolUseContext) {
  return (
    toolUseContext.options.settingsHooksOff !== true &&
    (getPluginRegistry().hooksRespawns.size > 0 ||
      hasModuleHookingSite(
        "tool.call",
        {
          tool: tool.name,
        },
        hookedModules(),
      ))
  );
}
//@ chunk-n51jggtb.js:89284-91315 placement
/**
 * 通过插件 tool.call hook 运行一次内层调用，处理拒绝、结果扣留与输出形状校验。
 */
async function runManagedToolCall({ tool, toolUseID, input, toolUseContext, startRun }) {
  let weakMap = new WeakMap();
  let toolCallChain = createToolCallChain(
    tool,
    toolUseContext,
    async (resolvedInput, resolvedContext, meta) => {
      let run = await startRun(
        resolvedInput,
        {
          ...resolvedContext,
          abortController: createChildAbortController(
            toolUseContext.abortController,
            resolvedContext.abortController,
          ),
        },
        {
          atAll: !sameMessageOrShape(input, resolvedInput),
          byPlugin: !sameMessageOrShape(resolvedContext.managedPass?.input ?? input, resolvedInput),
        },
      );
      let { ranInput } = run;
      if (ranInput !== undefined && tryCall(() => tool.isReadOnly(ranInput, resolvedContext)) === true)
        meta.isReadOnly = true;
      let pluginId = pluginIdOfRun(run);
      if (pluginId !== undefined)
        meta.output = {
          value: tryCall(() => strippedPluginResult(tool, pluginDataDirPath(pluginId))),
        };
      let messages = [
        {
          message: createUserMessage(
            pluginId !== undefined
              ? {
                  content: [
                    tryCall(() =>
                      tool.mapToolResultToToolResultBlockParam(pluginDataDirPath(pluginId), toolUseID),
                    ) ?? {
                      type: "tool_result",
                      tool_use_id: toolUseID,
                      content: "",
                    },
                  ],
                }
              : {
                  content: [buildToolUseErrorBlock(toolUseID, runErrorText(run))],
                  toolUseResult: `Error: ${runErrorText(run)}`,
                },
          ),
        },
      ];
      weakMap.set(messages, run);
      return messages;
    },
    (messages) =>
      shouldReplaceMemoryInput(tool, input, messages)
        ? guardAccountMemoryHookRewrite(tool, "PreToolUse", "tool.call hook").message
        : undefined,
  );
  let lookupRun = (messages) => (messages === undefined ? undefined : weakMap.get(messages.made.messages));
  let callEvent = withAgentId(toolCallEvent(tool.name, toolUseID, input), toolUseContext.agentId);
  let isNewOpenCall = !getPluginRegistry().openCalls.has(toolUseID);
  if (isNewOpenCall) setOpenCall(toolUseID, toolUseContext.hookOrigin);
  let hookResult;
  try {
    await releaseToolServerHold(tool);
    hookResult = await eventCallersFor2({
      signal: toolUseContext.abortController.signal,
      origin: toolUseContext.hookOrigin,
      core: {
        "tool.call": toolCallChain.core,
      },
      managed: {
        "tool.call": toolCallChain.managed,
      },
      among: hookedModules,
    }).tool.call(callEvent);
  } finally {
    if (isNewOpenCall) forgetOpenCall(toolUseID);
  }
  let run = toolCallChain.runs.of(hookResult.ref);
  let runKept = run !== undefined && isRunUnchanged(hookResult, run.made);
  let managedRewrite = shouldApplyManagedRewrite(tool, hookResult, runKept);
  let errorMessage = lookupRun(runKept ? run : managedRewrite ? toolCallChain.runs.last() : undefined);
  if (errorMessage !== undefined)
    return {
      kind: "run",
      run: errorMessage,
    };
  if (managedRewrite)
    return {
      kind: "refused",
      message:
        "A plugin hook answered a call to the account memory server in place of the server; the call is refused.",
    };
  if (hookResult.deny !== undefined)
    return {
      kind: "refused",
      message:
        toolCallChain.runs.last((candidate) =>
          candidate.made.messages.some((message) => ranWithoutError(message, toolUseID)),
        ) !== undefined
          ? `${tool.name} ran, and a plugin withheld its result: ${hookResult.deny}`
          : hookResult.deny,
    };
  let input_2 = toolCallChain.runs.last()?.input ?? input;
  let postResult = toolCallChain.managedRan()
    ? await runPostToolUseHooksForMemory({
        tool,
        toolUseID,
        input: input_2,
        output: hookResult.result,
        toolUseContext,
        durationMs: undefined,
      })
    : {
        output: hookResult.result,
        rewritten: false,
      };
  let parsed = tool.outputSchema?.safeParse(postResult.output);
  if (parsed !== undefined && !parsed.success)
    return {
      kind: "refused",
      message: `${postResult.rewritten ? "a managed PostToolUse hook rewrote" : "tool.call step resolved"} ${tool.name} with a result that does not match its output shape: ${parsed.error.message}`,
    };
  return {
    kind: "answered",
    data: parsed?.data ?? postResult.output,
    input: input_2,
    ranSpill: lookupRun(toolCallChain.runs.last())?.commits.find(([, commit]) => commit !== undefined)?.[1]
      ?.shellSpill,
  };
}
//@ chunk-n51jggtb.js:91315-91463 placement (2.1.88 match: createChildAbortController, 0.878)
/**
 * 派生一个带上层 abort 的子 AbortController。
 */
function createChildAbortController(parent, maxListeners) {
  let weakChild = new PromptScopedAbortController(parent);
  attachDetachableAbortRelay(maxListeners, weakChild);
  weakChild.signal.addEventListener(
    "abort",
    () => {
      if (!maxListeners.signal.aborted) maxListeners.abort(weakChild.signal.reason);
    },
    {
      once: true,
    },
  );
  return weakChild;
}
//@ chunk-n51jggtb.js:91463-91526 placement
/**
 * 从提交记录里取最后一条有值的提交。
 */
function pluginIdOfRun(run) {
  return run?.commits.find(([, commit]) => commit !== undefined)?.[0];
}
//@ chunk-n51jggtb.js:91526-91604 placement (2.1.88 match: pluginDataDirPath, 1)
/**
 * 取出内层调用提交里的 data。
 */
function pluginDataDirPath(pluginId) {
  return pluginId !== null && typeof pluginId === "object" && "data" in pluginId ? pluginId.data : undefined;
}
//@ chunk-n51jggtb.js:91604-91753 placement
/**
 * 把内层调用的失败整理成错误文本。
 */
function runErrorText(run) {
  return run.closing?.type === "progress" && run.closing.data.error !== undefined
    ? run.closing.data.error
    : "thrown" in run.settled
      ? errorMessage(run.settled.thrown)
      : "";
}
//@ chunk-n51jggtb.js:91753-91914 placement
/**
 * 按工具的剥离钩子处理结果（创建/存储两种）。
 */
function strippedPluginResult(tool, pluginId) {
  if (tool.stripForCreation) return tool.stripForCreation(pluginId);
  if (tool.stripToolUseResultAtCreation && tool.stripForStorage) return tool.stripForStorage(pluginId, false);
  return pluginId;
}
//@ chunk-n51jggtb.js:91914-91966 placement
/**
 * 执行回调并吞掉异常（记录日志）。
 */
function tryCall(thunk) {
  try {
    return thunk();
  } catch (error) {
    logError(error);
    return;
  }
}
export { hasToolCallHook, runManagedToolCall };
