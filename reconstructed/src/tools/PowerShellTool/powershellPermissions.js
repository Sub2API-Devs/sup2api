/**
 * tools/PowerShellTool/powershellPermissions.ts
 *
 * PowerShell 权限主流程：规则匹配（大小写不敏感、别名规范化）、安全检查、git/归档/.git 写入攻击检测、路径约束、只读与 acceptEdits、逐子命令汇总
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/powershellPermissions.ts
 * pieces: chunk-dcmhvw5a.js (2), chunk-e6aww6q8.js (1), chunk-v0yfsee9.js (19)
 * attribution: fingerprint 7, placement 1, callgraph-fingerprint 1, layout 11, file-local 2
 */
import { resolve, resolve as resolve_2, resolve as resolve_3 } from "path";
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
  TOo,
  resolveToCanonical,
  isSafeOutputCommand,
  isCwdChangingCmdlet,
  E0r,
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
  mVn,
  POWERSHELL_WHITESPACE,
  gP,
  lW,
  oZ,
  skipLeadingWhitespaceAndComments,
} from "./powershellParsing.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";
import {
  matchWildcardPattern,
  permissionRuleExtractPrefix,
  hasWildcards,
} from "../../utils/permissions/shellRuleMatching.js";
import {
  getContentRulesMapForToolName,
  createPermissionRequestMessage,
  carriesAskRuleIntent,
  parseToolInputForPermission,
  describePermissionCheckFault,
  isSettledPermissionResult,
  PERMISSION_CHECK_CRASHED_REASON,
} from "../../utils/permissions/permissions.js";
import { powershellToolCheckExactMatchPermission_2 } from "../BashTool/bashPermissions.js";
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
import { isGitInternalPathPS, isDotGitPathPS } from "./gitSafety.js";
import { tt, copyMoveMayReachGitInternals } from "./_new/copyMoveMayReachGitInternals.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getCwd } from "../../utils/cwd.js";
import { recordCheckedResult } from "../../utils/permissions/permissionRecord.js";

/**
 * 在读封锁下也视为需检查读路径的写类 cmdlet（Copy-Item、Move-Item、Compress/Expand-Archive、Invoke-WebRequest/RestMethod、New-Item）。
 */
//@ chunk-v0yfsee9.js:50839-50968 fingerprint = GIT_SAFETY_WRITE_CMDLETS (0.583)
var GIT_SAFETY_WRITE_CMDLETS = new Set([
  "copy-item",
  "move-item",
  "compress-archive",
  "expand-archive",
  "invoke-webrequest",
  "invoke-restmethod",
  "new-item",
]);
/**
 * 会写文件的 cmdlet 集合、归档解压程序集合（tar/unzip/7z/gzip/Expand-Archive）、原生复制程序集合（xcopy/robocopy），用于 git 内部路径与归档攻击检查。
 */
//@ chunk-v0yfsee9.js:71945-72369 fingerprint = GIT_SAFETY_ARCHIVE_EXTRACTORS (0.646)
var GIT_SAFETY_WRITE_CMDLETS_ALL = new Set([
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
  ]),
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
  ]),
  NATIVE_FILE_COPIERS = new Set(["xcopy", "xcopy.exe", "robocopy", "robocopy.exe"]);
//@ chunk-v0yfsee9.js:72369-72490 layout
function isNativeFileCopier(e) {
  let lower = e.name.toLowerCase(),
    sliced = lower.slice(Math.max(lower.lastIndexOf("\\"), lower.lastIndexOf("/")) + 1);
  return NATIVE_FILE_COPIERS.has(sliced);
}
//@ chunk-v0yfsee9.js:72490-72581 file-local
async function extractCommandName(command) {
  let trimmed = command.trim();
  if (!trimmed) return "";
  let parsed = await parsePowerShellCommand(trimmed);
  return getAllCommandNames(parsed)[0] ?? "";
}
//@ chunk-v0yfsee9.js:72581-72610 layout
function parsePowerShellPermissionRule(e) {
  return parseShellPermissionRule(e);
}
//@ chunk-v0yfsee9.js:72610-72828 layout
function firstCommandTokenLower(e) {
  let n = TOo(),
    r = n ? e.replace(regExp_4, "") : e.trimStart(),
    s = r[0];
  if (s === '"' || s === "'") {
    let index = r.indexOf(s, 1),
      g = index === -1 ? r.length : index + 1;
    return r.slice(0, g).toLowerCase();
  }
  return (r.split(n ? mVn : /\s+/)[0] ?? "").toLowerCase();
}
//@ chunk-v0yfsee9.js:72828-72914 layout
function kt(e) {
  let n = e.length;
  while (n > 0 && /[\s\u0085\u180e]/.test(e[n - 1])) n--;
  return n;
}
/**
 * 去掉首尾空白（含 U+0085、U+180E）。PowerShell 规则匹配与 Bash 共用的规范化。
 */
//@ chunk-v0yfsee9.js:72914-72986 layout
function trimPsWhitespace(e) {
  return e.slice(0, kt(e)).replace(/^[\s\u0085\u180e]+/, "");
}
//@ chunk-v0yfsee9.js:72986-73187 layout
function trimExoticWhitespaceEdges(e) {
  let n = e,
    match = n.match(/^[\s\u0085\u180e]+/);
  if (match && /[\u0085\u180e]/.test(match[0])) n = n.slice(match[0].length);
  let sliced = n.slice(kt(n));
  if (/[\u0085\u180e]/.test(sliced)) n = n.slice(0, n.length - sliced.length);
  return n;
}
//@ chunk-v0yfsee9.js:73187-73455 layout
function stripExoticWhitespaceAtEdges(e) {
  let n = e,
    match = n.match(/^[\s\u0085\u180e]+/);
  if (match && /[\u0085\u180e]/.test(match[0]))
    n = match[0].replace(/[\u0085\u180e]/g, "") + n.slice(match[0].length);
  let sliced = n.slice(kt(n));
  if (/[\u0085\u180e]/.test(sliced))
    n = n.slice(0, n.length - sliced.length) + sliced.replace(/[\u0085\u180e]/g, "");
  return n;
}
/**
 * 为精确命令生成 PowerShell 允许规则建议（多行或含 * 时不建议）。
 */
//@ chunk-v0yfsee9.js:73455-73536 file-local
function suggestionForExactCommand_2(command) {
  if (
    command.includes(`
`) ||
    command.includes("*")
  )
    return [];
  return buildToolAllowSuggestion(POWERSHELL_TOOL_NAME, trimPsWhitespace(command));
}
/**
 * PowerShell 规则匹配：大小写不敏感；命令名去模块前缀并解析别名为规范 cmdlet；支持 exact/prefix/wildcard，prefix 不匹配复合命令。
 */
//@ chunk-v0yfsee9.js:73536-74944 layout = filterRulesByContentsMatchingInput (1)
function filterRulesByContentsMatchingInput(input, rules, matchMode, behavior) {
  let m = trimPsWhitespace(input.command);
  function strEquals(_, P) {
    return _.toLowerCase() === P.toLowerCase();
  }
  function strStartsWith(str, prefix) {
    return str.toLowerCase().startsWith(prefix.toLowerCase());
  }
  function stripModulePrefixForRule(name) {
    if (behavior === "allow") return name;
    return stripModulePrefix(name);
  }
  let h = m.split(POWERSHELL_WHITESPACE)[0] ?? "",
    inputCmdName = stripModulePrefix(h),
    inputCanonical = resolveToCanonical(inputCmdName),
    rest = m.slice(h.length).replace(/^[\s\u0085\u180e]+/, " "),
    x = inputCanonical + rest;
  return Array.from(rules.entries())
    .filter(([_]) => {
      let rule = parsePowerShellPermissionRule(stripExoticWhitespaceAtEdges(_)),
        k =
          rule.type === "exact"
            ? { ...rule, command: trimExoticWhitespaceEdges(_) }
            : rule.type === "prefix"
              ? { ...rule, prefix: stripExoticWhitespaceAtEdges(rule.prefix) }
              : rule.type === "wildcard"
                ? { ...rule, pattern: stripExoticWhitespaceAtEdges(rule.pattern) }
                : rule;
      function matchesCommand(cmd) {
        switch (k.type) {
          case "exact":
            return strEquals(k.command, cmd);
          case "prefix":
            switch (matchMode) {
              case "exact":
                return strEquals(k.prefix, cmd);
              case "prefix": {
                if (strEquals(cmd, k.prefix)) return !0;
                return strStartsWith(cmd, k.prefix + " ");
              }
            }
            break;
          case "wildcard":
            if (matchMode === "exact") return !1;
            return matchWildcardPattern(k.pattern, cmd, !0, !0);
        }
      }
      if (matchesCommand(m)) return !0;
      if (matchesCommand(x)) return !0;
      if (k.type === "exact") {
        let V = k.command.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (resolveToCanonical(stripModulePrefixForRule(V)) === inputCanonical) {
          let ruleRest = k.command.slice(V.length).replace(/^[\s\u0085\u180e]+/, " ");
          if (strEquals(ruleRest, rest)) return !0;
        }
      } else if (k.type === "prefix") {
        let V = k.prefix.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (resolveToCanonical(stripModulePrefixForRule(V)) === inputCanonical) {
          let ruleRest = k.prefix.slice(V.length).replace(/^[\s\u0085\u180e]+/, " "),
            H = inputCanonical + ruleRest;
          if (matchMode === "exact") {
            if (strEquals(H, x)) return !0;
          } else if (strEquals(x, H) || strStartsWith(x, H + " ")) return !0;
        }
      } else if (k.type === "wildcard") {
        let V = k.pattern.split(POWERSHELL_WHITESPACE)[0] ?? "";
        if (resolveToCanonical(stripModulePrefixForRule(V)) === inputCanonical && matchMode !== "exact") {
          let ruleRest = k.pattern.slice(V.length).replace(/^[\s\u0085\u180e]+/, " "),
            H = inputCanonical + ruleRest;
          if (matchWildcardPattern(H, x, !0, !0)) return !0;
        }
      }
      return !1;
    })
    .map(([, _]) => _);
}
/**
 * PowerShell 版：分别求匹配的 deny/ask/allow 规则。
 */
//@ chunk-v0yfsee9.js:74944-75146 fingerprint = matchingRulesForInput (1)
function matchingRulesForInput_2(input, toolPermissionContext, matchMode) {
  let denyRuleByContents = getContentRulesMapForToolName(toolPermissionContext, POWERSHELL_TOOL_NAME, "deny"),
    matchingDenyRules = filterRulesByContentsMatchingInput(input, denyRuleByContents, matchMode, "deny"),
    askRuleByContents = getContentRulesMapForToolName(toolPermissionContext, POWERSHELL_TOOL_NAME, "ask"),
    matchingAskRules = filterRulesByContentsMatchingInput(input, askRuleByContents, matchMode, "ask"),
    allowRuleByContents = getContentRulesMapForToolName(toolPermissionContext, POWERSHELL_TOOL_NAME, "allow"),
    matchingAllowRules = filterRulesByContentsMatchingInput(input, allowRuleByContents, matchMode, "allow");
  return {
    matchingDenyRules: matchingDenyRules,
    matchingAskRules: matchingAskRules,
    matchingAllowRules: matchingAllowRules,
  };
}
/**
 * 单个 PowerShell 子命令的规则检查：精确规则 → 前缀 deny/ask → allow 规则，否则 passthrough 并附建议。
 */
//@ chunk-v0yfsee9.js:75763-76479 fingerprint = powershellToolCheckPermission (1)
function powershellToolCheckPermission(input, toolPermissionContext) {
  let r = trimPsWhitespace(input.command),
    s = { ...input, command: r },
    exactMatchResult = powershellToolCheckExactMatchPermission_2(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny" || exactMatchResult.behavior === "ask") return exactMatchResult;
  let {
    matchingDenyRules: matchingDenyRules,
    matchingAskRules: matchingAskRules,
    matchingAllowRules: matchingAllowRules,
  } = matchingRulesForInput_2(s, toolPermissionContext, "prefix");
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${r} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (matchingAllowRules[0] !== void 0)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "rule", rule: matchingAllowRules[0] },
    };
  let decisionReason = { type: "other", reason: "This command requires approval" };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason: decisionReason,
    suggestions: suggestionForExactCommand_2(r),
  };
}
//@ chunk-v0yfsee9.js:76479-76508 layout
var TENGU_PLUMB_KESTREL = "tengu_plumb_kestrel";
/**
 * 把解析结果展开为需逐个检查权限的子命令（含嵌套命令），标记无参数的安全输出命令；解析失败时整体作为一条。
 */
//@ chunk-v0yfsee9.js:76508-77218 fingerprint = getSubCommandsForPermissionCheck (1)
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
        isSafeOutput: !1,
      },
    ];
  let subCommands = [];
  for (let statement of parsed.statements) {
    for (let cmd of statement.commands) {
      if (cmd.elementType !== "CommandAst") continue;
      subCommands.push({
        text: cmd.text,
        element: cmd,
        statement: statement,
        isSafeOutput:
          cmd.nameType !== "application" && isSafeOutputCommand(cmd.name) && cmd.args.length === 0,
      });
    }
    if (statement.nestedCommands)
      for (let cmd of statement.nestedCommands)
        subCommands.push({
          text: cmd.text,
          element: cmd,
          statement: statement,
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
      isSafeOutput: !1,
    },
  ];
}
/**
 * PowerShell checkPermissions 入口：代理带 bashCommandClamp 时直接拒绝，否则走 powershellToolHasPermission。
 */
//@ chunk-v0yfsee9.js:77218-77656 layout
async function checkPowerShellPermissions(e, n) {
  let r = getToolPermissionContext(n);
  if (r.bashCommandClamps !== void 0 && r.bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        "Permission to use PowerShell has been denied: this agent carries a per-spawn bashCommandClamp, which scopes shell execution to a " +
        "fixed set of Bash command forms \u2014 PowerShell commands cannot " +
        "match them. Use the clamped Bash forms instead.",
      decisionReason: { type: "other", reason: BASH_COMMAND_CLAMP_DENY_REASON },
    };
  return powershellToolHasPermission(e, n, r);
}
/**
 * 权限检查崩溃且带 bashCommandClamp 时拒绝。
 */
//@ chunk-v0yfsee9.js:77656-77953 layout
function denyCrashedCheckUnderCommandClamp(e) {
  let bashCommandClamps = getToolPermissionContext(e).bashCommandClamps;
  if (bashCommandClamps !== void 0 && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        "The PowerShell permission check crashed and this agent carries a per-spawn bashCommandClamp; denying rather than running an unverified command.",
      decisionReason: { type: "other", reason: BASH_COMMAND_CLAMP_CRASH_REASON },
    };
  return;
}
/**
 * PowerShell 权限主流程：空命令允许；精确/前缀 deny、ask 规则；UNC 路径；解析失败要求确认；安全检查（powershellCommandIsSafe）；using/#Requires/后台 & 要确认；非文件系统提供程序与 UNC 参数；cd+git、裸仓库迹象、写 git 内部路径/.git、xcopy/robocopy+git、Windows 5.1 cwd 优先解析的命令遮蔽、解压归档后接命令；路径约束；只读命令允许；文件重定向；acceptEdits 模式；最后逐个子命令判定并汇总。
 */
//@ chunk-v0yfsee9.js:77953-89450 fingerprint = powershellToolHasPermission (0.777)
async function powershellToolHasPermission(e, n, r) {
  let s = trimPsWhitespace(e.command),
    m = { ...e, command: s };
  if (!s)
    return {
      behavior: "allow",
      updatedInput: e,
      decisionReason: { type: "other", reason: "Empty command is safe" },
    };
  let parsed = await parsePowerShellCommand(s),
    exactMatchResult = powershellToolCheckExactMatchPermission_2(e, r);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  let { matchingDenyRules: matchingDenyRules, matchingAskRules: matchingAskRules } = matchingRulesForInput_2(
    m,
    r,
    "prefix",
  );
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${s} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  let preParseAskDecision = null;
  if (matchingAskRules[0] !== void 0)
    preParseAskDecision = {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  if (preParseAskDecision === null && containsVulnerableUncPath(s))
    preParseAskDecision = {
      behavior: "ask",
      message: "Command contains a UNC path that could trigger network requests",
    };
  if (
    exactMatchResult.behavior === "allow" &&
    !parsed.valid &&
    preParseAskDecision === null &&
    classifyCommandName(s.split(POWERSHELL_WHITESPACE)[0] ?? "") !== "application"
  )
    return exactMatchResult;
  if (!parsed.valid) {
    let A = gP(s.replace(/<#[\s\S]*?#>/g, " ").replace(/`[\r\n]+\s*/g, "")),
      L = !1,
      j,
      F;
    for (let fragment of A.split(/[;|\n\r{}()&]+/)) {
      let trimmedFrag = fragment.trim();
      if (!trimmedFrag) continue;
      let parts = trimmedFrag.split(POWERSHELL_WHITESPACE);
      for (let ke = 0; ke < parts.length; ke++) {
        let xe = parts[ke],
          Fe = lW(xe);
        if (!Fe) continue;
        if (j === void 0 && !PS_TOKENIZER_DASH_CHARS.has(xe[0] ?? "") && isDangerousRemovalPath(xe)) j = xe;
        if (resolveToCanonical(Fe) === "remove-item") {
          L = !0;
          for (let arg of parts.slice(ke + 1)) {
            if (PS_TOKENIZER_DASH_CHARS.has(arg[0] ?? "")) continue;
            if (isDangerousRemovalPath(arg)) return dangerousRemovalDeny(arg);
          }
        }
        for (let ie of new Set([Fe, oZ(xe), createSingleEditDiffConfig(xe)])) {
          let joined = [ie, ...parts.slice(ke + 1)].join(" "),
            { matchingDenyRules: fragDenyRules, matchingAskRules: matchingAskRules } =
              matchingRulesForInput_2({ command: joined }, r, "prefix");
          if (fragDenyRules[0] !== void 0)
            return {
              behavior: "deny",
              message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${s} has been denied.`,
              decisionReason: { type: "rule", rule: fragDenyRules[0] },
            };
          F ??= matchingAskRules[0];
        }
      }
    }
    if (L && j !== void 0) return dangerousRemovalDeny(j);
    let K = (J) =>
      F !== void 0 && J.behavior === "ask" && !carriesAskRuleIntent(J) ? { ...J, matchedAskRule: F } : J;
    if (preParseAskDecision !== null) return K(preParseAskDecision);
    if (r.blockReadsOutsideWorkingDirectories === !0)
      return outsideReadsTooComplexAsk(
        `Command contains malformed syntax that cannot be parsed: ${parsed.errors[0]?.message ?? "unknown error"}`,
      );
    let decisionReason = {
        type: "other",
        reason: `Command contains malformed syntax that cannot be parsed: ${parsed.errors[0]?.message ?? "unknown error"}`,
      },
      U = {
        behavior: "ask",
        decisionReason: decisionReason,
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
      };
    return K({ ...U, decisionReason: { type: "subcommandResults", reasons: new Map([[s, U]]) } });
  }
  let allSubCommands = await getSubCommandsForPermissionCheck(parsed, s),
    v = [];
  if (preParseAskDecision !== null) v.push(preParseAskDecision);
  let safetyResult = powershellCommandIsSafe(s, parsed);
  if (safetyResult.behavior !== "passthrough")
    if (r.blockReadsOutsideWorkingDirectories === !0) v.push(outsideReadsTooComplexAsk(safetyResult.message));
    else {
      let decisionReason = { type: "other", reason: safetyResult.message };
      v.push({
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
        decisionReason: decisionReason,
        suggestions: suggestionForExactCommand_2(s),
      });
    }
  if (parsed.hasUsingStatements) {
    let decisionReason = {
      type: "other",
      reason: "Command contains a `using` statement that may load external code (module or assembly)",
    };
    v.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
      decisionReason: decisionReason,
      suggestions: suggestionForExactCommand_2(s),
    });
  }
  if (parsed.hasScriptRequirements) {
    let decisionReason = {
      type: "other",
      reason: "Command contains a `#Requires` directive that may trigger module loading",
    };
    v.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
      decisionReason: decisionReason,
      suggestions: suggestionForExactCommand_2(s),
    });
  }
  if (parsed.hasBackgroundJob) {
    let A = {
      type: "other",
      reason: "Command uses the background job operator (`&`) which spawns a child PowerShell process",
    };
    v.push({
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, A),
      decisionReason: A,
      suggestions: suggestionForExactCommand_2(s),
    });
  }
  let NON_FS_PROVIDER_PATTERN =
    /^(?:[\w.]+\\)?(env|hklm|hkcu|function|alias|variable|cert|wsman|registry)::?/i;
  function extractProviderPathFromArg(arg) {
    let L = arg;
    if (L.length > 0 && (PS_TOKENIZER_DASH_CHARS.has(L[0]) || L[0] === "/")) {
      let colonIdx = L.indexOf(":", 1);
      if (colonIdx > 0 && (L[0] !== "/" || /^\/[A-Za-z]{1,2}:/.test(L))) L = L.substring(colonIdx + 1);
    }
    return gP(L.replace(/`[\r\n]+\s*/g, ""));
  }
  function providerOrUncDecisionForArg(arg) {
    let value = extractProviderPathFromArg(arg);
    if (NON_FS_PROVIDER_PATTERN.test(value))
      return {
        behavior: "ask",
        message: `Command argument '${arg}' uses a non-filesystem provider path and requires approval`,
      };
    if (containsVulnerableUncPath(value, !0))
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
          v.push(decision);
          break e;
        }
      }
    }
    if (statement.nestedCommands)
      for (let cmd of statement.nestedCommands)
        for (let arg of cmd.args) {
          let decision = providerOrUncDecisionForArg(arg);
          if (decision !== null) {
            v.push(decision);
            break e;
          }
        }
  }
  for (let { text: subCmd, element: element } of allSubCommands) {
    let j = element.name !== "" ? [element.name, ...element.args].join(" ") : null,
      subInput = { command: subCmd },
      { matchingDenyRules: subDenyRules, matchingAskRules: subAskRules } = matchingRulesForInput_2(
        subInput,
        r,
        "prefix",
      ),
      U = subDenyRules[0],
      J = subAskRules[0];
    if (U === void 0 && j !== null) {
      let { matchingDenyRules: canonicalDenyRules, matchingAskRules: canonicalAskRules } =
        matchingRulesForInput_2({ command: j }, r, "prefix");
      if (((U = canonicalDenyRules[0]), J === void 0)) J = canonicalAskRules[0];
    }
    if (U !== void 0)
      v.push({
        behavior: "deny",
        message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${s} has been denied.`,
        decisionReason: { type: "rule", rule: U },
      });
    else if (J !== void 0)
      v.push({
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
        decisionReason: { type: "rule", rule: J },
      });
  }
  let D =
      allSubCommands.length > 1 &&
      allSubCommands.some(({ element: element }) => isCwdChangingCmdlet(element.name)),
    any = allSubCommands.some(({ element: element }) => isSymlinkCreatingCommand(element)),
    any_2 = allSubCommands.some(({ element: element }) => resolveToCanonical(element.name) === "git");
  if (D && any_2)
    v.push({
      behavior: "ask",
      message:
        "Compound commands with cd/Set-Location and git require approval to prevent bare repository attacks",
    });
  let W = any_2 && isCurrentDirectoryBareGitRepo();
  if (W)
    v.push({
      behavior: "ask",
      message:
        W === "bare-indicators"
          ? "Git command in a directory with bare-repo indicators (HEAD/objects/refs outside a .git/ directory). Git may treat it as a git dir and run config/hooks from here."
          : "The .git file or symlink here redirects to a location that cannot be verified as safe (it may have been planted by an untrusted archive). Git commands need approval.",
    });
  if (any_2) {
    let hasGitSubCommand = allSubCommands.some(({ element: element, statement: statement }) => {
        for (let U of element.redirections ?? []) if (isGitInternalPathPS(U.target)) return !0;
        let canonical = resolveToCanonical(element.name);
        if (!GIT_SAFETY_WRITE_CMDLETS_ALL.has(canonical)) return !1;
        if (element.args.flatMap(tt).some((U) => isGitInternalPathPS(U))) return !0;
        if (canonical === "copy-item" || canonical === "move-item") {
          let U = statement === null ? -1 : statement.commands.indexOf(element),
            J = statement !== null && (U > 0 || (U === -1 && statement.commands.length > 1));
          if (copyMoveMayReachGitInternals(element.args, J)) return !0;
        }
        if (statement !== null)
          for (let command of statement.commands) {
            if (command.elementType === "CommandAst") continue;
            if (isGitInternalPathPS(command.text)) return !0;
          }
        return !1;
      }),
      redirWritesToGitInternal = getFileRedirections(parsed).some((F) => isGitInternalPathPS(F.target));
    if (hasGitSubCommand || redirWritesToGitInternal)
      v.push({
        behavior: "ask",
        message:
          "Command writes to a git-internal path (HEAD, objects/, refs/, hooks/, .git/) and runs git. This could plant a malicious hook that git then executes.",
      });
    if (allSubCommands.some(({ element: element }) => isNativeFileCopier(element)))
      v.push({
        behavior: "ask",
        message:
          "Compound command runs a native file copier (xcopy/robocopy) and git. The copier can place files at git-internal paths (HEAD, objects/, refs/) that git then treats as repository state.",
      });
  }
  if (getPlatform() === "windows" && allSubCommands.length > 1) {
    let A = new Set();
    for (let j of getFileRedirections(parsed)) for (let F of E0r(j.target)) A.add(F);
    let L = null;
    for (let { element: element } of allSubCommands) {
      if (
        commandBaseVariants(element.name).some(
          ({ base: base, stem: stem }) => (stem !== "" && A.has(stem)) || (base !== stem && A.has(base)),
        )
      ) {
        L = element.name;
        break;
      }
      for (let K of element.redirections ?? []) for (let Q of E0r(K.target)) A.add(Q);
      let F = resolveToCanonical(element.name);
      if (GIT_SAFETY_WRITE_CMDLETS_ALL.has(F))
        for (let K of element.args.flatMap(tt)) {
          let replaced = K.replace(/^[-\u2013\u2014\u2015]+[A-Za-z]+:?/, ""),
            U = skipLeadingWhitespaceAndComments(replaced);
          if (lW(U) !== "") for (let J of E0r(U)) A.add(J);
        }
    }
    if (L !== null)
      v.push({
        behavior: "ask",
        message: `An earlier sub-command writes a file (./${L}.*) that would shadow the later \`${L}\` command under Windows PowerShell 5.1 cwd-first resolution.`,
      });
  }
  if (
    allSubCommands.some(({ element: element }) => {
      let lower = element.name.toLowerCase(),
        sliced = lower.slice(Math.max(lower.lastIndexOf("\\"), lower.lastIndexOf("/")) + 1);
      return GIT_SAFETY_ARCHIVE_EXTRACTORS.has(sliced);
    }) &&
    allSubCommands.length > 1
  )
    v.push({
      behavior: "ask",
      message: any_2
        ? "Compound command extracts an archive and runs git. Archive contents may plant bare-repository indicators (HEAD, hooks/, refs/) that git then treats as the repository root."
        : "Compound command extracts an archive followed by other commands. Archive contents (symlinks, config files) cannot be validated and may redirect subsequent path operations.",
    });
  if (
    allSubCommands.some(({ element: element }) => {
      for (let F of element.redirections ?? []) if (isDotGitPathPS(F.target)) return !0;
      let canonical = resolveToCanonical(element.name);
      if (!GIT_SAFETY_WRITE_CMDLETS_ALL.has(canonical)) return !1;
      return element.args.flatMap(tt).some(isDotGitPathPS);
    }) ||
    getFileRedirections(parsed).some((L) => isDotGitPathPS(L.target))
  )
    v.push({
      behavior: "ask",
      message:
        "Command writes to .git/ \u2014 hooks or config planted there execute on the next git operation.",
    });
  let pathResult = checkPathConstraints(m, parsed, r, D);
  if (pathResult.behavior !== "passthrough") v.push(pathResult);
  let G =
      exactMatchResult.behavior === "allow" && exactMatchResult.decisionReason?.type === "rule"
        ? exactMatchResult.decisionReason.rule.ruleValue.ruleContent
        : void 0,
    B = G !== void 0 && trimExoticWhitespaceEdges(G).trim().toLowerCase() === s.toLowerCase();
  if (
    exactMatchResult.behavior === "allow" &&
    allSubCommands[0] !== void 0 &&
    (B ||
      allSubCommands.every(
        (sc) => sc.element.nameType !== "application" && !argLeaksValue(sc.text, sc.element),
      ))
  )
    v.push(exactMatchResult);
  if (isReadOnlyCommand(s, parsed))
    v.push({
      behavior: "allow",
      updatedInput: e,
      decisionReason: { type: "other", reason: POWERSHELL_READ_ONLY_ALLOW_REASON },
    });
  if (getFileRedirections(parsed).length > 0)
    v.push({
      behavior: "ask",
      message: "Command contains file redirections that could write to arbitrary paths",
      suggestions: suggestionForExactCommand_2(s),
    });
  let modeResult = checkPermissionMode(m, parsed, r);
  if (modeResult.behavior !== "passthrough") v.push(modeResult);
  let deniedDecision = v.find((A) => A.behavior === "deny");
  if (deniedDecision !== void 0) return deniedDecision;
  let ne =
    v.find((A) => A.behavior === "ask" && isOutsideReadsBlockedAsk(A.decisionReason)) ??
    v.find((A) => A.behavior === "ask");
  if (ne !== void 0) {
    let A = { ...ne, decisionReason: { type: "subcommandResults", reasons: new Map([[s, ne]]) } };
    if (!carriesAskRuleIntent(A)) {
      for (let L of v)
        if (
          L.behavior === "ask" &&
          L.decisionReason?.type === "rule" &&
          L.decisionReason.rule.ruleBehavior === "ask"
        )
          return { ...A, matchedAskRule: L.decisionReason.rule };
    }
    return A;
  }
  let allowDecision = v.find((A) => A.behavior === "allow");
  if (allowDecision !== void 0) return allowDecision;
  let subCommands = allSubCommands.filter(({ element: element, isSafeOutput: isSafeOutput }) => {
      if (isSafeOutput) return !1;
      if (element.nameType === "application") return !0;
      if (resolveToCanonical(element.name) === "set-location" && element.args.length > 0) {
        if (readFlagWithOverride(TENGU_PLUMB_KESTREL, { safe: !0 })) return !0;
        let target = element.args.find((arg) => arg.length === 0 || !PS_TOKENIZER_DASH_CHARS.has(arg[0]));
        if (target && resolve(getCwd(), target) === getCwd()) return !1;
      }
      return !0;
    }),
    he = (A) => {
      if (A.nameType === "application") return null;
      let lower = A.name.toLowerCase(),
        j = resolveToCanonical(lower),
        index = j.indexOf("-");
      return j !== lower || (index > 0 && SAFE_POWERSHELL_VERBS.has(j.slice(0, index))) ? "full" : "exact";
    },
    re = [],
    Ee = !1,
    statementsSeenInLoop = new Set(),
    ee = new Set();
  for (let { text: subCmd, element: element, statement: statement } of subCommands) {
    let subInput = { command: subCmd },
      subResult = powershellToolCheckPermission(subInput, r);
    if (subResult.behavior === "deny")
      return {
        behavior: "deny",
        message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${s} has been denied.`,
        decisionReason: subResult.decisionReason,
      };
    if (subResult.behavior === "ask") {
      if (statement !== null) ee.add(statement);
      re.push(subCmd);
      continue;
    }
    let Q = !1;
    if (subResult.behavior === "allow" && element.nameType === "application") {
      let lower = element.name.toLowerCase(),
        lower_2 = oZ(firstCommandTokenLower(subCmd)).toLowerCase();
      if (lower.length > 0 && lower_2 === lower)
        Q = matchingRulesForInput_2(subInput, r, "prefix").matchingAllowRules.some((matchingAllowRule) => {
          let se = parsePowerShellPermissionRule(
              stripExoticWhitespaceAtEdges(matchingAllowRule.ruleValue.ruleContent ?? ""),
            ),
            ke = se.type === "exact" ? se.command : se.type === "prefix" ? se.prefix : se.pattern;
          return oZ(firstCommandTokenLower(ke)).toLowerCase() === lower;
        });
    }
    if (subResult.behavior === "allow" && (element.nameType !== "application" || Q) && !any) {
      if (argLeaksValue(subCmd, element)) {
        if (statement !== null) ee.add(statement);
        (re.push(subCmd), statementsSeenInLoop.add(subCmd));
        continue;
      }
      let U = he(element);
      if (
        U !== null &&
        (hasVariableWritingParam(element.args, element.elementTypes, U) ||
          hasNonDefaultActionPreference(element.args, element.elementTypes, U))
      ) {
        if (statement !== null) ee.add(statement);
        (re.push(subCmd), statementsSeenInLoop.add(subCmd));
        continue;
      }
      continue;
    }
    if (subResult.behavior === "allow") {
      if (statement !== null) ee.add(statement);
      re.push(subCmd);
      continue;
    }
    if (
      statement !== null &&
      !D &&
      !any &&
      isProvablySafeStatement(statement) &&
      isAllowlistedCommand(element, subCmd)
    ) {
      Ee = !0;
      continue;
    }
    if (statement !== null && !D && !any) {
      if (
        checkPermissionMode(
          { command: subCmd },
          {
            valid: !0,
            errors: [],
            variables: parsed.variables,
            hasStopParsing: parsed.hasStopParsing,
            originalCommand: subCmd,
            statements: [statement],
          },
          r,
        ).behavior === "allow"
      )
        continue;
    }
    if (statement !== null) ee.add(statement);
    re.push(subCmd);
    {
      let U = he(element);
      if (
        U !== null &&
        (hasVariableWritingParam(element.args, element.elementTypes, U) ||
          hasNonDefaultActionPreference(element.args, element.elementTypes, U))
      )
        statementsSeenInLoop.add(subCmd);
    }
  }
  let Ae = new Set(),
    ue = new Set(re);
  for (let stmt of parsed.statements)
    if (!isProvablySafeStatement(stmt) && !ee.has(stmt) && !ue.has(stmt.text))
      (re.push(stmt.text), ue.add(stmt.text), Ae.add(stmt.text));
  if (re.length === 0) {
    if (deriveSecurityFlags(parsed).hasScriptBlocks) {
      let A = {
        behavior: "ask",
        message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
        decisionReason: {
          type: "other",
          reason:
            "Pipeline consists of output-formatting cmdlets with script blocks \u2014 block content cannot be verified",
        },
      };
      return { ...A, decisionReason: { type: "subcommandResults", reasons: new Map([[s, A]]) } };
    }
    return {
      behavior: "allow",
      updatedInput: e,
      decisionReason: {
        type: "other",
        reason: Ee
          ? POWERSHELL_COMPOUND_READ_ONLY_PART_REASON
          : "All pipeline commands are individually allowed",
      },
    };
  }
  let decisionReason = { type: "other", reason: "This command requires approval" },
    ge = [];
  for (let subCmd of re) {
    if (Ae.has(subCmd) && subCmd !== s) continue;
    if (statementsSeenInLoop.has(subCmd) && subCmd !== s) continue;
    ge.push(...suggestionForExactCommand_2(subCmd));
  }
  let _e = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason: decisionReason,
    suggestions: ge,
  };
  return { ..._e, decisionReason: { type: "subcommandResults", reasons: new Map([[s, _e]]) } };
}
/**
 * 把规则内容解析成 {type:prefix,prefix} / {type:wildcard,pattern} / {type:exact,command}。
 */
//@ chunk-dcmhvw5a.js:214175-214322 fingerprint = filterRulesByContentsMatchingInput (1)
function parseShellPermissionRule(e) {
  let inputCmdName = permissionRuleExtractPrefix(e);
  if (inputCmdName !== null) return { type: "prefix", prefix: inputCmdName };
  if (hasWildcards(e)) return { type: "wildcard", pattern: e };
  return { type: "exact", command: e };
}
/**
 * 通用权限建议：localSettings 里为 toolName(ruleContent) 加 allow 规则。PowerShell/Bash 权限请求复用。
 */
//@ chunk-dcmhvw5a.js:214322-214446 placement = buildSuggestions (1)
function buildToolAllowSuggestion(e, n) {
  return [
    {
      type: "addRules",
      rules: [{ toolName: e, ruleContent: n }],
      behavior: "allow",
      destination: "localSettings",
    },
  ];
}
/**
 * 命中 ask 规则时仍运行工具自己的 checkPermissions：deny 优先，ask 时带上 matchedAskRule；检查崩溃时按 crashIsObjection 决定是否以"检查崩溃"询问。
 */
//@ chunk-e6aww6q8.js:3017371-3017889 callgraph-fingerprint = powershellToolCheckExactMatchPermission (0.276)
async function powershellToolCheckExactMatchPermission(e, n, r, s, h) {
  let y = {
    behavior: "ask",
    decisionReason: { type: "rule", rule: s },
    message: createPermissionRequestMessage(e.name),
  };
  try {
    let { parsedInput: parsedInput } = parseToolInputForPermission(e, n, r),
      checkPermissions = await e.checkPermissions(parsedInput, r);
    if (
      (recordCheckedResult(r, parsedInput, checkPermissions, e.name), checkPermissions?.behavior === "deny")
    )
      return checkPermissions;
    if (checkPermissions?.behavior === "ask") {
      let { suggestions: suggestions, ...G } = checkPermissions;
      return { ...G, matchedAskRule: s };
    }
  } catch (error) {
    let w = describePermissionCheckFault(error, e, n, r);
    if (w !== void 0 && w.behavior === "deny") return w;
    if (!isSettledPermissionResult(w) && h?.crashIsObjection === !0) {
      let decisionReason = { type: "other", reason: PERMISSION_CHECK_CRASHED_REASON };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(e.name, decisionReason),
        decisionReason: decisionReason,
      };
    }
  }
  return y;
}

export {
  powershellToolCheckExactMatchPermission,
  denyCrashedCheckUnderCommandClamp,
  checkPowerShellPermissions,
  parseShellPermissionRule,
  buildToolAllowSuggestion,
  trimPsWhitespace,
  matchingRulesForInput_2,
  suggestionForExactCommand_2,
  GIT_SAFETY_WRITE_CMDLETS,
};
