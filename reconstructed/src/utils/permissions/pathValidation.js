/**
 * utils/permissions/pathValidation.ts
 *
 * Shell 工具路径参数校验：拒绝 UNC、~ 变体、shell 展开、.. 遍历、写目标的花括号/glob，读 glob 按基目录判定，并提供沙箱写允许列表判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/pathValidation.ts
 * pieces: chunk-fq0cr76a.js (29), chunk-s61vbvea.js (2)
 * attribution: affinity 1, facade-exports 14, layout 12, file-local 1, callgraph-fingerprint 1, placement 2
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  resolve,
  resolve as resolve_2,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
} from "os";
import { firstGlobCharIndex } from "../windowsUncPaths.js";
import { getPlatform, getPlatform as getPlatform_2 } from "../platform.js";
import { SandboxManager } from "../sandbox/sandbox-adapter.js";
import {
  getPathsForPermissionCheck,
  walkPermissionCheckPaths,
  getFsImplementation,
  safeResolvePath,
  resolvedSpellingWalk,
} from "../fsOperations.js";
import {
  pathInWorkingPath,
  matchingRuleForInput,
  outsideReadBlocked,
  checkEditableInternalPath,
  internalPathDecisionStands,
  checkPathSafetyForAutoEdit,
  remoteConfigEditExemptionApplies,
  sensitiveWriteRedirect,
  hardDeniedAsSpelled,
  symlinkRedirect,
  symlinkRedirectSentence,
  pathInAllowedWorkingPath,
  checkReadableInternalPath,
  untypeDenyReasonForAskPropagation,
  matchingAllowRuleForAllPaths,
  normalizeCaseForComparison,
} from "./filesystem.js";
import { getSessionPathsCache } from "../sessionPathsCache.js";
import {
  isHostPersonOnlyCircuitBreaker,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
} from "../../types/permissions.js";
import { unresolvablePathMessage } from "../invisibleChars.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { uniq } from "../collections.js";
import {
  normalizeWindowsDevicePath,
  profileRelativeRemainders,
  WSL_MNT_UNC_RE,
} from "../windowsProfileFolders.js";
import {
  normalizeWindowsPathForCompare,
  classifyUncPath,
  uncAdminShareToDrive,
} from "../hooks/hookCommandAnalysis.js";
import { stripTrailingDotsSpaces } from "../ignorePatterns.js";
import { normalizeDosDevicePath } from "../pathClassification.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { Lu } from "../networkPaths.js";
import { containsVulnerableUncPath } from "../shell/readOnlyCommandValidation.js";

//@ chunk-fq0cr76a.js:1064037-1064057 affinity
var Lw = 5,
  gde = /[{}]/;
/**
 * 把目录列表格式化为 'a', 'b', and N more（最多显示若干个）。
 */
//@ chunk-fq0cr76a.js:1064057-1064209 facade-exports = formatDirectoryList (1)
function formatDirectoryList(directories) {
  let dirCount = directories.length;
  if (dirCount <= Lw) return directories.map((dir) => `'${dir}'`).join(", ");
  return `${directories
    .slice(0, Lw)
    .map((dir) => `'${dir}'`)
    .join(", ")}, and ${dirCount - Lw} more`;
}
/**
 * 返回通配符之前的目录部分（Windows 上兼顾反斜杠）。
 */
//@ chunk-fq0cr76a.js:1064209-1064414 facade-exports = getGlobBaseDirectory (1)
function getGlobBaseDirectory(filePath) {
  let n = firstGlobCharIndex(filePath);
  if (n === -1) return filePath;
  let beforeGlob = filePath.substring(0, n),
    s =
      getPlatform() === "windows"
        ? Math.max(beforeGlob.lastIndexOf("/"), beforeGlob.lastIndexOf("\\"))
        : beforeGlob.lastIndexOf("/");
  if (s === -1) return ".";
  return beforeGlob.substring(0, s) || "/";
}
/**
 * 沙箱开启且 deny 列表完整时，路径的每种拼写都在沙箱写允许列表内（且不在 denyWithinAllow 内）才返回 true；用于沙箱下自动放行 Bash 写操作。
 */
//@ chunk-fq0cr76a.js:1064414-1064720 facade-exports = isPathInSandboxWriteAllowlist (0.719)
function isPathInSandboxWriteAllowlist(path, pathsToCheck) {
  if (!SandboxManager.isSandboxingEnabled() || SandboxManager.storedDenyListsMayBeShort()) return !1;
  let { allowOnly: allowOnly, denyWithinAllow: denyWithinAllow } = SandboxManager.getFsWriteConfig(),
    h = pathsToCheck ?? getPathsForPermissionCheck(path),
    resolvedAllow = allowOnly.flatMap(getSandboxConfigPathSpellings),
    resolvedDeny = denyWithinAllow.flatMap(getSandboxConfigPathSpellings);
  return h.every((S) => {
    for (let denyPath of resolvedDeny) if (pathInWorkingPath(S, denyPath)) return !1;
    return resolvedAllow.some((allowPath) =>
      pathInWorkingPath(S, allowPath, { caseFold: !0, uncShapeParity: !0 }),
    );
  });
}
//@ chunk-fq0cr76a.js:1064720-1064840 layout
function getSandboxConfigPathSpellings(e) {
  let { resolvedSandboxConfigPaths: resolvedSandboxConfigPaths } = getSessionPathsCache(),
    r = resolvedSandboxConfigPaths.get(e);
  if (r !== void 0) return r;
  let s = getPathsForPermissionCheck(e);
  return (resolvedSandboxConfigPaths.set(e, s), s);
}
/**
 * 从内部路径拒绝原因中取可展示的文字（safetyCheck/other 的 reason）。
 */
//@ chunk-fq0cr76a.js:1064840-1064922 facade-exports
function internalPathDenyWords(e) {
  return e?.type === "safetyCheck" || e?.type === "other" ? e.reason : void 0;
}
/**
 * 若拒绝原因是只能由宿主上的人确认的 safetyCheck，返回其熔断标签。
 */
//@ chunk-fq0cr76a.js:1064922-1065027 facade-exports
function hostPersonOnlyTag(e) {
  return e?.type === "safetyCheck" && e.circuitBreaker !== void 0 && isHostPersonOnlyCircuitBreaker(e)
    ? e.circuitBreaker
    : void 0;
}
/**
 * 把内部路径硬拒绝转换为 Shell 命令的 safetyCheck 询问原因：附加符号链接说明；restricted 模式下标 restrictedMode 并在 also 中记 internalHardDeny；宿主专属时沿用其熔断；否则标 internalHardDeny，是否允许分类器批准取决于是否必须由人确认。
 */
//@ chunk-fq0cr76a.js:1065027-1065469 facade-exports
function internalDenyShellAskReason(e, n, r) {
  let s = internalPathDenyWords(e.decisionReason) ?? e.message,
    h = hostPersonOnlyTag(e.decisionReason);
  return {
    type: "safetyCheck",
    reason: r === void 0 ? s : `${s.endsWith(".") ? s : `${s}.`} ${r.sentence}.`,
    ...(n
      ? {
          classifierApprovable: !1,
          circuitBreaker: "restrictedMode",
          also: ["internalHardDeny", ...(h !== void 0 ? [h] : [])],
        }
      : h !== void 0
        ? { classifierApprovable: !1, circuitBreaker: h, also: ["internalHardDeny"] }
        : { classifierApprovable: r?.personOnly !== !0, circuitBreaker: "internalHardDeny" }),
  };
}
/**
 * 判断路径检查结果是否“仅因在工作目录外而被默认拒绝”（没有具体原因），这类可以给出 addDirectories 建议。
 */
//@ chunk-fq0cr76a.js:1065469-1065577 facade-exports
function isOnlyOutsideWorkingFoldersRefusal(e) {
  return !e.allowed && e.refusedByDefault === !0 && e.decisionReason === void 0 && e.isInWorkingDir === !1;
}
/**
 * （文件系统权限）判断路径是否允许：先查各种拼写的 deny 规则；路径无法解析时按读封锁返回安全检查；再判断是否在工作目录/允许规则内。被 Bash、PowerShell 与文件工具共用。
 */
//@ chunk-fq0cr76a.js:1065577-1068271 facade-exports = isPathAllowed (0.56)
function isPathAllowed(e, n, r, s, h) {
  let y = r === "read" ? "read" : "edit",
    b = s ?? walkPermissionCheckPaths(e),
    spellings = b.spellings,
    w = h ? new Set([...spellings, ...h]) : spellings;
  for (let L of w) {
    let denyRule = matchingRuleForInput(L, n, y, "deny");
    if (denyRule !== null) return { allowed: !1, decisionReason: { type: "rule", rule: denyRule } };
  }
  if (b.unresolved) {
    let L = unresolvablePathMessage(e);
    if (r === "read" && !n.restricted)
      return n.blockReadsOutsideWorkingDirectories === !0
        ? {
            allowed: !1,
            decisionReason: {
              type: "safetyCheck",
              reason: L,
              classifierApprovable: !1,
              circuitBreaker: "outsideReadsBlocked",
            },
          }
        : { allowed: !1, decisionReason: { type: "other", reason: L } };
    return {
      allowed: !1,
      decisionReason: {
        type: "safetyCheck",
        reason: L,
        classifierApprovable: !1,
        ...(n.restricted && { circuitBreaker: "restrictedMode" }),
      },
    };
  }
  if (r === "read" && outsideReadBlocked(e, n, spellings))
    return {
      allowed: !1,
      decisionReason: {
        type: "safetyCheck",
        reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
        classifierApprovable: !1,
        circuitBreaker: "outsideReadsBlocked",
      },
    };
  let R;
  if (r !== "read") {
    let L = checkEditableInternalPath(e, {}, spellings, { restricted: n.restricted });
    if (L.behavior === "deny") R = L;
    if (L.behavior === "allow" && internalPathDecisionStands(L, n))
      return { allowed: !0, decisionReason: L.decisionReason };
  }
  if (r !== "read") {
    let L = checkPathSafetyForAutoEdit(
      e,
      spellings,
      void 0,
      remoteConfigEditExemptionApplies(n),
      n.trustedNetworkDirectories,
    );
    if (!L.safe) {
      let V = sensitiveWriteRedirect(b.requested, b, n),
        K = internalPathDenyWords(R?.decisionReason) ?? L.message,
        q = hostPersonOnlyTag(R?.decisionReason),
        Z = R !== void 0 && V !== null && !hardDeniedAsSpelled(b.requested, n),
        J = n.restricted ? "restrictedMode" : (L.circuitBreaker ?? q),
        filtered = [
          ...(L.circuitBreaker !== void 0 ? [L.circuitBreaker] : []),
          ...(L.also ?? []),
          ...(R !== void 0 ? ["internalHardDeny"] : []),
          ...(q !== void 0 ? [q] : []),
        ].filter((ae, Se, ue) => ae !== J && ue.indexOf(ae) === Se);
      return {
        allowed: !1,
        decisionReason: {
          type: "safetyCheck",
          reason: V === null ? K : `${K.endsWith(".") ? K : `${K}.`} ${V.sentence}.`,
          ...(n.restricted
            ? { classifierApprovable: !1, circuitBreaker: "restrictedMode" }
            : {
                classifierApprovable: L.classifierApprovable && !V?.personOnly && !Z && q === void 0,
                ...(J !== void 0 && { circuitBreaker: J }),
              }),
          ...(filtered.length > 0 && { also: filtered }),
        },
      };
    }
  }
  if (R !== void 0) {
    let internalEditResult = symlinkRedirect(b, n);
    return {
      allowed: !1,
      decisionReason: internalDenyShellAskReason(
        R,
        n.restricted,
        internalEditResult === null
          ? void 0
          : {
              sentence: symlinkRedirectSentence(b.requested, internalEditResult),
              personOnly: internalEditResult.carriedOut || !hardDeniedAsSpelled(b.requested, n),
            },
      ),
    };
  }
  let D = pathInAllowedWorkingPath(e, n, spellings);
  if (D) {
    if (r === "read" || n.mode === "acceptEdits") return { allowed: !0 };
  }
  if (r === "read") {
    let L = checkReadableInternalPath(e, {}, spellings, { restricted: n.restricted });
    if (L.behavior === "deny")
      return { allowed: !1, decisionReason: untypeDenyReasonForAskPropagation(L.decisionReason) };
    if (L.behavior === "allow" && internalPathDecisionStands(L, n))
      return { allowed: !0, decisionReason: L.decisionReason };
  }
  if (
    r !== "read" &&
    !D &&
    !isHttpMcpServeInvocation() &&
    n.servedCall !== !0 &&
    !SandboxManager.isOnButNotRunning() &&
    isPathInSandboxWriteAllowlist(e, spellings)
  )
    return { allowed: !0, decisionReason: { type: "other", reason: "Path is in sandbox write allowlist" } };
  let isInWorkingDir = matchingAllowRuleForAllPaths(spellings, n, y);
  if (isInWorkingDir !== null) return { allowed: !0, decisionReason: { type: "rule", rule: isInWorkingDir } };
  if (r !== "read") {
    let internalReadResult = symlinkRedirect(b, n);
    if (internalReadResult?.carriedOut)
      return {
        allowed: !1,
        isInWorkingDir: D,
        decisionReason: {
          type: "safetyCheck",
          reason: symlinkRedirectSentence(b.requested, internalReadResult),
          classifierApprovable: !1,
        },
      };
  }
  return { allowed: !1, isInWorkingDir: D, refusedByDefault: !0 };
}
//@ chunk-fq0cr76a.js:1068271-1068354 layout
function MV(e) {
  return Object.values(e.alwaysDenyRules).some((n) => (n?.length ?? 0) > 0);
}
//@ chunk-fq0cr76a.js:1068354-1068603 layout
function checkGlobWriteAllowed(e, n, r, s) {
  let h = getFsImplementation(),
    y = getGlobBaseDirectory(e),
    b = isAbsolute(y) ? y : resolve(n, y),
    S = isAbsolute(e) ? e : resolve(n, e);
  for (;;) {
    let {
        resolvedPath: resolvedPath,
        isSymlink: isSymlink,
        isCanonical: isCanonical,
      } = safeResolvePath(h, S),
      O = dirname(S);
    if (isCanonical || S === b || O === S)
      return {
        ...isPathAllowed(
          resolvedPath,
          r,
          s,
          isCanonical ? resolvedSpellingWalk(resolvedPath) : void 0,
          isCanonical && isSymlink && MV(r) ? getPathsForPermissionCheck(S) : void 0,
        ),
        resolvedPath: resolvedPath,
      };
    S = O;
  }
}
//@ chunk-fq0cr76a.js:1068603-1068856 layout
var WINDOWS_DRIVE_ROOT = /^[A-Za-z]:\/?$/,
  WINDOWS_DRIVE_TOP_DIR = /^[A-Za-z]:\/[^/]+$/,
  WINDOWS_DRIVE_PREFIX = /^[A-Za-z]:\//,
  UNC_ADMIN_SHARE = /^\\\\([^\\]+)\\([a-z])\$(?=$|\\)/,
  MACOS_VOL_FILE_PATH = /^\/\.(?:vol|file)(?:\/|$)/i,
  WINDOWS_ABSOLUTE_PREFIX = /^(?:[A-Za-z]:[\\/]|[\\/]{2}|[\\/]\?\?[\\/])/,
  WINDOWS_DEVICE_OR_ADMIN_PATH = /^[\\/]{2}(?:[?.][\\/]|;|[^\\/]+[\\/]admin\$(?=$|[\\/]))/i;
/**
 * 判断路径（含各种拼写）是否为受保护系统路径：Windows 设备或管理路径、macOS /.vol 等内核重定向路径、其他系统根。旧版名 getReservedShortcuts 误配。
 */
//@ chunk-fq0cr76a.js:1068856-1069027 facade-exports = getReservedShortcuts (1)
function isDangerousRemovalPath(e) {
  return isDangerousRemovalPath_2(e).some((n) => {
    let r = Fw(n);
    if (WINDOWS_DEVICE_OR_ADMIN_PATH.test(r) || isSuspiciousUncHost(r)) return !0;
    let replaced = r.replace(/[\\/]+/g, "/");
    if (getPlatform() === "macos" && MACOS_VOL_FILE_PATH.test(replaced)) return !0;
    return isBroadSandboxWritePath(replaced);
  });
}
//@ chunk-fq0cr76a.js:1069027-1069309 file-local
function isDangerousRemovalPath_2(resolvedPath) {
  let n = [
    resolvedPath,
    resolvedPath
      .split("/")
      .filter((r, s) => r !== "." || s === 0)
      .join("/") || (resolvedPath.startsWith("/") ? "/" : ""),
  ];
  if (WINDOWS_ABSOLUTE_PREFIX.test(resolvedPath) || getPlatform() === "windows")
    for (let r of uniq([resolvedPath, normalizeWindowsDevicePath(resolvedPath)]))
      n.push(
        ...expandAdminSharePath(normalizeWindowsPathForCompare(r)),
        ...expandAdminSharePath(
          normalizeWindowsPathForCompare(
            r.replace(/[^\\/]+/g, (s) => {
              let parentDir = stripTrailingDotsSpaces(s);
              return parentDir === "." || parentDir === ".." ? parentDir : s;
            }),
          ),
        ),
      );
  return uniq(n);
}
//@ chunk-fq0cr76a.js:1069309-1069428 layout
function expandAdminSharePath(e) {
  let match = UNC_ADMIN_SHARE.exec(e);
  return match !== null && VV(match[1]) === "own_host"
    ? [e, `${match[2]}:${e.slice(match[0].length) || "\\"}`]
    : [e];
}
//@ chunk-fq0cr76a.js:1069428-1069468 layout
function VV(e) {
  return classifyUncPath(`\\\\${e}\\`);
}
//@ chunk-fq0cr76a.js:1069468-1069608 layout
function isSuspiciousUncHost(e) {
  if (!/^[\\/]{2}/.test(e)) return !1;
  let match = UNC_ADMIN_SHARE.exec(normalizeWindowsPathForCompare(e)),
    r = match === null ? void 0 : VV(match[1]);
  return r === "numeric_host" || r === "odd_host";
}
/**
 * 沙箱写允许路径是否过于宽泛：通配、根目录、盘符根、主目录（含真实路径与管理共享形式）及其祖先、根下一级目录。
 */
//@ chunk-fq0cr76a.js:1069608-1070312 layout
function isBroadSandboxWritePath(e) {
  if (e === "*" || e.endsWith("/*")) return !0;
  let isMacos = getPlatform() === "macos",
    stripPrivatePrefix = (R) => (isMacos ? R.replace(/^\/private\/(etc|var|tmp|home)(\/|$)/i, "/$1$2") : R),
    s = stripPrivatePrefix(e),
    normalized = s === "/" ? s : s.replace(/\/$/, "");
  if (normalized === "/") return !0;
  if (WINDOWS_DRIVE_ROOT.test(normalized)) return !0;
  let replaced = stripPrivatePrefix(Fw(homedir()).replace(/[\\/]+/g, "/")).replace(/\/$/, "");
  if (normalizeCaseForComparison(normalized) === normalizeCaseForComparison(replaced)) return !0;
  let canonicalHome = getCanonicalHomedir(homedir()),
    homeSpellings = uniq([
      replaced,
      canonicalHome,
      ...(/^[\\/]{2}/.test(homedir())
        ? expandAdminSharePath(normalizeWindowsPathForCompare(normalizeWindowsDevicePath(homedir()))).map(
            (R) => R.replace(/[\\/]+/g, "/").replace(/\/$/, ""),
          )
        : []),
    ]);
  if (
    homeSpellings.some(
      (R) => R !== replaced && normalizeCaseForComparison(normalized) === normalizeCaseForComparison(R),
    )
  )
    return !0;
  for (let R of homeSpellings) {
    let D = WINDOWS_DRIVE_PREFIX.exec(R)?.[0];
    if (
      D !== void 0 &&
      normalizeCaseForComparison(normalized.slice(0, D.length)) === normalizeCaseForComparison(D) &&
      profileRelativeRemainders(R.slice(D.length), normalized.slice(D.length)).some((O) => O.length === 0)
    )
      return !0;
  }
  if (dirname(normalized) === "/") return !0;
  if (WINDOWS_DRIVE_TOP_DIR.test(normalized)) return !0;
  return !1;
}
//@ chunk-fq0cr76a.js:1070312-1070370 layout
function Fw(e) {
  return normalizeDosDevicePath(
    uncAdminShareToDrive(normalizeWindowsDevicePath(e).replace(WSL_MNT_UNC_RE, "$1:")),
  );
}
//@ chunk-fq0cr76a.js:1070370-1070550 layout
function getCanonicalHomedir(e) {
  let { canonicalHomedirByHome: canonicalHomedirByHome } = getSessionPathsCache(),
    r = canonicalHomedirByHome.get(e);
  if (r !== void 0) return r;
  let replaced = Fw(safeResolvePath(getFsImplementation(), e).resolvedPath)
    .replace(/[\\/]+/g, "/")
    .replace(/\/$/, "");
  return (canonicalHomedirByHome.set(e, replaced), replaced);
}
/**
 * 按 / 切分路径段；Windows 上同时按 \ 和 / 切分并合并两种结果。
 */
//@ chunk-fq0cr76a.js:1070550-1070640 facade-exports
function shellPathSegments(e) {
  let parts = e.split(/\/+/);
  return getPlatform() === "windows" ? [...e.split(/[\\/]+/), ...parts] : parts;
}
/**
 * 路径中是否有出现在普通段之后的 ..（向上逃逸），开头的 .. 不算。
 */
//@ chunk-fq0cr76a.js:1070640-1070794 facade-exports
function hasInteriorDotDot(e) {
  let parts = e.split(getPlatform() === "windows" ? /[\\/]/ : "/"),
    r = !1;
  for (let s of parts) {
    if (s === "" || s === ".") continue;
    if (s === "..") {
      if (r) return !0;
    } else r = !0;
  }
  return !1;
}
/**
 * 是否在 glob 字符（或未闭合的 [）之后出现 ..，这种路径无法静态确定落点，需人工确认。
 */
//@ chunk-fq0cr76a.js:1070794-1070981 facade-exports
function globBeforeInteriorDotDot(e) {
  let parts = e.split(/[\\/]+/);
  return parts.some((r, s) => {
    if (r !== "..") return !1;
    let joined = parts.slice(0, s).join("/");
    return (
      firstGlobCharIndex(joined) !== -1 ||
      (joined.includes("[") &&
        parts
          .slice(s + 1)
          .join("/")
          .includes("]"))
    );
  });
}
//@ chunk-fq0cr76a.js:1070981-1071093 layout
function hasReadDenyRule(e) {
  return Object.values(e.alwaysDenyRules).some((n) =>
    n?.some((r) => r === FILE_READ_TOOL_NAME || r.startsWith(`${FILE_READ_TOOL_NAME}(`)),
  );
}
/**
 * 处理含 “目录/..” 的路径：逐段解析符号链接后再判定（Windows 直接 undefined）；读操作若 .. 前有 glob 且开启了外部读拦截或有 Read deny 规则，返回不可判定的 safetyCheck。
 */
//@ chunk-fq0cr76a.js:1071093-1071666 callgraph-fingerprint = isPathAllowed (0.429)
function checkTraversalPath(path, cwd, toolPermissionContext, operationType) {
  if (getPlatform() === "windows") return;
  let h = resolveTraversalAndCheck(path, cwd, toolPermissionContext, operationType);
  if (
    operationType === "read" &&
    h?.decisionReason?.type !== "rule" &&
    globBeforeInteriorDotDot(path) &&
    (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0 ||
      hasReadDenyRule(toolPermissionContext))
  )
    return {
      allowed: !1,
      resolvedPath: path,
      decisionReason: {
        type: "safetyCheck",
        reason: `A glob before the '..' in '${path}' is expanded by the shell before the path is opened, so the target cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories) or the Read deny rules. Spell the path without the glob.`,
        classifierApprovable: !1,
        circuitBreaker: "outsideReadsBlocked",
      },
    };
  return h;
}
//@ chunk-fq0cr76a.js:1071666-1072315 layout
function resolveTraversalAndCheck(path, cwd, toolPermissionContext, operationType) {
  let h = getFsImplementation(),
    y = isAbsolute(path) ? path : `${cwd}/${path}`,
    b = "/",
    S = [];
  for (let L of y.split("/")) {
    if (L === "" || L === ".") continue;
    if (L !== "..") {
      S.push(L);
      continue;
    }
    if (S.length > 0) {
      let V = safeResolvePath(h, resolve(b, ...S));
      if (!V.isCanonical) return;
      ((b = V.resolvedPath), (S = []));
    }
    b = dirname(b);
  }
  let w = resolve(b, ...S);
  if (operationType !== "read") {
    let L = { ...walkPermissionCheckPaths(w), requested: y },
      V = isPathAllowed(L.unresolved ? w : L.landing, toolPermissionContext, operationType, L);
    if (V.allowed || (V.isInWorkingDir === !0 && V.decisionReason === void 0)) return;
    let K = symlinkRedirect(L, toolPermissionContext);
    return { ...V, resolvedPath: K?.carriedOut ? K.landing : w };
  }
  let { resolvedPath: resolvedPath, isCanonical: isCanonical } = safeResolvePath(h, w),
    O = isPathAllowed(
      resolvedPath,
      toolPermissionContext,
      operationType,
      isCanonical ? resolvedSpellingWalk(resolvedPath) : void 0,
    );
  if (O.allowed || (O.isInWorkingDir === !0 && O.decisionReason === void 0)) return;
  return { ...O, resolvedPath: resolvedPath };
}
/**
 * Bash/PowerShell 路径参数校验入口：UNC、~user/~+/~-、$ % ` = 等 shell 展开、目录后的 .. 遍历、写目标含花括号、写目标含 glob 一律要人工确认；读的 glob 按基目录判定；其余解析为绝对路径后交给 isPathAllowed。返回 {allowed, resolvedPath, decisionReason}。
 */
//@ chunk-fq0cr76a.js:1072315-1073578 facade-exports = validatePath (0.837)
function validatePath(path, cwd, toolPermissionContext, operationType) {
  let cleanPath = Lu(path);
  if (containsVulnerableUncPath(cleanPath, !0))
    return {
      allowed: !1,
      resolvedPath: cleanPath,
      decisionReason: { type: "other", reason: "UNC network paths require manual approval" },
    };
  if (cleanPath.startsWith("~"))
    return {
      allowed: !1,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason: "Tilde expansion variants (~user, ~+, ~-) in paths require manual approval",
      },
    };
  if (
    cleanPath.includes("$") ||
    (getPlatform() === "windows" && cleanPath.includes("%")) ||
    cleanPath.includes("`") ||
    cleanPath.startsWith("=")
  )
    return {
      allowed: !1,
      resolvedPath: cleanPath,
      decisionReason: { type: "other", reason: "Shell expansion syntax in paths requires manual approval" },
    };
  if (hasInteriorDotDot(cleanPath))
    return (
      checkTraversalPath(cleanPath, cwd, toolPermissionContext, operationType) ?? {
        allowed: !1,
        resolvedPath: cleanPath,
        decisionReason: {
          type: "other",
          reason:
            "Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory",
        },
      }
    );
  if ((operationType === "write" || operationType === "create") && gde.test(cleanPath))
    return {
      allowed: !1,
      resolvedPath: cleanPath,
      decisionReason: {
        type: "other",
        reason:
          "Brace characters in write target require manual approval \u2014 bash may brace-expand to paths outside the working directory",
      },
    };
  if (firstGlobCharIndex(cleanPath) !== -1) {
    if (operationType === "write" || operationType === "create")
      return {
        allowed: !1,
        resolvedPath: cleanPath,
        decisionReason: {
          type: "other",
          reason: "Glob patterns are not allowed in write operations. Please specify an exact file path.",
        },
      };
    return checkGlobWriteAllowed(cleanPath, cwd, toolPermissionContext, operationType);
  }
  let absolutePath = isAbsolute(cleanPath) ? cleanPath : resolve(cwd, cleanPath);
  return validateResolvedOperand(absolutePath, toolPermissionContext, operationType);
}
/**
 * 对一个已展开的 Shell 路径参数做许可判定：写操作按符号链接落点检查并在被拒时给出实际落点；读操作先解析真实路径，必要时连同原拼写一起交给 isPathAllowed。
 */
//@ chunk-fq0cr76a.js:1073578-1073878 facade-exports
function validateResolvedOperand(e, n, r) {
  if (r !== "read") {
    let S = walkPermissionCheckPaths(e),
      w = S.unresolved ? e : S.landing,
      R = isPathAllowed(w, n, r, S),
      D = R.allowed ? null : symlinkRedirect(S, n);
    return { ...R, resolvedPath: D?.carriedOut ? D.landing : e };
  }
  let {
    resolvedPath: resolvedPath,
    isSymlink: isSymlink,
    isCanonical: isCanonical,
  } = safeResolvePath(getFsImplementation(), e);
  return {
    ...isPathAllowed(
      resolvedPath,
      n,
      r,
      isCanonical ? resolvedSpellingWalk(resolvedPath) : void 0,
      isCanonical && isSymlink && MV(n) ? getPathsForPermissionCheck(e) : void 0,
    ),
    resolvedPath: resolvedPath,
  };
}
/**
 * GLOB_PATTERN_REGEX：同旧版 utils/permissions/pathValidation.ts（误归 commands.ts）。
 */
//@ chunk-s61vbvea.js:208056-208075 placement
var GLOB_PATTERN_REGEX = /[*?[\]{}]/;
/**
 * getGlobBaseDirectory：同旧版 pathValidation.getGlobBaseDirectory；旧版名 getCommands 配错。
 */
//@ chunk-s61vbvea.js:208075-208341 placement = getCommands (0.674)
function getGlobBaseDirectory_2(path) {
  if (!isAbsolute_7(path)) return null;
  let isWindows = getPlatform_2() === "windows",
    parts = path.split(isWindows ? /[\\/]/ : "/"),
    globIndex = parts.findIndex((S) => GLOB_PATTERN_REGEX.test(S)),
    base = (globIndex === -1 ? parts : parts.slice(0, globIndex))
      .join(isWindows ? "\\" : "/")
      .replace(isWindows ? /[\\/]+$/ : /\/+$/, "");
  if (base === "") return parse_3(path).root || "/";
  return isWindows && /^[A-Za-z]:$/.test(base) ? `${base}\\` : base;
}

export {
  isPathAllowed,
  hasInteriorDotDot,
  validatePath,
  shellPathSegments,
  globBeforeInteriorDotDot,
  isPathInSandboxWriteAllowlist,
  getGlobBaseDirectory_2,
  formatDirectoryList,
  internalPathDenyWords,
  hostPersonOnlyTag,
  internalDenyShellAskReason,
  isDangerousRemovalPath,
  validateResolvedOperand,
  isOnlyOutsideWorkingFoldersRefusal,
};
