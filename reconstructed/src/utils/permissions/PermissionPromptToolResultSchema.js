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
import { Yhn } from "../hooks/hookEvents.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, pe, oe, U, T, M, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { aF } from "./permissionSetup.js";
import { logError } from "../log.js";
import { getToolNameForPermissionCheck } from "../../services/mcp/mcpStringUtils.js";
import { recordRemoteBrowserCardAnswers } from "./mcpRuleMatching.js";
import { setAccountSetPermissionMode } from "./autoModeState.js";
import { getGrantScopeField } from "../../services/pushNotifications/permissionPush.js";
import { logForDebugging } from "../debug.js";
import { turnAbortControllerOf } from "../abortController.js";

/**
 * 权限等待一段时间后发送通知。
 */
//@ chunk-6j594vm1.js:2340-2658 placement
function schedulePermissionNotify(n, e, d) {
  if (env.CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS) return () => {};
  let r = setTimeout(
    (m, s, y) => {
      try {
        executeNotificationHooks(
          getSessionIdentity(),
          { message: `Claude needs your permission to use ${m}`, notificationType: "permission_prompt" },
          { storageV5: s, credentials: y },
        ).catch(() => {});
      } catch {}
    },
    Yhn,
    n,
    e,
    d,
  );
  return (r.unref(), () => clearTimeout(r));
}
/**
 * --permission-prompt-tool（SDK 宿主）协议：输入 {tool_name, input, tool_use_id?}；输出 allow {updatedInput?, updatedPermissions?, toolUseID?, decisionClassification?} 或 deny {message, interrupt?}；decisionClassification 为 user_temporary/user_permanent/user_reject。
 */
//@ chunk-6j594vm1.js:2658-3309 fingerprint = inputSchema (0.504)
var permissionPromptToolInputSchema = DoctorLazy(() =>
    u({
      tool_name: o().describe("The name of the tool requesting permission"),
      input: pe(o(), oe()).describe("The input for the tool"),
      tool_use_id: o().optional().describe("The unique tool use request ID"),
    }),
  ),
  decisionClassificationSchema = DoctorLazy(() =>
    U(["user_temporary", "user_permanent", "user_reject"])
      .optional()
      .catch(void 0),
  ),
  allowResultSchema = (n) =>
    u({
      behavior: T("allow"),
      updatedInput: pe(o(), oe()).optional(),
      updatedPermissions: capPermissionUpdates_2(n, "SDK host"),
      toolUseID: o().optional(),
      decisionClassification: decisionClassificationSchema(),
    }),
  denyResultSchema = DoctorLazy(() =>
    u({
      behavior: T("deny"),
      message: o(),
      interrupt: M().optional(),
      toolUseID: o().optional(),
      decisionClassification: decisionClassificationSchema(),
    }),
  ),
  permissionPromptResultSchemaRefusing = DoctorLazy(() =>
    Ue([allowResultSchema("refused"), denyResultSchema()]),
  ),
  permissionPromptResultSchemaCutting = DoctorLazy(() => Ue([allowResultSchema("cut"), denyResultSchema()]));
/**
 * 权限提示工具返回格式不对时的提示文字。
 */
//@ chunk-6j594vm1.js:3356-3465 placement
var PERMISSION_PROMPT_RESULT_FORMAT_HINT = `Expected {behavior: 'allow', updatedInput?: object} or {behavior: 'deny', message: string}. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`;
/**
 * 计算"始终允许"规则建议。
 */
//@ chunk-6j594vm1.js:3465-3833 placement
function alwaysAllowRulesFor(n, e, d, r, m, s) {
  if (r.forRemoteExecution === !0 || isHookOrPluginSteered(r)) return;
  let y =
    n &&
    normalizePermissionUpdate(
      n,
      e.suppressesAlwaysAllowRule?.(d) === !0 || m ? void 0 : suggestWebToolRule(e, d),
      getToolPermissionContext(r),
    );
  if (y && s !== void 0) {
    let f = answerUpdatesForMcpSkillAsk(y, s.rule);
    return f.length > 0 ? f : void 0;
  }
  if (y && e.suppressesAllPermissionUpdates?.(d) === !0) {
    let f = withoutGrantsForRemoteScope(y);
    return f.length > 0 ? f : void 0;
  }
  return y && (e.suppressesAlwaysAllowRule?.(d) === !0 || m)
    ? stripWholeToolGrantsForAsk(y, e, getToolPermissionContext(r))
    : y;
}
/**
 * 应用权限提示工具结果（launcher/allow/deny）。
 */
//@ chunk-6j594vm1.js:3833-4269 placement
function applyPermissionPromptResult(n, e, d, r, m, s, y = !1, f) {
  switch (n.kind) {
    case "launcher": {
      let k = alwaysAllowRulesFor(e, d, r, m, s, f);
      if (k?.length)
        (m.setSessionToolPermissionContext((R) => applyPermissionUpdates(R, k)),
          setImmediate(() => {
            aF.emit();
          }),
          persistPermissionUpdates(k, m.storageV5).catch(logError));
      return { applied: k ?? [], lostTightenings: 0 };
    }
    case "strict":
      return applyAnswerPermissionUpdates(n, e, {
        vetoed: () => !1,
        strip: (k) => alwaysAllowRulesFor(k, d, r, m, s, f) ?? [],
        toolName: getToolNameForPermissionCheck(d),
        input: r,
        suggested: (k) => y && d.suggestedAllowRule?.(k, r) === !0,
        setContext: m.setSessionToolPermissionContext,
      });
  }
}
//@ chunk-6j594vm1.js:4269-4431 layout
function wrapSessionContextSetter(n, e) {
  return {
    ...n,
    setSessionToolPermissionContext: (d) =>
      n.setSessionToolPermissionContext((r) => {
        let m = typeof d === "function" ? d(r) : d;
        return recordRemoteBrowserCardAnswers(e, r, m);
      }),
  };
}
/**
 * 把权限提示工具的回复转成权限决定：allow 时应用 updatedPermissions（launcher 宿主直接应用；strict 宿主校验改写后的输入不命中 deny 规则、不丢失收紧项，否则拒绝）；deny+interrupt 中止当前回合。decisionReason 为 permissionPromptTool。
 */
//@ chunk-6j594vm1.js:4431-5574 fingerprint = permissionPromptToolResultToPermissionDecision (0.587)
function permissionPromptToolResultToPermissionDecision(
  hostPolicy,
  result,
  promptTool,
  input,
  context,
  tool = promptTool,
  y = !1,
  f = !1,
  k,
) {
  let decisionReason = {
    type: "permissionPromptTool",
    permissionPromptToolName: promptTool.name,
    toolResult: result,
  };
  if (result.behavior === "allow") {
    let c = result.updatedPermissions?.findLast((prev) => prev.type === "setMode")?.mode;
    if (k === void 0 && (c === "default" || c === "acceptEdits")) setAccountSetPermissionMode(c);
    switch (hostPolicy.kind) {
      case "launcher": {
        let { applied: applied } = applyPermissionPromptResult(
            hostPolicy,
            result.updatedPermissions,
            tool,
            input,
            f ? wrapSessionContextSetter(context, tool) : context,
            y,
            !1,
            k,
          ),
          A =
            result.updatedInput && Object.keys(result.updatedInput).length > 0
              ? result.updatedInput
              : stripHostOwnedInputKeys(tool.name, input);
        return {
          ...result,
          updatedInput: A,
          decisionReason: decisionReason,
          ...getGrantScopeField(hostPolicy, applied),
        };
      }
      case "strict": {
        let h = admitCardAnswer(result.updatedInput, input, tool),
          A = h === void 0 ? matchCardFormAnswer(hostPolicy, result.updatedInput, input, tool) : void 0,
          b = h ?? A?.input;
        if (b === void 0) return denyChangedAnswerInput(tool.name, result.toolUseID);
        if (b !== input && matchToolRule(getToolPermissionContext(context), tool, b, "deny") !== null)
          return (A?.onRefused("deny_rule"), denyChangedAnswerInput(tool.name, result.toolUseID));
        let { applied: applied, lostTightenings: lostTightenings } = applyPermissionPromptResult(
          hostPolicy,
          result.updatedPermissions,
          tool,
          A?.input ?? input,
          f ? wrapSessionContextSetter(context, tool) : context,
          y,
          !0,
          k,
        );
        if (lostTightenings > 0) return denyLostTightening(tool.name, result.toolUseID);
        return {
          ...result,
          updatedInput: b,
          decisionReason: decisionReason,
          ...getGrantScopeField(hostPolicy, applied),
        };
      }
    }
  } else if (result.behavior === "deny" && result.interrupt)
    (logForDebugging(
      `SDK permission prompt deny+interrupt: tool=${promptTool.name} message=${result.message}`,
    ),
      turnAbortControllerOf(context.abortController).abort());
  return { ...result, decisionReason: decisionReason, decideLocation: "ask-path" };
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
