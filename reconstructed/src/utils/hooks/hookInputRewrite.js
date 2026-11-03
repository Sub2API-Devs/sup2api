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
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isSameAnswerInput, isUnchangedAnswerInput } from "../permissions/permissionAnswer.js";
import { shouldAllowManagedHooksOnly } from "./hooksConfigSnapshot.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";

//@ chunk-e6aww6q8.js:871497-871624 placement
var PLUGIN_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText("A plugin hook", "one of their plugins");
var SETTINGS_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText(
  "A settings hook",
  "their organization's or their repo's settings",
);
//@ chunk-e6aww6q8.js:871624-871996 placement
/**
 * 生成 hook 改写了跨环境工具调用输入而被拒绝时的说明。
 */
function hookRewriteRefusalText(e, n) {
  return `${e} changed this tool call's input. That is allowed only for calls that run in the same environment as the hook, and this one does not, so the call was not made. Retrying will not help while the hook keeps changing the input. Go on without this call, and tell the user that a hook in ${n} changes this tool's input, which is not supported here.`;
}
//@ chunk-e6aww6q8.js:871996-872416 placement
/**
 * 判断工具调用是否与 hook 在同一环境运行（插件 hook 运行器是否接管该工具）。
 */
function describeToolCallPlacement(e, n) {
  let toolInput = "tool_input" in e && isPlainObject_5(e.tool_input) ? e.tool_input : undefined;
  let runsThere = false;
  let h = false;
  try {
    runsThere = getPluginHookRunner()?.runsTool(e.tool_name, toolInput) === true;
  } catch (error) {
    h = true;
    logForDebugging(
      `Hooks: the plugin hook runner could not say where a tool call runs (${errorMessage(error)}), so the call counts as this process's and a rewritten input for it is refused`,
      {
        level: "error",
      },
    );
  }
  return {
    runsThere,
    toolInput,
    ...(h && {
      runnerThrew: h,
    }),
    ...(n?.settingsSource !== undefined && {
      ofSettings: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:872416-872706 placement
function hookDecisionKind(e) {
  let hookSpecificOutput = e.hookSpecificOutput;
  if (hookSpecificOutput?.hookEventName === "PermissionRequest") return "allow";
  if (
    hookSpecificOutput?.hookEventName === "PreToolUse" &&
    hookSpecificOutput.permissionDecision !== undefined &&
    hookSpecificOutput.permissionDecision !== "deny"
  )
    return hookSpecificOutput.permissionDecision;
  if (e.decision === "approve") return "allow";
  return e.decision ?? "none";
}
//@ chunk-e6aww6q8.js:872706-873436 placement
/**
 * 检查 hook 输出是否改写了不在同一环境运行的调用的输入，是则返回拒绝结果。
 */
function refuseCrossEnvironmentInputRewrite(output, { toolInput, ofSettings }) {
  let s = ofSettings ? SETTINGS_HOOK_REWRITE_REFUSAL : PLUGIN_HOOK_REWRITE_REFUSAL;
  switch (output.hookEventName) {
    case "PreToolUse": {
      let { updatedInput, ...y } = output;
      if (y.permissionDecision === "deny" || updatedInput === undefined) return;
      if (toolInput !== undefined && isSameAnswerInput(updatedInput, toolInput))
        return {
          output: y,
          refused: false,
        };
      return {
        output: {
          hookEventName: "PreToolUse",
          ...(y.additionalContext !== undefined && {
            additionalContext: y.additionalContext,
          }),
          permissionDecision: "deny",
          permissionDecisionReason: s,
        },
        refused: true,
      };
    }
    case "PermissionRequest": {
      if (output.decision.behavior !== "allow") return;
      let { updatedInput, ...y } = output.decision;
      if (updatedInput === undefined) return;
      return isUnchangedAnswerInput(updatedInput, toolInput ?? {})
        ? {
            output: {
              hookEventName: "PermissionRequest",
              decision: y,
            },
            refused: false,
          }
        : {
            output: {
              hookEventName: "PermissionRequest",
              decision: {
                behavior: "deny",
                message: s,
              },
            },
            refused: true,
          };
    }
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:873436-873945 placement
/**
 * 钩子返回改写后的工具输入（PreToolUse updatedInput 或 PermissionRequest 的 allow+updatedInput）时，若工具调用不在钩子所在环境运行且输入确有变化，则把决定改为 deny 并附说明；返回新的答复与是否被拒。
 */
function applyInputRewritePolicy(answer, eventName, r, toolInput) {
  let h = {
    answer,
    refused: false,
  };
  if ("async" in answer || answer.hookSpecificOutput === undefined) return h;
  let hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput.hookEventName !== eventName) return h;
  let S = refuseCrossEnvironmentInputRewrite(
    hookSpecificOutput,
    r.runsThere
      ? {
          ...r,
          toolInput,
        }
      : r,
  );
  if (S === undefined || (r.runsThere && S.refused)) return h;
  if (!S.refused)
    return {
      answer: {
        ...answer,
        hookSpecificOutput: S.output,
      },
      refused: false,
    };
  let { decision, reason, ...G } = answer;
  return {
    answer: {
      ...G,
      ...(decision !== "approve" &&
        decision !== undefined && {
          decision,
        }),
      ...(decision !== "approve" &&
        reason !== undefined && {
          reason,
        }),
      hookSpecificOutput: S.output,
    },
    refused: true,
  };
}
//@ chunk-e6aww6q8.js:873945-874563 placement
function applyRemoteHookInputRewrite(answer, hookInput, hookOriginLabel, s) {
  if (!("tool_name" in hookInput)) return answer;
  let h = describeToolCallPlacement(hookInput, hookOriginLabel);
  let { answer: answer_2, refused } = applyInputRewritePolicy(
    answer,
    hookInput.hook_event_name,
    h,
    s?.repairedInput,
  );
  if (!refused || "async" in answer) return answer_2;
  logForDebugging(
    `Hooks: a ${hookInput.hook_event_name} hook that ran on another machine rewrote the input of a tool call that counts as this process's, and the call was refused`,
    {
      level: "warn",
    },
  );
  try {
    getPluginHookRunner()?.rewriteRefused?.({
      hook_event_kind: hookInput.hook_event_name,
      decision_kind: hookDecisionKind(answer),
      runner_threw: h.runnerThrew === true,
    });
  } catch (error) {
    logForDebugging(
      `Hooks: the plugin hook runner threw when told of a refused rewrite (${errorMessage(error)}): the refusal stands, and the host's log line is lost`,
      {
        level: "warn",
      },
    );
  }
  return answer_2;
}
//@ chunk-e6aww6q8.js:874563-874583 placement
var weakSet_3 = new WeakSet();
//@ chunk-e6aww6q8.js:874583-874618 placement
/**
 * 标记某输入已被改写，并返回该对象。
 */
function markRewrittenInput(hook) {
  weakSet_3.add(hook);
  return hook;
}
//@ chunk-e6aww6q8.js:874618-874648 placement
/**
 * 取消输入改写标记。
 */
function unmarkRewrittenInput(hook) {
  weakSet_3.delete(hook);
}
//@ chunk-e6aww6q8.js:874648-874682 placement
/**
 * 判断输入是否带改写标记。
 */
function isRewrittenInput(e) {
  return weakSet_3.has(e);
}
//@ chunk-e6aww6q8.js:874682-874726 placement
/**
 * 若来源带标记则返回新值（保持标记）。
 */
function rewriteInputIfMarked(e, n) {
  return weakSet_3.has(e) ? markRewrittenInput(n) : n;
}
//@ chunk-e6aww6q8.js:874726-874759 placement
/**
 * 只允许 managed 钩子或处于受限模式时为真，此时 statusLine 只取 policySettings。
 */
function isStatusLineManagedOnly() {
  return shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
}
export {
  isStatusLineManagedOnly,
  isRewrittenInput,
  markRewrittenInput,
  unmarkRewrittenInput,
  rewriteInputIfMarked,
  applyRemoteHookInputRewrite,
};
