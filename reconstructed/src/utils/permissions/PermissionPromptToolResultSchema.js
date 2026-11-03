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
  u,
  string,
  record,
  unknown,
  _enum,
  literal,
  M,
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

//@ chunk-6j594vm1.js:2340-2658 placement
/**
 * 权限等待一段时间后发送通知。
 */
function schedulePermissionNotify(n, e, d) {
  if (env.CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS) return () => {};
  let timer = setTimeout(
    (m, storageV5, credentials) => {
      try {
        executeNotificationHooks(
          getSessionIdentity(),
          {
            message: `Claude needs your permission to use ${m}`,
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
    n,
    e,
    d,
  );
  timer.unref();
  return () => clearTimeout(timer);
}
//@ chunk-6j594vm1.js:2658-3309 fingerprint = inputSchema (0.504)
/**
 * --permission-prompt-tool（SDK 宿主）协议：输入 {tool_name, input, tool_use_id?}；输出 allow {updatedInput?, updatedPermissions?, toolUseID?, decisionClassification?} 或 deny {message, interrupt?}；decisionClassification 为 user_temporary/user_permanent/user_reject。
 */
var permissionPromptToolInputSchema = DoctorLazy(() =>
  u({
    tool_name: string().describe("The name of the tool requesting permission"),
    input: record(string(), unknown()).describe("The input for the tool"),
    tool_use_id: string().optional().describe("The unique tool use request ID"),
  }),
);
var decisionClassificationSchema = DoctorLazy(() =>
  _enum(["user_temporary", "user_permanent", "user_reject"]).optional().catch(undefined),
);
var allowResultSchema = (n) =>
  u({
    behavior: literal("allow"),
    updatedInput: record(string(), unknown()).optional(),
    updatedPermissions: capPermissionUpdates_2(n, "SDK host"),
    toolUseID: string().optional(),
    decisionClassification: decisionClassificationSchema(),
  });
var denyResultSchema = DoctorLazy(() =>
  u({
    behavior: literal("deny"),
    message: string(),
    interrupt: M().optional(),
    toolUseID: string().optional(),
    decisionClassification: decisionClassificationSchema(),
  }),
);
var permissionPromptResultSchemaRefusing = DoctorLazy(() =>
  union([allowResultSchema("refused"), denyResultSchema()]),
);
var permissionPromptResultSchemaCutting = DoctorLazy(() =>
  union([allowResultSchema("cut"), denyResultSchema()]),
);
//@ chunk-6j594vm1.js:3356-3465 placement
/**
 * 权限提示工具返回格式不对时的提示文字。
 */
var PERMISSION_PROMPT_RESULT_FORMAT_HINT = `Expected {behavior: 'allow', updatedInput?: object} or {behavior: 'deny', message: string}. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`;
//@ chunk-6j594vm1.js:3465-3833 placement
/**
 * 计算"始终允许"规则建议。
 */
function alwaysAllowRulesFor(n, e, d, r, m, s) {
  if (r.forRemoteExecution === true || isHookOrPluginSteered(r)) return;
  let mode =
    n &&
    normalizePermissionUpdate(
      n,
      e.suppressesAlwaysAllowRule?.(d) === true || m ? undefined : suggestWebToolRule(e, d),
      getToolPermissionContext(r),
    );
  if (mode && s !== undefined) {
    let f = answerUpdatesForMcpSkillAsk(mode, s.rule);
    return f.length > 0 ? f : undefined;
  }
  if (mode && e.suppressesAllPermissionUpdates?.(d) === true) {
    let f = withoutGrantsForRemoteScope(mode);
    return f.length > 0 ? f : undefined;
  }
  return mode && (e.suppressesAlwaysAllowRule?.(d) === true || m)
    ? stripWholeToolGrantsForAsk(mode, e, getToolPermissionContext(r))
    : mode;
}
//@ chunk-6j594vm1.js:3833-4269 placement
/**
 * 应用权限提示工具结果（launcher/allow/deny）。
 */
function applyPermissionPromptResult(hostPolicy, updatedPermissions, tool, r, m, s, y = false, f) {
  switch (hostPolicy.kind) {
    case "launcher": {
      let k = alwaysAllowRulesFor(updatedPermissions, tool, r, m, s, f);
      if (k?.length) {
        m.setSessionToolPermissionContext((R) => applyPermissionUpdates(R, k));
        setImmediate(() => {
          permissionModeSignal.emit();
        });
        persistPermissionUpdates(k, m.storageV5).catch(logError);
      }
      return {
        applied: k ?? [],
        lostTightenings: 0,
      };
    }
    case "strict":
      return applyAnswerPermissionUpdates(hostPolicy, updatedPermissions, {
        vetoed: () => false,
        strip: (k) => alwaysAllowRulesFor(k, tool, r, m, s, f) ?? [],
        toolName: getToolNameForPermissionCheck(tool),
        input: r,
        suggested: (k) => y && tool.suggestedAllowRule?.(k, r) === true,
        setContext: m.setSessionToolPermissionContext,
      });
  }
}
//@ chunk-6j594vm1.js:4269-4431 layout
function wrapSessionContextSetter(context, tool) {
  return {
    ...context,
    setSessionToolPermissionContext: (d) =>
      context.setSessionToolPermissionContext((r) => {
        let m = typeof d === "function" ? d(r) : d;
        return recordRemoteBrowserCardAnswers(tool, r, m);
      }),
  };
}
//@ chunk-6j594vm1.js:4431-5574 fingerprint = permissionPromptToolResultToPermissionDecision (0.587)
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
  y = false,
  f = false,
  k,
) {
  let decisionReason = {
    type: "permissionPromptTool",
    permissionPromptToolName: promptTool.name,
    toolResult: result,
  };
  if (result.behavior === "allow") {
    let mode = result.updatedPermissions?.findLast((prev) => prev.type === "setMode")?.mode;
    if (k === undefined && (mode === "default" || mode === "acceptEdits")) setAccountSetPermissionMode(mode);
    switch (hostPolicy.kind) {
      case "launcher": {
        let { applied } = applyPermissionPromptResult(
          hostPolicy,
          result.updatedPermissions,
          tool,
          input,
          f ? wrapSessionContextSetter(context, tool) : context,
          y,
          false,
          k,
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
        let h = admitCardAnswer(result.updatedInput, input, tool);
        let A =
          h === undefined ? matchCardFormAnswer(hostPolicy, result.updatedInput, input, tool) : undefined;
        let b = h ?? A?.input;
        if (b === undefined) return denyChangedAnswerInput(tool.name, result.toolUseID);
        if (b !== input && matchToolRule(getToolPermissionContext(context), tool, b, "deny") !== null) {
          A?.onRefused("deny_rule");
          return denyChangedAnswerInput(tool.name, result.toolUseID);
        }
        let { applied, lostTightenings } = applyPermissionPromptResult(
          hostPolicy,
          result.updatedPermissions,
          tool,
          A?.input ?? input,
          f ? wrapSessionContextSetter(context, tool) : context,
          y,
          true,
          k,
        );
        if (lostTightenings > 0) return denyLostTightening(tool.name, result.toolUseID);
        return {
          ...result,
          updatedInput: b,
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
