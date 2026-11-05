/**
 * components/permissions/hooks.ts
 *
 * 权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/hooks.ts
 * pieces: chunk-2c3jp4kn.js (24), chunk-c7hntn0y.js (1), chunk-g4tsxwy3.js (4)
 * attribution: placement 24, callgraph-fingerprint 1, fingerprint 1, layout 2, callgraph-witnessed 1
 */
import { createHash } from "crypto";
import {
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
  EDIT,
} from "../../tools/FileEditTool/constants.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";
import { expandPath } from "../../utils/path.js";
import { coerceBooleanString } from "../../utils/spellcheck.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import {
  parseRuleString,
  permissionRuleValueFromString,
} from "../../utils/permissions/permissionRuleParser.js";
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
  isUnattendedRun,
  isSubagentContext,
} from "../../utils/agentContext.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { classifyBashCommand } from "../../utils/permissions/bashClassifier.js";
import { getIdeDiffTarget, useDiffInIDE } from "../../hooks/useDiffInIDE.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { BashTool } from "../../tools/BashTool/BashTool.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
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
  isLocalOnlyAsk,
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
  setUnansweredWindowExpired,
  isUnansweredWindowExpired,
  incrementUnansweredSafetyCheckCount,
} from "../../tools/BashTool/bashPermissionFlags.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { SUBAGENT_REJECT_MESSAGE } from "../../utils/messages.js";
import { otherDialogOnScreen, onBlockingDialogChange } from "../../services/requestUserDialog.js";
import { sanitizeName } from "../../plugins/bundled/diffPane/diffModel.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2c3jp4kn.js:13272-13400 placement (2.1.88 match: parseSkillPaths, 0.822)
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
//@ chunk-2c3jp4kn.js:13400-13647 placement
function isSkillDirectoryGlob(ruleContent) {
  let found = [CLAUDE_FOLDER_PERMISSION_PATTERN, GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN]
    .map((pattern) => `${pattern.slice(0, -2)}skills/`)
    .find((candidate) => ruleContent.startsWith(candidate));
  if (found === undefined || !ruleContent.endsWith("/**")) return false;
  let sliced = ruleContent.slice(found.length, -3);
  return (
    /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(sliced) && !sliced.includes("..") && foldName(sliced) !== "synced"
  );
}
//@ chunk-2c3jp4kn.js:13647-13671 placement
var APPROVALSURFACE = "approvalSurface";
//@ chunk-2c3jp4kn.js:13671-13792 placement
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
//@ chunk-2c3jp4kn.js:13792-14133 placement
function fileEditContextOf(toolName, toolInput) {
  let { file_path: filePath } = toolInput;
  if (typeof filePath !== "string") return;
  let context;
  if (toolName === EDIT) {
    let { old_string: oldString, new_string: newString } = toolInput;
    if (typeof oldString !== "string" || typeof newString !== "string") return;
    context = [
      toolName,
      expandPath(filePath),
      oldString,
      newString,
      coerceBooleanString(toolInput.replace_all) === true,
    ];
  } else if (toolName === FILE_WRITE_TOOL_NAME) {
    let { content } = toolInput;
    if (typeof content !== "string") return;
    context = [toolName, expandPath(filePath), content];
  } else return;
  return createHash("sha256").update(jsonStringify(context)).digest("hex");
}
//@ chunk-2c3jp4kn.js:14133-14184 placement
var permissionCallStatsStore; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2c3jp4kn.js:14133", () => {
  permissionCallStatsStore = new SessionRootSlot(() => ({
    calls: new Map(),
    hostAttests: false,
  }));
});
//@ chunk-2c3jp4kn.js:14184-14208 placement
/**
 * 函数 returnFalsePermissionHook（恒 false）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function returnFalsePermissionHook() {
  return false;
}
//@ chunk-2c3jp4kn.js:14208-14411 placement
/**
 * 记录宿主已确认的工具调用（工具名、展开后的文件路径与写入摘要），供后续核对写入。
 */
function recordHostAttestedCall(session, toolUseId, toolUse) {
  if (toolUseId !== "" && returnFalsePermissionHook()) {
    let stats = permissionCallStatsStore.of(session);
    let filePath = toolUse.input.file_path;
    stats.calls.set(toolUseId, {
      toolName: toolUse.toolName,
      filePath: typeof filePath === "string" ? expandPath(filePath) : undefined,
      writeDigest: fileEditContextOf(toolUse.toolName, toolUse.input),
    });
    stats.hostAttests = true;
  }
}
//@ chunk-2c3jp4kn.js:14411-14469 placement
/**
 * 函数 hasHostAttestedDialog（host 佐证过且开关开启）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function hasHostAttestedDialog(session) {
  return permissionCallStatsStore.peek(session)?.hostAttests === true && returnFalsePermissionHook();
}
//@ chunk-2c3jp4kn.js:14469-14509 placement
var permissionByToolUseStore; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2c3jp4kn.js:14469", () => {
  permissionByToolUseStore = new SessionRootSlot(() => ({
    byToolUse: new Map(),
  }));
});
//@ chunk-2c3jp4kn.js:14509-14583 placement
/**
 * 函数 recordToolUseDecision（追加一条决定）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function recordToolUseDecision(session, toolUseId, decision) {
  let { byToolUse } = permissionByToolUseStore.of(session);
  byToolUse.set(toolUseId, [...(byToolUse.get(toolUseId) ?? []), decision]);
}
//@ chunk-2c3jp4kn.js:14583-14744 placement
/**
 * 工具调用结束时清除该 toolUseId 的已记录调用与挂起的回调（并依次执行回调）。
 */
function clearToolUsePermissionState(session, toolUseId) {
  if (session !== undefined) {
    permissionCallStatsStore.peek(session)?.calls.delete(toolUseId);
    let decisions = permissionByToolUseStore.peek(session)?.byToolUse.get(toolUseId);
    if (decisions !== undefined) {
      permissionByToolUseStore.peek(session)?.byToolUse.delete(toolUseId);
      for (let decision of decisions) decision();
    }
  }
}
//@ chunk-2c3jp4kn.js:14744-14814 placement
/**
 * 函数 dialogSourceFor（有记录则来源为 host_dialog）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function dialogSourceFor(session, toolUseId) {
  return permissionCallStatsStore.peek(session)?.calls.has(toolUseId) ? "host_dialog" : undefined;
}
//@ chunk-2c3jp4kn.js:14814-15056 placement
/**
 * 判断写入/编辑调用是否与宿主确认过的调用一致（同工具、同路径、同写入摘要）。
 */
function isHostAttestedWrite(session, toolUseId, file) {
  if (toolUseId === undefined || (file.toolName !== FILE_WRITE_TOOL_NAME && file.toolName !== EDIT))
    return false;
  let record = permissionCallStatsStore.peek(session)?.calls.get(toolUseId);
  return (
    record !== undefined &&
    record.toolName === file.toolName &&
    record.filePath === file.absolutePath &&
    record.writeDigest !== undefined &&
    record.writeDigest === fileEditContextOf(file.toolName, file.input)
  );
}
//@ chunk-2c3jp4kn.js:15056-15150 placement
var weakRefSet; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var editRuleContentsStore;
deferInit("chunk-2c3jp4kn.js:15056", () => {
  weakRefSet = new Set();
  editRuleContentsStore = new SessionRootSlot(() => {
    let set = new Set();
    weakRefSet.add(new WeakRef(set));
    return {
      editRuleContents: set,
    };
  });
});
//@ chunk-2c3jp4kn.js:15150-15367 placement
function getSessionEditRuleContents(updates) {
  return updates.flatMap((update) =>
    (update.type === "addRules" || update.type === "replaceRules") &&
    update.destination === "session" &&
    update.behavior === "allow"
      ? update.rules.flatMap((rule) =>
          rule.toolName === EDIT && rule.ruleContent !== undefined ? [rule.ruleContent] : [],
        )
      : [],
  );
}
//@ chunk-2c3jp4kn.js:15367-15389 placement
function returnFalseEditRules() {
  return false;
}
//@ chunk-2c3jp4kn.js:15389-15501 placement
function isSkillEditRule(ruleString) {
  let ruleValue = parseRuleString(ruleString);
  return (
    ruleValue.toolName === EDIT &&
    ruleValue.ruleContent !== undefined &&
    isSkillDirGlob(ruleValue.ruleContent) &&
    !isSkillDirectoryGlob(ruleValue.ruleContent)
  );
}
//@ chunk-2c3jp4kn.js:15501-15769 placement
function isSessionRuleUpdate(update) {
  if (
    returnFalseEditRules() &&
    (update.type === "addRules" || update.type === "replaceRules") &&
    update.destination === "session" &&
    update.behavior === "allow"
  ) {
    let filtered = update.rules.filter((rule) => !isSkillEditRule(permissionRuleValueFromString(rule)));
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
//@ chunk-2c3jp4kn.js:15769-15819 placement
/**
 * 函数 filterEditableRules（开关关闭时保持原列表）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function filterEditableRules(rules) {
  return returnFalseEditRules() ? rules.filter((rule) => !isSkillEditRule(rule)) : rules;
}
//@ chunk-2c3jp4kn.js:15819-15887 placement
/**
 * 函数 recordEditedRuleContents（登记编辑后的规则内容）；位于「权限请求编排：通过 toolUseContext.requestDialog 打开对话框、并行跑 PermissionRequest hooks/分类器/bridge/channel，记录 tengu_tool_use_show_permission_request 等事件」模块。
 */
function recordEditedRuleContents(session, ruleContents) {
  for (let ruleContent of getSessionEditRuleContents(ruleContents))
    editRuleContentsStore.of(session).editRuleContents.add(ruleContent);
}
//@ chunk-2c3jp4kn.js:15887-15990 placement
/**
 * 从会话的编辑规则内容表中删除指定规则。
 */
function forgetSessionEditRules(session, ruleContents) {
  let editRuleContents = editRuleContentsStore.peek(session)?.editRuleContents;
  if (editRuleContents === undefined) return;
  for (let ruleContent of getSessionEditRuleContents(ruleContents)) editRuleContents.delete(ruleContent);
}
//@ chunk-2c3jp4kn.js:15990-16136 placement (2.1.88 match: propagateAbort, 1)
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
//@ chunk-2c3jp4kn.js:16136-16625 callgraph-fingerprint (2.1.88 match: decisionReasonToString, 0.167)
/**
 * 把决策原因映射为日志 surface 字符串（rule/session/host_dialog 等）。
 */
function decisionReasonToString(session, decisionReason, toolPermissionContext) {
  let editRuleContents = editRuleContentsStore.peek(session)?.editRuleContents;
  if (editRuleContents === undefined || editRuleContents.size === 0) return;
  let covered = new Set(
    (toolPermissionContext.alwaysAllowRules.session ?? []).flatMap((ruleString) => {
      let rule = parseRuleString(ruleString);
      return rule.toolName === EDIT && rule.ruleContent !== undefined ? [rule.ruleContent] : [];
    }),
  );
  for (let editRuleContent of editRuleContents)
    if (!covered.has(editRuleContent)) editRuleContents.delete(editRuleContent);
  if (
    decisionReason?.type !== "rule" ||
    decisionReason.rule.source !== "session" ||
    decisionReason.rule.ruleBehavior !== "allow" ||
    decisionReason.rule.ruleValue.toolName !== EDIT ||
    decisionReason.rule.ruleValue.ruleContent === undefined
  )
    return;
  return editRuleContents.has(decisionReason.rule.ruleValue.ruleContent) ? "host_dialog" : undefined;
}
//@ chunk-g4tsxwy3.js:46272-49450 placement
async function repromptFilePermission(request, respond) {
  let { ctx, description, result } = request;
  let requestSource = permissionRequestOrigin(ctx.toolUseContext);
  let wrappedRespond =
    ctx.tool === WorkflowTool
      ? (answer) => {
          if (answer.behavior === "allow")
            workflowUsageConsentModule.recordWorkflowUsageConsent(
              ctx.toolUseContext.session.workflowUsageConsent,
              ctx.toolUseContext.storageV5,
            );
          respond(answer);
        }
      : (request) => {
          ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID);
          respond(request);
        };
  let countedAsk = new CountedAsk();
  let { resolve, isResolved, claim } = createResolveOnce((answer) => {
    countedAsk.settle();
    wrappedRespond(answer);
  });
  let claimState = {
    resolve,
    isResolved,
    claim,
    countedAsk,
  };
  let theme = "dark";
  let isRemoteOrHostField = (input) => ctx.toolUseContext.forRemoteExecution === true || hasHostField(input);
  let baseDescriptor = {
    tool: ctx.tool,
    description,
    toolUseID: ctx.toolUseID,
    assistantMessage: ctx.assistantMessage,
    theme: "dark",
    requestSource,
    session: ctx.toolUseContext.session,
    toolState: ctx.toolUseContext.toolState,
    networkAllowListHonoured:
      !isRemoteOrHostField(result.updatedInput ?? ctx.input) &&
      shouldAcceptCommandDomains(getToolPermissionContext(ctx.toolUseContext)),
  };
  function showGenericDialog() {
    showPermissionDialog(request, claimState, {
      dialog: PERMISSION_PROMPT_DIALOG,
      buildDescriptor: ({ input, permissionResult }) =>
        buildPermissionPromptPayload({
          ...baseDescriptor,
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
  let bashClassifier = classifyBashCommand(ctx.tool);
  let isBrowserCardOverride =
    bashClassifier?.dialog.kind === BROWSER_PERMISSION_CARD.kind && result.inPlaceOfClassifier === true;
  if (bashClassifier !== undefined && !isBrowserCardOverride) {
    let hasExternalRacer = !!(
      request.bridgeCallbacks ||
      (request.channelCallbacks && !ctx.tool.requiresUserInteraction?.())
    );
    let { race } = bashClassifier;
    showPermissionDialog(request, claimState, {
      dialog: bashClassifier.dialog,
      resultWhenNotShown: bashClassifier.resultWhenNotShown,
      buildDescriptor: ({ input, permissionResult }) =>
        bashClassifier.build({
          ...baseDescriptor,
          input,
          permissionResult,
          hasExternalRacer,
        }),
      onRacersReady:
        race &&
        ((racers) =>
          racers.addTeardown(
            race({
              ctx,
              claim: claimState.claim,
              notifyBridge: racers.notifyBridge,
              dismissAndTeardown: racers.dismissAndTeardown,
              resolveOnce: claimState.resolve,
            }),
          )),
    });
    return;
  }
  if (isFileTool(ctx.tool)) {
    let input = result.updatedInput ?? ctx.input;
    let toolInputPath = getToolInputPath(ctx.tool, input);
    if (toolInputPath !== null) {
      let ideDiffEligibility =
        result.localDisplayOnly === true ? null : await getIdeDiffTarget(ctx.tool, input, ctx.toolUseContext);
      let permissionPromptStartTimeMs = Date.now();
      let racers;
      let remoteWorkspace = isRemoteOrHostField(input);
      let filePermissionDescriptor = await buildFilePermissionDescriptor({
        ...baseDescriptor,
        input,
        permissionResult: result,
        filePath: toolInputPath,
        remoteWorkspace,
      });
      if (ctx.resolveIfAborted(claimState.resolve)) return;
      showPermissionDialog(request, claimState, {
        dialog: FILE_PERMISSION_CARD,
        buildDescriptor: ({ input, permissionResult }) => {
          if (racers?.isReprompted() !== true) {
            if (ideDiffEligibility !== null)
              return {
                ...filePermissionDescriptor,
                permissionResult,
                showingDiffInIDE: true,
                ideName: ideDiffEligibility.ideName,
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
                ...baseDescriptor,
                input,
                permissionResult,
                filePath: toolInputPath,
                remoteWorkspace: isRemoteOrHostField(input),
              });
            } catch (error) {
              logForDebugging(
                `File permission reprompt: cannot preview the hook-rewritten input of ${ctx.tool.name} (${errorMessage(error)}); denying instead of showing a stale preview`,
                {
                  level: "error",
                },
              );
              if (claim()) {
                racers?.dismissAndTeardown();
                racers?.logRepromptDenyDecision();
                resolve(
                  ctx.cancelAndAbort(
                    `Failed to preview the hook-rewritten file operation: ${errorMessage(error)}`,
                  ),
                );
              }
            }
          })();
        },
        unaryEvent: getCompletionTypeForTool(ctx.tool, input, toolInputPath),
        onRacersReady: (fileRacers) => {
          racers = fileRacers;
          if (ideDiffEligibility === null) return;
          let { closeTab } = useDiffInIDE({
            ctx: fileRacers.ctx,
            tool: ctx.tool,
            input,
            permissionResult: result,
            permissionPromptStartTimeMs,
            eligibility: ideDiffEligibility,
            claim: claimState.claim,
            notifyBridge: fileRacers.notifyBridge,
            dismissAndTeardown: fileRacers.dismissAndTeardown,
            resolveOnce: claimState.resolve,
          });
          fileRacers.addTeardown(closeTab);
        },
      });
      return;
    }
    showGenericDialog();
    return;
  }
  if (ctx.tool === BashTool) {
    let toolPermissionContext = getToolPermissionContext(ctx.toolUseContext);
    showPermissionDialog(request, claimState, {
      dialog: BASH_PERMISSION_CARD,
      buildDescriptor: ({ input, permissionResult }) =>
        buildBashPermissionPayload({
          ...baseDescriptor,
          input,
          permissionResult,
          classifierState: "none",
          toolPermissionContext,
        }),
    });
    return;
  }
  showGenericDialog();
}
//@ chunk-g4tsxwy3.js:49450-49504 layout
class MonotonicCounter {
  last = 0;
  next() {
    this.last += 1;
    return this.last;
  }
}
//@ chunk-g4tsxwy3.js:49504-49529 layout
var counterSlot; // deferred: uses MonotonicCounter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:49504", () => {
  counterSlot = new HostScoped(() => new MonotonicCounter());
});
//@ chunk-g4tsxwy3.js:49529-61771 callgraph-witnessed (2.1.88 match: usePermissionRequestLogging, 0.133)
/**
 * 打开并管理一个权限对话框：用 toolUseContext.requestDialog(dialog, descriptor, …) 入对话框队列，记录 tengu_tool_use_show_permission_request，处理对话框结果（allow/reject/反馈/模式切换/规则持久化）、超时与中止，结束时执行 teardown。
 */
function showPermissionDialog(request, claimState, spec) {
  let {
    description,
    result,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    bridgeDialogCallbacks,
    channelCallbacks,
  } = request;
  let { resolve, isResolved, claim, countedAsk } = claimState;
  let unusedB;
  let unusedFlag = false;
  let ctx =
    result.oneTimeAnswersOnly === true
      ? {
          ...request.ctx,
          logDecision(decision, teardown) {
            request.ctx.logDecision(decision, teardown);
            if (unusedFlag) return;
            unusedFlag = true;
            let sourceKind = decision.source === "config" ? "config" : decision.source.type;
            let how =
              decision.decision === "accept"
                ? sourceKind === "user"
                  ? "yes"
                  : sourceKind === "hook"
                    ? "hook_allow"
                    : sourceKind === "config"
                      ? "rules_or_mode"
                      : "classifier_allow"
                : sourceKind === "user_reject"
                  ? "no"
                  : sourceKind === "user_abort"
                    ? signal.aborted
                      ? "closed"
                      : "esc"
                    : unusedB !== undefined
                      ? "expired"
                      : "hook_deny";
            logEvent("tengu_repl_script_call_prompt_ended", {
              ...request.ctx.toolUseContext.replScriptCallLabels,
              how: fromEnum(how),
              followsAnExpiry: unusedB?.followsAnother,
              timeoutMs: autoDenyAfterMs,
              elapsedMs: Date.now() - now,
              lane: fromEnum(request.ctx.toolUseContext.replAsyncAsk === true ? "async" : "classic"),
            });
          },
        }
      : request.ctx;
  let requestDialog = ctx.toolUseContext.requestDialog;
  if (requestDialog === undefined) return;
  let openDialog = requestDialog;
  let agentContext = ctx.toolUseContext.agentContext;
  let isUnattended = isUnattendedAgentContext(ctx.toolUseContext);
  let unattended = codeModeAccepted() ? isUnattendedRun(ctx.toolUseContext) : isUnattended;
  let askPatience = result.askPatience;
  askPatience?.hold();
  let now = Date.now();
  let orderCounter = counterSlot.of(ctx.toolUseContext.session.host);
  let order = orderCounter.next();
  let displayInput = result.updatedInput ?? ctx.input;
  let decisionReason = result.decisionReason;
  let result_2 = result;
  let round = 0;
  let roundAbort;
  let teardowns = [];
  function runTeardowns() {
    if (teardowns.length === 0) return;
    let pendingTeardowns = teardowns.splice(0, teardowns.length);
    for (let teardown of pendingTeardowns)
      try {
        teardown();
      } catch (error) {
        logForDebugging(`Dialog teardown failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
  }
  let loggedShown = false;
  let unaryEvent = spec.unaryEvent ?? {
    completion_type: "tool_use_single",
    language_name: lit("none"),
  };
  let signal = ctx.toolUseContext.abortController.signal;
  function logShownOnce() {
    if (loggedShown) return;
    loggedShown = true;
    let permissionMode = ctx.permissionMode;
    ctx.toolUseContext.applyAttributionOp({
      kind: "incrementPermissionPrompt",
    });
    logEvent("tengu_tool_use_show_permission_request", {
      messageID: sanitizeMarkName(ctx.messageId),
      toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
      isMcp: ctx.tool.isMcp ?? false,
      ...mcpToolLogFields(ctx.tool, ctx.toolUseContext.options.mcpClients),
      decisionReasonType: fromEnumOpt(result_2.decisionReason?.type),
      sandboxEnabled: SandboxManager.isSandboxingEnabled(),
      permissionMode: fromEnum(permissionMode),
      requestSource: fromEnumOpt(permissionRequestOrigin(ctx.toolUseContext)?.type),
      originAgentType: fromEnum(
        isSubagentContext(agentContext) && agentContext.isMainSession ? "main" : agentContext.agentType,
      ),
    });
    logUnaryEvent({
      completion_type: unaryEvent.completion_type,
      event: "response",
      metadata: {
        language_name: unaryEvent.language_name,
        message_id: ctx.assistantMessage.message.id,
        platform: env.platform,
      },
    });
  }
  function logResponse(event) {
    logUnaryEvent({
      completion_type: unaryEvent.completion_type,
      event,
      metadata: {
        language_name: unaryEvent.language_name,
        message_id: ctx.assistantMessage.message.id,
        platform: env.platform,
      },
    });
  }
  function dismissAndTeardown() {
    roundAbort?.abort();
    attentionRegistryStore.clearHookFailure(ctx.toolUseID);
    attentionRegistryStore.closeAsk(ctx.toolUseID);
    recheckUnsubscribe();
    runTeardowns();
  }
  let repromptCount = 0;
  let { notifyBridgeAndTeardown } = handleInteractivePermission({
    ctx,
    description,
    result,
    displayInput,
    permissionPromptStartTimeMs: now,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    bridgeDialogCallbacks,
    channelCallbacks,
    claim,
    isResolved,
    onWin(answer) {
      if (result_2.offersBlockOutsideReads === true && answer.behavior === "allow")
        ctx.toolUseContext.session.outsideReadPrompt.markAnswered();
      dismissAndTeardown();
      resolve(answer);
    },
    onReprompt(nextInput, nextReason, nextResult) {
      repromptCount += 1;
      displayInput = nextInput;
      decisionReason = nextReason;
      result_2 = {
        ...nextResult,
        ...(result_2.denialLimitFallback !== undefined && {
          denialLimitFallback: result_2.denialLimitFallback,
        }),
        ...(result_2.autoDenyWindow !== undefined && {
          autoDenyWindow: result_2.autoDenyWindow,
        }),
        ...(result_2.oneTimeAnswersOnly === true && {
          suggestions: undefined,
          suppressAlwaysAllowRule: true,
          oneTimeAnswersOnly: true,
        }),
        ...(result_2.offersBlockOutsideReads === true &&
          nextResult.decisionReason?.type === "workingDir" && {
            offersBlockOutsideReads: true,
          }),
      };
      commitProvisionalRecord(ctx.toolUseContext, ctx.toolUseID, nextInput, result_2, ctx.tool.name);
      let previousAbort = roundAbort;
      runTeardowns();
      try {
        showDialog();
      } finally {
        previousAbort?.abort();
      }
    },
    onRemoteDialogAnswer(remoteAnswer) {
      roundAbort?.abort();
      finish(remoteAnswer, undefined);
    },
  });
  let tornDown = false;
  let teardownAutoDeny;
  let presenceUnsubscribe;
  let dialogChangeUnsubscribe;
  let pushDescriptor;
  let lastDescriptor;
  let networkHosts;
  let extractHosts = (descriptor) => {
    if (typeof descriptor !== "object" || descriptor === null || isAsyncIterable(descriptor)) return;
    let networkAllowHosts = descriptor.networkAllowHosts;
    return Array.isArray(networkAllowHosts) &&
      networkAllowHosts.every((networkAllowHost) => typeof networkAllowHost === "string")
      ? networkAllowHosts
      : undefined;
  };
  let onPresenceChange = () => {
    if (tornDown || isResolved()) return;
    if (codeModeAccepted() && teardownAutoDeny === undefined) {
      tornDown = true;
      return;
    }
    teardownAutoDeny?.();
    if (lastDescriptor !== undefined)
      pushDescriptor?.({
        ...lastDescriptor,
        permissionResult: result_2,
      });
  };
  let recheckUnsubscribe = permissionModeSignal.subscribe(() => {
    if (isResolved()) return;
    if (
      (codeModeAccepted()
        ? result.denialLimitFallback?.autoDenyAfterMs !== undefined || result.autoDenyWindow !== undefined
        : teardownAutoDeny !== undefined) &&
      !tornDown
    ) {
      let autoMode = isAutoAllowedInMode(ctx.tool, getToolPermissionContext(ctx.toolUseContext));
      if (!(
        isAutoClassifierActive(autoMode) ||
        (isRealAutoDenyWindow(result.autoDenyWindow) && autoMode === "bypassPermissions")
      ))
        onPresenceChange();
    }
    if (
      isBypassImmuneDecision(
        {
          decisionReason: result_2.decisionReason,
          forcedByCaller: result.forcedByCaller,
          personOnly: result_2.personOnly,
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
      .then((recheck) => {
        if (recheck.behavior !== "allow") {
          if (isResolved()) ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID);
          return;
        }
        if (!claim()) return;
        dropPermissionRecord(ctx.toolUseContext, ctx.toolUseID);
        recheckUnsubscribe();
        notifyBridgeAndTeardown();
        roundAbort?.abort();
        attentionRegistryStore.clearHookFailure(ctx.toolUseID);
        attentionRegistryStore.closeAsk(ctx.toolUseID);
        runTeardowns();
        ctx.logDecision({
          decision: "accept",
          source: "config",
          decisionReason: recheck.decisionReason,
          modeAtRecheck: getToolPermissionContext(ctx.toolUseContext).mode,
          surface: decisionReasonToString(
            ctx.toolUseContext.session,
            recheck.decisionReason,
            getToolPermissionContext(ctx.toolUseContext),
          ),
        });
        resolve(
          ctx.buildAllow(recheck.updatedInput ?? ctx.input, {
            decisionReason: recheck.decisionReason,
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
  function showDialog() {
    let roundId = ++round;
    askPatience?.hold();
    lastDescriptor = undefined;
    let armsAutoDeny = codeModeAccepted() && unattended && autoDenyAfterMs !== undefined;
    if (!armsAutoDeny) armAutoDeny();
    let abortController = new AbortController();
    roundAbort = abortController;
    let abortHandler = () => abortController.abort();
    if (signal.aborted) abortController.abort();
    else
      signal.addEventListener("abort", abortHandler, {
        once: true,
      });
    let descriptor = spec.buildDescriptor({
      input: displayInput,
      permissionResult: result_2,
    });
    networkHosts = extractHosts(descriptor);
    let asyncResolve;
    let streamDone = false;
    let queuedValues = [];
    let pushValue = (value) => {
      if (tornDown)
        value = {
          ...value,
          permissionResult: result_2,
        };
      lastDescriptor = value;
      networkHosts = extractHosts(value);
      if (asyncResolve !== undefined) {
        let resolve = asyncResolve;
        asyncResolve = undefined;
        resolve({
          value,
          done: false,
        });
      } else queuedValues.push(value);
    };
    let emit = (payload) => {
      if (isAsyncIterable(payload))
        (async () => {
          try {
            for await (let value of payload) {
              if (abortController.signal.aborted) return;
              pushValue(value);
            }
          } catch {}
        })();
      else pushValue(payload);
    };
    pushDescriptor = emit;
    let iterator = {
      [Symbol.asyncIterator]() {
        return {
          next: () => {
            if (streamDone)
              return Promise.resolve({
                value: undefined,
                done: true,
              });
            let value = queuedValues.shift();
            if (value !== undefined)
              return Promise.resolve({
                value,
                done: false,
              });
            return new Promise((resolve) => {
              asyncResolve = resolve;
            });
          },
          return: () => {
            let doneValue = {
              value: undefined,
              done: true,
            };
            asyncResolve?.(doneValue);
            asyncResolve = undefined;
            return Promise.resolve(doneValue);
          },
        };
      },
    };
    logShownOnce();
    let isPersonOnly = result.personOnly === true;
    let heldUnder = unattended || isPersonOnly;
    let queueBehind = !heldUnder && autoDenyAfterMs !== undefined;
    let askOrder = heldUnder ? orderCounter.next() : order;
    attentionRegistryStore.openAsk(
      {
        ...bridgeApprovalPrompt({
          tool: ctx.tool,
          input: displayInput,
        }),
        toolUseID: ctx.toolUseID,
      },
      {
        order: askOrder,
        onTop: queueBehind,
      },
    );
    let canAutoDeny = autoDenyAfterMs !== undefined && !isUnattendedNoWindow && !tornDown;
    let endStream = () => {
      streamDone = true;
      asyncResolve?.({
        value: undefined,
        done: true,
      });
      asyncResolve = undefined;
    };
    if (canAutoDeny) {
      if (abortController.signal.aborted) endStream();
      else
        abortController.signal.addEventListener("abort", endStream, {
          once: true,
        });
      emit(descriptor);
    }
    let dialogPromise = openDialog(spec.dialog, canAutoDeny ? iterator : descriptor, {
      signal: abortController.signal,
      place: heldUnder ? "under" : queueBehind ? undefined : "queue",
      askOrder,
      armInputGrace:
        unattended ||
        isPersonOnly ||
        result.denialLimitFallback !== undefined ||
        result.autoDenyWindow !== undefined ||
        result.oneTimeAnswersOnly === true,
      ...(codeModeAccepted() &&
        ctx.toolUseContext.replAsyncAsk === true &&
        autoDenyAfterMs === undefined &&
        isLocalOnlyAsk(result_2, ctx.toolUseContext) && {
          holdsIdleDrain: false,
        }),
      onFirstReveal: !codeModeAccepted()
        ? askPatience?.resume
        : askPatience !== undefined || armsAutoDeny
          ? () => {
              askPatience?.resume();
              if (armsAutoDeny && roundId === round && !isResolved()) armAutoDeny();
            }
          : undefined,
      ...(isNotAskUserQuestionCard(spec.dialog.kind) && {
        countedAsk,
      }),
    });
    dialogPromise.then(undefined, () => {
      if (roundId === round) countedAsk.settle();
    });
    dialogPromise.then(
      (answer) => {
        signal.removeEventListener("abort", abortHandler);
        if (roundId !== round) return;
        if (!claim()) return;
        finish(answer, "host_dialog");
      },
      (error) => {
        if (roundId === round) attentionRegistryStore.closeAsk(ctx.toolUseID);
        throw error;
      },
    );
  }
  function finish(answer, surface) {
    switch (
      (attentionRegistryStore.clearHookFailure(ctx.toolUseID),
      attentionRegistryStore.closeAsk(ctx.toolUseID),
      recheckUnsubscribe(),
      runTeardowns(),
      answer.behavior)
    ) {
      case "allow": {
        if (result.denialLimitFallback !== undefined) {
          resetDenialStreakAfterUserApproval(ctx.toolUseContext);
          logFeatureOk("permission_auto_mode_denial_fallback", {
            autoDenied: false,
          });
        }
        if (isRealAutoDenyWindow(result.autoDenyWindow)) {
          resetUnansweredSafetyCheckCount();
          logFeatureOk("permission_safety_check_timed_dialog", {
            autoDenied: false,
          });
        } else if (surface === "host_dialog" && answer.updatedInput?.afkTimeoutMs === undefined)
          setUnansweredWindowExpired({
            expired: false,
          });
        if (result_2.offersBlockOutsideReads === true && answer.askAgainOutsideReads !== true)
          markOutsideReadPromptSeen(ctx.toolUseContext);
        if (networkHosts !== undefined)
          rememberCommandNetworkLists(ctx.toolUseID, ctx.tool, {
            ...displayInput,
            allowed_domains: [...networkHosts],
          });
        let permissionUpdates = result.inPlaceOfClassifier === true ? [] : (answer.permissionUpdates ?? []);
        notifyBridgeAndTeardown({
          behavior: "allow",
          updatedInput: answer.updatedInput,
          updatedPermissions: [...permissionUpdates],
        });
        logResponse("accept");
        resolve(
          ctx.handleUserAllow(answer.updatedInput, permissionUpdates, {
            feedback: answer.feedback,
            permissionPromptStartTimeMs: now,
            contentBlocks: answer.contentBlocks,
            decisionReason,
            matchedAskRule: result_2.matchedAskRule,
            surface,
          }),
        );
        return;
      }
      case "deny": {
        if (result.denialLimitFallback !== undefined)
          logFeatureOk("permission_auto_mode_denial_fallback", {
            autoDenied: false,
          });
        if (isRealAutoDenyWindow(result.autoDenyWindow)) {
          resetUnansweredSafetyCheckCount();
          logFeatureOk("permission_safety_check_timed_dialog", {
            autoDenied: false,
          });
        } else if (surface === "host_dialog")
          setUnansweredWindowExpired({
            expired: false,
          });
        let declineMessage =
          ACCOUNT_MEMORY_PERMISSION_MODULE !== null &&
          spec.dialog.kind === ACCOUNT_MEMORY_PERMISSION_MODULE.accountMemoryWritePermissionDialog.kind
            ? answer.declineMessage
            : undefined;
        notifyBridgeAndTeardown({
          behavior: "deny",
          message: declineMessage || (answer.feedback ?? "User denied permission"),
        });
        logResponse("reject");
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: !!answer.feedback,
            },
          },
          {
            permissionPromptStartTimeMs: now,
            input: displayInput,
          },
        );
        if (result.askEnded?.() === true) {
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
        if (result_2.offersBlockOutsideReads === true) {
          if (answer.blockOutsideReads === true) {
            let respondFenced = (error, sandboxRefreshed) =>
              resolve({
                behavior: "deny",
                message:
                  "The user chose to block reads outside the working directories (permissions.blockReadsOutsideWorkingDirectories). Ask the user to add the directory with /add-dir, or to remove that setting." +
                  (error
                    ? ` Tell the user: the setting could not be saved to user settings (${error.message}); the file tools are fenced for this session only, sandboxed commands are not.`
                    : sandboxRefreshed
                      ? ""
                      : " Tell the user: the setting is saved, but sandboxed commands may not be fenced until the settings change is picked up."),
                decisionReason: {
                  type: "other",
                  reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
                },
              });
            persistBlockReadsOutsideWorkspace(ctx.toolUseContext)
              .then(({ error, sandboxRefreshed }) => respondFenced(error, sandboxRefreshed))
              .catch((error) => respondFenced(toError(error), false));
            return;
          }
          resolve({
            behavior: "ask",
            message: answer.feedback
              ? `The user did not allow this read outside the working directories: ${answer.feedback}`
              : "The user did not allow this read outside the working directories.",
            contentBlocks: answer.contentBlocks,
            ...(answer.feedback && {
              userFeedback: answer.feedback,
            }),
            decisionReason: {
              type: "other",
              reason: "outside read declined, ask again next time",
            },
          });
          return;
        }
        resolve(
          ctx.cancelAndAbort(answer.feedback, undefined, answer.contentBlocks, {
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
        logResponse("reject");
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
            input: displayInput,
          },
        );
        if (isUnattended) {
          resolve({
            behavior: "ask",
            message: SUBAGENT_REJECT_MESSAGE,
          });
          return;
        }
        if (result.askEnded?.() === true) {
          resolve({
            behavior: "ask",
            message: WITHDRAWN_REQUEST_ANSWER_TEXT,
          });
          return;
        }
        if ("wasNotShown" in answer && spec.resultWhenNotShown) {
          resolve({
            behavior: "ask",
            message: spec.resultWhenNotShown(ctx, "wasTakenAway" in answer),
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
  let autoDenyAfterMs = result.denialLimitFallback?.autoDenyAfterMs ?? result.autoDenyWindow?.autoDenyAfterMs;
  let autoDenyResolution =
    result.denialLimitFallback?.autoDenyResolution ?? result.autoDenyWindow?.autoDenyResolution;
  let isUnattendedNoWindow = isUnattended && result.autoDenyWindow?.notASafetyCheck !== true;
  let autoDenyDeadline;
  let autoDenyTimer;
  let isWindowExpired = () => result.autoDenyWindow?.notASafetyCheck === true && isUnansweredWindowExpired();
  let suppressSchedule = false;
  function restartAutoDeny() {
    if (autoDenyAfterMs === undefined || tornDown || isResolved()) return;
    suppressSchedule = isWindowExpired();
    let timeoutMs = suppressSchedule ? 0 : autoDenyAfterMs;
    autoDenyDeadline = Date.now() + timeoutMs;
    scheduleAutoDeny(timeoutMs, autoDenyDeadline);
    if (lastDescriptor !== undefined)
      pushDescriptor?.({
        ...lastDescriptor,
        permissionResult: result_2,
      });
  }
  function scheduleAutoDeny(timeoutMs, deadlineEpochMs) {
    if (autoDenyResolution === undefined) return;
    clearTimeout(autoDenyTimer);
    result_2 =
      result_2.denialLimitFallback !== undefined
        ? {
            ...result_2,
            denialLimitFallback: withDenialDeadline(result_2.denialLimitFallback, deadlineEpochMs),
          }
        : result_2.autoDenyWindow !== undefined
          ? {
              ...result_2,
              autoDenyWindow: withAutoDenyDeadline(result_2.autoDenyWindow, deadlineEpochMs),
            }
          : result_2;
    let max = Math.max(0, deadlineEpochMs - Date.now());
    let message = autoDenyResolution.message;
    autoDenyTimer = setTimeout(() => {
      if (!isWindowExpired() && (suppressSchedule || otherDialogOnScreen(spec.dialog.kind))) {
        restartAutoDeny();
        return;
      }
      if (!claim()) return;
      dismissAndTeardown();
      notifyBridgeAndTeardown({
        behavior: "deny",
        message,
      });
      if (result.denialLimitFallback !== undefined) {
        logEvent("tengu_auto_mode_denial_dialog_auto_denied", {
          toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
          isMcp: ctx.tool.isMcp ?? false,
          timeoutMs,
        });
        logFeatureOk("permission_auto_mode_denial_fallback", {
          autoDenied: true,
        });
      } else if (isRealAutoDenyWindow(result.autoDenyWindow)) {
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
      } else {
        unusedB = {
          followsAnother: isUnansweredWindowExpired(),
        };
        setUnansweredWindowExpired({
          expired: true,
        });
      }
      logResponse("reject");
      ctx.logDecision(
        {
          decision: "reject",
          source: "config",
          decisionReason: autoDenyResolution.decisionReason,
        },
        {
          permissionPromptStartTimeMs: now,
          input: displayInput,
        },
      );
      request.onClassifierDenyDelivered?.(autoDenyResolution);
      resolve(autoDenyResolution);
    }, max);
    autoDenyTimer.unref?.();
  }
  function armAutoDeny() {
    if (autoDenyAfterMs === undefined || autoDenyResolution === undefined || isUnattendedNoWindow || tornDown)
      return;
    if (suppressSchedule) autoDenyDeadline = undefined;
    suppressSchedule = isWindowExpired();
    let timeoutMs = suppressSchedule ? 0 : autoDenyAfterMs;
    autoDenyDeadline ??= Date.now() + timeoutMs;
    scheduleAutoDeny(timeoutMs, autoDenyDeadline);
    if (codeModeAccepted() && lastDescriptor !== undefined)
      pushDescriptor?.({
        ...lastDescriptor,
        permissionResult: result_2,
      });
    teardowns.push(() => clearTimeout(autoDenyTimer));
    teardownAutoDeny = () => {
      tornDown = true;
      clearTimeout(autoDenyTimer);
      let denialLimitFallback = result_2.denialLimitFallback;
      if (denialLimitFallback !== undefined)
        result_2 = {
          ...result_2,
          denialLimitFallback: stripAutoDenyFields(denialLimitFallback),
        };
      else if (result_2.autoDenyWindow !== undefined) {
        let { autoDenyWindow, ...rest } = result_2;
        result_2 = rest;
        if (isRealAutoDenyWindow(autoDenyWindow)) resetUnansweredSafetyCheckCount();
        else
          setUnansweredWindowExpired({
            expired: false,
          });
      }
    };
    presenceUnsubscribe?.();
    presenceUnsubscribe = autoDenyPresenceSignal.subscribe(() => {
      onPresenceChange();
    });
    teardowns.push(() => presenceUnsubscribe?.());
    dialogChangeUnsubscribe?.();
    let wasBlocking = otherDialogOnScreen(spec.dialog.kind);
    dialogChangeUnsubscribe = onBlockingDialogChange(() => {
      let loggedToolUseID = otherDialogOnScreen(spec.dialog.kind);
      if (wasBlocking && !loggedToolUseID) restartAutoDeny();
      wasBlocking = loggedToolUseID;
    });
    teardowns.push(() => {
      dialogChangeUnsubscribe?.();
      dialogChangeUnsubscribe = undefined;
    });
  }
  spec.onRacersReady?.({
    ctx,
    dismissAndTeardown,
    notifyBridge: notifyBridgeAndTeardown,
    isReprompted: () => repromptCount > 0,
    addTeardown: (prev) => {
      teardowns.push(prev);
    },
    logRepromptDenyDecision: () => {
      logResponse("reject");
      ctx.logDecision(
        {
          decision: "reject",
          source: {
            type: "hook",
          },
        },
        {
          permissionPromptStartTimeMs: now,
          input: displayInput,
        },
      );
    },
  });
  showDialog();
}
//@ chunk-c7hntn0y.js:37030-37056 fingerprint (2.1.88 match: permissionResultToLog, 0.408)
var askKeyOf = (permissionResult) => `ask:${sanitizeName(permissionResult)}`;
export {
  returnFalsePermissionHook,
  recordHostAttestedCall,
  isHostDialogApproval,
  isSkillDirGlob,
  clearToolUsePermissionState,
  repromptFilePermission,
  recordToolUseDecision,
  isSessionRuleUpdate,
  propagateAbort,
  askKeyOf,
  filterEditableRules,
  decisionReasonToString,
  forgetSessionEditRules,
  recordEditedRuleContents,
  dialogSourceFor,
  hasHostAttestedDialog,
  isHostAttestedWrite,
};
