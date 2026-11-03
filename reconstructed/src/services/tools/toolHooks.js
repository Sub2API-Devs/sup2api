/**
 * services/tools/toolHooks.ts
 *
 * 工具相关 hook：PreToolUse（改输入、给权限结论、阻止继续、追加上下文）、PostToolUse、PostToolUseFailure，以及把 hook 权限结论并入正常权限流程的 resolveHookPermissionDecision
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolHooks.ts
 * pieces: chunk-e6aww6q8.js (37), chunk-s61vbvea.js (1)
 * attribution: placement 30, affinity 1, fingerprint 4, layout 3
 */
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
import {
  isStringListValue,
  EVENT_TOOL_SITE_NAMES,
  RESULT_TOKEN_BUDGET,
} from "../../plugins/functionHooks/sites/siteRules.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../analytics/safeMetadata.js";
import { formatToolErrorMessage } from "../../utils/toolErrors.js";
import { isAbortError, StreamClosedAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
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
import { MAX_PREVIEW_CHARS, truncateAdditionalContext } from "../remoteTools/backgroundCommands.js";

//@ chunk-e6aww6q8.js:3775878-3775973 placement
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
//@ chunk-e6aww6q8.js:3775973-3776348 placement
/**
 * 构造 tool.call 钩子的附加上下文消息、PreToolUse 阻止继续的消息，以及判断消息是否为阻止继续。
 */
var buildToolCallContextMessage = (e, n) => ({
  message: createAttachmentMessage_2({
    type: "hook_additional_context",
    content: [...e],
    hookName: "tool.call",
    toolUseID: `${n}-context`,
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
//@ chunk-e6aww6q8.js:3776348-3776530 placement
function findToolResultBlock({ message }, n) {
  if (message.type !== "user" || typeof message.message.content === "string") return;
  for (let r of message.message.content) if (r.type === "tool_result" && r.tool_use_id === n) return r;
  return;
}
//@ chunk-e6aww6q8.js:3776530-3776611 placement
/**
 * 取某工具调用在消息里的耗时。
 */
var toolDurationMsOf = (made, toolUseId) =>
  made?.messages.find((message) => findToolResultBlock(message, toolUseId) !== undefined)?.toolDuration
    ?.durationMs;
//@ chunk-e6aww6q8.js:3776611-3776723 placement
var buildToolUseErrorBlock = (toolUseId, n) => ({
  type: "tool_result",
  content: `<tool_use_error>${n}</tool_use_error>`,
  is_error: true,
  tool_use_id: toolUseId,
});
//@ chunk-e6aww6q8.js:3776723-3776825 placement
var isRunUnchanged = (e, made) =>
  e.deny === undefined &&
  (e.result === undefined ||
    e.result === made.result ||
    stableStringifySafe(e.result) === stableStringifySafe(made.result));
//@ chunk-e6aww6q8.js:3776825-3776892 placement
/**
 * 该工具调用有结果且不是错误。
 */
function ranWithoutError(message, toolUseId) {
  let toolResultBlock = findToolResultBlock(message, toolUseId);
  return toolResultBlock !== undefined && toolResultBlock.is_error !== true;
}
//@ chunk-e6aww6q8.js:3776892-3776954 placement
/**
 * 已存在结果块时先移除该结果再返回消息。
 */
function stripToolResultBlock(e, toolUseId) {
  if (findToolResultBlock(e, toolUseId) !== undefined) markWithheldResult(e.message);
  return e;
}
//@ chunk-e6aww6q8.js:3776954-3777201 placement
var rebuildResultMessage = (message, content, r) => ({
  content: content.map(r),
  imagePasteIds: message.imagePasteIds,
  mcpMeta: message.mcpMeta,
  toolEndsTurn: message.toolEndsTurn,
  sandboxViolations: message.sandboxViolations,
  sandboxed: message.sandboxed,
  permissionDecision: message.toolDenialKind === undefined ? message.permissionDecision : undefined,
});
//@ chunk-e6aww6q8.js:3777201-3777431 placement
/**
 * 在消息列表中找到本次调用的结果消息，把其 tool_result 替换为新块（保留其他元数据）；找不到时只返回新块。
 */
function replaceToolResult(e, toolUseId, r) {
  let message = e.find((S) => findToolResultBlock(S, toolUseId) !== undefined)?.message;
  if (message?.type !== "user")
    return {
      content: [r],
    };
  let content = message.message.content;
  return typeof content === "string"
    ? {
        content: [r],
      }
    : rebuildResultMessage(message, content, (S) =>
        S.type === "tool_result" && S.tool_use_id === toolUseId ? r : S,
      );
}
//@ chunk-e6aww6q8.js:3777561-3777675 placement
function findToolUseResult(messages) {
  for (let { message } of messages)
    if (message.type === "user" && message.toolUseResult !== undefined) return message.toolUseResult;
  return;
}
//@ chunk-e6aww6q8.js:3777675-3777764 placement
/**
 * 从消息列表里去掉该工具的结果块。
 */
function withoutToolResultBlock(messages, toolUseId) {
  let index = messages.findIndex((s) => findToolResultBlock(s, toolUseId) !== undefined);
  return messages.filter((s, h) => h !== index);
}
//@ chunk-e6aww6q8.js:3777764-3778510 placement
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
//@ chunk-e6aww6q8.js:3778510-3778618 placement
var makeErrorResultAppender =
  (toolUseId, n, r) =>
  (s, h, y = buildToolUseErrorBlock) => [
    ...n,
    {
      message: createUserMessage({
        content: [y(toolUseId, s)],
        toolUseResult: `Error: ${s}`,
        ...h,
        ...r,
      }),
    },
  ];
//@ chunk-e6aww6q8.js:3778618-3778740 placement
var createChainState = () => ({
  thrown: undefined,
  managedPass: undefined,
  managedRan: false,
  managedChangedInPlace: false,
  managedMade: undefined,
  toolEntered: false,
});
//@ chunk-e6aww6q8.js:3778740-3778766 placement
/**
 * 是否为 bare fork 且未关闭设置钩子（决定是否运行托管钩子）。
 */
var shouldRunManagedLink = (e, n, r) => e || (n && !r);
//@ chunk-e6aww6q8.js:3778766-3778863 placement
/**
 * 子代理里是否保留工具结果。
 */
var shouldKeepToolResultInSubagents = (toolUseContext, tool) =>
  !toolUseContext.agentId ||
  toolUseContext.preserveToolUseResults === true ||
  tool.preserveToolUseResultInSubagents === true;
//@ chunk-e6aww6q8.js:3778863-3778911 placement
var POST_TOOL_HOOK_STOPPED_MESSAGE = "Execution stopped by PostToolUse hook";
//@ chunk-e6aww6q8.js:3778911-3778958 placement
/**
 * 是否运行托管工具钩子（非会话结束工具且未 bare fork/未关设置钩子）。
 */
function shouldRunManagedToolHooks(tool, bareFork, settingsHooksOff = undefined) {
  return !isConversationEndTool(tool) && !bareFork && !settingsHooksOff;
}
//@ chunk-e6aww6q8.js:3778958-3779745 placement
/**
 * tool.call 链中的托管钩子环节：只运行托管的 PreToolUse 钩子，拒绝或账号记忆改写违规时返回 deny，否则记录托管放行信息并以（可能改写后的）输入继续调用下一环。
 */
var createManagedHookLink = (tool, context, state) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(s, h) {
    if (!shouldRunManagedToolHooks(tool, context.options.bareFork, context.options.settingsHooksOff))
      return h(s);
    let inputKey = stableStringifySafe(toolInputOf(s));
    let hookPass = await collectPreToolHookPass(
      executePreToolHooks(
        s.tool,
        s.tool_use_id,
        toolInputOf(s),
        context,
        getToolPermissionContext(context).mode,
        h.signal,
        undefined,
        {
          managedHooksOnly: true,
        },
      ),
      s.tool,
    );
    state.managedMade = hookPass;
    state.managedChangedInPlace =
      hookPass.result.updatedInput === undefined && stableStringifySafe(toolInputOf(s)) !== inputKey;
    let { deny, updatedInput, ...q } = hookPass.result;
    if (deny !== undefined)
      return {
        deny,
      };
    if (shouldReplaceMemoryInput(tool, toolInputOf(s), updatedInput))
      return {
        deny: guardAccountMemoryHookRewrite(tool, "PreToolUse", "policySettings").message,
      };
    let effectiveInput = updatedInput ?? toolInputOf(s);
    let Se;
    state.managedRan = true;
    state.managedPass = {
      toolUseId: s.tool_use_id,
      input: effectiveInput,
      inputKey: () => (Se ??= stableStringifySafe(effectiveInput)),
      pass: {
        result: q,
        yields: hookPass.yields,
        ...(hookPass.rewrites !== undefined && {
          rewrites: hookPass.rewrites,
        }),
      },
    };
    try {
      return await h(
        updatedInput
          ? withRequestMeta(
              withAgentId(toolCallEvent(s.tool, s.tool_use_id, updatedInput), s.agentId),
              s.requestMeta,
            )
          : s,
      );
    } finally {
      state.managedPass = undefined;
    }
  },
});
//@ chunk-e6aww6q8.js:3779745-3779839 placement
/**
 * 按对象键排序后序列化，便于稳定比较。
 */
var sortedJson = (attachment) =>
  jsonStringify(Object.fromEntries(Object.entries(attachment).toSorted(([n], [r]) => n.localeCompare(r))));
//@ chunk-e6aww6q8.js:3779839-3780845 placement
/**
 * 运行 PostToolUse 钩子；钩子改写账户记忆服务器结果时拒绝并警告。
 */
async function runPostToolUseHooksForMemory({ tool, toolUseID, input, output, toolUseContext, durationMs }) {
  let hookName = `PostToolUse:${tool.name}`;
  let w = [];
  let output_2 = output;
  let rewritten = false;
  for await (let q of executePostToolHooks(
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
    let Z =
      q.updatedToolOutput !== undefined || !isMcpTool(tool) ? q.updatedToolOutput : q.updatedMCPToolOutput;
    if (Z !== undefined)
      if (isLiveMemoryToolName(tool))
        logForDebugging(
          `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
          {
            level: "warn",
          },
        );
      else {
        output_2 = Z;
        rewritten = true;
      }
    if (q.blockingError)
      w.push({
        message: createAttachmentMessage_2({
          type: "hook_blocking_error",
          blockingError: q.blockingError,
          hookName,
          toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
    if (q.preventContinuation) {
      w.push({
        message: createAttachmentMessage_2({
          type: "hook_stopped_continuation",
          message: q.stopReason || POST_TOOL_HOOK_STOPPED_MESSAGE,
          hookName,
          toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
      break;
    }
    let { additionalContexts } = q;
    if (additionalContexts !== undefined && additionalContexts.length > 0)
      w.push({
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
    messages: w,
  };
}
//@ chunk-e6aww6q8.js:3780845-3780918 placement
/**
 * 过滤空串后的文本列表，全空返回 undefined。
 */
function nonEmptyTexts(output) {
  let filtered = output.filter((r) => r !== "");
  return filtered.length === 0 ? undefined : filtered;
}
//@ chunk-e6aww6q8.js:3780918-3781155 placement
function applyManagedContextRewrite(e, hookResult) {
  if (!hookResult.rewritten) return e;
  if (typeof hookResult.output === "string") return nonEmptyTexts([hookResult.output]);
  if (isStringListValue(hookResult.output)) return nonEmptyTexts(hookResult.output);
  logForDebugging(
    "tool.call: the managed rewrite of a context is neither a text nor a list of texts; dropped",
  );
  return;
}
//@ chunk-e6aww6q8.js:3781155-3781663 placement
/**
 * 运行记忆相关的 PostToolUse 钩子，在未被阻止时附上托管改写后的上下文，并去掉与已有附件重复的消息。
 */
async function runToolCallPostHooks(e, n, r) {
  let hookResult = await runPostToolUseHooksForMemory({
    ...n,
    output: e,
  });
  let contextTexts = [...r, ...hookResult.messages].some(
    (G) => G.message.type === "attachment" && G.message.attachment.type === "hook_stopped_continuation",
  )
    ? undefined
    : applyManagedContextRewrite(e, hookResult);
  let hasContext = contextTexts !== undefined && contextTexts.length > 0;
  let storedContext = hasContext
    ? await capAdditionalContext(contextTexts, "tool.call", n.toolUseContext.storageV5)
    : [];
  let existingKeys = new Set(
    r.flatMap((G) => {
      let message = G.message;
      return message.type === "attachment" ? [sortedJson(message.attachment)] : [];
    }),
  );
  return [
    ...(hasContext ? [buildToolCallContextMessage(storedContext, n.toolUseID)] : []),
    ...hookResult.messages.filter(
      (message) =>
        !(message.message.type === "attachment" && existingKeys.has(sortedJson(message.message.attachment))),
    ),
  ];
}
//@ chunk-e6aww6q8.js:3781663-3781862 placement
function findRunInputForResult(e, n, r) {
  let s = toolInputOf(r);
  let h = stableStringifySafe(e.result);
  let y = stableStringifySafe(s);
  return (
    n.runs.last((S) => stableStringifySafe(S.made.result) === h && stableStringifySafe(S.input) === y)
      ?.input ??
    n.runs.last((S) => stableStringifySafe(S.made.result) === h)?.input ??
    n.runs.last()?.input ??
    s
  );
}
//@ chunk-e6aww6q8.js:3781862-3782022 placement
function dropBlockingErrors(e) {
  let n = [];
  for (let { message } of e)
    if (
      message !== undefined &&
      !(message.type === "attachment" && message.attachment.type === "hook_blocking_error")
    )
      n.push({
        message,
      });
  return n;
}
//@ chunk-e6aww6q8.js:3782022-3782687 placement
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
//@ chunk-e6aww6q8.js:3782687-3782731 placement
/**
 * 未被拦下且托管改写可用时应用改写。
 */
var shouldApplyManagedRewrite = (tool, n, r) => !r && n.deny === undefined && isLiveMemoryToolName(tool);
//@ chunk-e6aww6q8.js:3885866-3886174 affinity
var PRE_TOOL_HOOK_TIMEOUT_MESSAGE =
  "PreToolUse hook did not respond before its timeout (host client may be unreachable). The tool call was not executed; other configured hooks may not have completed.";
var PRE_TOOL_HOOK_ERROR_MESSAGE =
  "PreToolUse hook failed with an unexpected error. The tool call was not executed; other configured hooks may not have completed.";
//@ chunk-e6aww6q8.js:3886174-3888827 fingerprint = runPostToolUseHooks (0.685)
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
        let we = isLiveMemoryToolName(tool);
        if (we && (result.updatedToolOutput !== undefined || result.updatedMCPToolOutput !== undefined))
          logForDebugging(
            `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
            {
              level: "warn",
            },
          );
        if (result.updatedToolOutput !== undefined && !we)
          yield {
            updatedToolOutput: result.updatedToolOutput,
          };
        if (result.updatedMCPToolOutput !== undefined && isMcpTool(tool) && !we)
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
//@ chunk-e6aww6q8.js:3888827-3890783 fingerprint = runPostToolUseFailureHooks (0.806)
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
//@ chunk-e6aww6q8.js:3890783-3891073 layout
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
    !isClassifierAllow(hookPermissionDecision.decision)
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
//@ chunk-e6aww6q8.js:3891073-3891167 layout
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
//@ chunk-e6aww6q8.js:3891167-3894038 fingerprint = resolveHookPermissionDecision (0.405)
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
  let w = settingsProblemDenial();
  if (w !== null)
    return {
      decision: w,
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
  let hookUpdatedInput = getHookUpdatedInput(hookPermissionResult, input);
  let Z =
    hookPermissionResult.behavior === "ask"
      ? dropStaleHostDisplay(hookPermissionResult, hookUpdatedInput)
      : hookPermissionResult;
  let Se = Z.behavior === "ask" && Z.hostDisplay !== undefined ? Z : undefined;
  let ke = reservedKeyDenialIfPresent(hookUpdatedInput);
  if (ke !== null)
    return {
      decision: ke,
      input: hookUpdatedInput,
    };
  let we =
    (await checkRuleBasedPermissions(
      tool,
      hookUpdatedInput,
      {
        ...toolUseContext,
        toolUseId: toolUseID,
      },
      {
        hookUpdatedInput: hookPermissionResult.updatedInput,
        planModeWriteFloor: behavior === "allow",
        hookAsked: behavior === "ask",
        ...(Se !== undefined && {
          crashIsObjection: true,
        }),
      },
    )) ??
    (await checkRuleBasedPermissionsOnToolHost(
      tool,
      hookUpdatedInput,
      toolUseContext,
      assistantMessage,
      toolUseID,
    ));
  if (we?.behavior === "deny") {
    logForDebugging(
      `Hook returned '${behavior}' for ${tool.name}, but deny rule overrides (deny's reason type: ${we.decisionReason?.type ?? "none"})`,
    );
    return runPermissionPipeline(appendRuleAnnotation(we), {
      tool,
      input: hookUpdatedInput,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolUseID,
    });
  }
  if (we?.behavior === "ask" && Se !== undefined) {
    logFeatureBad("permission_host_worded_ask", "pipeline_also_asks");
    return {
      decision: forwardHostWordedAsk(tool.name, "the plain permission prompt raised for this call", {
        hostWorded: true,
      }),
      input: hookUpdatedInput,
    };
  }
  if (we?.behavior === "ask") {
    let Ee = behavior === "ask";
    logForDebugging(
      `Hook returned '${behavior}' for ${tool.name}, but an ask rule, a safety check, a ToolHost's person-only ask or plan mode requires the full permission pipeline${Ee ? " (hookAskFloor \u2014 a classifier allow re-surfaces as this ask)" : ""}`,
    );
    return {
      decision: await canUseTool(
        tool,
        hookUpdatedInput,
        Ee
          ? {
              ...toolUseContext,
              hookAskFloor: true,
            }
          : toolUseContext,
        assistantMessage,
        toolUseID,
      ),
      input: hookUpdatedInput,
    };
  }
  if (behavior === "allow") {
    if (requireCanUseTool) {
      logForDebugging(`Hook approved tool use for ${tool.name}, but canUseTool is required`);
      return {
        decision: await canUseTool(tool, hookUpdatedInput, toolUseContext, assistantMessage, toolUseID),
        input: hookUpdatedInput,
      };
    }
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let Ae = isAutoAllowedInMode(tool, toolPermissionContext);
    let Ie = isAutoClassifierActive(Ae) && requiresClassifierForHookAllow(tool);
    let Me = !Ie && Ae === "auto" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_knuth", false);
    let We = !Ie && !Me && isClassifierRoutedMcpTool(tool, toolPermissionContext);
    let ze = !Ie && !Me && isWebToolClassifierRouted(tool, toolPermissionContext);
    let lt = !Ie && !Me && !We && !ze && isRemoteBrowserToolUnderModeFloor(tool);
    if (!tool.requiresUserInteraction?.() && (Ie || Me || We || ze || lt)) {
      let decisionReason =
        hookPermissionResult.decisionReason?.type === "hook"
          ? hookPermissionResult.decisionReason
          : undefined;
      let nt = !lt || isAutoClassifierActive(Ae);
      if (nt)
        logEvent("tengu_auto_mode_hook_allow_funneled", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? false,
          remoteSessionMcp: We,
          coworkWeb: ze,
          hookSource: fromEnumOpt(hookSourceKind(decisionReason?.hookSource)),
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          toolUseId: sanitizeMarkName(toolUseID),
        });
      logForDebugging(
        nt
          ? `Hook approved tool use for ${tool.name}, but auto mode requires classifier adjudication`
          : `Hook approved tool use for ${tool.name}, but a hook cannot approve a call to CCR's cloud browser; the normal permission check decides`,
      );
      return {
        decision: await canUseTool(
          tool,
          hookUpdatedInput,
          {
            ...toolUseContext,
            hookAllowVouched: true,
          },
          assistantMessage,
          toolUseID,
        ),
        input: hookUpdatedInput,
      };
    }
    logForDebugging(
      tool.requiresUserInteraction?.()
        ? `Hook satisfied user interaction for ${tool.name} via updatedInput`
        : `Hook approved tool use for ${tool.name}, bypassing permission prompt`,
    );
    countMcpPolicyRecheckSkipped(
      "preToolUseHook",
      tool,
      hookUpdatedInput,
      toolUseContext,
      assistantMessage,
      toolUseID,
    );
    return runPermissionPipeline(hookPermissionResult, {
      tool,
      input: hookUpdatedInput,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolUseID,
    });
  }
  return runPermissionPipeline(Z, {
    tool,
    input: hookUpdatedInput,
    toolUseContext,
    canUseTool,
    assistantMessage,
    toolUseID,
  });
}
//@ chunk-e6aww6q8.js:3894038-3894954 layout
/**
 * 权限评估管线：先规则/模式评估（aWr），再分类器/后处理（nWr）；有输入级硬拒绝直接返回；allow 但上下文要求 requireCanUseTool、或结论为 ask 时调用 canUseTool（必要时禁止"总是允许"）。
 */
async function runPermissionPipeline(decision, request) {
  let r = await decideWithToolCheckHooks(
    {
      tool: request.tool,
      input: request.input,
      context: request.toolUseContext,
      toolUseID: request.toolUseID,
      evaluate: () => Promise.resolve(decision),
    },
    request.assistantMessage.message.id,
  );
  let s = await personAskAfterHooks(
    enforceClassifierOnlyDecision(
      request.tool,
      decision.behavior === "ask" && decision.hostDisplay !== undefined && r.behavior !== "deny"
        ? decision
        : r,
    ),
    {
      tool: request.tool,
      input: request.input,
      context: request.toolUseContext,
      toolUseID: request.toolUseID,
    },
  );
  let h = s.behavior === "deny" ? null : reservedKeyDenialIfPresent(request.input);
  if (h !== null)
    return {
      decision: h,
      input: request.input,
    };
  if (s.behavior === "allow" && request.toolUseContext.requireCanUseTool === true)
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
  if (s.behavior !== "ask")
    return {
      decision: s,
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
            ...s,
            suppressAlwaysAllowRule: true,
          }
        : s,
    ),
    input: request.input,
  };
}
//@ chunk-e6aww6q8.js:3894954-3900124 fingerprint = runPreToolUseHooks (0.724)
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
  validateInput = (G) =>
    tool.validateInput?.(G, {
      ...toolUseContext,
      toolUseId: toolUseID,
    }),
) {
  if (
    !shouldRunManagedToolHooks(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)
  )
    return;
  let hookStartTime = Date.now();
  let q;
  let Z;
  let strictestHookAnswer;
  let ke;
  function we() {
    return toolUseContext.remoteCall !== undefined || getRemoteHookRunner(toolUseContext) !== undefined;
  }
  let Ee;
  let Ae;
  let Ie = {};
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
      Ie,
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
          if (!(result.blockingError.hookDidNotFinish && Z?.behavior === "deny"))
            Z = {
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
            hookPermissionResult: Z,
          };
        }
        let updatedInput = result.updatedInput;
        if (updatedInput !== undefined) {
          let lt = await validateHookUpdatedInput(tool, updatedInput, {
            event: "PreToolUse",
            source: result.hookSource,
            applies: result.permissionBehavior !== "deny" && result.permissionBehavior !== "defer",
            validate: validateInput,
          }).catch((error) => {
            if (isAbortError(error) && toolUseContext.abortController.signal.aborted) return "cancelled";
            throw error;
          });
          if (lt === "cancelled") {
            yield {
              type: "stop",
            };
            return;
          }
          if (!lt.ok) {
            Z = lt.deny;
            ke = lt.deny;
            if (toolUseContext.remoteCall !== undefined)
              setStrictestHookAnswer(toolUseContext.remoteCall, lt.deny);
            yield {
              type: "hookPermissionResult",
              hookPermissionResult: Z,
            };
            continue;
          }
          updatedInput = lt.input;
          yield {
            type: "hookRewriterKind",
            kind: result.rewriterKind ?? "remote",
            source: result.rewriteSource ?? result.hookSource,
          };
        }
        let ze =
          result.permissionBehavior !== "deny" &&
          shouldReplaceMemoryInput(tool, toolInput, result.updatedInput);
        if (ze) {
          strictestHookAnswer = guardAccountMemoryHookRewrite(tool, "PreToolUse", result.hookSource);
          Z = strictestHookAnswer;
          if (toolUseContext.remoteCall !== undefined)
            setStrictestHookAnswer(toolUseContext.remoteCall, strictestHookAnswer);
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: Z,
          };
        }
        if (result.preventContinuation) {
          yield {
            type: "preventContinuation",
            shouldPreventContinuation: true,
          };
          if (result.stopReason) {
            Ae = result.stopReason;
            yield {
              type: "stopReason",
              stopReason: result.stopReason,
            };
          }
        }
        if (ze) continue;
        if (result.permissionBehavior !== undefined) {
          logForDebugging(`Hook result has permissionBehavior=${result.permissionBehavior}`);
          if (result.permissionBehavior === "defer") {
            q = result.hookSource || `PreToolUse:${tool.name}`;
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
                we() && (Z ?? Ee) !== undefined
                  ? (Z ?? Ee)
                  : (ke ?? {
                      behavior: "allow",
                      updatedInput,
                      decisionReason,
                    }),
            };
          else if (result.permissionBehavior === "ask") {
            let Je = Ee === undefined;
            Ee = {
              behavior: "ask",
              updatedInput,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason,
              ...(Je &&
                result.permissionDisplay && {
                  hostDisplay: result.permissionDisplay,
                  hostDisplayInput: updatedInput ?? toolInput,
                  suppressAlwaysAllowRule: true,
                  defaultToNo: true,
                }),
            };
            yield {
              type: "hookPermissionResult",
              hookPermissionResult: we() && Z !== undefined ? Z : (ke ?? Ee),
            };
          } else {
            let Je = {
              behavior: result.permissionBehavior,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason,
            };
            Z = Je;
            yield {
              type: "hookPermissionResult",
              hookPermissionResult: Je,
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
        if (Z) {
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: Z,
          };
          return;
        } else {
          if (q) {
            yield {
              type: "defer",
              hookName: q,
            };
            q = undefined;
          }
          yield {
            type: "stop",
            stopReason: Ae ?? PRE_TOOL_HOOK_ERROR_MESSAGE,
          };
        }
      }
  } catch (error) {
    let We = Ie.deniedBefore
      ? `${Ie.deniedBefore}

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
        if (Z)
          yield {
            type: "hookPermissionResult",
            hookPermissionResult: Z,
          };
        else {
          if (q)
            yield {
              type: "defer",
              hookName: q,
            };
          yield {
            type: "stop",
            stopReason: Ae ?? We + PRE_TOOL_HOOK_TIMEOUT_MESSAGE,
          };
        }
        return;
      }
    } else {
      logError(withTelemetryMessage(toError(error), "PreToolUse hook dispatch failed"));
      if (Z)
        yield {
          type: "hookPermissionResult",
          hookPermissionResult: Z,
        };
      else {
        if (q)
          yield {
            type: "defer",
            hookName: q,
          };
        yield {
          type: "stop",
          stopReason: Ae ?? We + PRE_TOOL_HOOK_ERROR_MESSAGE,
        };
      }
      return;
    }
    yield {
      type: "stop",
    };
    return;
  }
  if (q && !Z)
    yield {
      type: "defer",
      hookName: q,
    };
  if (strictestHookAnswer)
    yield {
      type: "hookPermissionResult",
      hookPermissionResult: strictestHookAnswer,
    };
}
//@ chunk-s61vbvea.js:610375-610638 placement
/**
 * 限制钩子 additionalContext 的总长度：逐条加入，超出时截断剩余条目。
 */
async function capAdditionalContext(entries, event, storage) {
  let s = [];
  let h = 0;
  let y = 0;
  while (y < entries.length) {
    let S = entries[y] ?? "";
    let w = EVENT_TOOL_SITE_NAMES - h;
    let R = S.length <= Math.min(RESULT_TOKEN_BUDGET, w);
    let P = R || w >= MAX_PREVIEW_CHARS ? [S] : entries.slice(y);
    let j = R
      ? S
      : await truncateAdditionalContext({
          entries: P,
          limit: Math.max(0, Math.min(RESULT_TOKEN_BUDGET, w)),
          event,
          storageV5: storage,
        });
    s.push(j);
    h += j.length;
    y += P.length;
  }
  return s;
}
export {
  capAdditionalContext,
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
  createToolCallChain,
  runPreToolUseHooks,
  getHookUpdatedInput,
  resolvePermissionDecisionForCall,
  runPostToolUseHooks,
  runPostToolUseFailureHooks,
};
