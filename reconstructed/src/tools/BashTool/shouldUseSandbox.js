/**
 * tools/BashTool/shouldUseSandbox.ts
 *
 * 决定 shell 调用是否进沙箱：沙箱开关、dangerouslyDisableSandbox 是否允许、excludedCommands 排除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/shouldUseSandbox.ts
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: affinity 2, facade-majority 3, layout 12, placement 1, callgraph-fingerprint 1
 */
import {
  hasStatementLexingDifferential,
  splitCommandForExemptionMatch,
  splitCommand,
  nestedCommandSpans,
} from "../../utils/bash/commands.js";
import {
  stripTrustedWrappers,
  firstToken,
  isSafeLeadingAssignment,
  hasUnicodeWhitespace,
  prependModeCharacterToInput,
  strippedCommandPrefix,
  UNSAFE_ARG_CHARS_RE,
  BLANK_RE,
  canonicalProgramName,
  classifyEnvWrapper,
  AT_VARIABLE_RE,
  hasShellMetaChar,
  isUnsandboxableProgram,
  isDockerSafe,
  SHELL_META_RE,
  UNSAFE_PATH_CHARS_RE_2,
} from "./sandboxExclusions.js";
import {
  stripUnsafeLeadingEnvVars,
  matchesCommandRule,
  parseBashPermissionRule,
  stripSafeWrappersFromCommand,
} from "./bashPermissions.js";
import { SandboxManager, getTrustedExcludedCommands } from "../../utils/sandbox/sandbox-adapter.js";
import { stripQuotedRegions, stripLiteralQuotedRegions } from "../../utils/bash/ast.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { hasWindowsSandboxBeenOn, isWindowsSandboxEnabled } from "../../utils/sandbox/windowsSandbox.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { getEnvCaseInsensitive } from "../../utils/plugins/securityDefaultPlugin.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { getPlatform } from "../../utils/platform.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isScrubEnabled, isScrubSandboxAvailable } from "../../utils/subprocessEnv.js";
import { getGitBashPathCached } from "../../utils/windowsPaths.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1261268-1261707 affinity
var TRANSPARENT_PREFIX_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POWERSHELL_INVOKE_COMMANDS;
var COMMAND_RUNNER_PREFIXES;
var DIRECTORY_CHANGE_COMMANDS;
var LEADING_REDIRECTION_RE;
var SIMPLE_COMMAND_NAME_RE;
var ENV_ASSIGNMENT_RE_3;
deferInit("chunk-e6aww6q8.js:1261268", () => {
  TRANSPARENT_PREFIX_COMMANDS = new Set(["timeout", "time", "nice", "stdbuf", "nohup", "noglob"]);
  POWERSHELL_INVOKE_COMMANDS = new Set([
    "iex",
    "invoke-expression",
    "icm",
    "invoke-command",
    "saps",
    "start",
    "start-process",
    ".",
  ]);
  COMMAND_RUNNER_PREFIXES = new Set([
    "builtin",
    "command",
    "xargs",
    "sed",
    "sudo",
    "doas",
    "su",
    "runuser",
    "pkexec",
    "chroot",
    "noglob",
    "nocorrect",
    "busybox",
    "toybox",
  ]);
  DIRECTORY_CHANGE_COMMANDS = new Set(["cd", "chdir", "pushd", "popd"]);
  LEADING_REDIRECTION_RE = /^\d*(?:&?[<>]|>&)/;
  SIMPLE_COMMAND_NAME_RE = /^[A-Za-z0-9._+@:-]+$/;
  ENV_ASSIGNMENT_RE_3 = /^[A-Za-z_][A-Za-z0-9_]*(?:\[|\+?=)/;
});
//@ chunk-e6aww6q8.js:1261707-1261734 affinity
/**
 * 动态沙箱禁用命令表：2.1.88 只对内部用户读 tengu_sandbox_disabled_commands，外部构建恒 null。
 */
function getDynamicSandboxDisabledCommands() {
  return null;
}
//@ chunk-e6aww6q8.js:1261734-1262138 facade-majority
function antDisabledListMatchesCommandText(command) {
  let settings = getDynamicSandboxDisabledCommands();
  if (settings === null) return false;
  if (settings.substrings.some((substring) => command.includes(substring))) return true;
  if (settings.commands.length === 0) return false;
  if (settings.commands.some((command_2) => command_2.includes(" ") && command.includes(command_2)))
    return true;
  let subcommands = null;
  let parsedCleanly = false;
  try {
    if (!hasStatementLexingDifferential(command)) {
      parsedCleanly = true;
      subcommands = splitCommandForExemptionMatch(command);
    }
  } catch {
    subcommands = null;
  }
  if (subcommands === null && parsedCleanly)
    try {
      let segments = [...splitCommand(command), ...nestedCommandSpans(command)];
      subcommands = segments.length > 0 ? segments : null;
    } catch {
      subcommands = null;
    }
  if (subcommands !== null && subcommands.length > 0)
    return subcommands.some((segment) => matchesExcludedCommand(segment, settings));
  return containsExcludedWord(command, settings);
}
//@ chunk-e6aww6q8.js:1262138-1262196 layout
/**
 * 去掉命令首尾空白（含 \r）的正则。
 */
var TRIMMABLE_WHITESPACE_RE = /^[ \t\r\n]+|[ \t\r\n]+$/g;
var UNICODE_SPACE_RE = /[^\S \t\n\r\f\v]/;
//@ chunk-e6aww6q8.js:1262196-1262524 layout
/**
 * 判断命令（剥离包装、env、注释后，最多 16 轮）是否命中沙箱 excludedCommands 列表中的命令名；含赋值时按单词集合检查。
 */
function matchesExcludedCommand(segment, settings) {
  let replaced = segment.replace(TRIMMABLE_WHITESPACE_RE, "");
  for (let idx = 0; idx < 16; idx++) {
    let replaced_2 = stripTrustedWrappers(stripWrapperCommandPrefixes(replaced, settings)).replace(
      /^[ \t\r\n]+/,
      "",
    );
    let replaced_3 = replaced_2.replace(/^(?:#[^\n]*(?:\n[ \t\r\n]*|$))+/, "");
    if (replaced_3 !== replaced_2) {
      if (UNICODE_SPACE_RE.test(segment)) return true;
      replaced = replaced_3.replace(TRIMMABLE_WHITESPACE_RE, "");
      continue;
    }
    let firstWord = firstToken(replaced_2);
    if (firstWord !== "" && settings.commands.includes(firstWord)) return true;
    if (!ENV_ASSIGNMENT_RE_3.test(firstWord)) return false;
    return containsExcludedWord(replaced, settings);
  }
  return true;
}
//@ chunk-e6aww6q8.js:1262524-1262642 layout
function containsExcludedWord(text, settings) {
  let words = new Set(text.split(/[\s;|&(){}<>`'"]+/));
  return settings.commands.some((command) => !command.includes(" ") && words.has(command));
}
//@ chunk-e6aww6q8.js:1262642-1262797 placement = detectGateway (0.488)
/**
 * 反复剥掉命令前的 timeout/time/nice/nohup 等包装命令前缀（Bash 沙箱判定用）。旧版名 detectGateway 为错配，应归 tools/BashTool/shouldUseSandbox.ts。
 */
function stripWrapperCommandPrefixes(command, settings) {
  let current = command;
  let previous;
  while (current !== previous) {
    previous = current;
    current = stripUnsafeLeadingEnvVars(current);
    let firstWord = firstToken(current);
    if (
      firstWord &&
      SIMPLE_COMMAND_NAME_RE.test(firstWord) &&
      settings.prefixes.some((prefix) => matchesCommandRule(prefix, firstWord))
    )
      current = current.slice(firstWord.length).trimStart();
  }
  return current;
}
//@ chunk-e6aww6q8.js:1262870-1263289 callgraph-fingerprint = containsExcludedCommand (0.189)
/**
 * 判断命令是否命中沙箱 excludedCommands（及设置里的子串/命令列表）；bash 按子命令逐个匹配，PowerShell 走专用匹配。
 */
function containsExcludedCommand(command, shell = "bash") {
  let settings = getDynamicSandboxDisabledCommands();
  let excludedCommands = SandboxManager.getExcludedCommands();
  if (excludedCommands.length === 0 && !settings?.substrings.length && !settings?.commands.length)
    return false;
  if (shell === "powershell")
    try {
      return powershellMatchesExcludedCommand(
        command,
        excludedCommands.map(parseBashPermissionRule),
        settings,
      );
    } catch {
      return false;
    }
  let subcommands;
  try {
    subcommands = hasStatementLexingDifferential(command) ? null : splitCommandForExemptionMatch(command);
  } catch {
    subcommands = null;
  }
  if (subcommands === null || subcommands.length === 0) return false;
  try {
    let rules = excludedCommands.map(parseBashPermissionRule);
    let included = stripQuotedRegions(command).replace(/\|\|/g, "").includes("|");
    if (hasCrossSegmentVariableAssignment(subcommands)) return false;
    return subcommands.every((subcommand, idx) =>
      segmentMatchesExcludedCommand(subcommand, rules, settings, idx === 0 || !included),
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1263289-1263772 layout
/**
 * 检测跨段变量赋值：某段赋值（NAME= 或 ${NAME:=}）的变量在其它段被引用，此时不按段做排除匹配。
 */
function hasCrossSegmentVariableAssignment(subcommands) {
  let sitesByName = new Map();
  for (let [segIdx, subcommand] of subcommands.entries()) {
    let assignmentNames = [];
    let match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(subcommand.trim());
    if (match !== null && isSafeLeadingAssignment(subcommand.trim())) assignmentNames.push(match[1]);
    for (let match of subcommand.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):?=/g)) assignmentNames.push(match[1]);
    for (let name of assignmentNames) {
      let sites = sitesByName.get(name);
      if (sites === undefined) sitesByName.set(name, new Set([segIdx]));
      else sites.add(segIdx);
    }
  }
  if (sitesByName.size === 0) return false;
  return subcommands.some((subcommand, segIdx) => {
    let masked = stripLiteralQuotedRegions(subcommand);
    for (let [name, sites] of sitesByName) {
      if (sites.size === 1 && sites.has(segIdx)) continue;
      if (new RegExp(`\\$[=^~]*\\{?${name}\\b`).test(masked)) return true;
    }
    return false;
  });
}
//@ chunk-e6aww6q8.js:1263772-1264461 layout
/**
 * 单段 Bash 命令是否命中排除表：规范化后与 excludedCommands 和动态禁用表比较，并尝试去掉 timeout/nice 等透明前缀的变体。
 */
function segmentMatchesExcludedCommand(subcommand, rules, settings, isFirstSegment) {
  let trimmed = subcommand.trim();
  if (!hasUnicodeWhitespace(subcommand) && isSafeLeadingAssignment(trimmed)) return true;
  let normalized;
  if (settings) {
    let withoutPrefixes = stripWrapperCommandPrefixes(trimmed, settings);
    let stripped = stripTrustedWrappers(withoutPrefixes);
    normalized = {
      input: withoutPrefixes,
      normalized: stripped,
      coverable: prependModeCharacterToInput(stripped, trimmed, subcommand, isFirstSegment),
    };
    if (normalized.coverable) {
      if (settings.substrings.some((substring) => stripped.includes(substring))) return true;
      let firstWord = firstToken(stripped);
      if (firstWord && settings.commands.includes(firstWord)) return true;
    }
  }
  if (rules.length === 0) return false;
  let cached = normalized?.input === trimmed ? normalized : undefined;
  let normalizedText = cached?.normalized ?? stripTrustedWrappers(trimmed);
  if (!(
    cached?.coverable ?? prependModeCharacterToInput(normalizedText, trimmed, subcommand, isFirstSegment)
  ))
    return false;
  let variants = [normalizedText];
  let prefix = strippedCommandPrefix(trimmed);
  if (prefix !== "") variants.push(`${prefix}${normalizedText}`);
  let seen = new Set(variants);
  let startIdx = 0;
  while (startIdx < variants.length) {
    let endIdx = variants.length;
    for (let idx = startIdx; idx < endIdx; idx++) {
      let variant = variants[idx];
      let withoutEnvVars = stripUnsafeLeadingEnvVars(variant);
      if (!seen.has(withoutEnvVars)) {
        variants.push(withoutEnvVars);
        seen.add(withoutEnvVars);
      }
      let withoutWrappers = stripSafeWrappersFromCommand(variant);
      if (!seen.has(withoutWrappers)) {
        variants.push(withoutWrappers);
        seen.add(withoutWrappers);
      }
    }
    startIdx = endIdx;
  }
  return rules.some((rule) => variants.some((variant) => matchesShellRule(rule, variant)));
}
//@ chunk-e6aww6q8.js:1264461-1264816 layout
/**
 * PowerShell 命令是否命中排除表（拒绝以 - 开头、包装前缀、PowerShell 调用等不可靠形式）。
 */
function powershellMatchesExcludedCommand(command, rules, settings) {
  let command_2 = command.trim();
  if (command_2 === "" || UNSAFE_ARG_CHARS_RE.test(command_2)) return false;
  let parts = command_2.split(BLANK_RE);
  let firstWord = parts[0];
  if (
    firstWord.startsWith("-") ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(firstWord)) ||
    classifyEnvWrapper(command_2) !== "none" ||
    parts.some((part) => AT_VARIABLE_RE.test(part)) ||
    hasShellMetaChar(firstWord, "powershell") ||
    isUnsandboxableProgram(firstWord, "powershell") ||
    isDockerSafe(command_2, parts, true)
  )
    return false;
  if (settings) {
    if (settings.substrings.some((substring) => command_2.includes(substring))) return true;
    if (settings.commands.includes(firstWord)) return true;
  }
  return rules.some((rule) => matchesShellRule(rule, command_2));
}
//@ chunk-e6aww6q8.js:1264816-1265381 layout
/**
 * 严格沙箱模式下命令是否被 sandbox.excludedCommands 豁免：排除空命令、PowerShell 调用、包装前缀、变量赋值、glob/~ 展开等无法可靠匹配的形式后，与排除表比对。
 */
function matchesStrictModeExclusion(command, shell) {
  let trustedExcludedCommands = getTrustedExcludedCommands();
  let text = shell === "bash" ? command.replace(/^[ \t\n]+|[ \t\n]+$/g, "") : command.trim();
  if (trustedExcludedCommands.length === 0 || !text || SHELL_META_RE.test(text)) return false;
  let filtered = text
    .split(BLANK_RE)
    .map((part) => part.replace(/['"\u2018-\u201B\u201C-\u201E]/g, ""))
    .filter((part) => part.length > 0);
  let firstWord = filtered[0] ?? "";
  if (
    hasShellMetaChar(firstWord, "powershell") ||
    filtered.some((part) => AT_VARIABLE_RE.test(part)) ||
    UNSAFE_PATH_CHARS_RE_2.test(text) ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(firstWord)) ||
    isUnsandboxableProgram(firstWord, "powershell") ||
    /['"\u2018-\u201B\u201C-\u201E]/.test(text.split(/[ \t]+/)[0] ?? "") ||
    classifyEnvWrapper(text) !== "none" ||
    isDockerSafe(text, filtered, true) ||
    (shell === "bash" &&
      (/[\\*?[]|(?:^|[ \t=:])~|(?:^|[ \t])=|^!(?:[ \t]|$)/.test(text) || ENV_ASSIGNMENT_RE_3.test(text)))
  )
    return false;
  return trustedExcludedCommands.some((trustedExcludedCommand) =>
    matchesShellRule(parseBashPermissionRule(trustedExcludedCommand), text),
  );
}
//@ chunk-e6aww6q8.js:1265381-1265410 layout
var TENGU_NIFTY_RIPPLE = "tengu_nifty_ripple";
//@ chunk-e6aww6q8.js:1265410-1265450 layout
/**
 * GrowthBook tengu_nifty_ripple：Bash 是否也执行严格沙箱拒绝（sandboxPolicyRefusal 用）。
 */
function isStrictSandboxBashRefusalEnabled() {
  return readFlagWithOverride(TENGU_NIFTY_RIPPLE, {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:1265450-1265522 layout
/**
 * 本会话沙箱是否开启过（wv.hasBeenOn），或设置了 CLAUDE_CODE_NANKEEN_KESTREL。
 */
function hasSandboxBeenOn() {
  return (
    hasWindowsSandboxBeenOn() ||
    isEnvTruthy(getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CLAUDE_CODE_NANKEEN_KESTREL"))
  );
}
//@ chunk-e6aww6q8.js:1265522-1265831 layout
/**
 * 严格沙箱模式拒绝运行命令时的文案模板："The command did not run. Strict sandbox mode is on…"，并说明改设置是用户或管理员的事。
 */
function formatStrictSandboxRefusal(reason, guidance) {
  return `The command did not run. Strict sandbox mode is on, so no command may run outside the sandbox, and ${reason}. ${guidance} Changing sandbox settings is for the user or their administrator to decide, not you. So is running this command, or one that does the same, through another tool or program.`;
}
//@ chunk-e6aww6q8.js:1265831-1267983 facade-majority
function sandboxPolicyRefusal(disableUnsandboxed, command, userTypedDisable, shell) {
  if (
    userTypedDisable ||
    disableUnsandboxed ||
    getPlatform() !== "windows" ||
    !SandboxManager.isSandboxEnabledInSettings() ||
    !SandboxManager.isPlatformInEnabledList() ||
    !SandboxManager.isStrictSandboxModeConfigured()
  )
    return null;
  let sandboxingOn = SandboxManager.isSandboxingEnabled();
  if (shell === "bash" && (sandboxingOn || !hasSandboxBeenOn() || !isStrictSandboxBashRefusalEnabled()))
    return null;
  let matchesExclusion = matchesStrictModeExclusion(command, shell);
  let unsandboxedCommandsDisabled = getHostAgentPolicy().unsandboxedCommandsDisabled;
  if (matchesExclusion && !unsandboxedCommandsDisabled) return null;
  let exclusionNote =
    "command matches a sandbox exclusion, but an exclusion exempts a command only where a permission prompt can approve the unsandboxed run, and none is available here";
  if (sandboxingOn)
    return matchesExclusion
      ? formatStrictSandboxRefusal(
          `the ${exclusionNote}`,
          "Here the command can run only inside the sandbox.",
        )
      : formatStrictSandboxRefusal(
          "no sandbox.excludedCommands entry in user settings, managed settings or a --settings file exempts this command; an entry in a project's .claude/settings.json or settings.local.json does not count under strict mode",
          "Only an entry in one of those three counts.",
        );
  let windowsSandboxOn = isWindowsSandboxEnabled();
  let errors = windowsSandboxOn ? SandboxManager.rememberedDependencyCheck()?.errors : undefined;
  let cause;
  let nextStep;
  if (!windowsSandboxOn && hasSandboxBeenOn()) {
    cause = "the sandbox has been switched off";
    nextStep = "Until the sandbox is switched back on, commands like this one stay refused in this session.";
  } else if (!windowsSandboxOn) {
    cause = "no sandbox is available on this computer";
    nextStep = "Only whoever manages the user's sandbox settings can change what strict mode allows here.";
  } else if (errors === undefined) {
    cause = "the sandbox is not ready in this session";
    nextStep =
      "The user can restart Claude Code to have the sandbox checked again; if that does not help, the user's administrator has to look at the sandbox.";
  } else if (errors.some((error) => error.startsWith("srt-win"))) {
    cause = "the sandbox's own program cannot be started on this computer";
    nextStep =
      "Reinstalling Claude Code may get the sandbox's program working; if not, the user's administrator has to fix it.";
  } else if (errors.length > 0) {
    cause = "the sandbox is not set up on this computer";
    nextStep =
      "The user can set up the sandbox with /sandbox install in Claude Code, or `claude sandbox install` in a terminal.";
  } else {
    cause = "the sandbox failed to start in this session";
    nextStep = "The user can restart Claude Code to try starting the sandbox again.";
  }
  if (matchesExclusion) return formatStrictSandboxRefusal(`${cause}. The ${exclusionNote}`, nextStep);
  return formatStrictSandboxRefusal(
    shell === "bash" && matchesStrictModeExclusion(command, "powershell")
      ? `${cause}. The command matches a sandbox exclusion, but Bash would read part of it differently, so the exclusion does not cover it`
      : cause,
    nextStep,
  );
}
//@ chunk-e6aww6q8.js:1267983-1268149 layout = filterRulesByContentsMatchingInput (1)
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
//@ chunk-e6aww6q8.js:1268149-1268611 facade-majority = shouldUseSandbox (0.465)
/**
 * 决定这次 shell 调用是否进沙箱：强制沙箱环境直接 true；沙箱未启用 false；Windows bash 无可用实现 false；dangerouslyDisableSandbox 仅在允许非沙箱命令（或用户手动 ! 命令）且未被强制时生效；命中 excludedCommands 设置的命令不进沙箱。
 */
function shouldUseSandbox(input, options) {
  if (isScrubEnabled() && isScrubSandboxAvailable()) return true;
  if (!SandboxManager.isSandboxingEnabled()) return false;
  if (
    (input.shellType ?? "bash") === "bash" &&
    getPlatform() === "windows" &&
    getGitBashPathCached() === null
  )
    return false;
  let requiresSandbox =
    options?.disableUnsandboxedCommands === true ||
    getHostAgentPolicy().unsandboxedCommandsDisabled ||
    env.CLAUDE_CODE_EVAL_CONFINED;
  if (
    input.dangerouslyDisableSandbox &&
    !requiresSandbox &&
    (options?.userTypedShellDispatch === true || SandboxManager.areUnsandboxedCommandsAllowed())
  )
    return false;
  if (!input.command) return Boolean(requiresSandbox);
  if (!requiresSandbox && containsExcludedCommand(input.command, input.shellType ?? "bash")) return false;
  return true;
}
export {
  shouldUseSandbox,
  antDisabledListMatchesCommandText,
  sandboxPolicyRefusal,
  TRANSPARENT_PREFIX_COMMANDS,
  COMMAND_RUNNER_PREFIXES,
  DIRECTORY_CHANGE_COMMANDS,
  POWERSHELL_INVOKE_COMMANDS,
  LEADING_REDIRECTION_RE,
  ENV_ASSIGNMENT_RE_3,
};
