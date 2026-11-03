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

//@ chunk-e6aww6q8.js:1261268-1261707 affinity
var TRANSPARENT_PREFIX_COMMANDS = new Set(["timeout", "time", "nice", "stdbuf", "nohup", "noglob"]);
var POWERSHELL_INVOKE_COMMANDS = new Set([
  "iex",
  "invoke-expression",
  "icm",
  "invoke-command",
  "saps",
  "start",
  "start-process",
  ".",
]);
var COMMAND_RUNNER_PREFIXES = new Set([
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
var DIRECTORY_CHANGE_COMMANDS = new Set(["cd", "chdir", "pushd", "popd"]);
var LEADING_REDIRECTION_RE = /^\d*(?:&?[<>]|>&)/;
var SIMPLE_COMMAND_NAME_RE = /^[A-Za-z0-9._+@:-]+$/;
var ENV_ASSIGNMENT_RE_3 = /^[A-Za-z_][A-Za-z0-9_]*(?:\[|\+?=)/;
//@ chunk-e6aww6q8.js:1261707-1261734 affinity
/**
 * 动态沙箱禁用命令表：2.1.88 只对内部用户读 tengu_sandbox_disabled_commands，外部构建恒 null。
 */
function getDynamicSandboxDisabledCommands() {
  return null;
}
//@ chunk-e6aww6q8.js:1261734-1262138 facade-majority
function antDisabledListMatchesCommandText(command) {
  let dynamicSandboxDisabledCommands = getDynamicSandboxDisabledCommands();
  if (dynamicSandboxDisabledCommands === null) return false;
  if (dynamicSandboxDisabledCommands.substrings.some((substring) => command.includes(substring))) return true;
  if (dynamicSandboxDisabledCommands.commands.length === 0) return false;
  if (
    dynamicSandboxDisabledCommands.commands.some(
      (command_2) => command_2.includes(" ") && command.includes(command_2),
    )
  )
    return true;
  let r = null;
  let s = false;
  try {
    if (!hasStatementLexingDifferential(command)) {
      s = true;
      r = splitCommandForExemptionMatch(command);
    }
  } catch {
    r = null;
  }
  if (r === null && s)
    try {
      let h = [...splitCommand(command), ...nestedCommandSpans(command)];
      r = h.length > 0 ? h : null;
    } catch {
      r = null;
    }
  if (r !== null && r.length > 0)
    return r.some((h) => matchesExcludedCommand(h, dynamicSandboxDisabledCommands));
  return containsExcludedWord(command, dynamicSandboxDisabledCommands);
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
function matchesExcludedCommand(e, dynamicSandboxDisabledCommands) {
  let replaced = e.replace(TRIMMABLE_WHITESPACE_RE, "");
  for (let idx = 0; idx < 16; idx++) {
    let replaced_2 = stripTrustedWrappers(
      stripWrapperCommandPrefixes(replaced, dynamicSandboxDisabledCommands),
    ).replace(/^[ \t\r\n]+/, "");
    let replaced_3 = replaced_2.replace(/^(?:#[^\n]*(?:\n[ \t\r\n]*|$))+/, "");
    if (replaced_3 !== replaced_2) {
      if (UNICODE_SPACE_RE.test(e)) return true;
      replaced = replaced_3.replace(TRIMMABLE_WHITESPACE_RE, "");
      continue;
    }
    let S = firstToken(replaced_2);
    if (S !== "" && dynamicSandboxDisabledCommands.commands.includes(S)) return true;
    if (!ENV_ASSIGNMENT_RE_3.test(S)) return false;
    return containsExcludedWord(replaced, dynamicSandboxDisabledCommands);
  }
  return true;
}
//@ chunk-e6aww6q8.js:1262524-1262642 layout
function containsExcludedWord(e, n) {
  let r = new Set(e.split(/[\s;|&(){}<>`'"]+/));
  return n.commands.some((command) => !command.includes(" ") && r.has(command));
}
//@ chunk-e6aww6q8.js:1262642-1262797 placement = detectGateway (0.488)
/**
 * 反复剥掉命令前的 timeout/time/nice/nohup 等包装命令前缀（Bash 沙箱判定用）。旧版名 detectGateway 为错配，应归 tools/BashTool/shouldUseSandbox.ts。
 */
function stripWrapperCommandPrefixes(e, n) {
  let r = e;
  let s;
  while (r !== s) {
    s = r;
    r = stripUnsafeLeadingEnvVars(r);
    let h = firstToken(r);
    if (h && SIMPLE_COMMAND_NAME_RE.test(h) && n.prefixes.some((prefix) => matchesCommandRule(prefix, h)))
      r = r.slice(h.length).trimStart();
  }
  return r;
}
//@ chunk-e6aww6q8.js:1262870-1263289 callgraph-fingerprint = containsExcludedCommand (0.189)
/**
 * 判断命令是否命中沙箱 excludedCommands（及设置里的子串/命令列表）；bash 按子命令逐个匹配，PowerShell 走专用匹配。
 */
function containsExcludedCommand(target, n = "bash") {
  let settings = getDynamicSandboxDisabledCommands();
  let excludedCommands = SandboxManager.getExcludedCommands();
  if (excludedCommands.length === 0 && !settings?.substrings.length && !settings?.commands.length)
    return false;
  if (n === "powershell")
    try {
      return powershellMatchesExcludedCommand(
        target,
        excludedCommands.map(parseBashPermissionRule),
        settings,
      );
    } catch {
      return false;
    }
  let subcommands;
  try {
    subcommands = hasStatementLexingDifferential(target) ? null : splitCommandForExemptionMatch(target);
  } catch {
    subcommands = null;
  }
  if (subcommands === null || subcommands.length === 0) return false;
  try {
    let mapped = excludedCommands.map(parseBashPermissionRule);
    let included = stripQuotedRegions(target).replace(/\|\|/g, "").includes("|");
    if (hasCrossSegmentVariableAssignment(subcommands)) return false;
    return subcommands.every((subcommand, L) =>
      segmentMatchesExcludedCommand(subcommand, mapped, settings, L === 0 || !included),
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
  let n = new Map();
  for (let [r, s] of subcommands.entries()) {
    let h = [];
    let match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(s.trim());
    if (match !== null && isSafeLeadingAssignment(s.trim())) h.push(match[1]);
    for (let S of s.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):?=/g)) h.push(S[1]);
    for (let S of h) {
      let w = n.get(S);
      if (w === undefined) n.set(S, new Set([r]));
      else w.add(r);
    }
  }
  if (n.size === 0) return false;
  return subcommands.some((r, s) => {
    let h = stripLiteralQuotedRegions(r);
    for (let [y, S] of n) {
      if (S.size === 1 && S.has(s)) continue;
      if (new RegExp(`\\$[=^~]*\\{?${y}\\b`).test(h)) return true;
    }
    return false;
  });
}
//@ chunk-e6aww6q8.js:1263772-1264461 layout
/**
 * 单段 Bash 命令是否命中排除表：规范化后与 excludedCommands 和动态禁用表比较，并尝试去掉 timeout/nice 等透明前缀的变体。
 */
function segmentMatchesExcludedCommand(subcommand, n, settings, s) {
  let trimmed = subcommand.trim();
  if (!hasUnicodeWhitespace(subcommand) && isSafeLeadingAssignment(trimmed)) return true;
  let y;
  if (settings) {
    let ke = stripWrapperCommandPrefixes(trimmed, settings);
    let we = stripTrustedWrappers(ke);
    y = {
      input: ke,
      normalized: we,
      coverable: prependModeCharacterToInput(we, trimmed, subcommand, s),
    };
    if (y.coverable) {
      if (settings.substrings.some((substring) => we.includes(substring))) return true;
      let Ee = firstToken(we);
      if (Ee && settings.commands.includes(Ee)) return true;
    }
  }
  if (n.length === 0) return false;
  let S = y?.input === trimmed ? y : undefined;
  let w = S?.normalized ?? stripTrustedWrappers(trimmed);
  if (!(S?.coverable ?? prependModeCharacterToInput(w, trimmed, subcommand, s))) return false;
  let G = [w];
  let q = strippedCommandPrefix(trimmed);
  if (q !== "") G.push(`${q}${w}`);
  let Z = new Set(G);
  let Se = 0;
  while (Se < G.length) {
    let ke = G.length;
    for (let we = Se; we < ke; we++) {
      let Ee = G[we];
      let Ae = stripUnsafeLeadingEnvVars(Ee);
      if (!Z.has(Ae)) {
        G.push(Ae);
        Z.add(Ae);
      }
      let Ie = stripSafeWrappersFromCommand(Ee);
      if (!Z.has(Ie)) {
        G.push(Ie);
        Z.add(Ie);
      }
    }
    Se = ke;
  }
  return n.some((ke) => G.some((we) => matchesShellRule(ke, we)));
}
//@ chunk-e6aww6q8.js:1264461-1264816 layout
/**
 * PowerShell 命令是否命中排除表（拒绝以 - 开头、包装前缀、PowerShell 调用等不可靠形式）。
 */
function powershellMatchesExcludedCommand(e, n, settings) {
  let trimmed = e.trim();
  if (trimmed === "" || UNSAFE_ARG_CHARS_RE.test(trimmed)) return false;
  let parts = trimmed.split(BLANK_RE);
  let y = parts[0];
  if (
    y.startsWith("-") ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(y)) ||
    classifyEnvWrapper(trimmed) !== "none" ||
    parts.some((S) => AT_VARIABLE_RE.test(S)) ||
    hasShellMetaChar(y, "powershell") ||
    isUnsandboxableProgram(y, "powershell") ||
    isDockerSafe(trimmed, parts, true)
  )
    return false;
  if (settings) {
    if (settings.substrings.some((substring) => trimmed.includes(substring))) return true;
    if (settings.commands.includes(y)) return true;
  }
  return n.some((S) => matchesShellRule(S, trimmed));
}
//@ chunk-e6aww6q8.js:1264816-1265381 layout
/**
 * 严格沙箱模式下命令是否被 sandbox.excludedCommands 豁免：排除空命令、PowerShell 调用、包装前缀、变量赋值、glob/~ 展开等无法可靠匹配的形式后，与排除表比对。
 */
function matchesStrictModeExclusion(e, n) {
  let trustedExcludedCommands = getTrustedExcludedCommands();
  let s = n === "bash" ? e.replace(/^[ \t\n]+|[ \t\n]+$/g, "") : e.trim();
  if (trustedExcludedCommands.length === 0 || !s || SHELL_META_RE.test(s)) return false;
  let filtered = s
    .split(BLANK_RE)
    .map((S) => S.replace(/['"\u2018-\u201B\u201C-\u201E]/g, ""))
    .filter((S) => S.length > 0);
  let y = filtered[0] ?? "";
  if (
    hasShellMetaChar(y, "powershell") ||
    filtered.some((S) => AT_VARIABLE_RE.test(S)) ||
    UNSAFE_PATH_CHARS_RE_2.test(s) ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(y)) ||
    isUnsandboxableProgram(y, "powershell") ||
    /['"\u2018-\u201B\u201C-\u201E]/.test(s.split(/[ \t]+/)[0] ?? "") ||
    classifyEnvWrapper(s) !== "none" ||
    isDockerSafe(s, filtered, true) ||
    (n === "bash" &&
      (/[\\*?[]|(?:^|[ \t=:])~|(?:^|[ \t])=|^!(?:[ \t]|$)/.test(s) || ENV_ASSIGNMENT_RE_3.test(s)))
  )
    return false;
  return trustedExcludedCommands.some((trustedExcludedCommand) =>
    matchesShellRule(parseBashPermissionRule(trustedExcludedCommand), s),
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
function formatStrictSandboxRefusal(e, n) {
  return `The command did not run. Strict sandbox mode is on, so no command may run outside the sandbox, and ${e}. ${n} Changing sandbox settings is for the user or their administrator to decide, not you. So is running this command, or one that does the same, through another tool or program.`;
}
//@ chunk-e6aww6q8.js:1265831-1267983 facade-majority
function sandboxPolicyRefusal(e, command, r, s) {
  if (
    r ||
    e ||
    getPlatform() !== "windows" ||
    !SandboxManager.isSandboxEnabledInSettings() ||
    !SandboxManager.isPlatformInEnabledList() ||
    !SandboxManager.isStrictSandboxModeConfigured()
  )
    return null;
  let h = SandboxManager.isSandboxingEnabled();
  if (s === "bash" && (h || !hasSandboxBeenOn() || !isStrictSandboxBashRefusalEnabled())) return null;
  let y = matchesStrictModeExclusion(command, s);
  let unsandboxedCommandsDisabled = getHostAgentPolicy().unsandboxedCommandsDisabled;
  if (y && !unsandboxedCommandsDisabled) return null;
  let w =
    "command matches a sandbox exclusion, but an exclusion exempts a command only where a permission prompt can approve the unsandboxed run, and none is available here";
  if (h)
    return y
      ? formatStrictSandboxRefusal(`the ${w}`, "Here the command can run only inside the sandbox.")
      : formatStrictSandboxRefusal(
          "no sandbox.excludedCommands entry in user settings, managed settings or a --settings file exempts this command; an entry in a project's .claude/settings.json or settings.local.json does not count under strict mode",
          "Only an entry in one of those three counts.",
        );
  let L = isWindowsSandboxEnabled();
  let errors = L ? SandboxManager.rememberedDependencyCheck()?.errors : undefined;
  let q;
  let Z;
  if (!L && hasSandboxBeenOn()) {
    q = "the sandbox has been switched off";
    Z = "Until the sandbox is switched back on, commands like this one stay refused in this session.";
  } else if (!L) {
    q = "no sandbox is available on this computer";
    Z = "Only whoever manages the user's sandbox settings can change what strict mode allows here.";
  } else if (errors === undefined) {
    q = "the sandbox is not ready in this session";
    Z =
      "The user can restart Claude Code to have the sandbox checked again; if that does not help, the user's administrator has to look at the sandbox.";
  } else if (errors.some((error) => error.startsWith("srt-win"))) {
    q = "the sandbox's own program cannot be started on this computer";
    Z =
      "Reinstalling Claude Code may get the sandbox's program working; if not, the user's administrator has to fix it.";
  } else if (errors.length > 0) {
    q = "the sandbox is not set up on this computer";
    Z =
      "The user can set up the sandbox with /sandbox install in Claude Code, or `claude sandbox install` in a terminal.";
  } else {
    q = "the sandbox failed to start in this session";
    Z = "The user can restart Claude Code to try starting the sandbox again.";
  }
  if (y) return formatStrictSandboxRefusal(`${q}. The ${w}`, Z);
  return formatStrictSandboxRefusal(
    s === "bash" && matchesStrictModeExclusion(command, "powershell")
      ? `${q}. The command matches a sandbox exclusion, but Bash would read part of it differently, so the exclusion does not cover it`
      : q,
    Z,
  );
}
//@ chunk-e6aww6q8.js:1267983-1268149 layout = filterRulesByContentsMatchingInput (1)
/**
 * 单条已解析规则（prefix/exact/wildcard）是否匹配命令文本。
 */
function matchesShellRule(e, n) {
  switch (e.type) {
    case "prefix":
      return n === e.prefix || n.startsWith(e.prefix + " ");
    case "exact":
      return n === e.command;
    case "wildcard":
      return matchesCommandRule(e.pattern, n);
  }
}
//@ chunk-e6aww6q8.js:1268149-1268611 facade-majority = shouldUseSandbox (0.465)
/**
 * 决定这次 shell 调用是否进沙箱：强制沙箱环境直接 true；沙箱未启用 false；Windows bash 无可用实现 false；dangerouslyDisableSandbox 仅在允许非沙箱命令（或用户手动 ! 命令）且未被强制时生效；命中 excludedCommands 设置的命令不进沙箱。
 */
function shouldUseSandbox(e, n) {
  if (isScrubEnabled() && isScrubSandboxAvailable()) return true;
  if (!SandboxManager.isSandboxingEnabled()) return false;
  if ((e.shellType ?? "bash") === "bash" && getPlatform() === "windows" && getGitBashPathCached() === null)
    return false;
  let r =
    n?.disableUnsandboxedCommands === true ||
    getHostAgentPolicy().unsandboxedCommandsDisabled ||
    env.CLAUDE_CODE_EVAL_CONFINED;
  if (
    e.dangerouslyDisableSandbox &&
    !r &&
    (n?.userTypedShellDispatch === true || SandboxManager.areUnsandboxedCommandsAllowed())
  )
    return false;
  if (!e.command) return Boolean(r);
  if (!r && containsExcludedCommand(e.command, e.shellType ?? "bash")) return false;
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
