/**
 * services/homeSeed/deviceRuleFilter.ts
 *
 * 2.1.316 新增：home seed 中设备相关规则过滤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t58ha4ac.js (38)
 * attribution: placement 38
 */
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { isLocalHostname, isLocalhostName, isPrivateNetworkName } from "../../utils/localHostnames.js";
import {
  hasWildcard,
  matchRulePattern,
  parseRuleString,
} from "../../utils/permissions/permissionRuleParser.js";
import {
  DEVICE_SERVER_ID,
  POSIX_ROOT,
  PERMISSION_BEHAVIORS,
  getRuleToolFamily,
  MAX_RULES_PER_BEHAVIOR,
  classifyPortableRule,
  PATH_RULE_TOOLS,
  ATTRIBUTION_KEYS,
  looksLikeCredentialIncludingNul,
  MAX_STRING_SETTING_LENGTH,
  CONTROL_CHAR_RE,
  MAX_ATTRIBUTION_LENGTH,
  UNSAFE_TEXT_CHAR_RE,
} from "./portableSettings.js";
import { patternWithRootFor, normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { countWhere } from "../../utils/collections.js";
import { getSettingsFieldSchema } from "../../utils/settings/types.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-t58ha4ac.js:12110-13347 placement
/**
 * 设备规则过滤用到的安全参数记号、网络/数据库客户端命令、命令包装器（sudo、env、timeout 等）与公共 git 主机集合。
 */
var SAFE_ARG_TOKEN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_ARG_RE;
var NETWORK_COMMANDS;
var COMMAND_WRAPPERS;
var PUBLIC_GIT_HOSTS;
deferInit("chunk-t58ha4ac.js:12110", () => {
  SAFE_ARG_TOKEN = "[A-Za-z0-9_.@*+][A-Za-z0-9_.@*+:~-]*";
  SAFE_ARG_RE = new RegExp(
    `^(?:(?:\\./)?${SAFE_ARG_TOKEN}(?:/${SAFE_ARG_TOKEN})*/?|-{1,2}(?:[A-Za-z0-9][A-Za-z0-9_.-]*)?)$`,
  );
  NETWORK_COMMANDS = new Set([
    "curl",
    "wget",
    "nc",
    "ncat",
    "netcat",
    "telnet",
    "ssh",
    "scp",
    "sftp",
    "rsync",
    "ping",
    "ping6",
    "traceroute",
    "dig",
    "nslookup",
    "host",
    "socat",
    "psql",
    "mysql",
    "redis-cli",
    "mongosh",
    "ftp",
    "http",
    "https",
    "xh",
    "nmap",
    "mtr",
    "mosh",
    "grpcurl",
    "websocat",
    "aria2c",
    "w3m",
    "lynx",
    "whois",
    "iwr",
    "irm",
    "invoke-webrequest",
    "invoke-restmethod",
    "test-netconnection",
    "tnc",
    "test-connection",
    "resolve-dnsname",
    "pg_dump",
    "pg_dumpall",
    "pg_restore",
    "pg_isready",
    "createdb",
    "dropdb",
    "mysqldump",
    "mysqladmin",
    "mariadb",
    "mariadb-dump",
    "mongo",
    "mongodump",
    "mongorestore",
    "mongoexport",
    "mongoimport",
    "redis-benchmark",
    "pgcli",
    "mycli",
    "mysqlsh",
    "clickhouse-client",
    "mongostat",
    "mongotop",
    "mongofiles",
  ]);
  COMMAND_WRAPPERS = new Set([
    "sudo",
    "doas",
    "env",
    "time",
    "timeout",
    "gtimeout",
    "watch",
    "xargs",
    "command",
    "builtin",
    "exec",
    "nohup",
    "nice",
    "caffeinate",
    "setsid",
    "stdbuf",
    "ionice",
    "chrt",
    "strace",
    "unbuffer",
    "sshpass",
    "proxychains",
    "proxychains4",
    "torsocks",
    "tsocks",
    "taskset",
    "numactl",
    "setpriv",
    "flock",
    "runuser",
  ]);
  PUBLIC_GIT_HOSTS = new Set([
    GITHUB_HOST,
    "gitlab.com",
    "bitbucket.org",
    "ssh.dev.azure.com",
    `ssh.${GITHUB_HOST}`,
    "altssh.gitlab.com",
    "altssh.bitbucket.org",
    "codeberg.org",
  ]);
});
//@ chunk-t58ha4ac.js:13347-13928 placement
/**
 * shell 允许规则能否在云端安全复用：所有参数都是安全记号，不含主机/IP、端口、盘符、~ 或上级路径等机器相关成分（绑定 localhost 的参数例外）。
 */
function isPortableShellAllowRule(ruleContent, toolName) {
  if (/(?:^|[\s:=])\d{4,}:\*$/.test(ruleContent.trim())) return false;
  let filtered = ruleContent
    .trim()
    .replace(/(?::\*|\s+\*)$/, "")
    .split(/\s+/)
    .filter((token) => token !== "");
  let networkCommandIndex = findNetworkCommandIndex(filtered);
  let isBindOnlyCommand =
    networkCommandIndex === null &&
    skipCommandWrappers(filtered, 0) !== null &&
    !filtered.some((token) => isNetworkCommand(token) || /[*/\\]/.test(token));
  return (
    filtered.length > 0 &&
    filtered.every(
      (token, index) =>
        (isBindOnlyCommand && isLocalBindArg(filtered, index)) ||
        (SAFE_ARG_RE.test(token) &&
          !token.endsWith(":") &&
          !token.split(/[/:@]/).some(isWildcardOnlyToken) &&
          !(token.startsWith("-") && token.includes("..")) &&
          !/\*[A-Za-z]*\.\./.test(token) &&
          !/^\*+-[A-Za-z]*\.\.(?:\/|$)/.test(token) &&
          !/^~|:\**~/.test(token) &&
          !/^[A-Za-z]:(?!:)/.test(token) &&
          !/[:@]\//.test(token) &&
          !(toolName === POWERSHELL_TOOL_NAME && /^\**[A-Za-z][\w*]*:/.test(token)) &&
          !hasHostLikeToken(
            token,
            networkCommandIndex !== null && index > networkCommandIndex && !token.startsWith("-"),
          )),
    )
  );
}
//@ chunk-t58ha4ac.js:13928-14084 placement
var BIND_HOST_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BIND_HOST_ENV_VARS;
deferInit("chunk-t58ha4ac.js:13928", () => {
  BIND_HOST_FLAGS = new Set([
    "--host",
    "--hostname",
    "--bind",
    "--listen",
    "--addr",
    "--address",
    "-H",
    "-b",
  ]);
  BIND_HOST_ENV_VARS = new Set(["HOST", "HOSTNAME", "BIND", "BIND_ADDR", "BIND_ADDRESS"]);
});
//@ chunk-t58ha4ac.js:14084-14313 placement
function isLocalBindArg(argv, index) {
  let arg = argv[index] ?? "";
  let match = /^(--[a-z-]+)=(.+)$/.exec(arg);
  if (match !== null) return BIND_HOST_FLAGS.has(match[1] ?? "") && isLoopbackHost(match[2] ?? "");
  let match_2 = /^([A-Z_]+)=(.+)$/.exec(arg);
  if (match_2 !== null) return BIND_HOST_ENV_VARS.has(match_2[1] ?? "") && isLoopbackHost(match_2[2] ?? "");
  return index > 0 && BIND_HOST_FLAGS.has(argv[index - 1] ?? "") && isLoopbackHost(arg);
}
//@ chunk-t58ha4ac.js:14313-14551 placement
function isLoopbackHost(host) {
  let lower = host.toLowerCase();
  return [lower, lower.replace(/:\d{1,5}$/, "")].some(
    (candidate) =>
      candidate === "0.0.0.0" ||
      candidate === "127.0.0.1" ||
      candidate === "localhost" ||
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+localhost$/.test(candidate) ||
      candidate === "::" ||
      candidate === "[::]" ||
      candidate === "::1" ||
      candidate === "[::1]",
  );
}
//@ chunk-t58ha4ac.js:14551-14760 placement
function findNetworkCommandIndex(tokens) {
  let wrapperIndex = skipCommandWrappers(tokens, 0);
  if (wrapperIndex !== null && isNetworkCommand(tokens[wrapperIndex] ?? "")) return wrapperIndex;
  let index = tokens.findIndex(
    (token, index) => index > (wrapperIndex ?? 0) && /^-(?:exec|execdir|ok|okdir)$/.test(token),
  );
  if (index >= 0) {
    let wrapperIndex = skipCommandWrappers(tokens, index + 1);
    return wrapperIndex !== null && isNetworkCommand(tokens[wrapperIndex] ?? "") ? wrapperIndex : null;
  }
  return null;
}
//@ chunk-t58ha4ac.js:14760-14842 placement
/**
 * 判断命令名是否属于网络类命令（curl、wget 等，忽略 .exe/.cmd 后缀）。
 */
function isNetworkCommand(command) {
  return NETWORK_COMMANDS.has(command.toLowerCase().replace(/\.(?:exe|cmd|bat|ps1)$/, ""));
}
//@ chunk-t58ha4ac.js:14842-15375 placement
/**
 * 跳过环境变量赋值与命令包装器（及其参数、时长），返回真正命令所在的下标。
 */
function skipCommandWrappers(argv, index) {
  let argList = argv[index];
  if (argList === undefined) return null;
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argList)) return skipCommandWrappers(argv, index + 1);
  let replaced = argList.toLowerCase().replace(/\.exe$/, "");
  if (!COMMAND_WRAPPERS.has(replaced)) return index;
  let next = index + 1;
  while (next < argv.length) {
    let arg = argv[next] ?? "";
    if (arg.startsWith("-")) {
      let takesValue =
        (/^(?:-[A-Za-z]|--[A-Za-z][A-Za-z-]*)$/.test(arg) ||
          ((replaced === "sudo" || replaced === "doas") && /^-[A-Za-z]+[ugUCDrtTph]$/.test(arg))) &&
        !(argv[next + 1] ?? "").startsWith("-") &&
        !isNetworkCommand(argv[next + 1] ?? "") &&
        !COMMAND_WRAPPERS.has((argv[next + 1] ?? "").toLowerCase().replace(/\.exe$/, ""));
      next += takesValue ? 2 : 1;
    } else if (/^\d[\d.]*[smhd]?$/.test(arg)) next += 1;
    else break;
  }
  return skipCommandWrappers(argv, next);
}
//@ chunk-t58ha4ac.js:15375-15457 placement
/**
 * 判断 token 是否只由 . 与 * 组成（通配写法）。
 */
function isWildcardOnlyToken(token) {
  return /^[.*]+$/.test(token) && !/^(?:\.|\.{3,}|\*{1,2}|\*\.\*)$/.test(token);
}
//@ chunk-t58ha4ac.js:15457-16668 placement
/**
 * 参数记号是否含主机/地址成分：端口号、IPv6、user@host 域名、本地主机名、IP 形式或带 * 的地址等。
 */
function hasHostLikeToken(token, hostContext = false) {
  let flagValueVariants = /^-[A-Za-z][A-Za-z0-9_.-]+$/.test(token)
    ? Array.from(
        {
          length: token.length - 2,
        },
        (token, end) => end + 2,
      )
        .filter((end) => /^[A-Za-z]+$/.test(token.slice(1, end)))
        .map((splitAt) => token.slice(splitAt))
    : [];
  let firstFlagValue = flagValueVariants[0];
  let hostContext_2 = hostContext || /[:@]/.test(token) || firstFlagValue !== undefined;
  let segments = token.startsWith("--")
    ? token
        .replace(/^--[^=]*=|^--/, "")
        .split(/[/:@]/)
        .filter((segment) => segment !== "")
    : token.startsWith("-")
      ? flagValueVariants
      : token.split(/[/:@]/).filter((segment) => segment !== "");
  let sliced = token.split("@").slice(token.startsWith("@") ? 2 : 1);
  return (
    (hostContext && token.includes("*")) ||
    token.split("/").some((part) => {
      let parts = part.split(":");
      return parts.length > 1 && parts.some((piece) => /^(?:\d{4,}|\*+)$/.test(piece));
    }) ||
    token
      .split(/[/@]/)
      .flatMap(stripSchemePrefixes)
      .some(
        (segment) =>
          /\d/.test(segment) &&
          /^[0-9a-f:*]+$/i.test(segment) &&
          (segment.includes("::") || countCharInString(segment, ":") >= 2),
      ) ||
    sliced.some((afterAt) => {
      let lower = afterAt.replace(/[/:].*$/, "").toLowerCase();
      if (PUBLIC_GIT_HOSTS.has(lower)) return false;
      return (
        /^[a-z0-9*-]+(?:\.[a-z0-9*-]+)*\.[a-z*][a-z0-9*-]*$/.test(lower) ||
        isLocalHostname(lower.replace(/\*/g, "")) ||
        /^(?:0+|0x[0-9a-f]*)$/.test(lower) ||
        (hostContext && lower !== "")
      );
    }) ||
    /^0+\//.test(token) ||
    (hostContext && /^0+:/.test(token)) ||
    segments.some(
      (segment, segmentIndex) =>
        looksLikeIpAddress(segment) ||
        ((hostContext || (firstFlagValue !== undefined && segmentIndex === 0)) &&
          !token.startsWith("--") &&
          /^(?:0+|0x[0-9a-f]*|[0-9a-fx]*\.[0-9a-fx.]*)$/i.test(segment) &&
          /\d/.test(segment)),
    ) ||
    (token.includes("*") &&
      (token.includes(":") ||
        segments.some(
          (segment) => /^[0-9a-fx.*]+$/i.test(segment) && /\d/.test(segment) && segment.includes("*"),
        ))) ||
    segments.some((segment) =>
      hostContext_2
        ? isLocalHostname(segment.replace(/\*/g, ""))
        : isLocalhostName(segment.replace(/\*/g, "")),
    )
  );
}
//@ chunk-t58ha4ac.js:16668-16783 placement
function stripSchemePrefixes(path) {
  let seen = [path];
  let current = path;
  for (;;) {
    let replaced = current.replace(/^[a-z][\w-]*:/i, "");
    if (replaced === current || replaced === "") return seen;
    seen.push(replaced);
    current = replaced;
  }
}
//@ chunk-t58ha4ac.js:16783-16994 placement
function looksLikeIpAddress(segment) {
  let replaced = segment.replace(/\.+$/, "");
  return (
    /^(?:(?:\d+|0x[0-9a-f]+)\.){3}(?:\d+|0x[0-9a-f]+)$/i.test(replaced) ||
    /^(?:127\.|0\d+\.|0x[0-9a-f]*\.)[0-9a-fx.]*$/i.test(replaced) ||
    /^0x[0-9a-f]+$/i.test(replaced) ||
    /^\d{8,}$/.test(replaced)
  );
}
//@ chunk-t58ha4ac.js:16994-17337 placement
/**
 * WebFetch 规则内容是否指向本地或私有主机（本地主机名、IP、通配域名等）。
 */
function isLocalWebDomainRule(ruleContent) {
  let replaced = ruleContent
    .replace(/^domain:/i, "")
    .trim()
    .toLowerCase()
    .replace(/%.*$/, "");
  let replaced_2 = replaced
    .replace(/\.+(?=(?::(?:\d+|\*))*$)/, "")
    .replace(/(?::(?:\d+|\*))+$/, "")
    .replace(/\.+$/, "");
  return (
    isLocalHostname(replaced_2) ||
    (replaced_2 === "*" && replaced_2 !== replaced) ||
    (/^[\[\]0-9a-fx.:*]+$/.test(replaced_2) && /[\d:]/.test(replaced_2)) ||
    (replaced_2.includes("*") && replaced_2 !== "*" && !/^\*\.[^*]+$/.test(replaced_2)) ||
    (/^\*\./.test(replaced_2) && isPrivateNetworkName(replaced_2.slice(2)))
  );
}
//@ chunk-t58ha4ac.js:17337-17450 placement
function isWindowsRootedPath(path) {
  return (
    path.startsWith("~\\") ||
    (path.startsWith("\\") && path[1] !== "!" && path[1] !== "#") ||
    /^[A-Za-z]:[/\\]/.test(path)
  );
}
//@ chunk-t58ha4ac.js:17450-17489 placement
/**
 * 规则是否命中远程设备服务器 id。
 */
function matchesDeviceServerId(toolName) {
  return hasWildcard(toolName) && matchRulePattern(toolName, DEVICE_SERVER_ID);
}
//@ chunk-t58ha4ac.js:17489-17720 placement
function classifyRulePathRoot(ruleContent) {
  let path = ruleContent.replace(/^\s+/, "").replace(/^[!#]/, "").trim();
  if (path.split("/").includes("..") || isWindowsRootedPath(path) || /^~[^/]/.test(path)) return "machine";
  if (path === "~" || path.startsWith("~/")) return "home";
  return patternWithRootFor(path, POSIX_ROOT).root !== null ? "machine" : "none";
}
//@ chunk-t58ha4ac.js:17720-17815 placement
/**
 * 设置里是否存在非空的 PreToolUse 钩子。
 */
function hasPreToolUseHooks(settings) {
  let hooks = isPlainObject(settings) ? getOwn(settings, "PreToolUse") : undefined;
  return Array.isArray(hooks) ? hooks.length > 0 : hooks != null;
}
//@ chunk-t58ha4ac.js:17815-18265 placement
/**
 * 按 allow/deny/ask 逐类筛选规则；allow 规则还要去掉被 PreToolUse 钩子覆盖的工具，必要时整体放弃 allow；返回筛选结果与合并计数。
 */
function filterPermissionRules(permissions, families, hasLostAnAllowEntryAtParse) {
  if (!isPlainObject(permissions))
    return {
      value: undefined,
      counts: emptyRuleCounts(),
    };
  let mapped = PERMISSION_BEHAVIORS.map((behavior) => {
    let filtered = filterBehaviorRules(getOwn(permissions, behavior), behavior);
    return behavior === "allow" && typeof families === "function"
      ? dropHookGuardedRules(filtered, families)
      : filtered;
  });
  let dropAllAllow =
    families === true ||
    hasLostAnAllowEntryAtParse ||
    mapped.some(({ behavior, counts, carveOutLost }) =>
      behavior === "allow" ? carveOutLost : countDroppedRules(counts) > 0,
    );
  let mapped_2 = mapped.map((group) =>
    group.behavior === "allow" && dropAllAllow ? dropAllRules(group) : group,
  );
  let reduced = mapped_2.reduce((acc, { behavior, rules }) => {
    if (rules.length > 0) acc[behavior] = rules;
    return acc;
  }, {});
  return {
    value: mapped_2.some(({ rules }) => rules.length > 0) ? reduced : undefined,
    counts: mapped_2.map(({ counts }) => counts).reduce(addRuleCounts),
  };
}
//@ chunk-t58ha4ac.js:18265-18373 placement
function countDroppedRules(counts) {
  return (
    counts.droppedRooted +
    counts.droppedDevice +
    counts.droppedInvalid +
    counts.droppedOverCap +
    counts.droppedCredential
  );
}
//@ chunk-t58ha4ac.js:18373-18656 placement
function dropHookGuardedRules(verdict, families) {
  let isGuarded = (rule) => getRuleToolFamily(parseRuleString(rule).toolName).some(families);
  let filtered = verdict.rules.filter(isGuarded);
  if (filtered.length === 0) return verdict;
  return {
    ...verdict,
    rules: verdict.rules.filter((rule) => !isGuarded(rule)),
    carveOutLost: verdict.carveOutLost || filtered.some(isNegatedRuleContent),
    counts: {
      ...verdict.counts,
      kept: verdict.counts.kept - filtered.length,
      droppedGuarded: verdict.counts.droppedGuarded + filtered.length,
    },
  };
}
//@ chunk-t58ha4ac.js:18656-18840 placement
function dropAllRules(verdict) {
  return {
    behavior: verdict.behavior,
    rules: [],
    carveOutLost: verdict.carveOutLost,
    counts: {
      ...verdict.counts,
      kept: 0,
      coveringDeviceTools: 0,
      droppedGuarded: verdict.counts.droppedGuarded + verdict.rules.length,
    },
  };
}
//@ chunk-t58ha4ac.js:18840-19622 placement
/**
 * 筛选一类规则：截断到上限、去重、逐条判定，统计保留数与各丢弃原因，并标记 allow 中是否丢失了例外规则。
 */
function filterBehaviorRules(rules, behavior) {
  let list = Array.isArray(rules) ? rules : [];
  let sliced = list.slice(0, MAX_RULES_PER_BEHAVIOR);
  let filtered = sliced.filter((rule) => typeof rule === "string");
  let uniqueRules = normalizeCaseForComparison_2(filtered);
  let uniqueSet = new Set(uniqueRules);
  let overCapCount = countWhere(
    list.slice(MAX_RULES_PER_BEHAVIOR),
    (rule) => typeof rule !== "string" || !uniqueSet.has(rule),
  );
  let mapped = uniqueRules.map((uniqueRule) => ({
    rule: uniqueRule,
    verdict: classifyPortableRule(uniqueRule, behavior),
  }));
  let filtered_2 = mapped.filter(({ verdict }) => isKeepVerdict(verdict));
  return {
    behavior,
    rules: filtered_2.map(({ rule }) => rule),
    carveOutLost:
      behavior === "allow" &&
      (overCapCount > 0 ||
        mapped.some(({ rule, verdict }) => !isKeepVerdict(verdict) && isNegatedRuleContent(rule))),
    counts: {
      kept: filtered_2.length,
      duplicates: filtered.length - uniqueRules.length + (list.length - sliced.length - overCapCount),
      droppedRooted: countVerdict(mapped, "rooted"),
      droppedDevice: countVerdict(mapped, "device"),
      droppedInvalid:
        countVerdict(mapped, "invalid") +
        (sliced.length - filtered.length) +
        (rules !== undefined && !Array.isArray(rules) ? 1 : 0),
      droppedOverCap: countVerdict(mapped, "over_cap") + overCapCount,
      droppedCredential: countVerdict(mapped, "credential"),
      droppedCredentialRestrictions: behavior === "allow" ? 0 : countVerdict(mapped, "credential"),
      droppedGuarded: 0,
      coveringDeviceTools: countVerdict(filtered_2, "keep_covers_device_tools"),
    },
  };
}
//@ chunk-t58ha4ac.js:19622-19687 placement
/**
 * 判断规则的处理结论是否为保留。
 */
function isKeepVerdict(verdict) {
  return verdict === "keep" || verdict === "keep_covers_device_tools";
}
//@ chunk-t58ha4ac.js:19687-19748 placement
/**
 * 规则内容是否以 !（否定）开头。
 */
function isNegatedRuleContent(rule) {
  return ruleContentForPathTool(rule)?.trimStart().startsWith("!") ?? false;
}
//@ chunk-t58ha4ac.js:19748-19832 placement
/**
 * 取路径类工具规则的规则内容。
 */
function ruleContentForPathTool(rule) {
  let { toolName, ruleContent } = parseRuleString(rule);
  return PATH_RULE_TOOLS.has(toolName) || hasWildcard(toolName) ? ruleContent : undefined;
}
//@ chunk-t58ha4ac.js:19832-19881 placement
/**
 * 统计某结论的规则条数。
 */
function countVerdict(verdicts, target) {
  return countWhere(verdicts, ({ verdict }) => verdict === target);
}
//@ chunk-t58ha4ac.js:19881-20079 placement
function emptyRuleCounts() {
  return {
    kept: 0,
    duplicates: 0,
    droppedRooted: 0,
    droppedDevice: 0,
    droppedInvalid: 0,
    droppedOverCap: 0,
    droppedCredential: 0,
    droppedCredentialRestrictions: 0,
    droppedGuarded: 0,
    coveringDeviceTools: 0,
  };
}
//@ chunk-t58ha4ac.js:20079-20615 placement
/**
 * 合并两份规则过滤统计（保留、重复与各类丢弃计数）。
 */
function addRuleCounts(left, right) {
  return {
    kept: left.kept + right.kept,
    duplicates: left.duplicates + right.duplicates,
    droppedRooted: left.droppedRooted + right.droppedRooted,
    droppedDevice: left.droppedDevice + right.droppedDevice,
    droppedInvalid: left.droppedInvalid + right.droppedInvalid,
    droppedOverCap: left.droppedOverCap + right.droppedOverCap,
    droppedCredential: left.droppedCredential + right.droppedCredential,
    droppedCredentialRestrictions: left.droppedCredentialRestrictions + right.droppedCredentialRestrictions,
    droppedGuarded: left.droppedGuarded + right.droppedGuarded,
    coveringDeviceTools: left.coveringDeviceTools + right.coveringDeviceTools,
  };
}
//@ chunk-t58ha4ac.js:20615-20670 placement
/**
 * 各 attribution 字段的校验函数表。
 */
var ATTRIBUTION_VALIDATORS = {
  commit: isValidAttributionText,
  pr: isValidAttributionText,
  sessionUrl: isBoolean,
  commitTrailers: isBoolean,
};
//@ chunk-t58ha4ac.js:20670-20778 placement
function pickAttribution(settings) {
  if (!isPlainObject(settings)) return;
  let reduced = ATTRIBUTION_KEYS.reduce((acc, key) => pickAttributionField(acc, settings, key), {});
  return Object.keys(reduced).length > 0 ? reduced : undefined;
}
//@ chunk-t58ha4ac.js:20778-21201 placement
/**
 * 递归去掉值或键像凭证的条目，返回保留的值与被去掉的数量。
 */
function scrubCredentialValues(value) {
  if (typeof value === "string")
    return looksLikeCredentialIncludingNul(value)
      ? {
          kept: undefined,
          withheld: 1,
        }
      : {
          kept: value,
          withheld: 0,
        };
  if (typeof value !== "object" || value === null)
    return {
      kept: value,
      withheld: 0,
    };
  let mapped = Object.entries(value).map(([key, value]) => [
    key,
    looksLikeCredentialIncludingNul(key)
      ? {
          kept: undefined,
          withheld: 1,
        }
      : scrubCredentialValues(value),
  ]);
  let flattened = mapped.flatMap(([key, result]) => (result.kept === undefined ? [] : [[key, result.kept]]));
  return {
    kept:
      flattened.length === 0
        ? undefined
        : Array.isArray(value)
          ? flattened.map(([, keptValue]) => keptValue)
          : Object.fromEntries(flattened),
    withheld: mapped.reduce((acc, [, entry]) => acc + entry.withheld, 0),
  };
}
//@ chunk-t58ha4ac.js:21201-21261 placement
/**
 * 按字段名取 attribution 值（校验通过才保留）。
 */
function pickAttributionField(out, source, field) {
  let value = getOwn(source, field);
  if (ATTRIBUTION_VALIDATORS[field](value)) out[field] = value;
  return out;
}
//@ chunk-t58ha4ac.js:21261-21349 placement
/**
 * 按设置字段 schema 校验后取该设置项。
 */
function pickSchemaValidSetting(settings, picked, key) {
  let value = picked[key];
  if (value !== undefined && getSettingsFieldSchema(key).safeParse(value).success) settings[key] = value;
  return settings;
}
//@ chunk-t58ha4ac.js:21349-21442 placement
/**
 * 取非空且不含控制字符的字符串设置。
 */
function pickNonEmptyString(value) {
  return typeof value === "string" &&
    value.trim() !== "" &&
    value.length <= MAX_STRING_SETTING_LENGTH &&
    !CONTROL_CHAR_RE.test(value)
    ? value
    : undefined;
}
//@ chunk-t58ha4ac.js:21442-21477 placement
/**
 * 布尔设置原样返回，否则 undefined。
 */
function asBooleanOrUndefined(value) {
  return isBoolean(value) ? value : undefined;
}
//@ chunk-t58ha4ac.js:21477-21519 placement
/**
 * 判断是否为布尔值。
 */
function isBoolean(value) {
  return typeof value === "boolean";
}
//@ chunk-t58ha4ac.js:21519-21607 placement
/**
 * 校验 attribution 文本（字节数不超限且不含不安全字符）。
 */
function isValidAttributionText(value) {
  return (
    typeof value === "string" &&
    Buffer.byteLength(value, "utf8") <= MAX_ATTRIBUTION_LENGTH &&
    !UNSAFE_TEXT_CHAR_RE.test(value)
  );
}
//@ chunk-t58ha4ac.js:21607-21661 placement
/**
 * 取对象自有属性（不存在返回 undefined）。
 */
function getOwn(settingsObject, settings) {
  return Object.hasOwn(settingsObject, settings) ? settingsObject[settings] : undefined;
}
export {
  emptyRuleCounts,
  filterPermissionRules,
  getOwn,
  pickNonEmptyString,
  pickAttribution,
  asBooleanOrUndefined,
  scrubCredentialValues,
  pickSchemaValidSetting,
  classifyRulePathRoot,
  isPortableShellAllowRule,
  isLocalWebDomainRule,
  matchesDeviceServerId,
  hasPreToolUseHooks,
};
