/**
 * services/tools/toolHooks.ts
 *
 * 工具相关 hook：PreToolUse（改输入、给权限结论、阻止继续、追加上下文）、PostToolUse、PostToolUseFailure，以及把 hook 权限结论并入正常权限流程的 resolveHookPermissionDecision
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolHooks.ts
 * pieces: chunk-5xgkngpb.js (37), chunk-7jxyna5q.js (1)
 * attribution: placement 30, affinity 1, fingerprint 4, layout 3
 */
import {
  EVENT_TOOL_SITE_NAMES,
  RESULT_TOKEN_BUDGET,
  isStringListValue,
} from "../../plugins/functionHooks/sites/siteRules.js";
import { MAX_PREVIEW_CHARS, truncateAdditionalContext } from "../remoteTools/backgroundCommands.js";
import { createAttachmentMessage_2, logForDebugging } from "../../utils/debug.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { markWithheldResult } from "../../plugins/functionHooks/toolCallHooks.js";
import {
  toolInputOf,
  withRequestMeta,
  withAgentId,
  toolCallEvent,
} from "../../plugins/functionHooks/sites/toolSites.js";
import { forwardAbort, createStepRecorder } from "../../plugins/functionHooks/dispatch/chain.js";
import { stringRequestMeta } from "../../plugins/functionHooks/sessionApi.js";
import { interpretCommandResult_2 } from "../../tools/BashTool/commandSemantics.js";
import { createUserMessage } from "../../utils/messages.js";
import {
  isConversationEndTool,
  shouldReplaceMemoryInput,
  isLiveMemoryToolName,
  classifierOnlyConfig,
  isClassifierAllow,
  describeNonClassifierAllow,
  buildClassifierOnlyDenial,
  checkRuleBasedPermissions,
  checkRuleBasedPermissionsOnToolHost,
  appendRuleAnnotation,
  isClassifierRoutedMcpTool,
  isWebToolClassifierRouted,
  countMcpPolicyRecheckSkipped,
  decideWithToolCheckHooks,
  personAskAfterHooks,
  enforceClassifierOnlyDecision,
  mcpAskVetoesStandingGrant,
  isWebSearchClassifierRouted,
} from "../../utils/permissions/permissions.js";
import { MANAGED } from "../../plugins/functionHooks/classicHookBridge.js";
import {
  collectPreToolHookPass,
  executePreToolHooks,
  executePostToolHooks,
  executePostToolUseFailureHooks,
  getPreToolHookBlockingMessage,
} from "../../utils/hooks.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  guardAccountMemoryHookRewrite,
  hookSourceKind,
  validateHookUpdatedInput,
} from "../../utils/hooks/hookUpdatedInput.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isMcpTool } from "../mcp/utils.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../analytics/safeMetadata.js";
import { formatToolErrorMessage } from "../../utils/toolErrors.js";
import { isAbortError, StreamClosedAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { getHookCaller } from "../../utils/agentContext.js";
import { settingsProblemDenial } from "../../utils/settings/settingsProblems.js";
import { dropStaleHostDisplay } from "../../utils/hooks/hookMessages.js";
import { reservedKeyDenialIfPresent } from "../../tools/ArtifactTool/reservedKeys.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { forwardHostWordedAsk } from "./hostWordedAsks.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { requiresClassifierForHookAllow } from "../../utils/permissions/permissionSetup.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isRemoteBrowserToolUnderModeFloor } from "../../utils/permissions/remoteBrowser.js";
import { getRemoteHookRunner } from "../../Tool.js";
import { setStrictestHookAnswer } from "../../utils/hooks/hookPermissionResult.js";
import { getRuleBehaviorDescription } from "../../utils/permissions/PermissionResult.js";

//@ chunk-7jxyna5q.js:527788-528051 placement
/**
 * 限制钩子 additionalContext 的总长度：逐条加入，超出时截断剩余条目。
 */
async function capAdditionalContext(entries, event, storage) {
  let kept = [];
  let usedChars = 0;
  let index = 0;
  while (index < entries.length) {
    let entry = entries[index] ?? "";
    let remaining = EVENT_TOOL_SITE_NAMES - usedChars;
    let fits = entry.length <= Math.min(RESULT_TOKEN_BUDGET, remaining);
    let toTruncate = fits || remaining >= MAX_PREVIEW_CHARS ? [entry] : entries.slice(index);
    let text = fits
      ? entry
      : await truncateAdditionalContext({
          entries: toTruncate,
          limit: Math.max(0, Math.min(RESULT_TOKEN_BUDGET, remaining)),
          event,
          storageV5: storage,
        });
    kept.push(text);
    usedChars += text.length;
    index += toTruncate.length;
  }
  return kept;
}
//@ chunk-5xgkngpb.js:3871757-3871852 placement
/**
 * 构造 hook 错误的 tool_result。
 */
var hookErrorToolResult = (toolUseId, text) => ({
  type: "tool_result",
  content: [
    {
      type: "text",
      text,
    },
  ],
  is_error: true,
  tool_use_id: toolUseId,
});
//@ chunk-5xgkngpb.js:3871852-3872227 placement
/**
 * 构造 tool.call 钩子的附加上下文消息、PreToolUse 阻止继续的消息，以及判断消息是否为阻止继续。
 */
var buildToolCallContextMessage = (entries, toolUseId) => ({
  message: createAttachmentMessage_2({
    type: "hook_additional_context",
    content: [...entries],
    hookName: "tool.call",
    toolUseID: `${toolUseId}-context`,
    hookEvent: "PostToolUse",
  }),
});
var buildHookStoppedMessage = (message, name, toolUseID) => ({
  message: createAttachmentMessage_2({
    type: "hook_stopped_continuation",
    message,
    hookName: `PreToolUse:${name}`,
    toolUseID,
    hookEvent: "PreToolUse",
  }),
});
var isHookStoppedMessage = ({ message }) =>
  message.type === "attachment" && message.attachment.type === "hook_stopped_continuation";
//@ chunk-5xgkngpb.js:3872227-3872409 placement
function findToolResultBlock({ message }, toolUseId) {
  if (message.type !== "user" || typeof message.message.content === "string") return;
  for (let block of message.message.content)
    if (block.type === "tool_result" && block.tool_use_id === toolUseId) return block;
  return;
}
//@ chunk-5xgkngpb.js:3872409-3872490 placement
/**
 * 取某工具调用在消息里的耗时。
 */
var toolDurationMsOf = (made, toolUseId) =>
  made?.messages.find((message) => findToolResultBlock(message, toolUseId) !== undefined)?.toolDuration
    ?.durationMs;
//@ chunk-5xgkngpb.js:3872490-3872602 placement
var buildToolUseErrorBlock = (toolUseId, message) => ({
  type: "tool_result",
  content: `<tool_use_error>${message}</tool_use_error>`,
  is_error: true,
  tool_use_id: toolUseId,
});
//@ chunk-5xgkngpb.js:3872602-3872704 placement
var isRunUnchanged = (hookResult, made) =>
  hookResult.deny === undefined &&
  (hookResult.result === undefined ||
    hookResult.result === made.result ||
    stableStringifySafe(hookResult.result) === stableStringifySafe(made.result));
//@ chunk-5xgkngpb.js:3872704-3872771 placement
/**
 * 该工具调用有结果且不是错误。
 */
function ranWithoutError(message, toolUseId) {
  let toolResultBlock = findToolResultBlock(message, toolUseId);
  return toolResultBlock !== undefined && toolResultBlock.is_error !== true;
}
//@ chunk-5xgkngpb.js:3872771-3872833 placement
/**
 * 已存在结果块时先移除该结果再返回消息。
 */
function stripToolResultBlock(result, toolUseId) {
  if (findToolResultBlock(result, toolUseId) !== undefined) markWithheldResult(result.message);
  return result;
}
//@ chunk-5xgkngpb.js:3872833-3873080 placement
var rebuildResultMessage = (message, content, mapContent) => ({
  content: content.map(mapContent),
  imagePasteIds: message.imagePasteIds,
  mcpMeta: message.mcpMeta,
  toolEndsTurn: message.toolEndsTurn,
  sandboxViolations: message.sandboxViolations,
  sandboxed: message.sandboxed,
  permissionDecision: message.toolDenialKind === undefined ? message.permissionDecision : undefined,
});
//@ chunk-5xgkngpb.js:3873080-3873310 placement
/**
 * 在消息列表中找到本次调用的结果消息，把其 tool_result 替换为新块（保留其他元数据）；找不到时只返回新块。
 */
function replaceToolResult(messages, toolUseId, newBlock) {
  let message = messages.find((message) => findToolResultBlock(message, toolUseId) !== undefined)?.message;
  if (message?.type !== "user")
    return {
      content: [newBlock],
    };
  let content = message.message.content;
  return typeof content === "string"
    ? {
        content: [newBlock],
      }
    : rebuildResultMessage(message, content, (block) =>
        block.type === "tool_result" && block.tool_use_id === toolUseId ? newBlock : block,
      );
}
//@ chunk-5xgkngpb.js:3873440-3873554 placement
function findToolUseResult(messages) {
  for (let { message } of messages)
    if (message.type === "user" && message.toolUseResult !== undefined) return message.toolUseResult;
  return;
}
//@ chunk-5xgkngpb.js:3873554-3873643 placement
/**
 * 从消息列表里去掉该工具的结果块。
 */
function withoutToolResultBlock(messages, toolUseId) {
  let index = messages.findIndex((message) => findToolResultBlock(message, toolUseId) !== undefined);
  return messages.filter((message, messageIndex) => messageIndex !== index);
}
//@ chunk-5xgkngpb.js:3873643-3874391 placement
/**
 * tool.call 链中的核心环节：检查拒绝，转发中止信号，运行工具并记录本次运行（结果、命令解读、只读标记）；抛错时记录到状态。
 */
var createCoreToolLink = ({ toolUseContext, runs, state, run, refuse, isMcpTool }) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(call, { signal }) {
    let input = toolInputOf(call);
    let refusal = refuse?.(input);
    if (refusal !== undefined)
      return {
        deny: refusal,
      };
    let abortController = new AbortController();
    abortController.signal.addEventListener(
      "abort",
      () => {
        if (!signal.aborted) toolUseContext.abortController.abort(abortController.signal.reason);
      },
      {
        once: true,
      },
    );
    let releaseAbort = forwardAbort(signal, abortController);
    let hooks = {
      onToolEntered: () => {
        state.toolEntered = true;
      },
    };
    let requestMeta = isMcpTool ? stringRequestMeta(call.requestMeta) : undefined;
    try {
      let messages = await run(
        input,
        {
          ...toolUseContext,
          abortController,
          managedPass: state.managedPass,
          ...(requestMeta && {
            mcpRequestMeta: {
              ...toolUseContext.mcpRequestMeta,
              ...requestMeta,
            },
          }),
        },
        hooks,
      );
      let result = hooks.output ? hooks.output.value : findToolUseResult(messages);
      return {
        ref: runs.keep(input, {
          messages,
          result,
        }),
        result,
        ...interpretCommandResult_2(messages, call.tool_use_id),
        ...(hooks.isReadOnly && {
          isReadOnly: hooks.isReadOnly,
        }),
      };
    } catch (error) {
      state.thrown = {
        error,
      };
      throw error;
    } finally {
      releaseAbort();
    }
  },
});
//@ chunk-5xgkngpb.js:3874391-3874499 placement
var makeErrorResultAppender =
  (toolUseId, prefixMessages, messageOrigin) =>
  (errorText, extraFields, makeBlock = buildToolUseErrorBlock) => [
    ...prefixMessages,
    {
      message: createUserMessage({
        content: [makeBlock(toolUseId, errorText)],
        toolUseResult: `Error: ${errorText}`,
        ...extraFields,
        ...messageOrigin,
      }),
    },
  ];
//@ chunk-5xgkngpb.js:3874499-3874621 placement
var createChainState = () => ({
  thrown: undefined,
  managedPass: undefined,
  managedRan: false,
  managedChangedInPlace: false,
  managedMade: undefined,
  toolEntered: false,
});
//@ chunk-5xgkngpb.js:3874621-3874647 placement
/**
 * 是否为 bare fork 且未关闭设置钩子（决定是否运行托管钩子）。
 */
var shouldRunManagedLink = (keepForSubagents, managedRan, runKept) =>
  keepForSubagents || (managedRan && !runKept);
//@ chunk-5xgkngpb.js:3874647-3874744 placement
/**
 * 子代理里是否保留工具结果。
 */
var shouldKeepToolResultInSubagents = (toolUseContext, tool) =>
  !toolUseContext.agentId ||
  toolUseContext.preserveToolUseResults === true ||
  tool.preserveToolUseResultInSubagents === true;
//@ chunk-5xgkngpb.js:3874744-3874792 placement
var POST_TOOL_HOOK_STOPPED_MESSAGE = "Execution stopped by PostToolUse hook";
//@ chunk-5xgkngpb.js:3874792-3874839 placement
/**
 * 是否运行托管工具钩子（非会话结束工具且未 bare fork/未关设置钩子）。
 */
function shouldRunManagedToolHooks(tool, bareFork, settingsHooksOff = undefined) {
  return !isConversationEndTool(tool) && !bareFork && !settingsHooksOff;
}
//@ chunk-5xgkngpb.js:3874839-3875629 placement
/**
 * tool.call 链中的托管钩子环节：只运行托管的 PreToolUse 钩子，拒绝或账号记忆改写违规时返回 deny，否则记录托管放行信息并以（可能改写后的）输入继续调用下一环。
 */
var createManagedHookLink = (tool, context, state) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(input, next) {
    if (!shouldRunManagedToolHooks(tool, context.options.bareFork, context.options.settingsHooksOff))
      return next(input);
    let inputKey = stableStringifySafe(toolInputOf(input));
    let hookPass = await collectPreToolHookPass(
      executePreToolHooks(
        input.tool,
        input.tool_use_id,
        toolInputOf(input),
        context,
        getToolPermissionContext(context).mode,
        next.signal,
        undefined,
        {
          managedHooksOnly: true,
        },
      ),
      input.tool,
    );
    state.managedMade = hookPass;
    state.managedChangedInPlace =
      hookPass.result.updatedInput === undefined && stableStringifySafe(toolInputOf(input)) !== inputKey;
    let { deny, updatedInput, ...rest } = hookPass.result;
    if (deny !== undefined)
      return {
        deny,
      };
    if (shouldReplaceMemoryInput(tool, toolInputOf(input), updatedInput))
      return {
        deny: guardAccountMemoryHookRewrite(tool, "PreToolUse", "policySettings").message,
      };
    let effectiveInput = updatedInput ?? toolInputOf(input);
    let inputKeyCache;
    state.managedRan = true;
    state.managedPass = {
      toolUseId: input.tool_use_id,
      input: effectiveInput,
      inputKey: () => (inputKeyCache ??= stableStringifySafe(effectiveInput)),
      pass: {
        result: rest,
        yields: hookPass.yields,
        ...(hookPass.rewrites !== undefined && {
          rewrites: hookPass.rewrites,
        }),
      },
    };
    try {
      return await next(
        updatedInput
          ? withRequestMeta(
              withAgentId(toolCallEvent(input.tool, input.tool_use_id, updatedInput), input.agentId),
              input.requestMeta,
            )
          : input,
      );
    } finally {
      state.managedPass = undefined;
    }
  },
});
//@ chunk-5xgkngpb.js:3875629-3875723 placement
/**
 * 按对象键排序后序列化，便于稳定比较。
 */
var sortedJson = (attachment) =>
  jsonStringify(
    Object.fromEntries(
      Object.entries(attachment).toSorted(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
    ),
  );
//@ chunk-5xgkngpb.js:3875723-3876732 placement
/**
 * 运行 PostToolUse 钩子；钩子改写账户记忆服务器结果时拒绝并警告。
 */
async function runPostToolUseHooksForMemory({ tool, toolUseID, input, output, toolUseContext, durationMs }) {
  let hookName = `PostToolUse:${tool.name}`;
  let messages = [];
  let output_2 = output;
  let rewritten = false;
  for await (let hookResult of executePostToolHooks(
    tool.name,
    toolUseID,
    input,
    output,
    toolUseContext,
    getToolPermissionContext(toolUseContext).mode,
    toolUseContext.abortController.signal,
    undefined,
    durationMs,
    {
      managedHooksOnly: true,
    },
  )) {
    let newOutput =
      hookResult.updatedToolOutput !== undefined || !isMcpTool(tool)
        ? hookResult.updatedToolOutput
        : hookResult.updatedMCPToolOutput;
    if (newOutput !== undefined)
      if (isLiveMemoryToolName(tool))
        logForDebugging(
          `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
          {
            level: "warn",
          },
        );
      else {
        output_2 = newOutput;
        rewritten = true;
      }
    if (hookResult.blockingError)
      messages.push({
        message: createAttachmentMessage_2({
          type: "hook_blocking_error",
          blockingError: hookResult.blockingError,
          hookName,
          toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
    if (hookResult.preventContinuation) {
      messages.push({
        message: createAttachmentMessage_2({
          type: "hook_stopped_continuation",
          message: hookResult.stopReason || POST_TOOL_HOOK_STOPPED_MESSAGE,
          hookName,
          toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
      break;
    }
    let { additionalContexts } = hookResult;
    if (additionalContexts !== undefined && additionalContexts.length > 0)
      messages.push({
        message: createAttachmentMessage_2({
          type: "hook_additional_context",
          content: additionalContexts,
          hookName,
          toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
  }
  return {
    output: output_2,
    rewritten,
    messages,
  };
}
//@ chunk-5xgkngpb.js:3876732-3876805 placement
/**
 * 过滤空串后的文本列表，全空返回 undefined。
 */
function nonEmptyTexts(output) {
  let filtered = output.filter((text) => text !== "");
  return filtered.length === 0 ? undefined : filtered;
}
//@ chunk-5xgkngpb.js:3876805-3877042 placement
function applyManagedContextRewrite(output, hookResult) {
  if (!hookResult.rewritten) return output;
  if (typeof hookResult.output === "string") return nonEmptyTexts([hookResult.output]);
  if (isStringListValue(hookResult.output)) return nonEmptyTexts(hookResult.output);
  logForDebugging(
    "tool.call: the managed rewrite of a context is neither a text nor a list of texts; dropped",
  );
  return;
}
//@ chunk-5xgkngpb.js:3877042-3877550 placement
/**
 * 运行记忆相关的 PostToolUse 钩子，在未被阻止时附上托管改写后的上下文，并去掉与已有附件重复的消息。
 */
async function runToolCallPostHooks(output, callInfo, priorMessages) {
  let hookResult = await runPostToolUseHooksForMemory({
    ...callInfo,
    output,
  });
  let contextTexts = [...priorMessages, ...hookResult.messages].some(
    (entry) =>
      entry.message.type === "attachment" && entry.message.attachment.type === "hook_stopped_continuation",
  )
    ? undefined
    : applyManagedContextRewrite(output, hookResult);
  let hasContext = contextTexts !== undefined && contextTexts.length > 0;
  let storedContext = hasContext
    ? await capAdditionalContext(contextTexts, "tool.call", callInfo.toolUseContext.storageV5)
    : [];
  let existingKeys = new Set(
    priorMessages.flatMap((entry) => {
      let message = entry.message;
      return message.type === "attachment" ? [sortedJson(message.attachment)] : [];
    }),
  );
  return [
    ...(hasContext ? [buildToolCallContextMessage(storedContext, callInfo.toolUseID)] : []),
    ...hookResult.messages.filter(
      (message) =>
        !(message.message.type === "attachment" && existingKeys.has(sortedJson(message.message.attachment))),
    ),
  ];
}
//@ chunk-5xgkngpb.js:3877550-3877749 placement
function findRunInputForResult(hookResult, toolCallChain, input) {
  let currentInput = toolInputOf(input);
  let resultKey = stableStringifySafe(hookResult.result);
  let inputKey = stableStringifySafe(currentInput);
  return (
    toolCallChain.runs.last(
      (run) =>
        stableStringifySafe(run.made.result) === resultKey && stableStringifySafe(run.input) === inputKey,
    )?.input ??
    toolCallChain.runs.last((run) => stableStringifySafe(run.made.result) === resultKey)?.input ??
    toolCallChain.runs.last()?.input ??
    currentInput
  );
}
//@ chunk-5xgkngpb.js:3877749-3877909 placement
function dropBlockingErrors(messages) {
  let kept = [];
  for (let { message } of messages)
    if (
      message !== undefined &&
      !(message.type === "attachment" && message.attachment.type === "hook_blocking_error")
    )
      kept.push({
        message,
      });
  return kept;
}
//@ chunk-5xgkngpb.js:3877909-3878574 placement
/**
 * 组装 tool.call 钩子链：核心与托管环节、运行记录，以及查询抛错、托管是否运行、工具是否已进入、托管改写、未送达产出等的访问器。
 */
function createToolCallChain(tool, context, run, refuse) {
  let runs = createStepRecorder();
  let state = createChainState();
  let core = createCoreToolLink({
    toolUseContext: context,
    runs,
    state,
    run,
    refuse,
    isMcpTool: tool.mcpInfo !== undefined,
  });
  let managed = createManagedHookLink(tool, context, state);
  return {
    core,
    managed,
    runs,
    thrown: () => state.thrown,
    managedRan: () => state.managedRan,
    toolEntered: () => state.toolEntered,
    managedRewrites: () => {
      let managedMade = state.managedMade;
      if (managedMade === undefined) return [];
      if (managedMade.result.updatedInput === undefined)
        return state.managedChangedInPlace
          ? [
              {
                kind: "remote",
                source: "policySettings",
              },
            ]
          : [];
      let rewrites = managedMade.rewrites ?? [];
      return rewrites.length > 0
        ? rewrites
        : [
            {
              kind: "remote",
              source: "policySettings",
            },
          ];
    },
    managedLeft: () => state.managedMade?.result.updatedInput,
    undelivered: () => {
      let managedMade = state.managedMade;
      return managedMade !== undefined && runs.last() === undefined && state.thrown === undefined
        ? managedMade.yields
        : [];
    },
  };
}
//@ chunk-5xgkngpb.js:3878574-3878618 placement
/**
 * 未被拦下且托管改写可用时应用改写。
 */
var shouldApplyManagedRewrite = (tool, hookResult, runKept) =>
  !runKept && hookResult.deny === undefined && isLiveMemoryToolName(tool);
//@ chunk-5xgkngpb.js:3984438-3984746 affinity
var PRE_TOOL_HOOK_TIMEOUT_MESSAGE =
  "PreToolUse hook did not respond before its timeout (host client may be unreachable). The tool call was not executed; other configured hooks may not have completed.";
var PRE_TOOL_HOOK_ERROR_MESSAGE =
  "PreToolUse hook failed with an unexpected error. The tool call was not executed; other configured hooks may not have completed.";
//@ chunk-5xgkngpb.js:3984746-3987400 fingerprint (2.1.88 match: runPostToolUseHooks, 0.68)
/**
 * runPostToolUseHooks：工具成功后执行 PostToolUse hooks，产出 hook 消息、附加上下文、阻止继续，支持 hook 改写 MCP 工具输出（updatedMCPToolOutput）。
 */
async function* runPostToolUseHooks(
  toolUseContext,
  tool,
  toolUseID,
  messageId,
  toolInput,
  toolResponse,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  toolDurationMs,
  options,
) {
  if (
    !shouldRunManagedToolHooks(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)
  )
    return;
  let postToolStartTime = Date.now();
  try {
    let permissionMode = getToolPermissionContext(toolUseContext).mode;
    for await (let result of executePostToolHooks(
      tool.name,
      toolUseID,
      toolInput,
      toolResponse,
      toolUseContext,
      permissionMode,
      toolUseContext.abortController.signal,
      undefined,
      toolDurationMs,
      options,
    ))
      try {
        if (result.message?.type === "attachment" && result.message.attachment.type === "hook_cancelled") {
          logEvent("tengu_post_tool_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
            }),
          };
          continue;
        }
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield {
            message: result.message,
          };
        if (result.blockingError)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_blocking_error",
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
              blockingError: result.blockingError,
            }),
          };
        let isLiveMemoryTool = isLiveMemoryToolName(tool);
        if (
          isLiveMemoryTool &&
          (result.updatedToolOutput !== undefined || result.updatedMCPToolOutput !== undefined)
        )
          logForDebugging(
            `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
            {
              level: "warn",
            },
          );
        if (result.updatedToolOutput !== undefined && !isLiveMemoryTool)
          yield {
            updatedToolOutput: result.updatedToolOutput,
          };
        if (result.updatedMCPToolOutput !== undefined && isMcpTool(tool) && !isLiveMemoryTool)
          yield {
            updatedToolOutput: result.updatedMCPToolOutput,
          };
        if (result.preventContinuation) {
          yield {
            message: createAttachmentMessage_2({
              type: "hook_stopped_continuation",
              message: result.stopReason || POST_TOOL_HOOK_STOPPED_MESSAGE,
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
            }),
          };
          return;
        }
        if (result.additionalContexts && result.additionalContexts.length > 0)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_additional_context",
              content: result.additionalContexts,
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
            }),
          };
        if (result.classifierContexts && result.classifierContexts.length > 0) {
          let pairing =
            result.pairedRewrite === "none"
              ? "none"
              : result.pairedRewrite === "direct" ||
                  (result.pairedRewrite === "legacy_mcp" && isMcpTool(tool))
                ? "pending"
                : "never-applied";
          for (let classifierContext of result.classifierContexts)
            yield {
              classifierContext,
              pairing,
            };
        }
      } catch (error) {
        let postToolDurationMs = Date.now() - postToolStartTime;
        logEvent("tengu_post_tool_hook_error", {
          messageID: sanitizeMarkName(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? false,
          duration: postToolDurationMs,
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && {
            mcpServerType: fromEnum(mcpServerType),
          }),
          ...(requestId && {
            requestId: sanitizeMarkName(requestId),
          }),
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_error_during_execution",
            content: formatToolErrorMessage(error),
            hookName: `PostToolUse:${tool.name}`,
            toolUseID,
            hookEvent: "PostToolUse",
          }),
        };
      }
  } catch (error) {
    if (isAbortError(error)) {
      if (toolUseContext.abortController.signal.aborted) throw error;
      if (error instanceof StreamClosedAbortError) {
        logForDebugging("PostToolUse hook cancelled (control stream closed)");
        return;
      }
      logForDebugging("PostToolUse hook timed out (per-hook abort)");
      logEvent("tengu_sdk_hook_callback_timeout", {
        hookEvent: lit_2("PostToolUse"),
        toolName: sanitizeToolNameForAnalytics(tool.name),
      });
      return;
    }
    logError(withTelemetryMessage(toError(error), "PostToolUse hook dispatch failed"));
  }
}
//@ chunk-5xgkngpb.js:3987400-3989357 fingerprint (2.1.88 match: runPostToolUseFailureHooks, 0.802)
/**
 * runPostToolUseFailureHooks：工具失败（含中断）后执行 PostToolUseFailure hooks，产出 hook 消息与附加上下文。
 */
async function* runPostToolUseFailureHooks(
  toolUseContext,
  tool,
  toolUseID,
  messageId,
  toolInput,
  error,
  isInterrupt,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  toolDurationMs,
) {
  if (
    !shouldRunManagedToolHooks(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)
  )
    return;
  let postToolStartTime = Date.now();
  try {
    let permissionMode = getToolPermissionContext(toolUseContext).mode;
    for await (let result of executePostToolUseFailureHooks(
      tool.name,
      toolUseID,
      toolInput,
      error,
      toolUseContext,
      isInterrupt,
      permissionMode,
      toolUseContext.abortController.signal,
      undefined,
      toolDurationMs,
    ))
      try {
        if (result.message?.type === "attachment" && result.message.attachment.type === "hook_cancelled") {
          logEvent("tengu_post_tool_failure_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: `PostToolUseFailure:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUseFailure",
            }),
          };
          continue;
        }
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield {
            message: result.message,
          };
        if (result.blockingError)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_blocking_error",
              hookName: `PostToolUseFailure:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUseFailure",
              blockingError: result.blockingError,
            }),
          };
        if (result.additionalContexts && result.additionalContexts.length > 0)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_additional_context",
              content: result.additionalContexts,
              hookName: `PostToolUseFailure:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUseFailure",
            }),
          };
      } catch (hookError) {
        let postToolDurationMs = Date.now() - postToolStartTime;
        logEvent("tengu_post_tool_failure_hook_error", {
          messageID: sanitizeMarkName(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? false,
          duration: postToolDurationMs,
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && {
            mcpServerType: fromEnum(mcpServerType),
          }),
          ...(requestId && {
            requestId: sanitizeMarkName(requestId),
          }),
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_error_during_execution",
            content: formatToolErrorMessage(hookError),
            hookName: `PostToolUseFailure:${tool.name}`,
            toolUseID,
            hookEvent: "PostToolUseFailure",
          }),
        };
      }
  } catch (outerError) {
    if (isAbortError(outerError)) {
      if (toolUseContext.abortController.signal.aborted)
        logForDebugging("PostToolUseFailure hook cancelled (parent abort)");
      else if (outerError instanceof StreamClosedAbortError)
        logForDebugging("PostToolUseFailure hook cancelled (control stream closed)");
      else {
        logForDebugging("PostToolUseFailure hook timed out (per-hook abort)");
        logEvent("tengu_sdk_hook_callback_timeout", {
          hookEvent: lit_2("PostToolUseFailure"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
        });
      }
      return;
    }
    logError(withTelemetryMessage(toError(outerError), "PostToolUseFailure hook dispatch failed"));
  }
}
//@ chunk-5xgkngpb.js:3989357-3989663 layout
/**
 * 在 resolveHookPermissionDecision 之后再加一道：工具被限定运行位置（_M）而 allow 没有经过对应确认时改判为拒绝。
 */
async function resolvePermissionDecisionForCall(
  hookPermissionResult,
  tool,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  toolUseID,
) {
  let hookPermissionDecision = await resolveHookPermissionDecision(
    hookPermissionResult,
    tool,
    input,
    toolUseContext,
    canUseTool,
    assistantMessage,
    toolUseID,
  );
  if (
    classifierOnlyConfig(tool) !== undefined &&
    hookPermissionDecision.decision.behavior === "allow" &&
    !isClassifierAllow(hookPermissionDecision.decision) &&
    getHookCaller(toolUseContext) === undefined
  ) {
    logForDebugging(
      `${tool.name} denied before call: ${describeNonClassifierAllow(hookPermissionDecision.decision)}`,
      {
        level: "warn",
      },
    );
    toolUseContext.toolDecisions.delete(toolUseID);
    return {
      decision: buildClassifierOnlyDenial(tool, describeNonClassifierAllow(hookPermissionDecision.decision)),
      input: hookPermissionDecision.input,
    };
  }
  return hookPermissionDecision;
}
//@ chunk-5xgkngpb.js:3989663-3989757 layout
/**
 * 取 hook 权限结论里的 updatedInput（allow/ask 才有），否则用原输入。
 */
function getHookUpdatedInput(hookPermissionResult, input) {
  return (
    (hookPermissionResult?.behavior === "allow" || hookPermissionResult?.behavior === "ask"
      ? hookPermissionResult.updatedInput
      : undefined) ?? input
  );
}
//@ chunk-5xgkngpb.js:3989757-3992634 fingerprint (2.1.88 match: resolveHookPermissionDecision, 0.411)
/**
 * resolveHookPermissionDecision：把 PreToolUse hook 的权限结论与正常权限流程合并。hook allow 仍要过 deny/ask 规则；hook ask 或无结论走 canUseTool；返回最终决策与（可能被改写的）输入。
 */
async function resolveHookPermissionDecision(
  hookPermissionResult,
  tool,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  toolUseID,
) {
  if (isConversationEndTool(tool))
    return {
      decision: {
        behavior: "allow",
        updatedInput: input,
      },
      input,
    };
  let settingsDenial = settingsProblemDenial();
  if (settingsDenial !== null)
    return {
      decision: settingsDenial,
      input,
    };
  let requireCanUseTool = toolUseContext.requireCanUseTool;
  if (hookPermissionResult?.behavior === "deny") {
    logForDebugging(`Hook denied tool use for ${tool.name}`);
    return runPermissionPipeline(hookPermissionResult, {
      tool,
      input,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolUseID,
    });
  }
  if (hookPermissionResult?.behavior !== "allow" && hookPermissionResult?.behavior !== "ask")
    return {
      decision: await canUseTool(tool, input, toolUseContext, assistantMessage, toolUseID),
      input,
    };
  let behavior = hookPermissionResult.behavior;
  let mode = getHookUpdatedInput(hookPermissionResult, input);
  let displayDroppedResult =
    hookPermissionResult.behavior === "ask"
      ? dropStaleHostDisplay(hookPermissionResult, mode)
      : hookPermissionResult;
  let hostWordedResult =
    displayDroppedResult.behavior === "ask" && displayDroppedResult.hostDisplay !== undefined
      ? displayDroppedResult
      : undefined;
  let reservedKeyDenial = reservedKeyDenialIfPresent(mode);
  if (reservedKeyDenial !== null)
    return {
      decision: reservedKeyDenial,
      input: mode,
    };
  let ruleDecision =
    (await checkRuleBasedPermissions(
      tool,
      mode,
      {
        ...toolUseContext,
        toolUseId: toolUseID,
      },
      {
        hookUpdatedInput: hookPermissionResult.updatedInput,
        planModeWriteFloor: behavior === "allow",
        hookAsked: behavior === "ask",
        ...(hostWordedResult !== undefined && {
          crashIsObjection: true,
        }),
      },
    )) ??
    (await checkRuleBasedPermissionsOnToolHost(tool, mode, toolUseContext, assistantMessage, toolUseID));
  if (ruleDecision?.behavior === "deny") {
    logForDebugging(
      `Hook returned '${behavior}' for ${tool.name}, but deny rule overrides (deny's reason type: ${ruleDecision.decisionReason?.type ?? "none"})`,
    );
    return runPermissionPipeline(appendRuleAnnotation(ruleDecision), {
      tool,
      input: mode,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolUseID,
    });
  }
  if (ruleDecision?.behavior === "ask" && hostWordedResult !== undefined) {
    logFeatureBad("permission_host_worded_ask", "pipeline_also_asks");
    return {
      decision: forwardHostWordedAsk(tool.name, "the plain permission prompt raised for this call", {
        hostWorded: true,
      }),
      input: mode,
    };
  }
  if (ruleDecision?.behavior === "ask") {
    let hookAsked = behavior === "ask";
    logForDebugging(
      `Hook returned '${behavior}' for ${tool.name}, but an ask rule, a safety check, a ToolHost's person-only ask or plan mode requires the full permission pipeline${hookAsked ? " (hookAskFloor \u2014 a classifier allow re-surfaces as this ask)" : ""}`,
    );
    return {
      decision: await canUseTool(
        tool,
        mode,
        hookAsked
          ? {
              ...toolUseContext,
              hookAskFloor: true,
            }
          : toolUseContext,
        assistantMessage,
        toolUseID,
      ),
      input: mode,
    };
  }
  if (behavior === "allow") {
    if (requireCanUseTool) {
      logForDebugging(`Hook approved tool use for ${tool.name}, but canUseTool is required`);
      return {
        decision: await canUseTool(tool, mode, toolUseContext, assistantMessage, toolUseID),
        input: mode,
      };
    }
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let autoAllowance = isAutoAllowedInMode(tool, toolPermissionContext);
    let needsClassifier = isAutoClassifierActive(autoAllowance) && requiresClassifierForHookAllow(tool);
    let isAutoModeFunnel =
      !needsClassifier &&
      autoAllowance === "auto" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_knuth", false);
    let isRemoteSessionMcp =
      !needsClassifier && !isAutoModeFunnel && isClassifierRoutedMcpTool(tool, toolPermissionContext);
    let isCoworkWeb =
      !needsClassifier && !isAutoModeFunnel && isWebToolClassifierRouted(tool, toolPermissionContext);
    let isRemoteBrowser =
      !needsClassifier &&
      !isAutoModeFunnel &&
      !isRemoteSessionMcp &&
      !isCoworkWeb &&
      isRemoteBrowserToolUnderModeFloor(tool);
    if (
      !tool.requiresUserInteraction?.() &&
      (needsClassifier || isAutoModeFunnel || isRemoteSessionMcp || isCoworkWeb || isRemoteBrowser)
    ) {
      let decisionReason =
        hookPermissionResult.decisionReason?.type === "hook"
          ? hookPermissionResult.decisionReason
          : undefined;
      let shouldFunnel = !isRemoteBrowser || isAutoClassifierActive(autoAllowance);
      if (shouldFunnel)
        logEvent("tengu_auto_mode_hook_allow_funneled", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? false,
          remoteSessionMcp: isRemoteSessionMcp,
          coworkWeb: isCoworkWeb,
          hookSource: fromEnumOpt(hookSourceKind(decisionReason?.hookSource)),
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          toolUseId: sanitizeMarkName(toolUseID),
        });
      logForDebugging(
        shouldFunnel
          ? `Hook approved tool use for ${tool.name}, but auto mode requires classifier adjudication`
          : `Hook approved tool use for ${tool.name}, but a hook cannot approve a call to CCR's cloud browser; the normal permission check decides`,
      );
      return {
        decision: await canUseTool(
          tool,
          mode,
          {
            ...toolUseContext,
            hookAllowVouched: true,
          },
          assistantMessage,
          toolUseID,
        ),
        input: mode,
      };
    }
    logForDebugging(
      tool.requiresUserInteraction?.()
        ? `Hook satisfied user interaction for ${tool.name} via updatedInput`
        : `Hook approved tool use for ${tool.name}, bypassing permission prompt`,
    );
    countMcpPolicyRecheckSkipped("preToolUseHook", tool, mode, toolUseContext, assistantMessage, toolUseID);
    return runPermissionPipeline(hookPermissionResult, {
      tool,
      input: mode,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolUseID,
    });
  }
  return runPermissionPipeline(displayDroppedResult, {
    tool,
    input: mode,
    toolUseContext,
    canUseTool,
    assistantMessage,
    toolUseID,
  });
}
//@ chunk-5xgkngpb.js:3992634-3993580 layout
/**
 * 权限评估管线：先规则/模式评估（aWr），再分类器/后处理（nWr）；有输入级硬拒绝直接返回；allow 但上下文要求 requireCanUseTool、或结论为 ask 时调用 canUseTool（必要时禁止"总是允许"）。
 */
async function runPermissionPipeline(decision, request) {
  let checkedDecision = await decideWithToolCheckHooks(
    {
      tool: request.tool,
      input: request.input,
      context: request.toolUseContext,
      toolUseID: request.toolUseID,
      evaluate: () => Promise.resolve(decision),
    },
    request.assistantMessage.message.id,
  );
  let finalDecision = await personAskAfterHooks(
    enforceClassifierOnlyDecision(
      request.tool,
      decision.behavior === "ask" && decision.hostDisplay !== undefined && checkedDecision.behavior !== "deny"
        ? decision
        : checkedDecision,
      getHookCaller(request.toolUseContext) !== undefined,
    ),
    {
      tool: request.tool,
      input: request.input,
      context: request.toolUseContext,
      toolUseID: request.toolUseID,
    },
  );
  let reservedKeyDenial =
    finalDecision.behavior === "deny" ? null : reservedKeyDenialIfPresent(request.input);
  if (reservedKeyDenial !== null)
    return {
      decision: reservedKeyDenial,
      input: request.input,
    };
  if (finalDecision.behavior === "allow" && request.toolUseContext.requireCanUseTool === true)
    return {
      decision: await request.canUseTool(
        request.tool,
        request.input,
        request.toolUseContext,
        request.assistantMessage,
        request.toolUseID,
      ),
      input: request.input,
    };
  if (finalDecision.behavior !== "ask")
    return {
      decision: finalDecision,
      input: request.input,
    };
  return {
    decision: await request.canUseTool(
      request.tool,
      request.input,
      request.toolUseContext,
      request.assistantMessage,
      request.toolUseID,
      mcpAskVetoesStandingGrant(
        request.tool,
        request.input,
        request.toolUseContext,
        request.assistantMessage,
        request.toolUseID,
      ) || isWebSearchClassifierRouted(request.tool, getToolPermissionContext(request.toolUseContext))
        ? {
            ...finalDecision,
            suppressAlwaysAllowRule: true,
          }
        : finalDecision,
    ),
    input: request.input,
  };
}
//@ chunk-5xgkngpb.js:3993580-3998769 fingerprint (2.1.88 match: runPreToolUseHooks, 0.722)
/**
 * runPreToolUseHooks：执行 PreToolUse hooks。产出 message、hookPermissionResult（allow/deny/ask/defer）、hookUpdatedInput（改写后再过 validateInput）、preventContinuation/stopReason、additionalContext、stop；hook 超时或异常时视为阻止执行并给出固定文案。
 */
async function* runPreToolUseHooks(
  toolUseContext,
  tool,
  toolInput,
  toolUseID,
  messageId,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  validateInput = (hookInput) =>
    tool.validateInput?.(hookInput, {
      ...toolUseContext,
      toolUseId: toolUseID,
    }),
) {
  if (
    !shouldRunManagedToolHooks(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)
  )
    return;
  let hookStartTime = Date.now();
  let deferredSource;
  let denyResult;
  let strictestHookAnswer;
  let guardedAnswer;
  function isRemoteCall() {
    return toolUseContext.remoteCall !== undefined || getRemoteHookRunner(toolUseContext) !== undefined;
  }
  let askResult;
  let stopReason;
  let hookExtra = {};
  try {
    for await (let result of executePreToolHooks(
      tool.name,
      toolUseID,
      toolInput,
      toolUseContext,
      getToolPermissionContext(toolUseContext).mode,
      toolUseContext.abortController.signal,
      undefined,
      undefined,
      hookExtra,
    ))
      try {
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield {
            type: "message",
            message: {
              message: result.message,
            },
          };
        if (result.blockingError) {
          let denialMessage = getPreToolHookBlockingMessage(`PreToolUse:${tool.name}`, result.blockingError);
          if (!(result.blockingError.hookDidNotFinish && denyResult?.behavior === "deny"))
            denyResult = {
              behavior: "deny",
              message: denialMessage,
              decisionReason: {
                type: "hook",
                hookName: `PreToolUse:${tool.name}`,
                reason: denialMessage,
                ...(result.blockingError.hookDidNotFinish && {
                  hookDidNotFinish: true,
                }),
              },
            };
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: denyResult,
          };
        }
        let updatedInput = result.updatedInput;
        if (updatedInput !== undefined) {
          let validation = await validateHookUpdatedInput(tool, updatedInput, {
            event: "PreToolUse",
            source: result.hookSource,
            applies: result.permissionBehavior !== "deny" && result.permissionBehavior !== "defer",
            validate: validateInput,
          }).catch((error) => {
            if (isAbortError(error) && toolUseContext.abortController.signal.aborted) return "cancelled";
            throw error;
          });
          if (validation === "cancelled") {
            yield {
              type: "stop",
            };
            return;
          }
          if (!validation.ok) {
            denyResult = validation.deny;
            guardedAnswer = validation.deny;
            if (toolUseContext.remoteCall !== undefined)
              setStrictestHookAnswer(toolUseContext.remoteCall, validation.deny);
            yield {
              type: "hookPermissionResult",
              hookPermissionResult: denyResult,
            };
            continue;
          }
          updatedInput = validation.input;
          yield {
            type: "hookRewriterKind",
            kind: result.rewriterKind ?? "remote",
            source: result.rewriteSource ?? result.hookSource,
          };
        }
        let isMemoryRewrite =
          result.permissionBehavior !== "deny" &&
          shouldReplaceMemoryInput(tool, toolInput, result.updatedInput);
        if (isMemoryRewrite) {
          strictestHookAnswer = guardAccountMemoryHookRewrite(tool, "PreToolUse", result.hookSource);
          denyResult = strictestHookAnswer;
          if (toolUseContext.remoteCall !== undefined)
            setStrictestHookAnswer(toolUseContext.remoteCall, strictestHookAnswer);
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: denyResult,
          };
        }
        if (result.preventContinuation) {
          yield {
            type: "preventContinuation",
            shouldPreventContinuation: true,
          };
          if (result.stopReason) {
            stopReason = result.stopReason;
            yield {
              type: "stopReason",
              stopReason: result.stopReason,
            };
          }
        }
        if (isMemoryRewrite) continue;
        if (result.permissionBehavior !== undefined) {
          logForDebugging(`Hook result has permissionBehavior=${result.permissionBehavior}`);
          if (result.permissionBehavior === "defer") {
            deferredSource = result.hookSource || `PreToolUse:${tool.name}`;
            continue;
          }
          let decisionReason = {
            type: "hook",
            hookName: `PreToolUse:${tool.name}`,
            hookSource: result.hookSource,
            hookPluginId: result.hookPluginId,
            reason: result.hookPermissionDecisionReason,
            ...(result.heldForServedCall && {
              heldForServedCall: true,
            }),
          };
          if (result.permissionBehavior === "allow")
            yield {
              type: "hookPermissionResult",
              hookPermissionResult:
                isRemoteCall() && (denyResult ?? askResult) !== undefined
                  ? (denyResult ?? askResult)
                  : (guardedAnswer ?? {
                      behavior: "allow",
                      updatedInput,
                      decisionReason,
                    }),
            };
          else if (result.permissionBehavior === "ask") {
            let isFirstAsk = askResult === undefined;
            askResult = {
              behavior: "ask",
              updatedInput,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason,
              ...(isFirstAsk &&
                result.permissionDisplay && {
                  hostDisplay: result.permissionDisplay,
                  hostDisplayInput: updatedInput ?? toolInput,
                  suppressAlwaysAllowRule: true,
                  defaultToNo: true,
                }),
            };
            yield {
              type: "hookPermissionResult",
              hookPermissionResult:
                isRemoteCall() && denyResult !== undefined ? denyResult : (guardedAnswer ?? askResult),
            };
          } else {
            let otherResult = {
              behavior: result.permissionBehavior,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason,
            };
            denyResult = otherResult;
            yield {
              type: "hookPermissionResult",
              hookPermissionResult: otherResult,
            };
          }
        }
        if (updatedInput && result.permissionBehavior === undefined)
          yield {
            type: "hookUpdatedInput",
            updatedInput,
          };
        if (result.additionalContexts && result.additionalContexts.length > 0)
          yield {
            type: "additionalContext",
            message: {
              message: createAttachmentMessage_2({
                type: "hook_additional_context",
                content: result.additionalContexts,
                hookName: `PreToolUse:${tool.name}`,
                toolUseID,
                hookEvent: "PreToolUse",
              }),
            },
          };
        if (toolUseContext.abortController.signal.aborted) {
          logEvent("tengu_pre_tool_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          });
          yield {
            type: "message",
            message: {
              message: createAttachmentMessage_2({
                type: "hook_cancelled",
                hookName: `PreToolUse:${tool.name}`,
                toolUseID,
                hookEvent: "PreToolUse",
              }),
            },
          };
          yield {
            type: "stop",
          };
          return;
        }
      } catch (error) {
        logError(error);
        let durationMs = Date.now() - hookStartTime;
        logEvent("tengu_pre_tool_hook_error", {
          messageID: sanitizeMarkName(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? false,
          duration: durationMs,
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && {
            mcpServerType: fromEnum(mcpServerType),
          }),
          ...(requestId && {
            requestId: sanitizeMarkName(requestId),
          }),
        });
        yield {
          type: "message",
          message: {
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              content: formatToolErrorMessage(error),
              hookName: `PreToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PreToolUse",
            }),
          },
        };
        if (denyResult) {
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: denyResult,
          };
          return;
        } else {
          if (deferredSource) {
            yield {
              type: "defer",
              hookName: deferredSource,
            };
            deferredSource = undefined;
          }
          yield {
            type: "stop",
            stopReason: stopReason ?? PRE_TOOL_HOOK_ERROR_MESSAGE,
          };
        }
      }
  } catch (error) {
    let deniedPrefix = hookExtra.deniedBefore
      ? `${hookExtra.deniedBefore}

`
      : "";
    if (isAbortError(error)) {
      if (toolUseContext.abortController.signal.aborted)
        logForDebugging("PreToolUse hook cancelled (parent abort)");
      else if (error instanceof StreamClosedAbortError)
        logForDebugging("PreToolUse hook cancelled (control stream closed)");
      else {
        logForDebugging("PreToolUse hook timed out (per-hook abort)");
        logEvent("tengu_sdk_hook_callback_timeout", {
          hookEvent: lit_2("PreToolUse"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
        });
        if (denyResult)
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: denyResult,
          };
        else {
          if (deferredSource)
            yield {
              type: "defer",
              hookName: deferredSource,
            };
          yield {
            type: "stop",
            stopReason: stopReason ?? deniedPrefix + PRE_TOOL_HOOK_TIMEOUT_MESSAGE,
          };
        }
        return;
      }
    } else {
      logError(withTelemetryMessage(toError(error), "PreToolUse hook dispatch failed"));
      if (denyResult)
        yield {
          type: "hookPermissionResult",
          hookPermissionResult: denyResult,
        };
      else {
        if (deferredSource)
          yield {
            type: "defer",
            hookName: deferredSource,
          };
        yield {
          type: "stop",
          stopReason: stopReason ?? deniedPrefix + PRE_TOOL_HOOK_ERROR_MESSAGE,
        };
      }
      return;
    }
    yield {
      type: "stop",
    };
    return;
  }
  if (deferredSource && !denyResult)
    yield {
      type: "defer",
      hookName: deferredSource,
    };
  if (strictestHookAnswer)
    yield {
      type: "hookPermissionResult",
      hookPermissionResult: strictestHookAnswer,
    };
}
export {
  isRunUnchanged,
  shouldApplyManagedRewrite,
  makeErrorResultAppender,
  dropBlockingErrors,
  shouldKeepToolResultInSubagents,
  shouldRunManagedLink,
  hookErrorToolResult,
  stripToolResultBlock,
  runPostToolUseHooksForMemory,
  toolDurationMsOf,
  ranWithoutError,
  withoutToolResultBlock,
  findToolResultBlock,
  replaceToolResult,
  isHookStoppedMessage,
  buildHookStoppedMessage,
  shouldRunManagedToolHooks,
  runToolCallPostHooks,
  findRunInputForResult,
  buildToolCallContextMessage,
  capAdditionalContext,
  createToolCallChain,
  runPreToolUseHooks,
  getHookUpdatedInput,
  resolvePermissionDecisionForCall,
  runPostToolUseHooks,
  runPostToolUseFailureHooks,
  buildToolUseErrorBlock,
};
