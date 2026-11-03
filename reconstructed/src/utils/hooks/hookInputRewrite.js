/**
 * utils/hooks/hookInputRewrite.ts
 *
 * 2.1.316 新增：钩子输入改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isSameAnswerInput, d0e } from "../permissions/permissionAnswer.js";
import { shouldAllowManagedHooksOnly } from "./hooksConfigSnapshot.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";

//@ chunk-e6aww6q8.js:871497-871624 placement
var PLUGIN_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText("A plugin hook", "one of their plugins"),
  SETTINGS_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText(
    "A settings hook",
    "their organization's or their repo's settings",
  );
/**
 * 生成 hook 改写了跨环境工具调用输入而被拒绝时的说明。
 */
//@ chunk-e6aww6q8.js:871624-871996 placement
function hookRewriteRefusalText(e, n) {
  return `${e} changed this tool call's input. That is allowed only for calls that run in the same environment as the hook, and this one does not, so the call was not made. Retrying will not help while the hook keeps changing the input. Go on without this call, and tell the user that a hook in ${n} changes this tool's input, which is not supported here.`;
}
/**
 * 判断工具调用是否与 hook 在同一环境运行（插件 hook 运行器是否接管该工具）。
 */
//@ chunk-e6aww6q8.js:871996-872416 placement
function describeToolCallPlacement(e, n) {
  let r = "tool_input" in e && isPlainObject_4(e.tool_input) ? e.tool_input : void 0,
    s = !1,
    h = !1;
  try {
    s = getPluginHookRunner()?.runsTool(e.tool_name, r) === !0;
  } catch (error) {
    ((h = !0),
      logForDebugging(
        `Hooks: the plugin hook runner could not say where a tool call runs (${errorMessage(error)}), so the call counts as this process's and a rewritten input for it is refused`,
        { level: "error" },
      ));
  }
  return {
    runsThere: s,
    toolInput: r,
    ...(h && { runnerThrew: h }),
    ...(n?.settingsSource !== void 0 && { ofSettings: !0 }),
  };
}
//@ chunk-e6aww6q8.js:872416-872706 placement
function hookDecisionKind(e) {
  let hookSpecificOutput = e.hookSpecificOutput;
  if (hookSpecificOutput?.hookEventName === "PermissionRequest") return "allow";
  if (
    hookSpecificOutput?.hookEventName === "PreToolUse" &&
    hookSpecificOutput.permissionDecision !== void 0 &&
    hookSpecificOutput.permissionDecision !== "deny"
  )
    return hookSpecificOutput.permissionDecision;
  if (e.decision === "approve") return "allow";
  return e.decision ?? "none";
}
/**
 * 检查 hook 输出是否改写了不在同一环境运行的调用的输入，是则返回拒绝结果。
 */
//@ chunk-e6aww6q8.js:872706-873436 placement
function refuseCrossEnvironmentInputRewrite(output, { toolInput: toolInput, ofSettings: ofSettings }) {
  let s = ofSettings ? SETTINGS_HOOK_REWRITE_REFUSAL : PLUGIN_HOOK_REWRITE_REFUSAL;
  switch (output.hookEventName) {
    case "PreToolUse": {
      let { updatedInput: updatedInput, ...y } = output;
      if (y.permissionDecision === "deny" || updatedInput === void 0) return;
      if (toolInput !== void 0 && isSameAnswerInput(updatedInput, toolInput))
        return { output: y, refused: !1 };
      return {
        output: {
          hookEventName: "PreToolUse",
          ...(y.additionalContext !== void 0 && { additionalContext: y.additionalContext }),
          permissionDecision: "deny",
          permissionDecisionReason: s,
        },
        refused: !0,
      };
    }
    case "PermissionRequest": {
      if (output.decision.behavior !== "allow") return;
      let { updatedInput: updatedInput, ...y } = output.decision;
      if (updatedInput === void 0) return;
      return d0e(updatedInput, toolInput ?? {})
        ? { output: { hookEventName: "PermissionRequest", decision: y }, refused: !1 }
        : {
            output: { hookEventName: "PermissionRequest", decision: { behavior: "deny", message: s } },
            refused: !0,
          };
    }
    default:
      return;
  }
}
/**
 * 钩子返回改写后的工具输入（PreToolUse updatedInput 或 PermissionRequest 的 allow+updatedInput）时，若工具调用不在钩子所在环境运行且输入确有变化，则把决定改为 deny 并附说明；返回新的答复与是否被拒。
 */
//@ chunk-e6aww6q8.js:873436-873945 placement
function applyInputRewritePolicy(answer, eventName, r, s) {
  let h = { answer: answer, refused: !1 };
  if ("async" in answer || answer.hookSpecificOutput === void 0) return h;
  let hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput.hookEventName !== eventName) return h;
  let S = refuseCrossEnvironmentInputRewrite(hookSpecificOutput, r.runsThere ? { ...r, toolInput: s } : r);
  if (S === void 0 || (r.runsThere && S.refused)) return h;
  if (!S.refused) return { answer: { ...answer, hookSpecificOutput: S.output }, refused: !1 };
  let { decision: decision, reason: reason, ...G } = answer;
  return {
    answer: {
      ...G,
      ...(decision !== "approve" && decision !== void 0 && { decision: decision }),
      ...(decision !== "approve" && reason !== void 0 && { reason: reason }),
      hookSpecificOutput: S.output,
    },
    refused: !0,
  };
}
//@ chunk-e6aww6q8.js:873945-874563 placement
function applyRemoteHookInputRewrite(e, n, r, s) {
  if (!("tool_name" in n)) return e;
  let h = describeToolCallPlacement(n, r),
    { answer: answer, refused: refused } = applyInputRewritePolicy(e, n.hook_event_name, h, s?.repairedInput);
  if (!refused || "async" in e) return answer;
  logForDebugging(
    `Hooks: a ${n.hook_event_name} hook that ran on another machine rewrote the input of a tool call that counts as this process's, and the call was refused`,
    { level: "warn" },
  );
  try {
    getPluginHookRunner()?.rewriteRefused?.({
      hook_event_kind: n.hook_event_name,
      decision_kind: hookDecisionKind(e),
      runner_threw: h.runnerThrew === !0,
    });
  } catch (error) {
    logForDebugging(
      `Hooks: the plugin hook runner threw when told of a refused rewrite (${errorMessage(error)}): the refusal stands, and the host's log line is lost`,
      { level: "warn" },
    );
  }
  return answer;
}
//@ chunk-e6aww6q8.js:874563-874583 placement
var weakSet_3 = new WeakSet();
//@ chunk-e6aww6q8.js:874583-874618 placement
function j0(e) {
  return (weakSet_3.add(e), e);
}
//@ chunk-e6aww6q8.js:874618-874648 placement
function IHt(e) {
  weakSet_3.delete(e);
}
//@ chunk-e6aww6q8.js:874648-874682 placement
function Fge(e) {
  return weakSet_3.has(e);
}
//@ chunk-e6aww6q8.js:874682-874726 placement
function zWe(e, n) {
  return weakSet_3.has(e) ? j0(n) : n;
}
/**
 * 只允许 managed 钩子或处于受限模式时为真，此时 statusLine 只取 policySettings。
 */
//@ chunk-e6aww6q8.js:874726-874759 placement
function isStatusLineManagedOnly() {
  return shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
}

export { isStatusLineManagedOnly, Fge, j0, IHt, zWe, applyRemoteHookInputRewrite };
