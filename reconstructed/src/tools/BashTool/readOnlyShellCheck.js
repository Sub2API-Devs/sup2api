/**
 * tools/BashTool/readOnlyShellCheck.ts
 *
 * 2.1.316 新增：基于 Bash 解析器的只读命令判定（served shell 行、settings 文件写入、simctl 等应用操作、cd/pushd 处理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-whwptcwy.js (31)
 * attribution: placement 31
 */
import { join, basename, isAbsolute, resolve } from "path";
import { homedir } from "os";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { DIt } from "../../utils/bash/bashReadingFlags.js";
import {
  parseForSecurity,
  parseForSecurityFromAst,
  isExecInfluencingVar,
  EVAL_LIKE_BUILTINS,
  ZSH_DANGEROUS_BUILTINS,
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  UNHANDLED_EXEC_WRAPPERS,
  containsAnyPlaceholder,
} from "../../utils/bash/ast.js";
import { parseCommandRaw, PARSE_ABORTED, rU } from "../../utils/bash/parser.js";
import { LEGACY_CONFIG_JSON } from "../../utils/env.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "../../utils/auth.js";
import { findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import {
  isHostPersonOnlyCircuitBreaker,
  isServedUnplaceableCircuitBreaker,
} from "../../types/permissions.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { isReadOnlyCommand as isReadOnlyCommand_2 } from "../PowerShellTool/readOnlyValidation.js";
import { parsePowerShellCommand } from "../../utils/powershell/parser.js";
import { logError } from "../../utils/log.js";
import { claudeStateFilePaths, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";
import { OAUTH_GLOBAL_FILE_SUFFIXES } from "../../constants/oauth.js";
import {
  settingsLocationPaths,
  settingsTextNeedles,
  SETTINGS_FILE_BASENAMES,
  settingsDirectoryWords,
  normalizeCaseForComparison,
  checkPathSafetyForAutoEdit,
} from "../../utils/permissions/filesystem.js";
import { tildify } from "../../utils/path.js";
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { $dt, BIt, Ndt } from "../../utils/bash/bashParserFlags.js";
import { getWriteTargetsForAstCommand, stripWrappersFromArgvForPaths } from "./pathValidation.js";
import { unwrapCommandArgv } from "./bashPermissions.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { validatePath } from "../../utils/permissions/pathValidation.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { Lu } from "../../utils/networkPaths.js";
import { getPlatform } from "../../utils/platform.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-whwptcwy.js:1083-1111 placement
var TENGU_VIOLIN_LINING = "tengu_violin_lining";
//@ chunk-whwptcwy.js:1111-1149 placement
function nLe() {
  return readFlagWithOverride(TENGU_VIOLIN_LINING, { safe: !0 });
}
/**
 * 解析命令（解析器放弃时标为 too-complex）。
 */
//@ chunk-whwptcwy.js:1149-1405 placement
async function parseShellCommand(e) {
  return DIt(async () => {
    if (!nLe()) return parseForSecurity(e);
    let n = await parseCommandRaw(e);
    if (n === PARSE_ABORTED && e.trim() !== "")
      return { kind: "too-complex", reason: "the parser gave up on the command" };
    return n === null
      ? { kind: "simple", commands: [], bareAssignmentNames: [] }
      : parseForSecurityFromAst(e, n);
  });
}
//@ chunk-whwptcwy.js:1505-1542 placement
var ee = 16,
  W = 64,
  TENGU_NIFTY_PINE = "tengu_nifty_pine";
//@ chunk-whwptcwy.js:1542-1595 placement
function P(e) {
  return isExecInfluencingVar(e) || e === "PWD" || e === "OLDPWD";
}
//@ chunk-whwptcwy.js:1595-1663 placement
function G(e) {
  return !/^(?:LANG|LANGUAGE|LC_[A-Z]+)$/i.test(e) && P(e);
}
/**
 * 声明命令集合、可执行代码的命令集合（eval 类、zsh 危险内建、shell 程序、包装命令、xargs、parallel），Claude 配置目录下的敏感文件名（.config.json、.credentials.json、.device-keys.json），以及开关名 tengu_toasty_hammock。属只读命令判定的辅助模块。
 */
//@ chunk-whwptcwy.js:1663-1845 placement = DECLARATION_COMMANDS (0.701)
var DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "readonly", "local", "unset"]),
  EXEC_CAPABLE_COMMANDS = new Set([
    ...EVAL_LIKE_BUILTINS,
    ...ZSH_DANGEROUS_BUILTINS,
    ...SHELL_PROGRAM_NAMES,
    ...TRANSPARENT_LAUNCHER_NAMES,
    ...UNHANDLED_EXEC_WRAPPERS,
    "xargs",
    "parallel",
  ]),
  CLAUDE_HOME_SECRET_FILE_NAMES = [LEGACY_CONFIG_JSON, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME],
  TENGU_TOASTY_HAMMOCK = "tengu_toasty_hammock";
//@ chunk-whwptcwy.js:1845-1917 placement
function M(e) {
  return e === "[" || e === "[[" || /^[A-Za-z0-9_.+:~/-]+$/.test(e);
}
//@ chunk-whwptcwy.js:1917-2286 placement
async function shouldBypassAskForReadOnly(e, n, t, r) {
  let s =
    t.behavior === "ask" &&
    findSafetyCheckReason(t.decisionReason, isHostPersonOnlyCircuitBreaker) !== void 0;
  if (e.name === BASH_TOOL_NAME) {
    if (typeof n.command !== "string") return "uncertain";
    let i = await classifyServedShellLine(n.command, r, s);
    return i === "none" &&
      t.behavior === "ask" &&
      findSafetyCheckReason(t.decisionReason, isServedUnplaceableCircuitBreaker) !== void 0
      ? "uncertain"
      : i;
  }
  if (e.name !== POWERSHELL_TOOL_NAME) return "none";
  if (s) return "settings";
  return t.behavior === "ask" && SAFETY_CHECK_FIELDS(t) ? "uncertain" : "none";
}
/**
 * 判断托管服务的命令行是否会写入受保护路径（Bash/PowerShell 且非只读）。
 */
//@ chunk-whwptcwy.js:2286-2464 placement
async function servedLineTouchesProtectedPath(e, n, t, r = !1) {
  if (
    (e.name !== BASH_TOOL_NAME && e.name !== POWERSHELL_TOOL_NAME) ||
    !touchesProtectedPath(n, "file") ||
    !(await isServedLineWriting(e, n, t))
  )
    return !1;
  let command = n.command;
  return !(
    r &&
    e.name === BASH_TOOL_NAME &&
    typeof command === "string" &&
    (await isReadOnlyCommand(command))
  );
}
/**
 * 判断托管服务的命令是否会写入（PowerShell 按解析结果，其他用工具的 isReadOnly）。
 */
//@ chunk-whwptcwy.js:2464-2710 placement
async function isServedLineWriting(e, n, t) {
  try {
    let command = n.command;
    return e.name === POWERSHELL_TOOL_NAME && typeof command === "string"
      ? !isReadOnlyCommand_2(command, await parsePowerShellCommand(command))
      : !e.isReadOnly(n, t);
  } catch (error) {
    return (
      logError(
        Error("a served shell line's read-only check threw; the line counts as not read-only", {
          cause: error,
        }),
      ),
      !0
    );
  }
}
/**
 * 列出受保护的设置与密钥文件路径，以及全局 OAuth 配置文件名。
 */
//@ chunk-whwptcwy.js:2710-2842 placement
function getProtectedSettingsPaths() {
  return {
    paths: [
      ...claudeStateFilePaths(),
      ...getClaudeConfigDirs().flatMap((e) => CLAUDE_HOME_SECRET_FILE_NAMES.map((n) => join(e, n))),
    ],
    globalConfigNames: OAUTH_GLOBAL_FILE_SUFFIXES.map((e) => `.claude${e}.json`),
  };
}
//@ chunk-whwptcwy.js:2842-3109 placement
var SIMCTL_APP_VERBS = {
    simctl: ["launch", "terminate", "uninstall", "get_app_container", "appinfo", "privacy"],
    open: ["-b"],
    defaults: ["read", "read-type", "write", "delete"],
  },
  V = String.raw`(?:[a-z][a-z0-9_-]*\.){2,}claude`,
  regExp = new RegExp(`^${V}$`, "i"),
  ie = /[|`\\(]|\$[{_]|\$BASH|<<|\bfunction\b/;
/**
 * 判断命令是否只读（简单命令、无赋值、目标不是设置文件）。
 */
//@ chunk-whwptcwy.js:3109-4253 placement
async function isReadOnlyCommand(e) {
  if (ie.test(e)) return !1;
  try {
    let n = await parseShellCommand(e);
    if (n.kind !== "simple" || n.bareAssignmentNames.some(P)) return !1;
    let t = [],
      replaced = e.replace(
        new RegExp(String.raw`(^|\s)(${V})(?=$|[\s;&])`, "gi"),
        (o, a, f) => (t.push(f), `${a}APPID`),
      ),
      s = [],
      i = 0;
    for (let { argv: argv, envVars: envVars, redirects: redirects } of n.commands) {
      if (
        envVars.some((m) => P(m.name)) ||
        redirects.some(
          ({ op: op, target: target }) =>
            target !== "/dev/null" && !(op === ">&" && (target === "1" || target === "2")),
        )
      )
        return !1;
      let u = argv[0],
        p =
          u === "simctl" ? 0 : (u === "xcrun" || u === "/usr/bin/xcrun") && argv[1] === "simctl" ? 1 : void 0,
        g = p === void 0 ? void 0 : argv[p + 1],
        S = p !== void 0 && g !== void 0 && SIMCTL_APP_VERBS.simctl.includes(g) ? p + 1 : void 0,
        h =
          (u === "defaults" || u === "/usr/bin/defaults") &&
          argv[1] !== void 0 &&
          SIMCTL_APP_VERBS.defaults.includes(argv[1]),
        d = u === "open" || u === "/usr/bin/open";
      if (p === void 0 && !h && !d && u !== void 0 && u !== "sleep") return !1;
      for (let [m, y] of argv.entries()) {
        if (!regExp.test(y)) continue;
        s.push(y);
        let E = argv[m - 1];
        if (
          (S !== void 0 && m > S) ||
          (h && m === 2) ||
          (d && E !== void 0 && SIMCTL_APP_VERBS.open.includes(E))
        )
          i += 1;
      }
    }
    return (
      t.length > 0 &&
      i === s.length &&
      t.toSorted().join(" ") === s.toSorted().join(" ") &&
      !touchesProtectedPath({ command: replaced }, "file")
    );
  } catch (error) {
    return (
      logError(
        Error("reading a served shell line's app identifiers threw; the line counts as naming settings", {
          cause: error,
        }),
      ),
      !1
    );
  }
}
//@ chunk-whwptcwy.js:4253-5072 placement
function touchesProtectedPath(e, n) {
  let command = e.command;
  if (typeof command !== "string") return !0;
  let { files: files, dirs: dirs } = settingsLocationPaths(),
    i = n !== "file_or_folder",
    o = n === "own_file",
    flattened = dirs.flatMap((d) => [d, tildify(d)]),
    f = getProtectedSettingsPaths(),
    u = i ? f.paths : [],
    p = [
      ...(o ? [] : [...settingsTextNeedles(), "managed-settings"]),
      ...(i ? f.globalConfigNames : [...SETTINGS_FILE_BASENAMES, ...flattened]),
      ...[...(o ? [] : files), ...u].flatMap((d) => [d, tildify(d)]),
    ],
    g = settingsDirectoryWords(),
    S = i
      ? [...(o ? [] : SETTINGS_FILE_BASENAMES), ...CLAUDE_HOME_SECRET_FILE_NAMES]
      : files.map((d) => basename(d)).filter((d) => d.includes("."));
  return ["", "/"].some((d) => {
    let m = v(command, d);
    if (p.some((_) => m.includes(v(_, d)))) return !0;
    let any = g.some((_) => new RegExp(`${urlPatternToRegex(v(_, d))}(?![a-z0-9_])`).test(m)),
      any_2 = S.some((_) => new RegExp(`(?<![a-z0-9_])${urlPatternToRegex(v(_, d))}(?![a-z0-9_])`).test(m));
    if (!i) return any || any_2;
    return (
      (any_2 && (any || flattened.some((_) => m.includes(v(_, d))))) ||
      (o ? [] : [...g, ...flattened]).some((_) =>
        new RegExp(
          `${urlPatternToRegex(v(_, d))}(?![a-z0-9_-])(?=((?:/+(?:\\.(?![a-z0-9_.-]))?)*))\\1(?!\\.?[a-z0-9_-])`,
        ).test(m),
      )
    );
  });
}
//@ chunk-whwptcwy.js:5072-5159 placement
function v(e, n) {
  return normalizeCaseForComparison(e.normalize("NFKC")).replace(/['"`]/g, "").replaceAll("\\", n);
}
//@ chunk-whwptcwy.js:5159-5520 placement
function SAFETY_CHECK_FIELDS(e) {
  let decisionReason = e.decisionReason;
  if (decisionReason?.type === "subcommandResults") {
    for (let t of decisionReason.reasons.values())
      if (t.behavior === "ask" && SAFETY_CHECK_FIELDS(t)) return !0;
    return !1;
  }
  if (decisionReason === void 0) return e.blockedPath === void 0;
  if (decisionReason.type === "sandboxOverride")
    return decisionReason.replaces !== void 0 && SAFETY_CHECK_FIELDS(decisionReason.replaces);
  if (decisionReason.type === "safetyCheck" && !isHostPersonOnlyCircuitBreaker(decisionReason))
    return isServedUnplaceableCircuitBreaker(decisionReason) || e.blockedPath === void 0;
  return decisionReason.type === "other";
}
/**
 * 对 served shell 行做只读检查（检查抛错时视为不确定）。
 */
//@ chunk-whwptcwy.js:5520-6876 placement
async function classifyServedShellLine(e, n, t = !1) {
  let r = $dt(),
    { result: s, fired: fired } = await BIt(r, () => parseShellCommand(e));
  if (s.kind !== "simple")
    return fired && !r && (await Ndt(() => classifyServedShellLine(e, n, t))) === "settings"
      ? "settings"
      : "uncertain";
  let o = s.bareAssignmentNames.some(P) || s.laterLoopPassesDiffer === !0,
    a = [n],
    f = !0,
    u = !1,
    p = !1,
    g = !0,
    S = 0,
    h = s.hasLoop !== !1 && readFlagWithOverride(TENGU_TOASTY_HAMMOCK, { safe: !0 });
  for (let command of s.commands) {
    let {
      simple: simple,
      wrapperWords: wrapperWords,
      pathSpelled: pathSpelled,
      doubt: doubt,
    } = describeSubcommandResults(command);
    if (doubt || hasPlaceholderInArgs(simple) || u) o = !0;
    let w = resolveDirectoryChange(simple, a);
    if (w !== void 0 && h) o = !0;
    if (w === "unknown") f = !1;
    else if (w !== void 0) {
      if (((a = w), simple.argv.slice(1).some(hasDotDotAfterSegment))) f = !1;
    }
    if (w !== void 0 && !isDirectoryChangeCommand(simple)) ((f = !1), (u = !0));
    let A = getWriteTargetsForAstCommand(simple);
    if (A.writesUnseen) o = !0;
    if (!A.known && w === void 0 && simple.argv.length > 0) g = !1;
    let N = (c) => (isAbsolute(c) || c.startsWith("~") ? [n] : a),
      flattened = [
        ...wrapperWords,
        ...(A.known && !pathSpelled ? [] : simple.argv.slice(1)),
        ...simple.envVars.map((envVar) => envVar.value),
      ].flatMap((c) => getArgPathVariants(c));
    if (!A.known && w === void 0 && simple.argv.length > 0 && a.some((c) => isHostPersonOnlyPath(".", c)))
      o = !0;
    if (
      !f &&
      flattened.some(
        (c) =>
          c !== "" && !isAbsolute(c) && !c.startsWith("~") && isHostPersonOnlyPath(c, resolve(n, ".claude")),
      )
    )
      o = !0;
    for (let c of [...flattened, ...A.landings])
      if (c !== "" && N(c).some((R) => isHostPersonOnlyPath(c, R))) o = !0;
    for (let c of A.written) {
      if ((S++, S > W)) return "uncertain";
      if (containsAnyPlaceholder(c) || (N(c) === a && !f)) o = !0;
      for (let R of N(c)) {
        let k = classifyWriteTarget(c, R);
        if (k === "settings") return "settings";
        if (k === "uncertain") o = !0;
      }
    }
    for (let copySource of A.copySources) {
      if ((S++, S > W)) return "uncertain";
      if (N(copySource).some((R) => classifyWriteTarget(copySource, R) === "settings")) p = !0;
      else if (N(copySource).some((R) => isServedUnplaceablePath(copySource, R))) o = !0;
    }
  }
  if (o || (t && !(p && g))) return "uncertain";
  return "none";
}
//@ chunk-whwptcwy.js:6876-6948 placement
var O = new Set(["HOME", "CDPATH", "PWD", "OLDPWD"]),
  ae = /^-[^-]*[CD]|^--chd/;
//@ chunk-whwptcwy.js:6948-7778 placement
async function classifyCommandForSandbox(e, n) {
  let t = await parseShellCommand(e);
  if (t.kind !== "simple" || t.hasLoop !== !1) return "unparsed";
  let any = t.bareAssignmentNames.some((bareAssignmentName) => O.has(bareAssignmentName)),
    s = [n],
    i = !1,
    o = [];
  for (let command of t.commands) {
    if (
      command.envVars.some((envVar) => O.has(envVar.name)) ||
      command.argv.some((h) => h.includes("=") && O.has(h.split(/\+?=/, 1)[0] ?? ""))
    )
      any = !0;
    let { simple: simple, wrapperWords: wrapperWords } = describeSubcommandResults(command),
      p = i,
      g = resolveDirectoryChange(simple, s);
    if (g === "unknown" || (g !== void 0 && (any || simple.argv.slice(1).some(hasDotDotAfterSegment))))
      i = !0;
    if (g !== void 0 && !isDirectoryChangeCommand(simple)) i = !0;
    if (g !== void 0 && g !== "unknown") s = g;
    let any_2 = wrapperWords.some((h) => ae.test(h));
    for (let h of [
      { list: command.argv, directories: any_2 ? [] : s, mayBeElsewhere: p || any_2 },
      {
        list: [
          ...command.envVars.map((envVar) => envVar.value),
          ...command.redirects
            .filter((redirect) => redirect.op !== "<<" && redirect.op !== "<<<")
            .map((d) => d.target),
        ],
        directories: s,
        mayBeElsewhere: p,
      },
    ])
      for (let d of h.list)
        for (let m of getArgPathVariants(d))
          o.push({ word: m, directories: h.directories, mayBeElsewhere: h.mayBeElsewhere });
  }
  return o;
}
//@ chunk-whwptcwy.js:7778-7928 placement
function getArgPathVariants(e) {
  return [
    e,
    ...(e.includes("=") ? [e.slice(e.indexOf("=") + 1)] : []),
    ...(/^-[^-]./.test(e) ? Array.from({ length: e.length - 2 }, (n, t) => e.slice(t + 2)) : []),
  ];
}
//@ chunk-whwptcwy.js:7928-8543 placement
function describeSubcommandResults(e) {
  let [n, ...t] = e.argv;
  if (n === void 0) return { simple: e, wrapperWords: [], pathSpelled: !1, doubt: !1 };
  let r = [rU(n), ...t],
    s = stripWrappersFromArgvForPaths(unwrapCommandArgv(r)),
    i = r.length - s.length,
    o = i >= 0 && s.every((p, g) => p === r[i + g]),
    a = o ? r.slice(0, i) : r,
    f = o && i === 0 ? n : s[0],
    u = f === void 0 ? void 0 : rU(f);
  return {
    simple: o && i === 0 && n === r[0] ? e : { ...e, argv: s, text: shellQuoteArgs(s) },
    wrapperWords: a,
    pathSpelled: n !== r[0] || (f !== void 0 && f !== u) || a.some((p) => p !== rU(p)),
    doubt:
      !o ||
      !M(n) ||
      [...a, ...(f === void 0 ? [] : [f])].some(containsAnyPlaceholder) ||
      a.some(
        (p) =>
          (p.startsWith("-") && p !== "-" && p !== "--") ||
          G(/^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(p)?.[1] ?? ""),
      ) ||
      (f !== void 0 && u !== void 0 && (!M(f) || u.startsWith("-") || EXEC_CAPABLE_COMMANDS.has(u))),
  };
}
//@ chunk-whwptcwy.js:8543-8704 placement = spawnScriptArgs (0.635)
function hasPlaceholderInArgs(e) {
  let [n, ...t] = e.argv;
  return (
    e.envVars.some((envVar) => G(envVar.name)) ||
    (n !== void 0 &&
      DECLARATION_COMMANDS.has(n) &&
      t.some((r) => {
        let s = r.split(/\+?=/, 1)[0] ?? "";
        return containsAnyPlaceholder(s) || P(s);
      }))
  );
}
//@ chunk-whwptcwy.js:8704-8993 placement
function classifyWriteTarget(e, n) {
  let t = validatePath(e, n, getEmptyToolPermissionContext(), "write");
  if (t.allowed) return "none";
  if (t.decisionReason?.type === "safetyCheck") {
    if (isHostPersonOnlyCircuitBreaker(t.decisionReason)) return "settings";
    return isServedUnplaceableCircuitBreaker(t.decisionReason) ? "uncertain" : "none";
  }
  if (t.decisionReason?.type !== "other") return "none";
  return isHostPersonOnlyPath(e, n) ? "settings" : "uncertain";
}
//@ chunk-whwptcwy.js:8993-9117 placement
function isServedUnplaceablePath(e, n) {
  let t = validatePath(e, n, getEmptyToolPermissionContext(), "write");
  return (
    !t.allowed &&
    t.decisionReason?.type === "safetyCheck" &&
    isServedUnplaceableCircuitBreaker(t.decisionReason)
  );
}
/**
 * 判断路径是否只允许宿主用户本人编辑（命中仅限本人的安全熔断）。
 */
//@ chunk-whwptcwy.js:9117-9224 placement
function isHostPersonOnlyPath(e, n) {
  let t = resolve(n, Lu(getPlatform() === "windows" ? e.replaceAll("\\", "/") : e)),
    r = checkPathSafetyForAutoEdit(t, [t]);
  return !r.safe && isHostPersonOnlyCircuitBreaker(r);
}
//@ chunk-whwptcwy.js:9224-9705 placement
function resolveDirectoryChange(e, n) {
  let [t, ...r] = e.argv;
  if (t === "popd") return "unknown";
  if (t !== "cd" && t !== "chdir" && t !== "pushd") return;
  let s = [],
    i = !1;
  for (let u of r) {
    if (!i) {
      if (u === "--") {
        i = !0;
        continue;
      }
      if (u.startsWith("-") && u !== "-") continue;
      i = !0;
    }
    s.push(u);
  }
  let o = s[0];
  if (o === void 0) return t === "pushd" ? "unknown" : B(n, [homedir()]);
  if (
    s.length > 1 ||
    o === "-" ||
    (t === "pushd" && /^[+-]\d+$/.test(o)) ||
    containsAnyPlaceholder(o) ||
    classifyWriteTarget(o, n[0] ?? homedir()) === "uncertain"
  )
    return "unknown";
  let a = Lu(o),
    f = isAbsolute(a) ? [a] : n.map((u) => resolve(u, a));
  return B(n, [...f, ...f.flatMap(fe)]);
}
//@ chunk-whwptcwy.js:9705-10028 placement
function isDirectoryChangeCommand(e) {
  let [n, ...t] = e.argv;
  if (n !== "cd" && n !== "chdir" && n !== "pushd") return !0;
  if (!readFlagWithOverride(TENGU_NIFTY_PINE, { safe: !0 })) return !0;
  let r = [],
    s = !1;
  for (let i of t) {
    if (!s) {
      if (i === "--") {
        s = !0;
        continue;
      }
      if (i.startsWith("-") && i !== "-") {
        if (!/^-[qsLP]+$/.test(i)) return !1;
        continue;
      }
      s = !0;
    }
    r.push(i);
  }
  return r.length < 2 && (r[0] === void 0 || !/^[+-]\d+$/.test(r[0]));
}
//@ chunk-whwptcwy.js:10028-10146 placement
function hasDotDotAfterSegment(e) {
  let n = !1;
  for (let t of e.split(/[\\/]/))
    if (t === "..") {
      if (n) return !0;
    } else if (t !== "" && t !== ".") n = !0;
  return !1;
}
//@ chunk-whwptcwy.js:10146-10213 placement
function fe(e) {
  try {
    return getPathsForPermissionCheck(e).filter((n) => n !== e);
  } catch {
    return [];
  }
}
//@ chunk-whwptcwy.js:10213-10281 placement
function B(e, n) {
  let t = uniq([...e, ...n]);
  return t.length > ee ? "unknown" : t;
}

export {
  nLe,
  shouldBypassAskForReadOnly,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
  parseShellCommand,
  isReadOnlyCommand,
  classifyCommandForSandbox,
  getProtectedSettingsPaths,
  isHostPersonOnlyPath,
  isServedLineWriting,
};
