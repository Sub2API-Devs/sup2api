/**
 * utils/hooks/hookInputRewrite.ts
 *
 * 2.1.316 新增：钩子输入改写
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (21)
 * attribution: placement 13, layout 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isSameAnswerInput, isUnchangedAnswerInput } from "../permissions/permissionAnswer.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "./hookEvents.js";
import { hookInputKey } from "../hooks.js";
import { shouldAllowManagedHooksOnly } from "./hooksConfigSnapshot.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:879126-879253 placement
var PLUGIN_HOOK_REWRITE_REFUSAL; // deferred: uses hookRewriteRefusalText of its import cycle while loading; runs once the cycle is complete
var SETTINGS_HOOK_REWRITE_REFUSAL;
deferInit("chunk-5xgkngpb.js:879126", () => {
  PLUGIN_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText("A plugin hook", "one of their plugins");
  SETTINGS_HOOK_REWRITE_REFUSAL = hookRewriteRefusalText(
    "A settings hook",
    "their organization's or their repo's settings",
  );
});
//@ chunk-5xgkngpb.js:879253-879625 placement
/**
 * 生成 hook 改写了跨环境工具调用输入而被拒绝时的说明。
 */
function hookRewriteRefusalText(hookName, source) {
  return `${hookName} changed this tool call's input. That is allowed only for calls that run in the same environment as the hook, and this one does not, so the call was not made. Retrying will not help while the hook keeps changing the input. Go on without this call, and tell the user that a hook in ${source} changes this tool's input, which is not supported here.`;
}
//@ chunk-5xgkngpb.js:879625-880045 placement
/**
 * 判断工具调用是否与 hook 在同一环境运行（插件 hook 运行器是否接管该工具）。
 */
function describeToolCallPlacement(hookInput, origin) {
  let toolInput =
    "tool_input" in hookInput && isPlainObject_6(hookInput.tool_input) ? hookInput.tool_input : undefined;
  let runsThere = false;
  let runnerThrew = false;
  try {
    runsThere = getPluginHookRunner()?.runsTool(hookInput.tool_name, toolInput) === true;
  } catch (error) {
    runnerThrew = true;
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
    ...(runnerThrew && {
      runnerThrew,
    }),
    ...(origin?.settingsSource !== undefined && {
      ofSettings: true,
    }),
  };
}
//@ chunk-5xgkngpb.js:880045-880335 placement
function hookDecisionKind(answer) {
  let hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput?.hookEventName === "PermissionRequest") return "allow";
  if (
    hookSpecificOutput?.hookEventName === "PreToolUse" &&
    hookSpecificOutput.permissionDecision !== undefined &&
    hookSpecificOutput.permissionDecision !== "deny"
  )
    return hookSpecificOutput.permissionDecision;
  if (answer.decision === "approve") return "allow";
  return answer.decision ?? "none";
}
//@ chunk-5xgkngpb.js:880335-881065 placement
/**
 * 检查 hook 输出是否改写了不在同一环境运行的调用的输入，是则返回拒绝结果。
 */
function refuseCrossEnvironmentInputRewrite(output, { toolInput, ofSettings }) {
  let refusalText = ofSettings ? SETTINGS_HOOK_REWRITE_REFUSAL : PLUGIN_HOOK_REWRITE_REFUSAL;
  switch (output.hookEventName) {
    case "PreToolUse": {
      let { updatedInput, ...rest } = output;
      if (rest.permissionDecision === "deny" || updatedInput === undefined) return;
      if (toolInput !== undefined && isSameAnswerInput(updatedInput, toolInput))
        return {
          output: rest,
          refused: false,
        };
      return {
        output: {
          hookEventName: "PreToolUse",
          ...(rest.additionalContext !== undefined && {
            additionalContext: rest.additionalContext,
          }),
          permissionDecision: "deny",
          permissionDecisionReason: refusalText,
        },
        refused: true,
      };
    }
    case "PermissionRequest": {
      if (output.decision.behavior !== "allow") return;
      let { updatedInput, ...rest } = output.decision;
      if (updatedInput === undefined) return;
      return isUnchangedAnswerInput(updatedInput, toolInput ?? {})
        ? {
            output: {
              hookEventName: "PermissionRequest",
              decision: rest,
            },
            refused: false,
          }
        : {
            output: {
              hookEventName: "PermissionRequest",
              decision: {
                behavior: "deny",
                message: refusalText,
              },
            },
            refused: true,
          };
    }
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:881065-881574 placement
/**
 * 钩子返回改写后的工具输入（PreToolUse updatedInput 或 PermissionRequest 的 allow+updatedInput）时，若工具调用不在钩子所在环境运行且输入确有变化，则把决定改为 deny 并附说明；返回新的答复与是否被拒。
 */
function applyInputRewritePolicy(answer, eventName, placement, toolInput) {
  let unchanged = {
    answer,
    refused: false,
  };
  if ("async" in answer || answer.hookSpecificOutput === undefined) return unchanged;
  let hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput.hookEventName !== eventName) return unchanged;
  let rewrite = refuseCrossEnvironmentInputRewrite(
    hookSpecificOutput,
    placement.runsThere
      ? {
          ...placement,
          toolInput,
        }
      : placement,
  );
  if (rewrite === undefined || (placement.runsThere && rewrite.refused)) return unchanged;
  if (!rewrite.refused)
    return {
      answer: {
        ...answer,
        hookSpecificOutput: rewrite.output,
      },
      refused: false,
    };
  let { decision, reason, ...rest } = answer;
  return {
    answer: {
      ...rest,
      ...(decision !== "approve" &&
        decision !== undefined && {
          decision,
        }),
      ...(decision !== "approve" &&
        reason !== undefined && {
          reason,
        }),
      hookSpecificOutput: rewrite.output,
    },
    refused: true,
  };
}
//@ chunk-5xgkngpb.js:881574-882191 placement
function applyRemoteHookInputRewrite(answer, hookInput, origin, state) {
  if (!("tool_name" in hookInput)) return answer;
  let placement = describeToolCallPlacement(hookInput, origin);
  let { answer: answer_2, refused } = applyInputRewritePolicy(
    answer,
    hookInput.hook_event_name,
    placement,
    state?.repairedInput,
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
      runner_threw: placement.runnerThrew === true,
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
//@ chunk-5xgkngpb.js:882191-882481 layout
function toRewriteOutcome(result) {
  if (result.applies === true)
    return {
      kind: "applies",
      cwd: result.inSessionCwd,
    };
  if (result.aborted)
    return {
      kind: "cancelled",
    };
  if (result.status !== 0)
    return {
      kind: "not_asked",
      said: "It gave no answer.",
    };
  return result.stdout === ""
    ? {
        kind: "does_not_apply",
      }
    : {
        kind: "stand_in",
        stdout: result.stdout,
        repairedInput: result.repairedInput,
      };
}
//@ chunk-5xgkngpb.js:882481-882810 layout
async function askContainerIfHookApplies(runner, owner, sent, options) {
  if (sent === undefined)
    return {
      kind: "not_asked",
      said: "The hook input could not be written.",
    };
  try {
    return toRewriteOutcome(
      await runner.run({
        ...options,
        ...owner,
        jsonInput: sent,
        inBackground: false,
      }),
    );
  } catch {
    if (options.signal.aborted)
      return {
        kind: "cancelled",
      };
    return {
      kind: "not_asked",
      said: "The tool container could not be asked whether this hook applies.",
    };
  }
}
//@ chunk-5xgkngpb.js:882810-882917 layout
function mcpToolHookEventUnavailableText(hookEvent) {
  return `mcp_tool hooks are not available for the '${hookEvent}' hook event (no MCP client context)`;
}
//@ chunk-5xgkngpb.js:882917-883048 layout
function isMcpToolHookUnsupportedEvent(hookInput) {
  return (
    hookInput?.hook_event_name === "Setup" ||
    (hookInput?.hook_event_name === "SessionStart" &&
      hookInput.source !== "clear" &&
      hookInput.source !== "compact")
  );
}
//@ chunk-5xgkngpb.js:883048-884027 layout
function createHttpHookSender(pluginHookRunner, sent, originLabel, options) {
  return async (hook, hookEvent, event, jsonInput, signal = TOOL_HOOK_EXECUTION_TIMEOUT_MS) => {
    let failed = {
      ok: false,
      body: "",
      unanswered: "not_asked",
    };
    if (sent === undefined)
      return {
        ...failed,
        error: "The hook input could not be written.",
      };
    let runResult;
    try {
      runResult = await pluginHookRunner.run({
        ...originLabel,
        ...options,
        hook: {
          ...hook,
          command: hook.url,
          timeout: hook.timeout ?? signal / 1000,
        },
        hookEvent,
        jsonInput: sent,
        inBackground: false,
        signal: jsonInput ?? new AbortController().signal,
      });
    } catch (error) {
      if (jsonInput?.aborted)
        return {
          ok: false,
          body: "",
          aborted: true,
        };
      logForDebugging(`Hooks: an HTTP hook's send on another machine failed (${errorMessage(error)})`, {
        level: "error",
      });
      return {
        ...failed,
        error: "The machine that sends it gave no usable answer.",
      };
    }
    if (runResult.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    if (runResult.stdioIncomplete || runResult.stdioClosedWithoutEnd)
      return {
        ...failed,
        unanswered: "lost",
        error: "Its answer was lost.",
      };
    let status = runResult.status === 0;
    if (runResult.stderr)
      logForDebugging(`Hooks: the machine that sent an HTTP hook said of it: ${runResult.stderr}`, {
        level: "error",
      });
    return {
      ok: status,
      statusCode: runResult.httpStatus,
      body: status ? runResult.stdout : "",
      ranElsewhere: runResult,
      error:
        status || runResult.httpStatus !== undefined
          ? undefined
          : "The tool container could not send the hook.",
    };
  };
}
//@ chunk-5xgkngpb.js:884027-884094 layout
var MCP_TOOL_HOOK_UNREACHABLE_TEXT = "The machine that holds the server gave no usable answer.";
//@ chunk-5xgkngpb.js:884094-884445 layout
function toMcpRunOutcome(result) {
  if (result.aborted)
    return {
      ok: false,
      body: "",
      aborted: true,
    };
  if (result.stdioIncomplete || result.stdioClosedWithoutEnd)
    return {
      ok: false,
      body: "",
      unanswered: "lost",
      error: "Its answer was lost.",
    };
  if (result.withheld)
    return {
      ok: false,
      unanswered: "not_asked",
      ...{
        body: "",
        error: MCP_TOOL_HOOK_UNREACHABLE_TEXT,
        withheld: true,
      },
    };
  return {
    ok: result.status === 0,
    body: result.stdout,
    ...(result.stderr !== "" && {
      error: result.stderr,
    }),
    ranElsewhere: result,
  };
}
//@ chunk-5xgkngpb.js:884445-885037 layout
/**
 * 执行 mcp_tool 类型钩子：无磁盘会话不运行；找不到客户端或服务器未连接时跳过（连接中可短暂等待）；Artifacts、云浏览器与受限账号记忆工具拒绝；插值参数后调用 MCP 工具并返回文本结果或错误。
 */
function runMcpToolHook(pluginHookRunner, sent, originLabel) {
  return async (
    hook,
    hookEvent,
    hookInputArg,
    input,
    signal,
    defaultTimeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  ) => {
    if (isMcpToolHookUnsupportedEvent(hookInputArg))
      return {
        ok: false,
        body: "",
        error: mcpToolHookEventUnavailableText(hookEvent),
      };
    let failed = {
      ok: false,
      body: "",
      unanswered: "not_asked",
    };
    if (sent === undefined)
      return {
        ...failed,
        error: "The hook input could not be written.",
      };
    try {
      let runResult = await pluginHookRunner.run({
        ...originLabel,
        settingsSource: "projectSettings",
        hook: {
          ...hook,
          command: hookInputKey(hook),
          timeout: hook.timeout ?? defaultTimeoutMs / 1000,
        },
        hookEvent,
        jsonInput: sent,
        inBackground: false,
        signal: signal ?? new AbortController().signal,
      });
      return toMcpRunOutcome(runResult);
    } catch (error) {
      if (signal?.aborted)
        return {
          ok: false,
          body: "",
          aborted: true,
        };
      logForDebugging(`Hooks: an mcp_tool hook's call on another machine failed (${errorMessage(error)})`, {
        level: "error",
      });
      return {
        ...failed,
        error: MCP_TOOL_HOOK_UNREACHABLE_TEXT,
      };
    }
  };
}
//@ chunk-5xgkngpb.js:885037-885057 placement
var weakSet_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:885037", () => {
  weakSet_3 = new WeakSet();
});
//@ chunk-5xgkngpb.js:885057-885092 placement
/**
 * 标记某输入已被改写，并返回该对象。
 */
function markRewrittenInput(hook) {
  weakSet_3.add(hook);
  return hook;
}
//@ chunk-5xgkngpb.js:885092-885122 placement
/**
 * 取消输入改写标记。
 */
function unmarkRewrittenInput(hook) {
  weakSet_3.delete(hook);
}
//@ chunk-5xgkngpb.js:885122-885156 placement
/**
 * 判断输入是否带改写标记。
 */
function isRewrittenInput(input) {
  return weakSet_3.has(input);
}
//@ chunk-5xgkngpb.js:885156-885200 placement
/**
 * 若来源带标记则返回新值（保持标记）。
 */
function rewriteInputIfMarked(input, rewritten) {
  return weakSet_3.has(input) ? markRewrittenInput(rewritten) : rewritten;
}
//@ chunk-5xgkngpb.js:885200-885233 placement
/**
 * 只允许 managed 钩子或处于受限模式时为真，此时 statusLine 只取 policySettings。
 */
function isStatusLineManagedOnly() {
  return shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
}
export {
  applyRemoteHookInputRewrite,
  askContainerIfHookApplies,
  isRewrittenInput,
  markRewrittenInput,
  unmarkRewrittenInput,
  createHttpHookSender,
  runMcpToolHook,
  rewriteInputIfMarked,
  isStatusLineManagedOnly,
  mcpToolHookEventUnavailableText,
  isMcpToolHookUnsupportedEvent,
};
