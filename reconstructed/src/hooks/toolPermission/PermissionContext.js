/**
 * hooks/toolPermission/PermissionContext.ts
 *
 * 权限上下文：一次工具权限请求的 resolve-once、日志、持久化规则、取消/中止、buildAllow/cancelAndAbort。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/PermissionContext.ts
 * pieces: chunk-s4bxxzsw.js (3)
 * attribution: file-last-pair 1, fingerprint 2
 */
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { logPermissionDecision_2 } from "./permissionLogging.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { isHookOrPluginSteered } from "../../utils/agentContext.js";
import { forgetSessionEditRules, Dmi } from "../../components/permissions/hooks.js";
import {
  persistPermissionUpdates,
  applyPermissionUpdates,
  supportsPersistence,
  sanitizePermissionUpdates,
} from "../../utils/permissions/PermissionUpdate.js";
import { logError } from "../../utils/log.js";
import { aF, setPermissionModeWithGuards } from "../../utils/permissions/permissionSetup.js";
import {
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE,
  REJECT_MESSAGE,
  withMemoryCorrectionHint,
} from "../../utils/messages.js";
import { logForDebugging } from "../../utils/debug.js";
import { executePermissionRequestHooks } from "../../utils/hooks.js";
import { requiresConnectorGrant } from "../../services/mcp/claudeai.js";
import {
  obe,
  guardHookUpdatedInput,
  checkRuleBasedPermissions,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  permissionGrantScope,
} from "../../utils/permissions/permissions.js";
import {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
} from "../../utils/hooks/hookUpdatedInput.js";
import { withProvisionalRecord } from "../../utils/permissions/permissionRecord.js";
import { turnAbortControllerOf } from "../../utils/abortController.js";
import {
  normalizePermissionUpdate,
  suggestWebToolRule,
} from "../../utils/permissions/permissionRulePayload.js";
import { logShellAllowRuleAdded } from "../../utils/permissions/shellAllowRuleTelemetry.js";
import { applyMcpServerAllowRule } from "../../services/mcp/mcpStandardKeys.js";

//@ chunk-s4bxxzsw.js:32505-32586 file-last-pair
function createPermissionQueueOps({
  feedback: feedback,
  contentBlocks: contentBlocks,
  isSubagent: isSubagent,
}) {
  return !feedback && !contentBlocks?.length && !isSubagent;
}
//@ chunk-s4bxxzsw.js:32586-32724 fingerprint = createResolveOnce (1)
function createResolveOnce(resolve) {
  let r = !1,
    n = !1;
  return {
    resolve(s) {
      if (n) return;
      ((n = !0), (r = !0), resolve(s));
    },
    isResolved() {
      return r;
    },
    claim() {
      if (r) return !1;
      return ((r = !0), !0);
    },
  };
}
/**
 * 为一次权限请求创建上下文对象：logDecision、logCancelled、persistPermissions（写规则）、setModeFromBridge、resolveIfAborted、buildAllow、cancelAndAbort、runHooks。
 */
//@ chunk-s4bxxzsw.js:32724-37374 fingerprint = createPermissionContext (0.746)
function createPermissionContext(
  tool,
  input,
  toolUseContext,
  assistantMessage,
  toolUseID,
  setToolPermissionContext,
  queueOps,
) {
  let messageId = assistantMessage.message.id,
    mode = getToolPermissionContext(toolUseContext).mode;
  function k(h, w) {
    logPermissionDecision_2(
      {
        tool: tool,
        input: w?.input ?? input,
        toolUseContext: toolUseContext,
        messageId: messageId,
        requestId: assistantMessage.requestId,
        toolUseID: toolUseID,
        permissionMode: mode,
      },
      h,
      w?.permissionPromptStartTimeMs,
    );
  }
  return Object.freeze({
    tool: tool,
    input: input,
    toolUseContext: toolUseContext,
    assistantMessage: assistantMessage,
    messageId: messageId,
    toolUseID: toolUseID,
    setClassifierApprovals: setToolPermissionContext,
    permissionMode: mode,
    logDecision: k,
    logCancelled() {
      logEvent("tengu_tool_use_cancelled", {
        messageID: ye(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
      });
    },
    persistPermissions(h) {
      if (h.length === 0 || isHookOrPluginSteered(toolUseContext)) return !1;
      if (
        (forgetSessionEditRules(toolUseContext.session, h),
        persistPermissionUpdates(h, toolUseContext.storageV5).catch(logError),
        queueOps !== void 0)
      )
        queueOps(h);
      else
        (toolUseContext.setSessionToolPermissionContext((w) => applyPermissionUpdates(w, h)),
          setImmediate(() => {
            aF.emit();
          }));
      return h.some((update) => supportsPersistence(update.destination));
    },
    setModeFromBridge(h) {
      return setPermissionModeWithGuards(
        h,
        getToolPermissionContext(toolUseContext),
        toolUseContext.setToolPermissionContext,
      );
    },
    resolveIfAborted(h) {
      if (!toolUseContext.abortController.signal.aborted) return !1;
      return (this.logCancelled(), h(this.cancelAndAbort(void 0, !0)), !0);
    },
    cancelAndAbort(h, w, B, F) {
      let sub = !!toolUseContext.agentId,
        E = h
          ? `${sub ? SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX : REJECT_MESSAGE_WITH_REASON_PREFIX}${h}`
          : sub
            ? SUBAGENT_REJECT_MESSAGE
            : REJECT_MESSAGE,
        V = sub ? E : withMemoryCorrectionHint(E);
      if (w || createPermissionQueueOps({ feedback: h, contentBlocks: B, isSubagent: sub }))
        (logForDebugging(`Aborting: tool=${tool.name} isAbort=${w} hasFeedback=${!!h} isSubagent=${sub}`),
          toolUseContext.abortController.abort());
      return {
        behavior: "ask",
        message: V,
        contentBlocks: B,
        ...(F?.feedbackIsFromUser && h && { userFeedback: h }),
      };
    },
    async runHooks(h, w, B, F, P, E) {
      if (toolUseContext.forRemoteExecution === !0) return null;
      for await (let hookResult of executePermissionRequestHooks(
        tool.name,
        toolUseID,
        input,
        toolUseContext,
        h,
        w,
        toolUseContext.abortController.signal,
      ))
        if (hookResult.permissionRequestResult) {
          let decision = hookResult.permissionRequestResult;
          if (decision.behavior === "allow") {
            if (requiresConnectorGrant(tool) || (!decision.updatedInput && tool.requiresUserInteraction?.()))
              return null;
            if (obe(tool, input, decision.updatedInput, !0)) {
              let H = guardAccountMemoryHookRewrite(tool, "PermissionRequest");
              return (
                this.logDecision(
                  { decision: "reject", source: "config" },
                  { input: input, permissionPromptStartTimeMs: E },
                ),
                H
              );
            }
            let q = await validatePermissionRequestUpdatedInput(tool, decision.updatedInput, input, (H) =>
              tool.validateInput?.(H, { ...toolUseContext, toolUseId: toolUseID }),
            );
            if (q.deny !== void 0)
              return (
                this.logDecision(
                  { decision: "reject", source: { type: "hook" } },
                  { input: input, permissionPromptStartTimeMs: E },
                ),
                q.deny
              );
            let input_2 = q.input,
              finalInput = input_2 ?? P ?? input;
            if (input_2) {
              let H = guardHookUpdatedInput(
                await withProvisionalRecord(toolUseContext, toolUseID, tool.name, () =>
                  checkRuleBasedPermissions(
                    tool,
                    finalInput,
                    { ...toolUseContext, toolUseId: toolUseID },
                    { hookUpdatedInput: input_2 },
                  ),
                ),
                tool.name,
              );
              if (H?.behavior === "deny")
                return (
                  this.logDecision(
                    { decision: "reject", source: "config" },
                    { input: finalInput, permissionPromptStartTimeMs: E },
                  ),
                  { ...H, decideLocation: "ask-path" }
                );
              if (H?.behavior === "ask") return { reprompted: H, finalInput: finalInput };
            }
            return this.handleHookAllow(finalInput, decision.updatedPermissions ?? [], B, F, E);
          } else if (decision.behavior === "deny") {
            if (
              (this.logDecision(
                { decision: "reject", source: { type: "hook" } },
                { permissionPromptStartTimeMs: E },
              ),
              decision.interrupt)
            )
              (logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`),
                turnAbortControllerOf(toolUseContext.abortController).abort());
            return this.buildDeny(decision.message || "Permission denied by hook", {
              type: "hook",
              hookName: "PermissionRequest",
              reason: decision.message,
            });
          }
        }
      return null;
    },
    buildAllow(h, w) {
      return {
        behavior: "allow",
        updatedInput: h,
        userModified: w?.userModified ?? !1,
        ...(w?.decisionReason && { decisionReason: w.decisionReason }),
        ...(w?.acceptFeedback && { acceptFeedback: w.acceptFeedback }),
        ...(w?.contentBlocks && w.contentBlocks.length > 0 && { contentBlocks: w.contentBlocks }),
        ...(w?.matchedAskRule && { matchedAskRule: w.matchedAskRule }),
      };
    },
    buildDeny(h, w) {
      return { behavior: "deny", message: h, decisionReason: w, decideLocation: "ask-path" };
    },
    handleUserAllow(h, w, B) {
      let F = normalizePermissionUpdate(
          [...sanitizePermissionUpdates(w)],
          B?.surface === "host_dialog" &&
            tool.suppressesAlwaysAllowRule?.(input) !== !0 &&
            B.askSuppressesAlwaysAllowRule !== !0
            ? suggestWebToolRule(tool, input)
            : void 0,
          getToolPermissionContext(toolUseContext),
        ),
        P =
          toolUseContext.forRemoteExecution === !0 || isHookOrPluginSteered(toolUseContext)
            ? []
            : tool.suppressesAllPermissionUpdates?.(input) === !0
              ? withoutGrantsForRemoteScope(F)
              : tool.suppressesAlwaysAllowRule?.(input) === !0 || B?.askSuppressesAlwaysAllowRule === !0
                ? stripWholeToolGrantsForAsk(F, tool, getToolPermissionContext(toolUseContext))
                : F,
        persistPermissions = this.persistPermissions(P);
      if ((logShellAllowRuleAdded(P), B?.surface === "host_dialog")) {
        if (
          toolUseContext.forRemoteExecution !== !0 &&
          !isHookOrPluginSteered(toolUseContext) &&
          tool.suppressesAllPermissionUpdates?.(input) !== !0 &&
          B.askSuppressesAlwaysAllowRule !== !0
        )
          applyMcpServerAllowRule(tool, F, (M) => {
            this.persistPermissions([M]);
          });
        Dmi(toolUseContext.session, P);
      }
      let V = permissionGrantScope(P);
      this.logDecision(
        {
          decision: "accept",
          source: { type: "user", permanent: persistPermissions },
          surface: B?.surface,
          scope: V === "once" && getToolPermissionContext(toolUseContext).mode !== mode ? "session" : V,
        },
        { input: h, permissionPromptStartTimeMs: B?.permissionPromptStartTimeMs },
      );
      let x = tool.inputsEquivalent ? !tool.inputsEquivalent(input, h) : !1,
        trimmedFeedback = B?.feedback?.trim();
      return this.buildAllow(h, {
        userModified: x,
        decisionReason: B?.decisionReason,
        acceptFeedback: trimmedFeedback || void 0,
        contentBlocks: B?.contentBlocks,
        matchedAskRule: B?.matchedAskRule,
      });
    },
    handleHookAllow(h, w, B, F, P) {
      if (F()) return this.buildAllow(h, { decisionReason: { type: "hook", hookName: "PermissionRequest" } });
      let E = sanitizePermissionUpdates(w),
        persistPermissions = this.persistPermissions(
          toolUseContext.forRemoteExecution === !0
            ? []
            : tool.suppressesAllPermissionUpdates?.(input) === !0
              ? withoutGrantsForRemoteScope(E)
              : tool.suppressesAlwaysAllowRule?.(input) === !0 || B
                ? stripWholeToolGrantsForAsk([...E], tool, getToolPermissionContext(toolUseContext))
                : E,
        );
      return (
        this.logDecision(
          { decision: "accept", source: { type: "hook", permanent: persistPermissions } },
          { input: h, permissionPromptStartTimeMs: P },
        ),
        this.buildAllow(h, { decisionReason: { type: "hook", hookName: "PermissionRequest" } })
      );
    },
  });
}

export { createPermissionQueueOps, createResolveOnce, createPermissionContext };
