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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { isHookOrPluginSteered } from "../../utils/agentContext.js";
import { forgetSessionEditRules, recordEditedRuleContents } from "../../components/permissions/hooks.js";
import {
  persistPermissionUpdates,
  applyPermissionUpdates,
  supportsPersistence,
  sanitizePermissionUpdates,
} from "../../utils/permissions/PermissionUpdate.js";
import { logError } from "../../utils/log.js";
import {
  permissionModeSignal,
  setPermissionModeWithGuards,
} from "../../utils/permissions/permissionSetup.js";
import {
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE,
  REJECT_MESSAGE,
  withMemoryCorrectionHint,
} from "../../utils/messages.js";
import { logForDebugging } from "../../utils/debug.js";
import { executePermissionRequestHooks } from "../../utils/hooks.js";
import { requiresConnectorGrant_2 } from "../../services/mcp/claudeai.js";
import {
  shouldReplaceMemoryInput,
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
function createPermissionQueueOps({ feedback, contentBlocks, isSubagent }) {
  return !feedback && !contentBlocks?.length && !isSubagent;
}
//@ chunk-s4bxxzsw.js:32586-32724 fingerprint = createResolveOnce (1)
function createResolveOnce(resolve) {
  let claimed = false;
  let delivered = false;
  return {
    resolve(value) {
      if (delivered) return;
      delivered = true;
      claimed = true;
      resolve(value);
    },
    isResolved() {
      return claimed;
    },
    claim() {
      if (claimed) return false;
      claimed = true;
      return true;
    },
  };
}
//@ chunk-s4bxxzsw.js:32724-37374 fingerprint = createPermissionContext (0.746)
/**
 * 为一次权限请求创建上下文对象：logDecision、logCancelled、persistPermissions（写规则）、setModeFromBridge、resolveIfAborted、buildAllow、cancelAndAbort、runHooks。
 */
function createPermissionContext(
  tool,
  input,
  toolUseContext,
  assistantMessage,
  toolUseID,
  setToolPermissionContext,
  queueOps,
) {
  let messageId = assistantMessage.message.id;
  let mode = getToolPermissionContext(toolUseContext).mode;
  function k(args, opts) {
    logPermissionDecision_2(
      {
        tool,
        input: opts?.input ?? input,
        toolUseContext,
        messageId,
        requestId: assistantMessage.requestId,
        toolUseID,
        permissionMode: mode,
      },
      args,
      opts?.permissionPromptStartTimeMs,
    );
  }
  return Object.freeze({
    tool,
    input,
    toolUseContext,
    assistantMessage,
    messageId,
    toolUseID,
    setClassifierApprovals: setToolPermissionContext,
    permissionMode: mode,
    logDecision: k,
    logCancelled() {
      logEvent("tengu_tool_use_cancelled", {
        messageID: sanitizeMarkName(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
      });
    },
    persistPermissions(h) {
      if (h.length === 0 || isHookOrPluginSteered(toolUseContext)) return false;
      forgetSessionEditRules(toolUseContext.session, h);
      persistPermissionUpdates(h, toolUseContext.storageV5).catch(logError);
      if (queueOps !== undefined) queueOps(h);
      else {
        toolUseContext.setSessionToolPermissionContext((w) => applyPermissionUpdates(w, h));
        setImmediate(() => {
          permissionModeSignal.emit();
        });
      }
      return h.some((update) => supportsPersistence(update.destination));
    },
    setModeFromBridge(h) {
      return setPermissionModeWithGuards(
        h,
        getToolPermissionContext(toolUseContext),
        toolUseContext.setToolPermissionContext,
      );
    },
    resolveIfAborted(resolve) {
      if (!toolUseContext.abortController.signal.aborted) return false;
      this.logCancelled();
      resolve(this.cancelAndAbort(undefined, true));
      return true;
    },
    cancelAndAbort(feedback, isAbort, contentBlocks, F) {
      let sub = !!toolUseContext.agentId;
      let baseMessage = feedback
        ? `${sub ? SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX : REJECT_MESSAGE_WITH_REASON_PREFIX}${feedback}`
        : sub
          ? SUBAGENT_REJECT_MESSAGE
          : REJECT_MESSAGE;
      let message = sub ? baseMessage : withMemoryCorrectionHint(baseMessage);
      if (
        isAbort ||
        createPermissionQueueOps({
          feedback,
          contentBlocks,
          isSubagent: sub,
        })
      ) {
        logForDebugging(
          `Aborting: tool=${tool.name} isAbort=${isAbort} hasFeedback=${!!feedback} isSubagent=${sub}`,
        );
        toolUseContext.abortController.abort();
      }
      return {
        behavior: "ask",
        message,
        contentBlocks,
        ...(F?.feedbackIsFromUser &&
          feedback && {
            userFeedback: feedback,
          }),
      };
    },
    async runHooks(h, w, B, F, P, E) {
      if (toolUseContext.forRemoteExecution === true) return null;
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
            if (
              requiresConnectorGrant_2(tool) ||
              (!decision.updatedInput && tool.requiresUserInteraction?.())
            )
              return null;
            if (shouldReplaceMemoryInput(tool, input, decision.updatedInput, true)) {
              let H = guardAccountMemoryHookRewrite(tool, "PermissionRequest");
              this.logDecision(
                {
                  decision: "reject",
                  source: "config",
                },
                {
                  input,
                  permissionPromptStartTimeMs: E,
                },
              );
              return H;
            }
            let q = await validatePermissionRequestUpdatedInput(tool, decision.updatedInput, input, (H) =>
              tool.validateInput?.(H, {
                ...toolUseContext,
                toolUseId: toolUseID,
              }),
            );
            if (q.deny !== undefined) {
              this.logDecision(
                {
                  decision: "reject",
                  source: {
                    type: "hook",
                  },
                },
                {
                  input,
                  permissionPromptStartTimeMs: E,
                },
              );
              return q.deny;
            }
            let input_2 = q.input;
            let finalInput = input_2 ?? P ?? input;
            if (input_2) {
              let H = guardHookUpdatedInput(
                await withProvisionalRecord(toolUseContext, toolUseID, tool.name, () =>
                  checkRuleBasedPermissions(
                    tool,
                    finalInput,
                    {
                      ...toolUseContext,
                      toolUseId: toolUseID,
                    },
                    {
                      hookUpdatedInput: input_2,
                    },
                  ),
                ),
                tool.name,
              );
              if (H?.behavior === "deny") {
                this.logDecision(
                  {
                    decision: "reject",
                    source: "config",
                  },
                  {
                    input: finalInput,
                    permissionPromptStartTimeMs: E,
                  },
                );
                return {
                  ...H,
                  decideLocation: "ask-path",
                };
              }
              if (H?.behavior === "ask")
                return {
                  reprompted: H,
                  finalInput,
                };
            }
            return this.handleHookAllow(finalInput, decision.updatedPermissions ?? [], B, F, E);
          } else if (decision.behavior === "deny") {
            this.logDecision(
              {
                decision: "reject",
                source: {
                  type: "hook",
                },
              },
              {
                permissionPromptStartTimeMs: E,
              },
            );
            if (decision.interrupt) {
              logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`);
              turnAbortControllerOf(toolUseContext.abortController).abort();
            }
            return this.buildDeny(decision.message || "Permission denied by hook", {
              type: "hook",
              hookName: "PermissionRequest",
              reason: decision.message,
            });
          }
        }
      return null;
    },
    buildAllow(updatedInput, opts) {
      return {
        behavior: "allow",
        updatedInput,
        userModified: opts?.userModified ?? false,
        ...(opts?.decisionReason && {
          decisionReason: opts.decisionReason,
        }),
        ...(opts?.acceptFeedback && {
          acceptFeedback: opts.acceptFeedback,
        }),
        ...(opts?.contentBlocks &&
          opts.contentBlocks.length > 0 && {
            contentBlocks: opts.contentBlocks,
          }),
        ...(opts?.matchedAskRule && {
          matchedAskRule: opts.matchedAskRule,
        }),
      };
    },
    buildDeny(message, decisionReason) {
      return {
        behavior: "deny",
        message,
        decisionReason,
        decideLocation: "ask-path",
      };
    },
    handleUserAllow(updatedInput, w, B) {
      let F = normalizePermissionUpdate(
        [...sanitizePermissionUpdates(w)],
        B?.surface === "host_dialog" &&
          tool.suppressesAlwaysAllowRule?.(input) !== true &&
          B.askSuppressesAlwaysAllowRule !== true
          ? suggestWebToolRule(tool, input)
          : undefined,
        getToolPermissionContext(toolUseContext),
      );
      let P =
        toolUseContext.forRemoteExecution === true || isHookOrPluginSteered(toolUseContext)
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(F)
            : tool.suppressesAlwaysAllowRule?.(input) === true || B?.askSuppressesAlwaysAllowRule === true
              ? stripWholeToolGrantsForAsk(F, tool, getToolPermissionContext(toolUseContext))
              : F;
      let permanent = this.persistPermissions(P);
      logShellAllowRuleAdded(P);
      if (B?.surface === "host_dialog") {
        if (
          toolUseContext.forRemoteExecution !== true &&
          !isHookOrPluginSteered(toolUseContext) &&
          tool.suppressesAllPermissionUpdates?.(input) !== true &&
          B.askSuppressesAlwaysAllowRule !== true
        )
          applyMcpServerAllowRule(tool, F, (M) => {
            this.persistPermissions([M]);
          });
        recordEditedRuleContents(toolUseContext.session, P);
      }
      let V = permissionGrantScope(P);
      this.logDecision(
        {
          decision: "accept",
          source: {
            type: "user",
            permanent,
          },
          surface: B?.surface,
          scope: V === "once" && getToolPermissionContext(toolUseContext).mode !== mode ? "session" : V,
        },
        {
          input: updatedInput,
          permissionPromptStartTimeMs: B?.permissionPromptStartTimeMs,
        },
      );
      let userModified = tool.inputsEquivalent ? !tool.inputsEquivalent(input, updatedInput) : false;
      let trimmedFeedback = B?.feedback?.trim();
      return this.buildAllow(updatedInput, {
        userModified,
        decisionReason: B?.decisionReason,
        acceptFeedback: trimmedFeedback || undefined,
        contentBlocks: B?.contentBlocks,
        matchedAskRule: B?.matchedAskRule,
      });
    },
    handleHookAllow(finalInput, w, B, F, permissionPromptStartTimeMs) {
      if (F())
        return this.buildAllow(finalInput, {
          decisionReason: {
            type: "hook",
            hookName: "PermissionRequest",
          },
        });
      let E = sanitizePermissionUpdates(w);
      let permanent = this.persistPermissions(
        toolUseContext.forRemoteExecution === true
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(E)
            : tool.suppressesAlwaysAllowRule?.(input) === true || B
              ? stripWholeToolGrantsForAsk([...E], tool, getToolPermissionContext(toolUseContext))
              : E,
      );
      this.logDecision(
        {
          decision: "accept",
          source: {
            type: "hook",
            permanent,
          },
        },
        {
          input: finalInput,
          permissionPromptStartTimeMs,
        },
      );
      return this.buildAllow(finalInput, {
        decisionReason: {
          type: "hook",
          hookName: "PermissionRequest",
        },
      });
    },
  });
}
export { createPermissionQueueOps, createResolveOnce, createPermissionContext };
