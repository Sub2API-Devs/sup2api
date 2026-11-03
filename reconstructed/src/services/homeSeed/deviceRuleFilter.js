/**
 * services/homeSeed/deviceRuleFilter.ts
 *
 * 2.1.316 新增：home seed 中设备相关规则过滤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwpc82tt.js (38)
 * attribution: placement 38
 */
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { isLocalHostname, isLocalhostName, isPrivateNetworkName } from "../../utils/localHostnames.js";
import {
  hasWildcard,
  matchRulePattern,
  permissionRuleValueFromString,
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
import { patternWithRootFor } from "../../utils/permissions/filesystem.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { uniq, count } from "../../utils/collections.js";
import { getSettingsFieldSchema } from "../../utils/settings/types.js";

//@ chunk-bwpc82tt.js:12011-13248 placement
/**
 * 设备规则过滤用到的安全参数记号、网络/数据库客户端命令、命令包装器（sudo、env、timeout 等）与公共 git 主机集合。
 */
var SAFE_ARG_TOKEN = "[A-Za-z0-9_.@*+][A-Za-z0-9_.@*+:~-]*";
var SAFE_ARG_RE = new RegExp(
  `^(?:(?:\\./)?${SAFE_ARG_TOKEN}(?:/${SAFE_ARG_TOKEN})*/?|-{1,2}(?:[A-Za-z0-9][A-Za-z0-9_.-]*)?)$`,
);
var NETWORK_COMMANDS = new Set([
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
var COMMAND_WRAPPERS = new Set([
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
var PUBLIC_GIT_HOSTS = new Set([
  GITHUB_HOST,
  "gitlab.com",
  "bitbucket.org",
  "ssh.dev.azure.com",
  `ssh.${GITHUB_HOST}`,
  "altssh.gitlab.com",
  "altssh.bitbucket.org",
  "codeberg.org",
]);
//@ chunk-bwpc82tt.js:13248-13829 placement
/**
 * shell 允许规则能否在云端安全复用：所有参数都是安全记号，不含主机/IP、端口、盘符、~ 或上级路径等机器相关成分（绑定 localhost 的参数例外）。
 */
function isPortableShellAllowRule(ruleContent, toolName) {
  if (/(?:^|[\s:=])\d{4,}:\*$/.test(ruleContent.trim())) return false;
  let filtered = ruleContent
    .trim()
    .replace(/(?::\*|\s+\*)$/, "")
    .split(/\s+/)
    .filter((i) => i !== "");
  let networkCommandIndex = findNetworkCommandIndex(filtered);
  let isBindOnlyCommand =
    networkCommandIndex === null &&
    skipCommandWrappers(filtered, 0) !== null &&
    !filtered.some((i) => isNetworkCommand(i) || /[*/\\]/.test(i));
  return (
    filtered.length > 0 &&
    filtered.every(
      (i, c) =>
        (isBindOnlyCommand && isLocalBindArg(filtered, c)) ||
        (SAFE_ARG_RE.test(i) &&
          !i.endsWith(":") &&
          !i.split(/[/:@]/).some(isWildcardOnlyToken) &&
          !(i.startsWith("-") && i.includes("..")) &&
          !/\*[A-Za-z]*\.\./.test(i) &&
          !/^\*+-[A-Za-z]*\.\.(?:\/|$)/.test(i) &&
          !/^~|:\**~/.test(i) &&
          !/^[A-Za-z]:(?!:)/.test(i) &&
          !/[:@]\//.test(i) &&
          !(toolName === POWERSHELL_TOOL_NAME && /^\**[A-Za-z][\w*]*:/.test(i)) &&
          !hasHostLikeToken(
            i,
            networkCommandIndex !== null && c > networkCommandIndex && !i.startsWith("-"),
          )),
    )
  );
}
//@ chunk-bwpc82tt.js:13829-13985 placement
var BIND_HOST_FLAGS = new Set([
  "--host",
  "--hostname",
  "--bind",
  "--listen",
  "--addr",
  "--address",
  "-H",
  "-b",
]);
var BIND_HOST_ENV_VARS = new Set(["HOST", "HOSTNAME", "BIND", "BIND_ADDR", "BIND_ADDRESS"]);
//@ chunk-bwpc82tt.js:13985-14214 placement
function isLocalBindArg(e, t) {
  let n = e[t] ?? "";
  let match = /^(--[a-z-]+)=(.+)$/.exec(n);
  if (match !== null) return BIND_HOST_FLAGS.has(match[1] ?? "") && isLoopbackHost(match[2] ?? "");
  let match_2 = /^([A-Z_]+)=(.+)$/.exec(n);
  if (match_2 !== null) return BIND_HOST_ENV_VARS.has(match_2[1] ?? "") && isLoopbackHost(match_2[2] ?? "");
  return t > 0 && BIND_HOST_FLAGS.has(e[t - 1] ?? "") && isLoopbackHost(n);
}
//@ chunk-bwpc82tt.js:14214-14452 placement
function isLoopbackHost(e) {
  let lower = e.toLowerCase();
  return [lower, lower.replace(/:\d{1,5}$/, "")].some(
    (n) =>
      n === "0.0.0.0" ||
      n === "127.0.0.1" ||
      n === "localhost" ||
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+localhost$/.test(n) ||
      n === "::" ||
      n === "[::]" ||
      n === "::1" ||
      n === "[::1]",
  );
}
//@ chunk-bwpc82tt.js:14452-14661 placement
function findNetworkCommandIndex(e) {
  let t = skipCommandWrappers(e, 0);
  if (t !== null && isNetworkCommand(e[t] ?? "")) return t;
  let index = e.findIndex((r, s) => s > (t ?? 0) && /^-(?:exec|execdir|ok|okdir)$/.test(r));
  if (index >= 0) {
    let r = skipCommandWrappers(e, index + 1);
    return r !== null && isNetworkCommand(e[r] ?? "") ? r : null;
  }
  return null;
}
//@ chunk-bwpc82tt.js:14661-14743 placement
/**
 * 判断命令名是否属于网络类命令（curl、wget 等，忽略 .exe/.cmd 后缀）。
 */
function isNetworkCommand(e) {
  return NETWORK_COMMANDS.has(e.toLowerCase().replace(/\.(?:exe|cmd|bat|ps1)$/, ""));
}
//@ chunk-bwpc82tt.js:14743-15276 placement
/**
 * 跳过环境变量赋值与命令包装器（及其参数、时长），返回真正命令所在的下标。
 */
function skipCommandWrappers(argv, index) {
  let n = argv[index];
  if (n === undefined) return null;
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(n)) return skipCommandWrappers(argv, index + 1);
  let replaced = n.toLowerCase().replace(/\.exe$/, "");
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
//@ chunk-bwpc82tt.js:15276-15358 placement
/**
 * 判断 token 是否只由 . 与 * 组成（通配写法）。
 */
function isWildcardOnlyToken(e) {
  return /^[.*]+$/.test(e) && !/^(?:\.|\.{3,}|\*{1,2}|\*\.\*)$/.test(e);
}
//@ chunk-bwpc82tt.js:15358-16569 placement
/**
 * 参数记号是否含主机/地址成分：端口号、IPv6、user@host 域名、本地主机名、IP 形式或带 * 的地址等。
 */
function hasHostLikeToken(e, t = false) {
  let flagValueVariants = /^-[A-Za-z][A-Za-z0-9_.-]+$/.test(e)
    ? Array.from(
        {
          length: e.length - 2,
        },
        (a, l) => l + 2,
      )
        .filter((a) => /^[A-Za-z]+$/.test(e.slice(1, a)))
        .map((a) => e.slice(a))
    : [];
  let firstFlagValue = flagValueVariants[0];
  let hostContext = t || /[:@]/.test(e) || firstFlagValue !== undefined;
  let segments = e.startsWith("--")
    ? e
        .replace(/^--[^=]*=|^--/, "")
        .split(/[/:@]/)
        .filter((a) => a !== "")
    : e.startsWith("-")
      ? flagValueVariants
      : e.split(/[/:@]/).filter((a) => a !== "");
  let sliced = e.split("@").slice(e.startsWith("@") ? 2 : 1);
  return (
    (t && e.includes("*")) ||
    e.split("/").some((a) => {
      let parts = a.split(":");
      return parts.length > 1 && parts.some((f) => /^(?:\d{4,}|\*+)$/.test(f));
    }) ||
    e
      .split(/[/@]/)
      .flatMap(stripSchemePrefixes)
      .some(
        (a) =>
          /\d/.test(a) && /^[0-9a-f:*]+$/i.test(a) && (a.includes("::") || countCharInString(a, ":") >= 2),
      ) ||
    sliced.some((a) => {
      let lower = a.replace(/[/:].*$/, "").toLowerCase();
      if (PUBLIC_GIT_HOSTS.has(lower)) return false;
      return (
        /^[a-z0-9*-]+(?:\.[a-z0-9*-]+)*\.[a-z*][a-z0-9*-]*$/.test(lower) ||
        isLocalHostname(lower.replace(/\*/g, "")) ||
        /^(?:0+|0x[0-9a-f]*)$/.test(lower) ||
        (t && lower !== "")
      );
    }) ||
    /^0+\//.test(e) ||
    (t && /^0+:/.test(e)) ||
    segments.some(
      (segment, l) =>
        looksLikeIpAddress(segment) ||
        ((t || (firstFlagValue !== undefined && l === 0)) &&
          !e.startsWith("--") &&
          /^(?:0+|0x[0-9a-f]*|[0-9a-fx]*\.[0-9a-fx.]*)$/i.test(segment) &&
          /\d/.test(segment)),
    ) ||
    (e.includes("*") &&
      (e.includes(":") ||
        segments.some(
          (segment) => /^[0-9a-fx.*]+$/i.test(segment) && /\d/.test(segment) && segment.includes("*"),
        ))) ||
    segments.some((segment) =>
      hostContext ? isLocalHostname(segment.replace(/\*/g, "")) : isLocalhostName(segment.replace(/\*/g, "")),
    )
  );
}
//@ chunk-bwpc82tt.js:16569-16684 placement
function stripSchemePrefixes(e) {
  let t = [e];
  let n = e;
  for (;;) {
    let replaced = n.replace(/^[a-z][\w-]*:/i, "");
    if (replaced === n || replaced === "") return t;
    t.push(replaced);
    n = replaced;
  }
}
//@ chunk-bwpc82tt.js:16684-16895 placement
function looksLikeIpAddress(segment) {
  let replaced = segment.replace(/\.+$/, "");
  return (
    /^(?:(?:\d+|0x[0-9a-f]+)\.){3}(?:\d+|0x[0-9a-f]+)$/i.test(replaced) ||
    /^(?:127\.|0\d+\.|0x[0-9a-f]*\.)[0-9a-fx.]*$/i.test(replaced) ||
    /^0x[0-9a-f]+$/i.test(replaced) ||
    /^\d{8,}$/.test(replaced)
  );
}
//@ chunk-bwpc82tt.js:16895-17238 placement
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
//@ chunk-bwpc82tt.js:17238-17351 placement
function isWindowsRootedPath(e) {
  return (
    e.startsWith("~\\") || (e.startsWith("\\") && e[1] !== "!" && e[1] !== "#") || /^[A-Za-z]:[/\\]/.test(e)
  );
}
//@ chunk-bwpc82tt.js:17351-17390 placement
/**
 * 规则是否命中远程设备服务器 id。
 */
function matchesDeviceServerId(toolName) {
  return hasWildcard(toolName) && matchRulePattern(toolName, DEVICE_SERVER_ID);
}
//@ chunk-bwpc82tt.js:17390-17621 placement
function classifyRulePathRoot(ruleContent) {
  let trimmed = ruleContent.replace(/^\s+/, "").replace(/^[!#]/, "").trim();
  if (trimmed.split("/").includes("..") || isWindowsRootedPath(trimmed) || /^~[^/]/.test(trimmed))
    return "machine";
  if (trimmed === "~" || trimmed.startsWith("~/")) return "home";
  return patternWithRootFor(trimmed, POSIX_ROOT).root !== null ? "machine" : "none";
}
//@ chunk-bwpc82tt.js:17621-17716 placement
/**
 * 设置里是否存在非空的 PreToolUse 钩子。
 */
function hasPreToolUseHooks(e) {
  let t = isPlainObject(e) ? getOwn(e, "PreToolUse") : undefined;
  return Array.isArray(t) ? t.length > 0 : t != null;
}
//@ chunk-bwpc82tt.js:17716-18166 placement
/**
 * 按 allow/deny/ask 逐类筛选规则；allow 规则还要去掉被 PreToolUse 钩子覆盖的工具，必要时整体放弃 allow；返回筛选结果与合并计数。
 */
function filterPermissionRules(e, preToolUseHookActiveHere, hasLostAnAllowEntryAtParse) {
  if (!isPlainObject(e))
    return {
      value: undefined,
      counts: emptyRuleCounts(),
    };
  let mapped = PERMISSION_BEHAVIORS.map((a) => {
    let l = filterBehaviorRules(getOwn(e, a), a);
    return a === "allow" && typeof preToolUseHookActiveHere === "function"
      ? dropHookGuardedRules(l, preToolUseHookActiveHere)
      : l;
  });
  let dropAllAllow =
    preToolUseHookActiveHere === true ||
    hasLostAnAllowEntryAtParse ||
    mapped.some(({ behavior, counts, carveOutLost }) =>
      behavior === "allow" ? carveOutLost : countDroppedRules(counts) > 0,
    );
  let mapped_2 = mapped.map((a) => (a.behavior === "allow" && dropAllAllow ? dropAllRules(a) : a));
  let reduced = mapped_2.reduce((acc, { behavior, rules }) => {
    if (rules.length > 0) acc[behavior] = rules;
    return acc;
  }, {});
  return {
    value: mapped_2.some(({ rules }) => rules.length > 0) ? reduced : undefined,
    counts: mapped_2.map(({ counts }) => counts).reduce(addRuleCounts),
  };
}
//@ chunk-bwpc82tt.js:18166-18274 placement
function countDroppedRules(counts) {
  return (
    counts.droppedRooted +
    counts.droppedDevice +
    counts.droppedInvalid +
    counts.droppedOverCap +
    counts.droppedCredential
  );
}
//@ chunk-bwpc82tt.js:18274-18557 placement
function dropHookGuardedRules(e, t) {
  let n = (rule) => getRuleToolFamily(permissionRuleValueFromString(rule).toolName).some(t);
  let filtered = e.rules.filter(n);
  if (filtered.length === 0) return e;
  return {
    ...e,
    rules: e.rules.filter((rule) => !n(rule)),
    carveOutLost: e.carveOutLost || filtered.some(isNegatedRuleContent),
    counts: {
      ...e.counts,
      kept: e.counts.kept - filtered.length,
      droppedGuarded: e.counts.droppedGuarded + filtered.length,
    },
  };
}
//@ chunk-bwpc82tt.js:18557-18741 placement
function dropAllRules(e) {
  return {
    behavior: e.behavior,
    rules: [],
    carveOutLost: e.carveOutLost,
    counts: {
      ...e.counts,
      kept: 0,
      coveringDeviceTools: 0,
      droppedGuarded: e.counts.droppedGuarded + e.rules.length,
    },
  };
}
//@ chunk-bwpc82tt.js:18741-19523 placement
/**
 * 筛选一类规则：截断到上限、去重、逐条判定，统计保留数与各丢弃原因，并标记 allow 中是否丢失了例外规则。
 */
function filterBehaviorRules(e, behavior) {
  let list = Array.isArray(e) ? e : [];
  let sliced = list.slice(0, MAX_RULES_PER_BEHAVIOR);
  let filtered = sliced.filter((d) => typeof d === "string");
  let uniqueRules = uniq(filtered);
  let c = new Set(uniqueRules);
  let overCapCount = count(list.slice(MAX_RULES_PER_BEHAVIOR), (d) => typeof d !== "string" || !c.has(d));
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
        (e !== undefined && !Array.isArray(e) ? 1 : 0),
      droppedOverCap: countVerdict(mapped, "over_cap") + overCapCount,
      droppedCredential: countVerdict(mapped, "credential"),
      droppedCredentialRestrictions: behavior === "allow" ? 0 : countVerdict(mapped, "credential"),
      droppedGuarded: 0,
      coveringDeviceTools: countVerdict(filtered_2, "keep_covers_device_tools"),
    },
  };
}
//@ chunk-bwpc82tt.js:19523-19588 placement
/**
 * 判断规则的处理结论是否为保留。
 */
function isKeepVerdict(verdict) {
  return verdict === "keep" || verdict === "keep_covers_device_tools";
}
//@ chunk-bwpc82tt.js:19588-19649 placement
/**
 * 规则内容是否以 !（否定）开头。
 */
function isNegatedRuleContent(rule) {
  return ruleContentForPathTool(rule)?.trimStart().startsWith("!") ?? false;
}
//@ chunk-bwpc82tt.js:19649-19733 placement
/**
 * 取路径类工具规则的规则内容。
 */
function ruleContentForPathTool(e) {
  let { toolName, ruleContent } = permissionRuleValueFromString(e);
  return PATH_RULE_TOOLS.has(toolName) || hasWildcard(toolName) ? ruleContent : undefined;
}
//@ chunk-bwpc82tt.js:19733-19782 placement
/**
 * 统计某结论的规则条数。
 */
function countVerdict(e, t) {
  return count(e, ({ verdict }) => verdict === t);
}
//@ chunk-bwpc82tt.js:19782-19980 placement
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
//@ chunk-bwpc82tt.js:19980-20516 placement
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
//@ chunk-bwpc82tt.js:20516-20571 placement
/**
 * 各 attribution 字段的校验函数表。
 */
var ATTRIBUTION_VALIDATORS = {
  commit: isValidAttributionText,
  pr: isValidAttributionText,
  sessionUrl: isBoolean,
  commitTrailers: isBoolean,
};
//@ chunk-bwpc82tt.js:20571-20679 placement
function pickAttribution(e) {
  if (!isPlainObject(e)) return;
  let reduced = ATTRIBUTION_KEYS.reduce((acc, r) => pickAttributionField(acc, e, r), {});
  return Object.keys(reduced).length > 0 ? reduced : undefined;
}
//@ chunk-bwpc82tt.js:20679-21102 placement
/**
 * 递归去掉值或键像凭证的条目，返回保留的值与被去掉的数量。
 */
function scrubCredentialValues(e) {
  if (typeof e === "string")
    return looksLikeCredentialIncludingNul(e)
      ? {
          kept: undefined,
          withheld: 1,
        }
      : {
          kept: e,
          withheld: 0,
        };
  if (typeof e !== "object" || e === null)
    return {
      kept: e,
      withheld: 0,
    };
  let mapped = Object.entries(e).map(([key, value]) => [
    key,
    looksLikeCredentialIncludingNul(key)
      ? {
          kept: undefined,
          withheld: 1,
        }
      : scrubCredentialValues(value),
  ]);
  let flattened = mapped.flatMap(([r, s]) => (s.kept === undefined ? [] : [[r, s.kept]]));
  return {
    kept:
      flattened.length === 0
        ? undefined
        : Array.isArray(e)
          ? flattened.map(([, r]) => r)
          : Object.fromEntries(flattened),
    withheld: mapped.reduce((acc, [, s]) => acc + s.withheld, 0),
  };
}
//@ chunk-bwpc82tt.js:21102-21162 placement
/**
 * 按字段名取 attribution 值（校验通过才保留）。
 */
function pickAttributionField(e, t, n) {
  let r = getOwn(t, n);
  if (ATTRIBUTION_VALIDATORS[n](r)) e[n] = r;
  return e;
}
//@ chunk-bwpc82tt.js:21162-21250 placement
/**
 * 按设置字段 schema 校验后取该设置项。
 */
function pickSchemaValidSetting(e, picked, n) {
  let r = picked[n];
  if (r !== undefined && getSettingsFieldSchema(n).safeParse(r).success) e[n] = r;
  return e;
}
//@ chunk-bwpc82tt.js:21250-21343 placement
/**
 * 取非空且不含控制字符的字符串设置。
 */
function pickNonEmptyString(e) {
  return typeof e === "string" &&
    e.trim() !== "" &&
    e.length <= MAX_STRING_SETTING_LENGTH &&
    !CONTROL_CHAR_RE.test(e)
    ? e
    : undefined;
}
//@ chunk-bwpc82tt.js:21343-21378 placement
/**
 * 布尔设置原样返回，否则 undefined。
 */
function asBooleanOrUndefined(e) {
  return isBoolean(e) ? e : undefined;
}
//@ chunk-bwpc82tt.js:21378-21420 placement
/**
 * 判断是否为布尔值。
 */
function isBoolean(e) {
  return typeof e === "boolean";
}
//@ chunk-bwpc82tt.js:21420-21508 placement
/**
 * 校验 attribution 文本（字节数不超限且不含不安全字符）。
 */
function isValidAttributionText(e) {
  return (
    typeof e === "string" &&
    Buffer.byteLength(e, "utf8") <= MAX_ATTRIBUTION_LENGTH &&
    !UNSAFE_TEXT_CHAR_RE.test(e)
  );
}
//@ chunk-bwpc82tt.js:21508-21562 placement
/**
 * 取对象自有属性（不存在返回 undefined）。
 */
function getOwn(userSettings, t) {
  return Object.hasOwn(userSettings, t) ? userSettings[t] : undefined;
}
export {
  hasPreToolUseHooks,
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
};
