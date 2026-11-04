/**
 * utils/permissions/PermissionPromptToolResultSchema.ts
 *
 * --permission-prompt-tool / SDK 宿主权限回复的 schema，以及把回复转成权限决定（应用 updatedPermissions、strict 宿主校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionPromptToolResultSchema.ts
 * pieces: chunk-6j594vm1.js (7)
 * attribution: placement 4, fingerprint 2, layout 1
 */
import { env } from "../env.js";
import { executeNotificationHooks } from "../hooks.js";
import { getSessionIdentity } from "../shutdown/pendingWrites.js";
import { HOOK_PROGRESS_INTERVAL_MS } from "../hooks/hookEvents.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  record,
  unknown,
  _enum,
  literal,
  booleanSchema,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  capPermissionUpdates_2,
  PERMISSION_UPDATES_LIMIT_MESSAGE,
  applyAnswerPermissionUpdates,
  stripHostOwnedInputKeys,
  admitCardAnswer,
  matchCardFormAnswer,
  denyChangedAnswerInput,
  denyLostTightening,
} from "./permissionAnswer.js";
import { isHookOrPluginSteered } from "../agentContext.js";
import { normalizePermissionUpdate, suggestWebToolRule } from "./permissionRulePayload.js";
import { getToolPermissionContext } from "./toolPermissionContext.js";
import {
  answerUpdatesForMcpSkillAsk,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  matchToolRule,
} from "./permissions.js";
import { applyPermissionUpdates, persistPermissionUpdates } from "./PermissionUpdate.js";
import { permissionModeSignal } from "./permissionSetup.js";
import { logError } from "../log.js";
import { getToolNameForPermissionCheck } from "../../services/mcp/mcpStringUtils.js";
import { recordRemoteBrowserCardAnswers } from "./mcpRuleMatching.js";
import { setAccountSetPermissionMode } from "./autoModeState.js";
import { getGrantScopeField } from "../../services/pushNotifications/permissionPush.js";
import { logForDebugging } from "../debug.js";
import { turnAbortControllerOf } from "../abortController.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6j594vm1.js:2340-2658 placement
/**
 * 权限等待一段时间后发送通知。
 */
function schedulePermissionNotify(toolName, storageV5, credentials) {
  if (env.CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS) return () => {};
  let timer = setTimeout(
    (toolName, storageV5, credentials) => {
      try {
        executeNotificationHooks(
          getSessionIdentity(),
          {
            message: `Claude needs your permission to use ${toolName}`,
            notificationType: "permission_prompt",
          },
          {
            storageV5,
            credentials,
          },
        ).catch(() => {});
      } catch {}
    },
    HOOK_PROGRESS_INTERVAL_MS,
    toolName,
    storageV5,
    credentials,
  );
  timer.unref();
  return () => clearTimeout(timer);
}
//@ chunk-6j594vm1.js:2658-3309 fingerprint (2.1.88 match: inputSchema, 0.504)
/**
 * --permission-prompt-tool（SDK 宿主）协议：输入 {tool_name, input, tool_use_id?}；输出 allow {updatedInput?, updatedPermissions?, toolUseID?, decisionClassification?} 或 deny {message, interrupt?}；decisionClassification 为 user_temporary/user_permanent/user_reject。
 */
var permissionPromptToolInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var decisionClassificationSchema;
var allowResultSchema;
var denyResultSchema;
var permissionPromptResultSchemaRefusing;
var permissionPromptResultSchemaCutting;
deferInit("chunk-6j594vm1.js:2658", () => {
  permissionPromptToolInputSchema = DoctorLazy(() =>
    objectSchema({
      tool_name: stringSchema().describe("The name of the tool requesting permission"),
      input: record(stringSchema(), unknown()).describe("The input for the tool"),
      tool_use_id: stringSchema().optional().describe("The unique tool use request ID"),
    }),
  );
  decisionClassificationSchema = DoctorLazy(() =>
    _enum(["user_temporary", "user_permanent", "user_reject"]).optional().catch(undefined),
  );
  allowResultSchema = (overflowMode) =>
    objectSchema({
      behavior: literal("allow"),
      updatedInput: record(stringSchema(), unknown()).optional(),
      updatedPermissions: capPermissionUpdates_2(overflowMode, "SDK host"),
      toolUseID: stringSchema().optional(),
      decisionClassification: decisionClassificationSchema(),
    });
  denyResultSchema = DoctorLazy(() =>
    objectSchema({
      behavior: literal("deny"),
      message: stringSchema(),
      interrupt: booleanSchema().optional(),
      toolUseID: stringSchema().optional(),
      decisionClassification: decisionClassificationSchema(),
    }),
  );
  permissionPromptResultSchemaRefusing = DoctorLazy(() =>
    union([allowResultSchema("refused"), denyResultSchema()]),
  );
  permissionPromptResultSchemaCutting = DoctorLazy(() =>
    union([allowResultSchema("cut"), denyResultSchema()]),
  );
});
//@ chunk-6j594vm1.js:3356-3465 placement
/**
 * 权限提示工具返回格式不对时的提示文字。
 */
var PERMISSION_PROMPT_RESULT_FORMAT_HINT = `Expected {behavior: 'allow', updatedInput?: object} or {behavior: 'deny', message: string}. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`;
//@ chunk-6j594vm1.js:3465-3833 placement
/**
 * 计算"始终允许"规则建议。
 */
function alwaysAllowRulesFor(updates, tool, input, callContext, suppressSuggestions, skillAsk) {
  if (callContext.forRemoteExecution === true || isHookOrPluginSteered(callContext)) return;
  let mode =
    updates &&
    normalizePermissionUpdate(
      updates,
      tool.suppressesAlwaysAllowRule?.(input) === true || suppressSuggestions
        ? undefined
        : suggestWebToolRule(tool, input),
      getToolPermissionContext(callContext),
    );
  if (mode && skillAsk !== undefined) {
    let skillUpdates = answerUpdatesForMcpSkillAsk(mode, skillAsk.rule);
    return skillUpdates.length > 0 ? skillUpdates : undefined;
  }
  if (mode && tool.suppressesAllPermissionUpdates?.(input) === true) {
    let remoteScoped = withoutGrantsForRemoteScope(mode);
    return remoteScoped.length > 0 ? remoteScoped : undefined;
  }
  return mode && (tool.suppressesAlwaysAllowRule?.(input) === true || suppressSuggestions)
    ? stripWholeToolGrantsForAsk(mode, tool, getToolPermissionContext(callContext))
    : mode;
}
//@ chunk-6j594vm1.js:3833-4269 placement
/**
 * 应用权限提示工具结果（launcher/allow/deny）。
 */
function applyPermissionPromptResult(
  answerPolicy,
  updates,
  tool,
  input,
  callContext,
  suppressSuggestions,
  requireSuggestions = false,
  skillAsk,
) {
  switch (answerPolicy.kind) {
    case "launcher": {
      let applied = alwaysAllowRulesFor(updates, tool, input, callContext, suppressSuggestions, skillAsk);
      if (applied?.length) {
        callContext.setSessionToolPermissionContext((context) => applyPermissionUpdates(context, applied));
        setImmediate(() => {
          permissionModeSignal.emit();
        });
        persistPermissionUpdates(applied, callContext.storageV5).catch(logError);
      }
      return {
        applied: applied ?? [],
        lostTightenings: 0,
      };
    }
    case "strict":
      return applyAnswerPermissionUpdates(answerPolicy, updates, {
        vetoed: () => false,
        strip: (updates) =>
          alwaysAllowRulesFor(updates, tool, input, callContext, suppressSuggestions, skillAsk) ?? [],
        toolName: getToolNameForPermissionCheck(tool),
        input,
        suggested: (callbackInput) =>
          requireSuggestions && tool.suggestedAllowRule?.(callbackInput, input) === true,
        setContext: callContext.setSessionToolPermissionContext,
      });
  }
}
//@ chunk-6j594vm1.js:4269-4431 layout
function wrapSessionContextSetter(context, tool) {
  return {
    ...context,
    setSessionToolPermissionContext: (updater) =>
      context.setSessionToolPermissionContext((context) => {
        let next = typeof updater === "function" ? updater(context) : updater;
        return recordRemoteBrowserCardAnswers(tool, context, next);
      }),
  };
}
//@ chunk-6j594vm1.js:4431-5574 fingerprint (2.1.88 match: permissionPromptToolResultToPermissionDecision, 0.587)
/**
 * 把权限提示工具的回复转成权限决定：allow 时应用 updatedPermissions（launcher 宿主直接应用；strict 宿主校验改写后的输入不命中 deny 规则、不丢失收紧项，否则拒绝）；deny+interrupt 中止当前回合。decisionReason 为 permissionPromptTool。
 */
function permissionPromptToolResultToPermissionDecision(
  hostPolicy,
  result,
  promptTool,
  input,
  context,
  tool = promptTool,
  requireSuggestions = false,
  wrapSession = false,
  toolFilter,
) {
  let decisionReason = {
    type: "permissionPromptTool",
    permissionPromptToolName: promptTool.name,
    toolResult: result,
  };
  if (result.behavior === "allow") {
    let mode = result.updatedPermissions?.findLast((prev) => prev.type === "setMode")?.mode;
    if (toolFilter === undefined && (mode === "default" || mode === "acceptEdits"))
      setAccountSetPermissionMode(mode);
    switch (hostPolicy.kind) {
      case "launcher": {
        let { applied } = applyPermissionPromptResult(
          hostPolicy,
          result.updatedPermissions,
          tool,
          input,
          wrapSession ? wrapSessionContextSetter(context, tool) : context,
          requireSuggestions,
          false,
          toolFilter,
        );
        let updatedInput =
          result.updatedInput && Object.keys(result.updatedInput).length > 0
            ? result.updatedInput
            : stripHostOwnedInputKeys(tool.name, input);
        return {
          ...result,
          updatedInput,
          decisionReason,
          ...getGrantScopeField(hostPolicy, applied),
        };
      }
      case "strict": {
        let admitted = admitCardAnswer(result.updatedInput, input, tool);
        let formMatch =
          admitted === undefined
            ? matchCardFormAnswer(hostPolicy, result.updatedInput, input, tool)
            : undefined;
        let answerInput = admitted ?? formMatch?.input;
        if (answerInput === undefined) return denyChangedAnswerInput(tool.name, result.toolUseID);
        if (
          answerInput !== input &&
          matchToolRule(getToolPermissionContext(context), tool, answerInput, "deny") !== null
        ) {
          formMatch?.onRefused("deny_rule");
          return denyChangedAnswerInput(tool.name, result.toolUseID);
        }
        let { applied, lostTightenings } = applyPermissionPromptResult(
          hostPolicy,
          result.updatedPermissions,
          tool,
          formMatch?.input ?? input,
          wrapSession ? wrapSessionContextSetter(context, tool) : context,
          requireSuggestions,
          true,
          toolFilter,
        );
        if (lostTightenings > 0) return denyLostTightening(tool.name, result.toolUseID);
        return {
          ...result,
          updatedInput: answerInput,
          decisionReason,
          ...getGrantScopeField(hostPolicy, applied),
        };
      }
    }
  } else if (result.behavior === "deny" && result.interrupt) {
    logForDebugging(
      `SDK permission prompt deny+interrupt: tool=${promptTool.name} message=${result.message}`,
    );
    turnAbortControllerOf(context.abortController).abort();
  }
  return {
    ...result,
    decisionReason,
    decideLocation: "ask-path",
  };
}
export {
  permissionPromptResultSchemaRefusing,
  PERMISSION_PROMPT_RESULT_FORMAT_HINT,
  permissionPromptToolResultToPermissionDecision,
  permissionPromptResultSchemaCutting,
  schedulePermissionNotify,
  alwaysAllowRulesFor,
  applyPermissionPromptResult,
};
