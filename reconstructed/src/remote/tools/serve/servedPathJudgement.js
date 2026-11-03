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
function trimPathQuotes(e) {
  return trimEndChars(e.replace(LEADING_QUOTE_OPENERS, ""), TRAILING_QUOTE_CLOSERS);
}
//@ chunk-tr0s0d0k.js:24571-24635 placement
function isBashShortFlagWithC(e) {
  return /^[-+][a-zA-Z]+$/.test(e) && e.includes("c");
}
//@ chunk-tr0s0d0k.js:24635-24689 placement
function dirnameIncludingSlash(e) {
  return e.slice(0, e.lastIndexOf("/") + 1);
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
function judgeServedMcpPaths(e, n, o) {
  if (e.isMcp !== true) return;
  let platform = getPlatform();
  let s = platform === "macos";
  let d = platform === "linux" || platform === "wsl";
  let u = keychainCommands();
  let p = isServedEyeEnabled();
  let servedBackgroundOverride = readServedBackgroundOverride();
  let _ = (y) =>
    s
      ? normalizeCaseForComparison(y.normalize("NFC"))
      : platform === "windows"
        ? normalizeCommandForPlatform(y).replaceAll("\\", "/")
        : y;
  let mapped = withPathAliases(
    uniq([
      ...getClaudeConfigDirs(),
      ...claudeStateGlobEntries()
        .filter(({ tail }) => tail === "/**")
        .map(({ literal }) => literal),
      ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [dirname(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
    ]).map((y) => y.replace(/[\\/]+$/, "")),
  ).map(_);
  let R = (ruleContent) => ({
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
      dir: _(literal.replace(/[\\/]+$/, "")),
      segments: tail
        .split("/")
        .slice(1)
        .map(
          (P) =>
            new RegExp(
              `^${P.replace(/[.+^${}()|[\]\\]/g, "\\$&")
                .replace(/\*+/g, "[^/]*")
                .replace(/\?/g, "[^/]")}$`,
              s ? "i" : "",
            ),
        ),
    }));
  let L = (y) => {
    let E = false;
    let pathsForPermissionCheck = getPathsForPermissionCheck(y);
    let w = secondRootMounts();
    let D = new Map(
      w.flatMap(({ mountPoint }) =>
        pathsForPermissionCheck
          .filter((q) => q === mountPoint || q.startsWith(`${mountPoint}/`))
          .map((q) => [q.slice(mountPoint.length) || "/", q]),
      ),
    );
    let T = uniq([...pathsForPermissionCheck, ...(s ? [isSystemVolumePath(y)] : []), ...D.keys()]);
    for (let W of T) {
      let q = _(W);
      if (
        isCredentialBasename(W) ||
        ((s || platform === "windows") && isCredentialBasename(q)) ||
        (d && /^\/proc\/.+\/environ$/.test(W)) ||
        mapped.some((te) => q === te || q.startsWith(`${te}/`))
      )
        return {
          under: D.get(W) ?? W,
        };
      let replaced = q.replace(/\/+$/, "");
      if (
        replaced === "" ||
        mapped.some((te) => te.startsWith(`${replaced}/`)) ||
        w.some(({ mountPoint }) => mountPoint.startsWith(`${replaced}/`)) ||
        mapped_2.some(
          ({ dir, segments }) =>
            dir.startsWith(`${replaced}/`) ||
            replaced === dir ||
            (replaced.startsWith(`${dir}/`) &&
              replaced
                .slice(dir.length + 1)
                .split("/")
                .every((pe, ge) => ge < segments.length && segments[ge].test(pe))),
        ) ||
        (d && /^\/proc(?:\/|$)/.test(replaced)) ||
        (s && /^\/(?:system(?:\/volumes(?:\/data)?)?|volumes)$/.test(replaced)) ||
        /^\/dev(?:\/fd(?:\/|$)|$)/.test(replaced)
      )
        E = true;
    }
    return E ? "above" : "clear";
  };
  let V =
    platform === "windows"
      ? uniq(
          [...mapped, ...mapped_2.map(({ dir }) => dir)].flatMap(
            (y) => /^([a-z]):\//.exec(y)?.slice(1) ?? [],
          ),
        )
      : [];
  let A = (y) => {
    let E = normalizeServedPath(y);
    if (E !== undefined) {
      let w =
        /^[\\/](?![\\/])/.test(E) && !/^\/[a-z]\//i.test(E)
          ? [E, ...V.map((T) => `${T.toUpperCase()}:${E.replace(/\//g, "\\")}`)]
          : [E];
      let D;
      for (let T of w) {
        let W = L(T);
        if (W === "above") D = "ask";
        else if (W !== "clear")
          return {
            deny: W.under,
          };
      }
      return D;
    }
    let P = y.search(PATH_WILDCARD_CHARS_RE);
    if (P > 0) {
      let w = dirnameIncludingSlash(y.slice(0, P));
      let D = w === "" ? undefined : normalizeServedPath(w);
      if (D !== undefined) {
        let T = L(D);
        if (T !== "clear" && T !== "above")
          return {
            deny: `${T.under} (${y.slice(0, 128)})`,
          };
      }
    }
    return "ask";
  };
  let O = (y) => {
    let E = y;
    for (let idx = 0; idx < 3; idx++) {
      let w = trimPathQuotes(E);
      let D = trimEndChars(w, TRAILING_TRIM_CHARS);
      if (D === "") return w || E;
      if (D === E) break;
      E = D;
    }
    return E;
  };
  let X = (y) => {
    let E = O(y);
    return [E, ...E.split(SERVED_PATH_PATTERNS), ...y.split(SERVED_PATH_PATTERNS)].some(
      (P) => P !== "" && P !== y && PATH_EDGE_CHARS_RE.test(O(P)),
    );
  };
  let J;
  let K = () =>
    (J ??= [
      ...mapped.map((dir) => ({
        dir,
        segments: [],
      })),
      ...mapped_2,
      {
        dir: "/dev/fd",
        segments: [],
      },
      ...(d
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
                dir: _(literal),
                segments: [],
              }
            : {
                dir: _(dirname(literal)),
                segments: [
                  new RegExp(
                    `^${basename(literal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[^/]*$`,
                    s ? "i" : "",
                  ),
                ],
              },
        ),
    ]);
  let j;
  let G = new Map();
  let M = (y) => {
    let E = getProjectConfigRoot() ?? getProjectRootOrNull();
    return uniq([
      ...(E === null ? [] : [E]),
      ...getAnnouncedDirectories(),
      ...hasAnnouncedDirs(),
      ...y.additionalWorkingDirectories.keys(),
      pluginToolStagingRoot(),
    ]);
  };
  let Z = (y, E) => {
    let P = M(E);
    let parts = y.split("/");
    let D = [y];
    if (s)
      for (let idx = 0; idx < parts.length; idx++) {
        let joined = parts.slice(idx).join("/");
        if (idx > 0 && !ABSOLUTE_DATA_VOLUME_RE.test(joined)) continue;
        while (DATA_VOLUME_PREFIX_RE.test(joined)) {
          joined = joined.replace(DATA_VOLUME_PREFIX_RE, "");
          D.push(joined);
        }
      }
    if (
      [
        ...D.map((T) => `/${T}`),
        ...parts.map((T, W) => `/${parts.slice(W).join("/")}`),
        ...P.map((T) => join(T, y)),
      ].some((T) => isUntrustedLinkPath(T) || classifyHomeMount(T, s ? "darwin" : "linux"))
    )
      return "unreadable";
    if (
      (s && SYSTEM_VOLUME_TAIL_RE.test(y)) ||
      D.some(
        (T) =>
          L(`/${T}`) !== "clear" ||
          L(join(homedir(), T)) !== "clear" ||
          matchesDirSegments(_(T), K()) ||
          matchesDotDirSegments(_(T), K()) ||
          (d && PROC_PATH_RE.test(T)),
      )
    )
      return "guarded_place";
    for (let T of P) {
      let W = join(T, y);
      let q = L(W) === "clear" ? classifyCredentialPath(W, E, T) : "guarded_place";
      if (q !== undefined) return q;
    }
    return;
  };
  let ce = (y) => {
    if (!RELATIVE_PATH_RE.test(y)) return;
    try {
      if (
        y.length > MAX_PLAIN_NAME_LENGTH ||
        !PLAIN_NAME_PATH_RE.test(y) ||
        countCharInString(y, "/") + 1 > MAX_PLAIN_NAME_SEGMENTS
      )
        return "not_plain_name";
      let E = G.get(y);
      if (E !== undefined) return E;
      let lower = y.slice(0, y.indexOf("/")).toLowerCase();
      if (isLocalHostname(lower) || matchesHostPattern(lower, hostname())) return "host_like";
      if (platform !== "macos" && platform !== "linux") return "platform";
      if (o === undefined) return "unreadable";
      if (G.size >= MAX_COLLECTED_CANDIDATES) return "too_many";
      let w = Z(y, o) ?? "relative_path";
      G.set(y, w);
      return w;
    } catch (error) {
      logError(
        Error("a served MCP relative name could not be judged", {
          cause: error,
        }),
      );
      return "unreadable";
    }
  };
  let ue = (y, E) => {
    j = undefined;
    if (y === "") return;
    if (!/\s/.test(y)) {
      let P = PATH_EDGE_CHARS_RE.test(y) ? A(y) : X(y) ? "ask" : undefined;
      if (P !== "ask") return P;
      if (p && isWebAddress(y)) {
        let pathname = URL.parse(y)?.pathname;
        return pathname === "/" ||
          (pathname !== undefined && A(pathname) === undefined && A(`~${pathname}`) === undefined)
          ? "web_address"
          : "ask";
      }
      let w = !servedBackgroundOverride
        ? undefined
        : y === E
          ? ce(y)
          : RELATIVE_PATH_RE.test(y)
            ? "not_plain_name"
            : undefined;
      if (w === "relative_path") return "relative_path";
      j = w;
      return "ask";
    }
    if (ABSOLUTE_OR_HOME_PATH_RE.test(y)) return "ask";
    for (let P of y.split(/\s+/)) {
      let w = O(P);
      if (PATH_EDGE_CHARS_RE.test(w) ? A(w) !== undefined : X(P)) {
        j = !servedBackgroundOverride
          ? undefined
          : PLAIN_NAME_PATH_RE.test(P)
            ? "in_sentence"
            : RELATIVE_PATH_RE.test(P)
              ? "not_plain_name"
              : undefined;
        return "ask";
      }
    }
    return;
  };
  let x;
  let re = false;
  let U = false;
  let Y = 0;
  let ie = 0;
  for (let y of iterateStringsDeep(n, SERVED_PATH_LIMITS)) {
    if (y === DEPTH_EXHAUSTED || ++Y > MAX_NESTED_INPUT_LENGTH)
      return R("(nested input this machine could not inspect)");
    let normalized = y.normalize("NFKC");
    for (let P of uniq(
      [y, normalized].flatMap((w) => [
        w.replace(WHITESPACE_RUN_RE, " ").trim(),
        w.replace(WHITESPACE_RUN_RE, "").trim(),
      ]),
    )) {
      let w = ue(P, y);
      if (w === "ask") {
        if (x === undefined)
          x = {
            kind: "ask",
            spelling: P.slice(0, 256),
            ...(j !== undefined && {
              why: j,
            }),
          };
      } else if (w === "relative_path") U = true;
      else if (w === "web_address") re = true;
      else if (w !== undefined) return R(w.deny);
    }
    if (
      platform === "windows" &&
      x === undefined &&
      ((ie += Math.max(y.length, normalized.length)) > MAX_TOTAL_SCANNED_CHARS ||
        uniq(
          [y, normalized].flatMap((P) => [
            P.replace(WHITESPACE_RUN_RE, " "),
            P.replace(WHITESPACE_RUN_RE, ""),
          ]),
        ).some((P) => readsCredentialStore(P).some((w) => credentialCommandIn(w) !== undefined)))
    )
      x = {
        kind: "ask",
        spelling: normalized.slice(0, 256),
      };
    if (u.length > 0 && x === undefined)
      for (let P of normalized.split(COMMAND_SEPARATOR_RE)) {
        let mapped = P.trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((T) => O(T).replace(DOLLAR_QUOTE_OR_ESCAPE_RE, ""));
        let D = mapped.length < 2 ? mapped : normalizeArgv(mapped);
        if (D === undefined || (D.length >= 2 && u.includes(D[0]))) {
          x = {
            kind: "ask",
            spelling: P.trim().slice(0, 256),
          };
          break;
        }
      }
  }
  return (
    x ??
    (U
      ? {
          kind: "relative_path",
        }
      : re
        ? {
            kind: "web_address",
          }
        : undefined)
  );
}
//@ chunk-tr0s0d0k.js:31008-31328 placement
function matchesDirSegments(e, n) {
  let parts = e.split("/");
  return n.some(({ dir, segments }) => {
    let filtered = dir.split("/").filter(Boolean);
    let u = filtered.length + segments.length;
    let p = (_, S) => (_ < filtered.length ? filtered[_] === S : segments[_ - filtered.length].test(S));
    let h = (_) => _ < filtered.length || !p(_, "");
    for (let j = 0; j < u; j++) {
      let sliced = parts.slice(0, u - j);
      if (sliced.some((R, B) => h(j + B)) && sliced.every((R, B) => p(j + B, R))) return true;
    }
    return false;
  });
}
//@ chunk-tr0s0d0k.js:31328-31770 placement
function matchesDotDirSegments(e, n) {
  let parts = e.split("/");
  return n.some(({ dir, segments }) => {
    let filtered = dir.split("/").filter(Boolean);
    let u = filtered.findLastIndex((S) => S.startsWith(".")) + 1;
    let p = filtered.length + segments.length;
    let h = (S, R) => (S < filtered.length ? filtered[S] === R : segments[S - filtered.length].test(R));
    let _ = (S) => S < filtered.length || !h(S, "");
    for (let j = 1; j < parts.length; j++)
      for (let j_2 = 0; j_2 < p; j_2++) {
        let sliced = parts.slice(j, j + p - j_2);
        let L = j_2 + sliced.length < u;
        if (
          (j_2 >= u || L) &&
          count([...sliced.keys()], (V) => _(j_2 + V)) >= (u === 0 || L ? 1 : 2) &&
          sliced.every((V, A) => h(j_2 + A, V))
        )
          return true;
      }
    return false;
  });
}
//@ chunk-tr0s0d0k.js:31770-32593 placement
function normalizeServedPath(e) {
  let n = e;
  if (/^file:/i.test(n)) {
    let match = FILE_URL_RE.exec(n);
    if (match === null) return;
    n = n.slice(match[0].length);
  }
  n = n.replace(/^\$\{?HOME\}?(?=\/|$)/, "~");
  if (n === "~") n = "~/";
  if (getPlatform() === "windows") {
    n = (n[0] ?? "") + n.slice(1).replace(/[\\/]{2,}/g, "/");
    n = n
      .replace(/^([A-Za-z]):[\\/]/, (o, r) => `/${r.toLowerCase()}/`)
      .replace(/^\/(?:proc\/cygdrive|cygdrive|mnt)\/(?=[a-z](?:\/|$))/i, "/")
      .replace(/^\/([A-Za-z])$/, "/$1/")
      .replace(/^\/([A-Z])\//, (o, r) => `/${r.toLowerCase()}/`);
    if (/^\/[a-z]\//.test(n)) n = n.replaceAll("\\", "/");
    if (/^[\\/]{2}/.test(n) || /^\/(?:mnt|cygdrive)\/?$/i.test(n) || /^\/proc(?:\/|$)/i.test(n)) return;
  }
  n =
    getPlatform() === "windows" && /^\/[a-z]\/+$/i.test(n)
      ? n.replace(/\/+$/, "/")
      : n.replace(/(?<=[^/])\/+$/, "");
  if (
    !/^(?:\/|~\/)/.test(n) ||
    PATH_UNSAFE_CHARS_RE.test(n) ||
    PATH_WILDCARD_CHARS_RE.test(n) ||
    n.includes("$") ||
    n.includes("~", 1) ||
    DOT_DOT_SEGMENT_RE.test(n.slice(1))
  )
    return;
  return expandPath(n, homedir());
}
//@ chunk-tr0s0d0k.js:32593-32938 placement
function isWebAddress(e) {
  let n = e.length > MAX_HOST_URL_LENGTH ? null : HTTP_URL_RE.exec(e);
  if (n === null) return false;
  let lower = n[1].toLowerCase();
  let lower_2 = n[2].toLowerCase();
  let s = n[4] ?? "/";
  if (
    isLoopbackHost(lower_2) ||
    isLocalHostname(lower_2) ||
    PRIVATE_DOMAIN_RE.test(lower_2) ||
    NUMERIC_HOST_RE.test(lower_2) ||
    /[?#&=]\./.test(s)
  )
    return false;
  let d = n[3] === undefined || n[3] === (lower === "https" ? "443" : "80") ? "" : `:${n[3]}`;
  let u = URL.parse(e);
  return u !== null && u.href === `${lower}://${lower_2}${d}${s}` && u.hostname === lower_2;
}
//@ chunk-tr0s0d0k.js:32938-32971 placement
var DEPTH_EXHAUSTED = Symbol("depth-exhausted");
//@ chunk-tr0s0d0k.js:32971-33219 placement
function* iterateStringsDeep(e, n) {
  if (typeof e === "string") {
    yield e;
    return;
  }
  if (e === null || typeof e !== "object") return;
  let o = Array.isArray(e) ? e.map((r) => ["", r]) : Object.entries(e);
  if (n <= 0) {
    if (o.length > 0) yield DEPTH_EXHAUSTED;
    return;
  }
  for (let [r, s] of o) {
    if (r !== "") yield r;
    yield* iterateStringsDeep(s, n - 1);
  }
}
//@ chunk-tr0s0d0k.js:33219-33709 placement
async function commandReachesSettings(e, n) {
  let o = await runWithGuardOff(() => parseShellCommand(e));
  if (o.kind !== "simple") return false;
  for (let command of o.commands) {
    let s = normalizeArgv(command.argv);
    if (s === undefined) return true;
    let [d = "", ...u] = s;
    if (keychainCommands().includes(d)) return true;
    let replaced = d.replace(/\.exe$/, "");
    if (!SHELL_PROGRAM_NAMES.has(replaced)) continue;
    if (!POSIX_SHELL_NAMES.has(replaced)) {
      if (
        u.some((h) => {
          let _ = joinLineContinuations(unquoteShellWord(h));
          let S = getPlatform() === "macos" ? _.toUpperCase().toLowerCase() : _;
          return keychainCommands().some((R) => S.includes(R));
        })
      )
        return true;
      continue;
    }
    if (!u.some(isBashShortFlagWithC)) continue;
    if (n <= 1) return true;
    for (let h of u) if (await commandReachesSettings(h, n - 1)) return true;
  }
  return false;
}
//@ chunk-tr0s0d0k.js:33709-34192 placement
function normalizeArgv(e) {
  let platform = getPlatform();
  let o = platform === "macos" || platform === "windows";
  let r = [...e];
  for (let j = 0; j < 32; j++) {
    let d = basename(r[0] ?? "");
    r[0] = o ? d.toUpperCase().toLowerCase() : d;
    let u = r[0] === "env" ? splitStringArgs(r) : undefined;
    if (u !== undefined) {
      r = u;
      continue;
    }
    let p = unwrapCommandArgv(r);
    let h = p.length !== r.length || p[0] !== r[0];
    if (h && !/^[-+\d]/.test(p[0] ?? "")) {
      r = p;
      continue;
    }
    if (!TRANSPARENT_LAUNCHER_NAMES.has(r[0]) || (r[0] === "command" && r.some(isVersionOnlyFlag)))
      return h ? p : r;
    let index = r.findIndex((S, R) => R > 0 && !/^(?:[-+]|\d+(?:\.\d+)?[smhd]?$|[A-Za-z_]\w*=)/.test(S));
    if (index < 1) return r;
    r = r.slice(index);
  }
  return;
}
//@ chunk-tr0s0d0k.js:34192-34592 placement
function splitStringArgs(e) {
  for (let j = 1; j < e.length; j++) {
    let o = e[j];
    let r = o.startsWith("--split-string=")
      ? o.slice(15)
      : /^-[^-]*S/.test(o)
        ? o.slice(o.indexOf("S") + 1)
        : undefined;
    let s = o === "--split-string" || r === "";
    let d = s ? (e[j + 1] ?? "") : r;
    if (d !== undefined) return [...d.trim().split(/\s+/).filter(Boolean), ...e.slice(j + (s ? 2 : 1))];
    if (["-u", "-C", "--unset", "--chdir"].includes(o)) j++;
    else if (o === "--" || !/^(?:-|[A-Za-z_]\w*=)/.test(o)) return;
  }
  return;
}
//@ chunk-tr0s0d0k.js:34592-34791 placement
function hostCredentialRuleOf(decisionReason) {
  if (decisionReason?.type === "rule")
    return decisionReason.rule.source === HOST_CREDENTIAL_RULE_SOURCE ? decisionReason.rule : undefined;
  if (decisionReason?.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let o = hostCredentialRuleOf(reason.decisionReason);
      if (o !== undefined) return o;
    }
  return;
}
//@ chunk-tr0s0d0k.js:34791-35157 placement
function servedToolPath(tool, n, o, r) {
  if (tool.getPath === undefined) return;
  let s = safeParseToolInput(tool, n);
  if (!s.success) return;
  let d = runInRemoteCallFrameMain(r, () => tool.getPath?.(s.data));
  if (typeof d !== "string" || d === "") return;
  let u = tool.isReadOnly(s.data) ? ["read", "edit"] : ["edit", "read"];
  let pathsForPermissionCheck = getPathsForPermissionCheck(expandPath(d, r));
  let h =
    getPlatform() === "macos"
      ? pathsForPermissionCheck.flatMap((_) => [_, normalizeCaseForComparison(_)])
      : pathsForPermissionCheck;
  for (let _ of h)
    for (let S of u) {
      let R = matchingRuleForInput(_, o, S, "deny");
      if (R?.source === HOST_CREDENTIAL_RULE_SOURCE) return R;
    }
  return;
}
//@ chunk-tr0s0d0k.js:35157-35246 placement = getDenyRuleForAgent (1)
function stripDoubleSlashPrefix(e) {
  let ruleContent = e.ruleValue.ruleContent ?? "";
  return ruleContent.startsWith("//") ? ruleContent.slice(1) : ruleContent;
}
//@ chunk-tr0s0d0k.js:35246-35380 placement
function isMountPointRule(e) {
  let n = stripDoubleSlashPrefix(e);
  return claudeStateGlobs(
    secondRootMounts().map(({ mountPoint }) => ({
      literal: mountPoint,
      tail: "",
    })),
  ).some((o) => n.startsWith(`${o.slice(1)}/`));
}
export {
  commandReachesSettings,
  servedToolPath,
  isMountPointRule,
  stripDoubleSlashPrefix,
  judgeServedMcpPaths,
  hostCredentialRuleOf,
};
