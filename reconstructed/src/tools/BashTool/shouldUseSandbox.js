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
  NR,
  isSafeLeadingAssignment,
  l4t,
  prependModeCharacterToInput,
  yLo,
  UNSAFE_ARG_CHARS_RE,
  BLANK_RE,
  canonicalProgramName,
  classifyEnvWrapper,
  AT_VARIABLE_RE,
  Gye,
  isUnsandboxableProgram,
  isDockerSafe,
  SHELL_META_RE,
  UNSAFE_PATH_CHARS_RE,
} from "./sandboxExclusions.js";
import { RQ, yQ, parseBashPermissionRule, pqe } from "./bashPermissions.js";
import { SandboxManager, getTrustedExcludedCommands } from "../../utils/sandbox/sandbox-adapter.js";
import { stripQuotedRegions, stripLiteralQuotedRegions } from "../../utils/bash/ast.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { Oai, isWindowsSandboxEnabled } from "../../utils/sandbox/windowsSandbox.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { getEnvCaseInsensitive } from "../../utils/plugins/securityDefaultPlugin.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { getPlatform } from "../../utils/platform.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isScrubEnabled, isScrubSandboxAvailable } from "../../utils/subprocessEnv.js";
import { getGitBashPathCached } from "../../utils/windowsPaths.js";
import { env } from "../../utils/env.js";

//@ chunk-e6aww6q8.js:1261268-1261707 affinity
var TRANSPARENT_PREFIX_COMMANDS = new Set(["timeout", "time", "nice", "stdbuf", "nohup", "noglob"]),
  POWERSHELL_INVOKE_COMMANDS = new Set([
    "iex",
    "invoke-expression",
    "icm",
    "invoke-command",
    "saps",
    "start",
    "start-process",
    ".",
  ]),
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
  ]),
  DIRECTORY_CHANGE_COMMANDS = new Set(["cd", "chdir", "pushd", "popd"]),
  LEADING_REDIRECTION_RE = /^\d*(?:&?[<>]|>&)/,
  SIMPLE_COMMAND_NAME_RE = /^[A-Za-z0-9._+@:-]+$/,
  ENV_ASSIGNMENT_RE_2 = /^[A-Za-z_][A-Za-z0-9_]*(?:\[|\+?=)/;
/**
 * 动态沙箱禁用命令表：2.1.88 只对内部用户读 tengu_sandbox_disabled_commands，外部构建恒 null。
 */
//@ chunk-e6aww6q8.js:1261707-1261734 affinity
function getDynamicSandboxDisabledCommands() {
  return null;
}
//@ chunk-e6aww6q8.js:1261734-1262138 facade-majority
function antDisabledListMatchesCommandText(e) {
  let n = getDynamicSandboxDisabledCommands();
  if (n === null) return !1;
  if (n.substrings.some((substring) => e.includes(substring))) return !0;
  if (n.commands.length === 0) return !1;
  if (n.commands.some((command) => command.includes(" ") && e.includes(command))) return !0;
  let r = null,
    s = !1;
  try {
    if (!hasStatementLexingDifferential(e)) ((s = !0), (r = splitCommandForExemptionMatch(e)));
  } catch {
    r = null;
  }
  if (r === null && s)
    try {
      let h = [...splitCommand(e), ...nestedCommandSpans(e)];
      r = h.length > 0 ? h : null;
    } catch {
      r = null;
    }
  if (r !== null && r.length > 0) return r.some((h) => matchesExcludedCommand(h, n));
  return containsExcludedWord(e, n);
}
//@ chunk-e6aww6q8.js:1262138-1262196 layout
var KYt = /^[ \t\r\n]+|[ \t\r\n]+$/g,
  iNo = /[^\S \t\n\r\f\v]/;
/**
 * 判断命令（剥离包装、env、注释后，最多 16 轮）是否命中沙箱 excludedCommands 列表中的命令名；含赋值时按单词集合检查。
 */
//@ chunk-e6aww6q8.js:1262196-1262524 layout
function matchesExcludedCommand(e, n) {
  let replaced = e.replace(KYt, "");
  for (let s = 0; s < 16; s++) {
    let replaced_2 = stripTrustedWrappers(stripWrapperCommandPrefixes(replaced, n)).replace(
        /^[ \t\r\n]+/,
        "",
      ),
      replaced_3 = replaced_2.replace(/^(?:#[^\n]*(?:\n[ \t\r\n]*|$))+/, "");
    if (replaced_3 !== replaced_2) {
      if (iNo.test(e)) return !0;
      replaced = replaced_3.replace(KYt, "");
      continue;
    }
    let S = NR(replaced_2);
    if (S !== "" && n.commands.includes(S)) return !0;
    if (!ENV_ASSIGNMENT_RE_2.test(S)) return !1;
    return containsExcludedWord(replaced, n);
  }
  return !0;
}
//@ chunk-e6aww6q8.js:1262524-1262642 layout
function containsExcludedWord(e, n) {
  let r = new Set(e.split(/[\s;|&(){}<>`'"]+/));
  return n.commands.some((command) => !command.includes(" ") && r.has(command));
}
/**
 * 反复剥掉命令前的 timeout/time/nice/nohup 等包装命令前缀（Bash 沙箱判定用）。旧版名 detectGateway 为错配，应归 tools/BashTool/shouldUseSandbox.ts。
 */
//@ chunk-e6aww6q8.js:1262642-1262797 placement = detectGateway (0.488)
function stripWrapperCommandPrefixes(e, n) {
  let r = e,
    s;
  while (r !== s) {
    ((s = r), (r = RQ(r)));
    let h = NR(r);
    if (h && SIMPLE_COMMAND_NAME_RE.test(h) && n.prefixes.some((prefixe) => yQ(prefixe, h)))
      r = r.slice(h.length).trimStart();
  }
  return r;
}
/**
 * 判断命令是否命中沙箱 excludedCommands（及设置里的子串/命令列表）；bash 按子命令逐个匹配，PowerShell 走专用匹配。
 */
//@ chunk-e6aww6q8.js:1262870-1263289 callgraph-fingerprint = containsExcludedCommand (0.189)
function containsExcludedCommand(e, n = "bash") {
  let settings = getDynamicSandboxDisabledCommands(),
    excludedCommands = SandboxManager.getExcludedCommands();
  if (excludedCommands.length === 0 && !settings?.substrings.length && !settings?.commands.length) return !1;
  if (n === "powershell")
    try {
      return powershellMatchesExcludedCommand(e, excludedCommands.map(parseBashPermissionRule), settings);
    } catch {
      return !1;
    }
  let subcommands;
  try {
    subcommands = hasStatementLexingDifferential(e) ? null : splitCommandForExemptionMatch(e);
  } catch {
    subcommands = null;
  }
  if (subcommands === null || subcommands.length === 0) return !1;
  try {
    let mapped = excludedCommands.map(parseBashPermissionRule),
      included = stripQuotedRegions(e).replace(/\|\|/g, "").includes("|");
    if (hasCrossSegmentVariableAssignment(subcommands)) return !1;
    return subcommands.every((w, L) =>
      segmentMatchesExcludedCommand(w, mapped, settings, L === 0 || !included),
    );
  } catch {
    return !1;
  }
}
/**
 * 检测跨段变量赋值：某段赋值（NAME= 或 ${NAME:=}）的变量在其它段被引用，此时不按段做排除匹配。
 */
//@ chunk-e6aww6q8.js:1263289-1263772 layout
function hasCrossSegmentVariableAssignment(e) {
  let n = new Map();
  for (let [r, s] of e.entries()) {
    let h = [],
      match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(s.trim());
    if (match !== null && isSafeLeadingAssignment(s.trim())) h.push(match[1]);
    for (let S of s.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):?=/g)) h.push(S[1]);
    for (let S of h) {
      let w = n.get(S);
      if (w === void 0) n.set(S, new Set([r]));
      else w.add(r);
    }
  }
  if (n.size === 0) return !1;
  return e.some((r, s) => {
    let h = stripLiteralQuotedRegions(r);
    for (let [y, S] of n) {
      if (S.size === 1 && S.has(s)) continue;
      if (new RegExp(`\\$[=^~]*\\{?${y}\\b`).test(h)) return !0;
    }
    return !1;
  });
}
/**
 * 单段 Bash 命令是否命中排除表：规范化后与 excludedCommands 和动态禁用表比较，并尝试去掉 timeout/nice 等透明前缀的变体。
 */
//@ chunk-e6aww6q8.js:1263772-1264461 layout
function segmentMatchesExcludedCommand(e, n, r, s) {
  let trimmed = e.trim();
  if (!l4t(e) && isSafeLeadingAssignment(trimmed)) return !0;
  let y;
  if (r) {
    let ke = stripWrapperCommandPrefixes(trimmed, r),
      we = stripTrustedWrappers(ke);
    if (
      ((y = { input: ke, normalized: we, coverable: prependModeCharacterToInput(we, trimmed, e, s) }),
      y.coverable)
    ) {
      if (r.substrings.some((substring) => we.includes(substring))) return !0;
      let Ee = NR(we);
      if (Ee && r.commands.includes(Ee)) return !0;
    }
  }
  if (n.length === 0) return !1;
  let S = y?.input === trimmed ? y : void 0,
    w = S?.normalized ?? stripTrustedWrappers(trimmed);
  if (!(S?.coverable ?? prependModeCharacterToInput(w, trimmed, e, s))) return !1;
  let G = [w],
    q = yLo(trimmed);
  if (q !== "") G.push(`${q}${w}`);
  let Z = new Set(G),
    Se = 0;
  while (Se < G.length) {
    let ke = G.length;
    for (let we = Se; we < ke; we++) {
      let Ee = G[we],
        Ae = RQ(Ee);
      if (!Z.has(Ae)) (G.push(Ae), Z.add(Ae));
      let Ie = pqe(Ee);
      if (!Z.has(Ie)) (G.push(Ie), Z.add(Ie));
    }
    Se = ke;
  }
  return n.some((ke) => G.some((we) => matchesShellRule(ke, we)));
}
/**
 * PowerShell 命令是否命中排除表（拒绝以 - 开头、包装前缀、PowerShell 调用等不可靠形式）。
 */
//@ chunk-e6aww6q8.js:1264461-1264816 layout
function powershellMatchesExcludedCommand(e, n, r) {
  let trimmed = e.trim();
  if (trimmed === "" || UNSAFE_ARG_CHARS_RE.test(trimmed)) return !1;
  let parts = trimmed.split(BLANK_RE),
    y = parts[0];
  if (
    y.startsWith("-") ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(y)) ||
    classifyEnvWrapper(trimmed) !== "none" ||
    parts.some((S) => AT_VARIABLE_RE.test(S)) ||
    Gye(y, "powershell") ||
    isUnsandboxableProgram(y, "powershell") ||
    isDockerSafe(trimmed, parts, !0)
  )
    return !1;
  if (r) {
    if (r.substrings.some((substring) => trimmed.includes(substring))) return !0;
    if (r.commands.includes(y)) return !0;
  }
  return n.some((S) => matchesShellRule(S, trimmed));
}
/**
 * 严格沙箱模式下命令是否被 sandbox.excludedCommands 豁免：排除空命令、PowerShell 调用、包装前缀、变量赋值、glob/~ 展开等无法可靠匹配的形式后，与排除表比对。
 */
//@ chunk-e6aww6q8.js:1264816-1265381 layout
function matchesStrictModeExclusion(e, n) {
  let r = getTrustedExcludedCommands(),
    s = n === "bash" ? e.replace(/^[ \t\n]+|[ \t\n]+$/g, "") : e.trim();
  if (r.length === 0 || !s || SHELL_META_RE.test(s)) return !1;
  let filtered = s
      .split(BLANK_RE)
      .map((S) => S.replace(/['"\u2018-\u201B\u201C-\u201E]/g, ""))
      .filter((S) => S.length > 0),
    y = filtered[0] ?? "";
  if (
    Gye(y, "powershell") ||
    filtered.some((S) => AT_VARIABLE_RE.test(S)) ||
    UNSAFE_PATH_CHARS_RE.test(s) ||
    TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(y)) ||
    isUnsandboxableProgram(y, "powershell") ||
    /['"\u2018-\u201B\u201C-\u201E]/.test(s.split(/[ \t]+/)[0] ?? "") ||
    classifyEnvWrapper(s) !== "none" ||
    isDockerSafe(s, filtered, !0) ||
    (n === "bash" &&
      (/[\\*?[]|(?:^|[ \t=:])~|(?:^|[ \t])=|^!(?:[ \t]|$)/.test(s) || ENV_ASSIGNMENT_RE_2.test(s)))
  )
    return !1;
  return r.some((S) => matchesShellRule(parseBashPermissionRule(S), s));
}
//@ chunk-e6aww6q8.js:1265381-1265410 layout
var TENGU_NIFTY_RIPPLE = "tengu_nifty_ripple";
/**
 * GrowthBook tengu_nifty_ripple：Bash 是否也执行严格沙箱拒绝（sandboxPolicyRefusal 用）。
 */
//@ chunk-e6aww6q8.js:1265410-1265450 layout
function isStrictSandboxBashRefusalEnabled() {
  return readFlagWithOverride(TENGU_NIFTY_RIPPLE, { safe: !0 });
}
/**
 * 本会话沙箱是否开启过（wv.hasBeenOn），或设置了 CLAUDE_CODE_NANKEEN_KESTREL。
 */
//@ chunk-e6aww6q8.js:1265450-1265522 layout
function hasSandboxBeenOn() {
  return (
    Oai() || isEnvTruthy(getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CLAUDE_CODE_NANKEEN_KESTREL"))
  );
}
/**
 * 严格沙箱模式拒绝运行命令时的文案模板："The command did not run. Strict sandbox mode is on…"，并说明改设置是用户或管理员的事。
 */
//@ chunk-e6aww6q8.js:1265522-1265831 layout
function formatStrictSandboxRefusal(e, n) {
  return `The command did not run. Strict sandbox mode is on, so no command may run outside the sandbox, and ${e}. ${n} Changing sandbox settings is for the user or their administrator to decide, not you. So is running this command, or one that does the same, through another tool or program.`;
}
//@ chunk-e6aww6q8.js:1265831-1267983 facade-majority
function sandboxPolicyRefusal(e, n, r, s) {
  if (
    r ||
    e ||
    getPlatform() !== "windows" ||
    !SandboxManager.isSandboxEnabledInSettings() ||
    !SandboxManager.isPlatformInEnabledList() ||
    !SandboxManager.isStrictSandboxModeConfigured()
  )
    return null;
  let isSandboxingEnabled = SandboxManager.isSandboxingEnabled();
  if (s === "bash" && (isSandboxingEnabled || !hasSandboxBeenOn() || !isStrictSandboxBashRefusalEnabled()))
    return null;
  let y = matchesStrictModeExclusion(n, s),
    unsandboxedCommandsDisabled = getHostAgentPolicy().unsandboxedCommandsDisabled;
  if (y && !unsandboxedCommandsDisabled) return null;
  let w =
    "command matches a sandbox exclusion, but an exclusion exempts a command only where a permission prompt can approve the unsandboxed run, and none is available here";
  if (isSandboxingEnabled)
    return y
      ? formatStrictSandboxRefusal(`the ${w}`, "Here the command can run only inside the sandbox.")
      : formatStrictSandboxRefusal(
          "no sandbox.excludedCommands entry in user settings, managed settings or a --settings file exempts this command; an entry in a project's .claude/settings.json or settings.local.json does not count under strict mode",
          "Only an entry in one of those three counts.",
        );
  let L = isWindowsSandboxEnabled(),
    G = L ? SandboxManager.rememberedDependencyCheck()?.errors : void 0,
    q,
    Z;
  if (!L && hasSandboxBeenOn())
    ((q = "the sandbox has been switched off"),
      (Z = "Until the sandbox is switched back on, commands like this one stay refused in this session."));
  else if (!L)
    ((q = "no sandbox is available on this computer"),
      (Z = "Only whoever manages the user's sandbox settings can change what strict mode allows here."));
  else if (G === void 0)
    ((q = "the sandbox is not ready in this session"),
      (Z =
        "The user can restart Claude Code to have the sandbox checked again; if that does not help, the user's administrator has to look at the sandbox."));
  else if (G.some((Se) => Se.startsWith("srt-win")))
    ((q = "the sandbox's own program cannot be started on this computer"),
      (Z =
        "Reinstalling Claude Code may get the sandbox's program working; if not, the user's administrator has to fix it."));
  else if (G.length > 0)
    ((q = "the sandbox is not set up on this computer"),
      (Z =
        "The user can set up the sandbox with /sandbox install in Claude Code, or `claude sandbox install` in a terminal."));
  else
    ((q = "the sandbox failed to start in this session"),
      (Z = "The user can restart Claude Code to try starting the sandbox again."));
  if (y) return formatStrictSandboxRefusal(`${q}. The ${w}`, Z);
  return formatStrictSandboxRefusal(
    s === "bash" && matchesStrictModeExclusion(n, "powershell")
      ? `${q}. The command matches a sandbox exclusion, but Bash would read part of it differently, so the exclusion does not cover it`
      : q,
    Z,
  );
}
/**
 * 单条已解析规则（prefix/exact/wildcard）是否匹配命令文本。
 */
//@ chunk-e6aww6q8.js:1267983-1268149 layout = filterRulesByContentsMatchingInput (1)
function matchesShellRule(e, n) {
  switch (e.type) {
    case "prefix":
      return n === e.prefix || n.startsWith(e.prefix + " ");
    case "exact":
      return n === e.command;
    case "wildcard":
      return yQ(e.pattern, n);
  }
}
/**
 * 决定这次 shell 调用是否进沙箱：强制沙箱环境直接 true；沙箱未启用 false；Windows bash 无可用实现 false；dangerouslyDisableSandbox 仅在允许非沙箱命令（或用户手动 ! 命令）且未被强制时生效；命中 excludedCommands 设置的命令不进沙箱。
 */
//@ chunk-e6aww6q8.js:1268149-1268611 facade-majority = shouldUseSandbox (0.465)
function shouldUseSandbox(e, n) {
  if (isScrubEnabled() && isScrubSandboxAvailable()) return !0;
  if (!SandboxManager.isSandboxingEnabled()) return !1;
  if ((e.shellType ?? "bash") === "bash" && getPlatform() === "windows" && getGitBashPathCached() === null)
    return !1;
  let r =
    n?.disableUnsandboxedCommands === !0 ||
    getHostAgentPolicy().unsandboxedCommandsDisabled ||
    env.CLAUDE_CODE_EVAL_CONFINED;
  if (
    e.dangerouslyDisableSandbox &&
    !r &&
    (n?.userTypedShellDispatch === !0 || SandboxManager.areUnsandboxedCommandsAllowed())
  )
    return !1;
  if (!e.command) return Boolean(r);
  if (!r && containsExcludedCommand(e.command, e.shellType ?? "bash")) return !1;
  return !0;
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
  ENV_ASSIGNMENT_RE_2,
};
