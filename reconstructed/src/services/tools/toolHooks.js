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
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { mUr } from "../../plugins/functionHooks/toolCallHooks.js";
import { toolInputOf, HUi, nSi, m3t } from "../../plugins/functionHooks/sites/toolSites.js";
import { forwardAbort, createStepRecorder } from "../../plugins/functionHooks/dispatch/chain.js";
import { stringRequestMeta } from "../../plugins/functionHooks/sessionApi.js";
import { interpretCommandResult_2 } from "../../tools/BashTool/commandSemantics.js";
import { createUserMessage } from "../../utils/messages.js";
import {
  isConversationEndTool,
  obe,
  Q0,
  _M,
  i2e,
  describeNonClassifierAllow,
  buildClassifierOnlyDenial,
  checkRuleBasedPermissions,
  checkRuleBasedPermissionsOnToolHost,
  appendRuleAnnotation,
  XH,
  RL,
  countMcpPolicyRecheckSkipped,
  decideWithToolCheckHooks,
  personAskAfterHooks,
  enforceClassifierOnlyDecision,
  mcpAskVetoesStandingGrant,
  e_e,
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
import { KRt, ofr, RAn } from "../../plugins/functionHooks/sites/siteRules.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { ye } from "../../utils/startupMarks.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../analytics/safeMetadata.js";
import { formatToolErrorMessage } from "../../utils/toolErrors.js";
import { isAbortError, StreamClosedAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { settingsProblemDenial } from "../../utils/settings/settingsProblems.js";
import { dropStaleHostDisplay } from "../../utils/hooks/hookMessages.js";
import { G7 } from "../../tools/ArtifactTool/reservedKeys.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { forwardHostWordedAsk } from "./hostWordedAsks.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { requiresClassifierForHookAllow } from "../../utils/permissions/permissionSetup.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isRemoteBrowserToolUnderModeFloor } from "../../utils/permissions/remoteBrowser.js";
import { getRemoteHookRunner } from "../../Tool.js";
import { _1e } from "../../utils/hooks/hookPermissionResult.js";
import { getRuleBehaviorDescription } from "../../utils/permissions/PermissionResult.js";
import { OE, truncateAdditionalContext } from "../remoteTools/backgroundCommands.js";

//@ chunk-e6aww6q8.js:3775878-3775973 placement
var Zqr = (e, n) => ({
  type: "tool_result",
  content: [{ type: "text", text: n }],
  is_error: !0,
  tool_use_id: e,
});
/**
 * 构造 tool.call 钩子的附加上下文消息、PreToolUse 阻止继续的消息，以及判断消息是否为阻止继续。
 */
//@ chunk-e6aww6q8.js:3775973-3776348 placement
var buildToolCallContextMessage = (e, n) => ({
    message: createAttachmentMessage_2({
      type: "hook_additional_context",
      content: [...e],
      hookName: "tool.call",
      toolUseID: `${n}-context`,
      hookEvent: "PostToolUse",
    }),
  }),
  buildHookStoppedMessage = (e, n, r) => ({
    message: createAttachmentMessage_2({
      type: "hook_stopped_continuation",
      message: e,
      hookName: `PreToolUse:${n}`,
      toolUseID: r,
      hookEvent: "PreToolUse",
    }),
  }),
  isHookStoppedMessage = ({ message: message }) =>
    message.type === "attachment" && message.attachment.type === "hook_stopped_continuation";
//@ chunk-e6aww6q8.js:3776348-3776530 placement
function findToolResultBlock({ message: message }, n) {
  if (message.type !== "user" || typeof message.message.content === "string") return;
  for (let r of message.message.content) if (r.type === "tool_result" && r.tool_use_id === n) return r;
  return;
}
//@ chunk-e6aww6q8.js:3776530-3776611 placement
var ANn = (e, n) => e?.messages.find((r) => findToolResultBlock(r, n) !== void 0)?.toolDuration?.durationMs;
//@ chunk-e6aww6q8.js:3776611-3776723 placement
var buildToolUseErrorBlock = (e, n) => ({
  type: "tool_result",
  content: `<tool_use_error>${n}</tool_use_error>`,
  is_error: !0,
  tool_use_id: e,
});
//@ chunk-e6aww6q8.js:3776723-3776825 placement
var isRunUnchanged = (e, n) =>
  e.deny === void 0 && (e.result === void 0 || e.result === n.result || Rs(e.result) === Rs(n.result));
//@ chunk-e6aww6q8.js:3776825-3776892 placement
function iVr(e, n) {
  let r = findToolResultBlock(e, n);
  return r !== void 0 && r.is_error !== !0;
}
//@ chunk-e6aww6q8.js:3776892-3776954 placement
function fVr(e, n) {
  if (findToolResultBlock(e, n) !== void 0) mUr(e.message);
  return e;
}
//@ chunk-e6aww6q8.js:3776954-3777201 placement
var rebuildResultMessage = (e, n, r) => ({
  content: n.map(r),
  imagePasteIds: e.imagePasteIds,
  mcpMeta: e.mcpMeta,
  toolEndsTurn: e.toolEndsTurn,
  sandboxViolations: e.sandboxViolations,
  sandboxed: e.sandboxed,
  permissionDecision: e.toolDenialKind === void 0 ? e.permissionDecision : void 0,
});
/**
 * 在消息列表中找到本次调用的结果消息，把其 tool_result 替换为新块（保留其他元数据）；找不到时只返回新块。
 */
//@ chunk-e6aww6q8.js:3777201-3777431 placement
function replaceToolResult(e, n, r) {
  let s = e.find((S) => findToolResultBlock(S, n) !== void 0)?.message;
  if (s?.type !== "user") return { content: [r] };
  let content = s.message.content;
  return typeof content === "string"
    ? { content: [r] }
    : rebuildResultMessage(s, content, (S) => (S.type === "tool_result" && S.tool_use_id === n ? r : S));
}
//@ chunk-e6aww6q8.js:3777561-3777675 placement
function findToolUseResult(e) {
  for (let { message: message } of e)
    if (message.type === "user" && message.toolUseResult !== void 0) return message.toolUseResult;
  return;
}
//@ chunk-e6aww6q8.js:3777675-3777764 placement
function PNn(e, n) {
  let index = e.findIndex((s) => findToolResultBlock(s, n) !== void 0);
  return e.filter((s, h) => h !== index);
}
/**
 * tool.call 链中的核心环节：检查拒绝，转发中止信号，运行工具并记录本次运行（结果、命令解读、只读标记）；抛错时记录到状态。
 */
//@ chunk-e6aww6q8.js:3777764-3778510 placement
var createCoreToolLink = ({
  toolUseContext: toolUseContext,
  runs: runs,
  state: state,
  run: run,
  refuse: refuse,
  isMcpTool: isMcpTool,
}) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(call, { signal: signal }) {
    let input = toolInputOf(call),
      refusal = refuse?.(input);
    if (refusal !== void 0) return { deny: refusal };
    let abortController = new AbortController();
    abortController.signal.addEventListener(
      "abort",
      () => {
        if (!signal.aborted) toolUseContext.abortController.abort(abortController.signal.reason);
      },
      { once: !0 },
    );
    let releaseAbort = forwardAbort(signal, abortController),
      hooks = {
        onToolEntered: () => {
          state.toolEntered = !0;
        },
      },
      requestMeta = isMcpTool ? stringRequestMeta(call.requestMeta) : void 0;
    try {
      let messages = await run(
          input,
          {
            ...toolUseContext,
            abortController: abortController,
            managedPass: state.managedPass,
            ...(requestMeta && { mcpRequestMeta: { ...toolUseContext.mcpRequestMeta, ...requestMeta } }),
          },
          hooks,
        ),
        result = hooks.output ? hooks.output.value : findToolUseResult(messages);
      return {
        ref: runs.keep(input, { messages: messages, result: result }),
        result: result,
        ...interpretCommandResult_2(messages, call.tool_use_id),
        ...(hooks.isReadOnly && { isReadOnly: hooks.isReadOnly }),
      };
    } catch (error) {
      throw ((state.thrown = { error: error }), error);
    } finally {
      releaseAbort();
    }
  },
});
//@ chunk-e6aww6q8.js:3778510-3778618 placement
var makeErrorResultAppender =
  (e, n, r) =>
  (s, h, y = buildToolUseErrorBlock) => [
    ...n,
    { message: createUserMessage({ content: [y(e, s)], toolUseResult: `Error: ${s}`, ...h, ...r }) },
  ];
//@ chunk-e6aww6q8.js:3778618-3778740 placement
var createChainState = () => ({
  thrown: void 0,
  managedPass: void 0,
  managedRan: !1,
  managedChangedInPlace: !1,
  managedMade: void 0,
  toolEntered: !1,
});
//@ chunk-e6aww6q8.js:3778740-3778766 placement
var INn = (e, n, r) => e || (n && !r);
//@ chunk-e6aww6q8.js:3778766-3778863 placement
var VN = (e, n) => !e.agentId || e.preserveToolUseResults === !0 || n.preserveToolUseResultInSubagents === !0;
//@ chunk-e6aww6q8.js:3778863-3778911 placement
var cPe = "Execution stopped by PostToolUse hook";
//@ chunk-e6aww6q8.js:3778911-3778958 placement
function YN(e, n, r = void 0) {
  return !isConversationEndTool(e) && !n && !r;
}
/**
 * tool.call 链中的托管钩子环节：只运行托管的 PreToolUse 钩子，拒绝或账号记忆改写违规时返回 deny，否则记录托管放行信息并以（可能改写后的）输入继续调用下一环。
 */
//@ chunk-e6aww6q8.js:3778958-3779745 placement
var createManagedHookLink = (tool, context, state) => ({
  name: MANAGED,
  isManaged: !0,
  budgetMs: 0,
  async run(s, h) {
    if (!YN(tool, context.options.bareFork, context.options.settingsHooksOff)) return h(s);
    let inputKey = Rs(toolInputOf(s)),
      hookPass = await collectPreToolHookPass(
        executePreToolHooks(
          s.tool,
          s.tool_use_id,
          toolInputOf(s),
          context,
          getToolPermissionContext(context).mode,
          h.signal,
          void 0,
          { managedHooksOnly: !0 },
        ),
        s.tool,
      );
    ((state.managedMade = hookPass),
      (state.managedChangedInPlace =
        hookPass.result.updatedInput === void 0 && Rs(toolInputOf(s)) !== inputKey));
    let { deny: deny, updatedInput: updatedInput, ...q } = hookPass.result;
    if (deny !== void 0) return { deny: deny };
    if (obe(tool, toolInputOf(s), updatedInput))
      return { deny: guardAccountMemoryHookRewrite(tool, "PreToolUse", "policySettings").message };
    let effectiveInput = updatedInput ?? toolInputOf(s),
      Se;
    ((state.managedRan = !0),
      (state.managedPass = {
        toolUseId: s.tool_use_id,
        input: effectiveInput,
        inputKey: () => (Se ??= Rs(effectiveInput)),
        pass: {
          result: q,
          yields: hookPass.yields,
          ...(hookPass.rewrites !== void 0 && { rewrites: hookPass.rewrites }),
        },
      }));
    try {
      return await h(
        updatedInput ? HUi(nSi(m3t(s.tool, s.tool_use_id, updatedInput), s.agentId), s.requestMeta) : s,
      );
    } finally {
      state.managedPass = void 0;
    }
  },
});
//@ chunk-e6aww6q8.js:3779745-3779839 placement
var Pst = (e) =>
  jsonStringify(Object.fromEntries(Object.entries(e).toSorted(([n], [r]) => n.localeCompare(r))));
/**
 * 运行 PostToolUse 钩子；钩子改写账户记忆服务器结果时拒绝并警告。
 */
//@ chunk-e6aww6q8.js:3779839-3780845 placement
async function runPostToolUseHooksForMemory({
  tool: tool,
  toolUseID: toolUseID,
  input: input,
  output: output,
  toolUseContext: toolUseContext,
  durationMs: durationMs,
}) {
  let S = `PostToolUse:${tool.name}`,
    w = [],
    L = output,
    G = !1;
  for await (let q of executePostToolHooks(
    tool.name,
    toolUseID,
    input,
    output,
    toolUseContext,
    getToolPermissionContext(toolUseContext).mode,
    toolUseContext.abortController.signal,
    void 0,
    durationMs,
    { managedHooksOnly: !0 },
  )) {
    let Z = q.updatedToolOutput !== void 0 || !isMcpTool(tool) ? q.updatedToolOutput : q.updatedMCPToolOutput;
    if (Z !== void 0)
      if (Q0(tool))
        logForDebugging(
          `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
          { level: "warn" },
        );
      else ((L = Z), (G = !0));
    if (q.blockingError)
      w.push({
        message: createAttachmentMessage_2({
          type: "hook_blocking_error",
          blockingError: q.blockingError,
          hookName: S,
          toolUseID: toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
    if (q.preventContinuation) {
      w.push({
        message: createAttachmentMessage_2({
          type: "hook_stopped_continuation",
          message: q.stopReason || cPe,
          hookName: S,
          toolUseID: toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
      break;
    }
    let { additionalContexts: additionalContexts } = q;
    if (additionalContexts !== void 0 && additionalContexts.length > 0)
      w.push({
        message: createAttachmentMessage_2({
          type: "hook_additional_context",
          content: additionalContexts,
          hookName: S,
          toolUseID: toolUseID,
          hookEvent: "PostToolUse",
        }),
      });
  }
  return { output: L, rewritten: G, messages: w };
}
//@ chunk-e6aww6q8.js:3780845-3780918 placement
function Mst(e) {
  let filtered = e.filter((r) => r !== "");
  return filtered.length === 0 ? void 0 : filtered;
}
//@ chunk-e6aww6q8.js:3780918-3781155 placement
function applyManagedContextRewrite(e, n) {
  if (!n.rewritten) return e;
  if (typeof n.output === "string") return Mst([n.output]);
  if (KRt(n.output)) return Mst(n.output);
  logForDebugging(
    "tool.call: the managed rewrite of a context is neither a text nor a list of texts; dropped",
  );
  return;
}
/**
 * 运行记忆相关的 PostToolUse 钩子，在未被阻止时附上托管改写后的上下文，并去掉与已有附件重复的消息。
 */
//@ chunk-e6aww6q8.js:3781155-3781663 placement
async function runToolCallPostHooks(e, n, r) {
  let hookResult = await runPostToolUseHooksForMemory({ ...n, output: e }),
    contextTexts = [...r, ...hookResult.messages].some(
      (G) => G.message.type === "attachment" && G.message.attachment.type === "hook_stopped_continuation",
    )
      ? void 0
      : applyManagedContextRewrite(e, hookResult),
    hasContext = contextTexts !== void 0 && contextTexts.length > 0,
    storedContext = hasContext
      ? await capAdditionalContext(contextTexts, "tool.call", n.toolUseContext.storageV5)
      : [],
    existingKeys = new Set(
      r.flatMap((G) => {
        let message = G.message;
        return message.type === "attachment" ? [Pst(message.attachment)] : [];
      }),
    );
  return [
    ...(hasContext ? [buildToolCallContextMessage(storedContext, n.toolUseID)] : []),
    ...hookResult.messages.filter(
      (message) =>
        !(message.message.type === "attachment" && existingKeys.has(Pst(message.message.attachment))),
    ),
  ];
}
//@ chunk-e6aww6q8.js:3781663-3781862 placement
function findRunInputForResult(e, n, r) {
  let s = toolInputOf(r),
    h = Rs(e.result),
    y = Rs(s);
  return (
    n.runs.last((S) => Rs(S.made.result) === h && Rs(S.input) === y)?.input ??
    n.runs.last((S) => Rs(S.made.result) === h)?.input ??
    n.runs.last()?.input ??
    s
  );
}
//@ chunk-e6aww6q8.js:3781862-3782022 placement
function dropBlockingErrors(e) {
  let n = [];
  for (let { message: message } of e)
    if (
      message !== void 0 &&
      !(message.type === "attachment" && message.attachment.type === "hook_blocking_error")
    )
      n.push({ message: message });
  return n;
}
/**
 * 组装 tool.call 钩子链：核心与托管环节、运行记录，以及查询抛错、托管是否运行、工具是否已进入、托管改写、未送达产出等的访问器。
 */
//@ chunk-e6aww6q8.js:3782022-3782687 placement
function createToolCallChain(e, n, r, s) {
  let runs = createStepRecorder(),
    state = createChainState(),
    core = createCoreToolLink({
      toolUseContext: n,
      runs: runs,
      state: state,
      run: r,
      refuse: s,
      isMcpTool: e.mcpInfo !== void 0,
    }),
    managed = createManagedHookLink(e, n, state);
  return {
    core: core,
    managed: managed,
    runs: runs,
    thrown: () => state.thrown,
    managedRan: () => state.managedRan,
    toolEntered: () => state.toolEntered,
    managedRewrites: () => {
      let managedMade = state.managedMade;
      if (managedMade === void 0) return [];
      if (managedMade.result.updatedInput === void 0)
        return state.managedChangedInPlace ? [{ kind: "remote", source: "policySettings" }] : [];
      let G = managedMade.rewrites ?? [];
      return G.length > 0 ? G : [{ kind: "remote", source: "policySettings" }];
    },
    managedLeft: () => state.managedMade?.result.updatedInput,
    undelivered: () => {
      let managedMade = state.managedMade;
      return managedMade !== void 0 && runs.last() === void 0 && state.thrown === void 0
        ? managedMade.yields
        : [];
    },
  };
}
//@ chunk-e6aww6q8.js:3782687-3782731 placement
var $Nn = (e, n, r) => !r && n.deny === void 0 && Q0(e);
//@ chunk-e6aww6q8.js:3885866-3886174 affinity
var PRE_TOOL_HOOK_TIMEOUT_MESSAGE =
    "PreToolUse hook did not respond before its timeout (host client may be unreachable). The tool call was not executed; other configured hooks may not have completed.",
  PRE_TOOL_HOOK_ERROR_MESSAGE =
    "PreToolUse hook failed with an unexpected error. The tool call was not executed; other configured hooks may not have completed.";
/**
 * runPostToolUseHooks：工具成功后执行 PostToolUse hooks，产出 hook 消息、附加上下文、阻止继续，支持 hook 改写 MCP 工具输出（updatedMCPToolOutput）。
 */
//@ chunk-e6aww6q8.js:3886174-3888827 fingerprint = runPostToolUseHooks (0.685)
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
  if (!YN(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)) return;
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
      void 0,
      toolDurationMs,
      options,
    ))
      try {
        if (result.message?.type === "attachment" && result.message.attachment.type === "hook_cancelled") {
          (logEvent("tengu_post_tool_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: ye(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_cancelled",
                hookName: `PostToolUse:${tool.name}`,
                toolUseID: toolUseID,
                hookEvent: "PostToolUse",
              }),
            });
          continue;
        }
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield { message: result.message };
        if (result.blockingError)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_blocking_error",
              hookName: `PostToolUse:${tool.name}`,
              toolUseID: toolUseID,
              hookEvent: "PostToolUse",
              blockingError: result.blockingError,
            }),
          };
        let we = Q0(tool);
        if (we && (result.updatedToolOutput !== void 0 || result.updatedMCPToolOutput !== void 0))
          logForDebugging(
            `PostToolUse hook for ${tool.name} tried to rewrite an account memory server answer; the rewrite was dropped`,
            { level: "warn" },
          );
        if (result.updatedToolOutput !== void 0 && !we) yield { updatedToolOutput: result.updatedToolOutput };
        if (result.updatedMCPToolOutput !== void 0 && isMcpTool(tool) && !we)
          yield { updatedToolOutput: result.updatedMCPToolOutput };
        if (result.preventContinuation) {
          yield {
            message: createAttachmentMessage_2({
              type: "hook_stopped_continuation",
              message: result.stopReason || cPe,
              hookName: `PostToolUse:${tool.name}`,
              toolUseID: toolUseID,
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
              toolUseID: toolUseID,
              hookEvent: "PostToolUse",
            }),
          };
        if (result.classifierContexts && result.classifierContexts.length > 0) {
          let Ee =
            result.pairedRewrite === "none"
              ? "none"
              : result.pairedRewrite === "direct" ||
                  (result.pairedRewrite === "legacy_mcp" && isMcpTool(tool))
                ? "pending"
                : "never-applied";
          for (let classifierContext of result.classifierContexts)
            yield { classifierContext: classifierContext, pairing: Ee };
        }
      } catch (error) {
        let postToolDurationMs = Date.now() - postToolStartTime;
        (logEvent("tengu_post_tool_hook_error", {
          messageID: ye(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? !1,
          duration: postToolDurationMs,
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
          ...(requestId && { requestId: ye(requestId) }),
        }),
          yield {
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              content: formatToolErrorMessage(error),
              hookName: `PostToolUse:${tool.name}`,
              toolUseID: toolUseID,
              hookEvent: "PostToolUse",
            }),
          });
      }
  } catch (error) {
    if (isAbortError(error)) {
      if (toolUseContext.abortController.signal.aborted) throw error;
      if (error instanceof StreamClosedAbortError) {
        logForDebugging("PostToolUse hook cancelled (control stream closed)");
        return;
      }
      (logForDebugging("PostToolUse hook timed out (per-hook abort)"),
        logEvent("tengu_sdk_hook_callback_timeout", {
          hookEvent: lit_2("PostToolUse"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
        }));
      return;
    }
    logError(withTelemetryMessage(toError(error), "PostToolUse hook dispatch failed"));
  }
}
/**
 * runPostToolUseFailureHooks：工具失败（含中断）后执行 PostToolUseFailure hooks，产出 hook 消息与附加上下文。
 */
//@ chunk-e6aww6q8.js:3888827-3890783 fingerprint = runPostToolUseFailureHooks (0.806)
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
  if (!YN(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)) return;
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
      void 0,
      toolDurationMs,
    ))
      try {
        if (result.message?.type === "attachment" && result.message.attachment.type === "hook_cancelled") {
          (logEvent("tengu_post_tool_failure_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: ye(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_cancelled",
                hookName: `PostToolUseFailure:${tool.name}`,
                toolUseID: toolUseID,
                hookEvent: "PostToolUseFailure",
              }),
            });
          continue;
        }
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield { message: result.message };
        if (result.blockingError)
          yield {
            message: createAttachmentMessage_2({
              type: "hook_blocking_error",
              hookName: `PostToolUseFailure:${tool.name}`,
              toolUseID: toolUseID,
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
              toolUseID: toolUseID,
              hookEvent: "PostToolUseFailure",
            }),
          };
      } catch (hookError) {
        let postToolDurationMs = Date.now() - postToolStartTime;
        (logEvent("tengu_post_tool_failure_hook_error", {
          messageID: ye(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? !1,
          duration: postToolDurationMs,
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
          ...(requestId && { requestId: ye(requestId) }),
        }),
          yield {
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              content: formatToolErrorMessage(hookError),
              hookName: `PostToolUseFailure:${tool.name}`,
              toolUseID: toolUseID,
              hookEvent: "PostToolUseFailure",
            }),
          });
      }
  } catch (outerError) {
    if (isAbortError(outerError)) {
      if (toolUseContext.abortController.signal.aborted)
        logForDebugging("PostToolUseFailure hook cancelled (parent abort)");
      else if (outerError instanceof StreamClosedAbortError)
        logForDebugging("PostToolUseFailure hook cancelled (control stream closed)");
      else
        (logForDebugging("PostToolUseFailure hook timed out (per-hook abort)"),
          logEvent("tengu_sdk_hook_callback_timeout", {
            hookEvent: lit_2("PostToolUseFailure"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
          }));
      return;
    }
    logError(withTelemetryMessage(toError(outerError), "PostToolUseFailure hook dispatch failed"));
  }
}
/**
 * 在 resolveHookPermissionDecision 之后再加一道：工具被限定运行位置（_M）而 allow 没有经过对应确认时改判为拒绝。
 */
//@ chunk-e6aww6q8.js:3890783-3891073 layout
async function resolvePermissionDecisionForCall(
  hookPermissionResult,
  tool,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  toolUseID,
) {
  let w = await resolveHookPermissionDecision(
    hookPermissionResult,
    tool,
    input,
    toolUseContext,
    canUseTool,
    assistantMessage,
    toolUseID,
  );
  if (_M(tool) !== void 0 && w.decision.behavior === "allow" && !i2e(w.decision))
    return (
      logForDebugging(`${tool.name} denied before call: ${describeNonClassifierAllow(w.decision)}`, {
        level: "warn",
      }),
      toolUseContext.toolDecisions.delete(toolUseID),
      { decision: buildClassifierOnlyDenial(tool, describeNonClassifierAllow(w.decision)), input: w.input }
    );
  return w;
}
/**
 * 取 hook 权限结论里的 updatedInput（allow/ask 才有），否则用原输入。
 */
//@ chunk-e6aww6q8.js:3891073-3891167 layout
function getHookUpdatedInput(hookPermissionResult, input) {
  return (
    (hookPermissionResult?.behavior === "allow" || hookPermissionResult?.behavior === "ask"
      ? hookPermissionResult.updatedInput
      : void 0) ?? input
  );
}
/**
 * resolveHookPermissionDecision：把 PreToolUse hook 的权限结论与正常权限流程合并。hook allow 仍要过 deny/ask 规则；hook ask 或无结论走 canUseTool；返回最终决策与（可能被改写的）输入。
 */
//@ chunk-e6aww6q8.js:3891167-3894038 fingerprint = resolveHookPermissionDecision (0.405)
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
    return { decision: { behavior: "allow", updatedInput: input }, input: input };
  let w = settingsProblemDenial();
  if (w !== null) return { decision: w, input: input };
  let requireCanUseTool = toolUseContext.requireCanUseTool;
  if (hookPermissionResult?.behavior === "deny")
    return (
      logForDebugging(`Hook denied tool use for ${tool.name}`),
      runPermissionPipeline(hookPermissionResult, {
        tool: tool,
        input: input,
        toolUseContext: toolUseContext,
        canUseTool: canUseTool,
        assistantMessage: assistantMessage,
        toolUseID: toolUseID,
      })
    );
  if (hookPermissionResult?.behavior !== "allow" && hookPermissionResult?.behavior !== "ask")
    return {
      decision: await canUseTool(tool, input, toolUseContext, assistantMessage, toolUseID),
      input: input,
    };
  let behavior = hookPermissionResult.behavior,
    q = getHookUpdatedInput(hookPermissionResult, input),
    Z =
      hookPermissionResult.behavior === "ask"
        ? dropStaleHostDisplay(hookPermissionResult, q)
        : hookPermissionResult,
    Se = Z.behavior === "ask" && Z.hostDisplay !== void 0 ? Z : void 0,
    ke = G7(q);
  if (ke !== null) return { decision: ke, input: q };
  let we =
    (await checkRuleBasedPermissions(
      tool,
      q,
      { ...toolUseContext, toolUseId: toolUseID },
      {
        hookUpdatedInput: hookPermissionResult.updatedInput,
        planModeWriteFloor: behavior === "allow",
        hookAsked: behavior === "ask",
        ...(Se !== void 0 && { crashIsObjection: !0 }),
      },
    )) ?? (await checkRuleBasedPermissionsOnToolHost(tool, q, toolUseContext, assistantMessage, toolUseID));
  if (we?.behavior === "deny")
    return (
      logForDebugging(
        `Hook returned '${behavior}' for ${tool.name}, but deny rule overrides (deny's reason type: ${we.decisionReason?.type ?? "none"})`,
      ),
      runPermissionPipeline(appendRuleAnnotation(we), {
        tool: tool,
        input: q,
        toolUseContext: toolUseContext,
        canUseTool: canUseTool,
        assistantMessage: assistantMessage,
        toolUseID: toolUseID,
      })
    );
  if (we?.behavior === "ask" && Se !== void 0)
    return (
      logFeatureBad("permission_host_worded_ask", "pipeline_also_asks"),
      {
        decision: forwardHostWordedAsk(tool.name, "the plain permission prompt raised for this call", {
          hostWorded: !0,
        }),
        input: q,
      }
    );
  if (we?.behavior === "ask") {
    let Ee = behavior === "ask";
    return (
      logForDebugging(
        `Hook returned '${behavior}' for ${tool.name}, but an ask rule, a safety check, a ToolHost's person-only ask or plan mode requires the full permission pipeline${Ee ? " (hookAskFloor \u2014 a classifier allow re-surfaces as this ask)" : ""}`,
      ),
      {
        decision: await canUseTool(
          tool,
          q,
          Ee ? { ...toolUseContext, hookAskFloor: !0 } : toolUseContext,
          assistantMessage,
          toolUseID,
        ),
        input: q,
      }
    );
  }
  if (behavior === "allow") {
    if (requireCanUseTool)
      return (
        logForDebugging(`Hook approved tool use for ${tool.name}, but canUseTool is required`),
        { decision: await canUseTool(tool, q, toolUseContext, assistantMessage, toolUseID), input: q }
      );
    let Ee = getToolPermissionContext(toolUseContext),
      Ae = isAutoAllowedInMode(tool, Ee),
      Ie = isAutoClassifierActive(Ae) && requiresClassifierForHookAllow(tool),
      Me = !Ie && Ae === "auto" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_knuth", !1),
      We = !Ie && !Me && XH(tool, Ee),
      ze = !Ie && !Me && RL(tool, Ee),
      lt = !Ie && !Me && !We && !ze && isRemoteBrowserToolUnderModeFloor(tool);
    if (!tool.requiresUserInteraction?.() && (Ie || Me || We || ze || lt)) {
      let Je =
          hookPermissionResult.decisionReason?.type === "hook" ? hookPermissionResult.decisionReason : void 0,
        nt = !lt || isAutoClassifierActive(Ae);
      if (nt)
        logEvent("tengu_auto_mode_hook_allow_funneled", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? !1,
          remoteSessionMcp: We,
          coworkWeb: ze,
          hookSource: fromEnumOpt(hookSourceKind(Je?.hookSource)),
          agentMsgId: ye(assistantMessage.message.id),
          toolUseId: ye(toolUseID),
        });
      return (
        logForDebugging(
          nt
            ? `Hook approved tool use for ${tool.name}, but auto mode requires classifier adjudication`
            : `Hook approved tool use for ${tool.name}, but a hook cannot approve a call to CCR's cloud browser; the normal permission check decides`,
        ),
        {
          decision: await canUseTool(
            tool,
            q,
            { ...toolUseContext, hookAllowVouched: !0 },
            assistantMessage,
            toolUseID,
          ),
          input: q,
        }
      );
    }
    return (
      logForDebugging(
        tool.requiresUserInteraction?.()
          ? `Hook satisfied user interaction for ${tool.name} via updatedInput`
          : `Hook approved tool use for ${tool.name}, bypassing permission prompt`,
      ),
      countMcpPolicyRecheckSkipped("preToolUseHook", tool, q, toolUseContext, assistantMessage, toolUseID),
      runPermissionPipeline(hookPermissionResult, {
        tool: tool,
        input: q,
        toolUseContext: toolUseContext,
        canUseTool: canUseTool,
        assistantMessage: assistantMessage,
        toolUseID: toolUseID,
      })
    );
  }
  return runPermissionPipeline(Z, {
    tool: tool,
    input: q,
    toolUseContext: toolUseContext,
    canUseTool: canUseTool,
    assistantMessage: assistantMessage,
    toolUseID: toolUseID,
  });
}
/**
 * 权限评估管线：先规则/模式评估（aWr），再分类器/后处理（nWr）；有输入级硬拒绝直接返回；allow 但上下文要求 requireCanUseTool、或结论为 ask 时调用 canUseTool（必要时禁止"总是允许"）。
 */
//@ chunk-e6aww6q8.js:3894038-3894954 layout
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
    ),
    s = await personAskAfterHooks(
      enforceClassifierOnlyDecision(
        request.tool,
        decision.behavior === "ask" && decision.hostDisplay !== void 0 && r.behavior !== "deny"
          ? decision
          : r,
      ),
      {
        tool: request.tool,
        input: request.input,
        context: request.toolUseContext,
        toolUseID: request.toolUseID,
      },
    ),
    h = s.behavior === "deny" ? null : G7(request.input);
  if (h !== null) return { decision: h, input: request.input };
  if (s.behavior === "allow" && request.toolUseContext.requireCanUseTool === !0)
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
  if (s.behavior !== "ask") return { decision: s, input: request.input };
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
      ) || e_e(request.tool, getToolPermissionContext(request.toolUseContext))
        ? { ...s, suppressAlwaysAllowRule: !0 }
        : s,
    ),
    input: request.input,
  };
}
/**
 * runPreToolUseHooks：执行 PreToolUse hooks。产出 message、hookPermissionResult（allow/deny/ask/defer）、hookUpdatedInput（改写后再过 validateInput）、preventContinuation/stopReason、additionalContext、stop；hook 超时或异常时视为阻止执行并给出固定文案。
 */
//@ chunk-e6aww6q8.js:3894954-3900124 fingerprint = runPreToolUseHooks (0.724)
async function* runPreToolUseHooks(
  toolUseContext,
  tool,
  toolInput,
  toolUseID,
  messageId,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  validateInput = (G) => tool.validateInput?.(G, { ...toolUseContext, toolUseId: toolUseID }),
) {
  if (!YN(tool, toolUseContext.options.bareFork, toolUseContext.options.settingsHooksOff)) return;
  let hookStartTime = Date.now(),
    q,
    Z,
    Se,
    ke;
  function we() {
    return toolUseContext.remoteCall !== void 0 || getRemoteHookRunner(toolUseContext) !== void 0;
  }
  let Ee,
    Ae,
    Ie = {};
  try {
    for await (let result of executePreToolHooks(
      tool.name,
      toolUseID,
      toolInput,
      toolUseContext,
      getToolPermissionContext(toolUseContext).mode,
      toolUseContext.abortController.signal,
      void 0,
      void 0,
      Ie,
    ))
      try {
        if (
          result.message &&
          !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
        )
          yield { type: "message", message: { message: result.message } };
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
                ...(result.blockingError.hookDidNotFinish && { hookDidNotFinish: !0 }),
              },
            };
          yield { type: "hookPermissionResult", hookPermissionResult: Z };
        }
        let updatedInput = result.updatedInput;
        if (updatedInput !== void 0) {
          let lt = await validateHookUpdatedInput(tool, updatedInput, {
            event: "PreToolUse",
            source: result.hookSource,
            applies: result.permissionBehavior !== "deny" && result.permissionBehavior !== "defer",
            validate: validateInput,
          }).catch((Je) => {
            if (isAbortError(Je) && toolUseContext.abortController.signal.aborted) return "cancelled";
            throw Je;
          });
          if (lt === "cancelled") {
            yield { type: "stop" };
            return;
          }
          if (!lt.ok) {
            if (((Z = lt.deny), (ke = lt.deny), toolUseContext.remoteCall !== void 0))
              _1e(toolUseContext.remoteCall, lt.deny);
            yield { type: "hookPermissionResult", hookPermissionResult: Z };
            continue;
          }
          ((updatedInput = lt.input),
            yield {
              type: "hookRewriterKind",
              kind: result.rewriterKind ?? "remote",
              source: result.rewriteSource ?? result.hookSource,
            });
        }
        let ze = result.permissionBehavior !== "deny" && obe(tool, toolInput, result.updatedInput);
        if (ze) {
          if (
            ((Se = guardAccountMemoryHookRewrite(tool, "PreToolUse", result.hookSource)),
            (Z = Se),
            toolUseContext.remoteCall !== void 0)
          )
            _1e(toolUseContext.remoteCall, Se);
          yield { type: "hookPermissionResult", hookPermissionResult: Z };
        }
        if (result.preventContinuation) {
          if ((yield { type: "preventContinuation", shouldPreventContinuation: !0 }, result.stopReason))
            ((Ae = result.stopReason), yield { type: "stopReason", stopReason: result.stopReason });
        }
        if (ze) continue;
        if (result.permissionBehavior !== void 0) {
          if (
            (logForDebugging(`Hook result has permissionBehavior=${result.permissionBehavior}`),
            result.permissionBehavior === "defer")
          ) {
            q = result.hookSource || `PreToolUse:${tool.name}`;
            continue;
          }
          let lt = {
            type: "hook",
            hookName: `PreToolUse:${tool.name}`,
            hookSource: result.hookSource,
            hookPluginId: result.hookPluginId,
            reason: result.hookPermissionDecisionReason,
            ...(result.heldForServedCall && { heldForServedCall: !0 }),
          };
          if (result.permissionBehavior === "allow")
            yield {
              type: "hookPermissionResult",
              hookPermissionResult:
                we() && (Z ?? Ee) !== void 0
                  ? (Z ?? Ee)
                  : (ke ?? { behavior: "allow", updatedInput: updatedInput, decisionReason: lt }),
            };
          else if (result.permissionBehavior === "ask") {
            let Je = Ee === void 0;
            ((Ee = {
              behavior: "ask",
              updatedInput: updatedInput,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason: lt,
              ...(Je &&
                result.permissionDisplay && {
                  hostDisplay: result.permissionDisplay,
                  hostDisplayInput: updatedInput ?? toolInput,
                  suppressAlwaysAllowRule: !0,
                  defaultToNo: !0,
                }),
            }),
              yield {
                type: "hookPermissionResult",
                hookPermissionResult: we() && Z !== void 0 ? Z : (ke ?? Ee),
              });
          } else {
            let Je = {
              behavior: result.permissionBehavior,
              message:
                result.hookPermissionDecisionReason ||
                `Hook PreToolUse:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
              decisionReason: lt,
            };
            ((Z = Je), yield { type: "hookPermissionResult", hookPermissionResult: Je });
          }
        }
        if (updatedInput && result.permissionBehavior === void 0)
          yield { type: "hookUpdatedInput", updatedInput: updatedInput };
        if (result.additionalContexts && result.additionalContexts.length > 0)
          yield {
            type: "additionalContext",
            message: {
              message: createAttachmentMessage_2({
                type: "hook_additional_context",
                content: result.additionalContexts,
                hookName: `PreToolUse:${tool.name}`,
                toolUseID: toolUseID,
                hookEvent: "PreToolUse",
              }),
            },
          };
        if (toolUseContext.abortController.signal.aborted) {
          (logEvent("tengu_pre_tool_hooks_cancelled", {
            toolName: sanitizeToolNameForAnalytics(tool.name),
            queryChainId: ye(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
          }),
            yield {
              type: "message",
              message: {
                message: createAttachmentMessage_2({
                  type: "hook_cancelled",
                  hookName: `PreToolUse:${tool.name}`,
                  toolUseID: toolUseID,
                  hookEvent: "PreToolUse",
                }),
              },
            },
            yield { type: "stop" });
          return;
        }
      } catch (error) {
        logError(error);
        let ze = Date.now() - hookStartTime;
        if (
          (logEvent("tengu_pre_tool_hook_error", {
            messageID: ye(messageId),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            isMcp: tool.isMcp ?? !1,
            duration: ze,
            queryChainId: ye(toolUseContext.queryTracking?.chainId),
            queryDepth: toolUseContext.queryTracking?.depth,
            ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
            ...(requestId && { requestId: ye(requestId) }),
          }),
          yield {
            type: "message",
            message: {
              message: createAttachmentMessage_2({
                type: "hook_error_during_execution",
                content: formatToolErrorMessage(error),
                hookName: `PreToolUse:${tool.name}`,
                toolUseID: toolUseID,
                hookEvent: "PreToolUse",
              }),
            },
          },
          Z)
        ) {
          yield { type: "hookPermissionResult", hookPermissionResult: Z };
          return;
        } else {
          if (q) (yield { type: "defer", hookName: q }, (q = void 0));
          yield { type: "stop", stopReason: Ae ?? PRE_TOOL_HOOK_ERROR_MESSAGE };
        }
      }
  } catch (error) {
    let We = Ie.deniedBefore
      ? `${Ie.deniedBefore}

`
      : "";
    if (isAbortError(error))
      if (toolUseContext.abortController.signal.aborted)
        logForDebugging("PreToolUse hook cancelled (parent abort)");
      else if (error instanceof StreamClosedAbortError)
        logForDebugging("PreToolUse hook cancelled (control stream closed)");
      else {
        if (
          (logForDebugging("PreToolUse hook timed out (per-hook abort)"),
          logEvent("tengu_sdk_hook_callback_timeout", {
            hookEvent: lit_2("PreToolUse"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
          }),
          Z)
        )
          yield { type: "hookPermissionResult", hookPermissionResult: Z };
        else {
          if (q) yield { type: "defer", hookName: q };
          yield { type: "stop", stopReason: Ae ?? We + PRE_TOOL_HOOK_TIMEOUT_MESSAGE };
        }
        return;
      }
    else {
      if ((logError(withTelemetryMessage(toError(error), "PreToolUse hook dispatch failed")), Z))
        yield { type: "hookPermissionResult", hookPermissionResult: Z };
      else {
        if (q) yield { type: "defer", hookName: q };
        yield { type: "stop", stopReason: Ae ?? We + PRE_TOOL_HOOK_ERROR_MESSAGE };
      }
      return;
    }
    yield { type: "stop" };
    return;
  }
  if (q && !Z) yield { type: "defer", hookName: q };
  if (Se) yield { type: "hookPermissionResult", hookPermissionResult: Se };
}
/**
 * 限制钩子 additionalContext 的总长度：逐条加入，超出时截断剩余条目。
 */
//@ chunk-s61vbvea.js:610375-610638 placement
async function capAdditionalContext(entries, event, storage) {
  let s = [],
    h = 0,
    y = 0;
  while (y < entries.length) {
    let S = entries[y] ?? "",
      w = ofr - h,
      R = S.length <= Math.min(RAn, w),
      P = R || w >= OE ? [S] : entries.slice(y),
      j = R
        ? S
        : await truncateAdditionalContext({
            entries: P,
            limit: Math.max(0, Math.min(RAn, w)),
            event: event,
            storageV5: storage,
          });
    (s.push(j), (h += j.length), (y += P.length));
  }
  return s;
}

export {
  capAdditionalContext,
  isRunUnchanged,
  $Nn,
  makeErrorResultAppender,
  dropBlockingErrors,
  VN,
  INn,
  Zqr,
  fVr,
  runPostToolUseHooksForMemory,
  ANn,
  iVr,
  PNn,
  findToolResultBlock,
  replaceToolResult,
  isHookStoppedMessage,
  buildHookStoppedMessage,
  YN,
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
