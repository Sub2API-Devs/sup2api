/**
 * entrypoints/mcpServe/toolHostPermissionContext.ts
 *
 * 2.1.316 新增：工具宿主权限上下文的结构、询问描述与设置文件写入判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz36xfxg.js (40)
 * attribution: placement 40
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../../utils/sanitization.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
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
import { isEscapableRuleChar } from "../../utils/permissions/permissionRuleParser.js";
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
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
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

//@ chunk-dz36xfxg.js:15108-15142 placement
var ANTHROPIC_SHELLDIRECTORY = "anthropic/shellDirectory";
//@ chunk-dz36xfxg.js:15142-15198 placement
function withShellDirectoryMeta(result, directory) {
  return {
    ...result,
    _meta: {
      ...result._meta,
      [ANTHROPIC_SHELLDIRECTORY]: directory,
    },
  };
}
//@ chunk-dz36xfxg.js:15198-15353 placement
var ANTHROPIC_TOOLHOSTPERMISSIONDECISION = "anthropic/toolHostPermissionDecision";
var MAX_REASON_CHARS = 2000;
var MAX_RULE_CHARS = 1024;
var MAX_RULES_PER_TOOL = 128;
var MAX_REASONS_PER_DECISION = 32;
var MAX_PERMISSION_REASONS = 32;
var MAX_PATH_CHARS = 64;
var regExp = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}<>]|(?! )\\p{Zs}`, "u");
var PATH_KEYS = new Set([
  FILE_READ_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
]);
//@ chunk-dz36xfxg.js:15353-15381 placement
function isBashToolName(toolName) {
  return toolName === BASH_TOOL_NAME;
}
//@ chunk-dz36xfxg.js:15381-15405 placement
var ReasonSchema = DoctorLazy(() => stringSchema().max(MAX_REASON_CHARS));
//@ chunk-dz36xfxg.js:15405-15450 placement
function stripTierSuffix(tier) {
  return tier.replace(/\\[^]/g, "");
}
//@ chunk-dz36xfxg.js:15450-15592 placement
function hasOnlySafeEscapes(pattern) {
  return [...pattern.matchAll(/\\([^]?)(?=([^]?))/g)].every(
    ([, escaped = "", next = ""]) =>
      isEscapableRuleChar(escaped) && !"*?!#".includes(escaped) && !(escaped === "\\" && /^[.{]$/.test(next)),
  );
}
//@ chunk-dz36xfxg.js:15592-15805 placement
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
//@ chunk-dz36xfxg.js:15805-15927 placement
function isNarrowPathRule(ruleContent) {
  return isNarrowPathPattern(
    patternWithRootFor(ruleContent.replace(/^(?:[/\\]{2}[a-z](?=\s*(?:[/\\]|$))|[a-z]:(?=[/\\]))/i, "/"), "/")
      .relativePattern,
  );
}
//@ chunk-dz36xfxg.js:15927-16152 placement (2.1.88 match: filterRulesByContentsMatchingInput, 0.822)
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
//@ chunk-dz36xfxg.js:16152-16396 placement
var toolHostAllowRuleSchema = DoctorLazy(() =>
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
//@ chunk-dz36xfxg.js:16396-17697 placement
/**
 * ToolHost 权限上下文 / 决策原因的 zod 模式集合（anthropic/toolHostPermissionDecision 元数据）。
 */
var TOOL_HOST_PERMISSION_SCHEMAS = DoctorLazy(() =>
  stringSchema()
    .min(1)
    .max(MAX_RULE_CHARS)
    .refine((rule) => !regExp.test(rule)),
);
var RuleUpdateSchema = DoctorLazy(() =>
  zodStrictObject({
    source: _enum(SERIALIZABLE_RULE_SOURCES),
    rule: TOOL_HOST_PERMISSION_SCHEMAS().optional(),
  }),
);
var PathSchema = DoctorLazy(() =>
  stringSchema()
    .max(MAX_PATH_CHARS)
    .refine((path) => !regExp.test(path)),
);
var TrimmedReasonSchema = DoctorLazy(() =>
  ReasonSchema()
    .min(1)
    .refine((reason) => asShownOnACard(reason) === reason),
);
var ModeReasonSchema = DoctorLazy(() =>
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
var RuleReasonSchema = DoctorLazy(() =>
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
var ReasonListSchema = DoctorLazy(() =>
  union([
    tuple([ModeReasonSchema()]),
    tuple([RuleReasonSchema()], RuleReasonSchema()).refine(
      (reasons) => reasons.length <= MAX_PERMISSION_REASONS,
    ),
  ]),
);
var PermissionSummaryReasonSchema = DoctorLazy(() =>
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
var HostPermissionKindSchema = DoctorLazy(() =>
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
//@ chunk-dz36xfxg.js:17697-17731 placement
function truncateReason(message) {
  return clipText(asShownOnACard(message), MAX_REASON_CHARS);
}
//@ chunk-dz36xfxg.js:17731-17864 placement
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
//@ chunk-dz36xfxg.js:17864-18409 placement (2.1.88 match: serializeDecisionReason, 0.933)
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
        rule: formatPermissionRule(reason.rule.ruleValue),
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
//@ chunk-dz36xfxg.js:18409-18547 placement (2.1.88 match: hasBashPermission, 0.813)
function askRuleFromRule(rules) {
  if (rules?.ruleBehavior !== "ask") return;
  let rule = TOOL_HOST_PERMISSION_SCHEMAS().safeParse(formatPermissionRule(rules.ruleValue));
  return {
    source: rules.source,
    ...(rule.success && {
      rule: rule.data,
    }),
  };
}
//@ chunk-dz36xfxg.js:18547-18714 placement
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
//@ chunk-dz36xfxg.js:18714-18943 placement
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
//@ chunk-dz36xfxg.js:18943-18977 placement
function toolHostDecisionMeta(decision) {
  return {
    [ANTHROPIC_TOOLHOSTPERMISSIONDECISION]: encodeToolHostDecision(decision),
  };
}
//@ chunk-dz36xfxg.js:18977-19230 placement
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
//@ chunk-dz36xfxg.js:19230-19413 placement
function flattenAskReasons(decisionReason) {
  if (decisionReason?.type === "safetyCheck") return [];
  if (decisionReason?.type === "subcommandResults")
    return [...decisionReason.reasons.values()].flatMap((reason) =>
      reason.behavior === "allow" ? [] : flattenAskReasons(reason.decisionReason),
    );
  return [decisionReason];
}
//@ chunk-dz36xfxg.js:19413-19732 placement (2.1.88 match: serializeDecisionReason, 0.954)
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
//@ chunk-dz36xfxg.js:19732-19910 placement
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
//@ chunk-dz36xfxg.js:19910-20004 placement
function isAutoLocalSessionMode(context) {
  return context.mode === "auto" && context.classifierMayApprove.includes("as_in_local_session");
}
//@ chunk-dz36xfxg.js:20004-20056 placement
function isClassifierApprovable(reason) {
  return reason.classifierApprovable || isClassifierRoutedCircuitBreaker(reason);
}
//@ chunk-dz36xfxg.js:20056-20173 placement
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
//@ chunk-dz36xfxg.js:20173-20456 placement
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
//@ chunk-dz36xfxg.js:20456-20515 placement
function isPlanModeWrite(tool, input, mode, toolUseContext) {
  return mode === "plan" && !tool.isReadOnly(input, toolUseContext);
}
//@ chunk-dz36xfxg.js:20515-20581 placement
function reasonsIfValid(reasons) {
  return reasons.every(({ reason }) => reason.length <= MAX_REASON_CHARS) ? reasons : undefined;
}
//@ chunk-dz36xfxg.js:20581-21251 placement
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
//@ chunk-dz36xfxg.js:21251-21429 placement
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
//@ chunk-dz36xfxg.js:21429-21535 placement
function sortedObjectKeys(key, value) {
  return isPlainObject(value)
    ? Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : value;
}
//@ chunk-dz36xfxg.js:21535-21569 placement
function settingsFileContentHash(payload) {
  return computeContentHash(jsonStringify(payload, sortedObjectKeys));
}
//@ chunk-dz36xfxg.js:21569-21652 placement
var ANTHROPIC_MOVESATTIMEOUT = "anthropic/movesAtTimeout";
var CONTEXT_VERSION_ONE = {
  [ANTHROPIC_MOVESATTIMEOUT]: {
    v: 1,
  },
};
var ContextVersionSchema = DoctorLazy(() =>
  objectSchema({
    [ANTHROPIC_MOVESATTIMEOUT]: zodStrictObject({
      v: literal(1),
    }),
  }),
);
//@ chunk-dz36xfxg.js:21652-21700 placement
function isValidSettingsFileIdentity(meta) {
  return ContextVersionSchema().safeParse(meta).success;
}
//@ chunk-dz36xfxg.js:21700-22199 placement
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
      if (touchesProtectedPath(input, "file_or_folder")) return "uncertain_names_settings";
      return classifierMayApprove.includes("unresolved_shell_write") ? undefined : "uncertain";
  }
}
//@ chunk-dz36xfxg.js:22199-22584 placement
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
//@ chunk-dz36xfxg.js:22584-22957 placement
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
//@ chunk-dz36xfxg.js:22957-23053 placement
function withChangeWithoutReadEntry(result) {
  return {
    ...result,
    _meta: {
      ...result._meta,
      ["anthropic/changeWithoutReadFileStateEntry"]: true,
    },
  };
}
//@ chunk-dz36xfxg.js:23087-23436 placement
var READ_FILE_STATE_META = "anthropic/readFileStateChanges";
var MAX_REFS = 64;
var PathRefSchema = DoctorLazy(() =>
  objectSchema({
    path: stringSchema().pipe(absolutePathSchema()),
  }),
);
var FileRefSchema = DoctorLazy(() =>
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
export {
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
