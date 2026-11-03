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
  Lo,
} from "./permissionCardKinds.js";
import {
  WorkflowTool,
  workflowUsageConsentModule,
  ACCOUNT_MEMORY_PERMISSION_MODULE,
  WITHDRAWN_REQUEST_ANSWER_TEXT,
} from "./permissionCardRegistry.js";
import { CountedAsk } from "../../utils/countedAsk.js";
import { createResolveOnce } from "../../hooks/toolPermission/PermissionContext.js";
import { Cf } from "../../bridge/deviceRegistration.js";
import { b4s, rememberCommandNetworkLists } from "../../tools/BashTool/sandboxNetwork.js";
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
import { ye } from "../../utils/startupMarks.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { mcpToolLogFields } from "../../hooks/toolPermission/permissionLogging.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logUnaryEvent } from "../../utils/unaryLogging.js";
import { env } from "../../utils/env.js";
import { KE } from "../fleet/sessionAttention.js";
import {
  handleInteractivePermission,
  bridgeApprovalPrompt,
} from "../../hooks/toolPermission/handlers/interactiveHandler.js";
import { commitProvisionalRecord, dropPermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { $9t } from "../dialogs/dialogRequests.js";
import { aF } from "../../utils/permissions/permissionSetup.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { _pn, N5s } from "../../utils/permissions/autoModeUnavailable.js";
import {
  isBypassImmuneDecision,
  hasPermissionsToUseTool,
  resetDenialStreakAfterUserApproval,
  markOutsideReadPromptSeen,
  persistBlockReadsOutsideWorkspace,
  $5s,
  stripAutoDenyFields,
} from "../../utils/permissions/permissions.js";
import { logError } from "../../utils/log.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { rwt, I5s, P5s, O5s } from "../../tools/BashTool/bashPermissionFlags.js";
import { OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { SUBAGENT_REJECT_MESSAGE } from "../../utils/messages.js";
import { lAt, G8r } from "../../services/requestUserDialog.js";
import { sanitizeName } from "../../plugins/bundled/diffPane/diffModel.js";

/**
 * 判断 frontmatter 字符串是否为指定前缀下、以 /** 结尾且不含 .. 的目录 glob。
 */
//@ chunk-re9y5nwg.js:459-587 placement = parseSkillPaths (0.822)
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
function isSkillDirectoryGlob(e) {
  let found = [CLAUDE_FOLDER_PERMISSION_PATTERN, GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN]
    .map((o) => `${o.slice(0, -2)}skills/`)
    .find((o) => e.startsWith(o));
  if (found === void 0 || !e.endsWith("/**")) return !1;
  let sliced = e.slice(found.length, -3);
  return (
    /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(sliced) && !sliced.includes("..") && foldName(sliced) !== "synced"
  );
}
//@ chunk-re9y5nwg.js:834-858 placement
var APPROVALSURFACE = "approvalSurface";
/**
 * 判断权限结果是否为宿主对话框批准的 allow。
 */
//@ chunk-re9y5nwg.js:858-979 placement
function isHostDialogApproval(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "behavior" in e &&
    e.behavior === "allow" &&
    APPROVALSURFACE in e &&
    e[APPROVALSURFACE] === "host_dialog"
  );
}
//@ chunk-re9y5nwg.js:979-1319 placement
function fileEditContextOf(e, n) {
  let { file_path: file_path } = n;
  if (typeof file_path !== "string") return;
  let o;
  if (e === FILE_EDIT_TOOL_NAME) {
    let { old_string: old_string, new_string: new_string } = n;
    if (typeof old_string !== "string" || typeof new_string !== "string") return;
    o = [e, expandPath(file_path), old_string, new_string, coerceBooleanString(n.replace_all) === !0];
  } else if (e === FILE_WRITE_TOOL_NAME) {
    let { content: content } = n;
    if (typeof content !== "string") return;
    o = [e, expandPath(file_path), content];
  } else return;
  return createHash("sha256").update(jsonStringify(o)).digest("hex");
}
//@ chunk-re9y5nwg.js:1319-1370 placement
var r = new SessionRootSlot(() => ({ calls: new Map(), hostAttests: !1 }));
//@ chunk-re9y5nwg.js:1370-1394 placement
function JYt() {
  return !1;
}
/**
 * 记录宿主已确认的工具调用（工具名、展开后的文件路径与写入摘要），供后续核对写入。
 */
//@ chunk-re9y5nwg.js:1394-1597 placement
function recordHostAttestedCall(e, n, t) {
  if (n !== "" && JYt()) {
    let of = r.of(e),
      file_path = t.input.file_path;
    (of.calls.set(n, {
      toolName: t.toolName,
      filePath: typeof file_path === "string" ? expandPath(file_path) : void 0,
      writeDigest: fileEditContextOf(t.toolName, t.input),
    }),
      (of.hostAttests = !0));
  }
}
//@ chunk-re9y5nwg.js:1597-1655 placement
function Pmi(e) {
  return r.peek(e)?.hostAttests === !0 && JYt();
}
//@ chunk-re9y5nwg.js:1655-1695 placement
var a = new SessionRootSlot(() => ({ byToolUse: new Map() }));
//@ chunk-re9y5nwg.js:1695-1769 placement
function kCt(e, n, t) {
  let { byToolUse: byToolUse } = a.of(e);
  byToolUse.set(n, [...(byToolUse.get(n) ?? []), t]);
}
/**
 * 工具调用结束时清除该 toolUseId 的已记录调用与挂起的回调（并依次执行回调）。
 */
//@ chunk-re9y5nwg.js:1769-1930 placement
function clearToolUsePermissionState(e, n) {
  if (e !== void 0) {
    r.peek(e)?.calls.delete(n);
    let t = a.peek(e)?.byToolUse.get(n);
    if (t !== void 0) {
      a.peek(e)?.byToolUse.delete(n);
      for (let o of t) o();
    }
  }
}
//@ chunk-re9y5nwg.js:1930-2000 placement
function Xlr(e, n) {
  return r.peek(e)?.calls.has(n) ? "host_dialog" : void 0;
}
/**
 * 判断写入/编辑调用是否与宿主确认过的调用一致（同工具、同路径、同写入摘要）。
 */
//@ chunk-re9y5nwg.js:2000-2242 placement
function isHostAttestedWrite(e, n, t) {
  if (n === void 0 || (t.toolName !== FILE_WRITE_TOOL_NAME && t.toolName !== FILE_EDIT_TOOL_NAME)) return !1;
  let o = r.peek(e)?.calls.get(n);
  return (
    o !== void 0 &&
    o.toolName === t.toolName &&
    o.filePath === t.absolutePath &&
    o.writeDigest !== void 0 &&
    o.writeDigest === fileEditContextOf(t.toolName, t.input)
  );
}
//@ chunk-re9y5nwg.js:2242-2336 placement
var d = new Set(),
  u = new SessionRootSlot(() => {
    let e = new Set();
    return (d.add(new WeakRef(e)), { editRuleContents: e });
  });
//@ chunk-re9y5nwg.js:2336-2553 placement
function getSessionEditRuleContents(e) {
  return e.flatMap((n) =>
    (n.type === "addRules" || n.type === "replaceRules") &&
    n.destination === "session" &&
    n.behavior === "allow"
      ? n.rules.flatMap((rule) =>
          rule.toolName === FILE_EDIT_TOOL_NAME && rule.ruleContent !== void 0 ? [rule.ruleContent] : [],
        )
      : [],
  );
}
//@ chunk-re9y5nwg.js:2553-2575 placement
function m() {
  return !1;
}
//@ chunk-re9y5nwg.js:2575-2687 placement
function isSkillEditRule(e) {
  let n = permissionRuleValueFromString(e);
  return (
    n.toolName === FILE_EDIT_TOOL_NAME &&
    n.ruleContent !== void 0 &&
    isSkillDirGlob(n.ruleContent) &&
    !isSkillDirectoryGlob(n.ruleContent)
  );
}
//@ chunk-re9y5nwg.js:2687-2955 placement
function isSessionRuleUpdate(e) {
  if (
    m() &&
    (e.type === "addRules" || e.type === "replaceRules") &&
    e.destination === "session" &&
    e.behavior === "allow"
  ) {
    let filtered = e.rules.filter((rule) => !isSkillEditRule(formatPermissionRule(rule)));
    if (filtered.length === e.rules.length) return e;
    return filtered.length === 0 && e.type === "addRules" ? void 0 : { ...e, rules: filtered };
  }
  return e;
}
//@ chunk-re9y5nwg.js:2955-3005 placement
function Mmi(e) {
  return m() ? e.filter((n) => !isSkillEditRule(n)) : e;
}
//@ chunk-re9y5nwg.js:3005-3073 placement
function Dmi(e, n) {
  for (let t of getSessionEditRuleContents(n)) u.of(e).editRuleContents.add(t);
}
/**
 * 从会话的编辑规则内容表中删除指定规则。
 */
//@ chunk-re9y5nwg.js:3073-3176 placement
function forgetSessionEditRules(e, n) {
  let t = u.peek(e)?.editRuleContents;
  if (t === void 0) return;
  for (let o of getSessionEditRuleContents(n)) t.delete(o);
}
//@ chunk-re9y5nwg.js:3176-3322 placement = propagateAbort (1)
function propagateAbort(e) {
  let n = getSessionEditRuleContents(e);
  if (n.length === 0) return;
  for (let t of d) {
    let parent = t.deref();
    if (parent === void 0) {
      d.delete(t);
      continue;
    }
    for (let s of n) parent.delete(s);
  }
}
/**
 * 把决策原因映射为日志 surface 字符串（rule/session/host_dialog 等）。
 */
//@ chunk-re9y5nwg.js:3322-3811 callgraph-fingerprint = decisionReasonToString (0.167)
function decisionReasonToString(e, n, t) {
  let o = u.peek(e)?.editRuleContents;
  if (o === void 0 || o.size === 0) return;
  let s = new Set(
    (t.alwaysAllowRules.session ?? []).flatMap((i) => {
      let l = permissionRuleValueFromString(i);
      return l.toolName === FILE_EDIT_TOOL_NAME && l.ruleContent !== void 0 ? [l.ruleContent] : [];
    }),
  );
  for (let i of o) if (!s.has(i)) o.delete(i);
  if (
    n?.type !== "rule" ||
    n.rule.source !== "session" ||
    n.rule.ruleBehavior !== "allow" ||
    n.rule.ruleValue.toolName !== FILE_EDIT_TOOL_NAME ||
    n.rule.ruleValue.ruleContent === void 0
  )
    return;
  return o.has(n.rule.ruleValue.ruleContent) ? "host_dialog" : void 0;
}
//@ chunk-s4bxxzsw.js:46009-49187 placement
async function repromptFilePermission(e, r) {
  let { ctx: ctx, description: description, result: y } = e,
    R = permissionRequestOrigin(ctx.toolUseContext),
    C =
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
            (ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID), r(x));
          },
    D = new CountedAsk(),
    {
      resolve: resolve,
      isResolved: isResolved,
      claim: claim,
    } = createResolveOnce((x) => {
      (D.settle(), C(x));
    }),
    h = { resolve: resolve, isResolved: isResolved, claim: claim, countedAsk: D },
    w = "dark",
    B = (x) => ctx.toolUseContext.forRemoteExecution === !0 || Cf(x),
    F = {
      tool: ctx.tool,
      description: description,
      toolUseID: ctx.toolUseID,
      assistantMessage: ctx.assistantMessage,
      theme: "dark",
      requestSource: R,
      session: ctx.toolUseContext.session,
      toolState: ctx.toolUseContext.toolState,
      networkAllowListHonoured:
        !B(y.updatedInput ?? ctx.input) && b4s(getToolPermissionContext(ctx.toolUseContext)),
    };
  function P() {
    showPermissionDialog(e, h, {
      dialog: PERMISSION_PROMPT_DIALOG,
      buildDescriptor: ({ input: input, permissionResult: permissionResult }) =>
        buildPermissionPromptPayload({
          ...F,
          ...(ctx.tool.name.startsWith(CFC_TOOL_PREFIX) &&
            permissionResult.inPlaceOfClassifier === !0 &&
            permissionResult.metadata?.command.description !== void 0 && {
              description: permissionResult.metadata.command.description,
            }),
          input: input,
          permissionResult: permissionResult,
          permissionMode: getToolPermissionContext(ctx.toolUseContext).mode,
        }),
    });
  }
  let E = classifyBashCommand(ctx.tool),
    V = E?.dialog.kind === BROWSER_PERMISSION_CARD.kind && y.inPlaceOfClassifier === !0;
  if (E !== void 0 && !V) {
    let x = !!(e.bridgeCallbacks || (e.channelCallbacks && !ctx.tool.requiresUserInteraction?.())),
      { race: race } = E;
    showPermissionDialog(e, h, {
      dialog: E.dialog,
      resultWhenNotShown: E.resultWhenNotShown,
      buildDescriptor: ({ input: input, permissionResult: permissionResult }) =>
        E.build({ ...F, input: input, permissionResult: permissionResult, hasExternalRacer: x }),
      onRacersReady:
        race &&
        ((M) =>
          M.addTeardown(
            race({
              ctx: ctx,
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
    let x = y.updatedInput ?? ctx.input,
      q = getToolInputPath(ctx.tool, x);
    if (q !== null) {
      let M = y.localDisplayOnly === !0 ? null : await getIdeDiffTarget(ctx.tool, x, ctx.toolUseContext),
        now = Date.now(),
        H,
        ke = B(x),
        Re = await buildFilePermissionDescriptor({
          ...F,
          input: x,
          permissionResult: y,
          filePath: q,
          remoteWorkspace: ke,
        });
      if (ctx.resolveIfAborted(h.resolve)) return;
      showPermissionDialog(e, h, {
        dialog: FILE_PERMISSION_CARD,
        buildDescriptor: ({ input: input, permissionResult: permissionResult }) => {
          if (H?.isReprompted() !== !0) {
            if (M !== null)
              return { ...Re, permissionResult: permissionResult, showingDiffInIDE: !0, ideName: M.ideName };
            return { ...Re, permissionResult: permissionResult };
          }
          return (async function* () {
            try {
              let pe = getToolInputPath(ctx.tool, input);
              if (pe === null) throw Error("no file path could be derived from the hook-rewritten input");
              yield await buildFilePermissionDescriptor({
                ...F,
                input: input,
                permissionResult: permissionResult,
                filePath: pe,
                remoteWorkspace: B(input),
              });
            } catch (error) {
              if (
                (logForDebugging(
                  `File permission reprompt: cannot preview the hook-rewritten input of ${ctx.tool.name} (${errorMessage(error)}); denying instead of showing a stale preview`,
                  { level: "error" },
                ),
                claim())
              )
                (H?.dismissAndTeardown(),
                  H?.logRepromptDenyDecision(),
                  resolve(
                    ctx.cancelAndAbort(
                      `Failed to preview the hook-rewritten file operation: ${errorMessage(error)}`,
                    ),
                  ));
            }
          })();
        },
        unaryEvent: getCompletionTypeForTool(ctx.tool, x, q),
        onRacersReady: (Q) => {
          if (((H = Q), M === null)) return;
          let { closeTab: closeTab } = useDiffInIDE({
            ctx: Q.ctx,
            tool: ctx.tool,
            input: x,
            permissionResult: y,
            permissionPromptStartTimeMs: now,
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
    let x = getToolPermissionContext(ctx.toolUseContext);
    showPermissionDialog(e, h, {
      dialog: BASH_PERMISSION_CARD,
      buildDescriptor: ({ input: input, permissionResult: permissionResult }) =>
        buildBashPermissionPayload({
          ...F,
          input: input,
          permissionResult: permissionResult,
          classifierState: "none",
          toolPermissionContext: x,
        }),
    });
    return;
  }
  P();
}
//@ chunk-s4bxxzsw.js:49187-49241 layout
class dt {
  last = 0;
  next() {
    return ((this.last += 1), this.last);
  }
}
//@ chunk-s4bxxzsw.js:49241-49266 layout
var Xt = new HostScoped(() => new dt());
/**
 * 打开并管理一个权限对话框：用 toolUseContext.requestDialog(dialog, descriptor, …) 入对话框队列，记录 tengu_tool_use_show_permission_request，处理对话框结果（allow/reject/反馈/模式切换/规则持久化）、超时与中止，结束时执行 teardown。
 */
//@ chunk-s4bxxzsw.js:49266-60333 callgraph-witnessed = usePermissionRequestLogging (0.155)
function showPermissionDialog(e, r, n) {
  let {
      description: description,
      result: y,
      awaitAutomatedChecksBeforeDialog: awaitAutomatedChecksBeforeDialog,
      bridgeCallbacks: bridgeCallbacks,
      bridgeDialogCallbacks: bridgeDialogCallbacks,
      channelCallbacks: channelCallbacks,
    } = e,
    { resolve: resolve, isResolved: isResolved, claim: claim, countedAsk: countedAsk } = r,
    B,
    F = !1,
    ctx = e.ctx,
    requestDialog = ctx.toolUseContext.requestDialog;
  if (requestDialog === void 0) return;
  let V = requestDialog,
    agentContext = ctx.toolUseContext.agentContext,
    q = isUnattendedAgentContext(ctx.toolUseContext),
    M = q,
    askPatience = y.askPatience;
  askPatience?.hold();
  let now = Date.now(),
    of = Xt.of(ctx.toolUseContext.session.host),
    Re = of.next(),
    Q = y.updatedInput ?? ctx.input,
    decisionReason = y.decisionReason,
    j = y,
    pe = 0,
    De,
    L = [];
  function me() {
    if (L.length === 0) return;
    let splice = L.splice(0, L.length);
    for (let Z of splice)
      try {
        Z();
      } catch (error) {
        logForDebugging(`Dialog teardown failed: ${errorMessage(error)}`, { level: "error" });
      }
  }
  let ce = !1,
    ie = n.unaryEvent ?? { completion_type: "tool_use_single", language_name: lit("none") },
    signal = ctx.toolUseContext.abortController.signal;
  function Ce() {
    if (ce) return;
    ce = !0;
    let permissionMode = ctx.permissionMode;
    (ctx.toolUseContext.applyAttributionOp({ kind: "incrementPermissionPrompt" }),
      logEvent("tengu_tool_use_show_permission_request", {
        messageID: ye(ctx.messageId),
        toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
        isMcp: ctx.tool.isMcp ?? !1,
        ...mcpToolLogFields(ctx.tool, ctx.toolUseContext.options.mcpClients),
        decisionReasonType: fromEnumOpt(j.decisionReason?.type),
        sandboxEnabled: SandboxManager.isSandboxingEnabled(),
        permissionMode: fromEnum(permissionMode),
        requestSource: fromEnumOpt(permissionRequestOrigin(ctx.toolUseContext)?.type),
        originAgentType: fromEnum(
          isSubagentContext(agentContext) && agentContext.isMainSession ? "main" : agentContext.agentType,
        ),
      }),
      logUnaryEvent({
        completion_type: ie.completion_type,
        event: "response",
        metadata: {
          language_name: ie.language_name,
          message_id: ctx.assistantMessage.message.id,
          platform: env.platform,
        },
      }));
  }
  function ge(_) {
    logUnaryEvent({
      completion_type: ie.completion_type,
      event: _,
      metadata: {
        language_name: ie.language_name,
        message_id: ctx.assistantMessage.message.id,
        platform: env.platform,
      },
    });
  }
  function re() {
    (De?.abort(), KE.clearHookFailure(ctx.toolUseID), KE.closeAsk(ctx.toolUseID), subscribe(), me());
  }
  let Ae = 0,
    { notifyBridgeAndTeardown: notifyBridgeAndTeardown } = handleInteractivePermission({
      ctx: ctx,
      description: description,
      result: y,
      displayInput: Q,
      permissionPromptStartTimeMs: now,
      awaitAutomatedChecksBeforeDialog: awaitAutomatedChecksBeforeDialog,
      bridgeCallbacks: bridgeCallbacks,
      bridgeDialogCallbacks: bridgeDialogCallbacks,
      channelCallbacks: channelCallbacks,
      claim: claim,
      isResolved: isResolved,
      onWin(_) {
        if (j.offersBlockOutsideReads === !0 && _.behavior === "allow")
          ctx.toolUseContext.session.outsideReadPrompt.markAnswered();
        (re(), resolve(_));
      },
      onReprompt(_, Z, G) {
        ((Ae += 1),
          (Q = _),
          (decisionReason = Z),
          (j = {
            ...G,
            ...(j.denialLimitFallback !== void 0 && { denialLimitFallback: j.denialLimitFallback }),
            ...(j.autoDenyWindow !== void 0 && { autoDenyWindow: j.autoDenyWindow }),
            ...(j.oneTimeAnswersOnly === !0 && {
              suggestions: void 0,
              suppressAlwaysAllowRule: !0,
              oneTimeAnswersOnly: !0,
            }),
            ...(j.offersBlockOutsideReads === !0 &&
              G.decisionReason?.type === "workingDir" && { offersBlockOutsideReads: !0 }),
          }),
          commitProvisionalRecord(ctx.toolUseContext, ctx.toolUseID, _, j, ctx.tool.name));
        let he = De;
        me();
        try {
          lo();
        } finally {
          he?.abort();
        }
      },
      onRemoteDialogAnswer(_) {
        (De?.abort(), mo(_, void 0));
      },
    }),
    we = !1,
    Oe,
    $e,
    Be,
    ze,
    ve,
    Le,
    so = (_) => {
      if (typeof _ !== "object" || _ === null || $9t(_)) return;
      let networkAllowHosts = _.networkAllowHosts;
      return Array.isArray(networkAllowHosts) && networkAllowHosts.every((G) => typeof G === "string")
        ? networkAllowHosts
        : void 0;
    },
    ao = () => {
      if (we || isResolved()) return;
      if ((Oe?.(), ve !== void 0)) ze?.({ ...ve, permissionResult: j });
    },
    subscribe = aF.subscribe(() => {
      if (isResolved()) return;
      if (Oe !== void 0 && !we) {
        let _ = isAutoAllowedInMode(ctx.tool, getToolPermissionContext(ctx.toolUseContext));
        if (!(isAutoClassifierActive(_) || (_pn(y.autoDenyWindow) && _ === "bypassPermissions"))) ao();
      }
      if (
        isBypassImmuneDecision(
          { decisionReason: j.decisionReason, forcedByCaller: y.forcedByCaller, personOnly: j.personOnly },
          ctx.tool,
          ctx.toolUseContext,
        )
      )
        return;
      hasPermissionsToUseTool(
        ctx.tool,
        ctx.input,
        { ...ctx.toolUseContext, permissionRound: void 0 },
        ctx.assistantMessage,
        ctx.toolUseID,
      )
        .then((_) => {
          if (_.behavior !== "allow") {
            if (isResolved()) ctx.toolUseContext.session.outsideReadPrompt.closeFor(ctx.toolUseID);
            return;
          }
          if (!claim()) return;
          (dropPermissionRecord(ctx.toolUseContext, ctx.toolUseID),
            subscribe(),
            notifyBridgeAndTeardown(),
            De?.abort(),
            KE.clearHookFailure(ctx.toolUseID),
            KE.closeAsk(ctx.toolUseID),
            me(),
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
            }),
            resolve(ctx.buildAllow(_.updatedInput ?? ctx.input, { decisionReason: _.decisionReason })));
        })
        .catch((_) => {
          if (!isAbortError(_))
            logError(
              withTelemetryMessage(toError(_), "permissionRecheckSignal: hasPermissionsToUseTool failed"),
            );
        });
    });
  function lo() {
    let _ = ++pe;
    if ((askPatience?.hold(), (ve = void 0), !0)) ut();
    let abortController = new AbortController();
    De = abortController;
    let he = () => abortController.abort();
    if (signal.aborted) abortController.abort();
    else signal.addEventListener("abort", he, { once: !0 });
    let descriptor = n.buildDescriptor({ input: Q, permissionResult: j });
    Le = so(descriptor);
    let be,
      fo = !1,
      yo = [],
      go = (X) => {
        if (we) X = { ...X, permissionResult: j };
        if (((ve = X), (Le = so(X)), be !== void 0)) {
          let Ne = be;
          ((be = void 0), Ne({ value: X, done: !1 }));
        } else yo.push(X);
      },
      ho = (X) => {
        if ($9t(X))
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
            if (fo) return Promise.resolve({ value: void 0, done: !0 });
            let X = yo.shift();
            if (X !== void 0) return Promise.resolve({ value: X, done: !1 });
            return new Promise((Ne) => {
              be = Ne;
            });
          },
          return: () => {
            let X = { value: void 0, done: !0 };
            return (be?.(X), (be = void 0), Promise.resolve(X));
          },
        };
      },
    };
    Ce();
    let Po = y.personOnly === !0,
      Qe = M || Po,
      bo = !Qe && xe !== void 0,
      ko = Qe ? of.next() : Re;
    KE.openAsk(
      { ...bridgeApprovalPrompt({ tool: ctx.tool, input: Q }), toolUseID: ctx.toolUseID },
      { order: ko, onTop: bo },
    );
    let wo = xe !== void 0 && !co && !we,
      Do = () => {
        ((fo = !0), be?.({ value: void 0, done: !0 }), (be = void 0));
      };
    if (wo) {
      if (abortController.signal.aborted) Do();
      else abortController.signal.addEventListener("abort", Do, { once: !0 });
      ho(descriptor);
    }
    let Ro = V(n.dialog, wo ? ft : descriptor, {
      signal: abortController.signal,
      place: Qe ? "under" : bo ? void 0 : "queue",
      askOrder: ko,
      armInputGrace:
        M ||
        Po ||
        y.denialLimitFallback !== void 0 ||
        y.autoDenyWindow !== void 0 ||
        y.oneTimeAnswersOnly === !0,
      ...!1,
      onFirstReveal: askPatience?.resume,
      ...(isNotAskUserQuestionCard(n.dialog.kind) && { countedAsk: countedAsk }),
    });
    (Ro.then(void 0, () => {
      if (_ === pe) countedAsk.settle();
    }),
      Ro.then(
        (X) => {
          if ((signal.removeEventListener("abort", he), _ !== pe)) return;
          if (!claim()) return;
          mo(X, "host_dialog");
        },
        (X) => {
          if (_ === pe) KE.closeAsk(ctx.toolUseID);
          throw X;
        },
      ));
  }
  function mo(_, Z) {
    switch ((KE.clearHookFailure(ctx.toolUseID), KE.closeAsk(ctx.toolUseID), subscribe(), me(), _.behavior)) {
      case "allow": {
        if (y.denialLimitFallback !== void 0)
          (resetDenialStreakAfterUserApproval(ctx.toolUseContext),
            logFeatureOk("permission_auto_mode_denial_fallback", { autoDenied: !1 }));
        if (_pn(y.autoDenyWindow))
          (rwt(), logFeatureOk("permission_safety_check_timed_dialog", { autoDenied: !1 }));
        if (j.offersBlockOutsideReads === !0 && _.askAgainOutsideReads !== !0)
          markOutsideReadPromptSeen(ctx.toolUseContext);
        if (Le !== void 0)
          rememberCommandNetworkLists(ctx.toolUseID, ctx.tool, { ...Q, allowed_domains: [...Le] });
        let G = y.inPlaceOfClassifier === !0 ? [] : (_.permissionUpdates ?? []);
        (notifyBridgeAndTeardown({
          behavior: "allow",
          updatedInput: _.updatedInput,
          updatedPermissions: [...G],
        }),
          ge("accept"),
          resolve(
            ctx.handleUserAllow(_.updatedInput, G, {
              feedback: _.feedback,
              permissionPromptStartTimeMs: now,
              contentBlocks: _.contentBlocks,
              decisionReason: decisionReason,
              matchedAskRule: j.matchedAskRule,
              surface: Z,
            }),
          ));
        return;
      }
      case "deny": {
        if (y.denialLimitFallback !== void 0)
          logFeatureOk("permission_auto_mode_denial_fallback", { autoDenied: !1 });
        if (_pn(y.autoDenyWindow))
          (rwt(), logFeatureOk("permission_safety_check_timed_dialog", { autoDenied: !1 }));
        let G =
          ACCOUNT_MEMORY_PERMISSION_MODULE !== null &&
          n.dialog.kind === ACCOUNT_MEMORY_PERMISSION_MODULE.accountMemoryWritePermissionDialog.kind
            ? _.declineMessage
            : void 0;
        if (
          (notifyBridgeAndTeardown({
            behavior: "deny",
            message: G || (_.feedback ?? "User denied permission"),
          }),
          ge("reject"),
          ctx.logDecision(
            { decision: "reject", source: { type: "user_reject", hasFeedback: !!_.feedback } },
            { permissionPromptStartTimeMs: now, input: Q },
          ),
          y.askEnded?.() === !0)
        ) {
          resolve({ behavior: "ask", message: WITHDRAWN_REQUEST_ANSWER_TEXT });
          return;
        }
        if (G) {
          resolve({
            behavior: "ask",
            message: G,
            decisionReason: { type: "other", reason: "declined at the dialog" },
          });
          return;
        }
        if (j.offersBlockOutsideReads === !0) {
          if (_.blockOutsideReads === !0) {
            let he = (Pe, be) =>
              resolve({
                behavior: "deny",
                message:
                  "The user chose to block reads outside the working directories (permissions.blockReadsOutsideWorkingDirectories). Ask the user to add the directory with /add-dir, or to remove that setting." +
                  (Pe
                    ? ` Tell the user: the setting could not be saved to user settings (${Pe.message}); the file tools are fenced for this session only, sandboxed commands are not.`
                    : be
                      ? ""
                      : " Tell the user: the setting is saved, but sandboxed commands may not be fenced until the settings change is picked up."),
                decisionReason: { type: "other", reason: OUTSIDE_READS_BLOCKED_DENY_REASON },
              });
            persistBlockReadsOutsideWorkspace(ctx.toolUseContext)
              .then(({ error: error, sandboxRefreshed: sandboxRefreshed }) => he(error, sandboxRefreshed))
              .catch((Pe) => he(toError(Pe), !1));
            return;
          }
          resolve({
            behavior: "ask",
            message: _.feedback
              ? `The user did not allow this read outside the working directories: ${_.feedback}`
              : "The user did not allow this read outside the working directories.",
            contentBlocks: _.contentBlocks,
            ...(_.feedback && { userFeedback: _.feedback }),
            decisionReason: { type: "other", reason: "outside read declined, ask again next time" },
          });
          return;
        }
        resolve(ctx.cancelAndAbort(_.feedback, void 0, _.contentBlocks, { feedbackIsFromUser: !0 }));
        return;
      }
      case "cancelled": {
        if (
          (notifyBridgeAndTeardown({ behavior: "deny", message: "User aborted" }),
          ge("reject"),
          ctx.logCancelled(),
          ctx.logDecision(
            { decision: "reject", source: { type: "user_abort" } },
            { permissionPromptStartTimeMs: now, input: Q },
          ),
          q)
        ) {
          resolve({ behavior: "ask", message: SUBAGENT_REJECT_MESSAGE });
          return;
        }
        if (y.askEnded?.() === !0) {
          resolve({ behavior: "ask", message: WITHDRAWN_REQUEST_ANSWER_TEXT });
          return;
        }
        if ("wasNotShown" in _ && n.resultWhenNotShown) {
          resolve({
            behavior: "ask",
            message: n.resultWhenNotShown(ctx, "wasTakenAway" in _),
            decisionReason: { type: "other", reason: "the ask was not shown" },
          });
          return;
        }
        resolve(ctx.cancelAndAbort(void 0, !0));
        return;
      }
    }
  }
  let xe = y.denialLimitFallback?.autoDenyAfterMs ?? y.autoDenyWindow?.autoDenyAfterMs,
    Se = y.denialLimitFallback?.autoDenyResolution ?? y.autoDenyWindow?.autoDenyResolution,
    co = q && y.autoDenyWindow?.notASafetyCheck !== !0,
    Ue,
    je,
    Ve = () => y.autoDenyWindow?.notASafetyCheck === !0 && I5s(),
    Ee = !1;
  function po() {
    if (xe === void 0 || we || isResolved()) return;
    Ee = Ve();
    let _ = Ee ? 0 : xe;
    if (((Ue = Date.now() + _), uo(_, Ue), ve !== void 0)) ze?.({ ...ve, permissionResult: j });
  }
  function uo(_, Z) {
    if (Se === void 0) return;
    (clearTimeout(je),
      (j =
        j.denialLimitFallback !== void 0
          ? { ...j, denialLimitFallback: $5s(j.denialLimitFallback, Z) }
          : j.autoDenyWindow !== void 0
            ? { ...j, autoDenyWindow: N5s(j.autoDenyWindow, Z) }
            : j));
    let max = Math.max(0, Z - Date.now()),
      message = Se.message;
    ((je = setTimeout(() => {
      if (!Ve() && (Ee || lAt(n.dialog.kind))) {
        po();
        return;
      }
      if (!claim()) return;
      if (
        (re(),
        notifyBridgeAndTeardown({ behavior: "deny", message: message }),
        y.denialLimitFallback !== void 0)
      )
        (logEvent("tengu_auto_mode_denial_dialog_auto_denied", {
          toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
          isMcp: ctx.tool.isMcp ?? !1,
          timeoutMs: _,
        }),
          logFeatureOk("permission_auto_mode_denial_fallback", { autoDenied: !0 }));
      else if (_pn(y.autoDenyWindow))
        (logEvent("tengu_safety_check_dialog_auto_denied", {
          toolName: sanitizeToolNameForAnalytics(ctx.tool.name),
          isMcp: ctx.tool.isMcp ?? !1,
          permissionMode: fromEnum(ctx.permissionMode),
          promptSurface: lit("terminal"),
          circuitBreaker: fromEnumOpt(
            Se.decisionReason.type === "safetyCheck" ? Se.decisionReason.circuitBreaker : void 0,
          ),
          timeoutMs: _,
          elapsedMs: Date.now() - now,
          unansweredThisSession: P5s(),
        }),
          logFeatureOk("permission_safety_check_timed_dialog", { autoDenied: !0 }));
      (ge("reject"),
        ctx.logDecision(
          { decision: "reject", source: "config", decisionReason: Se.decisionReason },
          { permissionPromptStartTimeMs: now, input: Q },
        ),
        e.onClassifierDenyDelivered?.(Se),
        resolve(Se));
    }, max)),
      je.unref?.());
  }
  function ut() {
    if (xe === void 0 || Se === void 0 || co || we) return;
    if (Ee) Ue = void 0;
    Ee = Ve();
    let _ = Ee ? 0 : xe;
    ((Ue ??= Date.now() + _),
      uo(_, Ue),
      L.push(() => clearTimeout(je)),
      (Oe = () => {
        ((we = !0), clearTimeout(je));
        let denialLimitFallback = j.denialLimitFallback;
        if (denialLimitFallback !== void 0)
          j = { ...j, denialLimitFallback: stripAutoDenyFields(denialLimitFallback) };
        else if (j.autoDenyWindow !== void 0) {
          let { autoDenyWindow: autoDenyWindow, ...Pe } = j;
          if (((j = Pe), _pn(autoDenyWindow))) rwt();
          else O5s({ expired: !1 });
        }
      }),
      $e?.(),
      ($e = Lo.subscribe(() => {
        ao();
      })),
      L.push(() => $e?.()),
      Be?.());
    let Z = lAt(n.dialog.kind);
    ((Be = G8r(() => {
      let loggedToolUseID = lAt(n.dialog.kind);
      if (Z && !loggedToolUseID) po();
      Z = loggedToolUseID;
    })),
      L.push(() => {
        (Be?.(), (Be = void 0));
      }));
  }
  (n.onRacersReady?.({
    ctx: ctx,
    dismissAndTeardown: re,
    notifyBridge: notifyBridgeAndTeardown,
    isReprompted: () => Ae > 0,
    addTeardown: (prev) => {
      L.push(prev);
    },
    logRepromptDenyDecision: () => {
      (ge("reject"),
        ctx.logDecision(
          { decision: "reject", source: { type: "hook" } },
          { permissionPromptStartTimeMs: now, input: Q },
        ));
    },
  }),
    lo());
}
//@ chunk-wyqg6m3h.js:36666-36692 fingerprint = permissionResultToLog (0.387)
var askKeyOf = (permissionResult) => `ask:${sanitizeName(permissionResult)}`;

export {
  isSkillDirGlob,
  decisionReasonToString,
  repromptFilePermission,
  isSessionRuleUpdate,
  propagateAbort,
  JYt,
  recordHostAttestedCall,
  isHostDialogApproval,
  Pmi,
  isHostAttestedWrite,
  clearToolUsePermissionState,
  kCt,
  Mmi,
  Xlr,
  forgetSessionEditRules,
  Dmi,
  askKeyOf,
};
