/**
 * remote/tools/serve/servedPathJudgement.ts
 *
 * 2.1.316 新增：服务端调用涉及路径的判定（设置文件、点目录、规范化）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (19)
 * attribution: placement 19
 */
import { dirname, basename, join } from "path";
import { homedir, hostname } from "os";
import { trimEndChars, countCharInString } from "../../../utils/stringUtils.js";
import { getPlatform } from "../../../utils/platform.js";
import {
  keychainCommands,
  isServedEyeEnabled,
  HOST_CREDENTIAL_RULE_SOURCE,
  isCredentialBasename,
  classifyCredentialPath,
  readsCredentialStore,
  credentialCommandIn,
  joinLineContinuations,
  unquoteShellWord,
} from "./credentialPathGuards.js";
import { readServedBackgroundOverride } from "./backgroundCommands.js";
import { normalizeCaseForComparison, matchingRuleForInput } from "../../../utils/permissions/filesystem.js";
import { normalizeCommandForPlatform } from "../../../utils/git.js";
import {
  withPathAliases,
  getClaudeConfigDirs,
  claudeStateGlobEntries,
  claudeStateGlobs,
} from "../../../utils/permissions/claudeStatePaths.js";
import { uniq, count } from "../../../utils/collections.js";
import { env } from "../../../utils/env.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { getPathsForPermissionCheck } from "../../../utils/fsOperations.js";
import { secondRootMounts } from "../../../utils/wslMounts.js";
import { isSystemVolumePath } from "../../../utils/permissions/protectedDirs.js";
import { getProjectConfigRoot, getProjectRootOrNull } from "../../../bootstrap/state.js";
import { getAnnouncedDirectories, hasAnnouncedDirs } from "../../../utils/announcedDirectories.js";
import { pluginToolStagingRoot } from "../../../utils/tempDir.js";
import { isUntrustedLinkPath } from "../../../utils/pathResolution.js";
import { classifyHomeMount } from "../../../utils/networkPaths.js";
import { isLocalHostname, matchesHostPattern, isLoopbackHost } from "../../../utils/localHostnames.js";
import { logError } from "../../../utils/log.js";
import { expandPath } from "../../../utils/path.js";
import { runWithGuardOff } from "../../../utils/bash/bashParserFlags.js";
import { parseShellCommand } from "../../../tools/BashTool/readOnlyShellCheck.js";
import {
  SHELL_PROGRAM_NAMES,
  POSIX_SHELL_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
} from "../../../utils/bash/ast.js";
import { unwrapCommandArgv } from "../../../tools/BashTool/bashPermissions.js";
import { isVersionOnlyFlag } from "../../../utils/bash/parser.js";
import { safeParseToolInput } from "../../../Tool.js";
import { runInRemoteCallFrameMain } from "../../remoteMode.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-tr0s0d0k.js:24209-24524 placement
/**
 * 路径判定限额：嵌套输入深度 8、单条路径 512 字符、总扫描 131072 字符，以及绝对路径、通配符、URL 前缀、引号等形态正则。
 */
var SERVED_PATH_LIMITS = 8;
var MAX_NESTED_INPUT_LENGTH = 512;
var MAX_TOTAL_SCANNED_CHARS = 131072;
var ABSOLUTE_OR_HOME_PATH_RE = /^(?:\/|~(?:\/|$)|\.{1,2}(?:\/|$)|\$\{?HOME\}?(?:\/|$)|file:)/i;
var DOT_DOT_SEGMENT_RE = /(^|[/\\])\.\.?([/\\]|$)/;
var PATH_EDGE_CHARS_RE =
  /[/\\~*?[\]{}<>|;&`\x00-\x1f\x7f-\x9f\p{Cf}]|^\.|%(?=[0-9a-f]{2}|u[0-9a-f]{4})|\$(?=[\p{L}_{('"])|[@!+](?=\()|\+(?=[.~])|^[a-z][a-z0-9+.-]*:(?=\S)/iu;
var LEADING_QUOTE_OPENERS = /^["'(<[{]+/;
var TRAILING_QUOTE_CLOSERS = `"')>]}`;
var TRAILING_TRIM_CHARS = ".,;:!?";
//@ chunk-tr0s0d0k.js:24524-24571 placement
function trimPathQuotes(text) {
  return trimEndChars(text.replace(LEADING_QUOTE_OPENERS, ""), TRAILING_QUOTE_CLOSERS);
}
//@ chunk-tr0s0d0k.js:24571-24635 placement
function isBashShortFlagWithC(flag) {
  return /^[-+][a-zA-Z]+$/.test(flag) && flag.includes("c");
}
//@ chunk-tr0s0d0k.js:24635-24689 placement
function dirnameIncludingSlash(path) {
  return path.slice(0, path.lastIndexOf("/") + 1);
}
//@ chunk-tr0s0d0k.js:24689-25608 placement
/**
 * 路径形态正则集合：通配符/不安全字符/命令分隔/URL/普通名字/相对路径/proc、Data 卷、私有域名与数字主机等，用于判断云会话传来的路径是否可在本机处理。
 */
var SERVED_PATH_PATTERNS = /[,:=]+/;
var PATH_WILDCARD_CHARS_RE = /[*?[\]{}()@+!\\]/;
var PATH_UNSAFE_CHARS_RE = /[\x00-\x1f\x7f-\x9f\p{Cf}\s"'`%#|<>;&,:=]/u;
var WHITESPACE_RUN_RE = /[\t\n\v\f\r\x85\u2028\u2029]+/g;
var COMMAND_SEPARATOR_RE = /[\n\v\f\r\x85\u2028\u2029;&|]+/;
var DOLLAR_QUOTE_OR_ESCAPE_RE = /^\$(?=['"])|['"\\]/g;
var FILE_URL_RE = /^file:\/\/(?:localhost)?(?=\/)/i;
var HTTP_URL_RE =
  /^(https?):\/\/((?:[a-z0-9-]{1,63}\.)+[a-z][a-z0-9-]{0,62})(?::([1-9]\d{0,4}))?(\/(?:[\w-]+(?:\.[\w-]+)*(?:\/[\w-]+(?:\.[\w-]+)*)*\/?)?(?:\?[\w\-.=&]*)?(?:#[\w\-.]*)?)?$/i;
var PLAIN_NAME_PATH_RE = /^[A-Za-z_][\w-]*(?:\/[A-Za-z0-9_][\w-]*(?:\.[\w-]+)*)+$/;
var RELATIVE_PATH_RE = /^(?![/~$]|[A-Za-z][A-Za-z0-9+.-]*:)\S*[/\\]\S*$/;
var MAX_PLAIN_NAME_LENGTH = 512;
var MAX_COLLECTED_CANDIDATES = 16;
var MAX_PLAIN_NAME_SEGMENTS = 16;
var PROC_PATH_RE = /(?:^|\/)proc\/\d+(?:\/|$)/;
var DATA_VOLUME_PREFIX_RE = /^(?:(?:System\/)?Volumes\/)?Data(?:\/|$)/i;
var ABSOLUTE_DATA_VOLUME_RE = /^(?:System\/)?Volumes\/Data(?:\/|$)/i;
var SYSTEM_VOLUME_TAIL_RE = /\/(?:System(?:\/Volumes)?|Volumes)$/i;
var PRIVATE_DOMAIN_RE =
  /\.(?:lan|home|corp|private|intranet|test|onion|arpa)$|(?:^|\.)(?:ts\.net|fritz\.box|xip\.io|rbndr\.us|1u\.ms|rebind\.it)$/;
var NUMERIC_HOST_RE =
  /(?:^|\.)\d+(?:\.|$)|(?:^|[.-])(?:0x|[0-9a-f]{8}(?:[.-]|$))|(?:^|[^0-9])\d+(?:[.-]\d+){2}/;
var MAX_HOST_URL_LENGTH = 2048;
//@ chunk-tr0s0d0k.js:25608-31008 placement
/**
 * 对云会话调用的 MCP 工具参数里的路径做本机判定：守护位置、相对路径、主机样式、/proc /dev/fd 等。
 */
function judgeServedMcpPaths(tool, input, permissionContext) {
  if (tool.isMcp !== true) return;
  let platform = getPlatform();
  let isMac = platform === "macos";
  let isLinuxLike = platform === "linux" || platform === "wsl";
  let keychainCmds = keychainCommands();
  let eyeEnabled = isServedEyeEnabled();
  let servedBackgroundOverride = readServedBackgroundOverride();
  let normalizePath = (path) =>
    isMac
      ? normalizeCaseForComparison(path.normalize("NFC"))
      : platform === "windows"
        ? normalizeCommandForPlatform(path).replaceAll("\\", "/")
        : path;
  let mapped = withPathAliases(
    uniq([
      ...getClaudeConfigDirs(),
      ...claudeStateGlobEntries()
        .filter(({ tail }) => tail === "/**")
        .map(({ literal }) => literal),
      ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [dirname(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
    ]).map((dir) => dir.replace(/[\\/]+$/, "")),
  ).map(normalizePath);
  let credentialDeny = (ruleContent) => ({
    kind: "deny",
    rule: {
      source: HOST_CREDENTIAL_RULE_SOURCE,
      ruleBehavior: "deny",
      ruleValue: {
        toolName: FILE_READ_TOOL_NAME,
        ruleContent,
      },
    },
  });
  let mapped_2 = claudeStateGlobEntries()
    .filter(({ tail }) => tail.startsWith("/"))
    .map(({ literal, tail }) => ({
      dir: normalizePath(literal.replace(/[\\/]+$/, "")),
      segments: tail
        .split("/")
        .slice(1)
        .map(
          (segment) =>
            new RegExp(
              `^${segment
                .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                .replace(/\*+/g, "[^/]*")
                .replace(/\?/g, "[^/]")}$`,
              isMac ? "i" : "",
            ),
        ),
    }));
  let classifyAboveness = (path) => {
    let above = false;
    let pathsForPermissionCheck = getPathsForPermissionCheck(path);
    let mounts = secondRootMounts();
    let mountToReal = new Map(
      mounts.flatMap(({ mountPoint }) =>
        pathsForPermissionCheck
          .filter((candidate) => candidate === mountPoint || candidate.startsWith(`${mountPoint}/`))
          .map((candidate) => [candidate.slice(mountPoint.length) || "/", candidate]),
      ),
    );
    let candidates = uniq([
      ...pathsForPermissionCheck,
      ...(isMac ? [isSystemVolumePath(path)] : []),
      ...mountToReal.keys(),
    ]);
    for (let candidate of candidates) {
      let normalizedCandidate = normalizePath(candidate);
      if (
        isCredentialBasename(candidate) ||
        ((isMac || platform === "windows") && isCredentialBasename(normalizedCandidate)) ||
        (isLinuxLike && /^\/proc\/.+\/environ$/.test(candidate)) ||
        mapped.some((alias) => normalizedCandidate === alias || normalizedCandidate.startsWith(`${alias}/`))
      )
        return {
          under: mountToReal.get(candidate) ?? candidate,
        };
      let replaced = normalizedCandidate.replace(/\/+$/, "");
      if (
        replaced === "" ||
        mapped.some((alias) => alias.startsWith(`${replaced}/`)) ||
        mounts.some(({ mountPoint }) => mountPoint.startsWith(`${replaced}/`)) ||
        mapped_2.some(
          ({ dir, segments }) =>
            dir.startsWith(`${replaced}/`) ||
            replaced === dir ||
            (replaced.startsWith(`${dir}/`) &&
              replaced
                .slice(dir.length + 1)
                .split("/")
                .every((segment, index) => index < segments.length && segments[index].test(segment))),
        ) ||
        (isLinuxLike && /^\/proc(?:\/|$)/.test(replaced)) ||
        (isMac && /^\/(?:system(?:\/volumes(?:\/data)?)?|volumes)$/.test(replaced)) ||
        /^\/dev(?:\/fd(?:\/|$)|$)/.test(replaced)
      )
        above = true;
    }
    return above ? "above" : "clear";
  };
  let driveLetters =
    platform === "windows"
      ? uniq(
          [...mapped, ...mapped_2.map(({ dir }) => dir)].flatMap(
            (dir) => /^([a-z]):\//.exec(dir)?.slice(1) ?? [],
          ),
        )
      : [];
  let judgeAbsolutePath = (candidate) => {
    let normalized = normalizeServedPath(candidate);
    if (normalized !== undefined) {
      let spellings =
        /^[\\/](?![\\/])/.test(normalized) && !/^\/[a-z]\//i.test(normalized)
          ? [
              normalized,
              ...driveLetters.map((letter) => `${letter.toUpperCase()}:${normalized.replace(/\//g, "\\")}`),
            ]
          : [normalized];
      let verdict;
      for (let spelling of spellings) {
        let aboveness = classifyAboveness(spelling);
        if (aboveness === "above") verdict = "ask";
        else if (aboveness !== "clear")
          return {
            deny: aboveness.under,
          };
      }
      return verdict;
    }
    let wildcardAt = candidate.search(PATH_WILDCARD_CHARS_RE);
    if (wildcardAt > 0) {
      let dirPrefix = dirnameIncludingSlash(candidate.slice(0, wildcardAt));
      let normalizedPrefix = dirPrefix === "" ? undefined : normalizeServedPath(dirPrefix);
      if (normalizedPrefix !== undefined) {
        let aboveness = classifyAboveness(normalizedPrefix);
        if (aboveness !== "clear" && aboveness !== "above")
          return {
            deny: `${aboveness.under} (${candidate.slice(0, 128)})`,
          };
      }
    }
    return "ask";
  };
  let trimPathNoise = (text) => {
    let current = text;
    for (let idx = 0; idx < 3; idx++) {
      let unquoted = trimPathQuotes(current);
      let trimmed = trimEndChars(unquoted, TRAILING_TRIM_CHARS);
      if (trimmed === "") return unquoted || current;
      if (trimmed === current) break;
      current = trimmed;
    }
    return current;
  };
  let looksLikePath = (text) => {
    let trimmed = trimPathNoise(text);
    return [trimmed, ...trimmed.split(SERVED_PATH_PATTERNS), ...text.split(SERVED_PATH_PATTERNS)].some(
      (piece) => piece !== "" && piece !== text && PATH_EDGE_CHARS_RE.test(trimPathNoise(piece)),
    );
  };
  let globEntries;
  let globEntriesLazy = () =>
    (globEntries ??= [
      ...mapped.map((dir) => ({
        dir,
        segments: [],
      })),
      ...mapped_2,
      {
        dir: "/dev/fd",
        segments: [],
      },
      ...(isLinuxLike
        ? [
            {
              dir: "/proc",
              segments: [/^(?:self|thread-self)$/],
            },
          ]
        : []),
      ...claudeStateGlobEntries()
        .filter(({ tail }) => !tail.startsWith("/"))
        .map(({ literal, tail }) =>
          tail === ""
            ? {
                dir: normalizePath(literal),
                segments: [],
              }
            : {
                dir: normalizePath(dirname(literal)),
                segments: [
                  new RegExp(
                    `^${basename(literal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[^/]*$`,
                    isMac ? "i" : "",
                  ),
                ],
              },
        ),
    ]);
  let whyRejected;
  let relativeVerdicts = new Map();
  let trustedRoots = (permissionContext) => {
    let projectRoot = getProjectConfigRoot() ?? getProjectRootOrNull();
    return uniq([
      ...(projectRoot === null ? [] : [projectRoot]),
      ...getAnnouncedDirectories(),
      ...hasAnnouncedDirs(),
      ...permissionContext.additionalWorkingDirectories.keys(),
      pluginToolStagingRoot(),
    ]);
  };
  let judgeRelative = (relativePath, permissionContext) => {
    let roots = trustedRoots(permissionContext);
    let parts = relativePath.split("/");
    let suffixedPaths = [relativePath];
    if (isMac)
      for (let idx = 0; idx < parts.length; idx++) {
        let joined = parts.slice(idx).join("/");
        if (idx > 0 && !ABSOLUTE_DATA_VOLUME_RE.test(joined)) continue;
        while (DATA_VOLUME_PREFIX_RE.test(joined)) {
          joined = joined.replace(DATA_VOLUME_PREFIX_RE, "");
          suffixedPaths.push(joined);
        }
      }
    if (
      [
        ...suffixedPaths.map((candidate) => `/${candidate}`),
        ...parts.map((part, index) => `/${parts.slice(index).join("/")}`),
        ...roots.map((root) => join(root, relativePath)),
      ].some(
        (candidate) =>
          isUntrustedLinkPath(candidate) || classifyHomeMount(candidate, isMac ? "darwin" : "linux"),
      )
    )
      return "unreadable";
    if (
      (isMac && SYSTEM_VOLUME_TAIL_RE.test(relativePath)) ||
      suffixedPaths.some(
        (suffix) =>
          classifyAboveness(`/${suffix}`) !== "clear" ||
          classifyAboveness(join(homedir(), suffix)) !== "clear" ||
          matchesDirSegments(normalizePath(suffix), globEntriesLazy()) ||
          matchesDotDirSegments(normalizePath(suffix), globEntriesLazy()) ||
          (isLinuxLike && PROC_PATH_RE.test(suffix)),
      )
    )
      return "guarded_place";
    for (let root of roots) {
      let joined = join(root, relativePath);
      let verdict =
        classifyAboveness(joined) === "clear"
          ? classifyCredentialPath(joined, permissionContext, root)
          : "guarded_place";
      if (verdict !== undefined) return verdict;
    }
    return;
  };
  let judgePlainName = (name) => {
    if (!RELATIVE_PATH_RE.test(name)) return;
    try {
      if (
        name.length > MAX_PLAIN_NAME_LENGTH ||
        !PLAIN_NAME_PATH_RE.test(name) ||
        countCharInString(name, "/") + 1 > MAX_PLAIN_NAME_SEGMENTS
      )
        return "not_plain_name";
      let cached = relativeVerdicts.get(name);
      if (cached !== undefined) return cached;
      let hostname_2 = name.slice(0, name.indexOf("/")).toLowerCase();
      if (isLocalHostname(hostname_2) || matchesHostPattern(hostname_2, hostname())) return "host_like";
      if (platform !== "macos" && platform !== "linux") return "platform";
      if (permissionContext === undefined) return "unreadable";
      if (relativeVerdicts.size >= MAX_COLLECTED_CANDIDATES) return "too_many";
      let verdict = judgeRelative(name, permissionContext) ?? "relative_path";
      relativeVerdicts.set(name, verdict);
      return verdict;
    } catch (error) {
      logError(
        Error("a served MCP relative name could not be judged", {
          cause: error,
        }),
      );
      return "unreadable";
    }
  };
  let judgeToken = (text, rawString) => {
    whyRejected = undefined;
    if (text === "") return;
    if (!/\s/.test(text)) {
      let verdict = PATH_EDGE_CHARS_RE.test(text)
        ? judgeAbsolutePath(text)
        : looksLikePath(text)
          ? "ask"
          : undefined;
      if (verdict !== "ask") return verdict;
      if (eyeEnabled && isWebAddress(text)) {
        let pathname = URL.parse(text)?.pathname;
        return pathname === "/" ||
          (pathname !== undefined &&
            judgeAbsolutePath(pathname) === undefined &&
            judgeAbsolutePath(`~${pathname}`) === undefined)
          ? "web_address"
          : "ask";
      }
      let whyRejected_2 = !servedBackgroundOverride
        ? undefined
        : text === rawString
          ? judgePlainName(text)
          : RELATIVE_PATH_RE.test(text)
            ? "not_plain_name"
            : undefined;
      if (whyRejected_2 === "relative_path") return "relative_path";
      whyRejected = whyRejected_2;
      return "ask";
    }
    if (ABSOLUTE_OR_HOME_PATH_RE.test(text)) return "ask";
    for (let word of text.split(/\s+/)) {
      let trimmed = trimPathNoise(word);
      if (PATH_EDGE_CHARS_RE.test(trimmed) ? judgeAbsolutePath(trimmed) !== undefined : looksLikePath(word)) {
        whyRejected = !servedBackgroundOverride
          ? undefined
          : PLAIN_NAME_PATH_RE.test(word)
            ? "in_sentence"
            : RELATIVE_PATH_RE.test(word)
              ? "not_plain_name"
              : undefined;
        return "ask";
      }
    }
    return;
  };
  let askVerdict;
  let sawWebAddress = false;
  let sawRelative = false;
  let scannedCount = 0;
  let scannedChars = 0;
  for (let rawString of iterateStringsDeep(input, SERVED_PATH_LIMITS)) {
    if (rawString === DEPTH_EXHAUSTED || ++scannedCount > MAX_NESTED_INPUT_LENGTH)
      return credentialDeny("(nested input this machine could not inspect)");
    let normalized = rawString.normalize("NFKC");
    for (let candidate of uniq(
      [rawString, normalized].flatMap((source) => [
        source.replace(WHITESPACE_RUN_RE, " ").trim(),
        source.replace(WHITESPACE_RUN_RE, "").trim(),
      ]),
    )) {
      let verdict = judgeToken(candidate, rawString);
      if (verdict === "ask") {
        if (askVerdict === undefined)
          askVerdict = {
            kind: "ask",
            spelling: candidate.slice(0, 256),
            ...(whyRejected !== undefined && {
              why: whyRejected,
            }),
          };
      } else if (verdict === "relative_path") sawRelative = true;
      else if (verdict === "web_address") sawWebAddress = true;
      else if (verdict !== undefined) return credentialDeny(verdict.deny);
    }
    if (
      platform === "windows" &&
      askVerdict === undefined &&
      ((scannedChars += Math.max(rawString.length, normalized.length)) > MAX_TOTAL_SCANNED_CHARS ||
        uniq(
          [rawString, normalized].flatMap((source) => [
            source.replace(WHITESPACE_RUN_RE, " "),
            source.replace(WHITESPACE_RUN_RE, ""),
          ]),
        ).some((candidate) =>
          readsCredentialStore(candidate).some((word) => credentialCommandIn(word) !== undefined),
        ))
    )
      askVerdict = {
        kind: "ask",
        spelling: normalized.slice(0, 256),
      };
    if (keychainCmds.length > 0 && askVerdict === undefined)
      for (let command of normalized.split(COMMAND_SEPARATOR_RE)) {
        let argv = command
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => trimPathNoise(word).replace(DOLLAR_QUOTE_OR_ESCAPE_RE, ""));
        let argv_2 = argv.length < 2 ? argv : normalizeArgv(argv);
        if (argv_2 === undefined || (argv_2.length >= 2 && keychainCmds.includes(argv_2[0]))) {
          askVerdict = {
            kind: "ask",
            spelling: command.trim().slice(0, 256),
          };
          break;
        }
      }
  }
  return (
    askVerdict ??
    (sawRelative
      ? {
          kind: "relative_path",
        }
      : sawWebAddress
        ? {
            kind: "web_address",
          }
        : undefined)
  );
}
//@ chunk-tr0s0d0k.js:31008-31328 placement
function matchesDirSegments(path, entries) {
  let parts = path.split("/");
  return entries.some(({ dir, segments }) => {
    let filtered = dir.split("/").filter(Boolean);
    let totalParts = filtered.length + segments.length;
    let matchesAt = (index, part) =>
      index < filtered.length ? filtered[index] === part : segments[index - filtered.length].test(part);
    let needsRealPart = (index) => index < filtered.length || !matchesAt(index, "");
    for (let j = 0; j < totalParts; j++) {
      let sliced = parts.slice(0, totalParts - j);
      if (
        sliced.some((part, index) => needsRealPart(j + index)) &&
        sliced.every((part, index) => matchesAt(j + index, part))
      )
        return true;
    }
    return false;
  });
}
//@ chunk-tr0s0d0k.js:31328-31770 placement
function matchesDotDirSegments(path, dotDirPatterns) {
  let parts = path.split("/");
  return dotDirPatterns.some(({ dir, segments }) => {
    let filtered = dir.split("/").filter(Boolean);
    let firstDotIndex = filtered.findLastIndex((segment) => segment.startsWith(".")) + 1;
    let windowLength = filtered.length + segments.length;
    let matchesAt = (offset, segment) =>
      offset < filtered.length
        ? filtered[offset] === segment
        : segments[offset - filtered.length].test(segment);
    let isLiteralPosition = (offset) => offset < filtered.length || !matchesAt(offset, "");
    for (let j = 1; j < parts.length; j++)
      for (let j_2 = 0; j_2 < windowLength; j_2++) {
        let sliced = parts.slice(j, j + windowLength - j_2);
        let isShallow = j_2 + sliced.length < firstDotIndex;
        if (
          (j_2 >= firstDotIndex || isShallow) &&
          count([...sliced.keys()], (index) => isLiteralPosition(j_2 + index)) >=
            (firstDotIndex === 0 || isShallow ? 1 : 2) &&
          sliced.every((segment, index) => matchesAt(j_2 + index, segment))
        )
          return true;
      }
    return false;
  });
}
//@ chunk-tr0s0d0k.js:31770-32593 placement
function normalizeServedPath(rawPath) {
  let path = rawPath;
  if (/^file:/i.test(path)) {
    let match = FILE_URL_RE.exec(path);
    if (match === null) return;
    path = path.slice(match[0].length);
  }
  path = path.replace(/^\$\{?HOME\}?(?=\/|$)/, "~");
  if (path === "~") path = "~/";
  if (getPlatform() === "windows") {
    path = (path[0] ?? "") + path.slice(1).replace(/[\\/]{2,}/g, "/");
    path = path
      .replace(/^([A-Za-z]):[\\/]/, (match, drive) => `/${drive.toLowerCase()}/`)
      .replace(/^\/(?:proc\/cygdrive|cygdrive|mnt)\/(?=[a-z](?:\/|$))/i, "/")
      .replace(/^\/([A-Za-z])$/, "/$1/")
      .replace(/^\/([A-Z])\//, (match, drive) => `/${drive.toLowerCase()}/`);
    if (/^\/[a-z]\//.test(path)) path = path.replaceAll("\\", "/");
    if (/^[\\/]{2}/.test(path) || /^\/(?:mnt|cygdrive)\/?$/i.test(path) || /^\/proc(?:\/|$)/i.test(path))
      return;
  }
  path =
    getPlatform() === "windows" && /^\/[a-z]\/+$/i.test(path)
      ? path.replace(/\/+$/, "/")
      : path.replace(/(?<=[^/])\/+$/, "");
  if (
    !/^(?:\/|~\/)/.test(path) ||
    PATH_UNSAFE_CHARS_RE.test(path) ||
    PATH_WILDCARD_CHARS_RE.test(path) ||
    path.includes("$") ||
    path.includes("~", 1) ||
    DOT_DOT_SEGMENT_RE.test(path.slice(1))
  )
    return;
  return expandPath(path, homedir());
}
//@ chunk-tr0s0d0k.js:32593-32938 placement
function isWebAddress(text) {
  let match = text.length > MAX_HOST_URL_LENGTH ? null : HTTP_URL_RE.exec(text);
  if (match === null) return false;
  let lower = match[1].toLowerCase();
  let host = match[2].toLowerCase();
  let pathAndQuery = match[4] ?? "/";
  if (
    isLoopbackHost(host) ||
    isLocalHostname(host) ||
    PRIVATE_DOMAIN_RE.test(host) ||
    NUMERIC_HOST_RE.test(host) ||
    /[?#&=]\./.test(pathAndQuery)
  )
    return false;
  let portSuffix =
    match[3] === undefined || match[3] === (lower === "https" ? "443" : "80") ? "" : `:${match[3]}`;
  let parsed = URL.parse(text);
  return (
    parsed !== null &&
    parsed.href === `${lower}://${host}${portSuffix}${pathAndQuery}` &&
    parsed.hostname === host
  );
}
//@ chunk-tr0s0d0k.js:32938-32971 placement
var DEPTH_EXHAUSTED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tr0s0d0k.js:32938", () => {
  DEPTH_EXHAUSTED = Symbol("depth-exhausted");
});
//@ chunk-tr0s0d0k.js:32971-33219 placement
function* iterateStringsDeep(value, depth) {
  if (typeof value === "string") {
    yield value;
    return;
  }
  if (value === null || typeof value !== "object") return;
  let entries = Array.isArray(value) ? value.map((item) => ["", item]) : Object.entries(value);
  if (depth <= 0) {
    if (entries.length > 0) yield DEPTH_EXHAUSTED;
    return;
  }
  for (let [key, child] of entries) {
    if (key !== "") yield key;
    yield* iterateStringsDeep(child, depth - 1);
  }
}
//@ chunk-tr0s0d0k.js:33219-33709 placement
async function commandReachesSettings(command, depth) {
  let parsed = await runWithGuardOff(() => parseShellCommand(command));
  if (parsed.kind !== "simple") return false;
  for (let command of parsed.commands) {
    let argv = normalizeArgv(command.argv);
    if (argv === undefined) return true;
    let [program = "", ...args] = argv;
    if (keychainCommands().includes(program)) return true;
    let replaced = program.replace(/\.exe$/, "");
    if (!SHELL_PROGRAM_NAMES.has(replaced)) continue;
    if (!POSIX_SHELL_NAMES.has(replaced)) {
      if (
        args.some((arg) => {
          let unquoted = joinLineContinuations(unquoteShellWord(arg));
          let folded = getPlatform() === "macos" ? unquoted.toUpperCase().toLowerCase() : unquoted;
          return keychainCommands().some((name) => folded.includes(name));
        })
      )
        return true;
      continue;
    }
    if (!args.some(isBashShortFlagWithC)) continue;
    if (depth <= 1) return true;
    for (let arg of args) if (await commandReachesSettings(arg, depth - 1)) return true;
  }
  return false;
}
//@ chunk-tr0s0d0k.js:33709-34192 placement
function normalizeArgv(argv) {
  let platform = getPlatform();
  let caseInsensitive = platform === "macos" || platform === "windows";
  let current = [...argv];
  for (let j = 0; j < 32; j++) {
    let base = basename(current[0] ?? "");
    current[0] = caseInsensitive ? base.toUpperCase().toLowerCase() : base;
    let split = current[0] === "env" ? splitStringArgs(current) : undefined;
    if (split !== undefined) {
      current = split;
      continue;
    }
    let unwrapped = unwrapCommandArgv(current);
    let changed = unwrapped.length !== current.length || unwrapped[0] !== current[0];
    if (changed && !/^[-+\d]/.test(unwrapped[0] ?? "")) {
      current = unwrapped;
      continue;
    }
    if (
      !TRANSPARENT_LAUNCHER_NAMES.has(current[0]) ||
      (current[0] === "command" && current.some(isVersionOnlyFlag))
    )
      return changed ? unwrapped : current;
    let index = current.findIndex(
      (arg, index) => index > 0 && !/^(?:[-+]|\d+(?:\.\d+)?[smhd]?$|[A-Za-z_]\w*=)/.test(arg),
    );
    if (index < 1) return current;
    current = current.slice(index);
  }
  return;
}
//@ chunk-tr0s0d0k.js:34192-34592 placement
function splitStringArgs(argv) {
  for (let j = 1; j < argv.length; j++) {
    let arg = argv[j];
    let inline = arg.startsWith("--split-string=")
      ? arg.slice(15)
      : /^-[^-]*S/.test(arg)
        ? arg.slice(arg.indexOf("S") + 1)
        : undefined;
    let separateArg = arg === "--split-string" || inline === "";
    let value = separateArg ? (argv[j + 1] ?? "") : inline;
    if (value !== undefined)
      return [...value.trim().split(/\s+/).filter(Boolean), ...argv.slice(j + (separateArg ? 2 : 1))];
    if (["-u", "-C", "--unset", "--chdir"].includes(arg)) j++;
    else if (arg === "--" || !/^(?:-|[A-Za-z_]\w*=)/.test(arg)) return;
  }
  return;
}
//@ chunk-tr0s0d0k.js:34592-34791 placement
function hostCredentialRuleOf(decisionReason) {
  if (decisionReason?.type === "rule")
    return decisionReason.rule.source === HOST_CREDENTIAL_RULE_SOURCE ? decisionReason.rule : undefined;
  if (decisionReason?.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let rule = hostCredentialRuleOf(reason.decisionReason);
      if (rule !== undefined) return rule;
    }
  return;
}
//@ chunk-tr0s0d0k.js:34791-35157 placement
function servedToolPath(tool, input, permissionContext, cwd) {
  if (tool.getPath === undefined) return;
  let parsed = safeParseToolInput(tool, input);
  if (!parsed.success) return;
  let toolPath = runInRemoteCallFrameMain(cwd, () => tool.getPath?.(parsed.data));
  if (typeof toolPath !== "string" || toolPath === "") return;
  let behaviors = tool.isReadOnly(parsed.data) ? ["read", "edit"] : ["edit", "read"];
  let pathsForPermissionCheck = getPathsForPermissionCheck(expandPath(toolPath, cwd));
  let candidates =
    getPlatform() === "macos"
      ? pathsForPermissionCheck.flatMap((path) => [path, normalizeCaseForComparison(path)])
      : pathsForPermissionCheck;
  for (let path of candidates)
    for (let behavior of behaviors) {
      let rule = matchingRuleForInput(path, permissionContext, behavior, "deny");
      if (rule?.source === HOST_CREDENTIAL_RULE_SOURCE) return rule;
    }
  return;
}
//@ chunk-tr0s0d0k.js:35157-35246 placement (2.1.88 match: getDenyRuleForAgent, 1)
function stripDoubleSlashPrefix(rule) {
  let ruleContent = rule.ruleValue.ruleContent ?? "";
  return ruleContent.startsWith("//") ? ruleContent.slice(1) : ruleContent;
}
//@ chunk-tr0s0d0k.js:35246-35380 placement
function isMountPointRule(rule) {
  let ruleContent = stripDoubleSlashPrefix(rule);
  return claudeStateGlobs(
    secondRootMounts().map(({ mountPoint }) => ({
      literal: mountPoint,
      tail: "",
    })),
  ).some((glob) => ruleContent.startsWith(`${glob.slice(1)}/`));
}
export {
  commandReachesSettings,
  servedToolPath,
  isMountPointRule,
  stripDoubleSlashPrefix,
  judgeServedMcpPaths,
  hostCredentialRuleOf,
};
