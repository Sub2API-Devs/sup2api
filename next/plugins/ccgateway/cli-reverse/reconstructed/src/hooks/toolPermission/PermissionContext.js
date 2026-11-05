/**
 * hooks/toolPermission/PermissionContext.ts
 *
 * 权限上下文：一次工具权限请求的 resolve-once、日志、持久化规则、取消/中止、buildAllow/cancelAndAbort。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/PermissionContext.ts
 * pieces: chunk-g4tsxwy3.js (3)
 * attribution: placement 1, fingerprint 2
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

//@ chunk-g4tsxwy3.js:32677-32758 placement
function createPermissionQueueOps({ feedback, contentBlocks, isSubagent }) {
  return !feedback && !contentBlocks?.length && !isSubagent;
}
//@ chunk-g4tsxwy3.js:32758-32896 fingerprint (2.1.88 match: createResolveOnce, 1)
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
//@ chunk-g4tsxwy3.js:32896-37546 fingerprint (2.1.88 match: createPermissionContext, 0.745)
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
  function logDecision(args, opts) {
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
    logDecision,
    logCancelled() {
      logEvent("tengu_tool_use_cancelled", {
        messageID: sanitizeMarkName(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
      });
    },
    persistPermissions(updates) {
      if (updates.length === 0 || isHookOrPluginSteered(toolUseContext)) return false;
      forgetSessionEditRules(toolUseContext.session, updates);
      persistPermissionUpdates(updates, toolUseContext.storageV5).catch(logError);
      if (queueOps !== undefined) queueOps(updates);
      else {
        toolUseContext.setSessionToolPermissionContext((context) => applyPermissionUpdates(context, updates));
        setImmediate(() => {
          permissionModeSignal.emit();
        });
      }
      return updates.some((update) => supportsPersistence(update.destination));
    },
    setModeFromBridge(mode) {
      return setPermissionModeWithGuards(
        mode,
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
    cancelAndAbort(feedback, isAbort, contentBlocks, options) {
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
        ...(options?.feedbackIsFromUser &&
          feedback && {
            userFeedback: feedback,
          }),
      };
    },
    async runHooks(
      permissionMode,
      suggestions,
      suppressAllowRule,
      isAborted,
      hookInput,
      permissionPromptStartTimeMs,
    ) {
      if (toolUseContext.forRemoteExecution === true) return null;
      for await (let hookResult of executePermissionRequestHooks(
        tool.name,
        toolUseID,
        input,
        toolUseContext,
        permissionMode,
        suggestions,
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
              let memoryDeny = guardAccountMemoryHookRewrite(tool, "PermissionRequest");
              this.logDecision(
                {
                  decision: "reject",
                  source: "config",
                },
                {
                  input,
                  permissionPromptStartTimeMs,
                },
              );
              return memoryDeny;
            }
            let validation = await validatePermissionRequestUpdatedInput(
              tool,
              decision.updatedInput,
              input,
              (candidateInput) =>
                tool.validateInput?.(candidateInput, {
                  ...toolUseContext,
                  toolUseId: toolUseID,
                }),
            );
            if (validation.deny !== undefined) {
              this.logDecision(
                {
                  decision: "reject",
                  source: {
                    type: "hook",
                  },
                },
                {
                  input,
                  permissionPromptStartTimeMs,
                },
              );
              return validation.deny;
            }
            let input_2 = validation.input;
            let finalInput = input_2 ?? hookInput ?? input;
            if (input_2) {
              let recheck = guardHookUpdatedInput(
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
              if (recheck?.behavior === "deny") {
                this.logDecision(
                  {
                    decision: "reject",
                    source: "config",
                  },
                  {
                    input: finalInput,
                    permissionPromptStartTimeMs,
                  },
                );
                return {
                  ...recheck,
                  decideLocation: "ask-path",
                };
              }
              if (recheck?.behavior === "ask")
                return {
                  reprompted: recheck,
                  finalInput,
                };
            }
            return this.handleHookAllow(
              finalInput,
              decision.updatedPermissions ?? [],
              suppressAllowRule,
              isAborted,
              permissionPromptStartTimeMs,
            );
          } else if (decision.behavior === "deny") {
            this.logDecision(
              {
                decision: "reject",
                source: {
                  type: "hook",
                },
              },
              {
                permissionPromptStartTimeMs,
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
    handleUserAllow(updatedInput, updates, options) {
      let normalizedUpdates = normalizePermissionUpdate(
        [...sanitizePermissionUpdates(updates)],
        options?.surface === "host_dialog" &&
          tool.suppressesAlwaysAllowRule?.(input) !== true &&
          options.askSuppressesAlwaysAllowRule !== true
          ? suggestWebToolRule(tool, input)
          : undefined,
        getToolPermissionContext(toolUseContext),
      );
      let persistedUpdates =
        toolUseContext.forRemoteExecution === true || isHookOrPluginSteered(toolUseContext)
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(normalizedUpdates)
            : tool.suppressesAlwaysAllowRule?.(input) === true ||
                options?.askSuppressesAlwaysAllowRule === true
              ? stripWholeToolGrantsForAsk(normalizedUpdates, tool, getToolPermissionContext(toolUseContext))
              : normalizedUpdates;
      let permanent = this.persistPermissions(persistedUpdates);
      logShellAllowRuleAdded(persistedUpdates);
      if (options?.surface === "host_dialog") {
        if (
          toolUseContext.forRemoteExecution !== true &&
          !isHookOrPluginSteered(toolUseContext) &&
          tool.suppressesAllPermissionUpdates?.(input) !== true &&
          options.askSuppressesAlwaysAllowRule !== true
        )
          applyMcpServerAllowRule(tool, normalizedUpdates, (serverRule) => {
            this.persistPermissions([serverRule]);
          });
        recordEditedRuleContents(toolUseContext.session, persistedUpdates);
      }
      let grantScope = permissionGrantScope(persistedUpdates);
      this.logDecision(
        {
          decision: "accept",
          source: {
            type: "user",
            permanent,
          },
          surface: options?.surface,
          scope:
            grantScope === "once" && getToolPermissionContext(toolUseContext).mode !== mode
              ? "session"
              : grantScope,
        },
        {
          input: updatedInput,
          permissionPromptStartTimeMs: options?.permissionPromptStartTimeMs,
        },
      );
      let userModified = tool.inputsEquivalent ? !tool.inputsEquivalent(input, updatedInput) : false;
      let trimmedFeedback = options?.feedback?.trim();
      return this.buildAllow(updatedInput, {
        userModified,
        decisionReason: options?.decisionReason,
        acceptFeedback: trimmedFeedback || undefined,
        contentBlocks: options?.contentBlocks,
        matchedAskRule: options?.matchedAskRule,
      });
    },
    handleHookAllow(finalInput, updates, suppressAllowRule, isAborted, permissionPromptStartTimeMs) {
      if (isAborted())
        return this.buildAllow(finalInput, {
          decisionReason: {
            type: "hook",
            hookName: "PermissionRequest",
          },
        });
      let sanitizedUpdates = sanitizePermissionUpdates(updates);
      let permanent = this.persistPermissions(
        toolUseContext.forRemoteExecution === true
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(sanitizedUpdates)
            : tool.suppressesAlwaysAllowRule?.(input) === true || suppressAllowRule
              ? stripWholeToolGrantsForAsk(
                  [...sanitizedUpdates],
                  tool,
                  getToolPermissionContext(toolUseContext),
                )
              : sanitizedUpdates,
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
export { createResolveOnce, createPermissionContext, createPermissionQueueOps };
