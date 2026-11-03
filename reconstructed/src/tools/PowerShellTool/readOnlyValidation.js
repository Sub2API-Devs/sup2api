/**
 * tools/PowerShellTool/readOnlyValidation.ts
 *
 * PowerShell 只读判定：CMDLET_ALLOWLIST、别名规范化、git/docker/dotnet 只读检查、变量写入/ActionPreference 参数检测；混入 git 安全配置与代码执行参数检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/readOnlyValidation.ts
 * pieces: chunk-s67vc0kc.js (54)
 * attribution: sole-consumer 1, placement 11, layout 26, fingerprint 9, file-local 6, callgraph-witnessed 1
 */
import { join } from "path";
import { statSync } from "fs";
import {
  COMMON_ACTION_PARAM_ALIASES,
  COMMON_ACTION_PARAMS,
  COMMON_VARIABLE_PARAM_ALIASES,
  COMMON_VARIABLE_PARAMS,
  COMMON_PARAMETERS,
} from "./commonParameters.js";
import { env } from "../../utils/env.js";
import { urlPatternToRegex, firstLineOf } from "../../utils/stringUtils.js";
import { lW, oZ, gP, skipLeadingWhitespaceAndComments, E, mVn, T } from "./powershellParsing.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import { getPlatform } from "../../utils/platform.js";
import { getCwd } from "../../utils/cwd.js";
import {
  COMMON_ALIASES,
  deriveSecurityFlags,
  getPipelineSegments,
  isNullRedirectionTarget,
  PS_TOKENIZER_DASH_CHARS,
  isPowerShellParameter,
  normalizeUnicodeDashes,
} from "../../utils/powershell/parser.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  isFlagToken,
  GIT_READ_ONLY_COMMANDS,
  validateFlags,
  DOCKER_DANGEROUS_FLAGS,
  DOCKER_BARE_READ_ONLY_COMMANDS,
  DOCKER_READ_ONLY_COMMANDS,
} from "../../utils/shell/readOnlyCommandValidation.js";

//@ chunk-s67vc0kc.js:2386-2474 sole-consumer
function N(e) {
  if (e.length < 2) return !1;
  return COMMON_ACTION_PARAM_ALIASES.includes(e) || COMMON_ACTION_PARAMS.some((t) => t.startsWith(e));
}
/**
 * ActionPreference 取值（silentlycontinue/stop/continue/ignore 及数字）。
 */
//@ chunk-s67vc0kc.js:2474-2577 placement = checkTokenBudget (0.447)
var POWERSHELL_ACTION_PARAMS = new Set([...COMMON_ACTION_PARAMS, ...COMMON_ACTION_PARAM_ALIASES]),
  POWERSHELL_ACTION_VALUES = new Set(["silentlycontinue", "0", "stop", "1", "continue", "2", "ignore", "4"]);
//@ chunk-s67vc0kc.js:2577-2665 placement
function k(e) {
  if (e.length < 2) return !1;
  return COMMON_VARIABLE_PARAM_ALIASES.includes(e) || COMMON_VARIABLE_PARAMS.some((t) => t.startsWith(e));
}
//@ chunk-s67vc0kc.js:2665-3583 placement
var POWERSHELL_SCOPE_NAMES = new Set(["global", "script", "local", "private", "variable"]),
  M = new Set([
    "psdefaultparametervalues",
    "confirmpreference",
    "debugpreference",
    "erroractionpreference",
    "errorview",
    "formatenumerationlimit",
    "informationpreference",
    "maximumhistorycount",
    "ofs",
    "outputencoding",
    "progresspreference",
    "psemailserver",
    "psmoduleautoloadingpreference",
    "psnativecommandargumentpassing",
    "psnativecommanduseerroractionpreference",
    "pssessionapplicationname",
    "pssessionconfigurationname",
    "pssessionoption",
    "psstyle",
    "transcript",
    "verbosepreference",
    "warningpreference",
    "whatifpreference",
    "logcommandhealthevent",
    "logcommandlifecycleevent",
    "logenginehealthevent",
    "logenginelifecycleevent",
    "logproviderhealthevent",
    "logproviderlifecycleevent",
    "maximumaliascount",
    "maximumdrivecount",
    "maximumerrorcount",
    "maximumfunctioncount",
    "maximumvariablecount",
  ]),
  H = [...COMMON_ACTION_PARAMS, ...COMMON_VARIABLE_PARAMS, "-outbuffer", "-verbose", "-debug"],
  filtered = H.filter((e) => e !== "-progressaction");
//@ chunk-s67vc0kc.js:3583-3683 placement
function uniquePrefixMatch(e, t) {
  let n = null;
  for (let r of t)
    if (r.startsWith(e)) {
      if (n !== null) return null;
      n = r;
    }
  return n;
}
//@ chunk-s67vc0kc.js:3683-3802 placement
function matchesAbbreviatedParam(e, t) {
  if (e.length < 2) return !1;
  for (let n of [H, filtered]) {
    let r = uniquePrefixMatch(e, n);
    if (r !== null && t.includes(r)) return !0;
  }
  return !1;
}
//@ chunk-s67vc0kc.js:3802-3848 placement
var le = new Set([...COMMON_VARIABLE_PARAM_ALIASES, "-ea", "-wa", "-p"]),
  ce = !1;
//@ chunk-s67vc0kc.js:3848-3925 placement
function ue(e, t, n, r) {
  if (!r && le.has(e)) return !1;
  return t.includes(e) || matchesAbbreviatedParam(e, n);
}
//@ chunk-s67vc0kc.js:3925-3963 placement
function B(e, t, n) {
  return ue(e, t, n, ce);
}
//@ chunk-s67vc0kc.js:3963-3993 placement
function j(e) {
  return B(e, COMMON_VARIABLE_PARAM_ALIASES, COMMON_VARIABLE_PARAMS);
}
//@ chunk-s67vc0kc.js:3993-4023 placement
function U(e) {
  return B(e, COMMON_ACTION_PARAM_ALIASES, COMMON_ACTION_PARAMS);
}
//@ chunk-s67vc0kc.js:4023-5032 placement
var SAFE_POWERSHELL_VERBS = new Set([
    "add",
    "clear",
    "close",
    "copy",
    "enter",
    "exit",
    "find",
    "format",
    "get",
    "hide",
    "join",
    "lock",
    "move",
    "new",
    "open",
    "optimize",
    "pop",
    "push",
    "redo",
    "remove",
    "rename",
    "reset",
    "resize",
    "resume",
    "search",
    "select",
    "set",
    "show",
    "skip",
    "split",
    "step",
    "switch",
    "undo",
    "unlock",
    "watch",
    "connect",
    "disconnect",
    "read",
    "receive",
    "send",
    "write",
    "backup",
    "checkpoint",
    "compare",
    "compress",
    "convert",
    "convertfrom",
    "convertto",
    "dismount",
    "edit",
    "expand",
    "export",
    "group",
    "import",
    "initialize",
    "limit",
    "merge",
    "mount",
    "out",
    "publish",
    "restore",
    "save",
    "sync",
    "unpublish",
    "update",
    "debug",
    "measure",
    "ping",
    "repair",
    "resolve",
    "test",
    "trace",
    "approve",
    "assert",
    "build",
    "complete",
    "confirm",
    "deny",
    "deploy",
    "disable",
    "enable",
    "install",
    "invoke",
    "register",
    "request",
    "restart",
    "start",
    "stop",
    "submit",
    "suspend",
    "uninstall",
    "unregister",
    "wait",
    "block",
    "grant",
    "protect",
    "revoke",
    "unblock",
    "unprotect",
    "use",
    "sort",
    "tee",
    "where",
    "foreach",
  ]),
  ge = ["-variable", "-sessionvariable", "-responseheadersvariable", "-statuscodevariable"];
//@ chunk-s67vc0kc.js:5032-5106 layout
function V(e) {
  if (e.length < 3) return !1;
  return ge.some((t) => t.startsWith(e));
}
//@ chunk-s67vc0kc.js:5106-5156 fingerprint = DOTNET_READ_ONLY_FLAGS (0.7)
var DOTNET_READ_ONLY_FLAGS = new Set(["--list-runtimes", "--list-sdks"]);
/**
 * 参数是否可能泄露/展开值：非字符串常量参数含 $ ( @ { [，或参数绑定的子元素不是字符串常量，或冒号绑定值含表达式。
 */
//@ chunk-s67vc0kc.js:5156-5548 fingerprint = argLeaksValue (1)
function argLeaksValue(_cmd, element) {
  let argTypes = (element?.elementTypes ?? []).slice(1),
    r = element?.args ?? [],
    children = element?.children;
  for (let s = 0; s < argTypes.length; s++) {
    if (argTypes[s] !== "StringConstant" && argTypes[s] !== "Parameter") {
      if (!/[$(@{[]/.test(r[s] ?? "")) continue;
      return !0;
    }
    if (argTypes[s] === "Parameter") {
      let paramChildren = children?.[s];
      if (paramChildren) {
        if (paramChildren.some((o) => o.type !== "StringConstant")) return !0;
      } else {
        let o = r[s] ?? "",
          colonIdx = o.indexOf(":");
        if (colonIdx > 0 && /[$(@{[]/.test(o.slice(colonIdx + 1))) return !0;
      }
    }
  }
  return !1;
}
/**
 * PowerShell 只读 cmdlet 白名单 CMDLET_ALLOWLIST（Get-ChildItem/Get-Content/Select-String/Get-Process/Test-Path/… 以及 git/gh/docker/dotnet 外部命令），每项列安全参数与额外危险回调；还有安全输出命令、管道尾部格式化命令、默认 PATHEXT 扩展名表。
 */
//@ chunk-s67vc0kc.js:5548-12203 fingerprint = CMDLET_ALLOWLIST (0.943)
var CMDLET_ALLOWLIST = Object.assign(Object.create(null), {
    "get-childitem": {
      safeFlags: [
        "-Path",
        "-LiteralPath",
        "-Filter",
        "-Include",
        "-Exclude",
        "-Recurse",
        "-Depth",
        "-Name",
        "-Force",
        "-Attributes",
        "-Directory",
        "-File",
        "-Hidden",
        "-ReadOnly",
        "-System",
      ],
    },
    "get-content": {
      safeFlags: [
        "-Path",
        "-LiteralPath",
        "-TotalCount",
        "-Head",
        "-Tail",
        "-Raw",
        "-Encoding",
        "-Delimiter",
        "-ReadCount",
      ],
    },
    "get-item": { safeFlags: ["-Path", "-LiteralPath", "-Force", "-Stream"] },
    "get-itemproperty": { safeFlags: ["-Path", "-LiteralPath", "-Name"] },
    "test-path": {
      safeFlags: [
        "-Path",
        "-LiteralPath",
        "-PathType",
        "-Filter",
        "-Include",
        "-Exclude",
        "-IsValid",
        "-NewerThan",
        "-OlderThan",
      ],
    },
    "resolve-path": { safeFlags: ["-Path", "-LiteralPath", "-Relative"] },
    "get-filehash": { safeFlags: ["-Path", "-LiteralPath", "-Algorithm", "-InputStream"] },
    "get-acl": { safeFlags: ["-Path", "-LiteralPath", "-Audit", "-Filter", "-Include", "-Exclude"] },
    "set-location": { safeFlags: ["-Path", "-LiteralPath", "-PassThru", "-StackName"] },
    "push-location": { safeFlags: ["-Path", "-LiteralPath", "-PassThru", "-StackName"] },
    "pop-location": { safeFlags: ["-PassThru", "-StackName"] },
    "select-string": {
      safeFlags: [
        "-Path",
        "-LiteralPath",
        "-Pattern",
        "-InputObject",
        "-SimpleMatch",
        "-CaseSensitive",
        "-Quiet",
        "-List",
        "-NotMatch",
        "-AllMatches",
        "-Encoding",
        "-Context",
        "-Raw",
        "-NoEmphasis",
      ],
    },
    "convertto-json": { safeFlags: ["-InputObject", "-Depth", "-Compress", "-EnumsAsStrings", "-AsArray"] },
    "convertfrom-json": { safeFlags: ["-InputObject", "-Depth", "-AsHashtable", "-NoEnumerate"] },
    "convertto-csv": {
      safeFlags: ["-InputObject", "-Delimiter", "-NoTypeInformation", "-NoHeader", "-UseQuotes"],
    },
    "convertfrom-csv": { safeFlags: ["-InputObject", "-Delimiter", "-Header", "-UseCulture"] },
    "convertto-xml": { safeFlags: ["-InputObject", "-Depth", "-As", "-NoTypeInformation"] },
    "convertto-html": {
      safeFlags: [
        "-InputObject",
        "-Property",
        "-Head",
        "-Title",
        "-Body",
        "-Pre",
        "-Post",
        "-As",
        "-Fragment",
      ],
    },
    "format-hex": { safeFlags: ["-Path", "-LiteralPath", "-InputObject", "-Encoding", "-Count", "-Offset"] },
    "get-member": { safeFlags: ["-InputObject", "-MemberType", "-Name", "-Static", "-View", "-Force"] },
    "get-unique": { safeFlags: ["-InputObject", "-AsString", "-CaseInsensitive", "-OnType"] },
    "compare-object": {
      safeFlags: [
        "-ReferenceObject",
        "-DifferenceObject",
        "-Property",
        "-SyncWindow",
        "-CaseSensitive",
        "-Culture",
        "-ExcludeDifferent",
        "-IncludeEqual",
        "-PassThru",
      ],
    },
    "join-string": {
      safeFlags: ["-InputObject", "-Property", "-Separator", "-SingleQuote", "-DoubleQuote", "-FormatString"],
    },
    "get-random": { safeFlags: ["-InputObject", "-Minimum", "-Maximum", "-Count", "-SetSeed", "-Shuffle"] },
    "convert-path": { safeFlags: ["-Path", "-LiteralPath"] },
    "join-path": { safeFlags: ["-Path", "-ChildPath", "-AdditionalChildPath"] },
    "split-path": {
      safeFlags: [
        "-Path",
        "-LiteralPath",
        "-Qualifier",
        "-NoQualifier",
        "-Parent",
        "-Leaf",
        "-LeafBase",
        "-Extension",
        "-IsAbsolute",
      ],
    },
    "get-itempropertyvalue": { safeFlags: ["-Path", "-LiteralPath", "-Name"] },
    "get-psprovider": { safeFlags: ["-PSProvider"] },
    "get-computerinfo": { allowAllFlags: !0 },
    "get-host": { allowAllFlags: !0 },
    "get-date": { safeFlags: ["-Date", "-Format", "-UFormat", "-DisplayHint", "-AsUTC"] },
    "get-location": { safeFlags: ["-PSProvider", "-PSDrive", "-Stack", "-StackName"] },
    "get-psdrive": { safeFlags: ["-Name", "-PSProvider", "-Scope"] },
    "get-module": { safeFlags: ["-Name", "-ListAvailable", "-All", "-FullyQualifiedName", "-PSEdition"] },
    "get-alias": { safeFlags: ["-Name", "-Definition", "-Scope", "-Exclude"] },
    "get-history": { safeFlags: ["-Id", "-Count"] },
    "get-culture": { allowAllFlags: !0 },
    "get-uiculture": { allowAllFlags: !0 },
    "get-timezone": { safeFlags: ["-Name", "-Id", "-ListAvailable"] },
    "get-uptime": { allowAllFlags: !0 },
    "write-output": {
      safeFlags: ["-InputObject", "-NoEnumerate"],
      additionalCommandIsDangerousCallback: argLeaksValue,
    },
    "write-host": {
      safeFlags: ["-Object", "-NoNewline", "-Separator", "-ForegroundColor", "-BackgroundColor"],
      additionalCommandIsDangerousCallback: argLeaksValue,
    },
    "start-sleep": {
      safeFlags: ["-Seconds", "-Milliseconds", "-Duration"],
      additionalCommandIsDangerousCallback: argLeaksValue,
    },
    "format-table": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "format-list": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "format-wide": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "format-custom": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "measure-object": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "select-object": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "sort-object": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "group-object": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "where-object": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "out-string": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "out-host": { allowAllFlags: !0, additionalCommandIsDangerousCallback: argLeaksValue },
    "get-netadapter": { safeFlags: ["-Name", "-InterfaceDescription", "-InterfaceIndex", "-Physical"] },
    "get-netipaddress": { safeFlags: ["-InterfaceIndex", "-InterfaceAlias", "-AddressFamily", "-Type"] },
    "get-netroute": {
      safeFlags: ["-InterfaceIndex", "-InterfaceAlias", "-AddressFamily", "-DestinationPrefix"],
    },
    "get-dnsclient": { safeFlags: ["-InterfaceIndex", "-InterfaceAlias"] },
    "get-winevent": {
      safeFlags: [
        "-LogName",
        "-ListLog",
        "-ListProvider",
        "-ProviderName",
        "-Path",
        "-MaxEvents",
        "-FilterXPath",
        "-Force",
        "-Oldest",
      ],
    },
    git: {},
    gh: {},
    docker: {},
    ipconfig: {
      safeFlags: ["/all", "/allcompartments"],
      additionalCommandIsDangerousCallback: (e, t) =>
        (t?.args ?? []).some((n) => !n.startsWith("/") && !n.startsWith("-")),
    },
    netstat: { safeFlags: ["-a", "-b", "-e", "-f", "-n", "-o", "-p", "-q", "-r", "-s", "-t", "-x", "-y"] },
    systeminfo: { safeFlags: ["/FO", "/NH"] },
    tasklist: { safeFlags: ["/M", "/SVC", "/V", "/FI", "/FO", "/NH"] },
    "where.exe": { allowAllFlags: !0 },
    hostname: {
      safeFlags: ["-a", "-d", "-f", "-i", "-I", "-s", "-y", "-A"],
      additionalCommandIsDangerousCallback: (e, t) => (t?.args ?? []).some((n) => !n.startsWith("-")),
    },
    whoami: { safeFlags: ["/user", "/groups", "/claims", "/priv", "/logonid", "/all", "/fo", "/nh"] },
    ver: { allowAllFlags: !0 },
    arp: {
      safeFlags: ["-a", "-g", "-v", "-n"],
      additionalCommandIsDangerousCallback: (e, t) => (t?.args ?? []).some((n) => !n.startsWith("-")),
    },
    route: {
      safeFlags: ["print", "PRINT", "-4", "-6"],
      additionalCommandIsDangerousCallback: (e, t) => {
        if (!t) return !0;
        return t.args.find((arg) => !arg.startsWith("-"))?.toLowerCase() !== "print";
      },
    },
    getmac: { safeFlags: ["/FO", "/NH", "/V"] },
    tree: { safeFlags: ["/F", "/A", "/Q", "/L"] },
    findstr: {
      safeFlags: [
        "/B",
        "/E",
        "/L",
        "/R",
        "/S",
        "/I",
        "/X",
        "/V",
        "/N",
        "/M",
        "/O",
        "/P",
        "/C",
        "/G",
        "/D",
        "/A",
      ],
    },
    dotnet: {},
  }),
  SAFE_OUTPUT_CMDLETS = new Set(["out-null"]),
  PIPELINE_TAIL_CMDLETS = new Set([
    "format-table",
    "format-list",
    "format-wide",
    "format-custom",
    "measure-object",
    "select-object",
    "sort-object",
    "group-object",
    "where-object",
    "out-string",
    "out-host",
  ]),
  SAFE_EXTERNAL_EXES = new Set(["where.exe"]),
  EXTERNAL_READONLY_COMMANDS = new Set(["git", "gh", "docker", "dotnet"]),
  DEFAULT_PATHEXT_EXTENSIONS = [
    "",
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".ps1",
    ".vbs",
    ".js",
    ".wsf",
    ".vbe",
    ".jse",
    ".wsh",
    ".msc",
    ".cpl",
  ];
/**
 * 按当前 PATHEXT 缓存可执行扩展名列表与匹配正则（最多 64 项，扩展名≤16 字符）。
 */
//@ chunk-s67vc0kc.js:12203-12717 layout
class PathextCache {
  listByPathext = new Map();
  regexByPathext = new Map();
  list() {
    let e = env.PATHEXT ?? "",
      t = this.listByPathext.get(e);
    if (t === void 0) {
      let n = new Set(DEFAULT_PATHEXT_EXTENSIONS);
      for (let r of e.split(";").slice(0, 64)) {
        let lower = r.trim().toLowerCase();
        if (lower.startsWith(".") && lower.length <= 16) n.add(lower);
      }
      ((t = [...n]), this.listByPathext.set(e, t));
    }
    return t;
  }
  regex() {
    let e = env.PATHEXT ?? "",
      t = this.regexByPathext.get(e);
    if (t === void 0) {
      let mapped = this.list()
        .filter((r) => r !== "")
        .map((r) => urlPatternToRegex(r.slice(1)));
      ((t = new RegExp(`\\.(${mapped.join("|")})$`, "i")), this.regexByPathext.set(e, t));
    }
    return t;
  }
}
//@ chunk-s67vc0kc.js:12717-12729 layout
var pathextCache = new PathextCache();
//@ chunk-s67vc0kc.js:12729-12759 layout
function getPathextList() {
  return pathextCache.list();
}
//@ chunk-s67vc0kc.js:12759-12790 layout
function getPathextRegex() {
  return pathextCache.regex();
}
/**
 * 输出重定向/写入目标的主名集合，用于检测"先写 ./git.exe 再运行 git"的 cwd 优先解析遮蔽。
 */
//@ chunk-s67vc0kc.js:12790-12879 layout
function E0r(e) {
  let t = new Set(commandBaseVariants(e).map((n) => n.stem));
  return (t.delete(""), Array.from(t));
}
/**
 * 对路径的多种规范拼写求末段名（base）及去掉可执行扩展名后的主名（stem）。
 */
//@ chunk-s67vc0kc.js:12879-13044 layout
function commandBaseVariants(e) {
  let t = getPathextRegex(),
    n = new Set(),
    r = [];
  for (let a of [(s) => s, lW, oZ, createSingleEditDiffConfig]) {
    let s = commandBaseName(e, a);
    if (n.has(s)) continue;
    (n.add(s), r.push({ base: s, stem: s.replace(t, "") }));
  }
  return r;
}
//@ chunk-s67vc0kc.js:13044-13326 layout
function commandBaseName(e, t) {
  let replaced = t(e).replace(/^[A-Za-z]:(?![\\/])/, ""),
    a = [];
  for (let s of replaced.split(/[\\/]+/)) {
    let c = stripTrailingDotsSpaces(s.replace(/:.*$/, ""));
    if (c === "." || c === "") continue;
    if (c === "..") {
      if (a.length > 0 && a.at(-1) !== "..") a.pop();
      else a.push("..");
      continue;
    }
    a.push(c);
  }
  return (a.at(-1) ?? "").toLowerCase();
}
/**
 * Windows 上当前目录中是否有与命令同名（含 PATHEXT 扩展）的文件，返回文件名。
 */
//@ chunk-s67vc0kc.js:13326-13582 layout
function findCwdShadowingExecutable(e) {
  if (getPlatform() !== "windows") return null;
  let t = getCwd(),
    n = new Set();
  for (let { base: base, stem: stem } of commandBaseVariants(e))
    for (let s of base === stem ? [stem] : [stem, base]) {
      if (s === "" || n.has(s)) continue;
      n.add(s);
      for (let c of getPathextList()) {
        let o = join(t, s + c);
        try {
          if (statSync(o).isFile()) return s + c;
        } catch {}
      }
    }
  return null;
}
//@ chunk-s67vc0kc.js:13582-13612 layout
var EXECUTABLE_EXT_RE = /\.(exe|cmd|bat|com)$/;
/**
 * 把 PowerShell 命令名规范化：小写、去 .exe/.cmd/.bat/.com，别名（ls/cat/rm/cd…）解析为规范 cmdlet 名。
 */
//@ chunk-s67vc0kc.js:13612-13757 file-local
function resolveToCanonical(name) {
  let lower = name.toLowerCase();
  if (!lower.includes("\\") && !lower.includes("/")) lower = lower.replace(EXECUTABLE_EXT_RE, "");
  let alias = COMMON_ALIASES[lower];
  if (alias) return alias.toLowerCase();
  return lower;
}
/**
 * 是否改变工作目录：Set-Location/Push-Location/Pop-Location/New-PSDrive、cd..、cd\、盘符切换，Windows 上还有 ndr/mount。
 */
//@ chunk-s67vc0kc.js:13757-14013 fingerprint = isCwdChangingCmdlet (0.734)
function isCwdChangingCmdlet(name) {
  let lower = name.toLowerCase();
  if (lower === "cd.." || lower === "cd\\" || lower === "cd/" || lower === "cd~" || /^[a-z]:$/.test(lower))
    return !0;
  let canonical = resolveToCanonical(name);
  return (
    canonical === "set-location" ||
    canonical === "push-location" ||
    canonical === "pop-location" ||
    canonical === "new-psdrive" ||
    (getPlatform() === "windows" && (canonical === "ndr" || canonical === "mount"))
  );
}
/**
 * 无参数时视为安全的输出命令（Out-Null）。
 */
//@ chunk-s67vc0kc.js:14013-14058 file-local
function isSafeOutputCommand(name) {
  let canonical = resolveToCanonical(name);
  return SAFE_OUTPUT_CMDLETS.has(canonical);
}
/**
 * 管道尾部的格式化/筛选命令（Format-*\/Select-Object/Sort-Object/Where-Object/Out-String…）且参数在白名单内。
 */
//@ chunk-s67vc0kc.js:14058-14132 file-local
function isAllowlistedPipelineTail(cmd, originalCommand) {
  let canonical = resolveToCanonical(cmd.name);
  if (!PIPELINE_TAIL_CMDLETS.has(canonical)) return !1;
  return isAllowlistedCommand(cmd, originalCommand);
}
/**
 * 语句是否可证明安全：PipelineAst 且所有元素都是 CommandAst。
 */
//@ chunk-s67vc0kc.js:14132-14300 fingerprint = isProvablySafeStatement (1)
function isProvablySafeStatement(stmt) {
  if (stmt.statementType !== "PipelineAst") return !1;
  if (stmt.commands.length === 0) return !1;
  for (let cmd of stmt.commands) if (cmd.elementType !== "CommandAst") return !1;
  return !0;
}
/**
 * 在只读白名单中查找命令（先原名，再规范化名）。
 */
//@ chunk-s67vc0kc.js:14300-14398 file-local
function lookupAllowlist(name) {
  let lower = name.toLowerCase(),
    direct = CMDLET_ALLOWLIST[lower];
  if (direct) return direct;
  let canonical = resolveToCanonical(lower);
  if (canonical !== lower) return CMDLET_ALLOWLIST[canonical];
  return;
}
/**
 * 不解析就能发现的安全隐患：$( 子表达式、@splat、.Method( 调用、$var= 赋值、--% 停止解析、UNC \ 或 //、:: 静态成员。
 */
//@ chunk-s67vc0kc.js:14398-14692 file-local
function hasSyncSecurityConcerns(command) {
  let trimmed = command.trim();
  if (!trimmed) return !1;
  if (/\$\(/.test(trimmed)) return !0;
  if (/(?:^|[^\w.])@\w+/.test(trimmed)) return !0;
  if (/\.\w+\s*\(/.test(trimmed)) return !0;
  if (/\$\w+\s*[+\-*/]?=/.test(trimmed)) return !0;
  if (/--%/.test(trimmed)) return !0;
  if (/\\\\/.test(trimmed) || /(?<!:)\/\//.test(trimmed)) return !0;
  if (/::/.test(trimmed)) return !0;
  return !1;
}
/**
 * PowerShell 只读判定：解析成功、无脚本块/子表达式/可展开字符串/splatting/成员调用/赋值/停止解析；复合命令中不能有改目录；重定向只能到 null；每段管道首命令在白名单、后续命令是白名单或无参数安全输出；不能有嵌套命令。
 */
//@ chunk-s67vc0kc.js:14692-15510 fingerprint = isReadOnlyCommand (1)
function isReadOnlyCommand(command, parsed) {
  if (!command.trim()) return !1;
  if (!parsed) return !1;
  if (!parsed.valid) return !1;
  let security = deriveSecurityFlags(parsed);
  if (
    security.hasScriptBlocks ||
    security.hasSubExpressions ||
    security.hasExpandableStrings ||
    security.hasSplatting ||
    security.hasMemberInvocations ||
    security.hasAssignments ||
    security.hasStopParsing
  )
    return !1;
  let segments = getPipelineSegments(parsed);
  if (segments.length === 0) return !1;
  if (segments.reduce((sum, seg) => sum + seg.commands.length, 0) > 1) {
    if (segments.some((seg) => seg.commands.some((cmd) => isCwdChangingCmdlet(cmd.name)))) return !1;
  }
  for (let pipeline of segments) {
    if (!pipeline || pipeline.commands.length === 0) return !1;
    if (pipeline.redirections.length > 0) {
      if (
        pipeline.redirections.some(
          (redirection) => !redirection.isMerging && !isNullRedirectionTarget(redirection.target),
        )
      )
        return !1;
    }
    let o = pipeline.commands[0];
    if (!o) return !1;
    if (!isAllowlistedCommand(o, command)) return !1;
    for (let l = 1; l < pipeline.commands.length; l++) {
      let u = pipeline.commands[l];
      if (!u || u.nameType === "application") return !1;
      if (isSafeOutputCommand(u.name) && u.args.length === 0) continue;
      if (!isAllowlistedCommand(u, command)) return !1;
    }
    if (pipeline.nestedCommands && pipeline.nestedCommands.length > 0) return !1;
  }
  return !0;
}
//@ chunk-s67vc0kc.js:15510-15581 layout
var A = (e, t = !1) => (t && e.length > 1 && e[1] === "-" ? e : e.replace(/(?!^)[-']/g, ""));
/**
 * 参数里是否有 -ErrorAction/-WarningAction 等取值不在安全集合（如 Ignore/SilentlyContinue 之外的危险值）的情况，支持缩写与冒号绑定。
 */
//@ chunk-s67vc0kc.js:15581-16263 layout
function hasNonDefaultActionPreference(e, t, n = "full") {
  let r = n === "full" ? N : U;
  for (let a = 0; a < e.length; a++) {
    let s = e[a];
    if (!PS_TOKENIZER_DASH_CHARS.has(s[0])) continue;
    if (t !== void 0 && t[a + 1] !== void 0 && t[a + 1] !== "Parameter") continue;
    let c = s[0] === "-" ? s : "-" + s.slice(1),
      index = c.indexOf(":"),
      lower = (index > 0 ? c.slice(0, index) : c).toLowerCase(),
      u = null;
    if (!r(lower) && !r(A(lower, n === "exact"))) {
      let lower_2 = gP(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase(),
        index = lower_2.indexOf(":", 1),
        p = index > 0 ? lower_2.slice(0, index) : lower_2;
      if (!r(p) && !r(A(p, n === "exact")) && !/[^\x20-\x7e]/.test(lower_2)) continue;
      if (index > 0) {
        let sliced = lower_2.slice(index + 1);
        u = sliced.trim() !== "" ? sliced : (e[a + 1] ?? "");
      }
    }
    let f = index > 0 ? c.slice(index + 1) : null,
      trimmed = (u ?? (f !== null && f.trim() !== "" ? f : (e[a + 1] ?? "")))
        .toLowerCase()
        .replace(/^['"]|['"]$/g, "")
        .trim();
    if (trimmed.length > 0 && !POWERSHELL_ACTION_VALUES.has(trimmed)) return !0;
  }
  return !1;
}
/**
 * 参数里是否有写变量的通用参数（-OutVariable/-ErrorVariable/…-Variable），或其值含 $、反引号、here-string、作用域前缀不合法等。
 */
//@ chunk-s67vc0kc.js:16263-17321 layout
function hasVariableWritingParam(e, t, n = "full") {
  let r = n === "full" ? k : j,
    a = (s) => r(s) || (n === "full" && (s.endsWith("variable") || V(s)));
  for (let s = 0; s < e.length; s++) {
    let c = e[s];
    if (!PS_TOKENIZER_DASH_CHARS.has(c[0])) continue;
    if (t !== void 0 && t[s + 1] !== void 0 && t[s + 1] !== "Parameter") continue;
    let o = c[0] === "-" ? c : "-" + c.slice(1),
      l = parseColonBoundParam(o),
      lower = (l !== null ? o.slice(0, l.colonIdx) : o).toLowerCase();
    if (!a(lower) && !a(A(lower, n === "exact"))) {
      let lower_2 = gP(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
      if (lower_2 !== lower && (a(lower_2) || a(A(lower_2, n === "exact")))) return !0;
      let index = lower_2.indexOf(":", 1);
      if (index > 0 && a(A(lower_2.slice(0, index), n === "exact"))) return !0;
      if (/[^\x20-\x7e]/.test(lower_2)) return !0;
      continue;
    }
    let f;
    if (l !== null) {
      if (l.isHereString) return !0;
      if (l.post.includes("$") || l.post.includes("`")) return !0;
      f = l.postResolved !== "" ? l.postResolved : (e[s + 1] ?? "");
    } else f = e[s + 1] ?? "";
    if (f.includes("$") || f.includes("`")) return !0;
    let trimmed = lW(skipLeadingWhitespaceAndComments(f)).toLowerCase().trim();
    if (trimmed.length === 0) continue;
    let m = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed,
      index = m.lastIndexOf(":"),
      S = m;
    if (index >= 0) {
      let sliced = m.slice(0, index);
      if (!POWERSHELL_SCOPE_NAMES.has(sliced) && !/^[0-9]+$/.test(sliced)) return !0;
      S = m.slice(index + 1);
    }
    if (!/^[a-z0-9_]+$/.test(S)) return !0;
    if (M.has(S)) return !0;
  }
  return !1;
}
//@ chunk-s67vc0kc.js:17321-17426 layout
function needsNativeQuoting(e) {
  return e.includes('"') || (/[\s\u0085\u180e]/.test(e) && (e.match(/\\+$/)?.[0].length ?? 0) % 2 === 1);
}
//@ chunk-s67vc0kc.js:17426-17717 layout
function parseColonBoundParam(e) {
  if (e.length === 0 || !(PS_TOKENIZER_DASH_CHARS.has(e[0]) || e[0] === "/")) return null;
  let index = e.indexOf(":", 1);
  if (index <= 0) return null;
  let n = skipLeadingWhitespaceAndComments(e.slice(index + 1)),
    r = skipLeadingWhitespaceAndComments(n.replace(/`[\r\n]+\s*/g, "")),
    a = /^@['"\u2018-\u201F]/.test(n) || /^@['"\u2018-\u201F]/.test(r);
  return { colonIdx: index, post: n, postResolved: r, isHereString: a };
}
/**
 * 判断参数是否存在原生程序引号传递隐患：原文或去掉续行后的文本命中检查，或冒号绑定参数（-Param:value）的值在各种解析/规范化形式下命中检查；here-string 一律视为有隐患。
 */
//@ chunk-s67vc0kc.js:17717-18021 layout
function hasNativeQuotingHazard(e, t = !0) {
  let replaced = e.replace(/`[\r\n]+\s*/g, "");
  if (needsNativeQuoting(e) || needsNativeQuoting(E(replaced))) return !0;
  if (t) {
    let r = parseColonBoundParam(e);
    if (r !== null) {
      let { post: post, postResolved: postResolved } = r;
      if (r.isHereString) return !0;
      let c = lW(postResolved),
        o = lW(post),
        l = oZ(postResolved),
        u = oZ(post),
        f = createSingleEditDiffConfig(postResolved),
        g = createSingleEditDiffConfig(post);
      if (
        needsNativeQuoting(c) ||
        needsNativeQuoting(o) ||
        needsNativeQuoting(E(c)) ||
        needsNativeQuoting(l) ||
        needsNativeQuoting(u) ||
        needsNativeQuoting(E(l)) ||
        needsNativeQuoting(f) ||
        needsNativeQuoting(g) ||
        needsNativeQuoting(E(f))
      )
        return !0;
    }
  }
  return !1;
}
//@ chunk-s67vc0kc.js:18021-18047 layout
var TENGU_HAZY_PEACH = "tengu_hazy_peach";
/**
 * 开关 tengu_hazy_peach：命令名按扩展空白集（含 U+0085/U+180E）切分。
 */
//@ chunk-s67vc0kc.js:18047-18086 layout
function TOo() {
  return readFlagWithOverride(TENGU_HAZY_PEACH, { safe: !0 });
}
/**
 * 单个 PowerShell 命令是否在只读白名单内：外部程序仅允许 where.exe；查白名单配置、regex、额外危险回调；参数必须是字符串常量或参数（值不可展开）；再按配置校验参数，git/docker/dotnet 走专用检查。
 */
//@ chunk-s67vc0kc.js:18086-20051 callgraph-witnessed = isAllowlistedCommand (0.662)
function isAllowlistedCommand(cmd, originalCommand) {
  if (cmd.nameType === "application") {
    let o = TOo() ? mVn : /\s/,
      l = cmd.text.split(o, 1)[0]?.toLowerCase() ?? "";
    if (!SAFE_EXTERNAL_EXES.has(l)) return !1;
  }
  let config = lookupAllowlist(cmd.name);
  if (!config) return !1;
  if (config.regex && !config.regex.test(originalCommand)) return !1;
  if (config.additionalCommandIsDangerousCallback?.(originalCommand, cmd)) return !1;
  if (!cmd.elementTypes) return !1;
  for (let o = 1; o < cmd.elementTypes.length; o++) {
    let l = cmd.elementTypes[o];
    if (l !== "StringConstant" && l !== "Parameter") {
      if (!/[$(@{[]/.test(cmd.args[o - 1] ?? "")) continue;
      return !1;
    }
    if (l === "Parameter") {
      let paramChildren = cmd.children?.[o - 1];
      if (paramChildren) {
        if (paramChildren.some((f) => f.type !== "StringConstant")) return !1;
      } else {
        let f = cmd.args[o - 1] ?? "",
          colonIdx = f.indexOf(":");
        if (colonIdx > 0 && /[$(@{[]/.test(f.slice(colonIdx + 1))) return !1;
      }
    }
  }
  let canonical = resolveToCanonical(cmd.name),
    a = EXTERNAL_READONLY_COMMANDS.has(canonical),
    isCmdlet = canonical.includes("-"),
    c = cmd.nameType !== "cmdlet";
  if (getPlatform() === "windows") {
    if (c || a) {
      for (let arg of cmd.args)
        if (hasNativeQuotingHazard(arg, !isCmdlet || cmd.nameType === "application")) return !1;
    }
    if (findCwdShadowingExecutable(cmd.name) !== null) return !1;
  }
  if (!isCmdlet || cmd.nameType === "application")
    for (let o = 1; o < cmd.elementTypes.length; o++) {
      let l = cmd.elementTypes[o];
      if (l !== "StringConstant" && l !== "Parameter") return !1;
      if (l === "Parameter" && !a && (cmd.args[o - 1] ?? "").includes(":")) return !1;
    }
  if (a) {
    let o = null;
    for (let l = 1; l < cmd.elementTypes.length; l++) {
      let u = cmd.args[l - 1] ?? "";
      if (cmd.elementTypes[l] === "Parameter") {
        let f = parseColonBoundParam(u);
        if (f !== null) {
          if (f.isHereString) return !1;
          ((o ??= cmd.args.slice(0, l - 1)), o.push(u.slice(0, f.colonIdx), gP(lW(f.postResolved))));
          continue;
        }
      }
      o?.push(u);
    }
    if (o !== null && !isExternalCommandSafe(canonical, o)) return !1;
    return isExternalCommandSafe(canonical, cmd.args);
  }
  if (isCmdlet && hasNonDefaultActionPreference(cmd.args, cmd.elementTypes)) return !1;
  if (isCmdlet && hasVariableWritingParam(cmd.args, cmd.elementTypes)) return !1;
  if (config.allowAllFlags) return !0;
  if (!config.safeFlags || config.safeFlags.length === 0)
    return !cmd.args.some((arg, u) => {
      if (isCmdlet) return isPowerShellParameter(arg, cmd.elementTypes?.[u + 1]);
      return arg.startsWith("-") || !1;
    });
  for (let o = 0; o < cmd.args.length; o++) {
    let l = cmd.args[o];
    if (isCmdlet ? isPowerShellParameter(l, cmd.elementTypes?.[o + 1]) : l.startsWith("-") || !1) {
      let f = isCmdlet ? "-" + l.slice(1) : l;
      if (isCmdlet || l.startsWith("/")) {
        let colonIndex = f.indexOf(":");
        if (colonIndex > 0) f = f.substring(0, colonIndex);
      }
      let paramLower = f.toLowerCase();
      if (isCmdlet && COMMON_PARAMETERS.has(paramLower)) continue;
      if (
        !(isCmdlet
          ? config.safeFlags.some((flag) => flag.toLowerCase() === paramLower)
          : config.safeFlags.includes(f))
      )
        return !1;
    }
  }
  return !0;
}
/**
 * 外部命令（git/gh/docker/dotnet）只读判定入口。
 */
//@ chunk-s67vc0kc.js:20051-20256 fingerprint = isExternalCommandSafe (1)
function isExternalCommandSafe(command, args) {
  for (let n of args) if (n.length > 0 && n[0] !== "-" && PS_TOKENIZER_DASH_CHARS.has(n[0])) return !1;
  switch (command) {
    case "git":
      return isGitSafePS(args);
    case "gh":
      return ye(args);
    case "docker":
      return isDockerSafe(args);
    case "dotnet":
      return isDotnetSafe(args);
    default:
      return !1;
  }
}
//@ chunk-s67vc0kc.js:20256-20536 layout = GIT_GLOBAL_FLAGS_WITH_VALUES (0.832)
var GIT_UNSAFE_GLOBAL_FLAGS = new Set([
    "-c",
    "-C",
    "--exec-path",
    "--config-env",
    "--git-dir",
    "--work-tree",
    "--bare",
    "--attr-source",
    "--help",
    "-h",
    "--shallow-file",
  ]),
  GIT_GLOBAL_FLAGS_WITH_VALUE = new Set([
    "-c",
    "-C",
    "--exec-path",
    "--config-env",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--shallow-file",
  ]),
  GIT_CONFIG_FLAGS = ["-c", "-C"];
//@ chunk-s67vc0kc.js:20536-20583 layout
function z(e) {
  return !e.includes("=") && GIT_GLOBAL_FLAGS_WITH_VALUE.has(e);
}
//@ chunk-s67vc0kc.js:20583-20807 layout
function argsTokenShapeMatch(e, t) {
  for (let n = 0; n < e.length; n++) {
    let r = e[n] ?? "",
      a = t[n] ?? "";
    if (a.includes("\x00") || T(r).includes("\x00")) return !1;
    if (isFlagToken(a) !== isFlagToken(r) || (a === "--") !== (r === "--")) return !1;
    if (isFlagToken(r) && r !== a && z(r) !== z(a)) return !1;
  }
  return !0;
}
//@ chunk-s67vc0kc.js:20807-20878 layout
function R(e) {
  return e.map((t) => normalizeUnicodeDashes(gP(t.replace(/`[\r\n]+\s*/g, ""))));
}
//@ chunk-s67vc0kc.js:20878-20943 layout
function isGitSafePS(e) {
  let t = R(e);
  if (!argsTokenShapeMatch(e, t)) return !1;
  return isGitSafe(e) && isGitSafe(t);
}
/**
 * git 参数只读判定：Windows 引号风险、$ 变量、危险全局选项（-c/-C/--git-dir…）、按 GIT_READ_ONLY_COMMANDS 查子命令并校验选项，ls-remote 只允许选项。
 */
//@ chunk-s67vc0kc.js:20943-21780 fingerprint = isGitSafe (0.873)
function isGitSafe(args) {
  if (args.length === 0) return !0;
  if (getPlatform() === "windows") {
    for (let arg of args) if (hasNativeQuotingHazard(arg)) return !1;
  }
  for (let u of args) if (u.includes("$")) return !1;
  let idx = 0;
  while (idx < args.length) {
    let u = args[idx];
    if (!u || !u.startsWith("-")) break;
    for (let shortFlag of GIT_CONFIG_FLAGS)
      if (
        u.length > shortFlag.length &&
        u.startsWith(shortFlag) &&
        (shortFlag === "-C" || u[shortFlag.length] !== "-")
      )
        return !1;
    let hasInlineValue = u.includes("="),
      g = hasInlineValue ? firstLineOf(u, "=") : u;
    if (GIT_UNSAFE_GLOBAL_FLAGS.has(g)) return !1;
    if (!hasInlineValue && GIT_GLOBAL_FLAGS_WITH_VALUE.has(g)) idx += 2;
    else idx++;
  }
  if (idx >= args.length) return !0;
  let first = args[idx]?.toLowerCase() || "",
    r = idx + 1 < args.length ? args[idx + 1]?.toLowerCase() || "" : "",
    twoWordKey = `git ${first} ${r}`,
    oneWordKey = `git ${first}`,
    c = GIT_READ_ONLY_COMMANDS[twoWordKey],
    subcommandTokens = 2;
  if (!c) ((c = GIT_READ_ONLY_COMMANDS[oneWordKey]), (subcommandTokens = 1));
  if (!c) return !1;
  let flagArgs = args.slice(idx + subcommandTokens);
  if (first === "ls-remote") {
    let u = !1;
    for (let arg of flagArgs) {
      if (!u && arg === "--") {
        u = !0;
        continue;
      }
      if (u || arg === "-" || !arg.startsWith("-")) return !1;
    }
  }
  if (c.additionalCommandIsDangerousCallback && c.additionalCommandIsDangerousCallback("", flagArgs))
    return !1;
  return validateFlags(flagArgs, 0, c, { commandName: "git" });
}
//@ chunk-s67vc0kc.js:21780-21845 layout
function ye(e) {
  let t = R(e);
  if (!argsTokenShapeMatch(e, t)) return !1;
  return K(e) && K(t);
}
//@ chunk-s67vc0kc.js:21845-21868 layout
function K(e) {
  return !1;
}
//@ chunk-s67vc0kc.js:21868-21985 layout
var DOCKER_DANGEROUS_SHORT_FLAGS = new Set(
    DOCKER_DANGEROUS_FLAGS.filter((e) => /^-[^-]$/.test(e)).map((e) => e[1]),
  ),
  DOCKER_DANGEROUS_LONG_FLAGS = [...DOCKER_DANGEROUS_FLAGS.filter((e) => e.startsWith("--")), "--tls"];
/**
 * docker 参数只读判定：无变量、无危险全局选项（-H/--host/--tls…），子命令在只读列表或配置内并校验选项。
 */
//@ chunk-s67vc0kc.js:21985-22567 fingerprint = isDockerSafe (1)
function isDockerSafe(args) {
  if (args.length === 0) return !0;
  let t = R(args);
  if (getPlatform() === "windows") {
    for (let arg of args) if (hasNativeQuotingHazard(arg)) return !1;
  }
  for (let s of t) if (s.includes("$")) return !1;
  for (let s of t) {
    if (s[0] === "-" && s[1] !== "-")
      for (let o = 1; o < s.length; o++) {
        let l = s[o];
        if (DOCKER_DANGEROUS_SHORT_FLAGS.has(l)) return !1;
        if (l !== "h" && DOCKER_DANGEROUS_SHORT_FLAGS.has(l.toLowerCase())) return !1;
      }
    let lower = s.toLowerCase();
    if (DOCKER_DANGEROUS_LONG_FLAGS.some((o) => lower.startsWith(o))) return !1;
  }
  let oneWordKey = `docker ${t[0]?.toLowerCase()}`;
  if (DOCKER_BARE_READ_ONLY_COMMANDS.includes(oneWordKey)) return !0;
  let r = DOCKER_READ_ONLY_COMMANDS[oneWordKey];
  if (!r) return !1;
  let flagArgs = t.slice(1);
  if (r.additionalCommandIsDangerousCallback && r.additionalCommandIsDangerousCallback("", flagArgs))
    return !1;
  return validateFlags(flagArgs, 0, r);
}
/**
 * dotnet 只读：只允许 --list-runtimes / --list-sdks。
 */
//@ chunk-s67vc0kc.js:22567-22668 file-local
function isDotnetSafe(args) {
  if (args.length === 0) return !1;
  for (let arg of args) if (!DOTNET_READ_ONLY_FLAGS.has(arg.toLowerCase())) return !1;
  return !0;
}

export {
  isAllowlistedCommand,
  resolveToCanonical,
  hasSyncSecurityConcerns,
  isReadOnlyCommand,
  TOo,
  isSafeOutputCommand,
  isCwdChangingCmdlet,
  E0r,
  commandBaseVariants,
  argLeaksValue,
  SAFE_POWERSHELL_VERBS,
  hasVariableWritingParam,
  hasNonDefaultActionPreference,
  isProvablySafeStatement,
  isAllowlistedPipelineTail,
};
