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
  u,
  string,
  discriminatedUnion,
  literal,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { externalPermissionModeSchema } from "../permissions/browserToolNames.js";
import { clipDisplayText } from "../resultError.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";

//@ chunk-s61vbvea.js:310452-310547 placement
var permissionDecisionSchema = DoctorLazy(() => _enum(["allow", "deny", "ask"]));
var permissionRuleUpdateSchema = DoctorLazy(() =>
  u({
    toolName: string(),
    ruleContent: string().optional(),
  }),
);
//@ chunk-s61vbvea.js:310547-311057 placement
/**
 * 权限更新目标与权限更新操作（添加/替换/删除规则、设置模式等）的 schema。
 */
var permissionUpdateDestinationSchema = DoctorLazy(() =>
  _enum(["userSettings", "projectSettings", "localSettings", "session", "cliArg"]),
);
var permissionUpdateSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    u({
      type: literal("addRules"),
      rules: array(permissionRuleUpdateSchema()),
      behavior: permissionDecisionSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    u({
      type: literal("replaceRules"),
      rules: array(permissionRuleUpdateSchema()),
      behavior: permissionDecisionSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    u({
      type: literal("removeRules"),
      rules: array(permissionRuleUpdateSchema()),
      behavior: permissionDecisionSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    u({
      type: literal("setMode"),
      mode: externalPermissionModeSchema(),
      destination: permissionUpdateDestinationSchema(),
    }),
    u({
      type: literal("addDirectories"),
      directories: array(string()),
      destination: permissionUpdateDestinationSchema(),
    }),
    u({
      type: literal("removeDirectories"),
      directories: array(string()),
      destination: permissionUpdateDestinationSchema(),
    }),
  ]),
);
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
function clipHookText(e, maxCodeUnits, maxLines = MAX_ADDITIONAL_CONTEXT_CHARS) {
  return clipDisplayText(e, {
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
function clipHookTextField(e, n, r) {
  if (typeof r !== "string") return;
  if (e.options.personal === true) return r;
  let { text, truncated } = clipHookText(r, HOOK_TEXT_FIELD_LIMITS[n], HOOK_TEXT_FIELD_MAX_LINES[n]);
  if (truncated) e.report.truncated.push(n);
  return text.trim() === "" ? undefined : text;
}
//@ chunk-s61vbvea.js:312204-312284 placement
function markDroppedField(e, n, r) {
  if (r && !e.report.dropped.includes(n)) e.report.dropped.push(n);
}
//@ chunk-s61vbvea.js:312284-312416 placement
function additionalContextOutput(e, hookEventName, r) {
  let s = clipHookTextField(e, "additionalContext", r.additionalContext);
  return {
    hookEventName,
    ...(s !== undefined && {
      additionalContext: s,
    }),
  };
}
//@ chunk-s61vbvea.js:312416-314632 placement
function parsePreToolUseOutput(e, hookSpecificOutput, r) {
  if (hookSpecificOutput.hookEventName !== r) {
    markDroppedField(e, "hookSpecificOutput_event_mismatch", true);
    return;
  }
  switch (hookSpecificOutput.hookEventName) {
    case "PreToolUse": {
      if (
        e.options.personal === true &&
        hookSpecificOutput.permissionDecision !== "deny" &&
        hookSpecificOutput.updatedInput !== undefined &&
        !isDeepStrictEqual(hookSpecificOutput.updatedInput, e.options.toolInput)
      ) {
        markDroppedField(e, "updatedInput", true);
        return {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: SELF_HOOK_CHANGE_WARNINGS,
        };
      }
      let permissionDecision =
        e.options.personal === true && hookSpecificOutput.permissionDecision === "defer"
          ? "ask"
          : hookSpecificOutput.permissionDecision;
      let y = permissionDecision === "deny" || permissionDecision === "ask";
      markDroppedField(e, "allow", permissionDecision === "allow");
      markDroppedField(e, "defer", permissionDecision === "defer");
      markDroppedField(e, "updatedInput", hookSpecificOutput.updatedInput !== undefined);
      markDroppedField(
        e,
        "permissionDecisionReason",
        !y && hookSpecificOutput.permissionDecisionReason !== undefined,
      );
      let S = y
        ? clipHookTextField(e, "permissionDecisionReason", hookSpecificOutput.permissionDecisionReason)
        : undefined;
      let w = clipHookTextField(e, "additionalContext", hookSpecificOutput.additionalContext);
      return {
        hookEventName: "PreToolUse",
        ...(y && {
          permissionDecision,
        }),
        ...(S !== undefined && {
          permissionDecisionReason: S,
        }),
        ...(w !== undefined && {
          additionalContext: w,
        }),
      };
    }
    case "UserPromptSubmit":
      markDroppedField(e, "sessionTitle", hookSpecificOutput.sessionTitle !== undefined);
      return {
        ...additionalContextOutput(e, "UserPromptSubmit", hookSpecificOutput),
        ...(hookSpecificOutput.suppressOriginalPrompt === true && {
          suppressOriginalPrompt: true,
        }),
      };
    case "PostToolUse": {
      let s = e.options.personal === true && !isAskUserQuestionTool(e.options.toolName);
      if (
        e.options.personal === true &&
        !s &&
        [hookSpecificOutput.updatedToolOutput, hookSpecificOutput.updatedMCPToolOutput].some(
          (h) => h !== undefined && !isDeepStrictEqual(h, e.options.toolResponse),
        )
      )
        e.wordsReplaced = true;
      markDroppedField(e, "updatedToolOutput", !s && hookSpecificOutput.updatedToolOutput !== undefined);
      markDroppedField(
        e,
        "updatedMCPToolOutput",
        !s && hookSpecificOutput.updatedMCPToolOutput !== undefined,
      );
      markDroppedField(e, "classifierContext", hookSpecificOutput.classifierContext !== undefined);
      return {
        ...additionalContextOutput(e, "PostToolUse", hookSpecificOutput),
        ...(s &&
          hookSpecificOutput.updatedToolOutput !== undefined && {
            updatedToolOutput: hookSpecificOutput.updatedToolOutput,
          }),
        ...(s &&
          hookSpecificOutput.updatedMCPToolOutput !== undefined && {
            updatedMCPToolOutput: hookSpecificOutput.updatedMCPToolOutput,
          }),
      };
    }
    case "UserPromptExpansion":
      return {
        ...additionalContextOutput(e, "UserPromptExpansion", hookSpecificOutput),
        ...(hookSpecificOutput.suppressOriginalPrompt === true && {
          suppressOriginalPrompt: true,
        }),
      };
    case "PostToolUseFailure":
      return additionalContextOutput(e, "PostToolUseFailure", hookSpecificOutput);
    case "PostToolBatch":
      return additionalContextOutput(e, "PostToolBatch", hookSpecificOutput);
    case "Stop":
      return additionalContextOutput(e, "Stop", hookSpecificOutput);
    case "SubagentStop":
      return additionalContextOutput(e, "SubagentStop", hookSpecificOutput);
    case "SubagentStart":
      return additionalContextOutput(e, "SubagentStart", hookSpecificOutput);
    case "PermissionDenied":
      markDroppedField(e, "retry", hookSpecificOutput.retry !== undefined);
      return {
        hookEventName: "PermissionDenied",
      };
    default:
      return e.options.personal === true
        ? parsePermissionRequestOutput(e, hookSpecificOutput)
        : refuseUnsupportedHookEvent(e);
  }
}
//@ chunk-s61vbvea.js:314632-314702 placement
function refuseUnsupportedHookEvent(e) {
  markDroppedField(e, "hookSpecificOutput_unsupported_event", true);
  return;
}
//@ chunk-s61vbvea.js:314702-316104 placement
function parsePermissionRequestOutput(e, n) {
  switch (n.hookEventName) {
    case "PermissionRequest": {
      if (n.decision.behavior !== "deny") {
        markDroppedField(e, "allow", true);
        return;
      }
      let r = clipHookTextField(e, "reason", n.decision.message);
      return {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          ...(r !== undefined && {
            message: r,
          }),
          ...(n.decision.interrupt === true && {
            interrupt: true,
          }),
        },
      };
    }
    case "PreModelSwitch": {
      let r = n.permissionDecision === "deny" || n.permissionDecision === "ask";
      markDroppedField(e, "allow", n.permissionDecision === "allow");
      let s = r ? clipHookTextField(e, "permissionDecisionReason", n.permissionDecisionReason) : undefined;
      return {
        hookEventName: "PreModelSwitch",
        ...(r && {
          permissionDecision: n.permissionDecision,
        }),
        ...(s !== undefined && {
          permissionDecisionReason: s,
        }),
      };
    }
    case "SessionStart":
      markDroppedField(e, "initialUserMessage", n.initialUserMessage !== undefined);
      markDroppedField(e, "sessionTitle", n.sessionTitle !== undefined);
      return {
        ...additionalContextOutput(e, "SessionStart", n),
        ...(n.watchPaths !== undefined && {
          watchPaths: n.watchPaths,
        }),
        ...(n.reloadSkills === true && {
          reloadSkills: true,
        }),
      };
    case "Setup":
      return additionalContextOutput(e, "Setup", n);
    case "PostModelSwitch":
      return additionalContextOutput(e, "PostModelSwitch", n);
    case "Notification":
      return additionalContextOutput(e, "Notification", n);
    case "Elicitation":
    case "ElicitationResult": {
      let r = n.action === "decline" || n.action === "cancel";
      markDroppedField(e, "allow", n.action === "accept");
      markDroppedField(e, "content", n.content !== undefined);
      return {
        hookEventName: n.hookEventName,
        ...(r && {
          action: n.action,
        }),
      };
    }
    case "CwdChanged":
    case "FileChanged":
      return {
        hookEventName: n.hookEventName,
        ...(n.watchPaths !== undefined && {
          watchPaths: n.watchPaths,
        }),
      };
    default:
      return refuseUnsupportedHookEvent(e);
  }
}
//@ chunk-s61vbvea.js:316104-317233 placement
function parseHookJsonOutput(e, n, r = {}) {
  let s = {
    report: {
      dropped: [],
      truncated: [],
    },
    options: r,
  };
  if ("async" in e) {
    markDroppedField(s, "async", true);
    return {
      answer: {},
      report: s.report,
    };
  }
  let h = e;
  markDroppedField(s, "approve", h.decision === "approve");
  markDroppedField(s, "reason", h.decision === "approve" && h.reason !== undefined);
  let y = r.personal === true;
  markDroppedField(s, "terminalSequence", !y && h.terminalSequence !== undefined);
  markDroppedField(s, "metrics", h.metrics !== undefined);
  markDroppedField(s, "rewakeSummary", h.rewakeSummary !== undefined);
  let S = clipHookTextField(s, "stopReason", h.stopReason);
  let w = h.decision === "approve" ? undefined : clipHookTextField(s, "reason", h.reason);
  let R = clipHookTextField(s, "systemMessage", h.systemMessage);
  let hookSpecificOutput = h.hookSpecificOutput;
  let P =
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    !Array.isArray(hookSpecificOutput);
  markDroppedField(s, "hookSpecificOutput_not_object", hookSpecificOutput !== undefined && !P);
  let j = P ? parsePreToolUseOutput(s, hookSpecificOutput, n) : undefined;
  let G = s.wordsReplaced
    ? [
        R,
        r.toolName === ASKUSERQUESTION ? ANSWER_CHANGE_REFUSED_TEXT : SLACK_MESSAGE_CHANGE_REFUSED_TEXT,
      ].filter((L) => L !== undefined).join(`
`)
    : R;
  return {
    answer: {
      ...(h.continue === false && {
        continue: false,
      }),
      ...(y &&
        h.terminalSequence !== undefined && {
          terminalSequence: h.terminalSequence,
        }),
      ...(h.suppressOutput === true && {
        suppressOutput: true,
      }),
      ...(S !== undefined && {
        stopReason: S,
      }),
      ...(h.decision === "block" && {
        decision: "block",
      }),
      ...(G !== undefined && {
        systemMessage: G,
      }),
      ...(w !== undefined && {
        reason: w,
      }),
      ...(j !== undefined && {
        hookSpecificOutput: j,
      }),
    },
    report: s.report,
  };
}
//@ chunk-s61vbvea.js:317233-317538 placement
/**
 * 判断 hook 输出是否要求阻止（decision 为 block、continue 为 false 或权限 deny）。
 */
function isBlockingHookOutput(e) {
  if ("decision" in e && e.decision === "block") return true;
  if ("continue" in e && e.continue === false) return true;
  let hookSpecificOutput = "hookSpecificOutput" in e ? e.hookSpecificOutput : undefined;
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
function isDenyingHookOutput(e) {
  if ("decision" in e && e.decision === "block") return true;
  let hookSpecificOutput = "hookSpecificOutput" in e ? e.hookSpecificOutput : undefined;
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
