/**
 * tools/PowerShellTool/readOnlyValidation.ts
 *
 * PowerShell 只读判定：CMDLET_ALLOWLIST、别名规范化、git/docker/dotnet 只读检查、变量写入/ActionPreference 参数检测；混入 git 安全配置与代码执行参数检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/readOnlyValidation.ts
 * pieces: chunk-e0skvs33.js (54)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e0skvs33.js:2387-2475 sole-consumer
/**
 * 判断参数是否为 ActionPreference 通用参数的别名或缩写。
 */
function isActionParamAlias(paramName) {
  if (paramName.length < 2) return false;
  return (
    COMMON_ACTION_PARAM_ALIASES.includes(paramName) ||
    COMMON_ACTION_PARAMS.some((alias) => alias.startsWith(paramName))
  );
}
//@ chunk-e0skvs33.js:2475-2578 placement (2.1.88 match: checkTokenBudget, 0.447)
/**
 * ActionPreference 取值（silentlycontinue/stop/continue/ignore 及数字）。
 */
var POWERSHELL_ACTION_PARAMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POWERSHELL_ACTION_VALUES;
deferInit("chunk-e0skvs33.js:2475", () => {
  POWERSHELL_ACTION_PARAMS = new Set([...COMMON_ACTION_PARAMS, ...COMMON_ACTION_PARAM_ALIASES]);
  POWERSHELL_ACTION_VALUES = new Set(["silentlycontinue", "0", "stop", "1", "continue", "2", "ignore", "4"]);
});
//@ chunk-e0skvs33.js:2578-2666 placement
/**
 * 判断参数是否为变量相关通用参数的别名或缩写。
 */
function isVariableParamAlias(paramName) {
  if (paramName.length < 2) return false;
  return (
    COMMON_VARIABLE_PARAM_ALIASES.includes(paramName) ||
    COMMON_VARIABLE_PARAMS.some((param) => param.startsWith(paramName))
  );
}
//@ chunk-e0skvs33.js:2666-3584 placement
/**
 * PowerShell 影响命令行为的偏好变量集合（ErrorActionPreference、VerbosePreference 等）。
 */
var POWERSHELL_SCOPE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PS_PREFERENCE_VARIABLES;
var DOCKER_DANGEROUS_LONG_FLAGS;
var filtered;
deferInit("chunk-e0skvs33.js:2666", () => {
  POWERSHELL_SCOPE_NAMES = new Set(["global", "script", "local", "private", "variable"]);
  PS_PREFERENCE_VARIABLES = new Set([
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
  DOCKER_DANGEROUS_LONG_FLAGS = [
    ...COMMON_ACTION_PARAMS,
    ...COMMON_VARIABLE_PARAMS,
    "-outbuffer",
    "-verbose",
    "-debug",
  ];
  filtered = DOCKER_DANGEROUS_LONG_FLAGS.filter((flag) => flag !== "-progressaction");
});
//@ chunk-e0skvs33.js:3584-3684 placement
function uniquePrefixMatch(prefix, candidates) {
  let match = null;
  for (let candidate of candidates)
    if (candidate.startsWith(prefix)) {
      if (match !== null) return null;
      match = candidate;
    }
  return match;
}
//@ chunk-e0skvs33.js:3684-3803 placement
function matchesAbbreviatedParam(paramName, flags) {
  if (paramName.length < 2) return false;
  for (let flagList of [DOCKER_DANGEROUS_LONG_FLAGS, filtered]) {
    let flag = uniquePrefixMatch(paramName, flagList);
    if (flag !== null && flags.includes(flag)) return true;
  }
  return false;
}
//@ chunk-e0skvs33.js:3803-3849 placement
/**
 * 通用参数别名集合（含 -ea/-wa/-p），在这些参数上不允许缩写匹配。
 */
var PS_COMMON_PARAM_ALIASES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var isAbbrevAllowed;
deferInit("chunk-e0skvs33.js:3803", () => {
  PS_COMMON_PARAM_ALIASES = new Set([...COMMON_VARIABLE_PARAM_ALIASES, "-ea", "-wa", "-p"]);
  isAbbrevAllowed = false;
});
//@ chunk-e0skvs33.js:3849-3926 placement
/**
 * 判断参数是否匹配给定通用参数别名或缩写前缀。
 */
function matchesCommonParam(paramName, aliases, params, isAbbrevAllowed) {
  if (!isAbbrevAllowed && PS_COMMON_PARAM_ALIASES.has(paramName)) return false;
  return aliases.includes(paramName) || matchesAbbreviatedParam(paramName, params);
}
//@ chunk-e0skvs33.js:3926-3964 placement
/**
 * 通用参数判定封装（带缩写开关）。
 */
function isCommonParam(paramName, aliases, params) {
  return matchesCommonParam(paramName, aliases, params, isAbbrevAllowed);
}
//@ chunk-e0skvs33.js:3964-3994 placement
/**
 * 判断是否为变量相关通用参数。
 */
function isVariableParam(paramName) {
  return isCommonParam(paramName, COMMON_VARIABLE_PARAM_ALIASES, COMMON_VARIABLE_PARAMS);
}
//@ chunk-e0skvs33.js:3994-4024 placement
/**
 * 判断是否为 ActionPreference 类通用参数。
 */
function isActionParam(paramName) {
  return isCommonParam(paramName, COMMON_ACTION_PARAM_ALIASES, COMMON_ACTION_PARAMS);
}
//@ chunk-e0skvs33.js:4024-5033 placement
/**
 * 安全动词前缀列表（get/set/copy/move 等）。
 */
var SAFE_POWERSHELL_VERBS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_VERB_PREFIXES;
deferInit("chunk-e0skvs33.js:4024", () => {
  SAFE_POWERSHELL_VERBS = new Set([
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
  SAFE_VERB_PREFIXES = ["-variable", "-sessionvariable", "-responseheadersvariable", "-statuscodevariable"];
});
//@ chunk-e0skvs33.js:5033-5107 layout
/**
 * 判断动词缩写是否匹配安全动词（至少 3 个字母）。
 */
function isSafeVerbAbbreviation(prefix) {
  if (prefix.length < 3) return false;
  return SAFE_VERB_PREFIXES.some((safeVerb) => safeVerb.startsWith(prefix));
}
//@ chunk-e0skvs33.js:5107-5157 fingerprint (2.1.88 match: DOTNET_READ_ONLY_FLAGS, 0.7)
var DOTNET_READ_ONLY_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e0skvs33.js:5107", () => {
  DOTNET_READ_ONLY_FLAGS = new Set(["--list-runtimes", "--list-sdks"]);
});
//@ chunk-e0skvs33.js:5157-5549 fingerprint (2.1.88 match: argLeaksValue, 1)
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
//@ chunk-e0skvs33.js:5549-12204 fingerprint (2.1.88 match: CMDLET_ALLOWLIST, 0.943)
/**
 * PowerShell 只读 cmdlet 白名单 CMDLET_ALLOWLIST（Get-ChildItem/Get-Content/Select-String/Get-Process/Test-Path/… 以及 git/gh/docker/dotnet 外部命令），每项列安全参数与额外危险回调；还有安全输出命令、管道尾部格式化命令、默认 PATHEXT 扩展名表。
 */
var CMDLET_ALLOWLIST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_OUTPUT_CMDLETS;
var PIPELINE_TAIL_CMDLETS;
var SAFE_EXTERNAL_EXES;
var EXTERNAL_READONLY_COMMANDS;
var DEFAULT_PATHEXT_EXTENSIONS;
deferInit("chunk-e0skvs33.js:5549", () => {
  CMDLET_ALLOWLIST = Object.assign(Object.create(null), {
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
        (element?.args ?? []).some((arg) => !arg.startsWith("/") && !arg.startsWith("-")),
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
        (element?.args ?? []).some((arg) => !arg.startsWith("-")),
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
        (element?.args ?? []).some((arg) => !arg.startsWith("-")),
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
  SAFE_OUTPUT_CMDLETS = new Set(["out-null"]);
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
  ]);
  SAFE_EXTERNAL_EXES = new Set(["where.exe"]);
  EXTERNAL_READONLY_COMMANDS = new Set(["git", "gh", "docker", "dotnet"]);
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
});
//@ chunk-e0skvs33.js:12204-12718 layout
/**
 * 按当前 PATHEXT 缓存可执行扩展名列表与匹配正则（最多 64 项，扩展名≤16 字符）。
 */
class PathextCache {
  listByPathext = new Map();
  regexByPathext = new Map();
  list() {
    let PATHEXT = env.PATHEXT ?? "";
    let extensions = this.listByPathext.get(PATHEXT);
    if (extensions === undefined) {
      let extensionsList = new Set(DEFAULT_PATHEXT_EXTENSIONS);
      for (let part of PATHEXT.split(";").slice(0, 64)) {
        let lower = part.trim().toLowerCase();
        if (lower.startsWith(".") && lower.length <= 16) extensionsList.add(lower);
      }
      extensions = [...extensionsList];
      this.listByPathext.set(PATHEXT, extensions);
    }
    return extensions;
  }
  regex() {
    let PATHEXT = env.PATHEXT ?? "";
    let regex = this.regexByPathext.get(PATHEXT);
    if (regex === undefined) {
      let mapped = this.list()
        .filter((extension) => extension !== "")
        .map((extension) => urlPatternToRegex(extension.slice(1)));
      regex = new RegExp(`\\.(${mapped.join("|")})$`, "i");
      this.regexByPathext.set(PATHEXT, regex);
    }
    return regex;
  }
}
//@ chunk-e0skvs33.js:12718-12730 layout
var pathextCache; // deferred: uses PathextCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e0skvs33.js:12718", () => {
  pathextCache = new PathextCache();
});
//@ chunk-e0skvs33.js:12730-12760 layout
function getPathextList() {
  return pathextCache.list();
}
//@ chunk-e0skvs33.js:12760-12791 layout
function getPathextRegex() {
  return pathextCache.regex();
}
//@ chunk-e0skvs33.js:12791-12880 layout
/**
 * 输出重定向/写入目标的主名集合，用于检测"先写 ./git.exe 再运行 git"的 cwd 优先解析遮蔽。
 */
function baseStems(command) {
  let stems = new Set(commandBaseVariants(command).map((variant) => variant.stem));
  stems.delete("");
  return Array.from(stems);
}
//@ chunk-e0skvs33.js:12880-13046 layout
/**
 * 对路径的多种规范拼写求末段名（base）及去掉可执行扩展名后的主名（stem）。
 */
function commandBaseVariants(command) {
  let pathextRegex = getPathextRegex();
  let seen = new Set();
  let variants = [];
  for (let normalize of [
    (text) => text,
    stripPsParameterPrefix,
    stripFileSystemProviderPrefix,
    createSingleEditDiffConfig,
  ]) {
    let base = commandBaseName(command, normalize);
    if (seen.has(base)) continue;
    seen.add(base);
    variants.push({
      base,
      stem: base.replace(pathextRegex, ""),
    });
  }
  return variants;
}
//@ chunk-e0skvs33.js:13046-13328 layout
function commandBaseName(command, normalize) {
  let replaced = normalize(command).replace(/^[A-Za-z]:(?![\\/])/, "");
  let segments = [];
  for (let part of replaced.split(/[\\/]+/)) {
    let segment = stripTrailingDotsSpaces(part.replace(/:.*$/, ""));
    if (segment === "." || segment === "") continue;
    if (segment === "..") {
      if (segments.length > 0 && segments.at(-1) !== "..") segments.pop();
      else segments.push("..");
      continue;
    }
    segments.push(segment);
  }
  return (segments.at(-1) ?? "").toLowerCase();
}
//@ chunk-e0skvs33.js:13328-13584 layout
/**
 * Windows 上当前目录中是否有与命令同名（含 PATHEXT 扩展）的文件，返回文件名。
 */
function findCwdShadowingExecutable(command) {
  if (getPlatform() !== "windows") return null;
  let cwd = getCwd();
  let seen = new Set();
  for (let { base, stem } of commandBaseVariants(command))
    for (let nameStem of base === stem ? [stem] : [stem, base]) {
      if (nameStem === "" || seen.has(nameStem)) continue;
      seen.add(nameStem);
      for (let extension of getPathextList()) {
        let candidatePath = join(cwd, nameStem + extension);
        try {
          if (statSync(candidatePath).isFile()) return nameStem + extension;
        } catch {}
      }
    }
  return null;
}
//@ chunk-e0skvs33.js:13584-13614 layout
var EXECUTABLE_EXT_RE = /\.(exe|cmd|bat|com)$/;
//@ chunk-e0skvs33.js:13614-13759 file-local
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
//@ chunk-e0skvs33.js:13759-14015 fingerprint (2.1.88 match: isCwdChangingCmdlet, 0.734)
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
//@ chunk-e0skvs33.js:14015-14060 file-local
/**
 * 无参数时视为安全的输出命令（Out-Null）。
 */
function isSafeOutputCommand(name) {
  let canonical = resolveToCanonical(name);
  return SAFE_OUTPUT_CMDLETS.has(canonical);
}
//@ chunk-e0skvs33.js:14060-14134 file-local
/**
 * 管道尾部的格式化/筛选命令（Format-*\/Select-Object/Sort-Object/Where-Object/Out-String…）且参数在白名单内。
 */
function isAllowlistedPipelineTail(cmd, originalCommand) {
  let canonical = resolveToCanonical(cmd.name);
  if (!PIPELINE_TAIL_CMDLETS.has(canonical)) return false;
  return isAllowlistedCommand(cmd, originalCommand);
}
//@ chunk-e0skvs33.js:14134-14302 fingerprint (2.1.88 match: isProvablySafeStatement, 1)
/**
 * 语句是否可证明安全：PipelineAst 且所有元素都是 CommandAst。
 */
function isProvablySafeStatement(stmt) {
  if (stmt.statementType !== "PipelineAst") return false;
  if (stmt.commands.length === 0) return false;
  for (let cmd of stmt.commands) if (cmd.elementType !== "CommandAst") return false;
  return true;
}
//@ chunk-e0skvs33.js:14302-14400 file-local
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
//@ chunk-e0skvs33.js:14400-14694 file-local
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
//@ chunk-e0skvs33.js:14694-15512 fingerprint (2.1.88 match: isReadOnlyCommand, 1)
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
//@ chunk-e0skvs33.js:15512-15583 layout
/**
 * 去掉参数名里的 - 与引号（保留首个短选项写法）。
 */
var stripDashQuotes = (text, exact = false) =>
  exact && text.length > 1 && text[1] === "-" ? text : text.replace(/(?!^)[-']/g, "");
//@ chunk-e0skvs33.js:15583-16265 layout
/**
 * 参数里是否有 -ErrorAction/-WarningAction 等取值不在安全集合（如 Ignore/SilentlyContinue 之外的危险值）的情况，支持缩写与冒号绑定。
 */
function hasNonDefaultActionPreference(args, elementTypes, mode = "full") {
  let isActionName = mode === "full" ? isActionParamAlias : isActionParam;
  for (let idx = 0; idx < args.length; idx++) {
    let arg = args[idx];
    if (!PS_TOKENIZER_DASH_CHARS.has(arg[0])) continue;
    if (
      elementTypes !== undefined &&
      elementTypes[idx + 1] !== undefined &&
      elementTypes[idx + 1] !== "Parameter"
    )
      continue;
    let paramText = arg[0] === "-" ? arg : "-" + arg.slice(1);
    let index = paramText.indexOf(":");
    let lower = (index > 0 ? paramText.slice(0, index) : paramText).toLowerCase();
    let deferredValue = null;
    if (!isActionName(lower) && !isActionName(stripDashQuotes(lower, mode === "exact"))) {
      let lower_2 = unescapePsDoubleQuoted(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
      let index = lower_2.indexOf(":", 1);
      let unescapedParam = index > 0 ? lower_2.slice(0, index) : lower_2;
      if (
        !isActionName(unescapedParam) &&
        !isActionName(stripDashQuotes(unescapedParam, mode === "exact")) &&
        !/[^\x20-\x7e]/.test(lower_2)
      )
        continue;
      if (index > 0) {
        let sliced = lower_2.slice(index + 1);
        deferredValue = sliced.trim() !== "" ? sliced : (args[idx + 1] ?? "");
      }
    }
    let inlineValue = index > 0 ? paramText.slice(index + 1) : null;
    let trimmed = (
      deferredValue ??
      (inlineValue !== null && inlineValue.trim() !== "" ? inlineValue : (args[idx + 1] ?? ""))
    )
      .toLowerCase()
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (trimmed.length > 0 && !POWERSHELL_ACTION_VALUES.has(trimmed)) return true;
  }
  return false;
}
//@ chunk-e0skvs33.js:16265-17323 layout
/**
 * 参数里是否有写变量的通用参数（-OutVariable/-ErrorVariable/…-Variable），或其值含 $、反引号、here-string、作用域前缀不合法等。
 */
function hasVariableWritingParam(args, elementTypes, mode = "full") {
  let isVariableName = mode === "full" ? isVariableParamAlias : isVariableParam;
  let isVariableish = (paramName) =>
    isVariableName(paramName) ||
    (mode === "full" && (paramName.endsWith("variable") || isSafeVerbAbbreviation(paramName)));
  for (let idx = 0; idx < args.length; idx++) {
    let arg = args[idx];
    if (!PS_TOKENIZER_DASH_CHARS.has(arg[0])) continue;
    if (
      elementTypes !== undefined &&
      elementTypes[idx + 1] !== undefined &&
      elementTypes[idx + 1] !== "Parameter"
    )
      continue;
    let dashedToken = arg[0] === "-" ? arg : "-" + arg.slice(1);
    let colonBoundParam = parseColonBoundParam(dashedToken);
    let lower = (
      colonBoundParam !== null ? dashedToken.slice(0, colonBoundParam.colonIdx) : dashedToken
    ).toLowerCase();
    if (!isVariableish(lower) && !isVariableish(stripDashQuotes(lower, mode === "exact"))) {
      let lower_2 = unescapePsDoubleQuoted(lower.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
      if (
        lower_2 !== lower &&
        (isVariableish(lower_2) || isVariableish(stripDashQuotes(lower_2, mode === "exact")))
      )
        return true;
      let index = lower_2.indexOf(":", 1);
      if (index > 0 && isVariableish(stripDashQuotes(lower_2.slice(0, index), mode === "exact"))) return true;
      if (/[^\x20-\x7e]/.test(lower_2)) return true;
      continue;
    }
    let paramValue;
    if (colonBoundParam !== null) {
      if (colonBoundParam.isHereString) return true;
      if (colonBoundParam.post.includes("$") || colonBoundParam.post.includes("`")) return true;
      paramValue = colonBoundParam.postResolved !== "" ? colonBoundParam.postResolved : (args[idx + 1] ?? "");
    } else paramValue = args[idx + 1] ?? "";
    if (paramValue.includes("$") || paramValue.includes("`")) return true;
    let trimmed = stripPsParameterPrefix(skipLeadingWhitespaceAndComments(paramValue)).toLowerCase().trim();
    if (trimmed.length === 0) continue;
    let variableExpr = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
    let index = variableExpr.lastIndexOf(":");
    let variableName = variableExpr;
    if (index >= 0) {
      let sliced = variableExpr.slice(0, index);
      if (!POWERSHELL_SCOPE_NAMES.has(sliced) && !/^[0-9]+$/.test(sliced)) return true;
      variableName = variableExpr.slice(index + 1);
    }
    if (!/^[a-z0-9_]+$/.test(variableName)) return true;
    if (PS_PREFERENCE_VARIABLES.has(variableName)) return true;
  }
  return false;
}
//@ chunk-e0skvs33.js:17323-17428 layout
function needsNativeQuoting(text) {
  return (
    text.includes('"') || (/[\s\u0085\u180e]/.test(text) && (text.match(/\\+$/)?.[0].length ?? 0) % 2 === 1)
  );
}
//@ chunk-e0skvs33.js:17428-17719 layout
function parseColonBoundParam(paramText) {
  if (paramText.length === 0 || !(PS_TOKENIZER_DASH_CHARS.has(paramText[0]) || paramText[0] === "/"))
    return null;
  let index = paramText.indexOf(":", 1);
  if (index <= 0) return null;
  let postText = skipLeadingWhitespaceAndComments(paramText.slice(index + 1));
  let postResolved = skipLeadingWhitespaceAndComments(postText.replace(/`[\r\n]+\s*/g, ""));
  let isHereString = /^@['"\u2018-\u201F]/.test(postText) || /^@['"\u2018-\u201F]/.test(postResolved);
  return {
    colonIdx: index,
    post: postText,
    postResolved,
    isHereString,
  };
}
//@ chunk-e0skvs33.js:17719-18025 layout
/**
 * 判断参数是否存在原生程序引号传递隐患：原文或去掉续行后的文本命中检查，或冒号绑定参数（-Param:value）的值在各种解析/规范化形式下命中检查；here-string 一律视为有隐患。
 */
function hasNativeQuotingHazard(arg, checkColonBound = true) {
  let replaced = arg.replace(/`[\r\n]+\s*/g, "");
  if (needsNativeQuoting(arg) || needsNativeQuoting(unescapePsSimpleEscapes(replaced))) return true;
  if (checkColonBound) {
    let colonBoundParam = parseColonBoundParam(arg);
    if (colonBoundParam !== null) {
      let { post, postResolved } = colonBoundParam;
      if (colonBoundParam.isHereString) return true;
      let strippedResolved = stripPsParameterPrefix(postResolved);
      let strippedPost = stripPsParameterPrefix(post);
      let providerResolved = stripFileSystemProviderPrefix(postResolved);
      let providerPost = stripFileSystemProviderPrefix(post);
      let singleEditDiffConfig = createSingleEditDiffConfig(postResolved);
      let singleEditDiffConfig_2 = createSingleEditDiffConfig(post);
      if (
        needsNativeQuoting(strippedResolved) ||
        needsNativeQuoting(strippedPost) ||
        needsNativeQuoting(unescapePsSimpleEscapes(strippedResolved)) ||
        needsNativeQuoting(providerResolved) ||
        needsNativeQuoting(providerPost) ||
        needsNativeQuoting(unescapePsSimpleEscapes(providerResolved)) ||
        needsNativeQuoting(singleEditDiffConfig) ||
        needsNativeQuoting(singleEditDiffConfig_2) ||
        needsNativeQuoting(unescapePsSimpleEscapes(singleEditDiffConfig))
      )
        return true;
    }
  }
  return false;
}
//@ chunk-e0skvs33.js:18025-18051 layout
var TENGU_HAZY_PEACH = "tengu_hazy_peach";
//@ chunk-e0skvs33.js:18051-18090 layout
/**
 * 开关 tengu_hazy_peach：命令名按扩展空白集（含 U+0085/U+180E）切分。
 */
function isHazyPeachFlagOn() {
  return readFlagWithOverride(TENGU_HAZY_PEACH, {
    safe: true,
  });
}
//@ chunk-e0skvs33.js:18090-20055 callgraph-witnessed (2.1.88 match: isAllowlistedCommand, 0.662)
/**
 * 单个 PowerShell 命令是否在只读白名单内：外部程序仅允许 where.exe；查白名单配置、regex、额外危险回调；参数必须是字符串常量或参数（值不可展开）；再按配置校验参数，git/docker/dotnet 走专用检查。
 */
function isAllowlistedCommand(cmd, originalCommand) {
  if (cmd.nameType === "application") {
    let splitter = isHazyPeachFlagOn() ? PS_LEADING_WHITESPACE_RE : /\s/;
    let exeName = cmd.text.split(splitter, 1)[0]?.toLowerCase() ?? "";
    if (!SAFE_EXTERNAL_EXES.has(exeName)) return false;
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
  let isExternalReadOnly = EXTERNAL_READONLY_COMMANDS.has(canonical);
  let isCmdlet = canonical.includes("-");
  let isExternal = cmd.nameType !== "cmdlet";
  if (getPlatform() === "windows") {
    if (isExternal || isExternalReadOnly) {
      for (let arg of cmd.args)
        if (hasNativeQuotingHazard(arg, !isCmdlet || cmd.nameType === "application")) return false;
    }
    if (findCwdShadowingExecutable(cmd.name) !== null) return false;
  }
  if (!isCmdlet || cmd.nameType === "application")
    for (let idx = 1; idx < cmd.elementTypes.length; idx++) {
      let elementType = cmd.elementTypes[idx];
      if (elementType !== "StringConstant" && elementType !== "Parameter") return false;
      if (elementType === "Parameter" && !isExternalReadOnly && (cmd.args[idx - 1] ?? "").includes(":"))
        return false;
    }
  if (isExternalReadOnly) {
    let rebuiltArgs = null;
    for (let idx = 1; idx < cmd.elementTypes.length; idx++) {
      let arg = cmd.args[idx - 1] ?? "";
      if (cmd.elementTypes[idx] === "Parameter") {
        let colonBoundParam = parseColonBoundParam(arg);
        if (colonBoundParam !== null) {
          if (colonBoundParam.isHereString) return false;
          rebuiltArgs ??= cmd.args.slice(0, idx - 1);
          rebuiltArgs.push(
            arg.slice(0, colonBoundParam.colonIdx),
            unescapePsDoubleQuoted(stripPsParameterPrefix(colonBoundParam.postResolved)),
          );
          continue;
        }
      }
      rebuiltArgs?.push(arg);
    }
    if (rebuiltArgs !== null && !isExternalCommandSafe(canonical, rebuiltArgs)) return false;
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
//@ chunk-e0skvs33.js:20055-20260 fingerprint (2.1.88 match: isExternalCommandSafe, 1)
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
//@ chunk-e0skvs33.js:20260-20540 layout (2.1.88 match: GIT_GLOBAL_FLAGS_WITH_VALUES, 0.832)
var GIT_UNSAFE_GLOBAL_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_GLOBAL_FLAGS_WITH_VALUE;
var GIT_CONFIG_FLAGS;
deferInit("chunk-e0skvs33.js:20260", () => {
  GIT_UNSAFE_GLOBAL_FLAGS = new Set([
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
  ]);
  GIT_CONFIG_FLAGS = ["-c", "-C"];
});
//@ chunk-e0skvs33.js:20540-20587 layout
/**
 * 判断是否为带值的 git 全局选项。
 */
function isValueTakingGitFlag(flag) {
  return !flag.includes("=") && GIT_GLOBAL_FLAGS_WITH_VALUE.has(flag);
}
//@ chunk-e0skvs33.js:20587-20811 layout
function argsTokenShapeMatch(rawArgs, normalizedArgs) {
  for (let idx = 0; idx < rawArgs.length; idx++) {
    let rawArg = rawArgs[idx] ?? "";
    let normalizedArg = normalizedArgs[idx] ?? "";
    if (normalizedArg.includes("\x00") || unescapePsNullEscape(rawArg).includes("\x00")) return false;
    if (isFlagToken(normalizedArg) !== isFlagToken(rawArg) || (normalizedArg === "--") !== (rawArg === "--"))
      return false;
    if (
      isFlagToken(rawArg) &&
      rawArg !== normalizedArg &&
      isValueTakingGitFlag(rawArg) !== isValueTakingGitFlag(normalizedArg)
    )
      return false;
  }
  return true;
}
//@ chunk-e0skvs33.js:20811-20882 layout
/**
 * 反转义参数并统一 Unicode 破折号，得到参数列表。
 */
function normalizePsArgs(args) {
  return args.map((arg) => normalizeUnicodeDashes(unescapePsDoubleQuoted(arg.replace(/`[\r\n]+\s*/g, ""))));
}
//@ chunk-e0skvs33.js:20882-20947 layout
function isGitSafePS(args) {
  let normalizedArgs = normalizePsArgs(args);
  if (!argsTokenShapeMatch(args, normalizedArgs)) return false;
  return isGitSafe(args) && isGitSafe(normalizedArgs);
}
//@ chunk-e0skvs33.js:20947-21784 fingerprint (2.1.88 match: isGitSafe, 0.873)
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
    let afterDoubleDash = false;
    for (let arg of flagArgs) {
      if (!afterDoubleDash && arg === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (afterDoubleDash || arg === "-" || !arg.startsWith("-")) return false;
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
//@ chunk-e0skvs33.js:21784-21849 layout
/**
 * 判断两种拼写下的参数结构一致且没有安全顾虑。
 */
function hasMismatchedArgs(args) {
  let normalizedArgs = normalizePsArgs(args);
  if (!argsTokenShapeMatch(args, normalizedArgs)) return false;
  return alwaysSafe(args) && alwaysSafe(normalizedArgs);
}
//@ chunk-e0skvs33.js:21849-21872 layout
/**
 * 恒为 true 的占位判断（保留扩展点）。
 */
function alwaysSafe(args) {
  return false;
}
//@ chunk-e0skvs33.js:21872-21989 layout
var DOCKER_DANGEROUS_SHORT_FLAGS; // deferred: uses GH_READ_ONLY_COMMANDS (../../utils/shell/readOnlyCommandValidation.js) of its import cycle while loading; runs once the cycle is complete
var DOCKER_DANGEROUS_LONG_FLAGS_2;
deferInit("chunk-e0skvs33.js:21872", () => {
  DOCKER_DANGEROUS_SHORT_FLAGS = new Set(
    DOCKER_DANGEROUS_FLAGS.filter((flag) => /^-[^-]$/.test(flag)).map((flag) => flag[1]),
  );
  DOCKER_DANGEROUS_LONG_FLAGS_2 = [
    ...DOCKER_DANGEROUS_FLAGS.filter((flag) => flag.startsWith("--")),
    "--tls",
  ];
});
//@ chunk-e0skvs33.js:21989-22571 fingerprint (2.1.88 match: isDockerSafe, 1)
/**
 * docker 参数只读判定：无变量、无危险全局选项（-H/--host/--tls…），子命令在只读列表或配置内并校验选项。
 */
function isDockerSafe(args) {
  if (args.length === 0) return true;
  let normalizedArgs = normalizePsArgs(args);
  if (getPlatform() === "windows") {
    for (let arg of args) if (hasNativeQuotingHazard(arg)) return false;
  }
  for (let arg of normalizedArgs) if (arg.includes("$")) return false;
  for (let arg of normalizedArgs) {
    if (arg[0] === "-" && arg[1] !== "-")
      for (let idx = 1; idx < arg.length; idx++) {
        let shortFlagChar = arg[idx];
        if (DOCKER_DANGEROUS_SHORT_FLAGS.has(shortFlagChar)) return false;
        if (shortFlagChar !== "h" && DOCKER_DANGEROUS_SHORT_FLAGS.has(shortFlagChar.toLowerCase()))
          return false;
      }
    let lower = arg.toLowerCase();
    if (DOCKER_DANGEROUS_LONG_FLAGS_2.some((longFlag) => lower.startsWith(longFlag))) return false;
  }
  let oneWordKey = `docker ${normalizedArgs[0]?.toLowerCase()}`;
  if (DOCKER_BARE_READ_ONLY_COMMANDS.includes(oneWordKey)) return true;
  let config = DOCKER_READ_ONLY_COMMANDS[oneWordKey];
  if (!config) return false;
  let flagArgs = normalizedArgs.slice(1);
  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback("", flagArgs)
  )
    return false;
  return validateFlags(flagArgs, 0, config);
}
//@ chunk-e0skvs33.js:22571-22672 file-local
/**
 * dotnet 只读：只允许 --list-runtimes / --list-sdks。
 */
function isDotnetSafe(args) {
  if (args.length === 0) return false;
  for (let arg of args) if (!DOTNET_READ_ONLY_FLAGS.has(arg.toLowerCase())) return false;
  return true;
}
export {
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
  isAllowlistedPipelineTail,
  hasSyncSecurityConcerns,
};
