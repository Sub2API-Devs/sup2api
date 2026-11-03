/**
 * components/permissions/hooks.ts
 *
 * 权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/hooks.ts
 * pieces: chunk-re9y5nwg.js (24), chunk-s4bxxzsw.js (4), chunk-wyqg6m3h.js (1)
 * attribution: placement 24, callgraph-fingerprint 1, layout 2, callgraph-witnessed 1, fingerprint 1
 */
import { createHash } from "crypto";
import {
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
  FILE_EDIT_TOOL_NAME,
} from "../../tools/FileEditTool/constants.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";
import { expandPath } from "../../utils/path.js";
import { coerceBooleanString } from "../../utils/spellcheck.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import {
  permissionRequestOrigin,
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  FILE_PERMISSION_CARD,
  getCompletionTypeForTool,
  BASH_PERMISSION_CARD,
  buildBashPermissionPayload,
  isNotAskUserQuestionCard,
  autoDenyPresenceSignal,
} from "./permissionCardKinds.js";
import {
  WorkflowTool,
  workflowUsageConsentModule,
  ACCOUNT_MEMORY_PERMISSION_MODULE,
  WITHDRAWN_REQUEST_ANSWER_TEXT,
} from "./permissionCardRegistry.js";
import { CountedAsk } from "../../utils/countedAsk.js";
import { createResolveOnce } from "../../hooks/toolPermission/PermissionContext.js";
import { hasHostField } from "../../bridge/deviceRegistration.js";
import {
  shouldAcceptCommandDomains,
  rememberCommandNetworkLists,
} from "../../tools/BashTool/sandboxNetwork.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  PERMISSION_PROMPT_DIALOG,
  isUnattendedAgentContext,
  isSubagentContext,
} from "../../utils/agentContext.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { classifyBashCommand } from "../../utils/permissions/bashClassifier.js";
import { getIdeDiffTarget, useDiffInIDE } from "../../hooks/useDiffInIDE.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { BashTool } from "../../tools/BashTool/BashTool.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { lit, fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { mcpToolLogFields } from "../../hooks/toolPermission/permissionLogging.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logUnaryEvent } from "../../utils/unaryLogging.js";
import { env } from "../../utils/env.js";
import { attentionRegistryStore } from "../fleet/sessionAttention.js";
import {
  handleInteractivePermission,
  bridgeApprovalPrompt,
} from "../../hooks/toolPermission/handlers/interactiveHandler.js";
import { commitProvisionalRecord, dropPermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { isAsyncIterable } from "../dialogs/dialogRequests.js";
import { permissionModeSignal } from "../../utils/permissions/permissionSetup.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isRealAutoDenyWindow, withAutoDenyDeadline } from "../../utils/permissions/autoModeUnavailable.js";
import {
  isBypassImmuneDecision,
  hasPermissionsToUseTool,
  resetDenialStreakAfterUserApproval,
  markOutsideReadPromptSeen,
  persistBlockReadsOutsideWorkspace,
  withDenialDeadline,
  stripAutoDenyFields,
} from "../../utils/permissions/permissions.js";
import { logError } from "../../utils/log.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  resetUnansweredSafetyCheckCount,
  isUnansweredWindowExpired,
  incrementUnansweredSafetyCheckCount,
  setUnansweredWindowExpired,
} from "../../tools/BashTool/bashPermissionFlags.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { SUBAGENT_REJECT_MESSAGE } from "../../utils/messages.js";
import { otherDialogOnScreen, onBlockingDialogChange } from "../../services/requestUserDialog.js";
import { sanitizeName } from "../../plugins/bundled/diffPane/diffModel.js";

//@ chunk-re9y5nwg.js:459-587 placement = parseSkillPaths (0.822)
/**
 * 判断 frontmatter 字符串是否为指定前缀下、以 /** 结尾且不含 .. 的目录 glob。
 */
function isSkillDirGlob(frontmatter) {
  return (
    !!frontmatter &&
    (frontmatter.startsWith(CLAUDE_FOLDER_PERMISSION_PATTERN.slice(0, -2)) ||
      frontmatter.startsWith(GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN.slice(0, -2))) &&
    !frontmatter.includes("..") &&
    frontmatter.endsWith("/**")
  );
}
//@ chunk-re9y5nwg.js:587-834 placement
function isSkillDirectoryGlob(ruleContent) {
  let found = [CLAUDE_FOLDER_PERMISSION_PATTERN, GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN]
    .map((o) => `${o.slice(0, -2)}skills/`)
    .find((o) => ruleContent.startsWith(o));
  if (found === undefined || !ruleContent.endsWith("/**")) return false;
  let sliced = ruleContent.slice(found.length, -3);
  return (
    /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(sliced) && !sliced.includes("..") && foldName(sliced) !== "synced"
  );
}
//@ chunk-re9y5nwg.js:834-858 placement
var APPROVALSURFACE = "approvalSurface";
//@ chunk-re9y5nwg.js:858-979 placement
/**
 * 判断权限结果是否为宿主对话框批准的 allow。
 */
function isHostDialogApproval(response) {
  return (
    typeof response === "object" &&
    response !== null &&
    "behavior" in response &&
    response.behavior === "allow" &&
    APPROVALSURFACE in response &&
    response[APPROVALSURFACE] === "host_dialog"
  );
}
//@ chunk-re9y5nwg.js:979-1319 placement
function fileEditContextOf(toolName, n) {
  let { file_path: filePath } = n;
  if (typeof filePath !== "string") return;
  let o;
  if (toolName === FILE_EDIT_TOOL_NAME) {
    let { old_string: oldString, new_string: newString } = n;
    if (typeof oldString !== "string" || typeof newString !== "string") return;
    o = [toolName, expandPath(filePath), oldString, newString, coerceBooleanString(n.replace_all) === true];
  } else if (toolName === FILE_WRITE_TOOL_NAME) {
    let { content } = n;
    if (typeof content !== "string") return;
    o = [toolName, expandPath(filePath), content];
  } else return;
  return createHash("sha256").update(jsonStringify(o)).digest("hex");
}
//@ chunk-re9y5nwg.js:1319-1370 placement
var permissionCallStatsStore = new SessionRootSlot(() => ({
  calls: new Map(),
  hostAttests: false,
}));
//@ chunk-re9y5nwg.js:1370-1394 placement
/**
 * 函数 returnFalsePermissionHook（恒 false）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function returnFalsePermissionHook() {
  return false;
}
//@ chunk-re9y5nwg.js:1394-1597 placement
/**
 * 记录宿主已确认的工具调用（工具名、展开后的文件路径与写入摘要），供后续核对写入。
 */
function recordHostAttestedCall(session, n, t) {
  if (n !== "" && returnFalsePermissionHook()) {
    let o = permissionCallStatsStore.of(session);
    let filePath = t.input.file_path;
    o.calls.set(n, {
      toolName: t.toolName,
      filePath: typeof filePath === "string" ? expandPath(filePath) : undefined,
      writeDigest: fileEditContextOf(t.toolName, t.input),
    });
    o.hostAttests = true;
  }
}
//@ chunk-re9y5nwg.js:1597-1655 placement
/**
 * 函数 hasHostAttestedDialog（host 佐证过且开关开启）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function hasHostAttestedDialog(session) {
  return permissionCallStatsStore.peek(session)?.hostAttests === true && returnFalsePermissionHook();
}
//@ chunk-re9y5nwg.js:1655-1695 placement
var permissionByToolUseStore = new SessionRootSlot(() => ({
  byToolUse: new Map(),
}));
//@ chunk-re9y5nwg.js:1695-1769 placement
/**
 * 函数 recordToolUseDecision（追加一条决定）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function recordToolUseDecision(e, n, t) {
  let { byToolUse } = permissionByToolUseStore.of(e);
  byToolUse.set(n, [...(byToolUse.get(n) ?? []), t]);
}
//@ chunk-re9y5nwg.js:1769-1930 placement
/**
 * 工具调用结束时清除该 toolUseId 的已记录调用与挂起的回调（并依次执行回调）。
 */
function clearToolUsePermissionState(session, n) {
  if (session !== undefined) {
    permissionCallStatsStore.peek(session)?.calls.delete(n);
    let t = permissionByToolUseStore.peek(session)?.byToolUse.get(n);
    if (t !== undefined) {
      permissionByToolUseStore.peek(session)?.byToolUse.delete(n);
      for (let o of t) o();
    }
  }
}
//@ chunk-re9y5nwg.js:1930-2000 placement
/**
 * 函数 dialogSourceFor（有记录则来源为 host_dialog）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function dialogSourceFor(session, toolUseId) {
  return permissionCallStatsStore.peek(session)?.calls.has(toolUseId) ? "host_dialog" : undefined;
}
//@ chunk-re9y5nwg.js:2000-2242 placement
/**
 * 判断写入/编辑调用是否与宿主确认过的调用一致（同工具、同路径、同写入摘要）。
 */
function isHostAttestedWrite(session, toolUseId, file) {
  if (
    toolUseId === undefined ||
    (file.toolName !== FILE_WRITE_TOOL_NAME && file.toolName !== FILE_EDIT_TOOL_NAME)
  )
    return false;
  let o = permissionCallStatsStore.peek(session)?.calls.get(toolUseId);
  return (
    o !== undefined &&
    o.toolName === file.toolName &&
    o.filePath === file.absolutePath &&
    o.writeDigest !== undefined &&
    o.writeDigest === fileEditContextOf(file.toolName, file.input)
  );
}
//@ chunk-re9y5nwg.js:2242-2336 placement
var weakRefSet = new Set();
var editRuleContentsStore = new SessionRootSlot(() => {
  let e = new Set();
  weakRefSet.add(new WeakRef(e));
  return {
    editRuleContents: e,
  };
});
//@ chunk-re9y5nwg.js:2336-2553 placement
function getSessionEditRuleContents(e) {
  return e.flatMap((n) =>
    (n.type === "addRules" || n.type === "replaceRules") &&
    n.destination === "session" &&
    n.behavior === "allow"
      ? n.rules.flatMap((rule) =>
          rule.toolName === FILE_EDIT_TOOL_NAME && rule.ruleContent !== undefined ? [rule.ruleContent] : [],
        )
      : [],
  );
}
//@ chunk-re9y5nwg.js:2553-2575 placement
function returnFalseEditRules() {
  return false;
}
//@ chunk-re9y5nwg.js:2575-2687 placement
function isSkillEditRule(e) {
  let n = permissionRuleValueFromString(e);
  return (
    n.toolName === FILE_EDIT_TOOL_NAME &&
    n.ruleContent !== undefined &&
    isSkillDirGlob(n.ruleContent) &&
    !isSkillDirectoryGlob(n.ruleContent)
  );
}
//@ chunk-re9y5nwg.js:2687-2955 placement
function isSessionRuleUpdate(update) {
  if (
    returnFalseEditRules() &&
    (update.type === "addRules" || update.type === "replaceRules") &&
    update.destination === "session" &&
    update.behavior === "allow"
  ) {
    let filtered = update.rules.filter((rule) => !isSkillEditRule(formatPermissionRule(rule)));
    if (filtered.length === update.rules.length) return update;
    return filtered.length === 0 && update.type === "addRules"
      ? undefined
      : {
          ...update,
          rules: filtered,
        };
  }
  return update;
}
//@ chunk-re9y5nwg.js:2955-3005 placement
/**
 * 函数 filterEditableRules（开关关闭时保持原列表）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function filterEditableRules(e) {
  return returnFalseEditRules() ? e.filter((n) => !isSkillEditRule(n)) : e;
}
//@ chunk-re9y5nwg.js:3005-3073 placement
/**
 * 函数 recordEditedRuleContents（登记编辑后的规则内容）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function recordEditedRuleContents(session, n) {
  for (let t of getSessionEditRuleContents(n)) editRuleContentsStore.of(session).editRuleContents.add(t);
}
//@ chunk-re9y5nwg.js:3073-3176 placement
/**
 * 从会话的编辑规则内容表中删除指定规则。
 */
function forgetSessionEditRules(session, n) {
  let editRuleContents = editRuleContentsStore.peek(session)?.editRuleContents;
  if (editRuleContents === undefined) return;
  for (let o of getSessionEditRuleContents(n)) editRuleContents.delete(o);
}
//@ chunk-re9y5nwg.js:3176-3322 placement = propagateAbort (1)
function propagateAbort(updates) {
  let sessionEditRuleContents = getSessionEditRuleContents(updates);
  if (sessionEditRuleContents.length === 0) return;
  for (let weakRef of weakRefSet) {
    let parent = weakRef.deref();
    if (parent === undefined) {
      weakRefSet.delete(weakRef);
      continue;
    }
    for (let sessionEditRuleContent of sessionEditRuleContents) parent.delete(sessionEditRuleContent);
  }
}
//@ chunk-re9y5nwg.js:3322-3811 callgraph-fingerprint = decisionReasonToString (0.167)
/**
 * 把决策原因映射为日志 surface 字符串（rule/session/host_dialog 等）。
 */
function decisionReasonToString(session, decisionReason, toolPermissionContext) {
  let editRuleContents = editRuleContentsStore.peek(session)?.editRuleContents;
  if (editRuleContents === undefined || editRuleContents.size === 0) return;
  let s = new Set(
    (toolPermissionContext.alwaysAllowRules.session ?? []).flatMap((i) => {
      let l = permissionRuleValueFromString(i);
      return l.toolName === FILE_EDIT_TOOL_NAME && l.ruleContent !== undefined ? [l.ruleContent] : [];
    }),
  );
  for (let editRuleContent of editRuleContents)
    if (!s.has(editRuleContent)) editRuleContents.delete(editRuleContent);
  if (
    decisionReason?.type !== "rule" ||
    decisionReason.rule.source !== "session" ||
    decisionReason.rule.ruleBehavior !== "allow" ||
    decisionReason.rule.ruleValue.toolName !== FILE_EDIT_TOOL_NAME ||
    decisionReason.rule.ruleValue.ruleContent === undefined
  )
    return;
  return editRuleContents.has(decisionReason.rule.ruleValue.ruleContent) ? "host_dialog" : undefined;
}
//@ chunk-s4bxxzsw.js:46009-49187 placement
async function repromptFilePermission(e, r) {
  let { ctx, description, result: y } = e;
  let requestSource = permissionRequestOrigin(ctx.toolUseContext);
  let C =
    ctx.tool === WorkflowTool
      ? (x) => {
          if (x.behavior === "allow")
            workflowUsageConsentModule.recordWorkflowUsageConsent(
              ctx.toolUseContext.session.workflowUsageConsent,
              ctx.toolUseContext.storageV5,
            );
          r(x);
        }
      : (x) => {
          ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID);
          r(x);
        };
  let D = new CountedAsk();
  let { resolve, isResolved, claim } = createResolveOnce((x) => {
    D.settle();
    C(x);
  });
  let h = {
    resolve,
    isResolved,
    claim,
    countedAsk: D,
  };
  let w = "dark";
  let B = (x) => ctx.toolUseContext.forRemoteExecution === true || hasHostField(x);
  let F = {
    tool: ctx.tool,
    description,
    toolUseID: ctx.toolUseID,
    assistantMessage: ctx.assistantMessage,
    theme: "dark",
    requestSource,
    session: ctx.toolUseContext.session,
    toolState: ctx.toolUseContext.toolState,
    networkAllowListHonoured:
      !B(y.updatedInput ?? ctx.input) &&
      shouldAcceptCommandDomains(getToolPermissionContext(ctx.toolUseContext)),
  };
  function P() {
    showPermissionDialog(e, h, {
      dialog: PERMISSION_PROMPT_DIALOG,
      buildDescriptor: ({ input, permissionResult }) =>
        buildPermissionPromptPayload({
          ...F,
          ...(ctx.tool.name.startsWith(CFC_TOOL_PREFIX) &&
            permissionResult.inPlaceOfClassifier === true &&
            permissionResult.metadata?.command.description !== undefined && {
              description: permissionResult.metadata.command.description,
            }),
          input,
          permissionResult,
          permissionMode: getToolPermissionContext(ctx.toolUseContext).mode,
        }),
    });
  }
  let E = classifyBashCommand(ctx.tool);
  let V = E?.dialog.kind === BROWSER_PERMISSION_CARD.kind && y.inPlaceOfClassifier === true;
  if (E !== undefined && !V) {
    let hasExternalRacer = !!(
      e.bridgeCallbacks ||
      (e.channelCallbacks && !ctx.tool.requiresUserInteraction?.())
    );
    let { race } = E;
    showPermissionDialog(e, h, {
      dialog: E.dialog,
      resultWhenNotShown: E.resultWhenNotShown,
      buildDescriptor: ({ input, permissionResult }) =>
        E.build({
          ...F,
          input,
          permissionResult,
          hasExternalRacer,
        }),
      onRacersReady:
        race &&
        ((M) =>
          M.addTeardown(
            race({
              ctx,
              claim: h.claim,
              notifyBridge: M.notifyBridge,
              dismissAndTeardown: M.dismissAndTeardown,
              resolveOnce: h.resolve,
            }),
          )),
    });
    return;
  }
  if (isFileTool(ctx.tool)) {
    let x = y.updatedInput ?? ctx.input;
    let toolInputPath = getToolInputPath(ctx.tool, x);
    if (toolInputPath !== null) {
      let M = y.localDisplayOnly === true ? null : await getIdeDiffTarget(ctx.tool, x, ctx.toolUseContext);
      let permissionPromptStartTimeMs = Date.now();
      let H;
      let remoteWorkspace = B(x);
      let filePermissionDescriptor = await buildFilePermissionDescriptor({
        ...F,
        input: x,
        permissionResult: y,
        filePath: toolInputPath,
        remoteWorkspace,
      });
      if (ctx.resolveIfAborted(h.resolve)) return;
      showPermissionDialog(e, h, {
        dialog: FILE_PERMISSION_CARD,
        buildDescriptor: ({ input, permissionResult }) => {
          if (H?.isReprompted() !== true) {
            if (M !== null)
              return {
                ...filePermissionDescriptor,
                permissionResult,
                showingDiffInIDE: true,
                ideName: M.ideName,
              };
            return {
              ...filePermissionDescriptor,
              permissionResult,
            };
          }
          return (async function* () {
            try {
              let toolInputPath = getToolInputPath(ctx.tool, input);
              if (toolInputPath === null)
                throw Error("no file path could be derived from the hook-rewritten input");
              yield await buildFilePermissionDescriptor({
                ...F,
                input,
                permissionResult,
                filePath: toolInputPath,
                remoteWorkspace: B(input),
              });
            } catch (error) {
              logForDebugging(
                `File permission reprompt: cannot preview the hook-rewritten input of ${ctx.tool.name} (${errorMessage(error)}); denying instead of showing a stale preview`,
                {
                  level: "error",
                },
              );
              if (claim()) {
                H?.dismissAndTeardown();
                H?.logRepromptDenyDecision();
                resolve(
                  ctx.cancelAndAbort(
                    `Failed to preview the hook-rewritten file operation: ${errorMessage(error)}`,
                  ),
                );
              }
            }
          })();
        },
        unaryEvent: getCompletionTypeForTool(ctx.tool, x, toolInputPath),
        onRacersReady: (Q) => {
          H = Q;
          if (M === null) return;
          let { closeTab } = useDiffInIDE({
            ctx: Q.ctx,
            tool: ctx.tool,
            input: x,
            permissionResult: y,
            permissionPromptStartTimeMs,
            eligibility: M,
            claim: h.claim,
            notifyBridge: Q.notifyBridge,
            dismissAndTeardown: Q.dismissAndTeardown,
            resolveOnce: h.resolve,
          });
          Q.addTeardown(closeTab);
        },
      });
      return;
    }
    P();
    return;
  }
  if (ctx.tool === BashTool) {
    let toolPermissionContext = getToolPermissionContext(ctx.toolUseContext);
    showPermissionDialog(e, h, {
      dialog: BASH_PERMISSION_CARD,
      buildDescriptor: ({ input, permissionResult }) =>
        buildBashPermissionPayload({
          ...F,
          input,
          permissionResult,
          classifierState: "none",
          toolPermissionContext,
        }),
    });
    return;
  }
  P();
}
//@ chunk-s4bxxzsw.js:49187-49241 layout
class MonotonicCounter {
  last = 0;
  next() {
    this.last += 1;
    return this.last;
  }
}
//@ chunk-s4bxxzsw.js:49241-49266 layout
var counterSlot = new HostScoped(() => new MonotonicCounter());
//@ chunk-s4bxxzsw.js:49266-60333 callgraph-witnessed = usePermissionRequestLogging (0.155)
/**
 * 打开并管理一个权限对话框：用 toolUseContext.requestDialog(dialog, descriptor, …) 入对话框队列，记录 tengu_tool_use_show_permission_request，处理对话框结果（allow/reject/反馈/模式切换/规则持久化）、超时与中止，结束时执行 teardown。
 */
function showPermissionDialog(e, r, n) {
  let {
    description,
    result: y,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    bridgeDialogCallbacks,
    channelCallbacks,
  } = e;
  let { resolve, isResolved, claim, countedAsk } = r;
  let B;
  let F = false;
  let ctx = e.ctx;
  let requestDialog = ctx.toolUseContext.requestDialog;
  if (requestDialog === undefined) return;
  let V = requestDialog;
  let agentContext = ctx.toolUseContext.agentContext;
  let q = isUnattendedAgentContext(ctx.toolUseContext);
  let M = q;
  let askPatience = y.askPatience;
  askPatience?.hold();
  let now = Date.now();
  let ke = counterSlot.of(ctx.toolUseContext.session.host);
  let Re = ke.next();
  let Q = y.updatedInput ?? ctx.input;
  let decisionReason = y.decisionReason;
  let result = y;
  let pe = 0;
  let De;
  let L = [];
  function me() {
    if (L.length === 0) return;
    let _ = L.splice(0, L.length);
    for (let Z of _)
      try {
        Z();
      } catch (error) {
        logForDebugging(`Dialog teardown failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
  }
  let ce = false;
  let ie = n.unaryEvent ?? {
    completion_type: "tool_use_single",
    language_name: lit("none"),
  };
  let signal = ctx.toolUseContext.abortController.signal;
  function Ce() {
    if (ce) return;
    ce = true;
    let permissionMode = ctx.permissionMode;
    ctx.toolUseContext.applyAttributionOp({
      kind: "incrementPermissionPrompt",
    });
    logEvent("tengu_tool_use_show_permission_request", {
      messageID: sanitizeMarkName(ctx.messageId),
      toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
      isMcp: ctx.tool.isMcp ?? false,
      ...mcpToolLogFields(ctx.tool, ctx.toolUseContext.options.mcpClients),
      decisionReasonType: fromEnumOpt(result.decisionReason?.type),
      sandboxEnabled: SandboxManager.isSandboxingEnabled(),
      permissionMode: fromEnum(permissionMode),
      requestSource: fromEnumOpt(permissionRequestOrigin(ctx.toolUseContext)?.type),
      originAgentType: fromEnum(
        isSubagentContext(agentContext) && agentContext.isMainSession ? "main" : agentContext.agentType,
      ),
    });
    logUnaryEvent({
      completion_type: ie.completion_type,
      event: "response",
      metadata: {
        language_name: ie.language_name,
        message_id: ctx.assistantMessage.message.id,
        platform: env.platform,
      },
    });
  }
  function ge(event) {
    logUnaryEvent({
      completion_type: ie.completion_type,
      event,
      metadata: {
        language_name: ie.language_name,
        message_id: ctx.assistantMessage.message.id,
        platform: env.platform,
      },
    });
  }
  function re() {
    De?.abort();
    attentionRegistryStore.clearHookFailure(ctx.toolUseID);
    attentionRegistryStore.closeAsk(ctx.toolUseID);
    He();
    me();
  }
  let Ae = 0;
  let { notifyBridgeAndTeardown } = handleInteractivePermission({
    ctx,
    description,
    result: y,
    displayInput: Q,
    permissionPromptStartTimeMs: now,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    bridgeDialogCallbacks,
    channelCallbacks,
    claim,
    isResolved,
    onWin(_) {
      if (result.offersBlockOutsideReads === true && _.behavior === "allow")
        ctx.toolUseContext.session.outsideReadPrompt.markAnswered();
      re();
      resolve(_);
    },
    onReprompt(_, Z, G) {
      Ae += 1;
      Q = _;
      decisionReason = Z;
      result = {
        ...G,
        ...(result.denialLimitFallback !== undefined && {
          denialLimitFallback: result.denialLimitFallback,
        }),
        ...(result.autoDenyWindow !== undefined && {
          autoDenyWindow: result.autoDenyWindow,
        }),
        ...(result.oneTimeAnswersOnly === true && {
          suggestions: undefined,
          suppressAlwaysAllowRule: true,
          oneTimeAnswersOnly: true,
        }),
        ...(result.offersBlockOutsideReads === true &&
          G.decisionReason?.type === "workingDir" && {
            offersBlockOutsideReads: true,
          }),
      };
      commitProvisionalRecord(ctx.toolUseContext, ctx.toolUseID, _, result, ctx.tool.name);
      let he = De;
      me();
      try {
        lo();
      } finally {
        he?.abort();
      }
    },
    onRemoteDialogAnswer(_) {
      De?.abort();
      mo(_, undefined);
    },
  });
  let we = false;
  let Oe;
  let $e;
  let Be;
  let ze;
  let ve;
  let Le;
  let so = (_) => {
    if (typeof _ !== "object" || _ === null || isAsyncIterable(_)) return;
    let networkAllowHosts = _.networkAllowHosts;
    return Array.isArray(networkAllowHosts) &&
      networkAllowHosts.every((networkAllowHost) => typeof networkAllowHost === "string")
      ? networkAllowHosts
      : undefined;
  };
  let ao = () => {
    if (we || isResolved()) return;
    Oe?.();
    if (ve !== undefined)
      ze?.({
        ...ve,
        permissionResult: result,
      });
  };
  let He = permissionModeSignal.subscribe(() => {
    if (isResolved()) return;
    if (Oe !== undefined && !we) {
      let _ = isAutoAllowedInMode(ctx.tool, getToolPermissionContext(ctx.toolUseContext));
      if (!(
        isAutoClassifierActive(_) ||
        (isRealAutoDenyWindow(y.autoDenyWindow) && _ === "bypassPermissions")
      ))
        ao();
    }
    if (
      isBypassImmuneDecision(
        {
          decisionReason: result.decisionReason,
          forcedByCaller: y.forcedByCaller,
          personOnly: result.personOnly,
        },
        ctx.tool,
        ctx.toolUseContext,
      )
    )
      return;
    hasPermissionsToUseTool(
      ctx.tool,
      ctx.input,
      {
        ...ctx.toolUseContext,
        permissionRound: undefined,
      },
      ctx.assistantMessage,
      ctx.toolUseID,
    )
      .then((_) => {
        if (_.behavior !== "allow") {
          if (isResolved()) ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID);
          return;
        }
        if (!claim()) return;
        dropPermissionRecord(ctx.toolUseContext, ctx.toolUseID);
        He();
        notifyBridgeAndTeardown();
        De?.abort();
        attentionRegistryStore.clearHookFailure(ctx.toolUseID);
        attentionRegistryStore.closeAsk(ctx.toolUseID);
        me();
        ctx.logDecision({
          decision: "accept",
          source: "config",
          decisionReason: _.decisionReason,
          modeAtRecheck: getToolPermissionContext(ctx.toolUseContext).mode,
          surface: decisionReasonToString(
            ctx.toolUseContext.session,
            _.decisionReason,
            getToolPermissionContext(ctx.toolUseContext),
          ),
        });
        resolve(
          ctx.buildAllow(_.updatedInput ?? ctx.input, {
            decisionReason: _.decisionReason,
          }),
        );
      })
      .catch((error) => {
        if (!isAbortError(error))
          logError(
            withTelemetryMessage(toError(error), "permissionRecheckSignal: hasPermissionsToUseTool failed"),
          );
      });
  });
  function lo() {
    let _ = ++pe;
    askPatience?.hold();
    ve = undefined;
    if (true) ut();
    let abortController = new AbortController();
    De = abortController;
    let he = () => abortController.abort();
    if (signal.aborted) abortController.abort();
    else
      signal.addEventListener("abort", he, {
        once: true,
      });
    let descriptor = n.buildDescriptor({
      input: Q,
      permissionResult: result,
    });
    Le = so(descriptor);
    let be;
    let fo = false;
    let yo = [];
    let go = (X) => {
      if (we)
        X = {
          ...X,
          permissionResult: result,
        };
      ve = X;
      Le = so(X);
      if (be !== undefined) {
        let Ne = be;
        be = undefined;
        Ne({
          value: X,
          done: false,
        });
      } else yo.push(X);
    };
    let ho = (X) => {
      if (isAsyncIterable(X))
        (async () => {
          try {
            for await (let Ne of X) {
              if (abortController.signal.aborted) return;
              go(Ne);
            }
          } catch {}
        })();
      else go(X);
    };
    ze = ho;
    let ft = {
      [Symbol.asyncIterator]() {
        return {
          next: () => {
            if (fo)
              return Promise.resolve({
                value: undefined,
                done: true,
              });
            let X = yo.shift();
            if (X !== undefined)
              return Promise.resolve({
                value: X,
                done: false,
              });
            return new Promise((resolve) => {
              be = resolve;
            });
          },
          return: () => {
            let X = {
              value: undefined,
              done: true,
            };
            be?.(X);
            be = undefined;
            return Promise.resolve(X);
          },
        };
      },
    };
    Ce();
    let Po = y.personOnly === true;
    let Qe = M || Po;
    let bo = !Qe && autoDenyAfterMs !== undefined;
    let ko = Qe ? ke.next() : Re;
    attentionRegistryStore.openAsk(
      {
        ...bridgeApprovalPrompt({
          tool: ctx.tool,
          input: Q,
        }),
        toolUseID: ctx.toolUseID,
      },
      {
        order: ko,
        onTop: bo,
      },
    );
    let wo = autoDenyAfterMs !== undefined && !co && !we;
    let Do = () => {
      fo = true;
      be?.({
        value: undefined,
        done: true,
      });
      be = undefined;
    };
    if (wo) {
      if (abortController.signal.aborted) Do();
      else
        abortController.signal.addEventListener("abort", Do, {
          once: true,
        });
      ho(descriptor);
    }
    let Ro = V(n.dialog, wo ? ft : descriptor, {
      signal: abortController.signal,
      place: Qe ? "under" : bo ? undefined : "queue",
      askOrder: ko,
      armInputGrace:
        M ||
        Po ||
        y.denialLimitFallback !== undefined ||
        y.autoDenyWindow !== undefined ||
        y.oneTimeAnswersOnly === true,
      ...false,
      onFirstReveal: askPatience?.resume,
      ...(isNotAskUserQuestionCard(n.dialog.kind) && {
        countedAsk,
      }),
    });
    Ro.then(undefined, () => {
      if (_ === pe) countedAsk.settle();
    });
    Ro.then(
      (X) => {
        signal.removeEventListener("abort", he);
        if (_ !== pe) return;
        if (!claim()) return;
        mo(X, "host_dialog");
      },
      (error) => {
        if (_ === pe) attentionRegistryStore.closeAsk(ctx.toolUseID);
        throw error;
      },
    );
  }
  function mo(_, surface) {
    switch (
      (attentionRegistryStore.clearHookFailure(ctx.toolUseID),
      attentionRegistryStore.closeAsk(ctx.toolUseID),
      He(),
      me(),
      _.behavior)
    ) {
      case "allow": {
        if (y.denialLimitFallback !== undefined) {
          resetDenialStreakAfterUserApproval(ctx.toolUseContext);
          logFeatureOk("permission_auto_mode_denial_fallback", {
            autoDenied: false,
          });
        }
        if (isRealAutoDenyWindow(y.autoDenyWindow)) {
          resetUnansweredSafetyCheckCount();
          logFeatureOk("permission_safety_check_timed_dialog", {
            autoDenied: false,
          });
        }
        if (result.offersBlockOutsideReads === true && _.askAgainOutsideReads !== true)
          markOutsideReadPromptSeen(ctx.toolUseContext);
        if (Le !== undefined)
          rememberCommandNetworkLists(ctx.toolUseID, ctx.tool, {
            ...Q,
            allowed_domains: [...Le],
          });
        let G = y.inPlaceOfClassifier === true ? [] : (_.permissionUpdates ?? []);
        notifyBridgeAndTeardown({
          behavior: "allow",
          updatedInput: _.updatedInput,
          updatedPermissions: [...G],
        });
        ge("accept");
        resolve(
          ctx.handleUserAllow(_.updatedInput, G, {
            feedback: _.feedback,
            permissionPromptStartTimeMs: now,
            contentBlocks: _.contentBlocks,
            decisionReason,
            matchedAskRule: result.matchedAskRule,
            surface,
          }),
        );
        return;
      }
      case "deny": {
        if (y.denialLimitFallback !== undefined)
          logFeatureOk("permission_auto_mode_denial_fallback", {
            autoDenied: false,
          });
        if (isRealAutoDenyWindow(y.autoDenyWindow)) {
          resetUnansweredSafetyCheckCount();
          logFeatureOk("permission_safety_check_timed_dialog", {
            autoDenied: false,
          });
        }
        let declineMessage =
          ACCOUNT_MEMORY_PERMISSION_MODULE !== null &&
          n.dialog.kind === ACCOUNT_MEMORY_PERMISSION_MODULE.accountMemoryWritePermissionDialog.kind
            ? _.declineMessage
            : undefined;
        notifyBridgeAndTeardown({
          behavior: "deny",
          message: declineMessage || (_.feedback ?? "User denied permission"),
        });
        ge("reject");
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: !!_.feedback,
            },
          },
          {
            permissionPromptStartTimeMs: now,
            input: Q,
          },
        );
        if (y.askEnded?.() === true) {
          resolve({
            behavior: "ask",
            message: WITHDRAWN_REQUEST_ANSWER_TEXT,
          });
          return;
        }
        if (declineMessage) {
          resolve({
            behavior: "ask",
            message: declineMessage,
            decisionReason: {
              type: "other",
              reason: "declined at the dialog",
            },
          });
          return;
        }
        if (result.offersBlockOutsideReads === true) {
          if (_.blockOutsideReads === true) {
            let he = (error, be) =>
              resolve({
                behavior: "deny",
                message:
                  "The user chose to block reads outside the working directories (permissions.blockReadsOutsideWorkingDirectories). Ask the user to add the directory with /add-dir, or to remove that setting." +
                  (error
                    ? ` Tell the user: the setting could not be saved to user settings (${error.message}); the file tools are fenced for this session only, sandboxed commands are not.`
                    : be
                      ? ""
                      : " Tell the user: the setting is saved, but sandboxed commands may not be fenced until the settings change is picked up."),
                decisionReason: {
                  type: "other",
                  reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
                },
              });
            persistBlockReadsOutsideWorkspace(ctx.toolUseContext)
              .then(({ error, sandboxRefreshed }) => he(error, sandboxRefreshed))
              .catch((error) => he(toError(error), false));
            return;
          }
          resolve({
            behavior: "ask",
            message: _.feedback
              ? `The user did not allow this read outside the working directories: ${_.feedback}`
              : "The user did not allow this read outside the working directories.",
            contentBlocks: _.contentBlocks,
            ...(_.feedback && {
              userFeedback: _.feedback,
            }),
            decisionReason: {
              type: "other",
              reason: "outside read declined, ask again next time",
            },
          });
          return;
        }
        resolve(
          ctx.cancelAndAbort(_.feedback, undefined, _.contentBlocks, {
            feedbackIsFromUser: true,
          }),
        );
        return;
      }
      case "cancelled": {
        notifyBridgeAndTeardown({
          behavior: "deny",
          message: "User aborted",
        });
        ge("reject");
        ctx.logCancelled();
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_abort",
            },
          },
          {
            permissionPromptStartTimeMs: now,
            input: Q,
          },
        );
        if (q) {
          resolve({
            behavior: "ask",
            message: SUBAGENT_REJECT_MESSAGE,
          });
          return;
        }
        if (y.askEnded?.() === true) {
          resolve({
            behavior: "ask",
            message: WITHDRAWN_REQUEST_ANSWER_TEXT,
          });
          return;
        }
        if ("wasNotShown" in _ && n.resultWhenNotShown) {
          resolve({
            behavior: "ask",
            message: n.resultWhenNotShown(ctx, "wasTakenAway" in _),
            decisionReason: {
              type: "other",
              reason: "the ask was not shown",
            },
          });
          return;
        }
        resolve(ctx.cancelAndAbort(undefined, true));
        return;
      }
    }
  }
  let autoDenyAfterMs = y.denialLimitFallback?.autoDenyAfterMs ?? y.autoDenyWindow?.autoDenyAfterMs;
  let autoDenyResolution = y.denialLimitFallback?.autoDenyResolution ?? y.autoDenyWindow?.autoDenyResolution;
  let co = q && y.autoDenyWindow?.notASafetyCheck !== true;
  let Ue;
  let je;
  let Ve = () => y.autoDenyWindow?.notASafetyCheck === true && isUnansweredWindowExpired();
  let Ee = false;
  function po() {
    if (autoDenyAfterMs === undefined || we || isResolved()) return;
    Ee = Ve();
    let timeoutMs = Ee ? 0 : autoDenyAfterMs;
    Ue = Date.now() + timeoutMs;
    uo(timeoutMs, Ue);
    if (ve !== undefined)
      ze?.({
        ...ve,
        permissionResult: result,
      });
  }
  function uo(timeoutMs, deadlineEpochMs) {
    if (autoDenyResolution === undefined) return;
    clearTimeout(je);
    result =
      result.denialLimitFallback !== undefined
        ? {
            ...result,
            denialLimitFallback: withDenialDeadline(result.denialLimitFallback, deadlineEpochMs),
          }
        : result.autoDenyWindow !== undefined
          ? {
              ...result,
              autoDenyWindow: withAutoDenyDeadline(result.autoDenyWindow, deadlineEpochMs),
            }
          : result;
    let max = Math.max(0, deadlineEpochMs - Date.now());
    let message = autoDenyResolution.message;
    je = setTimeout(() => {
      if (!Ve() && (Ee || otherDialogOnScreen(n.dialog.kind))) {
        po();
        return;
      }
      if (!claim()) return;
      re();
      notifyBridgeAndTeardown({
        behavior: "deny",
        message,
      });
      if (y.denialLimitFallback !== undefined) {
        logEvent("tengu_auto_mode_denial_dialog_auto_denied", {
          toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
          isMcp: ctx.tool.isMcp ?? false,
          timeoutMs,
        });
        logFeatureOk("permission_auto_mode_denial_fallback", {
          autoDenied: true,
        });
      } else if (isRealAutoDenyWindow(y.autoDenyWindow)) {
        logEvent("tengu_safety_check_dialog_auto_denied", {
          toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
          isMcp: ctx.tool.isMcp ?? false,
          permissionMode: fromEnum(ctx.permissionMode),
          promptSurface: lit("terminal"),
          circuitBreaker: fromEnumOpt(
            autoDenyResolution.decisionReason.type === "safetyCheck"
              ? autoDenyResolution.decisionReason.circuitBreaker
              : undefined,
          ),
          timeoutMs,
          elapsedMs: Date.now() - now,
          unansweredThisSession: incrementUnansweredSafetyCheckCount(),
        });
        logFeatureOk("permission_safety_check_timed_dialog", {
          autoDenied: true,
        });
      }
      ge("reject");
      ctx.logDecision(
        {
          decision: "reject",
          source: "config",
          decisionReason: autoDenyResolution.decisionReason,
        },
        {
          permissionPromptStartTimeMs: now,
          input: Q,
        },
      );
      e.onClassifierDenyDelivered?.(autoDenyResolution);
      resolve(autoDenyResolution);
    }, max);
    je.unref?.();
  }
  function ut() {
    if (autoDenyAfterMs === undefined || autoDenyResolution === undefined || co || we) return;
    if (Ee) Ue = undefined;
    Ee = Ve();
    let timeoutMs = Ee ? 0 : autoDenyAfterMs;
    Ue ??= Date.now() + timeoutMs;
    uo(timeoutMs, Ue);
    L.push(() => clearTimeout(je));
    Oe = () => {
      we = true;
      clearTimeout(je);
      let denialLimitFallback = result.denialLimitFallback;
      if (denialLimitFallback !== undefined)
        result = {
          ...result,
          denialLimitFallback: stripAutoDenyFields(denialLimitFallback),
        };
      else if (result.autoDenyWindow !== undefined) {
        let { autoDenyWindow, ...Pe } = result;
        result = Pe;
        if (isRealAutoDenyWindow(autoDenyWindow)) resetUnansweredSafetyCheckCount();
        else
          setUnansweredWindowExpired({
            expired: false,
          });
      }
    };
    $e?.();
    $e = autoDenyPresenceSignal.subscribe(() => {
      ao();
    });
    L.push(() => $e?.());
    Be?.();
    let Z = otherDialogOnScreen(n.dialog.kind);
    Be = onBlockingDialogChange(() => {
      let loggedToolUseID = otherDialogOnScreen(n.dialog.kind);
      if (Z && !loggedToolUseID) po();
      Z = loggedToolUseID;
    });
    L.push(() => {
      Be?.();
      Be = undefined;
    });
  }
  n.onRacersReady?.({
    ctx,
    dismissAndTeardown: re,
    notifyBridge: notifyBridgeAndTeardown,
    isReprompted: () => Ae > 0,
    addTeardown: (prev) => {
      L.push(prev);
    },
    logRepromptDenyDecision: () => {
      ge("reject");
      ctx.logDecision(
        {
          decision: "reject",
          source: {
            type: "hook",
          },
        },
        {
          permissionPromptStartTimeMs: now,
          input: Q,
        },
      );
    },
  });
  lo();
}
//@ chunk-wyqg6m3h.js:36666-36692 fingerprint = permissionResultToLog (0.387)
var askKeyOf = (permissionResult) => `ask:${sanitizeName(permissionResult)}`;
export {
  isSkillDirGlob,
  decisionReasonToString,
  repromptFilePermission,
  isSessionRuleUpdate,
  propagateAbort,
  returnFalsePermissionHook,
  recordHostAttestedCall,
  isHostDialogApproval,
  hasHostAttestedDialog,
  isHostAttestedWrite,
  clearToolUsePermissionState,
  recordToolUseDecision,
  filterEditableRules,
  dialogSourceFor,
  forgetSessionEditRules,
  recordEditedRuleContents,
  askKeyOf,
};
