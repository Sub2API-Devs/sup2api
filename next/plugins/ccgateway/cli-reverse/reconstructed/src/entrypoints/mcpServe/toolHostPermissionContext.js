/**
 * entrypoints/mcpServe/toolHostPermissionContext.ts
 *
 * 2.1.316 新增：工具宿主权限上下文的结构、询问描述与设置文件写入判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aw801t9e.js (2), chunk-fb9qe48t.js (38)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../../utils/sanitization.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  zodStrictObject,
  _enum,
  discriminatedUnion,
  literal,
  booleanSchema,
  array,
  union,
  tuple,
  objectSchema,
  numberSchema,
  undefinedSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isEscapableRuleChar,
  permissionRuleValueFromString,
} from "../../utils/permissions/permissionRuleParser.js";
import { patternWithRootFor } from "../../utils/permissions/filesystem.js";
import { parseShellPermissionRule } from "../../tools/PowerShellTool/powershellPermissions.js";
import { normalizeProgramBasename } from "../../tools/BashTool/inlineShellAnalysis.js";
import { SHELL_PROGRAM_NAMES } from "../../utils/bash/ast.js";
import { startsWithBareShell } from "../../tools/BashTool/bashPermissions.js";
import {
  SERIALIZABLE_RULE_SOURCES,
  MAX_DIRECTORY_PATH_LENGTH,
  absolutePathSchema,
} from "../../utils/permissions/permissionContextSerialization.js";
import { asShownOnACard, toPermissionQuestionReason, collectSafetyReasons } from "./plainCallAsk.js";
import {
  PERMISSION_MODES,
  PERMISSION_DECISION_REASON_TYPES,
  isClassifierRoutedCircuitBreaker,
  isAutoModeDenyCircuitBreaker,
  isHostPersonOnlyCircuitBreaker,
} from "../../types/permissions.js";
import { askDigestSchema } from "../../services/mcpServe/callClaims.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import {
  isPlanModeFloorReason,
  PERMISSION_CHECK_CRASHED_REASON,
  carriesAskRuleIntent,
  createPermissionRequestMessage,
  findSafetyCheckReason,
} from "../../utils/permissions/permissions.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { computeContentHash, SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  shouldBypassAskForReadOnly,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
} from "../../tools/BashTool/readOnlyShellCheck.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aw801t9e.js:2145-2213 placement
var ANTHROPIC_SHELLDIRECTORY = "anthropic/shellDirectory";
var ANTHROPIC_SHELLDIRECTORYHELD = "anthropic/shellDirectoryHeld";
//@ chunk-aw801t9e.js:2213-2270 placement
function withShellDirectoryMeta(result, directory) {
  return {
    ...result,
    _meta: {
      ...result._meta,
      [ANTHROPIC_SHELLDIRECTORY]: directory,
    },
  };
}
//@ chunk-fb9qe48t.js:16617-16772 placement
var ANTHROPIC_TOOLHOSTPERMISSIONDECISION; // deferred: uses INVISIBLE_CHAR_CLASSES (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REASON_CHARS;
var MAX_RULE_CHARS;
var MAX_RULES_PER_TOOL;
var MAX_REASONS_PER_DECISION;
var MAX_PERMISSION_REASONS;
var MAX_PATH_CHARS;
var regExp;
var PATH_KEYS;
deferInit("chunk-fb9qe48t.js:16617", () => {
  ANTHROPIC_TOOLHOSTPERMISSIONDECISION = "anthropic/toolHostPermissionDecision";
  MAX_REASON_CHARS = 2000;
  MAX_RULE_CHARS = 1024;
  MAX_RULES_PER_TOOL = 128;
  MAX_REASONS_PER_DECISION = 32;
  MAX_PERMISSION_REASONS = 32;
  MAX_PATH_CHARS = 64;
  regExp = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}<>]|(?! )\\p{Zs}`, "u");
  PATH_KEYS = new Set([READ, EDIT, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
});
//@ chunk-fb9qe48t.js:16772-16800 placement
function isBashToolName(toolName) {
  return toolName === BASH_TOOL_NAME;
}
//@ chunk-fb9qe48t.js:16800-16824 placement
var ReasonSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fb9qe48t.js:16800", () => {
  ReasonSchema = DoctorLazy(() => stringSchema().max(MAX_REASON_CHARS));
});
//@ chunk-fb9qe48t.js:16824-16869 placement
function stripTierSuffix(tier) {
  return tier.replace(/\\[^]/g, "");
}
//@ chunk-fb9qe48t.js:16869-17011 placement
function hasOnlySafeEscapes(pattern) {
  return [...pattern.matchAll(/\\([^]?)(?=([^]?))/g)].every(
    ([, escaped = "", next = ""]) =>
      isEscapableRuleChar(escaped) && !"*?!#".includes(escaped) && !(escaped === "\\" && /^[.{]$/.test(next)),
  );
}
//@ chunk-fb9qe48t.js:17011-17224 placement
function isNarrowPathPattern(relativePattern) {
  let mapped = relativePattern.split("/").map(stripTierSuffix);
  let index = mapped.findIndex((segment) => /[*?[\]]/.test(segment));
  return (
    !/[|()+^$]/.test(stripTierSuffix(relativePattern)) &&
    !mapped.includes("..") &&
    hasOnlySafeEscapes(relativePattern) &&
    /\/[^/]/.test(relativePattern) &&
    mapped.slice(0, index === -1 ? undefined : index).some((segment) => /[^\s.~\\]/.test(segment))
  );
}
//@ chunk-fb9qe48t.js:17224-17346 placement
function isNarrowPathRule(ruleContent) {
  return isNarrowPathPattern(
    patternWithRootFor(ruleContent.replace(/^(?:[/\\]{2}[a-z](?=\s*(?:[/\\]|$))|[a-z]:(?=[/\\]))/i, "/"), "/")
      .relativePattern,
  );
}
//@ chunk-fb9qe48t.js:17346-17571 placement (2.1.88 match: filterRulesByContentsMatchingInput, 0.825)
/**
 * 规则的首个命令词是否可以被收窄（不是裸 shell/包装命令，也不属于特殊集合）。
 */
function filterRulesByContentsMatchingInput(ruleContent) {
  let inputCmdName = parseShellPermissionRule(ruleContent);
  let commandText =
    inputCmdName.type === "exact"
      ? `${inputCmdName.command} `
      : inputCmdName.type === "prefix"
        ? `${inputCmdName.prefix} `
        : /^((?:[^\\*]|\\[^])*)\*\s*$/.exec(inputCmdName.pattern)?.[1];
  let inputCanonical = normalizeProgramBasename(/^\s*([\w./+-]+)\s/.exec(commandText ?? "")?.[1]);
  return (
    inputCanonical !== "" && !SHELL_PROGRAM_NAMES.has(inputCanonical) && !startsWithBareShell(inputCanonical)
  );
}
//@ chunk-fb9qe48t.js:17571-17815 placement
var toolHostAllowRuleSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fb9qe48t.js:17571", () => {
  toolHostAllowRuleSchema = DoctorLazy(() =>
    zodStrictObject({
      tool_name: stringSchema()
        .min(1)
        .max(MAX_RULES_PER_TOOL)
        .refine((toolName) => isBashToolName(toolName) || PATH_KEYS.has(toolName)),
      rule_content: stringSchema()
        .min(1)
        .max(MAX_RULE_CHARS, {
          abort: true,
        })
        .refine((ruleContent) => !/^[\s*]+$/.test(ruleContent) && !regExp.test(ruleContent), {
          abort: true,
        }),
    }).refine((rule) =>
      isBashToolName(rule.tool_name)
        ? filterRulesByContentsMatchingInput(rule.rule_content)
        : isNarrowPathRule(rule.rule_content),
    ),
  );
});
//@ chunk-fb9qe48t.js:17815-19116 placement
/**
 * ToolHost 权限上下文 / 决策原因的 zod 模式集合（anthropic/toolHostPermissionDecision 元数据）。
 */
var TOOL_HOST_PERMISSION_SCHEMAS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RuleUpdateSchema;
var PathSchema;
var TrimmedReasonSchema;
var ModeReasonSchema;
var RuleReasonSchema;
var ReasonListSchema;
var PermissionSummaryReasonSchema;
var HostPermissionKindSchema;
deferInit("chunk-fb9qe48t.js:17815", () => {
  TOOL_HOST_PERMISSION_SCHEMAS = DoctorLazy(() =>
    stringSchema()
      .min(1)
      .max(MAX_RULE_CHARS)
      .refine((rule) => !regExp.test(rule)),
  );
  RuleUpdateSchema = DoctorLazy(() =>
    zodStrictObject({
      source: _enum(SERIALIZABLE_RULE_SOURCES),
      rule: TOOL_HOST_PERMISSION_SCHEMAS().optional(),
    }),
  );
  PathSchema = DoctorLazy(() =>
    stringSchema()
      .max(MAX_PATH_CHARS)
      .refine((path) => !regExp.test(path)),
  );
  TrimmedReasonSchema = DoctorLazy(() =>
    ReasonSchema()
      .min(1)
      .refine((reason) => asShownOnACard(reason) === reason),
  );
  ModeReasonSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      zodStrictObject({
        type: literal("mode"),
        reason: TrimmedReasonSchema(),
        mode: literal("plan"),
      }),
      zodStrictObject({
        type: literal("raisedAllow"),
        reason: TrimmedReasonSchema(),
        is_read_only_command: literal(true).optional(),
      }),
    ]),
  );
  RuleReasonSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      zodStrictObject({
        type: literal("rule"),
        reason: TrimmedReasonSchema(),
        source: _enum(SERIALIZABLE_RULE_SOURCES),
        rule: TOOL_HOST_PERMISSION_SCHEMAS().optional(),
      }),
      zodStrictObject({
        type: literal("safetyCheck"),
        reason: TrimmedReasonSchema(),
        classifier_approvable: booleanSchema(),
        circuit_breaker: PathSchema().optional(),
        also: array(PathSchema()).max(MAX_PERMISSION_REASONS).optional(),
      }),
      zodStrictObject({
        type: _enum(["workingDir", "other"]),
        reason: TrimmedReasonSchema(),
        classifier_approvable: booleanSchema(),
      }),
    ]),
  );
  ReasonListSchema = DoctorLazy(() =>
    union([
      tuple([ModeReasonSchema()]),
      tuple([RuleReasonSchema()], RuleReasonSchema()).refine(
        (reasons) => reasons.length <= MAX_PERMISSION_REASONS,
      ),
    ]),
  );
  PermissionSummaryReasonSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      zodStrictObject({
        type: literal("rule"),
        source: _enum(SERIALIZABLE_RULE_SOURCES),
        behavior: _enum(["deny", "ask"]),
        rule: ReasonSchema().min(1).max(MAX_RULE_CHARS),
      }),
      zodStrictObject({
        type: literal("mode"),
        mode: _enum(PERMISSION_MODES),
      }),
      zodStrictObject({
        type: literal("other"),
        name: _enum(PERMISSION_DECISION_REASON_TYPES),
        description: ReasonSchema().optional(),
      }),
    ]),
  );
  HostPermissionKindSchema = DoctorLazy(() =>
    discriminatedUnion("kind", [
      zodStrictObject({
        kind: literal("invalid"),
        message: ReasonSchema(),
        denied_by_rule: literal(true).optional(),
      }),
      zodStrictObject({
        kind: literal("allow"),
        shell_allow_source: _enum(["read_only", "sandbox"]).optional(),
      }),
      zodStrictObject({
        kind: literal("deny"),
        message: ReasonSchema(),
        reason: PermissionSummaryReasonSchema(),
      }),
      zodStrictObject({
        kind: literal("ask"),
        message: ReasonSchema(),
        ask_digest: askDigestSchema(),
        reasons: ReasonListSchema(),
        matched_ask_rule: RuleUpdateSchema().optional(),
        blocked_path: stringSchema().min(1).max(MAX_DIRECTORY_PATH_LENGTH).optional(),
        suggested_allow_rules: array(toolHostAllowRuleSchema()).max(MAX_REASONS_PER_DECISION),
      }),
    ]),
  );
});
//@ chunk-fb9qe48t.js:19116-19150 placement
function truncateReason(message) {
  return clipText(asShownOnACard(message), MAX_REASON_CHARS);
}
//@ chunk-fb9qe48t.js:19150-19283 placement
function formatDecisionMessage({ message, denied_by_rule: deniedByRule }) {
  return deniedByRule === true
    ? truncateReason(message)
    : clipText(
        message
          .split(/([\n\t])/)
          .map((piece) =>
            piece ===
              `
` || piece === "\t"
              ? piece
              : asShownOnACard(piece),
          )
          .join(""),
        MAX_REASON_CHARS,
      );
}
//@ chunk-fb9qe48t.js:19283-19828 placement (2.1.88 match: serializeDecisionReason, 0.933)
/**
 * 把权限决定原因序列化成 SDK 线格式（rule/mode/classifier/hook/workingDir…）。
 */
function serializeDecisionReason(reason) {
  switch (reason.type) {
    case "rule": {
      let serialized = PermissionSummaryReasonSchema().safeParse({
        type: "rule",
        source: reason.rule.source,
        behavior: reason.rule.ruleBehavior,
        rule: permissionRuleValueFromString(reason.rule.ruleValue),
      });
      return serialized.success
        ? serialized.data
        : {
            type: "other",
            name: "rule",
          };
    }
    case "mode":
      return {
        type: "mode",
        mode: reason.mode,
      };
    case "asyncAgent":
    case "classifier":
    case "workingDir":
    case "safetyCheck":
    case "other":
    case "hook":
      return {
        type: "other",
        name: reason.type,
        ...(reason.reason !== undefined && {
          description: truncateReason(reason.reason),
        }),
      };
    case "subcommandResults":
    case "permissionPromptTool":
    case "sandboxOverride":
      return {
        type: "other",
        name: reason.type,
      };
    default:
      return reason;
  }
}
//@ chunk-fb9qe48t.js:19828-19966 placement (2.1.88 match: hasBashPermission, 0.814)
function askRuleFromRule(rules) {
  if (rules?.ruleBehavior !== "ask") return;
  let rule = TOOL_HOST_PERMISSION_SCHEMAS().safeParse(permissionRuleValueFromString(rules.ruleValue));
  return {
    source: rules.source,
    ...(rule.success && {
      rule: rule.data,
    }),
  };
}
//@ chunk-fb9qe48t.js:19966-20133 placement
function isRaisedAllowReason(reason) {
  switch (reason.type) {
    case "rule":
    case "mode":
      return false;
    case "raisedAllow":
      return true;
    case "safetyCheck":
    case "workingDir":
    case "other":
      return reason.classifier_approvable;
  }
}
//@ chunk-fb9qe48t.js:20133-20362 placement
function allowRulesFromUpdates(suggestions) {
  return (suggestions ?? [])
    .flatMap((suggestion) =>
      suggestion.type === "addRules" && suggestion.behavior === "allow" ? suggestion.rules : [],
    )
    .flatMap(({ toolName, ruleContent }) => {
      let parsed = toolHostAllowRuleSchema().safeParse({
        tool_name: toolName,
        rule_content: ruleContent,
      });
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, MAX_REASONS_PER_DECISION);
}
//@ chunk-fb9qe48t.js:20362-20396 placement
function toolHostDecisionMeta(decision) {
  return {
    [ANTHROPIC_TOOLHOSTPERMISSIONDECISION]: encodeToolHostDecision(decision),
  };
}
//@ chunk-fb9qe48t.js:20396-20649 placement
function encodeToolHostDecision(decision) {
  switch (decision.kind) {
    case "allow":
      return decision;
    case "invalid":
      return {
        ...decision,
        message: formatDecisionMessage(decision),
      };
    case "deny":
      return {
        ...decision,
        message: truncateReason(decision.message),
      };
    case "ask":
      return {
        ...decision,
        message: truncateReason(decision.message),
        ...(decision.blocked_path !== undefined && {
          blocked_path: clipText(asShownOnACard(decision.blocked_path), MAX_DIRECTORY_PATH_LENGTH),
        }),
      };
  }
}
//@ chunk-fb9qe48t.js:20649-20832 placement
function flattenAskReasons(decisionReason) {
  if (decisionReason?.type === "safetyCheck") return [];
  if (decisionReason?.type === "subcommandResults")
    return [...decisionReason.reasons.values()].flatMap((reason) =>
      reason.behavior === "allow" ? [] : flattenAskReasons(reason.decisionReason),
    );
  return [decisionReason];
}
//@ chunk-fb9qe48t.js:20832-21151 placement (2.1.88 match: serializeDecisionReason, 0.954)
function isAskingDecisionReason(reason) {
  switch (reason?.type) {
    case undefined:
    case "workingDir":
      return false;
    case "rule":
      return reason.rule.ruleBehavior === "ask";
    case "mode":
      return isPlanModeFloorReason(reason);
    case "other":
      return reason.reason === PERMISSION_CHECK_CRASHED_REASON;
    case "asyncAgent":
    case "classifier":
    case "hook":
    case "permissionPromptTool":
    case "sandboxOverride":
    case "safetyCheck":
    case "subcommandResults":
      return true;
  }
}
//@ chunk-fb9qe48t.js:21151-21329 placement
function isBackgroundOperatorApprovable(safety, context) {
  return (
    context.mode === "auto" &&
    context.classifierMayApprove.includes("background_operator") &&
    safety.circuitBreaker === "backgroundOperator" &&
    (safety.also ?? []).length === 0 &&
    isClassifierRoutedCircuitBreaker(safety) &&
    !isAutoModeDenyCircuitBreaker(safety)
  );
}
//@ chunk-fb9qe48t.js:21329-21423 placement
function isAutoLocalSessionMode(context) {
  return context.mode === "auto" && context.classifierMayApprove.includes("as_in_local_session");
}
//@ chunk-fb9qe48t.js:21423-21475 placement
function isClassifierApprovable(reason) {
  return reason.classifierApprovable || isClassifierRoutedCircuitBreaker(reason);
}
//@ chunk-fb9qe48t.js:21475-21592 placement
function safetyCheckAskReason(safetyReason, askIntent, context) {
  let isAutoLocal = isAutoLocalSessionMode(context);
  return {
    type: "safetyCheck",
    ...toPermissionQuestionReason(
      safetyReason,
      !askIntent &&
        (isAutoLocal
          ? isClassifierApprovable(safetyReason)
          : safetyReason.classifierApprovable || isBackgroundOperatorApprovable(safetyReason, context)),
      !isAutoLocal,
    ),
  };
}
//@ chunk-fb9qe48t.js:21592-21875 placement
function askRuleForDecision(reason, reasons, classifierApprovable) {
  let [first, ...rest] = reasons;
  let chosen =
    rest.length === 0
      ? first
      : reasons.find((reason) => reason?.type === "rule" && reason.rule.ruleBehavior === "ask");
  let askRule = chosen?.type === "rule" ? askRuleFromRule(chosen.rule) : undefined;
  if (askRule !== undefined)
    return {
      type: "rule",
      reason,
      ...askRule,
    };
  return {
    type: chosen?.type === "workingDir" ? "workingDir" : "other",
    reason,
    classifier_approvable: classifierApprovable,
  };
}
//@ chunk-fb9qe48t.js:21875-21934 placement
function isPlanModeWrite(tool, input, mode, toolUseContext) {
  return mode === "plan" && !tool.isReadOnly(input, toolUseContext);
}
//@ chunk-fb9qe48t.js:21934-22000 placement
function reasonsIfValid(reasons) {
  return reasons.every(({ reason }) => reason.length <= MAX_REASON_CHARS) ? reasons : undefined;
}
//@ chunk-fb9qe48t.js:22000-22670 placement
function describeToolHostAsk(tool, input, result, askContext, toolUseContext) {
  let safetyReasons = collectSafetyReasons(result.decisionReason);
  let askReasons = flattenAskReasons(result.decisionReason);
  let askIntent =
    carriesAskRuleIntent(result) ||
    tool.requiresUserInteraction?.() === true ||
    isPlanModeWrite(tool, input, askContext.mode, toolUseContext);
  let messageText = asShownOnACard(
    result.message || createPermissionRequestMessage(tool.name, result.decisionReason),
  );
  let reason =
    result.decisionReason?.type === "subcommandResults"
      ? clipText(messageText, MAX_REASON_CHARS)
      : messageText;
  let singleReason = safetyReasons.length === 0 && askReasons.length === 1 ? askReasons[0] : undefined;
  if (isPlanModeFloorReason(singleReason))
    return reasonsIfValid([
      {
        type: "mode",
        reason,
        mode: "plan",
      },
    ]);
  if (
    !askIntent &&
    result.decisionReason?.type === "other" &&
    result.decisionReason.reroutedFrom !== undefined
  )
    return reasonsIfValid([
      {
        type: "raisedAllow",
        reason,
        ...(isBashToolName(tool.name) &&
          tool.isReadOnly(input, toolUseContext) && {
            is_read_only_command: true,
          }),
      },
    ]);
  let [firstReason, ...restReasons] = [
    ...safetyReasons.map((safetyReason) => safetyCheckAskReason(safetyReason, askIntent, askContext)),
    ...(safetyReasons.length === 0 || askReasons.length > 0 || askIntent
      ? [askRuleForDecision(reason, askReasons, !askIntent && !askReasons.some(isAskingDecisionReason))]
      : []),
  ];
  return firstReason === undefined || restReasons.length >= MAX_PERMISSION_REASONS
    ? undefined
    : reasonsIfValid([firstReason, ...restReasons]);
}
//@ chunk-fb9qe48t.js:22670-22848 placement
function offersAlwaysAllow(ask) {
  return (
    shouldShowAlwaysAllowOptions() &&
    ask.suggestions?.some((suggestion) => suggestion.type === "addRules") === true &&
    ask.suppressAlwaysAllowRule !== true &&
    findSafetyCheckReason(
      ask.decisionReason,
      (safety) => !safety.classifierApprovable || isHostPersonOnlyCircuitBreaker(safety),
    ) === undefined
  );
}
//@ chunk-fb9qe48t.js:22848-22954 placement
function sortedObjectKeys(key, value) {
  return isPlainObject(value)
    ? Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : value;
}
//@ chunk-fb9qe48t.js:22954-22988 placement
function settingsFileContentHash(payload) {
  return computeContentHash(jsonStringify(payload, sortedObjectKeys));
}
//@ chunk-fb9qe48t.js:22988-23071 placement
var ANTHROPIC_MOVESATTIMEOUT; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CONTEXT_VERSION_ONE;
var ContextVersionSchema;
deferInit("chunk-fb9qe48t.js:22988", () => {
  ANTHROPIC_MOVESATTIMEOUT = "anthropic/movesAtTimeout";
  CONTEXT_VERSION_ONE = {
    [ANTHROPIC_MOVESATTIMEOUT]: {
      v: 1,
    },
  };
  ContextVersionSchema = DoctorLazy(() =>
    objectSchema({
      [ANTHROPIC_MOVESATTIMEOUT]: zodStrictObject({
        v: literal(1),
      }),
    }),
  );
});
//@ chunk-fb9qe48t.js:23071-23119 placement
function isValidSettingsFileIdentity(meta) {
  return ContextVersionSchema().safeParse(meta).success;
}
//@ chunk-fb9qe48t.js:23119-23635 placement
async function judgeSettingsFileWrite(tool, input, result, cwd, classifierMayApprove, toolUseContext) {
  if (findSafetyCheckReason(result.decisionReason, isHostPersonOnlyCircuitBreaker) !== undefined)
    return findSafetyCheckReason(
      result.decisionReason,
      (safety) =>
        safety.circuitBreaker === "claudeSettingsFile" ||
        safety.also?.includes("claudeSettingsFile") === true,
    ) !== undefined
      ? "tagged_by_path_check"
      : "tagged_by_another_check";
  switch (await shouldBypassAskForReadOnly(tool, input, result, cwd)) {
    case "settings":
      return "proven";
    case "none":
      return (await servedLineTouchesProtectedPath(tool, input, toolUseContext))
        ? "names_settings"
        : undefined;
    case "uncertain":
      if (
        touchesProtectedPath(input, "file_or_folder") ||
        (await servedLineTouchesProtectedPath(tool, input, toolUseContext))
      )
        return "uncertain_names_settings";
      return classifierMayApprove.includes("unresolved_shell_write") ? undefined : "uncertain";
  }
}
//@ chunk-fb9qe48t.js:23635-24020 placement
function settingsFileWriteReason(result, verb) {
  let message = `This command ${verb} to one of Claude Code's own settings files.`;
  return {
    ...result,
    decisionReason: {
      type: "subcommandResults",
      reasons: new Map([
        [
          "settings",
          {
            behavior: "ask",
            message,
            decisionReason: {
              type: "safetyCheck",
              reason: message,
              classifierApprovable: true,
              circuitBreaker: "claudeSettingsFile",
            },
          },
        ],
        [
          "command",
          {
            behavior: "ask",
            message: result.message,
            decisionReason: result.decisionReason,
          },
        ],
      ]),
    },
  };
}
//@ chunk-fb9qe48t.js:24020-24393 placement
async function resolveToolHostAsk(tool, input, result, cwd, askContext, toolUseContext) {
  let suspicionReason = await judgeSettingsFileWrite(
    tool,
    input,
    result,
    cwd,
    askContext.classifierMayApprove,
    toolUseContext,
  );
  if (suspicionReason === undefined)
    return {
      ask: result,
    };
  if (isAutoLocalSessionMode(askContext)) {
    let personOnly =
      findSafetyCheckReason(
        result.decisionReason,
        (safety) => isHostPersonOnlyCircuitBreaker(safety) && !isClassifierApprovable(safety),
      ) !== undefined;
    return {
      ask: result,
      suspicion: {
        reason: suspicionReason,
        isHoldLifted: !personOnly,
      },
    };
  }
  return {
    ask:
      suspicionReason === "tagged_by_path_check" || suspicionReason === "tagged_by_another_check"
        ? result
        : settingsFileWriteReason(result, suspicionReason === "proven" ? "writes" : "may write"),
    suspicion: {
      reason: suspicionReason,
      isHoldLifted: false,
    },
  };
}
//@ chunk-fb9qe48t.js:24393-24489 placement
function withChangeWithoutReadEntry(result) {
  return {
    ...result,
    _meta: {
      ...result._meta,
      ["anthropic/changeWithoutReadFileStateEntry"]: true,
    },
  };
}
//@ chunk-fb9qe48t.js:24523-24872 placement
var READ_FILE_STATE_META; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REFS;
var PathRefSchema;
var FileRefSchema;
deferInit("chunk-fb9qe48t.js:24523", () => {
  READ_FILE_STATE_META = "anthropic/readFileStateChanges";
  MAX_REFS = 64;
  PathRefSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema().pipe(absolutePathSchema()),
    }),
  );
  FileRefSchema = DoctorLazy(() =>
    union([
      PathRefSchema().extend({
        sha256: stringSchema().regex(SHA256_HEX_RE),
        bytes: numberSchema().int().nonnegative(),
        content_not_in_model_context: literal(true).optional(),
        is_partial_view: undefinedSchema().optional(),
      }),
      PathRefSchema().extend({
        is_partial_view: literal(true),
      }),
      PathRefSchema().extend({
        sha256: undefinedSchema().optional(),
        is_partial_view: undefinedSchema().optional(),
      }),
    ]),
  );
});
export {
  ANTHROPIC_SHELLDIRECTORYHELD,
  MAX_REFS,
  READ_FILE_STATE_META,
  withShellDirectoryMeta,
  isValidSettingsFileIdentity,
  serializeDecisionReason,
  isBashToolName,
  resolveToolHostAsk,
  describeToolHostAsk,
  askRuleFromRule,
  settingsFileContentHash,
  offersAlwaysAllow,
  allowRulesFromUpdates,
  isPlanModeWrite,
  isRaisedAllowReason,
  withChangeWithoutReadEntry,
  toolHostDecisionMeta,
};
