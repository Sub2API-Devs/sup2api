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
import {
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  unescapePsDoubleQuoted,
  skipLeadingWhitespaceAndComments,
  unescapePsSimpleEscapes,
  PS_LEADING_WHITESPACE_RE,
  unescapePsNullEscape,
} from "./powershellParsing.js";
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
/**
 * 判断参数是否为 ActionPreference 通用参数的别名或缩写。
 */
function isActionParamAlias(e) {
  if (e.length < 2) return false;
  return COMMON_ACTION_PARAM_ALIASES.includes(e) || COMMON_ACTION_PARAMS.some((t) => t.startsWith(e));
}
//@ chunk-s67vc0kc.js:2474-2577 placement = checkTokenBudget (0.447)
/**
 * ActionPreference 取值（silentlycontinue/stop/continue/ignore 及数字）。
 */
var POWERSHELL_ACTION_PARAMS = new Set([...COMMON_ACTION_PARAMS, ...COMMON_ACTION_PARAM_ALIASES]);
var POWERSHELL_ACTION_VALUES = new Set([
  "silentlycontinue",
  "0",
  "stop",
  "1",
  "continue",
  "2",
  "ignore",
  "4",
]);
//@ chunk-s67vc0kc.js:2577-2665 placement
/**
 * 判断参数是否为变量相关通用参数的别名或缩写。
 */
function isVariableParamAlias(e) {
  if (e.length < 2) return false;
  return COMMON_VARIABLE_PARAM_ALIASES.includes(e) || COMMON_VARIABLE_PARAMS.some((t) => t.startsWith(e));
}
//@ chunk-s67vc0kc.js:2665-3583 placement
/**
 * PowerShell 影响命令行为的偏好变量集合（ErrorActionPreference、VerbosePreference 等）。
 */
var POWERSHELL_SCOPE_NAMES = new Set(["global", "script", "local", "private", "variable"]);
var PS_PREFERENCE_VARIABLES = new Set([
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
]);
var DOCKER_DANGEROUS_LONG_FLAGS = [
  ...COMMON_ACTION_PARAMS,
  ...COMMON_VARIABLE_PARAMS,
  "-outbuffer",
  "-verbose",
  "-debug",
];
var filtered = DOCKER_DANGEROUS_LONG_FLAGS.filter((e) => e !== "-progressaction");
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
  if (e.length < 2) return false;
  for (let n of [DOCKER_DANGEROUS_LONG_FLAGS, filtered]) {
    let r = uniquePrefixMatch(e, n);
    if (r !== null && t.includes(r)) return true;
  }
  return false;
}
//@ chunk-s67vc0kc.js:3802-3848 placement
/**
 * 通用参数别名集合（含 -ea/-wa/-p），在这些参数上不允许缩写匹配。
 */
var PS_COMMON_PARAM_ALIASES = new Set([...COMMON_VARIABLE_PARAM_ALIASES, "-ea", "-wa", "-p"]);
var isAbbrevAllowed = false;
//@ chunk-s67vc0kc.js:3848-3925 placement
/**
 * 判断参数是否匹配给定通用参数别名或缩写前缀。
 */
function matchesCommonParam(e, t, n, isAbbrevAllowed) {
  if (!isAbbrevAllowed && PS_COMMON_PARAM_ALIASES.has(e)) return false;
  return t.includes(e) || matchesAbbreviatedParam(e, n);
}
//@ chunk-s67vc0kc.js:3925-3963 placement
/**
 * 通用参数判定封装（带缩写开关）。
 */
function isCommonParam(e, t, n) {
  return matchesCommonParam(e, t, n, isAbbrevAllowed);
}
//@ chunk-s67vc0kc.js:3963-3993 placement
/**
 * 判断是否为变量相关通用参数。
 */
function isVariableParam(e) {
  return isCommonParam(e, COMMON_VARIABLE_PARAM_ALIASES, COMMON_VARIABLE_PARAMS);
}
//@ chunk-s67vc0kc.js:3993-4023 placement
/**
 * 判断是否为 ActionPreference 类通用参数。
 */
function isActionParam(e) {
  return isCommonParam(e, COMMON_ACTION_PARAM_ALIASES, COMMON_ACTION_PARAMS);
}
//@ chunk-s67vc0kc.js:4023-5032 placement
/**
 * 安全动词前缀列表（get/set/copy/move 等）。
 */
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
]);
var SAFE_VERB_PREFIXES = ["-variable", "-sessionvariable", "-responseheadersvariable", "-statuscodevariable"];
//@ chunk-s67vc0kc.js:5032-5106 layout
/**
 * 判断动词缩写是否匹配安全动词（至少 3 个字母）。
 */
function isSafeVerbAbbreviation(e) {
  if (e.length < 3) return false;
  return SAFE_VERB_PREFIXES.some((t) => t.startsWith(e));
}
//@ chunk-s67vc0kc.js:5106-5156 fingerprint = DOTNET_READ_ONLY_FLAGS (0.7)
var DOTNET_READ_ONLY_FLAGS = new Set(["--list-runtimes", "--list-sdks"]);
//@ chunk-s67vc0kc.js:5156-5548 fingerprint = argLeaksValue (1)
/**
 * 参数是否可能泄露/展开值：非字符串常量参数含 $ ( @ { [，或参数绑定的子元素不是字符串常量，或冒号绑定值含表达式。
 */
function argLeaksValue(_cmd, element) {
  let argTypes = (element?.elementTypes ?? []).slice(1);
  let args = element?.args ?? [];
  let children = element?.children;
  for (let i = 0; i < argTypes.length; i++) {
    if (argTypes[i] !== "StringConstant" && argTypes[i] !== "Parameter") {
      if (!/[$(@{[]/.test(args[i] ?? "")) continue;
      return true;
    }
    if (argTypes[i] === "Parameter") {
      let paramChildren = children?.[i];
      if (paramChildren) {
        if (paramChildren.some((paramChild) => paramChild.type !== "StringConstant")) return true;
      } else {
        let arg = args[i] ?? "";
        let colonIdx = arg.indexOf(":");
        if (colonIdx > 0 && /[$(@{[]/.test(arg.slice(colonIdx + 1))) return true;
      }
    }
  }
  return false;
}
//@ chunk-s67vc0kc.js:5548-12203 fingerprint = CMDLET_ALLOWLIST (0.943)
/**
 * PowerShell 只读 cmdlet 白名单 CMDLET_ALLOWLIST（Get-ChildItem/Get-Content/Select-String/Get-Process/Test-Path/… 以及 git/gh/docker/dotnet 外部命令），每项列安全参数与额外危险回调；还有安全输出命令、管道尾部格式化命令、默认 PATHEXT 扩展名表。
 */
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
  "get-item": {
    safeFlags: ["-Path", "-LiteralPath", "-Force", "-Stream"],
  },
  "get-itemproperty": {
    safeFlags: ["-Path", "-LiteralPath", "-Name"],
  },
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
  "resolve-path": {
    safeFlags: ["-Path", "-LiteralPath", "-Relative"],
  },
  "get-filehash": {
    safeFlags: ["-Path", "-LiteralPath", "-Algorithm", "-InputStream"],
  },
  "get-acl": {
    safeFlags: ["-Path", "-LiteralPath", "-Audit", "-Filter", "-Include", "-Exclude"],
  },
  "set-location": {
    safeFlags: ["-Path", "-LiteralPath", "-PassThru", "-StackName"],
  },
  "push-location": {
    safeFlags: ["-Path", "-LiteralPath", "-PassThru", "-StackName"],
  },
  "pop-location": {
    safeFlags: ["-PassThru", "-StackName"],
  },
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
  "convertto-json": {
    safeFlags: ["-InputObject", "-Depth", "-Compress", "-EnumsAsStrings", "-AsArray"],
  },
  "convertfrom-json": {
    safeFlags: ["-InputObject", "-Depth", "-AsHashtable", "-NoEnumerate"],
  },
  "convertto-csv": {
    safeFlags: ["-InputObject", "-Delimiter", "-NoTypeInformation", "-NoHeader", "-UseQuotes"],
  },
  "convertfrom-csv": {
    safeFlags: ["-InputObject", "-Delimiter", "-Header", "-UseCulture"],
  },
  "convertto-xml": {
    safeFlags: ["-InputObject", "-Depth", "-As", "-NoTypeInformation"],
  },
  "convertto-html": {
    safeFlags: ["-InputObject", "-Property", "-Head", "-Title", "-Body", "-Pre", "-Post", "-As", "-Fragment"],
  },
  "format-hex": {
    safeFlags: ["-Path", "-LiteralPath", "-InputObject", "-Encoding", "-Count", "-Offset"],
  },
  "get-member": {
    safeFlags: ["-InputObject", "-MemberType", "-Name", "-Static", "-View", "-Force"],
  },
  "get-unique": {
    safeFlags: ["-InputObject", "-AsString", "-CaseInsensitive", "-OnType"],
  },
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
  "get-random": {
    safeFlags: ["-InputObject", "-Minimum", "-Maximum", "-Count", "-SetSeed", "-Shuffle"],
  },
  "convert-path": {
    safeFlags: ["-Path", "-LiteralPath"],
  },
  "join-path": {
    safeFlags: ["-Path", "-ChildPath", "-AdditionalChildPath"],
  },
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
  "get-itempropertyvalue": {
    safeFlags: ["-Path", "-LiteralPath", "-Name"],
  },
  "get-psprovider": {
    safeFlags: ["-PSProvider"],
  },
  "get-computerinfo": {
    allowAllFlags: true,
  },
  "get-host": {
    allowAllFlags: true,
  },
  "get-date": {
    safeFlags: ["-Date", "-Format", "-UFormat", "-DisplayHint", "-AsUTC"],
  },
  "get-location": {
    safeFlags: ["-PSProvider", "-PSDrive", "-Stack", "-StackName"],
  },
  "get-psdrive": {
    safeFlags: ["-Name", "-PSProvider", "-Scope"],
  },
  "get-module": {
    safeFlags: ["-Name", "-ListAvailable", "-All", "-FullyQualifiedName", "-PSEdition"],
  },
  "get-alias": {
    safeFlags: ["-Name", "-Definition", "-Scope", "-Exclude"],
  },
  "get-history": {
    safeFlags: ["-Id", "-Count"],
  },
  "get-culture": {
    allowAllFlags: true,
  },
  "get-uiculture": {
    allowAllFlags: true,
  },
  "get-timezone": {
    safeFlags: ["-Name", "-Id", "-ListAvailable"],
  },
  "get-uptime": {
    allowAllFlags: true,
  },
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
  "format-table": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "format-list": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "format-wide": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "format-custom": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "measure-object": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "select-object": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "sort-object": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "group-object": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "where-object": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "out-string": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "out-host": {
    allowAllFlags: true,
    additionalCommandIsDangerousCallback: argLeaksValue,
  },
  "get-netadapter": {
    safeFlags: ["-Name", "-InterfaceDescription", "-InterfaceIndex", "-Physical"],
  },
  "get-netipaddress": {
    safeFlags: ["-InterfaceIndex", "-InterfaceAlias", "-AddressFamily", "-Type"],
  },
  "get-netroute": {
    safeFlags: ["-InterfaceIndex", "-InterfaceAlias", "-AddressFamily", "-DestinationPrefix"],
  },
  "get-dnsclient": {
    safeFlags: ["-InterfaceIndex", "-InterfaceAlias"],
  },
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
    additionalCommandIsDangerousCallback: (_cmd, element) =>
      (element?.args ?? []).some((n) => !n.startsWith("/") && !n.startsWith("-")),
  },
  netstat: {
    safeFlags: ["-a", "-b", "-e", "-f", "-n", "-o", "-p", "-q", "-r", "-s", "-t", "-x", "-y"],
  },
  systeminfo: {
    safeFlags: ["/FO", "/NH"],
  },
  tasklist: {
    safeFlags: ["/M", "/SVC", "/V", "/FI", "/FO", "/NH"],
  },
  "where.exe": {
    allowAllFlags: true,
  },
  hostname: {
    safeFlags: ["-a", "-d", "-f", "-i", "-I", "-s", "-y", "-A"],
    additionalCommandIsDangerousCallback: (_cmd, element) =>
      (element?.args ?? []).some((n) => !n.startsWith("-")),
  },
  whoami: {
    safeFlags: ["/user", "/groups", "/claims", "/priv", "/logonid", "/all", "/fo", "/nh"],
  },
  ver: {
    allowAllFlags: true,
  },
  arp: {
    safeFlags: ["-a", "-g", "-v", "-n"],
    additionalCommandIsDangerousCallback: (_cmd, element) =>
      (element?.args ?? []).some((n) => !n.startsWith("-")),
  },
  route: {
    safeFlags: ["print", "PRINT", "-4", "-6"],
    additionalCommandIsDangerousCallback: (_cmd, element) => {
      if (!element) return true;
      return element.args.find((arg) => !arg.startsWith("-"))?.toLowerCase() !== "print";
    },
  },
  getmac: {
    safeFlags: ["/FO", "/NH", "/V"],
  },
  tree: {
    safeFlags: ["/F", "/A", "/Q", "/L"],
  },
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
});
var SAFE_OUTPUT_CMDLETS = new Set(["out-null"]);
var PIPELINE_TAIL_CMDLETS = new Set([
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
]);
var SAFE_EXTERNAL_EXES = new Set(["where.exe"]);
var EXTERNAL_READONLY_COMMANDS = new Set(["git", "gh", "docker", "dotnet"]);
var DEFAULT_PATHEXT_EXTENSIONS = [
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
//@ chunk-s67vc0kc.js:12203-12717 layout
/**
 * 按当前 PATHEXT 缓存可执行扩展名列表与匹配正则（最多 64 项，扩展名≤16 字符）。
 */
class PathextCache {
  listByPathext = new Map();
  regexByPathext = new Map();
  list() {
    let PATHEXT = env.PATHEXT ?? "";
    let t = this.listByPathext.get(PATHEXT);
    if (t === undefined) {
      let n = new Set(DEFAULT_PATHEXT_EXTENSIONS);
      for (let r of PATHEXT.split(";").slice(0, 64)) {
        let lower = r.trim().toLowerCase();
        if (lower.startsWith(".") && lower.length <= 16) n.add(lower);
      }
      t = [...n];
      this.listByPathext.set(PATHEXT, t);
    }
    return t;
  }
  regex() {
    let PATHEXT = env.PATHEXT ?? "";
    let t = this.regexByPathext.get(PATHEXT);
    if (t === undefined) {
      let mapped = this.list()
        .filter((r) => r !== "")
        .map((r) => urlPatternToRegex(r.slice(1)));
      t = new RegExp(`\\.(${mapped.join("|")})$`, "i");
      this.regexByPathext.set(PATHEXT, t);
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
//@ chunk-s67vc0kc.js:12790-12879 layout
/**
 * 输出重定向/写入目标的主名集合，用于检测"先写 ./git.exe 再运行 git"的 cwd 优先解析遮蔽。
 */
function baseStems(target) {
  let t = new Set(commandBaseVariants(target).map((n) => n.stem));
  t.delete("");
  return Array.from(t);
}
//@ chunk-s67vc0kc.js:12879-13044 layout
/**
 * 对路径的多种规范拼写求末段名（base）及去掉可执行扩展名后的主名（stem）。
 */
function commandBaseVariants(e) {
  let pathextRegex = getPathextRegex();
  let n = new Set();
  let r = [];
  for (let a of [
    (s) => s,
    stripPsParameterPrefix,
    stripFileSystemProviderPrefix,
    createSingleEditDiffConfig,
  ]) {
    let s = commandBaseName(e, a);
    if (n.has(s)) continue;
    n.add(s);
    r.push({
      base: s,
      stem: s.replace(pathextRegex, ""),
    });
  }
  return r;
}
//@ chunk-s67vc0kc.js:13044-13326 layout
function commandBaseName(e, t) {
  let replaced = t(e).replace(/^[A-Za-z]:(?![\\/])/, "");
  let a = [];
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
//@ chunk-s67vc0kc.js:13326-13582 layout
/**
 * Windows 上当前目录中是否有与命令同名（含 PATHEXT 扩展）的文件，返回文件名。
 */
function findCwdShadowingExecutable(name) {
  if (getPlatform() !== "windows") return null;
  let cwd = getCwd();
  let n = new Set();
  for (let { base, stem } of commandBaseVariants(name))
    for (let s of base === stem ? [stem] : [stem, base]) {
      if (s === "" || n.has(s)) continue;
      n.add(s);
      for (let c of getPathextList()) {
        let o = join(cwd, s + c);
        try {
          if (statSync(o).isFile()) return s + c;
        } catch {}
      }
    }
  return null;
}
//@ chunk-s67vc0kc.js:13582-13612 layout
var EXECUTABLE_EXT_RE = /\.(exe|cmd|bat|com)$/;
//@ chunk-s67vc0kc.js:13612-13757 file-local
/**
 * 把 PowerShell 命令名规范化：小写、去 .exe/.cmd/.bat/.com，别名（ls/cat/rm/cd…）解析为规范 cmdlet 名。
 */
function resolveToCanonical(name) {
  let lower = name.toLowerCase();
  if (!lower.includes("\\") && !lower.includes("/")) lower = lower.replace(EXECUTABLE_EXT_RE, "");
  let alias = COMMON_ALIASES[lower];
  if (alias) return alias.toLowerCase();
  return lower;
}
//@ chunk-s67vc0kc.js:13757-14013 fingerprint = isCwdChangingCmdlet (0.734)
/**
 * 是否改变工作目录：Set-Location/Push-Location/Pop-Location/New-PSDrive、cd..、cd\、盘符切换，Windows 上还有 ndr/mount。
 */
function isCwdChangingCmdlet(name) {
  let lower = name.toLowerCase();
  if (lower === "cd.." || lower === "cd\\" || lower === "cd/" || lower === "cd~" || /^[a-z]:$/.test(lower))
    return true;
  let canonical = resolveToCanonical(name);
  return (
    canonical === "set-location" ||
    canonical === "push-location" ||
    canonical === "pop-location" ||
    canonical === "new-psdrive" ||
    (getPlatform() === "windows" && (canonical === "ndr" || canonical === "mount"))
  );
}
//@ chunk-s67vc0kc.js:14013-14058 file-local
/**
 * 无参数时视为安全的输出命令（Out-Null）。
 */
function isSafeOutputCommand(name) {
  let canonical = resolveToCanonical(name);
  return SAFE_OUTPUT_CMDLETS.has(canonical);
}
//@ chunk-s67vc0kc.js:14058-14132 file-local
/**
 * 管道尾部的格式化/筛选命令（Format-*\/Select-Object/Sort-Object/Where-Object/Out-String…）且参数在白名单内。
 */
function isAllowlistedPipelineTail(cmd, originalCommand) {
  let canonical = resolveToCanonical(cmd.name);
  if (!PIPELINE_TAIL_CMDLETS.has(canonical)) return false;
  return isAllowlistedCommand(cmd, originalCommand);
}
//@ chunk-s67vc0kc.js:14132-14300 fingerprint = isProvablySafeStatement (1)
/**
 * 语句是否可证明安全：PipelineAst 且所有元素都是 CommandAst。
 */
function isProvablySafeStatement(stmt) {
  if (stmt.statementType !== "PipelineAst") return false;
  if (stmt.commands.length === 0) return false;
  for (let cmd of stmt.commands) if (cmd.elementType !== "CommandAst") return false;
  return true;
}
//@ chunk-s67vc0kc.js:14300-14398 file-local
/**
 * 在只读白名单中查找命令（先原名，再规范化名）。
 */
function lookupAllowlist(name) {
  let lower = name.toLowerCase();
  let direct = CMDLET_ALLOWLIST[lower];
  if (direct) return direct;
  let canonical = resolveToCanonical(lower);
  if (canonical !== lower) return CMDLET_ALLOWLIST[canonical];
  return;
}
//@ chunk-s67vc0kc.js:14398-14692 file-local
/**
 * 不解析就能发现的安全隐患：$( 子表达式、@splat、.Method( 调用、$var= 赋值、--% 停止解析、UNC \ 或 //、:: 静态成员。
 */
function hasSyncSecurityConcerns(command) {
  let trimmed = command.trim();
  if (!trimmed) return false;
  if (/\$\(/.test(trimmed)) return true;
  if (/(?:^|[^\w.])@\w+/.test(trimmed)) return true;
  if (/\.\w+\s*\(/.test(trimmed)) return true;
  if (/\$\w+\s*[+\-*/]?=/.test(trimmed)) return true;
  if (/--%/.test(trimmed)) return true;
  if (/\\\\/.test(trimmed) || /(?<!:)\/\//.test(trimmed)) return true;
  if (/::/.test(trimmed)) return true;
  return false;
}
//@ chunk-s67vc0kc.js:14692-15510 fingerprint = isReadOnlyCommand (1)
/**
 * PowerShell 只读判定：解析成功、无脚本块/子表达式/可展开字符串/splatting/成员调用/赋值/停止解析；复合命令中不能有改目录；重定向只能到 null；每段管道首命令在白名单、后续命令是白名单或无参数安全输出；不能有嵌套命令。
 */
function isReadOnlyCommand(command, parsed) {
  if (!command.trim()) return false;
  if (!parsed) return false;
  if (!parsed.valid) return false;
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
    return false;
  let segments = getPipelineSegments(parsed);
  if (segments.length === 0) return false;
  if (segments.reduce((sum, seg) => sum + seg.commands.length, 0) > 1) {
    if (segments.some((seg) => seg.commands.some((cmd) => isCwdChangingCmdlet(cmd.name)))) return false;
  }
  for (let pipeline of segments) {
    if (!pipeline || pipeline.commands.length === 0) return false;
    if (pipeline.redirections.length > 0) {
      if (
        pipeline.redirections.some(
          (redirection) => !redirection.isMerging && !isNullRedirectionTarget(redirection.target),
        )
      )
        return false;
    }
    let firstCmd = pipeline.commands[0];
    if (!firstCmd) return false;
    if (!isAllowlistedCommand(firstCmd, command)) return false;
    for (let i = 1; i < pipeline.commands.length; i++) {
      let cmd = pipeline.commands[i];
      if (!cmd || cmd.nameType === "application") return false;
      if (isSafeOutputCommand(cmd.name) && cmd.args.length === 0) continue;
      if (!isAllowlistedCommand(cmd, command)) return false;
    }
    if (pipeline.nestedCommands && pipeline.nestedCommands.length > 0) return false;
  }
  return true;
}
//@ chunk-s67vc0kc.js:15510-15581 layout
/**
 * 去掉参数名里的 - 与引号（保留首个短选项写法）。
 */
var stripDashQuotes = (e, t = false) => (t && e.length > 1 && e[1] === "-" ? e : e.replace(/(?!^)[-']/g, ""));
//@ chunk-s67vc0kc.js:15581-16263 layout
/**
 * 参数里是否有 -ErrorAction/-WarningAction 等取值不在安全集合（如 Ignore/SilentlyContinue 之外的危险值）的情况，支持缩写与冒号绑定。
 */
function hasNonDefaultActionPreference(e, elementTypes, n = "full") {
  let r = n === "full" ? isActionParamAlias : isActionParam;
  for (let idx = 0; idx < e.length; idx++) {
    let s = e[idx];
    if (!PS_TOKENIZER_DASH_CHARS.has(s[0])) continue;
    if (
      elementTypes !== undefined &&
      elementTypes[idx + 1] !== undefined &&
      elementTypes[idx + 1] !== "Parameter"
    )
      continue;
    let c = s[0] === "-" ? s : "-" + s.slice(1);
    let index = c.indexOf(":");
    let lower = (index > 0 ? c.slice(0, index) : c).toLowerCase();
    let u = null;
    if (!r(lower) && !r(stripDashQuotes(lower, n === "exact"))) {
      let lower_2 = unescapePsDoubleQuoted(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
      let index = lower_2.indexOf(":", 1);
      let p = index > 0 ? lower_2.slice(0, index) : lower_2;
      if (!r(p) && !r(stripDashQuotes(p, n === "exact")) && !/[^\x20-\x7e]/.test(lower_2)) continue;
      if (index > 0) {
        let sliced = lower_2.slice(index + 1);
        u = sliced.trim() !== "" ? sliced : (e[idx + 1] ?? "");
      }
    }
    let f = index > 0 ? c.slice(index + 1) : null;
    let trimmed = (u ?? (f !== null && f.trim() !== "" ? f : (e[idx + 1] ?? "")))
      .toLowerCase()
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (trimmed.length > 0 && !POWERSHELL_ACTION_VALUES.has(trimmed)) return true;
  }
  return false;
}
//@ chunk-s67vc0kc.js:16263-17321 layout
/**
 * 参数里是否有写变量的通用参数（-OutVariable/-ErrorVariable/…-Variable），或其值含 $、反引号、here-string、作用域前缀不合法等。
 */
function hasVariableWritingParam(e, elementTypes, n = "full") {
  let r = n === "full" ? isVariableParamAlias : isVariableParam;
  let a = (s) => r(s) || (n === "full" && (s.endsWith("variable") || isSafeVerbAbbreviation(s)));
  for (let idx = 0; idx < e.length; idx++) {
    let c = e[idx];
    if (!PS_TOKENIZER_DASH_CHARS.has(c[0])) continue;
    if (
      elementTypes !== undefined &&
      elementTypes[idx + 1] !== undefined &&
      elementTypes[idx + 1] !== "Parameter"
    )
      continue;
    let o = c[0] === "-" ? c : "-" + c.slice(1);
    let colonBoundParam = parseColonBoundParam(o);
    let lower = (colonBoundParam !== null ? o.slice(0, colonBoundParam.colonIdx) : o).toLowerCase();
    if (!a(lower) && !a(stripDashQuotes(lower, n === "exact"))) {
      let lower_2 = unescapePsDoubleQuoted(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
      if (lower_2 !== lower && (a(lower_2) || a(stripDashQuotes(lower_2, n === "exact")))) return true;
      let index = lower_2.indexOf(":", 1);
      if (index > 0 && a(stripDashQuotes(lower_2.slice(0, index), n === "exact"))) return true;
      if (/[^\x20-\x7e]/.test(lower_2)) return true;
      continue;
    }
    let f;
    if (colonBoundParam !== null) {
      if (colonBoundParam.isHereString) return true;
      if (colonBoundParam.post.includes("$") || colonBoundParam.post.includes("`")) return true;
      f = colonBoundParam.postResolved !== "" ? colonBoundParam.postResolved : (e[idx + 1] ?? "");
    } else f = e[idx + 1] ?? "";
    if (f.includes("$") || f.includes("`")) return true;
    let trimmed = stripPsParameterPrefix(skipLeadingWhitespaceAndComments(f)).toLowerCase().trim();
    if (trimmed.length === 0) continue;
    let m = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
    let index = m.lastIndexOf(":");
    let S = m;
    if (index >= 0) {
      let sliced = m.slice(0, index);
      if (!POWERSHELL_SCOPE_NAMES.has(sliced) && !/^[0-9]+$/.test(sliced)) return true;
      S = m.slice(index + 1);
    }
    if (!/^[a-z0-9_]+$/.test(S)) return true;
    if (PS_PREFERENCE_VARIABLES.has(S)) return true;
  }
  return false;
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
  let n = skipLeadingWhitespaceAndComments(e.slice(index + 1));
  let r = skipLeadingWhitespaceAndComments(n.replace(/`[\r\n]+\s*/g, ""));
  let isHereString = /^@['"\u2018-\u201F]/.test(n) || /^@['"\u2018-\u201F]/.test(r);
  return {
    colonIdx: index,
    post: n,
    postResolved: r,
    isHereString,
  };
}
//@ chunk-s67vc0kc.js:17717-18021 layout
/**
 * 判断参数是否存在原生程序引号传递隐患：原文或去掉续行后的文本命中检查，或冒号绑定参数（-Param:value）的值在各种解析/规范化形式下命中检查；here-string 一律视为有隐患。
 */
function hasNativeQuotingHazard(e, t = true) {
  let replaced = e.replace(/`[\r\n]+\s*/g, "");
  if (needsNativeQuoting(e) || needsNativeQuoting(unescapePsSimpleEscapes(replaced))) return true;
  if (t) {
    let colonBoundParam = parseColonBoundParam(e);
    if (colonBoundParam !== null) {
      let { post, postResolved } = colonBoundParam;
      if (colonBoundParam.isHereString) return true;
      let c = stripPsParameterPrefix(postResolved);
      let o = stripPsParameterPrefix(post);
      let l = stripFileSystemProviderPrefix(postResolved);
      let u = stripFileSystemProviderPrefix(post);
      let singleEditDiffConfig = createSingleEditDiffConfig(postResolved);
      let singleEditDiffConfig_2 = createSingleEditDiffConfig(post);
      if (
        needsNativeQuoting(c) ||
        needsNativeQuoting(o) ||
        needsNativeQuoting(unescapePsSimpleEscapes(c)) ||
        needsNativeQuoting(l) ||
        needsNativeQuoting(u) ||
        needsNativeQuoting(unescapePsSimpleEscapes(l)) ||
        needsNativeQuoting(singleEditDiffConfig) ||
        needsNativeQuoting(singleEditDiffConfig_2) ||
        needsNativeQuoting(unescapePsSimpleEscapes(singleEditDiffConfig))
      )
        return true;
    }
  }
  return false;
}
//@ chunk-s67vc0kc.js:18021-18047 layout
var TENGU_HAZY_PEACH = "tengu_hazy_peach";
//@ chunk-s67vc0kc.js:18047-18086 layout
/**
 * 开关 tengu_hazy_peach：命令名按扩展空白集（含 U+0085/U+180E）切分。
 */
function isHazyPeachFlagOn() {
  return readFlagWithOverride(TENGU_HAZY_PEACH, {
    safe: true,
  });
}
//@ chunk-s67vc0kc.js:18086-20051 callgraph-witnessed = isAllowlistedCommand (0.662)
/**
 * 单个 PowerShell 命令是否在只读白名单内：外部程序仅允许 where.exe；查白名单配置、regex、额外危险回调；参数必须是字符串常量或参数（值不可展开）；再按配置校验参数，git/docker/dotnet 走专用检查。
 */
function isAllowlistedCommand(cmd, originalCommand) {
  if (cmd.nameType === "application") {
    let o = isHazyPeachFlagOn() ? PS_LEADING_WHITESPACE_RE : /\s/;
    let l = cmd.text.split(o, 1)[0]?.toLowerCase() ?? "";
    if (!SAFE_EXTERNAL_EXES.has(l)) return false;
  }
  let config = lookupAllowlist(cmd.name);
  if (!config) return false;
  if (config.regex && !config.regex.test(originalCommand)) return false;
  if (config.additionalCommandIsDangerousCallback?.(originalCommand, cmd)) return false;
  if (!cmd.elementTypes) return false;
  for (let i = 1; i < cmd.elementTypes.length; i++) {
    let t = cmd.elementTypes[i];
    if (t !== "StringConstant" && t !== "Parameter") {
      if (!/[$(@{[]/.test(cmd.args[i - 1] ?? "")) continue;
      return false;
    }
    if (t === "Parameter") {
      let paramChildren = cmd.children?.[i - 1];
      if (paramChildren) {
        if (paramChildren.some((paramChild) => paramChild.type !== "StringConstant")) return false;
      } else {
        let arg = cmd.args[i - 1] ?? "";
        let colonIdx = arg.indexOf(":");
        if (colonIdx > 0 && /[$(@{[]/.test(arg.slice(colonIdx + 1))) return false;
      }
    }
  }
  let canonical = resolveToCanonical(cmd.name);
  let a = EXTERNAL_READONLY_COMMANDS.has(canonical);
  let isCmdlet = canonical.includes("-");
  let c = cmd.nameType !== "cmdlet";
  if (getPlatform() === "windows") {
    if (c || a) {
      for (let arg of cmd.args)
        if (hasNativeQuotingHazard(arg, !isCmdlet || cmd.nameType === "application")) return false;
    }
    if (findCwdShadowingExecutable(cmd.name) !== null) return false;
  }
  if (!isCmdlet || cmd.nameType === "application")
    for (let idx = 1; idx < cmd.elementTypes.length; idx++) {
      let l = cmd.elementTypes[idx];
      if (l !== "StringConstant" && l !== "Parameter") return false;
      if (l === "Parameter" && !a && (cmd.args[idx - 1] ?? "").includes(":")) return false;
    }
  if (a) {
    let o = null;
    for (let idx = 1; idx < cmd.elementTypes.length; idx++) {
      let u = cmd.args[idx - 1] ?? "";
      if (cmd.elementTypes[idx] === "Parameter") {
        let colonBoundParam = parseColonBoundParam(u);
        if (colonBoundParam !== null) {
          if (colonBoundParam.isHereString) return false;
          o ??= cmd.args.slice(0, idx - 1);
          o.push(
            u.slice(0, colonBoundParam.colonIdx),
            unescapePsDoubleQuoted(stripPsParameterPrefix(colonBoundParam.postResolved)),
          );
          continue;
        }
      }
      o?.push(u);
    }
    if (o !== null && !isExternalCommandSafe(canonical, o)) return false;
    return isExternalCommandSafe(canonical, cmd.args);
  }
  if (isCmdlet && hasNonDefaultActionPreference(cmd.args, cmd.elementTypes)) return false;
  if (isCmdlet && hasVariableWritingParam(cmd.args, cmd.elementTypes)) return false;
  if (config.allowAllFlags) return true;
  if (!config.safeFlags || config.safeFlags.length === 0)
    return !cmd.args.some((arg, i) => {
      if (isCmdlet) return isPowerShellParameter(arg, cmd.elementTypes?.[i + 1]);
      return arg.startsWith("-") || false;
    });
  for (let i = 0; i < cmd.args.length; i++) {
    let arg = cmd.args[i];
    if (isCmdlet ? isPowerShellParameter(arg, cmd.elementTypes?.[i + 1]) : arg.startsWith("-") || false) {
      let paramName = isCmdlet ? "-" + arg.slice(1) : arg;
      if (isCmdlet || arg.startsWith("/")) {
        let colonIndex = paramName.indexOf(":");
        if (colonIndex > 0) paramName = paramName.substring(0, colonIndex);
      }
      let paramLower = paramName.toLowerCase();
      if (isCmdlet && COMMON_PARAMETERS.has(paramLower)) continue;
      if (
        !(isCmdlet
          ? config.safeFlags.some((flag) => flag.toLowerCase() === paramLower)
          : config.safeFlags.includes(paramName))
      )
        return false;
    }
  }
  return true;
}
//@ chunk-s67vc0kc.js:20051-20256 fingerprint = isExternalCommandSafe (1)
/**
 * 外部命令（git/gh/docker/dotnet）只读判定入口。
 */
function isExternalCommandSafe(command, args) {
  for (let arg of args)
    if (arg.length > 0 && arg[0] !== "-" && PS_TOKENIZER_DASH_CHARS.has(arg[0])) return false;
  switch (command) {
    case "git":
      return isGitSafePS(args);
    case "gh":
      return hasMismatchedArgs(args);
    case "docker":
      return isDockerSafe(args);
    case "dotnet":
      return isDotnetSafe(args);
    default:
      return false;
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
]);
var GIT_GLOBAL_FLAGS_WITH_VALUE = new Set([
  "-c",
  "-C",
  "--exec-path",
  "--config-env",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--shallow-file",
]);
var GIT_CONFIG_FLAGS = ["-c", "-C"];
//@ chunk-s67vc0kc.js:20536-20583 layout
/**
 * 判断是否为带值的 git 全局选项。
 */
function isValueTakingGitFlag(e) {
  return !e.includes("=") && GIT_GLOBAL_FLAGS_WITH_VALUE.has(e);
}
//@ chunk-s67vc0kc.js:20583-20807 layout
function argsTokenShapeMatch(e, t) {
  for (let idx = 0; idx < e.length; idx++) {
    let r = e[idx] ?? "";
    let a = t[idx] ?? "";
    if (a.includes("\x00") || unescapePsNullEscape(r).includes("\x00")) return false;
    if (isFlagToken(a) !== isFlagToken(r) || (a === "--") !== (r === "--")) return false;
    if (isFlagToken(r) && r !== a && isValueTakingGitFlag(r) !== isValueTakingGitFlag(a)) return false;
  }
  return true;
}
//@ chunk-s67vc0kc.js:20807-20878 layout
/**
 * 反转义参数并统一 Unicode 破折号，得到参数列表。
 */
function normalizePsArgs(e) {
  return e.map((t) => normalizeUnicodeDashes(unescapePsDoubleQuoted(t.replace(/`[\r\n]+\s*/g, ""))));
}
//@ chunk-s67vc0kc.js:20878-20943 layout
function isGitSafePS(e) {
  let t = normalizePsArgs(e);
  if (!argsTokenShapeMatch(e, t)) return false;
  return isGitSafe(e) && isGitSafe(t);
}
//@ chunk-s67vc0kc.js:20943-21780 fingerprint = isGitSafe (0.873)
/**
 * git 参数只读判定：Windows 引号风险、$ 变量、危险全局选项（-c/-C/--git-dir…）、按 GIT_READ_ONLY_COMMANDS 查子命令并校验选项，ls-remote 只允许选项。
 */
function isGitSafe(args) {
  if (args.length === 0) return true;
  if (getPlatform() === "windows") {
    for (let arg of args) if (hasNativeQuotingHazard(arg)) return false;
  }
  for (let arg of args) if (arg.includes("$")) return false;
  let idx = 0;
  while (idx < args.length) {
    let arg = args[idx];
    if (!arg || !arg.startsWith("-")) break;
    for (let shortFlag of GIT_CONFIG_FLAGS)
      if (
        arg.length > shortFlag.length &&
        arg.startsWith(shortFlag) &&
        (shortFlag === "-C" || arg[shortFlag.length] !== "-")
      )
        return false;
    let hasInlineValue = arg.includes("=");
    let flagName = hasInlineValue ? firstLineOf(arg, "=") : arg;
    if (GIT_UNSAFE_GLOBAL_FLAGS.has(flagName)) return false;
    if (!hasInlineValue && GIT_GLOBAL_FLAGS_WITH_VALUE.has(flagName)) idx += 2;
    else idx++;
  }
  if (idx >= args.length) return true;
  let first = args[idx]?.toLowerCase() || "";
  let second = idx + 1 < args.length ? args[idx + 1]?.toLowerCase() || "" : "";
  let twoWordKey = `git ${first} ${second}`;
  let oneWordKey = `git ${first}`;
  let config = GIT_READ_ONLY_COMMANDS[twoWordKey];
  let subcommandTokens = 2;
  if (!config) {
    config = GIT_READ_ONLY_COMMANDS[oneWordKey];
    subcommandTokens = 1;
  }
  if (!config) return false;
  let flagArgs = args.slice(idx + subcommandTokens);
  if (first === "ls-remote") {
    let u = false;
    for (let arg of flagArgs) {
      if (!u && arg === "--") {
        u = true;
        continue;
      }
      if (u || arg === "-" || !arg.startsWith("-")) return false;
    }
  }
  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback("", flagArgs)
  )
    return false;
  return validateFlags(flagArgs, 0, config, {
    commandName: "git",
  });
}
//@ chunk-s67vc0kc.js:21780-21845 layout
/**
 * 判断两种拼写下的参数结构一致且没有安全顾虑。
 */
function hasMismatchedArgs(e) {
  let t = normalizePsArgs(e);
  if (!argsTokenShapeMatch(e, t)) return false;
  return alwaysSafe(e) && alwaysSafe(t);
}
//@ chunk-s67vc0kc.js:21845-21868 layout
/**
 * 恒为 true 的占位判断（保留扩展点）。
 */
function alwaysSafe(e) {
  return false;
}
//@ chunk-s67vc0kc.js:21868-21985 layout
var DOCKER_DANGEROUS_SHORT_FLAGS = new Set(
  DOCKER_DANGEROUS_FLAGS.filter((e) => /^-[^-]$/.test(e)).map((e) => e[1]),
);
var DOCKER_DANGEROUS_LONG_FLAGS_2 = [...DOCKER_DANGEROUS_FLAGS.filter((e) => e.startsWith("--")), "--tls"];
//@ chunk-s67vc0kc.js:21985-22567 fingerprint = isDockerSafe (1)
/**
 * docker 参数只读判定：无变量、无危险全局选项（-H/--host/--tls…），子命令在只读列表或配置内并校验选项。
 */
function isDockerSafe(args) {
  if (args.length === 0) return true;
  let t = normalizePsArgs(args);
  if (getPlatform() === "windows") {
    for (let arg of args) if (hasNativeQuotingHazard(arg)) return false;
  }
  for (let arg of t) if (arg.includes("$")) return false;
  for (let s of t) {
    if (s[0] === "-" && s[1] !== "-")
      for (let idx = 1; idx < s.length; idx++) {
        let l = s[idx];
        if (DOCKER_DANGEROUS_SHORT_FLAGS.has(l)) return false;
        if (l !== "h" && DOCKER_DANGEROUS_SHORT_FLAGS.has(l.toLowerCase())) return false;
      }
    let lower = s.toLowerCase();
    if (DOCKER_DANGEROUS_LONG_FLAGS_2.some((o) => lower.startsWith(o))) return false;
  }
  let oneWordKey = `docker ${t[0]?.toLowerCase()}`;
  if (DOCKER_BARE_READ_ONLY_COMMANDS.includes(oneWordKey)) return true;
  let config = DOCKER_READ_ONLY_COMMANDS[oneWordKey];
  if (!config) return false;
  let flagArgs = t.slice(1);
  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback("", flagArgs)
  )
    return false;
  return validateFlags(flagArgs, 0, config);
}
//@ chunk-s67vc0kc.js:22567-22668 file-local
/**
 * dotnet 只读：只允许 --list-runtimes / --list-sdks。
 */
function isDotnetSafe(args) {
  if (args.length === 0) return false;
  for (let arg of args) if (!DOTNET_READ_ONLY_FLAGS.has(arg.toLowerCase())) return false;
  return true;
}
export {
  isAllowlistedCommand,
  resolveToCanonical,
  hasSyncSecurityConcerns,
  isReadOnlyCommand,
  isHazyPeachFlagOn,
  isSafeOutputCommand,
  isCwdChangingCmdlet,
  baseStems,
  commandBaseVariants,
  argLeaksValue,
  SAFE_POWERSHELL_VERBS,
  hasVariableWritingParam,
  hasNonDefaultActionPreference,
  isProvablySafeStatement,
  isAllowlistedPipelineTail,
};
