/**
 * utils/hooks/hookSpecificOutput.ts
 *
 * hookSpecificOutput 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (16)
 * attribution: placement 16
 */
import { isDeepStrictEqual } from "util";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  _enum,
  objectSchema,
  stringSchema,
  discriminatedUnion,
  literal,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { externalPermissionModeSchema } from "../permissions/browserToolNames.js";
import { clipDisplayText } from "../resultError.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:310452-310547 placement
var permissionDecisionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var permissionRuleUpdateSchema;
deferInit("chunk-s61vbvea.js:310452", () => {
  permissionDecisionSchema = DoctorLazy(() => _enum(["allow", "deny", "ask"]));
  permissionRuleUpdateSchema = DoctorLazy(() =>
    objectSchema({
      toolName: stringSchema(),
      ruleContent: stringSchema().optional(),
    }),
  );
});
//@ chunk-s61vbvea.js:310547-311057 placement
/**
 * 权限更新目标与权限更新操作（添加/替换/删除规则、设置模式等）的 schema。
 */
var permissionUpdateDestinationSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var permissionUpdateSchema;
deferInit("chunk-s61vbvea.js:310547", () => {
  permissionUpdateDestinationSchema = DoctorLazy(() =>
    _enum(["userSettings", "projectSettings", "localSettings", "session", "cliArg"]),
  );
  permissionUpdateSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("addRules"),
        rules: array(permissionRuleUpdateSchema()),
        behavior: permissionDecisionSchema(),
        destination: permissionUpdateDestinationSchema(),
      }),
      objectSchema({
        type: literal("replaceRules"),
        rules: array(permissionRuleUpdateSchema()),
        behavior: permissionDecisionSchema(),
        destination: permissionUpdateDestinationSchema(),
      }),
      objectSchema({
        type: literal("removeRules"),
        rules: array(permissionRuleUpdateSchema()),
        behavior: permissionDecisionSchema(),
        destination: permissionUpdateDestinationSchema(),
      }),
      objectSchema({
        type: literal("setMode"),
        mode: externalPermissionModeSchema(),
        destination: permissionUpdateDestinationSchema(),
      }),
      objectSchema({
        type: literal("addDirectories"),
        directories: array(stringSchema()),
        destination: permissionUpdateDestinationSchema(),
      }),
      objectSchema({
        type: literal("removeDirectories"),
        directories: array(stringSchema()),
        destination: permissionUpdateDestinationSchema(),
      }),
    ]),
  );
});
//@ chunk-s61vbvea.js:311099-311310 placement
var HOOK_TEXT_FIELD_LIMITS = {
  reason: 2000,
  stopReason: 2000,
  systemMessage: 4000,
  additionalContext: 8000,
  permissionDecisionReason: 2000,
};
var MAX_ADDITIONAL_CONTEXT_CHARS = 200;
var HOOK_TEXT_FIELD_MAX_LINES = {
  reason: 20,
  stopReason: 20,
  systemMessage: 20,
  additionalContext: MAX_ADDITIONAL_CONTEXT_CHARS,
  permissionDecisionReason: 20,
};
//@ chunk-s61vbvea.js:311310-311375 placement
/**
 * 按字符数与行数上限裁剪钩子文本。
 */
function clipHookText(text, maxCodeUnits, maxLines = MAX_ADDITIONAL_CONTEXT_CHARS) {
  return clipDisplayText(text, {
    maxCodeUnits,
    maxLines,
  });
}
//@ chunk-s61vbvea.js:311375-311418 placement
function isAskUserQuestionTool(toolName) {
  if (toolName === ASKUSERQUESTION) return true;
  return false;
}
//@ chunk-s61vbvea.js:311418-312014 placement
/**
 * 提示"你自己的钩子试图修改工具输入但被拒绝"等三条固定文案（工具输入、提问答案、Slack 消息）。
 */
var SELF_HOOK_CHANGE_WARNINGS =
  "A hook from the user's own Claude Code files tried to change this tool call's input. In this session such hooks may block or ask about a call but not change it, so the call was not made. Retrying will not help while the hook keeps changing the input: go on without this call, and tell the user their hook's change to it was refused.";
var ANSWER_CHANGE_REFUSED_TEXT =
  "A hook from your own Claude Code files tried to change your answer to Claude's question. Claude read your answer as you gave it.";
var SLACK_MESSAGE_CHANGE_REFUSED_TEXT =
  "A hook from your own Claude Code files tried to change the Slack messages Claude read. Claude read them unchanged.";
//@ chunk-s61vbvea.js:312014-312204 placement
function clipHookTextField(state, field, value) {
  if (typeof value !== "string") return;
  if (state.options.personal === true) return value;
  let { text, truncated } = clipHookText(
    value,
    HOOK_TEXT_FIELD_LIMITS[field],
    HOOK_TEXT_FIELD_MAX_LINES[field],
  );
  if (truncated) state.report.truncated.push(field);
  return text.trim() === "" ? undefined : text;
}
//@ chunk-s61vbvea.js:312204-312284 placement
function markDroppedField(state, field, dropped) {
  if (dropped && !state.report.dropped.includes(field)) state.report.dropped.push(field);
}
//@ chunk-s61vbvea.js:312284-312416 placement
function additionalContextOutput(state, hookEventName, output) {
  let text = clipHookTextField(state, "additionalContext", output.additionalContext);
  return {
    hookEventName,
    ...(text !== undefined && {
      additionalContext: text,
    }),
  };
}
//@ chunk-s61vbvea.js:312416-314632 placement
function parsePreToolUseOutput(state, output, eventName) {
  if (output.hookEventName !== eventName) {
    markDroppedField(state, "hookSpecificOutput_event_mismatch", true);
    return;
  }
  switch (output.hookEventName) {
    case "PreToolUse": {
      if (
        state.options.personal === true &&
        output.permissionDecision !== "deny" &&
        output.updatedInput !== undefined &&
        !isDeepStrictEqual(output.updatedInput, state.options.toolInput)
      ) {
        markDroppedField(state, "updatedInput", true);
        return {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: SELF_HOOK_CHANGE_WARNINGS,
        };
      }
      let permissionDecision =
        state.options.personal === true && output.permissionDecision === "defer"
          ? "ask"
          : output.permissionDecision;
      let canDecide = permissionDecision === "deny" || permissionDecision === "ask";
      markDroppedField(state, "allow", permissionDecision === "allow");
      markDroppedField(state, "defer", permissionDecision === "defer");
      markDroppedField(state, "updatedInput", output.updatedInput !== undefined);
      markDroppedField(
        state,
        "permissionDecisionReason",
        !canDecide && output.permissionDecisionReason !== undefined,
      );
      let reason = canDecide
        ? clipHookTextField(state, "permissionDecisionReason", output.permissionDecisionReason)
        : undefined;
      let context = clipHookTextField(state, "additionalContext", output.additionalContext);
      return {
        hookEventName: "PreToolUse",
        ...(canDecide && {
          permissionDecision,
        }),
        ...(reason !== undefined && {
          permissionDecisionReason: reason,
        }),
        ...(context !== undefined && {
          additionalContext: context,
        }),
      };
    }
    case "UserPromptSubmit":
      markDroppedField(state, "sessionTitle", output.sessionTitle !== undefined);
      return {
        ...additionalContextOutput(state, "UserPromptSubmit", output),
        ...(output.suppressOriginalPrompt === true && {
          suppressOriginalPrompt: true,
        }),
      };
    case "PostToolUse": {
      let allowRewrite = state.options.personal === true && !isAskUserQuestionTool(state.options.toolName);
      if (
        state.options.personal === true &&
        !allowRewrite &&
        [output.updatedToolOutput, output.updatedMCPToolOutput].some(
          (candidate) => candidate !== undefined && !isDeepStrictEqual(candidate, state.options.toolResponse),
        )
      )
        state.wordsReplaced = true;
      markDroppedField(state, "updatedToolOutput", !allowRewrite && output.updatedToolOutput !== undefined);
      markDroppedField(
        state,
        "updatedMCPToolOutput",
        !allowRewrite && output.updatedMCPToolOutput !== undefined,
      );
      markDroppedField(state, "classifierContext", output.classifierContext !== undefined);
      return {
        ...additionalContextOutput(state, "PostToolUse", output),
        ...(allowRewrite &&
          output.updatedToolOutput !== undefined && {
            updatedToolOutput: output.updatedToolOutput,
          }),
        ...(allowRewrite &&
          output.updatedMCPToolOutput !== undefined && {
            updatedMCPToolOutput: output.updatedMCPToolOutput,
          }),
      };
    }
    case "UserPromptExpansion":
      return {
        ...additionalContextOutput(state, "UserPromptExpansion", output),
        ...(output.suppressOriginalPrompt === true && {
          suppressOriginalPrompt: true,
        }),
      };
    case "PostToolUseFailure":
      return additionalContextOutput(state, "PostToolUseFailure", output);
    case "PostToolBatch":
      return additionalContextOutput(state, "PostToolBatch", output);
    case "Stop":
      return additionalContextOutput(state, "Stop", output);
    case "SubagentStop":
      return additionalContextOutput(state, "SubagentStop", output);
    case "SubagentStart":
      return additionalContextOutput(state, "SubagentStart", output);
    case "PermissionDenied":
      markDroppedField(state, "retry", output.retry !== undefined);
      return {
        hookEventName: "PermissionDenied",
      };
    default:
      return state.options.personal === true
        ? parsePermissionRequestOutput(state, output)
        : refuseUnsupportedHookEvent(state);
  }
}
//@ chunk-s61vbvea.js:314632-314702 placement
function refuseUnsupportedHookEvent(state) {
  markDroppedField(state, "hookSpecificOutput_unsupported_event", true);
  return;
}
//@ chunk-s61vbvea.js:314702-316104 placement
function parsePermissionRequestOutput(state, output) {
  switch (output.hookEventName) {
    case "PermissionRequest": {
      if (output.decision.behavior !== "deny") {
        markDroppedField(state, "allow", true);
        return;
      }
      let message = clipHookTextField(state, "reason", output.decision.message);
      return {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          ...(message !== undefined && {
            message,
          }),
          ...(output.decision.interrupt === true && {
            interrupt: true,
          }),
        },
      };
    }
    case "PreModelSwitch": {
      let canDecide = output.permissionDecision === "deny" || output.permissionDecision === "ask";
      markDroppedField(state, "allow", output.permissionDecision === "allow");
      let reason = canDecide
        ? clipHookTextField(state, "permissionDecisionReason", output.permissionDecisionReason)
        : undefined;
      return {
        hookEventName: "PreModelSwitch",
        ...(canDecide && {
          permissionDecision: output.permissionDecision,
        }),
        ...(reason !== undefined && {
          permissionDecisionReason: reason,
        }),
      };
    }
    case "SessionStart":
      markDroppedField(state, "initialUserMessage", output.initialUserMessage !== undefined);
      markDroppedField(state, "sessionTitle", output.sessionTitle !== undefined);
      return {
        ...additionalContextOutput(state, "SessionStart", output),
        ...(output.watchPaths !== undefined && {
          watchPaths: output.watchPaths,
        }),
        ...(output.reloadSkills === true && {
          reloadSkills: true,
        }),
      };
    case "Setup":
      return additionalContextOutput(state, "Setup", output);
    case "PostModelSwitch":
      return additionalContextOutput(state, "PostModelSwitch", output);
    case "Notification":
      return additionalContextOutput(state, "Notification", output);
    case "Elicitation":
    case "ElicitationResult": {
      let declines = output.action === "decline" || output.action === "cancel";
      markDroppedField(state, "allow", output.action === "accept");
      markDroppedField(state, "content", output.content !== undefined);
      return {
        hookEventName: output.hookEventName,
        ...(declines && {
          action: output.action,
        }),
      };
    }
    case "CwdChanged":
    case "FileChanged":
      return {
        hookEventName: output.hookEventName,
        ...(output.watchPaths !== undefined && {
          watchPaths: output.watchPaths,
        }),
      };
    default:
      return refuseUnsupportedHookEvent(state);
  }
}
//@ chunk-s61vbvea.js:316104-317233 placement
function parseHookJsonOutput(output, hookEvent, options = {}) {
  let state = {
    report: {
      dropped: [],
      truncated: [],
    },
    options,
  };
  if ("async" in output) {
    markDroppedField(state, "async", true);
    return {
      answer: {},
      report: state.report,
    };
  }
  let raw = output;
  markDroppedField(state, "approve", raw.decision === "approve");
  markDroppedField(state, "reason", raw.decision === "approve" && raw.reason !== undefined);
  let personal = options.personal === true;
  markDroppedField(state, "terminalSequence", !personal && raw.terminalSequence !== undefined);
  markDroppedField(state, "metrics", raw.metrics !== undefined);
  markDroppedField(state, "rewakeSummary", raw.rewakeSummary !== undefined);
  let stopReason = clipHookTextField(state, "stopReason", raw.stopReason);
  let reason = raw.decision === "approve" ? undefined : clipHookTextField(state, "reason", raw.reason);
  let systemMessage = clipHookTextField(state, "systemMessage", raw.systemMessage);
  let hookSpecificOutput = raw.hookSpecificOutput;
  let isObject =
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    !Array.isArray(hookSpecificOutput);
  markDroppedField(state, "hookSpecificOutput_not_object", hookSpecificOutput !== undefined && !isObject);
  let specific = isObject ? parsePreToolUseOutput(state, hookSpecificOutput, hookEvent) : undefined;
  let message = state.wordsReplaced
    ? [
        systemMessage,
        options.toolName === ASKUSERQUESTION ? ANSWER_CHANGE_REFUSED_TEXT : SLACK_MESSAGE_CHANGE_REFUSED_TEXT,
      ].filter((part) => part !== undefined).join(`
`)
    : systemMessage;
  return {
    answer: {
      ...(raw.continue === false && {
        continue: false,
      }),
      ...(personal &&
        raw.terminalSequence !== undefined && {
          terminalSequence: raw.terminalSequence,
        }),
      ...(raw.suppressOutput === true && {
        suppressOutput: true,
      }),
      ...(stopReason !== undefined && {
        stopReason,
      }),
      ...(raw.decision === "block" && {
        decision: "block",
      }),
      ...(message !== undefined && {
        systemMessage: message,
      }),
      ...(reason !== undefined && {
        reason,
      }),
      ...(specific !== undefined && {
        hookSpecificOutput: specific,
      }),
    },
    report: state.report,
  };
}
//@ chunk-s61vbvea.js:317233-317538 placement
/**
 * 判断 hook 输出是否要求阻止（decision 为 block、continue 为 false 或权限 deny）。
 */
function isBlockingHookOutput(output) {
  if ("decision" in output && output.decision === "block") return true;
  if ("continue" in output && output.continue === false) return true;
  let hookSpecificOutput = "hookSpecificOutput" in output ? output.hookSpecificOutput : undefined;
  return (
    hookSpecificOutput !== undefined &&
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    "permissionDecision" in hookSpecificOutput &&
    (hookSpecificOutput.permissionDecision === "deny" || hookSpecificOutput.permissionDecision === "ask")
  );
}
//@ chunk-s61vbvea.js:317538-317770 placement
function isAskOnlyHookOutput(answer) {
  if (isDenyingHookOutput(answer) || ("continue" in answer && answer.continue === false)) return false;
  let hookSpecificOutput = "hookSpecificOutput" in answer ? answer.hookSpecificOutput : undefined;
  return (
    hookSpecificOutput !== undefined &&
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    "permissionDecision" in hookSpecificOutput &&
    hookSpecificOutput.permissionDecision === "ask"
  );
}
//@ chunk-s61vbvea.js:317770-318000 placement
function isDenyingHookOutput(output) {
  if ("decision" in output && output.decision === "block") return true;
  let hookSpecificOutput = "hookSpecificOutput" in output ? output.hookSpecificOutput : undefined;
  return (
    hookSpecificOutput !== undefined &&
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    "permissionDecision" in hookSpecificOutput &&
    hookSpecificOutput.permissionDecision === "deny"
  );
}
export {
  permissionUpdateSchema,
  isBlockingHookOutput,
  parseHookJsonOutput,
  isDenyingHookOutput,
  isAskOnlyHookOutput,
  clipHookText,
};
