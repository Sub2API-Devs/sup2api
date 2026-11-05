/**
 * tools/PowerShellTool/powershellPermissions.ts
 *
 * PowerShell 权限主流程：规则匹配（大小写不敏感、别名规范化）、安全检查、git/归档/.git 写入攻击检测、路径约束、只读与 acceptEdits、逐子命令汇总
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/powershellPermissions.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-6zpsr8vx.js (19), chunk-z20c443b.js (2)
 * attribution: affinity 1, callgraph-fingerprint 1, fingerprint 7, layout 11, file-local 2, shared-adjacent 1, placement 1
 */
import { resolve } from "path";
import {
  permissionRuleExtractPrefix,
  hasWildcards,
  makeTextRuleMatcher,
  matchWildcardPattern,
} from "../../utils/permissions/shellRuleMatching.js";
import {
  checkEarlyExitDeny,
  isBashTextRuleSearchOn,
  canParseEscapedSpaceCommand,
  matchingRulesForInput_3,
  findDangerousVariableRemoval,
  checkDangerousRemovals,
  askForDangerousRmOnParseError,
  matchesCommandRule,
  powershellToolCheckExactMatchPermission,
} from "../BashTool/bashPermissions.js";
import {
  context,
  getDenyRuleForAgent,
  getContentRulesMapForTool,
  createPermissionRequestMessage,
  getContentRulesMapForToolName,
  carriesAskRuleIntent,
} from "../../utils/permissions/permissions.js";
import { BashTool } from "../BashTool/BashTool.js";
import { PARSE_ABORTED } from "../../utils/bash/parser.js";
import {
  treeSpansAreIncomplete,
  splitCommand,
  nestedCommandSpansFromAst,
} from "../../utils/bash/commands.js";
import { logEventUnlessSuppressed, checkDangerousRemoval } from "../BashTool/dangerousRemoval.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getCwd } from "../../utils/cwd.js";
import { getDangerousRmTimeoutConfig } from "../BashTool/bashPermissionFlags.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  parsePowerShellCommand,
  getAllCommandNames,
  stripModulePrefix,
  classifyCommandName,
  PS_TOKENIZER_DASH_CHARS,
  getFileRedirections,
  deriveSecurityFlags,
} from "../../utils/powershell/parser.js";
import {
  isHazyPeachFlagOn,
  resolveToCanonical,
  isSafeOutputCommand,
  isCwdChangingCmdlet,
  baseStems,
  commandBaseVariants,
  argLeaksValue,
  isReadOnlyCommand,
  SAFE_POWERSHELL_VERBS,
  hasVariableWritingParam,
  hasNonDefaultActionPreference,
  isProvablySafeStatement,
  isAllowlistedCommand,
} from "./readOnlyValidation.js";
import {
  regExp_4,
  PS_LEADING_WHITESPACE_RE,
  POWERSHELL_WHITESPACE,
  unescapePsDoubleQuoted,
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  skipLeadingWhitespaceAndComments,
} from "./powershellParsing.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  BASH_COMMAND_CLAMP_DENY_REASON,
  BASH_COMMAND_CLAMP_CRASH_REASON,
  outsideReadsTooComplexAsk,
  POWERSHELL_READ_ONLY_ALLOW_REASON,
  isOutsideReadsBlockedAsk,
  POWERSHELL_COMPOUND_READ_ONLY_PART_REASON,
} from "../../types/permissions.js";
import { containsVulnerableUncPath } from "../../utils/shell/readOnlyCommandValidation.js";
import { isDangerousRemovalPath, dangerousRemovalDeny, checkPathConstraints } from "./pathValidation.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import { powershellCommandIsSafe } from "./powershellSecurity.js";
import { getPlatform } from "../../utils/platform.js";
import { isSymlinkCreatingCommand, checkPermissionMode } from "./modeValidation.js";
import { isCurrentDirectoryBareGitRepo } from "../../utils/git.js";
import {
  isGitInternalPathPS,
  splitCommaWords,
  copyMoveMayReachGitInternals,
  isDotGitPathPS,
} from "./gitSafety.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:209643-209790 shared-adjacent (2.1.88 match: filterRulesByContentsMatchingInput, 1)
/**
 * 把规则内容解析成 {type:prefix,prefix} / {type:wildcard,pattern} / {type:exact,command}。
 */
function parseShellPermissionRule(pattern) {
  let inputCmdName = permissionRuleExtractPrefix(pattern);
  if (inputCmdName !== null)
    return {
      type: "prefix",
      prefix: inputCmdName,
    };
  if (hasWildcards(pattern))
    return {
      type: "wildcard",
      pattern,
    };
  return {
    type: "exact",
    command: pattern,
  };
}
//@ chunk-z20c443b.js:209790-209914 placement (2.1.88 match: buildSuggestions, 1)
/**
 * 通用权限建议：localSettings 里为 toolName(ruleContent) 加 allow 规则。PowerShell/Bash 权限请求复用。
 */
function buildToolAllowSuggestion(toolName, ruleContent) {
  return [
    {
      type: "addRules",
      rules: [
        {
          toolName,
          ruleContent,
        },
      ],
      behavior: "allow",
      destination: "localSettings",
    },
  ];
}
//@ chunk-5xgkngpb.js:1194799-1194828 affinity
var TENGU_TENDER_QUILL = "tengu_tender_quill";
//@ chunk-5xgkngpb.js:1194828-1196436 callgraph-fingerprint (2.1.88 match: powershellToolCheckExactMatchPermission, 0.453)
/**
 * AST 过于复杂（too-complex）时的拒绝路径：整命令/各片段的 deny 规则、读封锁、空变量删除、AST 上的危险删除检查；只有精确 allow 规则覆盖整条命令时才返回 allow。
 */
async function checkTooComplexCommandDeny(
  input,
  context_2,
  parsedRoot,
  nodeType,
  isEvalOrSource,
  originalCommand,
  isEvalOrSource_2,
  bareAssignmentNames,
  toolUseContext,
) {
  let earlyDeny = checkEarlyExitDeny(input, context_2);
  if (earlyDeny?.behavior === "deny") return earlyDeny;
  let denyRules = context(context_2, BashTool, "deny");
  let askRules = context(context_2, BashTool, "ask");
  let commandSpans =
    (denyRules.length > 0 || askRules.length > 0) &&
    isBashTextRuleSearchOn() &&
    (!parsedRoot ||
      parsedRoot === PARSE_ABORTED ||
      !canParseEscapedSpaceCommand(input.command, parsedRoot, nodeType) ||
      treeSpansAreIncomplete(parsedRoot))
      ? makeTextRuleMatcher(input.command)
      : undefined;
  let denyRule = commandSpans && getDenyRuleForAgent(commandSpans, denyRules);
  if (denyRule !== undefined) {
    logEventUnlessSuppressed("tengu_bash_rule_found_in_text", {
      behavior: fromEnum("deny"),
    });
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: denyRule,
      },
    };
  }
  if (getContentRulesMapForTool(context_2, BashTool, "deny").size > 0) {
    let candidateCommands = new Set([
      ...splitCommand(input.command),
      ...(parsedRoot && parsedRoot !== PARSE_ABORTED ? nestedCommandSpansFromAst(parsedRoot) : []),
    ]);
    for (let command of candidateCommands) {
      let denyRule = matchingRulesForInput_3(
        {
          ...input,
          command,
        },
        context_2,
        "prefix",
      ).matchingDenyRules[0];
      if (denyRule !== undefined)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
          decisionReason: {
            type: "rule",
            rule: denyRule,
          },
        };
    }
  }
  let denyResult = isEvalOrSource?.();
  if (denyResult) return denyResult;
  let dangerousVariableRemoval = findDangerousVariableRemoval(
    input.command,
    false,
    originalCommand,
    isEvalOrSource_2,
    toolUseContext,
  );
  if (dangerousVariableRemoval !== null) {
    logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
      kind: fromEnum("emptyVariable"),
    });
    return checkDangerousRemoval(dangerousVariableRemoval, false);
  }
  if (parsedRoot && parsedRoot !== PARSE_ABORTED) {
    let removalResult = await checkDangerousRemovals(
      parsedRoot,
      getCwd(),
      context_2,
      originalCommand,
      isEvalOrSource_2,
      bareAssignmentNames,
      toolUseContext,
    );
    if (removalResult !== null) {
      logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
        kind: fromEnum(removalResult.kind),
      });
      return removalResult.result;
    }
  }
  let textRule =
    commandSpans && earlyDeny?.behavior !== "ask" ? getDenyRuleForAgent(commandSpans, askRules) : undefined;
  if (textRule !== undefined) {
    logEventUnlessSuppressed("tengu_bash_rule_found_in_text", {
      behavior: fromEnum("ask"),
    });
    let rule = askForDangerousRmOnParseError(parsedRoot, originalCommand);
    if (rule?.behavior === "ask")
      return getDangerousRmTimeoutConfig().enabled
        ? rule
        : {
            ...rule,
            matchedAskRule: textRule,
          };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: textRule,
      },
    };
  }
  if (earlyDeny === null || earlyDeny.behavior !== "allow") return earlyDeny;
  if (
    (earlyDeny.decisionReason?.type === "rule"
      ? earlyDeny.decisionReason.rule.ruleValue.ruleContent
      : undefined) !== input.command.trim()
  )
    return null;
  if (
    !readFlagWithOverride(TENGU_TENDER_QUILL, {
      safe: true,
    })
  )
    return earlyDeny;
  if (parsedRoot === PARSE_ABORTED) return null;
  return askForDangerousRmOnParseError(parsedRoot, originalCommand) ?? earlyDeny;
}
//@ chunk-5xgkngpb.js:1265844-1266010 fingerprint (2.1.88 match: filterRulesByContentsMatchingInput, 1)
/**
 * 单条已解析规则（prefix/exact/wildcard）是否匹配命令文本。
 */
function matchesShellRule(rule, command) {
  switch (rule.type) {
    case "prefix":
      return command === rule.prefix || command.startsWith(rule.prefix + " ");
    case "exact":
      return command === rule.command;
    case "wildcard":
      return matchesCommandRule(rule.pattern, command);
  }
}
//@ chunk-6zpsr8vx.js:52069-52198 fingerprint (2.1.88 match: GIT_SAFETY_WRITE_CMDLETS, 0.583)
/**
 * 在读封锁下也视为需检查读路径的写类 cmdlet（Copy-Item、Move-Item、Compress/Expand-Archive、Invoke-WebRequest/RestMethod、New-Item）。
 */
var GIT_SAFETY_WRITE_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zpsr8vx.js:52069", () => {
  GIT_SAFETY_WRITE_CMDLETS = new Set([
    "copy-item",
    "move-item",
    "compress-archive",
    "expand-archive",
    "invoke-webrequest",
    "invoke-restmethod",
    "new-item",
  ]);
});
//@ chunk-6zpsr8vx.js:73176-73600 fingerprint (2.1.88 match: GIT_SAFETY_ARCHIVE_EXTRACTORS, 0.646)
/**
 * 会写文件的 cmdlet 集合、归档解压程序集合（tar/unzip/7z/gzip/Expand-Archive）、原生复制程序集合（xcopy/robocopy），用于 git 内部路径与归档攻击检查。
 */
var GIT_SAFETY_WRITE_CMDLETS_ALL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_SAFETY_ARCHIVE_EXTRACTORS;
var NATIVE_FILE_COPIERS;
deferInit("chunk-6zpsr8vx.js:73176", () => {
  GIT_SAFETY_WRITE_CMDLETS_ALL = new Set([
    "new-item",
    "set-content",
    "add-content",
    "out-file",
    "copy-item",
    "move-item",
    "rename-item",
    "expand-archive",
    "invoke-webrequest",
    "invoke-restmethod",
    "tee-object",
    "export-csv",
    "export-clixml",
  ]);
  GIT_SAFETY_ARCHIVE_EXTRACTORS = new Set([
    "tar",
    "tar.exe",
    "bsdtar",
    "bsdtar.exe",
    "unzip",
    "unzip.exe",
    "7z",
    "7z.exe",
    "7za",
    "7za.exe",
    "gzip",
    "gzip.exe",
    "gunzip",
    "gunzip.exe",
    "expand-archive",
  ]);
  NATIVE_FILE_COPIERS = new Set(["xcopy", "xcopy.exe", "robocopy", "robocopy.exe"]);
});
//@ chunk-6zpsr8vx.js:73600-73721 layout
function isNativeFileCopier(element) {
  let lower = element.name.toLowerCase();
  let sliced = lower.slice(Math.max(lower.lastIndexOf("\\"), lower.lastIndexOf("/")) + 1);
  return NATIVE_FILE_COPIERS.has(sliced);
}
//@ chunk-6zpsr8vx.js:73721-73812 file-local
async function extractCommandName(command) {
  let trimmed = command.trim();
  if (!trimmed) return "";
  let parsed = await parsePowerShellCommand(trimmed);
  return getAllCommandNames(parsed)[0] ?? "";
}
//@ chunk-6zpsr8vx.js:73812-73841 layout
function parsePowerShellPermissionRule(ruleContent) {
  return parseShellPermissionRule(ruleContent);
}
//@ chunk-6zpsr8vx.js:73841-74059 layout
function firstCommandTokenLower(command) {
  let hazyPeach = isHazyPeachFlagOn();
  let trimmed = hazyPeach ? command.replace(regExp_4, "") : command.trimStart();
  let firstChar = trimmed[0];
  if (firstChar === '"' || firstChar === "'") {
    let index = trimmed.indexOf(firstChar, 1);
    let tokenEnd = index === -1 ? trimmed.length : index + 1;
    return trimmed.slice(0, tokenEnd).toLowerCase();
  }
  return (trimmed.split(hazyPeach ? PS_LEADING_WHITESPACE_RE : /\s+/)[0] ?? "").toLowerCase();
}
//@ chunk-6zpsr8vx.js:74059-74145 layout
/**
 * 返回字符串去掉尾部空白（含 U+0085、U+180E）后的长度。
 */
function trimPsTrailingWhitespaceEnd(text) {
  let endIndex = text.length;
  while (endIndex > 0 && /[\s\u0085\u180e]/.test(text[endIndex - 1])) endIndex--;
  return endIndex;
}
//@ chunk-6zpsr8vx.js:74145-74217 layout
/**
 * 去掉首尾空白（含 U+0085、U+180E）。PowerShell 规则匹配与 Bash 共用的规范化。
 */
function trimPsWhitespace(command) {
  return command.slice(0, trimPsTrailingWhitespaceEnd(command)).replace(/^[\s\u0085\u180e]+/, "");
}
//@ chunk-6zpsr8vx.js:74217-74418 layout
function trimExoticWhitespaceEdges(ruleContent) {
  let text = ruleContent;
  let match = text.match(/^[\s\u0085\u180e]+/);
  if (match && /[\u0085\u180e]/.test(match[0])) text = text.slice(match[0].length);
  let sliced = text.slice(trimPsTrailingWhitespaceEnd(text));
  if (/[\u0085\u180e]/.test(sliced)) text = text.slice(0, text.length - sliced.length);
  return text;
}
//@ chunk-6zpsr8vx.js:74418-74686 layout
function stripExoticWhitespaceAtEdges(text) {
  let stripped = text;
  let match = stripped.match(/^[\s\u0085\u180e]+/);
  if (match && /[\u0085\u180e]/.test(match[0]))
    stripped = match[0].replace(/[\u0085\u180e]/g, "") + stripped.slice(match[0].length);
  let sliced = stripped.slice(trimPsTrailingWhitespaceEnd(stripped));
  if (/[\u0085\u180e]/.test(sliced))
    stripped = stripped.slice(0, stripped.length - sliced.length) + sliced.replace(/[\u0085\u180e]/g, "");
  return stripped;
}
//@ chunk-6zpsr8vx.js:74686-74767 file-local
/**
 * 为精确命令生成 PowerShell 允许规则建议（多行或含 * 时不建议）。
 */
function suggestionForExactCommand_2(command) {
  if (
    command.includes(`
`) ||
    command.includes("*")
  )
    return [];
  return buildToolAllowSuggestion(POWERSHELL_TOOL_NAME, trimPsWhitespace(command));
}
//@ chunk-6zpsr8vx.js:74767-76175 layout (2.1.88 match: filterRulesByContentsMatchingInput, 1)
/**
 * PowerShell 规则匹配：大小写不敏感；命令名去模块前缀并解析别名为规范 cmdlet；支持 exact/prefix/wildcard，prefix 不匹配复合命令。
 */
function filterRulesByContentsMatchingInput(input, rules, matchMode, behavior) {
  let command = trimPsWhitespace(input.command);
  function strEquals(left, right) {
    return left.toLowerCase() === right.toLowerCase();
  }
  function strStartsWith(str, prefix) {
    return str.toLowerCase().startsWith(prefix.toLowerCase());
  }
  function stripModulePrefixForRule(name) {
    if (behavior === "allow") return name;
    return stripModulePrefix(name);
  }
  let rawCmdName = command.split(POWERSHELL_WHITESPACE)[0] ?? "";
  let inputCmdName = stripModulePrefix(rawCmdName);
  let inputCanonical = resolveToCanonical(inputCmdName);
  let rest = command.slice(rawCmdName.length).replace(/^[\s\u0085\u180e]+/, " ");
  let canonicalCommand = inputCanonical + rest;
  return Array.from(rules.entries())
    .filter(([ruleContent]) => {
      let rule = parsePowerShellPermissionRule(stripExoticWhitespaceAtEdges(ruleContent));
      let rule_2 =
        rule.type === "exact"
          ? {
              ...rule,
              command: trimExoticWhitespaceEdges(ruleContent),
            }
          : rule.type === "prefix"
            ? {
                ...rule,
                prefix: stripExoticWhitespaceAtEdges(rule.prefix),
              }
            : rule.type === "wildcard"
              ? {
                  ...rule,
                  pattern: stripExoticWhitespaceAtEdges(rule.pattern),
                }
              : rule;
      function matchesCommand(cmd) {
        switch (rule_2.type) {
          case "exact":
            return strEquals(rule_2.command, cmd);
          case "prefix":
            switch (matchMode) {
              case "exact":
                return strEquals(rule_2.prefix, cmd);
              case "prefix": {
                if (strEquals(cmd, rule_2.prefix)) return true;
                return strStartsWith(cmd, rule_2.prefix + " ");
              }
            }
            break;
          case "wildcard":
            if (matchMode === "exact") return false;
            return matchWildcardPattern(rule_2.pattern, cmd, true, true);
        }
      }
      if (matchesCommand(command)) return true;
      if (matchesCommand(canonicalCommand)) return true;
      if (rule_2.type === "exact") {
        let rawRuleCmdName = rule_2.command.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (resolveToCanonical(stripModulePrefixForRule(rawRuleCmdName)) === inputCanonical) {
          let ruleRest = rule_2.command.slice(rawRuleCmdName.length).replace(/^[\s\u0085\u180e]+/, " ");
          if (strEquals(ruleRest, rest)) return true;
        }
      } else if (rule_2.type === "prefix") {
        let rawRuleCmdName = rule_2.prefix.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (resolveToCanonical(stripModulePrefixForRule(rawRuleCmdName)) === inputCanonical) {
          let ruleRest = rule_2.prefix.slice(rawRuleCmdName.length).replace(/^[\s\u0085\u180e]+/, " ");
          let canonicalPrefix = inputCanonical + ruleRest;
          if (matchMode === "exact") {
            if (strEquals(canonicalPrefix, canonicalCommand)) return true;
          } else if (
            strEquals(canonicalCommand, canonicalPrefix) ||
            strStartsWith(canonicalCommand, canonicalPrefix + " ")
          )
            return true;
        }
      } else if (rule_2.type === "wildcard") {
        let rawRuleCmdName = rule_2.pattern.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (
          resolveToCanonical(stripModulePrefixForRule(rawRuleCmdName)) === inputCanonical &&
          matchMode !== "exact"
        ) {
          let ruleRest = rule_2.pattern.slice(rawRuleCmdName.length).replace(/^[\s\u0085\u180e]+/, " ");
          let canonicalPattern = inputCanonical + ruleRest;
          if (matchWildcardPattern(canonicalPattern, canonicalCommand, true, true)) return true;
        }
      }
      return false;
    })
    .map(([, rule]) => rule);
}
//@ chunk-6zpsr8vx.js:76175-76377 fingerprint (2.1.88 match: matchingRulesForInput, 1)
/**
 * PowerShell 版：分别求匹配的 deny/ask/allow 规则。
 */
function matchingRulesForInput_2(input, toolPermissionContext, matchMode) {
  let denyRuleByContents = getContentRulesMapForToolName(toolPermissionContext, POWERSHELL_TOOL_NAME, "deny");
  let matchingDenyRules = filterRulesByContentsMatchingInput(input, denyRuleByContents, matchMode, "deny");
  let askRuleByContents = getContentRulesMapForToolName(toolPermissionContext, POWERSHELL_TOOL_NAME, "ask");
  let matchingAskRules = filterRulesByContentsMatchingInput(input, askRuleByContents, matchMode, "ask");
  let allowRuleByContents = getContentRulesMapForToolName(
    toolPermissionContext,
    POWERSHELL_TOOL_NAME,
    "allow",
  );
  let matchingAllowRules = filterRulesByContentsMatchingInput(input, allowRuleByContents, matchMode, "allow");
  return {
    matchingDenyRules,
    matchingAskRules,
    matchingAllowRules,
  };
}
//@ chunk-6zpsr8vx.js:76994-77710 fingerprint (2.1.88 match: powershellToolCheckPermission, 1)
/**
 * 单个 PowerShell 子命令的规则检查：精确规则 → 前缀 deny/ask → allow 规则，否则 passthrough 并附建议。
 */
function powershellToolCheckPermission(input, toolPermissionContext) {
  let command = trimPsWhitespace(input.command);
  let trimmedInput = {
    ...input,
    command,
  };
  let exactMatchResult = powershellToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny" || exactMatchResult.behavior === "ask") return exactMatchResult;
  let { matchingDenyRules, matchingAskRules, matchingAllowRules } = matchingRulesForInput_2(
    trimmedInput,
    toolPermissionContext,
    "prefix",
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (matchingAllowRules[0] !== undefined)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: matchingAllowRules[0],
      },
    };
  let decisionReason = {
    type: "other",
    reason: "This command requires approval",
  };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand_2(command),
  };
}
//@ chunk-6zpsr8vx.js:77710-77739 layout
var TENGU_PLUMB_KESTREL = "tengu_plumb_kestrel";
//@ chunk-6zpsr8vx.js:77739-78449 fingerprint (2.1.88 match: getSubCommandsForPermissionCheck, 1)
/**
 * 把解析结果展开为需逐个检查权限的子命令（含嵌套命令），标记无参数的安全输出命令；解析失败时整体作为一条。
 */
async function getSubCommandsForPermissionCheck(parsed, originalCommand) {
  if (!parsed.valid)
    return [
      {
        text: originalCommand,
        element: {
          name: await extractCommandName(originalCommand),
          nameType: "unknown",
          elementType: "CommandAst",
          args: [],
          text: originalCommand,
        },
        statement: null,
        isSafeOutput: false,
      },
    ];
  let subCommands = [];
  for (let statement of parsed.statements) {
    for (let cmd of statement.commands) {
      if (cmd.elementType !== "CommandAst") continue;
      subCommands.push({
        text: cmd.text,
        element: cmd,
        statement,
        isSafeOutput:
          cmd.nameType !== "application" && isSafeOutputCommand(cmd.name) && cmd.args.length === 0,
      });
    }
    if (statement.nestedCommands)
      for (let cmd of statement.nestedCommands)
        subCommands.push({
          text: cmd.text,
          element: cmd,
          statement,
          isSafeOutput:
            cmd.nameType !== "application" && isSafeOutputCommand(cmd.name) && cmd.args.length === 0,
        });
  }
  if (subCommands.length > 0) return subCommands;
  return [
    {
      text: originalCommand,
      element: {
        name: await extractCommandName(originalCommand),
        nameType: "unknown",
        elementType: "CommandAst",
        args: [],
        text: originalCommand,
      },
      statement: null,
      isSafeOutput: false,
    },
  ];
}
//@ chunk-6zpsr8vx.js:78449-78887 layout
/**
 * PowerShell checkPermissions 入口：代理带 bashCommandClamp 时直接拒绝，否则走 powershellToolHasPermission。
 */
async function checkPowerShellPermissions(input, context) {
  let toolPermissionContext = getToolPermissionContext(context);
  if (
    toolPermissionContext.bashCommandClamps !== undefined &&
    toolPermissionContext.bashCommandClamps.length > 0
  )
    return {
      behavior: "deny",
      message:
        "Permission to use PowerShell has been denied: this agent carries a per-spawn bashCommandClamp, which scopes shell execution to a " +
        "fixed set of Bash command forms \u2014 PowerShell commands cannot " +
        "match them. Use the clamped Bash forms instead.",
      decisionReason: {
        type: "other",
        reason: BASH_COMMAND_CLAMP_DENY_REASON,
      },
    };
  return powershellToolHasPermission(input, context, toolPermissionContext);
}
//@ chunk-6zpsr8vx.js:78887-79184 layout
/**
 * 权限检查崩溃且带 bashCommandClamp 时拒绝。
 */
function denyCrashedCheckUnderCommandClamp(shellPermission) {
  let bashCommandClamps = getToolPermissionContext(shellPermission).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        "The PowerShell permission check crashed and this agent carries a per-spawn bashCommandClamp; denying rather than running an unverified command.",
      decisionReason: {
        type: "other",
        reason: BASH_COMMAND_CLAMP_CRASH_REASON,
      },
    };
  return;
}
//@ chunk-6zpsr8vx.js:79184-90684 fingerprint (2.1.88 match: powershellToolHasPermission, 0.776)
/**
 * PowerShell 权限主流程：空命令允许；精确/前缀 deny、ask 规则；UNC 路径；解析失败要求确认；安全检查（powershellCommandIsSafe）；using/#Requires/后台 & 要确认；非文件系统提供程序与 UNC 参数；cd+git、裸仓库迹象、写 git 内部路径/.git、xcopy/robocopy+git、Windows 5.1 cwd 优先解析的命令遮蔽、解压归档后接命令；路径约束；只读命令允许；文件重定向；acceptEdits 模式；最后逐个子命令判定并汇总。
 */
async function powershellToolHasPermission(input, context, toolPermissionContext) {
  let command = trimPsWhitespace(input.command);
  let trimmedInput = {
    ...input,
    command,
  };
  if (!command)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "other",
        reason: "Empty command is safe",
      },
    };
  let parsed = await parsePowerShellCommand(command);
  let exactMatchResult = powershellToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  let { matchingDenyRules, matchingAskRules } = matchingRulesForInput_2(
    trimmedInput,
    toolPermissionContext,
    "prefix",
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  let preParseAskDecision = null;
  if (matchingAskRules[0] !== undefined)
    preParseAskDecision = {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  if (preParseAskDecision === null && containsVulnerableUncPath(command))
    preParseAskDecision = {
      behavior: "ask",
      message: "Command contains a UNC path that could trigger network requests",
    };
  if (
    exactMatchResult.behavior === "allow" &&
    !parsed.valid &&
    preParseAskDecision === null &&
    classifyCommandName(command.split(POWERSHELL_WHITESPACE)[0] ?? "") !== "application"
  )
    return exactMatchResult;
  if (!parsed.valid) {
    let backtickStripped = unescapePsDoubleQuoted(
      command.replace(/<#[\s\S]*?#>/g, " ").replace(/`[\r\n]+\s*/g, ""),
    );
    let sawRemoveItem = false;
    let dangerousRemovalArg;
    let fragmentAskRule;
    for (let fragment of backtickStripped.split(/[;|\n\r{}()&]+/)) {
      let trimmedFrag = fragment.trim();
      if (!trimmedFrag) continue;
      let parts = trimmedFrag.split(POWERSHELL_WHITESPACE);
      for (let idx = 0; idx < parts.length; idx++) {
        let token = parts[idx];
        let strippedToken = stripPsParameterPrefix(token);
        if (!strippedToken) continue;
        if (
          dangerousRemovalArg === undefined &&
          !PS_TOKENIZER_DASH_CHARS.has(token[0] ?? "") &&
          isDangerousRemovalPath(token)
        )
          dangerousRemovalArg = token;
        if (resolveToCanonical(strippedToken) === "remove-item") {
          sawRemoveItem = true;
          for (let arg of parts.slice(idx + 1)) {
            if (PS_TOKENIZER_DASH_CHARS.has(arg[0] ?? "")) continue;
            if (isDangerousRemovalPath(arg)) return dangerousRemovalDeny(arg);
          }
        }
        for (let nameVariant of new Set([
          strippedToken,
          stripFileSystemProviderPrefix(token),
          createSingleEditDiffConfig(token),
        ])) {
          let command_2 = [nameVariant, ...parts.slice(idx + 1)].join(" ");
          let { matchingDenyRules: fragDenyRules, matchingAskRules } = matchingRulesForInput_2(
            {
              command: command_2,
            },
            toolPermissionContext,
            "prefix",
          );
          if (fragDenyRules[0] !== undefined)
            return {
              behavior: "deny",
              message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
              decisionReason: {
                type: "rule",
                rule: fragDenyRules[0],
              },
            };
          fragmentAskRule ??= matchingAskRules[0];
        }
      }
    }
    if (sawRemoveItem && dangerousRemovalArg !== undefined) return dangerousRemovalDeny(dangerousRemovalArg);
    let withMatchedAskRule = (preParseAskDecision) =>
      fragmentAskRule !== undefined &&
      preParseAskDecision.behavior === "ask" &&
      !carriesAskRuleIntent(preParseAskDecision)
        ? {
            ...preParseAskDecision,
            matchedAskRule: fragmentAskRule,
          }
        : preParseAskDecision;
    if (preParseAskDecision !== null) return withMatchedAskRule(preParseAskDecision);
    if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true)
      return outsideReadsTooComplexAsk(
        `Command contains malformed syntax that cannot be parsed: ${parsed.errors[0]?.message ?? "unknown error"}`,
      );
    let decisionReason = {
      type: "other",
      reason: `Command contains malformed syntax that cannot be parsed: ${parsed.errors[0]?.message ?? "unknown error"}`,
    };
    let syntaxAskResult = {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    };
    return withMatchedAskRule({
      ...syntaxAskResult,
      decisionReason: {
        type: "subcommandResults",
        reasons: new Map([[command, syntaxAskResult]]),
      },
    });
  }
  let allSubCommands = await getSubCommandsForPermissionCheck(parsed, command);
  let decisions = [];
  if (preParseAskDecision !== null) decisions.push(preParseAskDecision);
  let safetyResult = powershellCommandIsSafe(command, parsed);
  if (safetyResult.behavior !== "passthrough")
    if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true)
      decisions.push(outsideReadsTooComplexAsk(safetyResult.message));
    else {
      let decisionReason = {
        type: "other",
        reason: safetyResult.message,
      };
      decisions.push({
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
        decisionReason,
        suggestions: suggestionForExactCommand_2(command),
      });
    }
  if (parsed.hasUsingStatements) {
    let decisionReason = {
      type: "other",
      reason: "Command contains a `using` statement that may load external code (module or assembly)",
    };
    decisions.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
      decisionReason,
      suggestions: suggestionForExactCommand_2(command),
    });
  }
  if (parsed.hasScriptRequirements) {
    let decisionReason = {
      type: "other",
      reason: "Command contains a `#Requires` directive that may trigger module loading",
    };
    decisions.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
      decisionReason,
      suggestions: suggestionForExactCommand_2(command),
    });
  }
  if (parsed.hasBackgroundJob) {
    let backgroundJobReason = {
      type: "other",
      reason: "Command uses the background job operator (`&`) which spawns a child PowerShell process",
    };
    decisions.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, backgroundJobReason),
      decisionReason: backgroundJobReason,
      suggestions: suggestionForExactCommand_2(command),
    });
  }
  let NON_FS_PROVIDER_PATTERN =
    /^(?:[\w.]+\\)?(env|hklm|hkcu|function|alias|variable|cert|wsman|registry)::?/i;
  function extractProviderPathFromArg(arg) {
    let argText = arg;
    if (argText.length > 0 && (PS_TOKENIZER_DASH_CHARS.has(argText[0]) || argText[0] === "/")) {
      let colonIdx = argText.indexOf(":", 1);
      if (colonIdx > 0 && (argText[0] !== "/" || /^\/[A-Za-z]{1,2}:/.test(argText)))
        argText = argText.substring(colonIdx + 1);
    }
    return unescapePsDoubleQuoted(argText.replace(/`[\r\n]+\s*/g, ""));
  }
  function providerOrUncDecisionForArg(arg) {
    let value = extractProviderPathFromArg(arg);
    if (NON_FS_PROVIDER_PATTERN.test(value))
      return {
        behavior: "ask",
        message: `Command argument '${arg}' uses a non-filesystem provider path and requires approval`,
      };
    if (containsVulnerableUncPath(value, true))
      return {
        behavior: "ask",
        message: `Command argument '${arg}' contains a UNC path that could trigger network requests`,
      };
    if (getPlatform() === "windows" && /(?<!:)[\\/]{2,}[^ \t\r\n\f\v\\/]/.test(value))
      return {
        behavior: "ask",
        message: `Command argument '${arg}' contains a UNC path that could trigger network requests`,
      };
    return null;
  }
  e: for (let statement of parsed.statements) {
    for (let cmd of statement.commands) {
      if (cmd.elementType !== "CommandAst") continue;
      for (let arg of cmd.args) {
        let decision = providerOrUncDecisionForArg(arg);
        if (decision !== null) {
          decisions.push(decision);
          break e;
        }
      }
    }
    if (statement.nestedCommands)
      for (let cmd of statement.nestedCommands)
        for (let arg of cmd.args) {
          let decision = providerOrUncDecisionForArg(arg);
          if (decision !== null) {
            decisions.push(decision);
            break e;
          }
        }
  }
  for (let { text: subCmd, element } of allSubCommands) {
    let canonicalSubCmd = element.name !== "" ? [element.name, ...element.args].join(" ") : null;
    let subInput = {
      command: subCmd,
    };
    let { matchingDenyRules: subDenyRules, matchingAskRules: subAskRules } = matchingRulesForInput_2(
      subInput,
      toolPermissionContext,
      "prefix",
    );
    let matchedDenyRule = subDenyRules[0];
    let matchedAskRule = subAskRules[0];
    if (matchedDenyRule === undefined && canonicalSubCmd !== null) {
      let { matchingDenyRules: canonicalDenyRules, matchingAskRules: canonicalAskRules } =
        matchingRulesForInput_2(
          {
            command: canonicalSubCmd,
          },
          toolPermissionContext,
          "prefix",
        );
      matchedDenyRule = canonicalDenyRules[0];
      if (matchedAskRule === undefined) matchedAskRule = canonicalAskRules[0];
    }
    if (matchedDenyRule !== undefined)
      decisions.push({
        behavior: "deny",
        message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: matchedDenyRule,
        },
      });
    else if (matchedAskRule !== undefined)
      decisions.push({
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
        decisionReason: {
          type: "rule",
          rule: matchedAskRule,
        },
      });
  }
  let hasCdSubCommand =
    allSubCommands.length > 1 && allSubCommands.some(({ element }) => isCwdChangingCmdlet(element.name));
  let hasSymlinkCreate = allSubCommands.some(({ element }) => isSymlinkCreatingCommand(element));
  let hasGitSubCommand = allSubCommands.some(({ element }) => resolveToCanonical(element.name) === "git");
  if (hasCdSubCommand && hasGitSubCommand)
    decisions.push({
      behavior: "ask",
      message:
        "Compound commands with cd/Set-Location and git require approval to prevent bare repository attacks",
    });
  let bareRepoKind = hasGitSubCommand && isCurrentDirectoryBareGitRepo();
  if (bareRepoKind)
    decisions.push({
      behavior: "ask",
      message:
        bareRepoKind === "bare-indicators"
          ? "Git command in a directory with bare-repo indicators (HEAD/objects/refs outside a .git/ directory). Git may treat it as a git dir and run config/hooks from here."
          : "The .git file or symlink here redirects to a location that cannot be verified as safe (it may have been planted by an untrusted archive). Git commands need approval.",
    });
  if (hasGitSubCommand) {
    let writesToGitInternal = allSubCommands.some(({ element, statement }) => {
      for (let redirection of element.redirections ?? [])
        if (isGitInternalPathPS(redirection.target)) return true;
      let canonical = resolveToCanonical(element.name);
      if (!GIT_SAFETY_WRITE_CMDLETS_ALL.has(canonical)) return false;
      if (element.args.flatMap(splitCommaWords).some((arg) => isGitInternalPathPS(arg))) return true;
      if (canonical === "copy-item" || canonical === "move-item") {
        let elementIndex = statement === null ? -1 : statement.commands.indexOf(element);
        let forceAsk =
          statement !== null && (elementIndex > 0 || (elementIndex === -1 && statement.commands.length > 1));
        if (copyMoveMayReachGitInternals(element.args, forceAsk)) return true;
      }
      if (statement !== null)
        for (let command of statement.commands) {
          if (command.elementType === "CommandAst") continue;
          if (isGitInternalPathPS(command.text)) return true;
        }
      return false;
    });
    let redirWritesToGitInternal = getFileRedirections(parsed).some((redirection) =>
      isGitInternalPathPS(redirection.target),
    );
    if (writesToGitInternal || redirWritesToGitInternal)
      decisions.push({
        behavior: "ask",
        message:
          "Command writes to a git-internal path (HEAD, objects/, refs/, hooks/, .git/) and runs git. This could plant a malicious hook that git then executes.",
      });
    if (allSubCommands.some(({ element }) => isNativeFileCopier(element)))
      decisions.push({
        behavior: "ask",
        message:
          "Compound command runs a native file copier (xcopy/robocopy) and git. The copier can place files at git-internal paths (HEAD, objects/, refs/) that git then treats as repository state.",
      });
  }
  if (getPlatform() === "windows" && allSubCommands.length > 1) {
    let writtenStems = new Set();
    for (let redirection of getFileRedirections(parsed))
      for (let stem of baseStems(redirection.target)) writtenStems.add(stem);
    let shadowedCommand = null;
    for (let { element } of allSubCommands) {
      if (
        commandBaseVariants(element.name).some(
          ({ base, stem }) =>
            (stem !== "" && writtenStems.has(stem)) || (base !== stem && writtenStems.has(base)),
        )
      ) {
        shadowedCommand = element.name;
        break;
      }
      for (let redirection of element.redirections ?? [])
        for (let stem of baseStems(redirection.target)) writtenStems.add(stem);
      let canonicalName = resolveToCanonical(element.name);
      if (GIT_SAFETY_WRITE_CMDLETS_ALL.has(canonicalName))
        for (let arg of element.args.flatMap(splitCommaWords)) {
          let replaced = arg.replace(/^[-\u2013\u2014\u2015]+[A-Za-z]+:?/, "");
          let argText = skipLeadingWhitespaceAndComments(replaced);
          if (stripPsParameterPrefix(argText) !== "")
            for (let stem of baseStems(argText)) writtenStems.add(stem);
        }
    }
    if (shadowedCommand !== null)
      decisions.push({
        behavior: "ask",
        message: `An earlier sub-command writes a file (./${shadowedCommand}.*) that would shadow the later \`${shadowedCommand}\` command under Windows PowerShell 5.1 cwd-first resolution.`,
      });
  }
  if (
    allSubCommands.some(({ element }) => {
      let lower = element.name.toLowerCase();
      let sliced = lower.slice(Math.max(lower.lastIndexOf("\\"), lower.lastIndexOf("/")) + 1);
      return GIT_SAFETY_ARCHIVE_EXTRACTORS.has(sliced);
    }) &&
    allSubCommands.length > 1
  )
    decisions.push({
      behavior: "ask",
      message: hasGitSubCommand
        ? "Compound command extracts an archive and runs git. Archive contents may plant bare-repository indicators (HEAD, hooks/, refs/) that git then treats as the repository root."
        : "Compound command extracts an archive followed by other commands. Archive contents (symlinks, config files) cannot be validated and may redirect subsequent path operations.",
    });
  if (
    allSubCommands.some(({ element }) => {
      for (let redirection of element.redirections ?? []) if (isDotGitPathPS(redirection.target)) return true;
      let canonical = resolveToCanonical(element.name);
      if (!GIT_SAFETY_WRITE_CMDLETS_ALL.has(canonical)) return false;
      return element.args.flatMap(splitCommaWords).some(isDotGitPathPS);
    }) ||
    getFileRedirections(parsed).some((redirection) => isDotGitPathPS(redirection.target))
  )
    decisions.push({
      behavior: "ask",
      message:
        "Command writes to .git/ \u2014 hooks or config planted there execute on the next git operation.",
    });
  let pathResult = checkPathConstraints(trimmedInput, parsed, toolPermissionContext, hasCdSubCommand);
  if (pathResult.behavior !== "passthrough") decisions.push(pathResult);
  let ruleContent =
    exactMatchResult.behavior === "allow" && exactMatchResult.decisionReason?.type === "rule"
      ? exactMatchResult.decisionReason.rule.ruleValue.ruleContent
      : undefined;
  let ruleCoversFullCommand =
    ruleContent !== undefined &&
    trimExoticWhitespaceEdges(ruleContent).trim().toLowerCase() === command.toLowerCase();
  if (
    exactMatchResult.behavior === "allow" &&
    allSubCommands[0] !== undefined &&
    (ruleCoversFullCommand ||
      allSubCommands.every(
        (sc) => sc.element.nameType !== "application" && !argLeaksValue(sc.text, sc.element),
      ))
  )
    decisions.push(exactMatchResult);
  if (isReadOnlyCommand(command, parsed))
    decisions.push({
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "other",
        reason: POWERSHELL_READ_ONLY_ALLOW_REASON,
      },
    });
  if (getFileRedirections(parsed).length > 0)
    decisions.push({
      behavior: "ask",
      message: "Command contains file redirections that could write to arbitrary paths",
      suggestions: suggestionForExactCommand_2(command),
    });
  let modeResult = checkPermissionMode(trimmedInput, parsed, toolPermissionContext);
  if (modeResult.behavior !== "passthrough") decisions.push(modeResult);
  let deniedDecision = decisions.find((decision) => decision.behavior === "deny");
  if (deniedDecision !== undefined) return deniedDecision;
  let askDecision =
    decisions.find(
      (decision) => decision.behavior === "ask" && isOutsideReadsBlockedAsk(decision.decisionReason),
    ) ?? decisions.find((decision) => decision.behavior === "ask");
  if (askDecision !== undefined) {
    let askDecisionWithReasons = {
      ...askDecision,
      decisionReason: {
        type: "subcommandResults",
        reasons: new Map([[command, askDecision]]),
      },
    };
    if (!carriesAskRuleIntent(askDecisionWithReasons)) {
      for (let decision of decisions)
        if (
          decision.behavior === "ask" &&
          decision.decisionReason?.type === "rule" &&
          decision.decisionReason.rule.ruleBehavior === "ask"
        )
          return {
            ...askDecisionWithReasons,
            matchedAskRule: decision.decisionReason.rule,
          };
    }
    return askDecisionWithReasons;
  }
  let allowDecision = decisions.find((decision) => decision.behavior === "allow");
  if (allowDecision !== undefined) return allowDecision;
  let subCommands = allSubCommands.filter(({ element, isSafeOutput }) => {
    if (isSafeOutput) return false;
    if (element.nameType === "application") return true;
    if (resolveToCanonical(element.name) === "set-location" && element.args.length > 0) {
      if (
        readFlagWithOverride(TENGU_PLUMB_KESTREL, {
          safe: true,
        })
      )
        return true;
      let target = element.args.find((arg) => arg.length === 0 || !PS_TOKENIZER_DASH_CHARS.has(arg[0]));
      if (target && resolve(getCwd(), target) === getCwd()) return false;
    }
    return true;
  });
  let approvalScopeOf = (element) => {
    if (element.nameType === "application") return null;
    let lower = element.name.toLowerCase();
    let canonicalName = resolveToCanonical(lower);
    let index = canonicalName.indexOf("-");
    return canonicalName !== lower || (index > 0 && SAFE_POWERSHELL_VERBS.has(canonicalName.slice(0, index)))
      ? "full"
      : "exact";
  };
  let subCommandsNeedingApproval = [];
  let sawAllowlistedCommand = false;
  let statementsSeenInLoop = new Set();
  let statementsSeenInLoop_2 = new Set();
  for (let { text: subCmd, element, statement } of subCommands) {
    let subInput = {
      command: subCmd,
    };
    let subResult = powershellToolCheckPermission(subInput, toolPermissionContext);
    if (subResult.behavior === "deny")
      return {
        behavior: "deny",
        message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
        decisionReason: subResult.decisionReason,
      };
    if (subResult.behavior === "ask") {
      if (statement !== null) statementsSeenInLoop_2.add(statement);
      subCommandsNeedingApproval.push(subCmd);
      continue;
    }
    let allowedByPrefixRule = false;
    if (subResult.behavior === "allow" && element.nameType === "application") {
      let lower = element.name.toLowerCase();
      let lower_2 = stripFileSystemProviderPrefix(firstCommandTokenLower(subCmd)).toLowerCase();
      if (lower.length > 0 && lower_2 === lower)
        allowedByPrefixRule = matchingRulesForInput_2(
          subInput,
          toolPermissionContext,
          "prefix",
        ).matchingAllowRules.some((matchingAllowRule) => {
          let powerShellPermissionRule = parsePowerShellPermissionRule(
            stripExoticWhitespaceAtEdges(matchingAllowRule.ruleValue.ruleContent ?? ""),
          );
          let rulePatternCommand =
            powerShellPermissionRule.type === "exact"
              ? powerShellPermissionRule.command
              : powerShellPermissionRule.type === "prefix"
                ? powerShellPermissionRule.prefix
                : powerShellPermissionRule.pattern;
          return (
            stripFileSystemProviderPrefix(firstCommandTokenLower(rulePatternCommand)).toLowerCase() === lower
          );
        });
    }
    if (
      subResult.behavior === "allow" &&
      (element.nameType !== "application" || allowedByPrefixRule) &&
      !hasSymlinkCreate
    ) {
      if (argLeaksValue(subCmd, element)) {
        if (statement !== null) statementsSeenInLoop_2.add(statement);
        subCommandsNeedingApproval.push(subCmd);
        statementsSeenInLoop.add(subCmd);
        continue;
      }
      let approvalScope = approvalScopeOf(element);
      if (
        approvalScope !== null &&
        (hasVariableWritingParam(element.args, element.elementTypes, approvalScope) ||
          hasNonDefaultActionPreference(element.args, element.elementTypes, approvalScope))
      ) {
        if (statement !== null) statementsSeenInLoop_2.add(statement);
        subCommandsNeedingApproval.push(subCmd);
        statementsSeenInLoop.add(subCmd);
        continue;
      }
      continue;
    }
    if (subResult.behavior === "allow") {
      if (statement !== null) statementsSeenInLoop_2.add(statement);
      subCommandsNeedingApproval.push(subCmd);
      continue;
    }
    if (
      statement !== null &&
      !hasCdSubCommand &&
      !hasSymlinkCreate &&
      isProvablySafeStatement(statement) &&
      isAllowlistedCommand(element, subCmd)
    ) {
      sawAllowlistedCommand = true;
      continue;
    }
    if (statement !== null && !hasCdSubCommand && !hasSymlinkCreate) {
      if (
        checkPermissionMode(
          {
            command: subCmd,
          },
          {
            valid: true,
            errors: [],
            variables: parsed.variables,
            hasStopParsing: parsed.hasStopParsing,
            originalCommand: subCmd,
            statements: [statement],
          },
          toolPermissionContext,
        ).behavior === "allow"
      )
        continue;
    }
    if (statement !== null) statementsSeenInLoop_2.add(statement);
    subCommandsNeedingApproval.push(subCmd);
    {
      let approvalScope = approvalScopeOf(element);
      if (
        approvalScope !== null &&
        (hasVariableWritingParam(element.args, element.elementTypes, approvalScope) ||
          hasNonDefaultActionPreference(element.args, element.elementTypes, approvalScope))
      )
        statementsSeenInLoop.add(subCmd);
    }
  }
  let statementOnlyCommands = new Set();
  let queuedCommandTexts = new Set(subCommandsNeedingApproval);
  for (let stmt of parsed.statements)
    if (
      !isProvablySafeStatement(stmt) &&
      !statementsSeenInLoop_2.has(stmt) &&
      !queuedCommandTexts.has(stmt.text)
    ) {
      subCommandsNeedingApproval.push(stmt.text);
      queuedCommandTexts.add(stmt.text);
      statementOnlyCommands.add(stmt.text);
    }
  if (subCommandsNeedingApproval.length === 0) {
    if (deriveSecurityFlags(parsed).hasScriptBlocks) {
      let scriptBlockAsk = {
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
        decisionReason: {
          type: "other",
          reason:
            "Pipeline consists of output-formatting cmdlets with script blocks \u2014 block content cannot be verified",
        },
      };
      return {
        ...scriptBlockAsk,
        decisionReason: {
          type: "subcommandResults",
          reasons: new Map([[command, scriptBlockAsk]]),
        },
      };
    }
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "other",
        reason: sawAllowlistedCommand
          ? POWERSHELL_COMPOUND_READ_ONLY_PART_REASON
          : "All pipeline commands are individually allowed",
      },
    };
  }
  let decisionReason = {
    type: "other",
    reason: "This command requires approval",
  };
  let pendingSuggestions = [];
  for (let subCmd of subCommandsNeedingApproval) {
    if (statementOnlyCommands.has(subCmd) && subCmd !== command) continue;
    if (statementsSeenInLoop.has(subCmd) && subCmd !== command) continue;
    pendingSuggestions.push(...suggestionForExactCommand_2(subCmd));
  }
  let passthroughAsk = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason,
    suggestions: pendingSuggestions,
  };
  return {
    ...passthroughAsk,
    decisionReason: {
      type: "subcommandResults",
      reasons: new Map([[command, passthroughAsk]]),
    },
  };
}
export {
  buildToolAllowSuggestion,
  parseShellPermissionRule,
  checkTooComplexCommandDeny,
  trimPsWhitespace,
  matchingRulesForInput_2,
  suggestionForExactCommand_2,
  matchesShellRule,
  GIT_SAFETY_WRITE_CMDLETS,
  denyCrashedCheckUnderCommandClamp,
  checkPowerShellPermissions,
};
